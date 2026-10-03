// 一句话 → 这一顿的口味方向（给手机上的排序用）。方向的名字和网页里的 ATTR 表一致。

import { askJSON } from "./llm.ts";

export const ATTRS = ["soup", "spicy", "light", "fried", "sweet", "cheap", "treat", "near", "quick", "sit", "late"] as const;

export type Intent = { attrs: Record<string, number>; gPlus: string[]; gMinus: string[]; summary: string };

const SYS = {
  zh: `把顾客说的一句「想吃什么」拆成口味方向，给推荐排序用。
方向（每个 -1 到 1，0 或不写表示没提到；只写顾客明确或强烈暗示的）：
soup 热汤/热乎, spicy 辣, light 清淡/健康, fried 油炸/油腻, sweet 甜品/饮品, cheap 便宜, treat 吃顿好的/犒劳, near 别走太远, quick 快/赶时间, sit 坐下慢慢吃/聊天, late 夜宵。
「别太油」→ fried:-1；「不想吃辣」→ spicy:-1；「累了想吃点舒服的」→ soup:0.6, near:0.5。
gPlus / gMinus：顾客明确想吃 / 不想吃的菜系，只能从给定的菜系列表里选原样的名字。
summary：用 3–8 个字概括这一顿，例如「热乎、不油、近」。
只输出 JSON：{"attrs":{},"gPlus":[],"gMinus":[],"summary":""}`,
  en: `Turn the diner's one-line craving into taste directions for ranking.
Directions (each -1 to 1; 0 or omitted = not mentioned; only what they said or strongly implied):
soup warm/soupy, spicy, light healthy, fried greasy, sweet dessert/drinks, cheap, treat splurge, near not far, quick in a hurry, sit sit-down/chat, late late-night.
"not too greasy" → fried:-1; "no spicy" → spicy:-1; "tired, want comfort food" → soup:0.6, near:0.5.
gPlus / gMinus: cuisines they explicitly want / don't want, copied exactly from the given list.
summary: 2–5 words, e.g. "warm, not greasy, close".
Output JSON only: {"attrs":{},"gPlus":[],"gMinus":[],"summary":""}`,
};

export async function parseIntent(text: string, lang: "zh" | "en", groups: string[]): Promise<Intent> {
  const j = await askJSON(SYS[lang], JSON.stringify({ text: text.slice(0, 200), cuisines: groups }), 200, 8000);
  const attrs: Record<string, number> = {};
  for (const k of ATTRS) {
    const v = Number(j.attrs?.[k]);
    if (v && isFinite(v)) attrs[k] = Math.max(-1, Math.min(1, v));
  }
  const ok = (g: unknown) => typeof g === "string" && groups.includes(g);
  return {
    attrs,
    gPlus: (Array.isArray(j.gPlus) ? j.gPlus : []).filter(ok),
    gMinus: (Array.isArray(j.gMinus) ? j.gMinus : []).filter(ok),
    summary: typeof j.summary === "string" ? j.summary.slice(0, 30) : "",
  };
}
