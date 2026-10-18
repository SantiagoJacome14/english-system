const { app, BrowserWindow, ipcMain, safeStorage, shell, protocol, net, Notification, Tray, Menu, nativeImage, session } = require("electron");
const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");
const Anthropic = require("@anthropic-ai/sdk");

const APP_ID = "com.santiagojacome.englishboardingpass";
const ROOT = __dirname;
const SELFTEST = (process.argv.find((a) => a.startsWith("--selftest=")) || "").slice(11);
const START_HIDDEN = process.argv.includes("--hidden");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } },
]);

/* ---------- Settings ---------- */
const MODELS = {
  "claude-opus-5-5": { label: "Claude Opus 5.5 (mejor calidad)" },
  "claude-haiku-5-5": { label: "Claude Haiku 5.5 (más económico)" },
};
const DEFAULT_MODEL = "claude-opus-5-5";
const PROVIDERS = ["claude", "ollama", "none"];
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");

function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsFile(), "utf8")); } catch { return {}; }
}
function writeSettings(s) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(s));
}
function getApiKey() {
  const s = readSettings();
  if (!s.key) return null;
  try {
    return s.enc && safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(Buffer.from(s.key, "base64"))
      : s.key;
  } catch { return null; }
}
function model() { const m = readSettings().model; return MODELS[m] ? m : DEFAULT_MODEL; }
// With no choice saved yet, use Claude when a key exists, otherwise no AI.
function provider() {
  const s = readSettings();
  if (PROVIDERS.includes(s.provider)) return s.provider;
  return getApiKey() ? "claude" : "none";
}
function ollamaCfg() {
  const s = readSettings();
  return { url: (s.ollamaUrl || "http://127.0.0.1:11434").replace(/\/+$/, ""), model: s.ollamaModel || "llama3.2" };
}
function reminderCfg() {
  const s = readSettings();
  return { on: s.reminderOn !== false, time: /^\d\d:\d\d$/.test(s.reminderTime || "") ? s.reminderTime : "20:25" };
}
function publicSettings() {
  const s = readSettings();
  return {
    hasKey: !!getApiKey(), model: model(), models: MODELS, provider: provider(),
    ollama: ollamaCfg(), reminder: reminderCfg(),
    tray: s.tray !== false, openAtLogin: !!s.openAtLogin,
  };
}

/* ---------- Claude ---------- */
function client() {
  const apiKey = getApiKey();
  if (!apiKey) { const e = new Error("Falta tu clave de API"); e.code = "no_key"; throw e; }
  return new Anthropic({ apiKey });
}
// Opus 5.5 gets server-side refusal fallbacks; Haiku 5.5 has none.
function requestParams(system, messages, maxTokens) {
  const m = model();
  const params = { model: m, max_tokens: maxTokens, system, messages, output_config: { effort: "low" } };
  if (m === "claude-opus-5-5") {
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }
  return params;
}
function errorCode(err) {
  if (err.code === "no_key" || err.code === "no_ai" || /^ollama_/.test(err.code || "")) return err.code;
  if (err instanceof Anthropic.AuthenticationError) return "bad_key";
  if (err instanceof Anthropic.RateLimitError) return "rate_limited";
  if (err instanceof Anthropic.APIConnectionError) return "offline";
  if (err instanceof Anthropic.APIError && err.status === 400 && /credit/i.test(err.message)) return "no_credit";
  return "error";
}
function textOf(msg) {
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}
async function claudeChat(system, messages, onText, maxTokens) {
  const stream = client().beta.messages.stream(requestParams(system, messages, maxTokens));
  let text = "";
  if (onText) stream.on("text", (delta) => { text += delta; onText(text); });
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") { const e = new Error("refusal"); e.code = "refusal"; throw e; }
  return textOf(final);
}

/* ---------- Ollama (free, runs on this computer) ---------- */
async function ollamaFetch(p, body) {
  const { url } = ollamaCfg();
  let res;
  try {
    res = await fetch(url + p, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  } catch {
    const e = new Error("Ollama no responde"); e.code = "ollama_off"; throw e;
  }
  if (res.status === 404) { const e = new Error("Modelo no encontrado"); e.code = "ollama_model"; throw e; }
  if (!res.ok) { const e = new Error("Ollama: " + res.status); e.code = "ollama_error"; throw e; }
  return res;
}
async function ollamaChat(system, messages, onText, json) {
  const { model: m } = ollamaCfg();
  const body = { model: m, messages: [{ role: "system", content: system }, ...messages], stream: !json, options: { temperature: json ? 0.2 : 0.7 } };
  if (json) body.format = "json";
  const res = await ollamaFetch("/api/chat", body);
  if (json) return (await res.json()).message.content;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.error) { const e = new Error(msg.error); e.code = "ollama_error"; throw e; }
      if (msg.message && msg.message.content) { text += msg.message.content; if (onText) onText(text); }
    }
  }
  return text;
}

function chatWith(system, messages, onText, json) {
  const p = provider();
  if (p === "ollama") return ollamaChat(system, messages, onText, json);
  if (p === "claude") return claudeChat(system, messages, onText, json ? 8000 : 4000);
  const e = new Error("Sin IA"); e.code = "no_ai"; throw e;
}

ipcMain.handle("settings:get", () => publicSettings());
ipcMain.handle("settings:set", (_e, patch) => {
  const s = readSettings();
  if (typeof patch.key === "string" && patch.key.trim()) {
    const k = patch.key.trim();
    if (safeStorage.isEncryptionAvailable()) { s.key = safeStorage.encryptString(k).toString("base64"); s.enc = true; }
    else { s.key = k; s.enc = false; }
  }
  if (patch.model && MODELS[patch.model]) s.model = patch.model;
  if (PROVIDERS.includes(patch.provider)) s.provider = patch.provider;
  if (typeof patch.ollamaUrl === "string" && /^https?:\/\//.test(patch.ollamaUrl)) s.ollamaUrl = patch.ollamaUrl.trim();
  if (typeof patch.ollamaModel === "string" && patch.ollamaModel.trim()) s.ollamaModel = patch.ollamaModel.trim();
  if (typeof patch.reminderOn === "boolean") s.reminderOn = patch.reminderOn;
  if (/^\d\d:\d\d$/.test(patch.reminderTime || "")) s.reminderTime = patch.reminderTime;
  if (typeof patch.tray === "boolean") s.tray = patch.tray;
  if (typeof patch.openAtLogin === "boolean") {
    s.openAtLogin = patch.openAtLogin;
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: patch.openAtLogin, args: ["--hidden"] });
  }
  writeSettings(s);
  return publicSettings();
});
ipcMain.handle("open-external", (_e, url) => {
  if (/^https:\/\//.test(url)) shell.openExternal(url);
});
ipcMain.handle("ollama:test", async () => {
  try {
    const res = await ollamaFetch("/api/tags");
    const { models = [] } = await res.json();
    return { ok: true, models: models.map((m) => m.name) };
  } catch (err) {
    return { ok: false, code: err.code || "ollama_off" };
  }
});

ipcMain.handle("chat", async (event, { id, system, messages }) => {
  try {
    const text = await chatWith(system, messages, (t) => event.sender.send("chat:delta", { id, text: t }), false);
    return { ok: true, text };
  } catch (err) {
    return { ok: false, code: errorCode(err), message: String(err.message || err) };
  }
});

ipcMain.handle("feedback", async (_e, { prompt }) => {
  try {
    const raw = await chatWith("Return only valid JSON, no prose and no code fences.", [{ role: "user", content: prompt }], null, true);
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, code: err instanceof SyntaxError ? "error" : errorCode(err), message: String(err.message || err) };
  }
});

/* ---------- app:// protocol: app files + a disk cache for the voice models ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".wasm": "application/wasm", ".json": "application/json", ".png": "image/png",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
};
// Cross-origin isolation lets the speech models run on several CPU threads.
const ISOLATION = { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "credentialless", "Cross-Origin-Resource-Policy": "same-origin" };
const SERVED = ["index.html", "src/", "workers/", "assets/", "vendor/"];
const modelsDir = () => path.join(app.getPath("userData"), "models");

async function serveApp(rel) {
  if (!SERVED.some((p) => rel === p || rel.startsWith(p))) return new Response("Not found", { status: 404 });
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.promises.readFile(file);
    return new Response(data, { headers: { "content-type": MIME[path.extname(file)] || "application/octet-stream", ...ISOLATION } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

// app://app/models/<repo>/resolve/<rev>/<file> mirrors huggingface.co and keeps each file on disk after the first download.
async function serveModel(rel) {
  if (rel.split("/").some((p) => p === ".." || p === "")) return new Response("Bad path", { status: 400 });
  const file = path.join(modelsDir(), rel);
  const type = MIME[path.extname(file)] || "application/octet-stream";
  try {
    const st = await fs.promises.stat(file);
    return new Response(Readable.toWeb(fs.createReadStream(file)), { headers: { "content-type": type, "content-length": String(st.size), ...ISOLATION } });
  } catch {}
  let res;
  try { res = await net.fetch("https://huggingface.co/" + rel); }
  catch { return new Response("offline", { status: 503, headers: ISOLATION }); }
  if (!res.ok || !res.body) return new Response(null, { status: res.status, headers: ISOLATION });
  const [toPage, toDisk] = res.body.tee();
  const tmp = file + "." + process.pid + "." + Date.now() + ".part";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const out = fs.createWriteStream(tmp);
  Readable.fromWeb(toDisk).on("error", () => { out.destroy(); fs.rm(tmp, () => {}); }).pipe(out)
    .on("finish", () => fs.rename(tmp, file, () => {}))
    .on("error", () => fs.rm(tmp, () => {}));
  const headers = { "content-type": type, ...ISOLATION };
  const len = res.headers.get("content-length");
  if (len && !res.headers.get("content-encoding")) headers["content-length"] = len;
  return new Response(toPage, { headers });
}

function registerProtocol() {
  protocol.handle("app", (req) => {
    const u = new URL(req.url);
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, "") || "index.html";
    if (rel.startsWith("models/")) return serveModel(rel.slice(7));
    return serveApp(rel);
  });
}

ipcMain.handle("voice:cache", async () => {
  let bytes = 0;
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else bytes += fs.statSync(p).size; } };
  try { walk(modelsDir()); } catch {}
  return { bytes };
});
ipcMain.handle("voice:clear", async () => { fs.rmSync(modelsDir(), { recursive: true, force: true }); return true; });

/* ---------- Window, tray and the daily reminder ---------- */
let win = null, tray = null, quitting = false;
const iconPath = () => path.join(ROOT, "assets", process.platform === "win32" ? "icon.ico" : "icon.png");

function showWindow(viewName) {
  if (!win) createWindow();
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
  if (viewName) win.webContents.send("navigate", viewName);
}

function createWindow(hidden) {
  win = new BrowserWindow({
    width: 1180, height: 860, minWidth: 900, minHeight: 640, show: !hidden,
    title: "English Boarding Pass", icon: iconPath(), backgroundColor: "#0b1020",
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(ROOT, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("app://")) e.preventDefault(); });
  win.on("close", (e) => {
    if (quitting || !tray || readSettings().tray === false) return;
    e.preventDefault();
    win.hide();
    const s = readSettings();
    if (!s.trayHintShown && Notification.isSupported()) {
      new Notification({ title: "Sigo aquí ✈", body: "Quedo en la bandeja para recordarte tu hora de inglés. Para salir, clic derecho en el avión → Salir.", icon: iconPath() }).show();
      s.trayHintShown = true; writeSettings(s);
    }
  });
  win.on("closed", () => { win = null; });
  win.loadURL("app://app/index.html");
}

function createTray() {
  try {
    tray = new Tray(nativeImage.createFromPath(path.join(ROOT, "assets", "tray.png")));
  } catch { return; }
  tray.setToolTip("English Boarding Pass");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Abrir", click: () => showWindow() },
    { label: "📞 Llamada en inglés", click: () => showWindow("call") },
    { type: "separator" },
    { label: "Salir", click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on("click", () => showWindow());
}

function dailyPhrase(dateKey) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "daily.json"), "utf8"));
    return d[dateKey] || null;
  } catch { return null; }
}
const keyOf = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

function fireReminder(test) {
  if (!Notification.isSupported()) return false;
  const p = dailyPhrase(keyOf(new Date()));
  const n = new Notification({
    title: "🛫 Tu hora de inglés",
    body: p ? `Hoy: ${p.tema}\nFrase del día: “${p.en}” (${p.es})` : "Abre tu Boarding Pass y practica 1 hora.",
    icon: iconPath(),
  });
  n.on("click", () => showWindow("home"));
  n.show();
  if (!test) { const s = readSettings(); s.lastReminder = keyOf(new Date()); writeSettings(s); }
  return true;
}
function checkReminder() {
  const r = reminderCfg();
  if (!r.on) return;
  const now = new Date();
  const hm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  if (hm >= r.time && readSettings().lastReminder !== keyOf(now) && hm < "23:59") {
    // Only fire within 30 min of the chosen time, so opening the app late at night doesn't nag.
    const [h, m] = r.time.split(":").map(Number);
    if ((now.getHours() * 60 + now.getMinutes()) - (h * 60 + m) <= 30) fireReminder(false);
  }
}
ipcMain.handle("reminder:test", () => fireReminder(true));

/* ---------- Voice self-test (used by CI on Windows) ---------- */
function runSelftest() {
  const t = new BrowserWindow({ show: false, webPreferences: { preload: path.join(ROOT, "preload.js"), contextIsolation: true } });
  const done = (result) => {
    fs.writeFileSync(SELFTEST, JSON.stringify(result, null, 2));
    app.exit(result.ok ? 0 : 1);
  };
  ipcMain.handle("selftest:done", (_e, result) => done(result));
  setTimeout(() => done({ ok: false, error: "timeout" }), 20 * 60e3);
  t.webContents.on("console-message", (_e, _l, msg) => console.log("[selftest]", msg));
  t.loadURL("app://app/src/selftest.html");
}

if (!SELFTEST && !app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => showWindow());
app.setAppUserModelId(APP_ID);

app.whenReady().then(() => {
  registerProtocol();
  const allow = (perm) => ["media", "notifications", "clipboard-sanitized-write"].includes(perm);
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(allow(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => allow(perm));
  if (SELFTEST) { runSelftest(); return; }
  createWindow(START_HIDDEN);
  if (readSettings().tray !== false) createTray();
  checkReminder();
  setInterval(checkReminder, 30e3);
});
app.on("before-quit", () => { quitting = true; });
app.on("window-all-closed", () => { if (!tray || SELFTEST) app.quit(); });
