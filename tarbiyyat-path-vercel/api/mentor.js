// Mentor dashboard. Requires header "x-mentor-key" matching the MENTOR_KEY environment variable.
// GET  -> list of learners with progress
// POST {name, password} -> reset that learner's password (signs them out everywhere)
const L = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const key = process.env.MENTOR_KEY;
  if (!key || key.length < 8) return res.status(503).json({ error: "Set a MENTOR_KEY environment variable (8+ characters) in Vercel, then redeploy." });
  if (req.headers["x-mentor-key"] !== key) return res.status(401).json({ error: "Wrong mentor key." });
  try {
    if (req.method === "GET") {
      let cursor = "0", names = [];
      do {
        const [next, keys] = await L.redis(["SCAN", cursor, "MATCH", "user:*", "COUNT", 200]);
        cursor = next; names.push(...keys.map((k) => k.slice(5)));
      } while (cursor !== "0" && names.length < 2000);
      const out = [];
      for (const n of names) {
        const u = await L.getJSON("user:" + n);
        const p = (await L.getJSON("progress:" + n)) || {};
        out.push({ name: n, display: u ? u.display : n, created: u && u.created, done: Object.keys(p.done || {}), quiz: p.quiz || {}, ten: Object.values(p.ten || {}).filter(Boolean).length, updatedAt: p.updatedAt || null });
      }
      return res.status(200).json({ learners: out });
    }
    if (req.method === "POST") {
      const b = L.body(req), name = L.normName(b.name);
      const u = await L.getJSON("user:" + name);
      if (!u) return res.status(404).json({ error: "No learner with that name." });
      if (String(b.password || "").length < 6) return res.status(400).json({ error: "New password needs at least 6 characters." });
      const { salt, hash } = L.hashPw(b.password);
      Object.assign(u, { salt, hash, ver: (u.ver || 0) + 1 });
      await L.setJSON("user:" + name, u);
      await L.redis(["DEL", "tries:" + name]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  } catch (e) { return L.fail(res, e); }
};
