// 店家 AI（我们代建的）：只根据这家店自己的公开资料 + 对方告诉它的情况回答，不知道就说不知道。

import type { Store } from "./data.ts";
import { askJSON } from "./llm.ts";

// 找饭 AI 发来的结构化问题（A2A 消息里的 data 部分）
export type Question = {
  lang?: "zh" | "en";
  need?: string;            // 用户自己写的要求
  party?: number;           // 几个人
  when?: string;            // 「周五 19:10」
  weather?: string;         // 「雨 4°C」
  arriveInMin?: number;     // 多久能到
  constraints?: string[];   // 硬条件：不吃辣、素食、人均不超过 25 加元…
  observed?: { status?: string; open?: string; google?: { rating?: number; count?: number; status?: string } }; // 顾客 App 看到的
};

export type Answer = {
  reply: string;
  canSeat: "yes" | "likely" | "unknown" | "closed";
  openUntil: string;
  reservation: { reservable: "yes" | "no" | "unknown"; advice: string };
  waitGuess: { level: "none" | "maybe" | "likely" | "unknown"; basis: string };
  mustOrder: { dish: string; source: string }[];
  fit: { score: number; because: string };
  caveats: string[];
  sources: string[];
  by: "ai" | "rules";
};

const TYPE = { zh: ["餐厅", "快餐", "咖啡/甜品", "美食广场"], en: ["restaurant", "fast food", "cafe", "food court"] };
const DSRC: Record<string, { zh: string; en: string }> = {
  site: { zh: "官网菜单", en: "official menu" }, guess: { zh: "AI 推测", en: "AI guess" }, name: { zh: "店名", en: "store name" },
};

function profile(s: Store, lang: "zh" | "en") {
  return {
    name: s.name, chineseName: s.zh || undefined, kind: TYPE[lang][s.type] || TYPE[lang][0],
    cuisines: s.cuisines, address: [s.address, s.city].filter(Boolean).join(", ") || undefined,
    phone: s.phone || undefined, website: s.website || undefined,
    hours: s.hours ? `${s.hours}（OSM 格式，来源：${s.hoursSrc}）` : undefined,
    pricePerPersonCAD: s.price ? `${s.price[0]}–${s.price[1]}` : undefined,
    signatureDishes: s.dishes?.length
      ? { list: s.dishes.map(([zh, orig]) => (lang === "zh" ? zh : orig || zh)), source: DSRC[s.dishSrc || ""]?.[lang] || s.dishSrc }
      : undefined,
    vegetarian: s.veg === 2 ? "vegan options/only" : s.veg === 1 ? "has vegetarian options" : undefined,
    takeout: s.takeout ? "yes" : undefined,
    lastHealthInspection: s.inspected || undefined,
  };
}

const SYS = {
  zh: `你是一家餐厅的 AI 接待，由「GTA 今天吃什么」代建，只掌握下面给你的公开资料。另一个帮顾客挑餐厅的 AI 会来问你。
规则：
1. 只用【店铺资料】和【顾客情况】里的事实。资料里没有的就写 unknown 或留空，绝不编造菜名、价格、等位时间、订位情况。
2. mustOrder 只能从资料的招牌菜里挑 1–2 个，source 照抄资料里招牌菜的来源；资料没有招牌菜就给 []。
3. canSeat：按顾客 App 看到的营业状态判断。已关门 → closed；快餐 / 咖啡 / 美食广场且营业中 → yes；正经餐厅营业中 → likely；状态未知 → unknown。
4. waitGuess.level 只能是 none / maybe / likely / unknown，是估计：周五周六晚饭、Google 评论数很多、人多时更可能要等；basis 写清依据并带「估计」二字。
5. reservation.reservable 一律填 unknown；advice 给一句实用建议，按顾客实际人数说（例如「X 位周五晚上建议先打电话 + 电话号码」），不要说「我们没有订位数据」这类话。
6. fit.score 0–1：看顾客的要求和硬条件。硬条件不满足（例如要素食但资料看不出有素食、太辣、超预算）时 score ≤ 0.2，because 写明原因；because 必须含一个具体事实（菜名、数字、营业到几点）。
7. reply：用店家第一人称回一句话，口语、具体，不超过 50 个字。reply 和 because 里提到的菜只能是资料里的招牌菜原名；资料没有人均价格就不要说价格或「多少钱能吃饱」。
9. 不要迎合顾客：资料看不出能满足的要求（比如有没有汤、安不安静），reply 里要直说「这点我们资料里看不出」，不要顺着说。
8. caveats：顾客需要注意的点（例如营业时间来自网上、可能不准），最多 2 条。
只输出 JSON：{"reply":"","canSeat":"","openUntil":"HH:MM 或空","reservation":{"reservable":"unknown","advice":""},"waitGuess":{"level":"","basis":""},"mustOrder":[{"dish":"","source":""}],"fit":{"score":0,"because":""},"caveats":[]}`,
  en: `You are a restaurant's AI host, built on its behalf by the "GTA Eat" app. You only know the public profile below. Another AI that helps a diner choose will ask you questions.
Rules:
1. Use only facts from [Store profile] and [Diner situation]. If something isn't there, say unknown or leave it empty. Never invent dishes, prices, wait times or reservation info.
2. mustOrder: pick 1–2 from the profile's signature dishes only, copy their source; [] if there are none.
3. canSeat: from the status the diner's app sees. Closed → closed; fast food / cafe / food court and open → yes; sit-down restaurant open → likely; status unknown → unknown.
4. waitGuess.level is none / maybe / likely / unknown and is only an estimate (Fri/Sat dinner, many Google reviews, bigger parties → more likely); basis states why and says it's an estimate.
5. reservation.reservable: always unknown; advice is one practical tip using the diner's actual party size (e.g. "for N on a Friday night, call ahead" + phone if known); don't say "we have no booking data".
6. fit.score 0–1 against the diner's needs and hard constraints. If a hard constraint fails (vegetarian not evident, too spicy, over budget) score ≤ 0.2 and say why. because must contain one concrete fact (a dish, a number, a closing time).
7. reply: one sentence in the restaurant's first person, natural and specific, max 25 words. Any dish named in reply or because must be one of the profile's signature dishes; if the profile has no price, don't mention price.
9. Don't flatter: if the profile doesn't show a request can be met (soup, quiet, etc.), say so plainly in reply instead of agreeing.
8. caveats: at most 2 things the diner should know (e.g. hours come from the web and may be off).
Output JSON only: {"reply":"","canSeat":"","openUntil":"HH:MM or empty","reservation":{"reservable":"unknown","advice":""},"waitGuess":{"level":"","basis":""},"mustOrder":[{"dish":"","source":""}],"fit":{"score":0,"because":""},"caveats":[]}`,
};

const pick = <T extends string>(v: unknown, ok: readonly T[], d: T): T => (ok as readonly string[]).includes(v as string) ? v as T : d;
const str = (v: unknown, n: number) => typeof v === "string" ? v.slice(0, n) : "";

// AI 答不上来（超时、格式错）时，用规则拼一个答案，保证总有回复
export function ruleAnswer(s: Store, q: Question): Answer {
  const zh = (q.lang || "zh") === "zh", st = q.observed?.status || "";
  const closed = /closed|关/.test(st) && !/营业中|open/i.test(st);
  const canSeat: Answer["canSeat"] = closed ? "closed" : !st || /unk|未知/i.test(st) ? "unknown" : s.type === 0 ? "likely" : "yes";
  const d = s.dishes?.slice(0, 2).map(([a, b]) => ({ dish: zh ? a : b || a, source: DSRC[s.dishSrc || ""]?.[zh ? "zh" : "en"] || "" })) || [];
  return {
    reply: d.length ? (zh ? `我们的招牌是${d.map((x) => x.dish).join("、")}。` : `Our signature: ${d.map((x) => x.dish).join(", ")}.`)
      : (zh ? `我是${s.zh || s.name}，资料不多，出发前可以打电话确认。` : `This is ${s.name}; we have little info online, call ahead to confirm.`),
    canSeat, openUntil: q.observed?.open || "",
    reservation: { reservable: "unknown", advice: s.phone ? (zh ? `可以先打电话：${s.phone}` : `Call ahead: ${s.phone}`) : "" },
    waitGuess: { level: "unknown", basis: "" },
    mustOrder: d, fit: { score: 0.5, because: "" }, caveats: [], sources: sourcesOf(s, q), by: "rules",
  };
}

function sourcesOf(s: Store, q: Question) {
  const l = ["OpenStreetMap / Overture"];
  if (s.dishes || s.price || s.hoursSrc === "官网") l.push(s.dishSrc === "site" || s.hoursSrc === "官网" ? "官网" : "AI 推测");
  if (q.observed?.google) l.push("Google");
  return l;
}

export async function answer(s: Store, q: Question, text: string): Promise<Answer> {
  const lang = q.lang === "en" ? "en" : "zh";
  const user = `【店铺资料 / Store profile】\n${JSON.stringify(profile(s, lang))}\n\n【顾客情况 / Diner situation】\n${JSON.stringify(q)}\n\n【问题 / Question】\n${text}`;
  try {
    const a = await askJSON(SYS[lang], user, 450, 9000);
    const fb = ruleAnswer(s, q);
    // 不许编招牌菜：只留资料里有的
    const known = new Set((s.dishes || []).flatMap(([x, y]) => [x, y].filter(Boolean).map((v) => v.toLowerCase())));
    const must = (Array.isArray(a.mustOrder) ? a.mustOrder : []).filter((m: any) => known.has(String(m?.dish || "").toLowerCase()))
      .slice(0, 2).map((m: any) => ({ dish: str(m.dish, 40), source: str(m.source, 20) }));
    return {
      reply: str(a.reply, 120) || fb.reply,
      canSeat: pick(a.canSeat, ["yes", "likely", "unknown", "closed"] as const, fb.canSeat),
      openUntil: /^\d{1,2}:\d{2}$/.test(a.openUntil) ? a.openUntil : fb.openUntil,
      reservation: { reservable: "unknown", advice: str(a.reservation?.advice, 120) },
      waitGuess: { level: pick(a.waitGuess?.level, ["none", "maybe", "likely", "unknown"] as const, "unknown"), basis: str(a.waitGuess?.basis, 100) },
      mustOrder: must,
      fit: { score: Math.max(0, Math.min(1, Number(a.fit?.score) || 0.5)), because: str(a.fit?.because, 100) },
      caveats: (Array.isArray(a.caveats) ? a.caveats : []).slice(0, 2).map((c: unknown) => str(c, 80)).filter(Boolean),
      sources: sourcesOf(s, q), by: "ai",
    };
  } catch {
    return ruleAnswer(s, q);
  }
}
