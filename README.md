# GTA 今天吃什么

大多伦多附近吃饭灵感：按步行 / 骑车 / 打车时间划范围，随机抽一家或按关键词找，看到店时还开不开门。

## 打开方式
- 最简单：直接双击 `index.html` 用浏览器打开。
- 在 VS Code 里：用 VS Code 打开这个文件夹，安装推荐的 **Live Server** 插件，右键 `index.html` →「Open with Live Server」，改完保存会自动刷新。

## 文件说明
| 文件 | 内容 |
|---|---|
| `index.html` | 页面结构（位置栏、关键词区、列表、地图） |
| `style.css` | 所有样式；颜色都在最上面的 `:root` 变量里，深色模式在下面两段 |
| `app.js` | 页面逻辑 |
| `data/food-data.js` | 约 2.8 万家店（脚本合并生成，不要手改） |
| `scripts/src/osm-food-data.js` | 原始 OpenStreetMap 数据（合并的输入，不要改） |
| `scripts/merge_places.py` | 合并 OSM + Overture + DineSafe，生成 `data/food-data.js` |
| `data/site-data.js` | 从店家官网提取的营业时间、人均、招牌菜（脚本生成，不要手改） |
| `i18n.js` | 中英文界面文字 |
| `scripts/site_info.mjs` | 读店家官网，用 DeepSeek 提取营业时间、招牌菜、人均（需要 `.env` 里的 `DEEPSEEK_API_KEY`） |
| `scripts/build-site-data.mjs` | 把 `scripts/out/siteinfo.jsonl` 合并成 `data/site-data.js` |
| `scripts/dishes.mjs` | 早期的招牌菜试跑脚本 |
| `backup-v1/` | 改版前的旧界面 |

## 常改的地方（都在 `app.js`）
- `ZH`：菜系英文 → 中文名称
- `HOODS`：「我在哪」下拉里的区域和坐标
- `KW`：关键词词库（菜系 / 想吃点 / 场景）
- `MODES`：步行 / 骑车 / 打车的速度、绕路系数和等车时间
- `status` 里的 `need`：离关门还剩多少分钟算「能吃上」（餐厅 45，快餐/咖啡 20）

## 数据
三个来源合并（`scripts/merge_places.py`）：
- **OpenStreetMap**：原始数据，2026-09-28 抓取，约 1.4 万家。
- **Overture Maps**（2026-09-23.1 版）：补上 OSM 漏收的约 1.2 万家，并给已有的店补官网和电话。只取置信度 ≥ 0.6、没标关门的。
- **多伦多 DineSafe**（市卫生检查，每天更新）：近两年检查过的店，补上前两个来源都没有的约 2,000 家，也用来确认店还在营业。只覆盖多伦多市。

同一家店的判断：80 米内、店名相近。营业时间只有 OSM 有，没有的连锁分店按同名店推测，其余显示「时间未知」。

重新合并（需要先建 Python 环境：`python3 -m venv scripts/.venv && scripts/.venv/bin/pip install duckdb`）：
```
# 1. 下载 Overture（约 40 MB，改 release 号可换新版本，见 https://stac.overturemaps.org/catalog.json）
scripts/.venv/bin/python -c "import duckdb;c=duckdb.connect();c.execute(\"INSTALL httpfs;LOAD httpfs;SET s3_region='us-west-2'\");c.execute(\"COPY (SELECT id,confidence,websites,phones,socials,brand.names.primary AS brand,addresses,names.primary AS name,names.common AS names_common,operating_status,basic_category,taxonomy,bbox.xmin AS lng,bbox.ymin AS lat,sources FROM read_parquet('s3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*',hive_partitioning=1) WHERE bbox.xmin BETWEEN -79.95 AND -78.85 AND bbox.ymin BETWEEN 43.40 AND 44.05) TO 'scripts/out/overture-gta.parquet' (FORMAT parquet)\")"
# 2. 下载 DineSafe
curl -L https://ckan0.cf.opendata.inter.prod-toronto.ca/datastore/dump/75dbb3ff-8281-4f03-9de2-bd1214761302 -o scripts/out/dinesafe.csv
# 3. 合并
scripts/.venv/bin/python scripts/merge_places.py
```

## 特色菜
```
node scripts/dishes.mjs 纬度 经度 半径km 数量   # 例：node scripts/dishes.mjs 43.6529 -79.3980 1.5 40
node scripts/build-site-data.mjs
```
有官网的店读官网菜单（含 PDF，JS 网站用本机 Chrome 渲染），没有的再问 DeepSeek 或按店名推断，网页上会标明来源。
地图底图来自 Esri（免 key），需要联网。

## 手机上用（PWA）
网址：https://yyx061.github.io/gta-eat/ （GitHub Pages，仓库 yyx061/gta-eat）
- iPhone：用 Safari 打开 → 分享 → 「添加到主屏幕」。
- 改完代码后 `git add -A && git commit -m "…" && git push`，一两分钟后生效；手机上的 App 下次联网打开时自动更新。
- 如果改动后手机上一直不更新，把 `sw.js` 里的 `VERSION` 加一再推送。
