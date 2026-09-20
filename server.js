/* =====================================================================
 * 社团百宝箱 - 轻量后端（纯 Node，无第三方依赖）
 * 职责：静态托管 + 负责人模式 API（邀请码登录 / 编辑 / 传图 / 状态切换）
 * 启动：node server.js  （监听环境变量 PORT，默认 3000）
 * 数据：data/db.json（首次启动由 data/seed.json 生成，运行时更新持久化）
 * 上传：uploads/ 目录
 * 一般不需要修改本文件。改初始数据请改 public/js/data.js 后运行
 * node scripts/gen-seed.js 重新生成 seed
 * ===================================================================== */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const SEED_PATH = path.join(DATA_DIR, "seed.json");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const SESSION_DAYS = 30;

/* ---------------- 数据层 ---------------- */
let db = null;

function newCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 去掉易混淆字符
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return s;
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function loadDb() {
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    return;
  } catch (e) { /* 首次启动 */ }
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
  db = {
    masterCode: seed.masterCode,
    clubs: seed.clubs.map((c) => Object.assign({}, c, { inviteCode: newCode() })),
    sessions: {}
  };
  saveDb();
  console.log("[init] db.json created from seed, masterCode=" + db.masterCode);
}

function saveDb() {
  const tmp = DB_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db), "utf8");
  fs.renameSync(tmp, DB_PATH);
}

function publicClub(c) {
  const o = Object.assign({}, c);
  delete o.inviteCode;
  return o;
}

function clubById(id) {
  return db.clubs.find((c) => c.id === Number(id));
}

/* ---------------- 会话 ---------------- */
function cleanSessions() {
  const now = Date.now();
  let dirty = false;
  Object.keys(db.sessions).forEach((t) => {
    if (db.sessions[t].exp < now) { delete db.sessions[t]; dirty = true; }
  });
  if (dirty) saveDb();
}

function auth(req) {
  /* 部分反向代理会剥掉标准 Authorization 头，故同时支持自定义 X-Token 头 */
  const h = String(req.headers["x-token"] || req.headers.authorization || "");
  const m = h.match(/^(?:Bearer\s+)?([A-Za-z0-9]+)$/i);
  if (!m) return null;
  cleanSessions();
  const s = db.sessions[m[1]];
  return s || null;
}

/* 登录限流：每 IP 10 分钟最多 8 次失败 */
const failLog = {};
function tooManyFails(ip) {
  const now = Date.now();
  failLog[ip] = (failLog[ip] || []).filter((t) => now - t < 10 * 60 * 1000);
  return failLog[ip].length >= 8;
}
function noteFail(ip) {
  (failLog[ip] = failLog[ip] || []).push(Date.now());
}

/* ---------------- 工具 ---------------- */
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (ch) => {
      size += ch.length;
      if (size > limit) { reject(new Error("BODY_TOO_LARGE")); req.destroy(); return; }
      chunks.push(ch);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function serveStatic(req, res, urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  const base = p.startsWith("/uploads/") ? UPLOAD_DIR : PUBLIC;
  const file = path.normalize(path.join(base, p.replace(/^\/(uploads\/)?/, p.startsWith("/uploads/") ? "/" : "/")));
  if (!file.startsWith(base)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    /* 页面与静态资源均不缓存，保证改版即时生效；/uploads/ 图片缓存一天 */
    const cache = p.startsWith("/uploads/") ? "public, max-age=86400" : "no-cache";
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": cache });
    res.end(buf);
  });
}

/* ---------------- 编辑白名单与校验 ---------------- */
const LIMITS = { slogan: 60, intro: 800, activities: 800, qq: 30, logo: 8, booth: 12 };

function sanitizePatch(role, patch) {
  const out = {};
  const leaderKeys = ["slogan", "intro", "activities", "qq", "logo", "status", "photos"];
  const adminKeys = ["booth", "name", "cat"];
  const allowed = role === "admin" ? leaderKeys.concat(adminKeys) : leaderKeys;
  for (const k of allowed) {
    if (!(k in patch)) continue;
    let v = patch[k];
    if (k === "status") {
      if (v !== "open" && v !== "closed") return { err: "状态值非法" };
      out[k] = v;
    } else if (k === "photos") {
      if (!Array.isArray(v) || v.length > 6) return { err: "照片最多 6 张" };
      if (!v.every((u) => typeof u === "string" && u.startsWith("/uploads/"))) return { err: "照片地址非法" };
      out[k] = v;
    } else if (k === "logo") {
      if (typeof v !== "string") return { err: "logo 类型非法" };
      v = v.trim();
      if (v.startsWith("/uploads/")) {
        /* 图片图标：只允许本服务生成的上传路径，杜绝注入 */
        if (!/^\/uploads\/[A-Za-z0-9._-]{1,80}$/.test(v)) return { err: "图标地址非法" };
        out[k] = v;
      } else {
        if (v.length > (LIMITS[k] || 100)) return { err: k + " 超长（图片请先上传）" };
        out[k] = v;
      }
    } else {
      if (typeof v !== "string") return { err: k + " 类型非法" };
      if (v.length > (LIMITS[k] || 100)) return { err: k + " 超长" };
      out[k] = v.trim();
    }
  }
  return { patch: out };
}

/* ---------------- API 路由 ---------------- */
async function handleApi(req, res, pathname) {
  const ip = req.socket.remoteAddress || "?";

  if (req.method === "GET" && pathname === "/api/clubs") {
    sendJson(res, 200, { clubs: db.clubs.map(publicClub) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/login") {
    if (tooManyFails(ip)) { sendJson(res, 429, { err: "尝试次数过多，请 10 分钟后再试" }); return; }
    let body;
    try { body = JSON.parse((await readBody(req, 4096)).toString("utf8")); }
    catch (e) { sendJson(res, 400, { err: "请求体非法" }); return; }
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) { sendJson(res, 400, { err: "请输入邀请码" }); return; }
    if (code === db.masterCode) {
      const token = makeToken();
      db.sessions[token] = { role: "admin", clubId: null, exp: Date.now() + SESSION_DAYS * 864e5 };
      saveDb();
      sendJson(res, 200, { token: token, role: "admin", clubId: null });
      return;
    }
    const club = db.clubs.find((c) => c.inviteCode === code);
    if (!club) { noteFail(ip); sendJson(res, 401, { err: "邀请码不正确" }); return; }
    const token = makeToken();
    db.sessions[token] = { role: "leader", clubId: club.id, exp: Date.now() + SESSION_DAYS * 864e5 };
    saveDb();
    sendJson(res, 200, { token: token, role: "leader", clubId: club.id });
    return;
  }

  const session = auth(req);

  if (req.method === "GET" && pathname === "/api/session") {
    if (!session) { sendJson(res, 401, { err: "未登录" }); return; }
    const club = session.clubId ? clubById(session.clubId) : null;
    sendJson(res, 200, { role: session.role, clubId: session.clubId, club: club ? publicClub(club) : null });
    return;
  }

  if (req.method === "GET" && pathname === "/api/codes") {
    if (!session || session.role !== "admin") { sendJson(res, 403, { err: "需要管理员权限" }); return; }
    sendJson(res, 200, { codes: db.clubs.map((c) => ({ id: c.id, name: c.name, code: c.inviteCode })) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/code/regen") {
    if (!session || session.role !== "admin") { sendJson(res, 403, { err: "需要管理员权限" }); return; }
    let body;
    try { body = JSON.parse((await readBody(req, 4096)).toString("utf8")); }
    catch (e) { sendJson(res, 400, { err: "请求体非法" }); return; }
    const club = clubById(body.clubId);
    if (!club) { sendJson(res, 404, { err: "社团不存在" }); return; }
    club.inviteCode = newCode();
    saveDb();
    sendJson(res, 200, { code: club.inviteCode });
    return;
  }

  if (req.method === "POST" && pathname === "/api/upload") {
    if (!session) { sendJson(res, 401, { err: "未登录" }); return; }
    let body;
    try { body = JSON.parse((await readBody(req, 900 * 1024)).toString("utf8")); }
    catch (e) { sendJson(res, 400, { err: "图片过大（限制约 600KB）" }); return; }
    const m = String(body.data || "").match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
    if (!m) { sendJson(res, 400, { err: "仅支持 jpg/png/webp" }); return; }
    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    let buf;
    try { buf = Buffer.from(m[2], "base64"); }
    catch (e) { sendJson(res, 400, { err: "图片解码失败" }); return; }
    if (buf.length > 600 * 1024) { sendJson(res, 400, { err: "图片过大（限制约 600KB）" }); return; }
    const name = Date.now().toString(36) + "-" + crypto.randomBytes(4).toString("hex") + "." + ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    sendJson(res, 200, { url: "/uploads/" + name });
    return;
  }

  const mClub = pathname.match(/^\/api\/club\/(\d+)$/);
  if (req.method === "PUT" && mClub) {
    if (!session) { sendJson(res, 401, { err: "未登录" }); return; }
    const id = Number(mClub[1]);
    const club = clubById(id);
    if (!club) { sendJson(res, 404, { err: "社团不存在" }); return; }
    if (session.role === "leader" && session.clubId !== id) { sendJson(res, 403, { err: "只能修改自己的社团" }); return; }
    let body;
    try { body = JSON.parse((await readBody(req, 64 * 1024)).toString("utf8")); }
    catch (e) { sendJson(res, 400, { err: "请求体非法" }); return; }
    const r = sanitizePatch(session.role, body);
    if (r.err) { sendJson(res, 400, { err: r.err }); return; }
    Object.assign(club, r.patch);
    saveDb();
    sendJson(res, 200, { ok: true, club: publicClub(club) });
    return;
  }

  sendJson(res, 404, { err: "接口不存在" });
}

/* ---------------- HTTP 服务 ---------------- */
const server = http.createServer(async (req, res) => {
  const pathname = req.url || "/";
  if (pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, pathname.split("?")[0]);
    } catch (e) {
      if (e && e.message === "BODY_TOO_LARGE") { sendJson(res, 413, { err: "请求体过大" }); return; }
      sendJson(res, 500, { err: "服务器内部错误" });
    }
    return;
  }
  serveStatic(req, res, pathname);
});

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
loadDb();
server.listen(PORT, "0.0.0.0", () => {
  console.log("[club-fair] listening on :" + PORT);
});
