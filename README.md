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
| `data/food-data.js` | 约 1.4 万家店的数据（很大，一般不用手改） |
| `data/dish-data.js` | 特色菜（脚本生成，不要手改） |
| `scripts/dishes.mjs` | 用 DeepSeek 提炼特色菜（需要 `.env` 里的 `DEEPSEEK_API_KEY`） |
| `scripts/build-dish-data.mjs` | 把 `scripts/out/` 的结果合并成 `data/dish-data.js` |
| `backup-v1/` | 改版前的旧界面 |

## 常改的地方（都在 `app.js`）
- `ZH`：菜系英文 → 中文名称
- `HOODS`：「我在哪」下拉里的区域和坐标
- `KW`：关键词词库（菜系 / 想吃点 / 场景）
- `MODES`：步行 / 骑车 / 打车的速度、绕路系数和等车时间
- `status` 里的 `need`：离关门还剩多少分钟算「能吃上」（餐厅 45，快餐/咖啡 20）

## 数据
来自 OpenStreetMap（Overpass API，2026-09-28 抓取），范围 43.40,-79.95 到 44.05,-78.85。
营业时间只有约 21% 的店有登记；页面里可以给单个店补营业时间（存在浏览器 localStorage）。

## 特色菜
```
node scripts/dishes.mjs 纬度 经度 半径km 数量   # 例：node scripts/dishes.mjs 43.6529 -79.3980 1.5 40
node scripts/build-dish-data.mjs
```
有官网的店读官网菜单（含 PDF，JS 网站用本机 Chrome 渲染），没有的再问 DeepSeek 或按店名推断，网页上会标明来源。
地图底图来自 Esri（免 key），需要联网。

## 手机上用（PWA）
网址：https://yyx061.github.io/gta-eat/ （GitHub Pages，仓库 yyx061/gta-eat）
- iPhone：用 Safari 打开 → 分享 → 「添加到主屏幕」。
- 改完代码后 `git add -A && git commit -m "…" && git push`，一两分钟后生效；手机上的 App 下次联网打开时自动更新。
- 如果改动后手机上一直不更新，把 `sw.js` 里的 `VERSION` 加一再推送。
