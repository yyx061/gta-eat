// 店家资料：和网页用同一份 food-data.js / site-data.js（从 GitHub Pages 读，不另存一份）。
// 本机测试时设 DATA_DIR=../data 直接读本地文件。

export type Store = {
  oid: string; name: string; zh: string; lat: number; lng: number;
  type: number; cuisines: string[]; hours: string; hoursSrc: string;
  address: string; city: string; veg: number; takeout: number;
  website: string; phone: string; inspected: string;
  price?: [number, number]; dishes?: [string, string][]; dishSrc?: string;
};

const BASE = Deno.env.get("DATA_BASE") || "https://yyx061.github.io/gta-eat/data/";
const DIR = Deno.env.get("DATA_DIR");

async function readJs(file: string, global: string): Promise<any> {
  const txt = DIR ? await Deno.readTextFile(`${DIR}/${file}`) : await (await fetch(BASE + file)).text();
  const i = txt.indexOf(`window.${global}`);
  const start = txt.indexOf("=", i) + 1;
  return JSON.parse(txt.slice(start).trim().replace(/;\s*$/, ""));
}

let loading: Promise<Map<string, Store>> | null = null;
let loadedAt = 0;

// 6 小时重新读一次，网页更新数据后服务器也跟着更新
export function stores(): Promise<Map<string, Store>> {
  if (!loading || Date.now() - loadedAt > 6 * 3600e3) {
    loadedAt = Date.now();
    loading = load().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

async function load(): Promise<Map<string, Store>> {
  const [F, SITE] = await Promise.all([readJs("food-data.js", "FOOD_DATA"), readJs("site-data.js", "SITE_DATA")]);
  const CUI: string[] = F.cuisines;
  const m = new Map<string, Store>();
  for (const r of F.rows) {
    const [name, zh, lat, lng, type, cu, oh, addr, city, veg, take, web, oid, phone, , ds] = r;
    const s = SITE[oid] || {};
    m.set(oid, {
      oid, name, zh, lat, lng, type, cuisines: (cu || []).map((i: number) => CUI[i]),
      hours: oh || s.h || "", hoursSrc: oh ? "OpenStreetMap" : s.h ? "官网" : "",
      address: addr, city, veg, takeout: take, website: web, phone, inspected: ds || "",
      price: s.p, dishes: s.d, dishSrc: s.s,
    });
  }
  return m;
}

const R = 6371000, rad = Math.PI / 180;
export function dist(a: number, b: number, c: number, d: number) {
  const x = (d - b) * rad * Math.cos((a + c) / 2 * rad), y = (c - a) * rad;
  return Math.sqrt(x * x + y * y) * R;
}
