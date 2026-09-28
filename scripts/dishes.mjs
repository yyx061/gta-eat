// 提炼特色菜：有官网的读官网菜单，没官网的问 DeepSeek（标注为推测）。
// 用法：node scripts/dishes.mjs [纬度 经度 半径km 数量]
// 默认：唐人街 Spadina 周围 1.5 km 的餐厅，取最近 40 家。
// 需要项目根目录 .env 里有 DEEPSEEK_API_KEY=...
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch {}
const KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) { console.error('缺少 DEEPSEEK_API_KEY：请在项目根目录的 .env 里写 DEEPSEEK_API_KEY=你的key'); process.exit(1); }

const [lat0 = 43.6529, lng0 = -79.3980, radiusKm = 1.5, count = 40] = process.argv.slice(2).map(Number);

global.window = {};
await import(path.join(ROOT, 'data/food-data.js'));
const D = window.FOOD_DATA;

const rad = Math.PI / 180;
const km = (a, b, c, d) => { const x = (d - b) * rad * Math.cos((a + c) / 2 * rad), y = (c - a) * rad; return Math.sqrt(x * x + y * y) * 6371; };

const shops = D.rows
  .filter(r => r[4] === 0)
  .map(r => ({ name: r[0], zh: r[1], cu: r[5].map(k => D.cuisines[k]), addr: r[7], city: r[8], web: r[11], oid: r[12], d: km(lat0, lng0, r[2], r[3]) }))
  .filter(s => s.d <= radiusKm)
  .filter((s, i, a) => a.findIndex(t => t.name === s.name && t.addr === s.addr) === i)
  .sort((a, b) => a.d - b.d)
  .slice(0, count);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en,zh;q=0.8' }, signal: AbortSignal.timeout(15000), redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  if (/pdf/i.test(res.headers.get('content-type') || '')) return { pdf: await pdfText(await res.arrayBuffer()), url: res.url };
  return { html: await res.text(), url: res.url };
}

async function pdfText(buf) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(buf)), { mergePages: true });
  return text.replace(/\s+/g, ' ').trim();
}

// 用无头 Chrome 渲染 JS 生成的页面（Wix、Squarespace、点餐平台等）
function render(url) {
  return new Promise(resolve => {
    execFile(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--user-agent=${UA}`, '--virtual-time-budget=8000', '--dump-dom', url],
      { timeout: 40000, maxBuffer: 30 << 20 }, (err, out) => resolve(err ? '' : out));
  });
}

function htmlText(html) {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

// 菜单链接：同站页面、PDF，或外部点餐/菜单平台
const MENU_HOSTS = /toasttab|square\.site|squareup|clover|menufy|popmenu|bentobox|singleplatform|allmenus|ubereats|doordash|skipthedishes|ritual|tock|opentable|resy/i;
function menuLinks(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, href, label] = m;
    if (!/menu|food|dishes|dinner|lunch|菜单/i.test(href + ' ' + htmlText(label))) continue;
    try {
      const u = new URL(href, base);
      if (!/^https?:$/.test(u.protocol) || /\.(jpe?g|png|webp|gif)$/i.test(u.pathname)) continue;
      if (u.host === new URL(base).host || /\.pdf$/i.test(u.pathname) || MENU_HOSTS.test(u.host)) out.add(u.href.replace(/\/$/, ''));
    } catch {}
  }
  out.delete(base.replace(/\/$/, ''));
  return [...out].slice(0, 3);
}

// 先直接抓；文字太少说明是 JS 渲染的，再交给 Chrome。菜单页（force）一律渲染，菜品常是 JS 加载的
async function page(url, force) {
  const r = await get(url);
  if (r.pdf != null) return { text: r.pdf, html: '', url: r.url };
  if (!force && htmlText(r.html).length >= 600) return { text: htmlText(r.html), html: r.html, url: r.url };
  const dom = await render(r.url);
  return dom ? { text: htmlText(dom), html: dom, url: r.url, rendered: true } : { text: htmlText(r.html), html: r.html, url: r.url };
}

async function siteText(web) {
  const url = /^https?:/i.test(web) ? web : 'https://' + web;
  const home = await page(url);
  let text = home.text.slice(0, 6000), menus = 0;
  for (const link of menuLinks(home.html, home.url)) {
    try { const m = await page(link, true); if (m.text) { text += '\n[MENU] ' + m.text.slice(0, 6000); menus++; } } catch {}
  }
  return { text: text.slice(0, 20000), menus, rendered: !!home.rendered };
}

async function ask(prompt) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + KEY },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: '你是多伦多餐馆点评助手。只输出 JSON：{"dishes":[{"zh":"中文菜名","en":"原文菜名"}],"note":"一句话说明依据"}。最多 3 道菜，按推荐程度排序。没有把握就返回空数组，绝不编造。' },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error('DeepSeek HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const j = await res.json();
  return JSON.parse(j.choices[0].message.content);
}

const label = s => `${s.name}${s.zh ? ' / ' + s.zh : ''}（菜系：${s.cu.join(', ') || '未知'}；地址：${s.addr || '未知'}, ${s.city || 'Toronto'}）`;

async function one(s) {
  if (s.web) {
    try {
      const site = await siteText(s.web);
      s.siteInfo = { menus: site.menus, rendered: site.rendered };
      if (site.text.length > 300) {
        const r = await ask(`餐馆：${label(s)}\n下面是它官网的文字（[MENU] 后面是菜单页）。只根据这些文字，挑出最能代表这家店的招牌菜：优先看 signature / popular / best seller / chef's special / 招牌 等标注；没有标注就挑最有特色的主菜。不要挑饮料、白饭、配菜，也不要挑零售包装商品。如果网页内容和这家餐馆无关（域名被占用、服务器默认页、赌博广告等），或没有菜品信息，返回空数组。\n\n${site.text}`);
        if (r.dishes?.length) return { ...r, source: 'site' };
        s.siteNote = r.note;
      }
    } catch (e) { s.webErr = e.message; }
  }
  const r = await ask(`餐馆：${label(s)}\n根据你已有的知识，这家店的招牌菜是什么？只有在你确实了解这家具体门店（不是只凭菜系猜）时才回答，否则 dishes 返回空数组。`);
  if (r.dishes?.length) return { ...r, source: 'guess' };
  const n = await ask(`餐馆：${label(s)}\n只看店名（英文名和中文名）：店名里是否点明了一道具体的菜？"具体"指比菜系或品类更细，例如 "Pan Fried Bun" → 生煎包、"过桥米线" → 过桥米线、"Pulled Noodles" → 手拉面、"Meatball" → 肉丸、"Chili Crab" → 辣椒蟹。像 火锅、拉面、越南粉、饺子、烧烤、早餐、寿司、披萨、汉堡、鸡翅、海鲜 这种只是品类，和菜系标签重复，返回空数组。店名只是泛称或地名时也返回空数组。`);
  return { ...n, source: n.dishes?.length ? 'name' : 'none' };
}

console.log(`试跑：(${lat0}, ${lng0}) 周围 ${radiusKm} km 的 ${shops.length} 家餐厅\n`);
const results = [];
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < shops.length) {
    const s = shops[next++];
    try {
      const r = await one(s);
      results.push({ oid: s.oid, name: s.name, zh: s.zh, cu: s.cu, web: s.web, webErr: s.webErr, siteInfo: s.siteInfo, siteNote: s.siteNote, ...r });
      const dishes = r.dishes.map(d => d.zh + (d.en && d.en !== d.zh ? `(${d.en})` : '')).join('、') || '—';
      console.log(`${{ site: '[官网]', guess: '[推测]', name: '[店名]', none: '[没有]' }[r.source]} ${s.name}${s.zh ? ' ' + s.zh : ''}：${dishes}${s.webErr ? `  (官网打不开：${s.webErr})` : ''}`);
    } catch (e) {
      results.push({ oid: s.oid, name: s.name, error: e.message });
      console.log(`[失败] ${s.name}：${e.message}`);
    }
  }
}));

const outDir = path.join(ROOT, 'scripts/out');
fs.mkdirSync(outDir, { recursive: true });
const outFile = `dishes-${lat0.toFixed(3)}_${lng0.toFixed(3)}.json`;
fs.writeFileSync(path.join(outDir, outFile), JSON.stringify(results, null, 2));
const n = k => results.filter(r => r.source === k).length, hit = k => results.filter(r => r.source === k && r.dishes?.length).length;
console.log(`\n共 ${results.length} 家：官网提炼 ${hit('site')}，知识推测 ${hit('guess')}，据店名 ${hit('name')}，没结果 ${n('none')}，失败 ${results.filter(r => r.error).length}`);
console.log(`有官网 ${results.filter(r => r.web).length} 家，其中打不开或读不到 ${results.filter(r => r.web && r.source !== 'site').length} 家`);
console.log(`结果已保存到 scripts/out/${outFile}`);
