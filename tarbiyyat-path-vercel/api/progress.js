// Saves and loads one learner's progress in Upstash Redis (added via Vercel → Storage).
// Works with either set of env var names the integration may inject.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ALLOWED = ["done", "notes", "yq", "quiz", "ten", "streak", "best", "updatedAt"];

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("Redis " + r.status);
  return (await r.json()).result;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const id = String((req.query && req.query.u) || "");
  if (!/^[a-f0-9]{32}$/.test(id)) return res.status(400).json({ error: "bad id" });
  if (!URL_ || !TOKEN) return res.status(503).json({ error: "storage not connected" });
  const key = "tp:" + id;
  try {
    if (req.method === "GET") {
      const v = await redis(["GET", key]);
      return res.status(200).json(v ? JSON.parse(v) : null);
    }
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ error: "bad body" });
      const clean = {};
      for (const k of ALLOWED) if (k in body) clean[k] = body[k];
      const text = JSON.stringify(clean);
      if (text.length > 200000) return res.status(413).json({ error: "too large" });
      await redis(["SET", key, text]);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  } catch (e) {
    return res.status(500).json({ error: "storage error" });
  }
};
