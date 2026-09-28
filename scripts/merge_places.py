"""合并店铺数据：OpenStreetMap（原始） + Overture Maps（补漏收的店、官网、电话） + 多伦多 DineSafe（卫生检查记录，核实还在营业）。

输入：
  scripts/src/osm-food-data.js      原始 OSM 数据（不要改）
  scripts/out/overture-gta.parquet  Overture 地点（见 README 的下载命令）
  scripts/out/dinesafe.csv          多伦多 DineSafe（open.toronto.ca）
输出：
  data/food-data.js

用法：scripts/.venv/bin/python scripts/merge_places.py
"""
import csv, hashlib, json, math, re, unicodedata
from datetime import date
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'scripts/src', ROOT / 'scripts/out'
MATCH_M = 80          # 名字相近且在这个距离内，算同一家店
MIN_CONF = 0.6        # Overture 置信度下限
DS_SINCE = '2024-09'  # DineSafe：这之后检查过才算「还在营业」

# ---------- 读原始 OSM ----------
js = (SRC / 'osm-food-data.js').read_text(encoding='utf-8')
osm = json.loads(js[js.index('{'):js.rindex('}') + 1])
CUI = list(osm['cuisines'])
cui_idx = {c: i for i, c in enumerate(CUI)}
def cu_id(c):
    if c not in cui_idx:
        cui_idx[c] = len(CUI); CUI.append(c)
    return cui_idx[c]

# 行格式：[店名, 中文名, 纬度, 经度, 类型, 菜系[], 营业时间, 地址, 城市, 素食, 外带, 网站, 编号, 电话, 来源, DineSafe最近检查]
rows = [r[:13] + ['', 'o', ''] for r in osm['rows']]

# ---------- 名字比较 ----------
STOP = {'the', 'restaurant', 'restaurants', 'cafe', 'inc', 'ltd', 'limited', 'and', 'co', 'corp', 'kitchen', 'bar', 'grill',
        'house', 'eatery', 'express', 'shop', 'store', 'canada', 'toronto', 'of', 'la', 'le', 'de', 'food', 'foods'}
def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode() if not re.search(r'[一-鿿]', s or '') else (s or '')
    s = re.sub(r'#\s*\d+', ' ', s.lower()).replace('&', ' and ').replace("'", '')
    return re.sub(r'[^a-z0-9一-鿿]+', ' ', s).strip()
def toks(s): return {t for t in norm(s).split() if len(t) > 1 and t not in STOP}
def same_name(a, b):
    na, nb = norm(a).replace(' ', ''), norm(b).replace(' ', '')
    if not na or not nb: return False
    if na == nb or (min(len(na), len(nb)) >= 4 and (na in nb or nb in na)): return True
    ta, tb = toks(a), toks(b)
    return bool(ta and tb) and len(ta & tb) / min(len(ta), len(tb)) >= 0.5

# ---------- 空间索引 ----------
CELL = 0.002  # 约 150–220 米
def cell(la, lo): return (int(la / CELL), int(lo / CELL))
def meters(la1, lo1, la2, lo2): return math.hypot((la2 - la1) * 111_000, (lo2 - lo1) * 111_000 * math.cos(math.radians(la1)))
class Grid:
    def __init__(self): self.g = {}
    def add(self, i, la, lo): self.g.setdefault(cell(la, lo), []).append(i)
    def near(self, la, lo):
        cx, cy = cell(la, lo)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                yield from self.g.get((cx + dx, cy + dy), ())
grid = Grid()
for i, r in enumerate(rows): grid.add(i, r[2], r[3])
def find(name, la, lo, alt=None):
    best, bd = None, MATCH_M
    for i in grid.near(la, lo):
        r = rows[i]; d = meters(la, lo, r[2], r[3])
        if d < bd and (same_name(name, r[0]) or (r[1] and same_name(name, r[1])) or (alt and same_name(alt, r[0]))):
            best, bd = i, d
    return best

# ---------- Overture 类别 → 类型和菜系 ----------
CAFE = {'coffee_shop', 'cafe', 'tea_room', 'bubble_tea_shop', 'smoothie_juice_bar', 'juice_bar', 'coffee_roastery', 'non_alcoholic_beverage_venue'}
FAST = {'fast_food_restaurant', 'sandwich_shop', 'burger_restaurant', 'chicken_restaurant', 'chicken_wings_restaurant', 'donut_shop', 'bagel_shop',
        'food_truck_stand', 'hot_dog_restaurant', 'pizza_restaurant', 'fish_and_chips_restaurant', 'doner_kebab_restaurant', 'taco_restaurant', 'shawarma_restaurant'}
RENAME = {'steakhouse': 'steak_house', 'breakfast_and_brunch': 'breakfast', 'afghani': 'afghan', 'texmex': 'tex-mex', 'chicken_wings': 'wings',
          'doner_kebab': 'kebab', 'taco': 'tacos', 'coffee': 'coffee_shop', 'coffee_shop': 'coffee_shop', 'bubble_tea': 'bubble_tea',
          'smoothie_juice_bar': 'juice', 'juice_bar': 'juice', 'tea_room': 'tea', 'hot_dog': 'hot_dog', 'bar_and_grill': 'bar_and_grill',
          'dim_sum': 'dim_sum', 'noodles': 'noodle', 'hot_pot': 'hotpot', 'szechuan': 'sichuan', 'cantonese': 'cantonese'}
SKIP = {'restaurant', 'casual_eatery', 'food_and_drink', 'fast_food', 'halal', 'comfort_food', 'eat_and_drink', 'non_alcoholic_beverage_venue', 'cafe', 'food_court'}
def cuisine_of(cat):
    if not cat: return None
    c = re.sub(r'_(restaurant|shop|stand|house|place)$', '', cat)
    c = RENAME.get(cat, RENAME.get(c, c))
    return None if c in SKIP else c
def type_of(cats):
    if 'food_court' in cats: return 3
    if cats[0] in CAFE: return 2
    if cats[0] in FAST: return 1
    return 0

# ---------- 合并 Overture ----------
db = duckdb.connect()
ov = db.execute(f"""
  SELECT id, name, names_common['zh'] AS zh, lat, lng, confidence, websites, phones, brand,
         addresses[1].freeform AS addr, addresses[1].locality AS city, taxonomy.primary AS cat, taxonomy.alternates AS alts, operating_status
  FROM '{OUT / 'overture-gta.parquet'}'
  WHERE taxonomy.hierarchy[1]='food_and_drink'
    AND taxonomy.hierarchy[2] IN ('restaurant','casual_eatery','non_alcoholic_beverage_venue')
    AND confidence >= {MIN_CONF}
    AND coalesce(operating_status,'') NOT IN ('permanently_closed','temporarily_closed')
    AND name IS NOT NULL
  ORDER BY confidence DESC
""").fetchall()
stat = dict(ov=len(ov), matched=0, added=0, web_filled=0, phone_filled=0, ov_dupe=0)
for (oid, name, zh, la, lo, conf, webs, phones, brand, addr, city, cat, alts, _st) in ov:
    web = next((w for w in (webs or []) if w.startswith('http')), '')
    phone = (phones or [''])[0] or ''
    i = find(name, la, lo, brand)
    if i is not None:
        r = rows[i]
        if r[14] == 'o': stat['matched'] += 1
        else: stat['ov_dupe'] += 1; continue          # 和刚加进来的 Overture 店重复
        if 'v' not in r[14]: r[14] += 'v'
        if not r[11] and web: r[11] = web; stat['web_filled'] += 1
        if not r[13] and phone: r[13] = phone; stat['phone_filled'] += 1
        continue
    cats = [cat] + list(alts or [])
    cus = []
    for c in cats:
        k = cuisine_of(c)
        if k and cu_id(k) not in cus: cus.append(cu_id(k))
    veg = 2 if any(c in ('vegan_restaurant',) for c in cats) else 1 if any(c == 'vegetarian_restaurant' for c in cats) else 0
    rows.append([name, zh or '', round(la, 6), round(lo, 6), type_of(cats), cus[:4], '', addr or '', city or '', veg, 0, web, 'ov:' + oid[:20], phone, 'v', ''])
    grid.add(len(rows) - 1, la, lo); stat['added'] += 1

# ---------- DineSafe（只有多伦多市）----------
ds = {}
with open(OUT / 'dinesafe.csv', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        try: la, lo = float(r['latitude']), float(r['longitude'])
        except ValueError: continue
        e = ds.setdefault(r['estId'], {'name': r['estName'], 'la': la, 'lo': lo, 'addr': r['address'], 'last': ''})
        e['last'] = max(e['last'], r['inspectionDate'] or '')
FOODWORD = re.compile(r'restaurant|cafe|café|coffee|pizza|sushi|grill|kitchen|bakery|burger|noodle|\bpho\b|thai|shawarma|bbq|diner|bistro|eatery|taco|chicken|wings|\btea\b|dumpling|ramen|curry|subway|tim hortons|starbucks|mcdonald|popeyes|\bkfc\b|wendy|harvey|domino|mary brown|osmow|chipotle|freshii|pita|poke|boba|bubble|roti|jerk|patty|patties|donut|bagel|gelato|dessert|cuisine|sandwich|deli\b|hot pot|hotpot|bubble tea|juice', re.I)
stat.update(ds=len(ds), ds_recent=0, ds_matched=0, ds_missing=0)
ds_missing = []
for e in ds.values():
    if e['last'] < DS_SINCE: continue
    stat['ds_recent'] += 1
    i = find(e['name'], e['la'], e['lo'])
    if i is not None:
        r = rows[i]; stat['ds_matched'] += 1
        if 'd' not in r[14]: r[14] += 'd'
        r[15] = max(r[15], e['last'][:7])
    elif FOODWORD.search(e['name']):
        stat['ds_missing'] += 1; ds_missing.append(e)

# DineSafe 有、两边都没有的店：近两年检查过就当作还在营业，按店名猜菜系后补进来
NOT_EATERY = re.compile(r'school|childcare|child care|daycare|day care|nursery|montessori|hospital|church|mosque|temple|synagogue|cafeteria|residence|'
    r'long term|retirement|nursing|camp\b|arena|stadium|\bcne\b|\bfb \d|booth|kiosk|back kitchen|commissary|catering|caterer|food bank|'
    r'shelter|community cent|centre for|university|college|club house|clubhouse|hotel|banquet|supermarket|grocery|\bmart\b|warehouse|'
    r'distribut|wholesale|manufactur|factory|processing|plant\b|production|test kitchen|ghost kitchen|staff|employee|community homes?|\bhomes\b|emporium|humber|seneca|centennial|ferry dock', re.I)
GUESS = [(r'sushi', ['japanese', 'sushi'], 0), (r'ramen', ['ramen'], 0), (r'japanese', ['japanese'], 0), (r'korean', ['korean'], 0),
         (r'jamaican|jerk|patt(y|ies)|roti|caribbean|trini', ['caribbean'], 0), (r'\bpho\b|vietnam|banh', ['vietnamese'], 0),
         (r'thai', ['thai'], 0), (r'shawarma|falafel|kebab|lebanese|middle east', ['middle_eastern'], 1), (r'indian|curry|biryani|tandoor|dosa', ['indian'], 0),
         (r'dumpling|hot ?pot|noodle|chinese|szechuan|sichuan|hong kong|dim sum|bbq house|congee', ['chinese'], 0),
         (r'pizza', ['pizza'], 1), (r'burger', ['burger'], 1), (r'chicken|wings', ['chicken'], 1), (r'taco|mexican|burrito', ['mexican'], 0),
         (r'greek|souvlaki|gyro', ['greek'], 0), (r'italian|trattoria|ristorante|pasta', ['italian'], 0), (r'portuguese|churrasqueira', ['portuguese'], 0),
         (r'ethiopian|eritrean', ['ethiopian'], 0), (r'filipino', ['filipino'], 0), (r'afghan', ['afghan'], 0), (r'persian|iranian', ['persian'], 0),
         (r'seafood|fish', ['seafood'], 0), (r'bakery|bakeshop|patisserie|pastry', ['bakery'], 2), (r'bubble tea|boba|\btea\b', ['bubble_tea'], 2),
         (r'coffee|espresso|\bcafe\b|café', ['coffee_shop'], 2), (r'dessert|gelato|ice cream|donut', ['dessert'], 2), (r'juice|smoothie', ['juice'], 2),
         (r'sandwich|deli\b|subway|sub\b', ['sandwich'], 1), (r'diner|breakfast|brunch', ['breakfast'], 0)]
def title(s):
    s = re.sub(r'\s+(inc|ltd|limited|corp)\.?$', '', s.strip(), flags=re.I)
    return ' '.join(w.capitalize() if w.isupper() and len(w) > 2 else w for w in s.split()) if s.isupper() else s
stat['ds_added'] = 0
for e in ds_missing:
    if NOT_EATERY.search(e['name']): continue
    cus, typ = [], 0
    for pat, ks, t in GUESS:
        if re.search(pat, e['name'], re.I):
            for k in ks:
                if cu_id(k) not in cus: cus.append(cu_id(k))
            if not cus[:-len(ks)]: typ = t
    addr = re.sub(r'\s+None\b', '', e['addr']).strip()
    rows.append([title(e['name']), '', round(e['la'], 6), round(e['lo'], 6), typ, cus[:3], '', addr, 'Toronto', 0, 0, '', 'ds:' + hashlib.md5((e['name'] + '|' + e['addr']).encode()).hexdigest()[:12], '', 'd', e['last'][:7]])
    grid.add(len(rows) - 1, e['la'], e['lo']); stat['ds_added'] += 1

# 只在 OSM 里、多伦多市内、Overture 和 DineSafe 都没对上的店（可能已关门，只统计不删除）
TOR = (43.58, 43.86, -79.64, -79.11)
in_tor = lambda r: TOR[0] < r[2] < TOR[1] and TOR[2] < r[3] < TOR[3]
stat['osm_only_toronto'] = sum(1 for r in rows if r[14] == 'o' and in_tor(r))
stat['total'] = len(rows)

# ---------- 输出 ----------
data = {'ts': osm['ts'], 'merged': date.today().isoformat(), 'overture': '2026-09-23.1', 'cuisines': CUI, 'rows': rows}
head = ('// GTA 餐馆数据：© OpenStreetMap 贡献者（ODbL）+ Overture Maps（CDLA/ODbL）+ 多伦多 DineSafe（Open Government Licence – Toronto）\n'
        '// 由 scripts/merge_places.py 生成，不要手改。每行字段：\n'
        '// [店名, 中文名, 纬度, 经度, 类型(0餐厅 1快餐 2咖啡 3美食广场), 菜系下标[], 营业时间, 地址, 城市, 素食(0/1/2), 可外带, 网站, 编号, 电话, 来源(o=OSM v=Overture d=DineSafe), DineSafe最近检查(YYYY-MM)]\n')
(ROOT / 'data/food-data.js').write_text(head + 'window.FOOD_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
json.dump(sorted(ds_missing, key=lambda e: e['name'])[:2000], open(OUT / 'dinesafe-missing.json', 'w'), ensure_ascii=False, indent=1)
for k, v in stat.items(): print(f'{k:>18}: {v}')
