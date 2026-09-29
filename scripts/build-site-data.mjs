// 把官网提取的结果合并成网页用的 data/site-data.js：营业时间、人均、招牌菜。
// 输入：scripts/out/siteinfo.jsonl（site_info.mjs 的结果，同一家店以最后一次为准）
//       scripts/out/dishes-*.json（早期 dishes.mjs 试跑的招牌菜，官网结果没有菜时才用）
// 用法：node scripts/build-site-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseOH } from './lib/oh.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts/out');

// 一周总营业时长不在 3–168 小时之间的，多半是解析错了，不用
function sane(oh) {
  const iv = parseOH(oh); if (!iv) return false;
  const hours = iv.reduce((a, [s, e]) => a + (e - s), 0) / 60;
  return hours >= 3 && hours <= 168;
}
const cleanDishes = ds => {
  const seen = new Set(), out = [];
  for (const d of ds || []) {
    const zh = String(d.zh || '').trim(), en = String(d.en || '').trim();
    const key = (en || zh).toLowerCase();
    if (!key || seen.has(key) || (zh + en).length > 80) continue;
    seen.add(key); out.push([zh || en, en && en !== zh ? en : '']);
  }
  return out.slice(0, 3);
};

const site = {};
const stat = { records: 0, hours: 0, hoursRejected: 0, price: 0, dishes: 0, trialDishes: 0 };

// 1) 官网结果
const lines = fs.existsSync(path.join(OUT, 'siteinfo.jsonl')) ? fs.readFileSync(path.join(OUT, 'siteinfo.jsonl'), 'utf8').split('\n').filter(Boolean) : [];
const last = new Map();
for (const l of lines) { try { const r = JSON.parse(l); last.set(r.oid, r) } catch {} }
for (const r of last.values()) {
  stat.records++;
  if (r.error || r.skip) continue;
  const e = {};
  // 已有 OSM 营业时间的店（试跑对照组）不覆盖，只用来补招牌菜和人均
  if (r.hours && r.group !== 'control') { if (sane(r.hours)) { e.h = r.hours; stat.hours++ } else stat.hoursRejected++ }
  const p = r.price;
  if (p && p.min >= 3 && p.max <= 300 && p.min <= p.max) { e.p = [p.min, p.max]; stat.price++ }
  const d = cleanDishes(r.dishes);
  if (d.length) { e.d = d; e.s = 'site'; stat.dishes++ }
  if (Object.keys(e).length) site[r.oid] = e;
}

// 2) 早期试跑的招牌菜（官网没提取到菜时才用）
for (const f of fs.readdirSync(OUT).filter(f => /^dishes-.*\.json$/.test(f))) {
  for (const r of JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'))) {
    if (!r.dishes?.length || !['site', 'guess', 'name'].includes(r.source)) continue;
    const e = site[r.oid] ||= {};
    if (e.d) continue;
    e.d = cleanDishes(r.dishes); e.s = r.source; stat.trialDishes++;
  }
}

const header = '// 官网提取的营业时间、人均、招牌菜：由 scripts/site_info.mjs 提取、scripts/build-site-data.mjs 生成，不要手改\n'
  + '// 每项：编号 → { h: 营业时间(OSM 格式), p: [人均最低, 最高](加元), d: [[中文菜名, 原文菜名], ...], s: 招牌菜来源(site 官网 / guess AI 推测 / name 据店名) }\n';
fs.writeFileSync(path.join(ROOT, 'data/site-data.js'), header + 'window.SITE_DATA = ' + JSON.stringify(site) + ';\n');
console.log(`写入 data/site-data.js：${Object.keys(site).length} 家`);
for (const [k, v] of Object.entries(stat)) console.log(`  ${k}: ${v}`);
