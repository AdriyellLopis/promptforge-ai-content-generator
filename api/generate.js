// Vercel serverless function: keeps your free Gemini API key on the server, never in the browser.
const hits = new Map(); // best-effort per-IP limiter (resets when the function cold-starts)
const LIMIT = 10, WINDOW = 10 * 60 * 1000;

module.exports = async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', keyConfigured: Boolean(key), model: process.env.MODEL || 'gemini-2.5-flash' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!key) return res.status(500).json({ error: 'Server key not configured' });

  const ip = String(req.headers['x-forwarded-for'] || 'anon').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW);
  if (recent.length >= LIMIT) return res.status(429).json({ error: 'Rate limited' });
  recent.push(now);
  hits.set(ip, recent);

  const prompt = String((req.body && req.body.prompt) || '').slice(0, 6000);
  if (!prompt.trim()) return res.status(400).json({ error: 'Empty prompt' });

  // Tries your MODEL first, then fallbacks, because Google retires model names often.
  const models = [...new Set([process.env.MODEL, 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'].filter(Boolean))];
  try {
    let last = { status: 502, detail: '' };
    for (const model of models) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4000 },
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
        const text = parts.map((p) => p.text || '').join('').trim();
        if (text) return res.status(200).json({ text });
        last = { status: 502, detail: model + ': empty response' };
        continue;
      }
      let detail = '';
      try { const e = await r.json(); detail = String((e.error && e.error.message) || '').slice(0, 300); } catch (x) {}
      last = { status: r.status, detail: model + ': ' + detail };
      if (r.status === 404 || r.status === 400) continue; // model unavailable, try the next one
      break; // key or quota problem: fallbacks won't help
    }
    return res.status(last.status === 429 ? 429 : 502).json({ error: 'Gemini error ' + last.status, detail: last.detail });
  } catch (e) {
    res.status(502).json({ error: 'Request failed', detail: String(e && e.message || e).slice(0, 200) });
  }
};
