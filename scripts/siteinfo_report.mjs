// 汇总 scripts/out/siteinfo.jsonl：覆盖率、对照组准确度，生成 scripts/out/siteinfo-report.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOH } from './lib/oh.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let recs = fs.readFileSync(path.join(ROOT, 'scripts/out/siteinfo.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const lastByOid = new Map(recs.map(r => [r.oid, r])); recs.length = 0; recs.push(...lastByOid.values());  // 重跑过的以最后一次为准
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 按天比较：每天的开门区间（分钟）都在 15 分钟误差内算这天一致
const byDay = iv => { const d = [[], [], [], [], [], [], []]; for (const [a, b] of iv) d[Math.floor(a / 1440) % 7].push([a % 1440, b - Math.floor(a / 1440) * 1440]); return d.map(x => x.sort((p, q) => p[0] - q[0])) };
function compare(a, b) {
  const A = parseOH(a), B = parseOH(b); if (!A || !B) return null;
  const da = byDay(A), db = byDay(B);
  let same = 0;
  for (let i = 0; i < 7; i++) same += da[i].length === db[i].length && da[i].every(([x, y], k) => Math.abs(x - db[i][k][0]) <= 15 && Math.abs(y - db[i][k][1]) <= 15) ? 1 : 0;
  return same;
}

const unk = recs.filter(r => r.group === 'unknown'), ctl = recs.filter(r => r.group === 'control');
const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
const cnt = (arr, f) => arr.filter(f).length;
const S = {
  unknown: unk.length, gotHours: cnt(unk, r => r.hours), gotDishes: cnt(unk, r => r.dishes?.length), gotPrice: cnt(unk, r => r.price),
  failed: cnt(unk, r => r.error), skipped: cnt(unk, r => r.skip), invalidHours: cnt(unk, r => r.hoursRaw),
};
const cmp = ctl.filter(r => r.hours).map(r => ({ r, same: compare(r.hours, r.truth) }));
const C = { control: ctl.length, gotHours: cmp.length, exact: cnt(cmp, x => x.same === 7), mostly: cnt(cmp, x => x.same >= 5 && x.same < 7), off: cnt(cmp, x => x.same !== null && x.same < 5) };

console.log(`时间未知组 ${S.unknown} 家：提取到营业时间 ${S.gotHours}（${pct(S.gotHours, S.unknown)}），招牌菜 ${S.gotDishes}（${pct(S.gotDishes, S.unknown)}），人均 ${S.gotPrice}（${pct(S.gotPrice, S.unknown)}）；打不开 ${S.failed}，没文字 ${S.skipped}，格式不对被丢弃 ${S.invalidHours}`);
console.log(`对照组 ${C.control} 家：提取到 ${C.gotHours}；7 天全一致 ${C.exact}，5–6 天一致 ${C.mostly}，差别大 ${C.off}`);

const row = r => `<tr><td><b>${esc(r.name)}</b><br><a href="${esc(r.web)}" target="_blank">${esc(r.web.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40))}</a></td>
  <td class="num">${esc(r.hours || r.hoursRaw && '（格式不对）' + r.hoursRaw || '')}${r.quote ? `<br><small>原文：${esc(r.quote)}</small>` : ''}${r.truth ? `<br><small>现有数据：${esc(r.truth)}</small>` : ''}</td>
  <td>${(r.dishes || []).map(d => esc(d.zh) + (d.en ? `<br><small>${esc(d.en)}</small>` : '')).join('<hr>')}</td>
  <td class="num">${r.price ? `$${r.price.min}–${r.price.max}` : ''}</td>
  <td><small>${esc(r.error || r.skip || r.note || '')}</small></td></tr>`;
const table = (title, arr, extra = '') => `<h2>${title}</h2>${extra}<table><tr><th>店</th><th>营业时间</th><th>招牌菜</th><th>人均</th><th>备注</th></tr>${arr.map(row).join('')}</table>`;
const verdict = x => x.same === 7 ? '✅ 一致' : x.same >= 5 ? '🟡 大部分一致' : '❌ 差别大';
fs.writeFileSync(path.join(ROOT, 'scripts/out/siteinfo-report.html'), `<!doctype html><meta charset=utf-8><title>官网信息试跑</title>
<style>body{font:14px -apple-system,"PingFang SC",sans-serif;max-width:1200px;margin:24px auto;padding:0 16px;color:#222}table{border-collapse:collapse;width:100%;margin-bottom:32px}td,th{border-bottom:1px solid #eee;padding:8px;text-align:left;vertical-align:top}th{background:#f6f6f6}small{color:#777}.num{font-family:ui-monospace,Menlo,monospace;font-size:12px}hr{border:0;border-top:1px dashed #ddd;margin:4px 0}.stat{background:#f4f6f3;border-radius:10px;padding:12px 16px;line-height:1.8}</style>
<h1>官网信息试跑</h1>
<div class="stat">时间未知组 <b>${S.unknown}</b> 家：营业时间 <b>${S.gotHours}</b>（${pct(S.gotHours, S.unknown)}）· 招牌菜 <b>${S.gotDishes}</b>（${pct(S.gotDishes, S.unknown)}）· 人均 <b>${S.gotPrice}</b>（${pct(S.gotPrice, S.unknown)}）· 打不开 ${S.failed} · 没文字 ${S.skipped}<br>
对照组 <b>${C.control}</b> 家（已有营业时间，拿来检验准确度）：提取到 ${C.gotHours} 家，其中 7 天全一致 <b>${C.exact}</b>、5–6 天一致 ${C.mostly}、差别大 ${C.off}。注意「现有数据」本身也可能过时。</div>
${table('对照组：提取结果 vs 现有数据', cmp.map(x => ({ ...x.r, note: verdict(x) + (x.r.note ? ' · ' + x.r.note : '') })).concat(ctl.filter(r => !r.hours)))}
${table('时间未知组：提取到营业时间的', unk.filter(r => r.hours))}
${table('时间未知组：没提取到的', unk.filter(r => !r.hours))}`);
console.log('报告：scripts/out/siteinfo-report.html');
