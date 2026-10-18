// Whisper speech recognition (English), running on this computer.
import { BASE, WASM } from "./hf-fetch.js";

const loaded = new Map();
function load(model) {
  if (!loaded.has(model)) {
    const p = (async () => {
      const { pipeline, env } = await import(BASE + "vendor/transformers.min.js");
      env.useBrowserCache = false;
      env.backends.onnx.wasm.wasmPaths = WASM;
      return pipeline("automatic-speech-recognition", model, {
        dtype: "q8", device: "wasm",
        progress_callback: (p) => self.postMessage({ type: "progress", p }),
      });
    })();
    p.catch(() => loaded.delete(model));
    loaded.set(model, p);
  }
  return loaded.get(model);
}

self.onmessage = async ({ data }) => {
  const { id, type, model = "Xenova/whisper-base.en" } = data;
  try {
    const asr = await load(model);
    if (type === "load") { self.postMessage({ id, ok: true }); return; }
    const long = data.audio.length > 16000 * 28;
    const out = await asr(data.audio, long ? { chunk_length_s: 30, stride_length_s: 5 } : {});
    self.postMessage({ id, ok: true, text: String(out.text || "").trim() });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String((e && e.message) || e) });
  }
};
