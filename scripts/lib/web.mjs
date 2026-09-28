// 读店家官网：先直接抓，文字太少（JS 生成的网站）再用本机无头 Chrome 渲染；支持 PDF 菜单。
import { execFile } from 'node:child_process';

export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// 这些网址读不到店家自己的内容（社交媒体、外卖平台、链接聚合），直接跳过省钱
export const UNREADABLE = /(^|\.)(facebook\.com|fb\.com|instagram\.com|linktr\.ee|linktree\.com|tiktok\.com|twitter\.com|x\.com|yelp\.(com|ca)|ubereats\.com|doordash\.com|skipthedishes\.com|grubhub\.com|fantuan\.ca|google\.com|goo\.gl|wa\.me|order\.online|youtube\.com|tripadvisor\.(com|ca)|zomato\.com|opentable\.(com|ca)|beacons\.ai|bio\.link)$/i;
export const unreadable = url => { try { return UNREADABLE.test(new URL(/^https?:/i.test(url) ? url : 'https://' + url).host) } catch { return true } };

export async function get(url) {
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

// Chrome 很吃 CPU：同时最多开 RENDER_MAX 个，不加载图片，免得电脑风扇狂转
const RENDER_MAX = +(process.env.RENDER_MAX || 2);
let rendering = 0; const waiting = [];
const slot = () => rendering < RENDER_MAX ? (rendering++, Promise.resolve()) : new Promise(r => waiting.push(r));
const release = () => { const next = waiting.shift(); if (next) next(); else rendering-- };
export async function render(url) {
  await slot();
  try {
    return await new Promise(resolve => {
      execFile(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--blink-settings=imagesEnabled=false',
        '--disable-extensions', '--disable-background-networking', `--user-agent=${UA}`, '--virtual-time-budget=6000', '--timeout=15000', '--dump-dom', url],
        { timeout: 45000, maxBuffer: 30 << 20, killSignal: 'SIGKILL' }, (err, out) => resolve(err ? '' : out));
    });
  } finally { release() }
}

export function htmlText(html) {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&ndash;|&#8211;/g, '–')
    .replace(/\s+/g, ' ').trim();
}

// 站内链接：label 或网址符合 pattern 的；另外允许 PDF 和常见点餐/菜单平台
const MENU_HOSTS = /toasttab|square\.site|squareup|clover|menufy|popmenu|bentobox|singleplatform|allmenus|ritual|tock|resy/i;
export function links(html, base, pattern, max = 3) {
  const out = new Set();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, href, label] = m;
    if (!pattern.test(href + ' ' + htmlText(label))) continue;
    try {
      const u = new URL(href, base);
      if (!/^https?:$/.test(u.protocol) || /\.(jpe?g|png|webp|gif)$/i.test(u.pathname)) continue;
      if (u.host === new URL(base).host || /\.pdf$/i.test(u.pathname) || MENU_HOSTS.test(u.host)) out.add(u.href.replace(/\/$/, ''));
    } catch {}
  }
  out.delete(base.replace(/\/$/, ''));
  return [...out].slice(0, max);
}
export const MENU_LINK = /menu|food|dishes|dinner|lunch|菜单/i;
export const HOURS_LINK = /hour|contact|location|visit|find[- ]?us|about|营业|联系/i;

// force：一律渲染（菜单页的菜品经常是 JS 加载的）
export async function page(url, force) {
  let r;
  try { r = await get(url) }
  catch (e) { // 有些站拦脚本请求（403/429 等），真 Chrome 往往能打开；域名失效之类的就别浪费时间了
    if (!/^HTTP (401|403|406|429|503)/.test(e.message)) throw e;
    const dom = await render(url);
    if (htmlText(dom).length < 200) throw e;
    return { text: htmlText(dom), html: dom, url, rendered: true };
  }
  if (r.pdf != null) return { text: r.pdf, html: '', url: r.url };
  if (!force && htmlText(r.html).length >= 600) return { text: htmlText(r.html), html: r.html, url: r.url };
  const dom = await render(r.url);
  return dom ? { text: htmlText(dom), html: dom, url: r.url, rendered: true } : { text: htmlText(r.html), html: r.html, url: r.url };
}

// 首页：连不上时换 https / http、加减 www 再试（很多登记的网址协议或 www 不对）
export async function openSite(web) {
  const u0 = new URL(/^https?:/i.test(web) ? web : 'https://' + web);
  const alt = [];
  for (const proto of [u0.protocol, u0.protocol === 'https:' ? 'http:' : 'https:'])
    for (const host of [u0.host, u0.host.startsWith('www.') ? u0.host.slice(4) : 'www.' + u0.host])
      alt.push(`${proto}//${host}${u0.pathname}${u0.search}`);
  let err;
  for (const url of [...new Set(alt)]) {
    try { return await page(url) }
    catch (e) { err = e; if (/^HTTP /.test(e.message)) throw e }  // 服务器有回应（404 之类）就不用再换了
  }
  throw err;
}
