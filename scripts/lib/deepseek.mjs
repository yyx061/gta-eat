// DeepSeek 调用 + 花费控制：按 token 估算（价格故意取偏高），同时定期查账户余额，两者取大，超预算就停。
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch {}
const KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) { console.error('缺少 DEEPSEEK_API_KEY：请在项目根目录的 .env 里写 DEEPSEEK_API_KEY=你的key'); process.exit(1); }

// 美元 / 百万 token，比官方价高一截，估算只会偏多
const PRICE = { in: 0.6, inCached: 0.1, out: 1.8 };

export const spend = { calls: 0, inTok: 0, cachedTok: 0, outTok: 0, est: 0, balance0: null, balanceNow: null };
export async function balance() {
  const res = await fetch('https://api.deepseek.com/user/balance', { headers: { authorization: 'Bearer ' + KEY } });
  const j = await res.json();
  const b = (j.balance_infos || []).find(x => x.currency === 'USD') || (j.balance_infos || [])[0];
  return b ? +b.total_balance : null;
}
export const spent = () => Math.max(spend.est, spend.balance0 != null && spend.balanceNow != null ? spend.balance0 - spend.balanceNow : 0);

export async function ask(system, prompt) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + KEY },
    body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.1, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error('DeepSeek HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const j = await res.json(), u = j.usage || {};
  const cached = u.prompt_cache_hit_tokens || 0, fresh = (u.prompt_tokens || 0) - cached;
  spend.calls++; spend.inTok += fresh; spend.cachedTok += cached; spend.outTok += u.completion_tokens || 0;
  spend.est += (fresh * PRICE.in + cached * PRICE.inCached + (u.completion_tokens || 0) * PRICE.out) / 1e6;
  return JSON.parse(j.choices[0].message.content);
}
