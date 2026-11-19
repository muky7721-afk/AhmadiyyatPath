// Shared helpers (files starting with _ are not exposed as routes).
const crypto = require("crypto");
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  if (!URL_ || !TOKEN) { const e = new Error("storage not connected"); e.code = 503; throw e; }
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("Redis " + r.status);
  return (await r.json()).result;
}
const getJSON = async (k) => { const v = await redis(["GET", k]); return v ? JSON.parse(v) : null; };
const setJSON = (k, v, ex) => redis(ex ? ["SET", k, JSON.stringify(v), "EX", ex] : ["SET", k, JSON.stringify(v)]);

const normName = (n) => String(n || "").trim().toLowerCase();
const validName = (n) => /^[a-z0-9 ._-]{3,30}$/.test(n);
function hashPw(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  return { salt, hash: crypto.scryptSync(String(pw), salt, 64).toString("hex") };
}
function checkPw(pw, user) {
  const h = Buffer.from(hashPw(pw, user.salt).hash, "hex");
  const s = Buffer.from(user.hash, "hex");
  return h.length === s.length && crypto.timingSafeEqual(h, s);
}
const SESSION_DAYS = 90;
async function newSession(name, ver) {
  const token = crypto.randomBytes(32).toString("hex");
  await setJSON("session:" + token, { name, ver }, SESSION_DAYS * 86400);
  return token;
}
async function userFromReq(req) {
  const m = String(req.headers.authorization || "").match(/^Bearer ([a-f0-9]{64})$/);
  if (!m) return null;
  const s = await getJSON("session:" + m[1]);
  if (!s) return null;
  const u = await getJSON("user:" + s.name);
  if (!u || (u.ver || 0) !== (s.ver || 0)) return null;
  return { name: s.name, user: u, token: m[1] };
}
function body(req) { return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
function fail(res, e) { return res.status(e.code === 503 ? 503 : 500).json({ error: e.code === 503 ? "Storage isn't connected yet." : "Something went wrong. Try again." }); }

module.exports = { redis, getJSON, setJSON, normName, validName, hashPw, checkPw, newSession, userFromReq, body, fail };
