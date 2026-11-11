// POST {action:"signup"|"login"|"logout", name, password}
const L = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  try {
    const b = L.body(req);
    if (b.action === "logout") {
      const s = await L.userFromReq(req);
      if (s) await L.redis(["DEL", "session:" + s.token]);
      return res.status(200).json({ ok: true });
    }
    const name = L.normName(b.name), pw = String(b.password || "");
    if (!L.validName(name)) return res.status(400).json({ error: "Names are 3–30 characters: letters, numbers, spaces, dots, dashes." });
    if (pw.length < 6) return res.status(400).json({ error: "Passwords need at least 6 characters." });

    if (b.action === "signup") {
      const { salt, hash } = L.hashPw(pw);
      const user = { display: String(b.name).trim().slice(0, 30), salt, hash, ver: 0, created: Date.now() };
      const ok = await L.redis(["SET", "user:" + name, JSON.stringify(user), "NX"]);
      if (!ok) return res.status(409).json({ error: "That name is taken. Try adding a number or your last initial." });
      const token = await L.newSession(name, 0);
      return res.status(200).json({ token, name: user.display });
    }

    if (b.action === "login") {
      const tries = await L.redis(["INCR", "tries:" + name]);
      if (tries === 1) await L.redis(["EXPIRE", "tries:" + name, 900]);
      if (tries > 10) return res.status(429).json({ error: "Too many attempts. Wait 15 minutes and try again." });
      const user = await L.getJSON("user:" + name);
      if (!user || !L.checkPw(pw, user)) return res.status(401).json({ error: "That name and password don't match." });
      await L.redis(["DEL", "tries:" + name]);
      const token = await L.newSession(name, user.ver || 0);
      return res.status(200).json({ token, name: user.display });
    }
    return res.status(400).json({ error: "Unknown action." });
  } catch (e) { return L.fail(res, e); }
};
