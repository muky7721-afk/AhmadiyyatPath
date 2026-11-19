// GET/POST the signed-in learner's progress. Requires "Authorization: Bearer <token>".
const L = require("./_lib");
const ALLOWED = ["done", "notes", "yq", "quiz", "ten", "streak", "best", "updatedAt"];

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const s = await L.userFromReq(req);
    if (!s) return res.status(401).json({ error: "Please sign in again." });
    const key = "progress:" + s.name;
    if (req.method === "GET") return res.status(200).json({ name: s.user.display, progress: await L.getJSON(key) });
    if (req.method === "POST") {
      const b = L.body(req);
      if (!b || typeof b !== "object" || Array.isArray(b)) return res.status(400).json({ error: "bad body" });
      const clean = {};
      for (const k of ALLOWED) if (k in b) clean[k] = b[k];
      clean.updatedAt = Date.now();
      const text = JSON.stringify(clean);
      if (text.length > 200000) return res.status(413).json({ error: "too large" });
      await L.redis(["SET", key, text]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  } catch (e) { return L.fail(res, e); }
};
