const { app, BrowserWindow, ipcMain, safeStorage, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const Anthropic = require("@anthropic-ai/sdk");

const MODELS = {
  "claude-opus-5-5": { label: "Claude Opus 5.5 (mejor calidad)" },
  "claude-haiku-5-5": { label: "Claude Haiku 5.5 (más económico)" },
};
const DEFAULT_MODEL = "claude-opus-5-5";
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
function client() {
  const apiKey = getApiKey();
  if (!apiKey) { const e = new Error("Falta tu clave de API"); e.code = "no_key"; throw e; }
  return new Anthropic({ apiKey });
}
function model() { const m = readSettings().model; return MODELS[m] ? m : DEFAULT_MODEL; }

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
  if (err.code === "no_key") return "no_key";
  if (err instanceof Anthropic.AuthenticationError) return "bad_key";
  if (err instanceof Anthropic.RateLimitError) return "rate_limited";
  if (err instanceof Anthropic.APIConnectionError) return "offline";
  if (err instanceof Anthropic.APIError && err.status === 400 && /credit/i.test(err.message)) return "no_credit";
  return "error";
}
function textOf(msg) {
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

ipcMain.handle("settings:get", () => {
  const s = readSettings();
  return { hasKey: !!getApiKey(), model: model(), models: MODELS };
});
ipcMain.handle("settings:set", (_e, { key, model: m }) => {
  const s = readSettings();
  if (typeof key === "string" && key.trim()) {
    const k = key.trim();
    if (safeStorage.isEncryptionAvailable()) { s.key = safeStorage.encryptString(k).toString("base64"); s.enc = true; }
    else { s.key = k; s.enc = false; }
  }
  if (m && MODELS[m]) s.model = m;
  writeSettings(s);
  return { hasKey: !!getApiKey(), model: model() };
});
ipcMain.handle("open-external", (_e, url) => {
  if (/^https:\/\//.test(url)) shell.openExternal(url);
});

ipcMain.handle("chat", async (event, { id, system, messages }) => {
  try {
    const stream = client().beta.messages.stream(requestParams(system, messages, 4000));
    let text = "";
    stream.on("text", (delta) => { text += delta; event.sender.send("chat:delta", { id, text }); });
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") return { ok: false, code: "refusal" };
    return { ok: true, text: textOf(final) };
  } catch (err) {
    return { ok: false, code: errorCode(err), message: String(err.message || err) };
  }
});

ipcMain.handle("feedback", async (_e, { prompt }) => {
  try {
    const final = await client().beta.messages.stream(
      requestParams("Return only valid JSON, no prose and no code fences.", [{ role: "user", content: prompt }], 8000)
    ).finalMessage();
    if (final.stop_reason === "refusal") return { ok: false, code: "refusal" };
    const raw = textOf(final);
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, code: err instanceof SyntaxError ? "error" : errorCode(err), message: String(err.message || err) };
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1000, height: 820, minWidth: 420, minHeight: 600,
    title: "English Boarding Pass",
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.loadFile("index.html");
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
