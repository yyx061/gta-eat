// DeepSeek：只要 JSON 回答。key 只在服务器环境变量 DEEPSEEK_AGENT_KEY 里。

export async function askJSON(system: string, user: string, maxTokens = 500, timeoutMs = 12000): Promise<any> {
  const key = Deno.env.get("DEEPSEEK_AGENT_KEY");
  if (!key) throw new Error("no DEEPSEEK_AGENT_KEY");
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat", temperature: 0.3, max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `DeepSeek HTTP ${r.status}`);
  return JSON.parse(j.choices[0].message.content);
}
