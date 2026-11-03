// Kokoro text-to-speech (American and British voices), running on this computer.
// Starts on the CPU (small model, already on disk). If the computer has a real graphics card, the
// graphics-card version is prepared in the background (downloaded once) and used from then on:
// it speaks several times faster. If the graphics card ever fails, it goes back to the CPU.
import { BASE, WASM } from "./hf-fetch.js";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
let cpu = null, gpu = null, gpuTried = false;

async function gpuOk() {
  try {
    if (!self.navigator || !navigator.gpu) return false;
    const a = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    // A "fallback adapter" is a graphics card emulated on the CPU: slower than the plain CPU version.
    if (!a || a.isFallbackAdapter || (a.info && a.info.isFallbackAdapter)) return false;
    // Windows' software renderer (no real graphics card) also counts as emulated.
    const i = a.info || {};
    return !/microsoft|swiftshader|basic render|llvmpipe/i.test((i.vendor || "") + " " + (i.description || "") + " " + (i.architecture || ""));
  } catch { return false; }
}
async function create(dev, quiet) {
  const { KokoroTTS, env } = await import(BASE + "vendor/kokoro.web.js");
  env.wasmPaths = WASM;
  const tts = await KokoroTTS.from_pretrained(MODEL, {
    dtype: dev === "webgpu" ? "fp32" : "q8", device: dev,
    progress_callback: quiet ? undefined : (p) => self.postMessage({ type: "progress", p }),
  });
  await tts.generate("Hi.", { voice: "af_heart" }); // a graphics card that can't run it fails here
  return tts;
}
function loadCpu() {
  if (!cpu) { cpu = create("wasm"); cpu.catch(() => { cpu = null; }); }
  return cpu;
}
async function upgrade() {
  if (gpuTried) return; gpuTried = true;
  if (!(await gpuOk())) return;
  try { gpu = await create("webgpu", true); self.postMessage({ type: "device", device: "webgpu" }); }
  catch (e) { console.warn("tts webgpu", e); gpu = null; }
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    const c = await loadCpu();
    if (type === "load") { self.postMessage({ id, ok: true, device: gpu ? "webgpu" : "wasm" }); if (data.gpu !== "cpu") upgrade(); return; }
    const opts = { voice: data.voice || "af_heart", speed: data.speed || 1 };
    const t0 = performance.now();
    let out = null, device = "wasm";
    if (gpu && data.gpu !== "cpu") {
      try { out = await gpu.generate(data.text, opts); device = "webgpu"; }
      catch (e) { console.warn("tts webgpu failed, using the CPU", e); gpu = null; self.postMessage({ type: "device", device: "wasm" }); }
    }
    if (!out) out = await c.generate(data.text, opts);
    self.postMessage({ id, ok: true, audio: out.audio, rate: out.sampling_rate, ms: performance.now() - t0, device }, [out.audio.buffer]);
  } catch (e) {
    self.postMessage({ id, ok: false, error: String((e && e.message) || e) });
  }
};
