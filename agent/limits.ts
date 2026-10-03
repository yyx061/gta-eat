// 每天的用量上限（多伦多日期）。Deno Deploy 上用 Deno KV；本机没有 KV 时用内存计数。

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
let kv: Deno.Kv | null = null;
try { kv = await Deno.openKv(); } catch { kv = null; }
const mem = new Map<string, number>();

// 还有额度就 +1 并返回 true
export async function take(kind: string, max: number): Promise<boolean> {
  const k = [kind, today()];
  if (!kv) {
    const n = mem.get(k.join()) || 0;
    if (n >= max) return false;
    mem.set(k.join(), n + 1);
    return true;
  }
  for (let i = 0; i < 5; i++) {
    const cur = await kv.get<number>(k);
    const n = cur.value || 0;
    if (n >= max) return false;
    const ok = await kv.atomic().check(cur).set(k, n + 1, { expireIn: 3 * 864e5 }).commit();
    if (ok.ok) return true;
  }
  return false;
}
