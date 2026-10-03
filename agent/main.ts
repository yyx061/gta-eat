// 「问问这几家」服务器：找饭 AI + 每家店的代建店家 AI，两边按 A2A 说话。部署在 Deno Deploy。
//   POST /ask                                   手机调用，按行（NDJSON）逐条返回进度
//   GET  /a2a/stores?near=lat,lng               附近店家 AI 的目录
//   GET  /a2a/store/{id}/.well-known/agent-card.json   店家 AI 的名片
//   POST /a2a/store/{id}                        店家 AI（JSON-RPC message/send）
// 环境变量：DEEPSEEK_AGENT_KEY（必填）、ALLOWED_ORIGINS、DAILY_ASK、DAILY_STORE、DATA_BASE / DATA_DIR

import { dist, stores } from "./data.ts";
import { answer, type Question, ruleAnswer } from "./store.ts";
import { dataOf, message, rpcError, rpcResult, storeCard, textOf, type Message } from "./a2a.ts";
import { type AskReq, run } from "./concierge.ts";
import { take } from "./limits.ts";

const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://yyx061.github.io,http://localhost:8765").split(",");
const DAILY_ASK = +(Deno.env.get("DAILY_ASK") || 40);
const DAILY_STORE = +(Deno.env.get("DAILY_STORE") || 300);
// 以后真实餐厅有了自己的 A2A AI：在这里把店编号指向它的地址
const REGISTRY: Record<string, string> = {};

const cors = (req: Request): Record<string, string> => {
  const o = req.headers.get("Origin") || "";
  return ORIGINS.includes(o) ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Vary": "Origin" } : {};
};
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(req) } });

async function storeRpc(req: Request, oid: string): Promise<Response> {
  const db = await stores(), s = db.get(oid);
  let body: any;
  try { body = await req.json(); } catch { return json(req, rpcError(null, -32700, "parse error")); }
  if (!s) return json(req, rpcError(body?.id, -32602, "unknown store"));
  if (body?.method !== "message/send") return json(req, rpcError(body?.id, -32601, "method not found"));
  const m: Message = body.params?.message;
  if (!m?.parts) return json(req, rpcError(body.id, -32602, "message required"));
  const q = dataOf(m) as Question;
  // 超过当天额度：不用 AI，按规则回答（免费）
  const a = (await take("store", DAILY_STORE)) ? await answer(s, q, textOf(m)) : ruleAnswer(s, q);
  return json(req, rpcResult(body.id, message("agent", [{ kind: "text", text: a.reply }, { kind: "data", data: a }])));
}

async function ask(req: Request, self: string): Promise<Response> {
  let body: AskReq;
  try { body = await req.json(); } catch { return json(req, { error: "bad json" }, 400); }
  if (!Array.isArray(body?.candidates) || !body.candidates.length) return json(req, { error: "no candidates" }, 400);
  if (!(await take("ask", DAILY_ASK))) return json(req, { error: "daily_limit" }, 429);
  const db = await stores();
  const agentUrl = (oid: string) => REGISTRY[oid] || `${self}/a2a/store/${encodeURIComponent(oid)}`;
  // 同一台服务器上的代建店家：直接调处理函数，不绕外网；真实餐厅的 AI 走网络
  const send = (r: Request) => r.url.startsWith(self) ? handler(r) : fetch(r);
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      try {
        for await (const ev of run(body, db, agentUrl, send)) ctl.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      } catch (e) {
        ctl.enqueue(enc.encode(JSON.stringify({ type: "error", error: String((e as Error)?.message || e) }) + "\n"));
      }
      ctl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", ...cors(req) } });
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url), path = url.pathname, self = url.origin;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });

  if (path === "/ask" && req.method === "POST") {
    const o = req.headers.get("Origin");
    if (o && !ORIGINS.includes(o)) return json(req, { error: "origin" }, 403);
    return ask(req, self);
  }

  const card = path.match(/^\/a2a\/store\/([^/]+)\/\.well-known\/agent(?:-card)?\.json$/);
  if (card && req.method === "GET") {
    const oid = decodeURIComponent(card[1]), s = (await stores()).get(oid);
    if (!s) return json(req, { error: "unknown store" }, 404);
    return json(req, storeCard(`${self}/a2a/store/${card[1]}`, `${s.zh || s.name} · AI`, `${s.name}（${[s.address, s.city].filter(Boolean).join(", ")}）的 AI 接待，由 GTA 今天吃什么代建，只用公开资料回答。`));
  }

  const rpc = path.match(/^\/a2a\/store\/([^/]+)\/?$/);
  if (rpc && req.method === "POST") return storeRpc(req, decodeURIComponent(rpc[1]));

  if (path === "/a2a/stores" && req.method === "GET") {
    const [lat, lng] = (url.searchParams.get("near") || "").split(",").map(Number);
    if (!isFinite(lat) || !isFinite(lng)) return json(req, { error: "near=lat,lng required" }, 400);
    const r = Math.min(+(url.searchParams.get("r") || 800), 3000);
    const list = [...(await stores()).values()].map((s) => ({ s, d: dist(lat, lng, s.lat, s.lng) })).filter((x) => x.d <= r)
      .sort((a, b) => a.d - b.d).slice(0, 30)
      .map(({ s, d }) => ({ oid: s.oid, name: s.name, meters: Math.round(d), agentUrl: REGISTRY[s.oid] || `${self}/a2a/store/${encodeURIComponent(s.oid)}`, builtBy: REGISTRY[s.oid] ? "restaurant" : "gta-eat" }));
    return json(req, { stores: list });
  }

  if (path === "/") return new Response("GTA 今天吃什么 · 问店 AI 服务器（A2A）在运行。\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return json(req, { error: "not found" }, 404);
}

Deno.serve({ port: +(Deno.env.get("PORT") || 8000) }, handler);
