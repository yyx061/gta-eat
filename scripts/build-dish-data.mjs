// 把 scripts/out/dishes-*.json（dishes.mjs 的结果）合并成网页用的 data/dish-data.js
// 用法：node scripts/build-dish-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts/out');
const map = {};
for (const f of fs.readdirSync(OUT).filter(f => /^dishes-.*\.json$/.test(f)).sort()) {
  for (const r of JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'))) {
    if (!r.dishes?.length || !['site', 'guess', 'name'].includes(r.source)) continue;
    map[r.oid] = { s: r.source, d: r.dishes.slice(0, 3).map(d => [d.zh || d.en, d.en && d.en !== d.zh ? d.en : '']) };
  }
}
const header = '// 特色菜：由 scripts/dishes.mjs 提炼、scripts/build-dish-data.mjs 生成，不要手改\n// 每项：OSM编号 → { s: 来源(site 官网 / guess AI 推测 / name 据店名), d: [[中文名, 原文名], ...] }\n';
fs.writeFileSync(path.join(ROOT, 'data/dish-data.js'), header + 'window.DISH_DATA = ' + JSON.stringify(map) + ';\n');
console.log(`写入 data/dish-data.js：${Object.keys(map).length} 家店`);
