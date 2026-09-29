// 读店家官网，一次提取：营业时间（OSM 格式）、招牌菜、人均价格。
// 用法：
//   node scripts/site_info.mjs trial [--budget 3]          随机 120 家「时间未知」+ 30 家「已有时间」的对照组
//   node scripts/site_info.mjs all   [--budget 3] [--limit N]  所有「时间未知、非连锁、有官网」的店（已跑过的跳过）
//   node scripts/site_info.mjs redo  编号1 编号2 …          重跑指定的店（结果追加，汇总时以最后一次为准）
// 结果追加写入 scripts/out/siteinfo.jsonl（一行一家，可以中断后接着跑）
// 建议用后台优先级跑，风扇不会狂转：taskpolicy -b node scripts/site_info.mjs all --budget 6
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, openSite, links, unreadable, MENU_LINK, HOURS_LINK } from './lib/web.mjs';
import { ask, spend, spent, balance } from './lib/deepseek.mjs';
import { parseOH } from './lib/oh.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), mode = argv[0] || 'trial';
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? +argv[i + 1] : d };
const BUDGET = opt('budget', 3), LIMIT = opt('limit', Infinity), CONC = opt('conc', 8);  // 渲染另有上限（lib/web.mjs 的 RENDER_MAX）
const OUT = path.join(ROOT, 'scripts/out/siteinfo.jsonl');

global.window = {};
await import(path.join(ROOT, 'data/food-data.js'));
const D = window.FOOD_DATA;
const shops = D.rows.map(r => ({ name: r[0], zh: r[1], lat: r[2], lng: r[3], type: r[4], cu: r[5].map(k => D.cuisines[k]), oh: r[6], addr: r[7], city: r[8], web: r[11], oid: r[12] }));

// 连锁：同名 ≥3 家且 ≥2 家有营业时间（和 app.js 的连锁推测一致），这些先不跑
const norm = s => s.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '');
const groups = {}; for (const s of shops) (groups[norm(s.name)] ||= []).push(s);
const isChain = s => { const g = groups[norm(s.name)]; return g.length >= 3 && g.filter(x => x.oh).length >= 2 };

// 可复现的随机抽样
let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const sample = (arr, n) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a.slice(0, n) };

const done = new Set(fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).oid) : []);
const readable = s => s.web && !unreadable(s.web) && !isChain(s);
let todo;
if (mode === 'trial') todo = [...sample(shops.filter(s => !s.oh && readable(s)), 120).map(s => ({ ...s, group: 'unknown' })),
                              ...sample(shops.filter(s => s.oh && readable(s)), 30).map(s => ({ ...s, group: 'control' }))];
else if (mode === 'redo') { const ids = new Set(argv.slice(1).filter(a => !a.startsWith('--'))); todo = shops.filter(s => ids.has(s.oid)).map(s => ({ ...s, group: s.oh ? 'control' : 'unknown', redo: true })) }
else {  // 全量：离市中心近的先跑，中途停下（比如到了预算）也是常去的区域先有数据
  const km = (a, b) => Math.hypot((a.lat - 43.6532) * 111, (a.lng + 79.3832) * 80.4);
  todo = shops.filter(s => !s.oh && readable(s)).map(s => ({ ...s, group: 'unknown' })).sort((a, b) => km(a) - km(b));
}
const remaining = todo.filter(s => s.redo || !done.has(s.oid));
console.log(`还剩 ${remaining.length} 家没跑`);
todo = remaining.slice(0, LIMIT);  // 先抽样再去掉已跑过的，中断后接着跑还是同一批

// 只把和营业时间、菜单、价格相关的文字发给 DeepSeek，省 token
const HOURS_WORD = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\b|hours|open|close[ds]?\b|daily|\b\d{1,2}(:\d\d)?\s*(am|pm)\b|\b\d{1,2}:\d\d\b|周[一二三四五六日]|营业/gi;
function windows(text, re, span, max) {
  const hits = [...text.matchAll(re)].map(m => m.index); if (!hits.length) return '';
  const parts = []; let [a, b] = [Math.max(0, hits[0] - span), hits[0] + span];
  for (const h of hits.slice(1)) { if (h - span <= b) b = h + span; else { parts.push(text.slice(a, b)); [a, b] = [Math.max(0, h - span), h + span] } }
  parts.push(text.slice(a, b));
  return parts.join(' … ').slice(0, max);
}
async function gather(web) {
  const home = await openSite(web);
  let hours = windows(home.text, HOURS_WORD, 220, 2500), menu = '', pages = 1;
  for (const l of links(home.html, home.url, HOURS_LINK, 2)) {
    if (hours.length > 1500) break;
    try { const p = await page(l); pages++; hours += ' … ' + windows(p.text, HOURS_WORD, 220, 2000) } catch {}
  }
  for (const l of links(home.html, home.url, MENU_LINK, 2)) {
    if (menu.length > 3000) break;
    try { const p = await page(l, true); pages++; menu += ' … ' + p.text.slice(0, 3500) } catch {}
  }
  return { intro: home.text.slice(0, 600), hours: hours.slice(0, 4000), menu: menu.slice(0, 4000), pages, rendered: !!home.rendered };
}

const SYSTEM = `你从多伦多餐馆的官网文字里提取信息，只输出 JSON：
{"hours":"OSM opening_hours 格式，如 Mo-Th 11:00-22:00; Fr-Sa 11:00-23:00; Su 12:00-21:00；过夜写 18:00-02:00；某天不开写 Tu off；找不到就空字符串",
 "hours_quote":"网页上营业时间的原文（简短）",
 "dishes":[{"zh":"中文菜名","en":"原文菜名"}],
 "price":{"min":数字,"max":数字},
 "note":"一句话说明，比如网页和餐馆无关、有多家分店等"}
规则：
- 营业时间只能来自网页原文，绝不猜。有多家分店时只取地址和给定地址相符的那家；对不上就留空。忽略节假日特别时间、厨房截单时间、外卖时间；早午餐/午餐/晚餐分段就写成多个时间段，每一天只能出现在一条规则里（同一天多个时段用逗号连：We 10:00-15:00,17:00-22:00）。某一餐写着 Closed（如 Brunch Mon-Tue Closed）只表示那一餐不开，那天别的餐照常，不能写成 off。
- 12 小时制要换成 24 小时制（12pm=12:00，12am=00:00），过了午夜写成 22:00-02:00。
- 招牌菜最多 3 道：优先 signature / popular / best seller / chef's special / 招牌 标注的主菜；不要饮料、白饭、配菜、零售商品；没有菜品信息就空数组。
- price 是一个人正常吃一顿（一道主食，可带一杯饮料）大概花多少加元，根据菜单标价估一个区间；菜单没价格就 null。
- 网页内容和这家餐馆无关（域名被占、服务器默认页、广告、赌博）时，全部留空并在 note 里说明。`;

// 找出在多条规则里重复出现的日子（off 规则不算）
const DAY = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
function repeatedDays(oh) {
  const seen = new Set(), dup = new Set();
  for (const rule of (oh || '').split(';')) {
    const m = rule.trim().match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?,?\s*)+)(.*)$/);
    if (!m || /^(off|closed)$/i.test(m[2].trim())) continue;
    const days = new Set();
    for (const part of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
      const [a, b = a] = part.split('-'); let i = DAY.indexOf(a);
      for (let n = 0; n < 7; n++) { days.add(DAY[i]); if (DAY[i] === b) break; i = (i + 1) % 7 }
    }
    for (const d of days) (seen.has(d) ? dup : seen).add(d);
  }
  return dup.size ? [...dup].join('、') : '';
}

async function one(s) {
  const g = await gather(s.web);
  if (g.hours.length + g.menu.length < 80) return { skip: '网页没有可用文字', pages: g.pages };
  const r = await ask(SYSTEM, `餐馆：${s.name}${s.zh ? ' / ' + s.zh : ''}\n地址：${s.addr || '未知'}, ${s.city || ''}\n\n[首页开头] ${g.intro}\n\n[营业时间相关] ${g.hours || '（没找到）'}\n\n[菜单] ${g.menu || '（没找到）'}`);
  let hours = (r.hours || '').trim();
  const dup = repeatedDays(hours);
  if (dup) { // 同一天出现在两条规则里，后一条会把前一条盖掉（比如早午餐和晚餐分开写），让它合并一次
    const fix = await ask(SYSTEM, `你给的营业时间「${hours}」里，${dup} 出现在不止一条规则中。按 OSM 格式，后面的规则会覆盖前面的，同一天的多个时段会丢失。请对照原文「${r.hours_quote || ''}」重写成每一天只出现一次、同一天多个时段用逗号连起来的写法（如 We-Su 10:00-15:00,17:00-22:00）。其他字段照抄上次的结果：${JSON.stringify({ dishes: r.dishes, price: r.price, note: r.note })}`);
    if (fix.hours && !repeatedDays(fix.hours.trim())) hours = fix.hours.trim();
  }
  const valid = hours && parseOH(hours) ? hours : '';
  const price = r.price && isFinite(r.price.min) && isFinite(r.price.max) && r.price.min > 0 && r.price.max < 500 ? { min: Math.round(r.price.min), max: Math.round(r.price.max) } : null;
  return { hours: valid, hoursRaw: valid ? undefined : hours || undefined, quote: r.hours_quote, dishes: (r.dishes || []).slice(0, 3), price, note: r.note, pages: g.pages, rendered: g.rendered };
}

spend.balance0 = await balance(); spend.balanceNow = spend.balance0;
console.log(`${mode === 'trial' ? '试跑' : '全量'}：${todo.length} 家，预算 $${BUDGET}，账户余额 $${spend.balance0}`);
const out = fs.createWriteStream(OUT, { flags: 'a' });
let next = 0, n = 0, stopped = false;
const t0 = Date.now();
await Promise.all(Array.from({ length: CONC }, async () => {
  while (next < todo.length && !stopped) {
    const real = spend.balance0 - spend.balanceNow;
    if (real >= BUDGET * 0.97 || spend.est >= BUDGET * 2) { stopped = true; console.log(`\n⚠ 实际已花 $${real.toFixed(2)}（估算 $${spend.est.toFixed(2)}），到预算 $${BUDGET} 了，停止。`); break }
    const s = todo[next++];
    let rec;
    try { rec = { oid: s.oid, name: s.name, web: s.web, group: s.group, truth: s.oh || undefined, ...(await one(s)) } }
    catch (e) { rec = { oid: s.oid, name: s.name, web: s.web, group: s.group, truth: s.oh || undefined, error: e.message.slice(0, 120) } }
    out.write(JSON.stringify(rec) + '\n');
    n++;
    if (n % 20 === 0) { try { spend.balanceNow = await balance() } catch {} }
    const tag = rec.error ? '失败' : rec.skip ? '跳过' : rec.hours ? '有时间' : '没时间';
    console.log(`[${n}/${todo.length}] ${tag.padEnd(3)} ${s.name}  ${rec.hours || rec.error || rec.skip || ''}${rec.price ? `  $${rec.price.min}-${rec.price.max}` : ''}  (实际 $${(spend.balance0 - spend.balanceNow).toFixed(2)} · 估算 $${spend.est.toFixed(2)})`);
  }
}));
out.end();
try { spend.balanceNow = await balance() } catch {}
console.log(`\n完成 ${n} 家，用时 ${Math.round((Date.now() - t0) / 1000)} 秒，DeepSeek 调用 ${spend.calls} 次，token 输入 ${spend.inTok}（缓存 ${spend.cachedTok}）输出 ${spend.outTok}`);
console.log(`花费：按 token 估算 $${spend.est.toFixed(3)}（估价偏高）；余额 $${spend.balance0} → $${spend.balanceNow}（余额更新可能有延迟）`);
