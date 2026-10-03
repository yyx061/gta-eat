// 找饭 AI：把顾客的需求同时问给几家店的 AI，收齐后排序，每家写一句一针见血的理由。

import type { Store } from "./data.ts";
import type { Answer, Question } from "./store.ts";
import { askJSON } from "./llm.ts";
import { dataOf, message, sendMessage, textOf } from "./a2a.ts";

// 手机发来的请求
export type AskReq = {
  lang?: "zh" | "en";
  need?: string; party?: number; when?: string; weather?: string;
  constraints?: string[];
  persona?: { likes?: string[]; dislikes?: string[]; recent?: string[] };   // 只是简短摘要
  candidates: {
    oid: string; minutes: number; mode?: string; status?: string; open?: string;
    google?: { rating?: number; count?: number; status?: string };
    notes?: string[];        // App 本地算出的理由（含用户自己的记录，如「你给过 👍」）
  }[];
};

export type Event =
  | { type: "asking"; stores: { oid: string; name: string; agentUrl: string }[] }
  | { type: "reply"; oid: string; text: string; answer: Answer | null; ms: number; error?: string }
  | { type: "final"; order: string[]; reasons: Record<string, string>; vsSecond: string; by: "ai" | "rules" }
  | { type: "error"; error: string };

const Q_TEXT = {
  zh: (r: AskReq, c: AskReq["candidates"][0]) =>
    `你好，我替一位顾客问一下：${r.party || 1} 个人，${r.when || "现在"}出发，大约 ${c.minutes} 分钟后到。` +
    (r.need ? `顾客说：「${r.need}」。` : "") + `现在能坐下吗？要不要订位？推荐点什么？合不合他的要求？`,
  en: (r: AskReq, c: AskReq["candidates"][0]) =>
    `Hi, asking for a diner: party of ${r.party || 1}, leaving ${r.when || "now"}, arriving in about ${c.minutes} min.` +
    (r.need ? ` They said: "${r.need}".` : "") + ` Can they get a seat? Should they book? What should they order? Is it a good fit?`,
};

export async function* run(
  req: AskReq, db: Map<string, Store>, agentUrl: (oid: string) => string,
  send: (req: Request) => Promise<Response>,
): AsyncGenerator<Event> {
  const lang = req.lang === "en" ? "en" : "zh";
  const cands = req.candidates.filter((c) => db.has(c.oid)).slice(0, 5);
  if (!cands.length) { yield { type: "error", error: "no known stores" }; return; }
  yield { type: "asking", stores: cands.map((c) => ({ oid: c.oid, name: db.get(c.oid)!.name, agentUrl: agentUrl(c.oid) })) };

  // 并行问，谁先回就先推给手机
  const answers = new Map<string, Answer | null>();
  const pending = new Map<string, Promise<Event>>();
  for (const c of cands) {
    const q: Question = {
      lang, need: req.need, party: req.party, when: req.when, weather: req.weather, arriveInMin: c.minutes,
      constraints: req.constraints, observed: { status: c.status, open: c.open, google: c.google },
    };
    const t0 = Date.now();
    pending.set(c.oid, sendMessage(agentUrl(c.oid), message("user", [{ kind: "text", text: Q_TEXT[lang](req, c) }, { kind: "data", data: q }]), 10000, send)
      .then((m): Event => ({ type: "reply", oid: c.oid, text: textOf(m), answer: dataOf(m) as Answer, ms: Date.now() - t0 }))
      .catch((e): Event => ({ type: "reply", oid: c.oid, text: "", answer: null, ms: Date.now() - t0, error: String(e?.message || e) })));
  }
  while (pending.size) {
    const ev = await Promise.race(pending.values()) as Extract<Event, { type: "reply" }>;
    pending.delete(ev.oid);
    answers.set(ev.oid, ev.answer);
    yield ev;
  }
  yield await summarize(req, cands, answers, db, lang);
}

const SEAT = { yes: 3, likely: 2, unknown: 1, closed: -5 } as const;

function ruleFinal(cands: AskReq["candidates"], answers: Map<string, Answer | null>): Extract<Event, { type: "final" }> {
  const score = (c: AskReq["candidates"][0]) => {
    const a = answers.get(c.oid);
    return (a ? SEAT[a.canSeat] + a.fit.score * 3 : 0) - c.minutes * 0.05;
  };
  const order = [...cands].sort((x, y) => score(y) - score(x)).map((c) => c.oid);
  const reasons: Record<string, string> = {};
  for (const c of cands) { const a = answers.get(c.oid); reasons[c.oid] = a?.fit.because || (c.notes || [])[0] || ""; }
  return { type: "final", order, reasons, vsSecond: "", by: "rules" };
}

const SYS = {
  zh: `你是帮顾客挑餐厅的 AI。你刚问完几家店的 AI，现在要给顾客一个结论。
排序：先排能吃上的（canSeat 为 closed 的放最后），硬条件不满足（fit.score ≤ 0.2）的放后面；其余综合「合不合这一顿的要求、顾客自己的记录和口味、距离、评分」。
每家写一句理由（reasons），要求：
- 一针见血，不超过 28 个字；
- 必须含至少一个具体事实：菜名、数字（分钟、评分、评论数、营业到几点、几次）或顾客自己的记录；
- 说清「为什么是它」，不要只说「口碑好」「性价比高」「你喜欢的中餐」这种空话；
- 只能用下面给出的事实，不许编造。
vs：说 order 里第 1 家为什么比第 2 家更适合（不超过 30 个字，含具体事实）。first / second 填这两家的编号。如果你觉得第 2 家更好，就把它排第 1。
只输出 JSON：{"order":["店编号",...],"reasons":{"店编号":"理由"},"vs":{"first":"","second":"","text":""}}`,
  en: `You help a diner choose a restaurant. You just asked several restaurants' AIs and now give the diner a verdict.
Order: places they can eat at first (canSeat closed goes last), hard-constraint misses (fit.score ≤ 0.2) after; otherwise weigh fit for this meal, the diner's own history and taste, distance, rating.
For each store write one reason (reasons):
- sharp, max 14 words;
- must contain at least one concrete fact: a dish, a number (minutes, rating, review count, closing time, times eaten) or the diner's own record;
- say why THIS place; no empty phrases like "great reviews", "good value", "a cuisine you like";
- use only the facts given; never invent.
vs: why order[0] suits the diner better than order[1] (max 16 words, a concrete fact); first / second are those two ids. If you think #2 is better, rank it first instead.
Output JSON only: {"order":["store id",...],"reasons":{"store id":"reason"},"vs":{"first":"","second":"","text":""}}`,
};

async function summarize(
  req: AskReq, cands: AskReq["candidates"], answers: Map<string, Answer | null>, db: Map<string, Store>, lang: "zh" | "en",
): Promise<Event> {
  const fb = ruleFinal(cands, answers);
  const facts = cands.map((c) => {
    const s = db.get(c.oid)!, a = answers.get(c.oid);
    return {
      id: c.oid, name: s.zh || s.name, cuisines: s.cuisines.slice(0, 4), minutes: c.minutes, mode: c.mode,
      appStatus: c.status, google: c.google, pricePerPersonCAD: s.price, appNotes: c.notes,
      storeAgent: a ? { reply: a.reply, canSeat: a.canSeat, openUntil: a.openUntil, wait: a.waitGuess, mustOrder: a.mustOrder.map((m) => m.dish), fit: a.fit, caveats: a.caveats } : "没有回应 / no reply",
    };
  });
  const user = JSON.stringify({ diner: { need: req.need, party: req.party, when: req.when, weather: req.weather, constraints: req.constraints, persona: req.persona }, stores: facts });
  try {
    const j = await askJSON(SYS[lang], user, 600, 12000);
    const ids = new Set(cands.map((c) => c.oid));
    const order = (Array.isArray(j.order) ? j.order : []).filter((o: string) => ids.has(o));
    for (const o of fb.order) if (!order.includes(o)) order.push(o);
    const reasons: Record<string, string> = {};
    for (const o of order) reasons[o] = typeof j.reasons?.[o] === "string" && j.reasons[o] ? j.reasons[o].slice(0, lang === "zh" ? 60 : 140) : fb.reasons[o];
    // 「为什么不是第二家」必须和排序对得上，否则不显示
    const vsOk = j.vs?.first === order[0] && j.vs?.second === order[1] && typeof j.vs?.text === "string";
    return { type: "final", order, reasons, vsSecond: vsOk ? j.vs.text.slice(0, lang === "zh" ? 80 : 160) : "", by: "ai" };
  } catch {
    return fb;
  }
}
