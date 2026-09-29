"""从 Uber「下载我的数据」里的 Eats 订单整理口味摘要，并生成可以导入 App 的口味档案。
只读 Eats/user_orders-*.csv，不碰行程、地址、付款等其他文件。输入和输出都在 uber/ 里（已被 git 忽略）。

用法：python3 scripts/uber_profile.py
输出：uber/summary.json（摘要，给人看）、uber/uber-profile.json（在 App「我的 → 导入文件」里导入）
"""
import csv, glob, json, re, collections
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
files = glob.glob(str(ROOT / 'uber/**/Eats/user_orders-*.csv'), recursive=True)
rows = [r for f in files for r in csv.DictReader(open(f, encoding='utf-8-sig'))]

# ---------- 订单：同一家店、同一下单时间算一单 ----------
orders = {}
for r in rows:
    if (r.get('Order_Status') or '').lower() != 'completed': continue
    k = (r['Restaurant_Name'], r['Request_Time_Local'])
    o = orders.setdefault(k, {'name': r['Restaurant_Name'], 't': r['Request_Time_Local'], 'price': float(r['Order_Price'] or 0), 'items': []})
    o['items'].append((r['Item_Name'], int(float(r['Item_quantity'] or 1))))
orders = sorted(orders.values(), key=lambda o: o['t'])

# ---------- 店名对上我们的数据，拿菜系 ----------
js = (ROOT / 'data/food-data.js').read_text(encoding='utf-8')
data = json.loads(js[js.index('{'):js.rindex('}') + 1])
CUI = data['cuisines']
def norm(s): return re.sub(r'[^a-z0-9一-鿿]', '', (s or '').lower())
def core(s):  # 去掉括号里的分店名、「- Yonge St」之类
    s = re.split(r'\s[-–|(]\s?|\(', s or '')[0]
    return norm(s)
by = collections.defaultdict(list)
for r in data['rows']:
    by[core(r[0])].append(r)
    if r[1]: by[core(r[1])].append(r)
def cuisines_of(name):
    cands = by.get(core(name)) or by.get(norm(name)) or []
    cnt = collections.Counter(CUI[i] for r in cands for i in r[5])
    return [c for c, _ in cnt.most_common(3)], len(cands)

# 和 App 里 KW（app.js）一致的菜系分组，用来生成「喜欢」
GROUPS = {
  '菜系:中餐': ['chinese','cantonese','hakka','taiwanese','sichuan','szechuan','shanghainese','dim_sum','dumpling','dumplings','hunan','hong_kong','hotpot','hot_pot','congee','uyghur','xinjiang'],
  '菜系:日料': ['japanese','sushi','ramen','izakaya','udon','donburi'], '菜系:韩餐': ['korean','korean_bbq'], '菜系:越南': ['vietnamese','pho','banh_mi'], '菜系:泰国': ['thai'],
  '菜系:东南亚': ['malaysian','filipino','indonesian','singaporean','burmese'], '菜系:印度/南亚': ['indian','pakistani','bangladeshi','nepalese','sri_lankan','tibetan'],
  '菜系:中东': ['middle_eastern','lebanese','persian','iranian','afghan','turkish','arab','shawarma','kebab','falafel','pita','syrian'], '菜系:希腊/地中海': ['greek','mediterranean'],
  '菜系:意大利': ['italian','pasta'], '菜系:欧洲': ['french','portuguese','spanish','polish','german','ukrainian','european','irish','british'],
  '菜系:墨西哥/拉美': ['mexican','tex-mex','tacos','latin_american','peruvian','brazilian','salvadoran','colombian'], '菜系:加勒比': ['caribbean','jamaican','trinidadian','guyanese','roti'],
  '菜系:非洲': ['ethiopian','african','eritrean','somali','nigerian'], '菜系:美式': ['american','burger','diner','barbecue','bbq','steak_house','steak','grill','bar_and_grill','wings','hot_dog','cajun'],
  '菜系:海鲜': ['seafood','fish','fish_and_chips'],
  '想吃点:热汤面': ['ramen','noodle','noodles','pho','udon','soup','congee'], '想吃点:寿司': ['sushi'], '想吃点:披萨': ['pizza'], '想吃点:汉堡炸鸡': ['burger','chicken','fried_chicken','wings'],
  '想吃点:甜品': ['dessert','ice_cream','cake','donut','pastry','bakery','crepe','frozen_yogurt','gelato','waffle'], '想吃点:奶茶': ['bubble_tea','tea'], '想吃点:咖啡': ['coffee_shop','coffee'],
}
# 店名 / 菜名里的关键词，补上对不上数据的店
NAME_HINT = [('菜系:中餐', r'[一-鿿]|dumpling|noodle|wok|szechuan|sichuan|hunan|hong kong|bbq house|bistro 烹'), ('菜系:日料', r'sushi|ramen|izakaya|japan|udon'),
  ('菜系:韩餐', r'korea|bibim|kimchi'), ('菜系:越南', r'\bpho\b|banh|viet'), ('菜系:泰国', r'thai'), ('菜系:印度/南亚', r'india|curry|biryani|tandoor|masala'),
  ('菜系:中东', r'shawarma|falafel|kebab|osmow|lebanese|pita'), ('菜系:意大利', r'pizza|pasta|italian|trattoria'), ('菜系:美式', r'burger|wings|grill|bbq|a&w|mcdonald|wendy|harvey'),
  ('菜系:墨西哥/拉美', r'taco|burrito|mexican|chipotle'), ('想吃点:奶茶', r'bubble|boba|tea\b|chatime|coco|gong cha|presotea'), ('想吃点:咖啡', r'coffee|starbucks|tim hortons|cafe'),
  ('想吃点:汉堡炸鸡', r'chicken|popeyes|kfc|mary brown'), ('想吃点:甜品', r'dessert|cake|donut|gelato|ice cream|bakery')]
SPICY = re.compile(r'🌶|spicy|辣|麻|hot pot|hotpot|sichuan|szechuan|jerk|vindaloo|buldak', re.I)

def slot(h, wd):  # 和 App 里 slotOf 一致
    m = h * 60
    s = 'late' if m < 300 else 'breakfast' if m < 660 else 'lunch' if m < 840 else 'afternoon' if m < 1020 else 'dinner' if m < 1260 else 'late'
    return ('wd' if wd <= 4 else 'we') + ':' + s

rest = collections.defaultdict(lambda: {'n': 0, 'spent': 0.0, 'last': '', 'cu': [], 'match': 0})
groups, slots, prices, dishes = collections.Counter(), collections.Counter(), [], collections.Counter()
spicy_items = total_items = 0
ctx_groups = collections.defaultdict(collections.Counter)
for o in orders:
    t = datetime.fromisoformat(o['t'].replace('Z', ''))  # Uber 给的是本地时间（字段名 _Local），末尾的 Z 不代表 UTC
    r = rest[o['name']]; r['n'] += 1; r['spent'] += o['price']; r['last'] = max(r['last'], o['t'][:10])
    if not r['cu']: r['cu'], r['match'] = cuisines_of(o['name'])
    gs = {g for g, cs in GROUPS.items() if any(c in cs for c in r['cu'])}
    text = o['name'] + ' ' + ' '.join(i for i, _ in o['items'])
    gs |= {g for g, pat in NAME_HINT if re.search(pat, o['name'], re.I)}
    for g in gs: groups[g] += 1
    k = slot(t.hour + t.minute / 60, t.weekday()); slots[k] += 1
    for g in gs: ctx_groups[k][g] += 1
    prices.append(o['price'])
    for name, q in o['items']:
        total_items += q; dishes[re.sub(r'\s*[\U0001F300-\U0001FAFF☀-➿]+', '', name).strip()] += q
        if SPICY.search(name): spicy_items += q

n = len(orders)
prices.sort()
med = prices[n // 2] if n else 0
spicy_share = spicy_items / total_items if total_items else 0
top_rest = sorted(rest.items(), key=lambda kv: (-kv[1]['n'], -kv[1]['spent']))
fav_names = [name for name, r in top_rest if r['n'] >= 2]  # 点过 2 次以上 = 喜欢
likes = [g for g, c in groups.most_common() if c >= 5]  # 点过 5 单以上的类别

summary = {
  'orders': n, 'first': orders[0]['t'][:10] if n else None, 'last': orders[-1]['t'][:10] if n else None,
  'price_median': round(med, 2), 'price_p25': round(prices[n // 4], 2) if n else 0, 'price_p75': round(prices[n * 3 // 4], 2) if n else 0,
  'spicy_share': round(spicy_share, 2),
  'top_restaurants': [(name, r['n'], round(r['spent'] / r['n'], 1), r['last'], r['cu']) for name, r in top_rest[:15]],
  'groups': groups.most_common(), 'slots': slots.most_common(), 'top_dishes': dishes.most_common(15),
  'unmatched_restaurants': sum(1 for r in rest.values() if not r['match']), 'restaurants': len(rest),
}
# 注意：Order_Price 可能是多人份的总价，这里只作为「一单」的参考，不直接当人均
def brand(s):  # 和 app.js 的 brandOf 一致：去掉分店名；Uber 的「z-」前缀是下架的旧店
    s = re.sub(r'^z-', '', s or '', flags=re.I)
    return norm(re.split(r'\s[-–|(]\s?|\(', s)[0])
fav_brands = [b for b in dict.fromkeys(brand(n) for n in fav_names) if b and b not in ('costco', 'walmart', 'shoppersdrugmart')]
late = sum(v for k, v in slots.items() if k.endswith(':late'))
# 喜欢：订单占比高的类别；「美式」基本是汉堡炸鸡带出来的，和「汉堡炸鸡」重复，不单独加
likes = [g for g in likes if g != '菜系:美式']
profile = {
  'v': 1, 'source': 'uber', 'exported': datetime.now().isoformat(timespec='seconds'),
  'profile': {
    'likes': likes,
    'favBrands': fav_brands[:30],
    'ctxLikes': {k: [g for g, c in v.most_common(3) if c >= 3] for k, v in ctx_groups.items() if any(c >= 3 for c in v.values())},
    'nightOwl': n > 0 and late / n >= 0.25,
  },
}
(ROOT / 'uber/summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1))
(ROOT / 'uber/uber-profile.json').write_text(json.dumps(profile, ensure_ascii=False, indent=1))
print(json.dumps(summary, ensure_ascii=False, indent=1))
print('\n导入文件的口味档案：', json.dumps(profile['profile'], ensure_ascii=False, indent=1))
