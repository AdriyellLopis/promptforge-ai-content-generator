// Vercel serverless function: keeps your free Gemini API key on the server, never in the browser.
const hits = new Map(); // best-effort per-IP limiter (resets when the function cold-starts)
const LIMIT = 10, WINDOW = 10 * 60 * 1000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Server key not configured' });

  const ip = String(req.headers['x-forwarded-for'] || 'anon').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW);
  if (recent.length >= LIMIT) return res.status(429).json({ error: 'Rate limited' });
  recent.push(now);
  hits.set(ip, recent);

  const prompt = String((req.body && req.body.prompt) || '').slice(0, 6000);
  if (!prompt.trim()) return res.status(400).json({ error: 'Empty prompt' });

  const model = process.env.MODEL || 'gemini-2.5-flash';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2500, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: 'Upstream error' });
    const j = await r.json();
    const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    const text = parts.map((p) => p.text || '').join('').trim();
    if (!text) return res.status(502).json({ error: 'Empty response' });
    res.status(200).json({ text });
  } catch (e) {
    res.status(502).json({ error: 'Request failed' });
  }
};
