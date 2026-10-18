// Kokoro text-to-speech (American and British voices), running on this computer.
import { BASE, WASM } from "./hf-fetch.js";

let loading = null;
function load() {
  if (!loading) {
    loading = (async () => {
      const { KokoroTTS, env } = await import(BASE + "vendor/kokoro.web.js");
      env.wasmPaths = WASM;
      return KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
        dtype: "q8", device: "wasm",
        progress_callback: (p) => self.postMessage({ type: "progress", p }),
      });
    })();
    loading.catch(() => { loading = null; });
  }
  return loading;
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    const tts = await load();
    if (type === "load") { self.postMessage({ id, ok: true }); return; }
    const out = await tts.generate(data.text, { voice: data.voice || "af_heart", speed: data.speed || 1 });
    self.postMessage({ id, ok: true, audio: out.audio, rate: out.sampling_rate }, [out.audio.buffer]);
  } catch (e) {
    self.postMessage({ id, ok: false, error: String((e && e.message) || e) });
  }
};
