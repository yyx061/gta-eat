// A2A（Agent2Agent）最小子集：名片（Agent Card）+ message/send（JSON-RPC 2.0 over HTTP）。
// 规范：https://a2a-protocol.org —— 规范升级时只改这个文件。

export const PROTOCOL = "0.3.0";

export type Part = { kind: "text"; text: string } | { kind: "data"; data: Record<string, unknown> };
export type Message = { kind: "message"; role: "user" | "agent"; messageId: string; parts: Part[] };

export const message = (role: Message["role"], parts: Part[]): Message =>
  ({ kind: "message", role, messageId: crypto.randomUUID(), parts });

export const textOf = (m: Message) => m.parts.filter((p) => p.kind === "text").map((p: any) => p.text).join("\n");
export const dataOf = (m: Message) => (m.parts.find((p) => p.kind === "data") as any)?.data || {};

export function storeCard(url: string, name: string, desc: string) {
  return {
    protocolVersion: PROTOCOL, name, description: desc, url, preferredTransport: "JSONRPC", version: "1.0.0",
    provider: { organization: "GTA 今天吃什么（代建）", url: "https://yyx061.github.io/gta-eat/" },
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ["text/plain", "application/json"], defaultOutputModes: ["text/plain", "application/json"],
    skills: [{
      id: "visit-check", name: "能不能去吃", tags: ["seating", "reservation", "menu", "hours"],
      description: "回答现在能否坐下、要不要订位、推荐点什么、合不合顾客的要求。只用公开资料，不知道就说不知道。",
      examples: ["4 个人，周五 19:10 到，想吃辣，能坐下吗？推荐点什么？"],
    }],
  };
}

export const rpcResult = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
export const rpcError = (id: unknown, code: number, msg: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message: msg } });

// 客户端：发一条消息给另一个 A2A agent。send 默认走网络；同一台服务器上的代建店家可以直接调处理函数
export async function sendMessage(
  url: string, msg: Message, timeoutMs: number,
  send: (req: Request) => Promise<Response> = (req) => fetch(req),
): Promise<Message> {
  const req = new Request(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method: "message/send", params: { message: msg } }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const res = await Promise.race([
    send(req),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs)),
  ]);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  const r = j.result;
  if (r?.kind === "message") return r;
  // 对方回了一个 Task：取最后一条 agent 消息或产物
  const last = r?.status?.message || r?.artifacts?.[0];
  if (last?.parts) return message("agent", last.parts);
  throw new Error("bad A2A response");
}
