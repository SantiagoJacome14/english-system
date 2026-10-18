// Speaks a sentence with Kokoro, feeds the audio to Whisper and checks the words match. Run by CI: electron . --selftest=out.json
(async () => {
  const BASE = new URL("../", location.href).href;
  const call = (w, msg, transfer) => new Promise((res) => {
    const h = ({ data }) => { if (data.type === "progress") return; w.removeEventListener("message", h); res(data); };
    w.addEventListener("message", h); w.postMessage({ id: 1, ...msg }, transfer || []);
  });
  const result = { ok: false, steps: {} };
  const t = (k, t0) => (result.steps[k] = Math.round(performance.now() - t0) + " ms");
  try {
    result.isolated = self.crossOriginIsolated;
    const tts = new Worker(BASE + "workers/tts.worker.js", { type: "module" });
    const stt = new Worker(BASE + "workers/stt.worker.js", { type: "module" });
    let t0 = performance.now();
    const [a, b] = await Promise.all([call(tts, { type: "load" }), call(stt, { type: "load" })]);
    t("load", t0);
    if (!a.ok || !b.ok) throw new Error("load: " + (a.error || "") + " " + (b.error || ""));
    const text = "Hello, my name is Santiago and I want to work at Disney next year.";
    t0 = performance.now();
    const sp = await call(tts, { type: "say", text, voice: "af_heart", speed: 1 });
    t("tts", t0);
    if (!sp.ok) throw new Error("tts: " + sp.error);
    result.audioSeconds = +(sp.audio.length / sp.rate).toFixed(2);
    const ratio = sp.rate / 16000, n = Math.floor(sp.audio.length / ratio), pcm = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * ratio, j = Math.floor(x), f = x - j; pcm[i] = sp.audio[j] * (1 - f) + (sp.audio[j + 1] || 0) * f; }
    t0 = performance.now();
    const pcm2 = new Float32Array(pcm);
    const r = await call(stt, { type: "transcribe", audio: pcm }, [pcm.buffer]);
    t("stt", t0);
    if (!r.ok) throw new Error("stt: " + r.error);
    result.heard = r.text;
    const words = (s) => s.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);
    const want = words(text), got = new Set(words(r.text));
    result.match = +(want.filter((w) => got.has(w)).length / want.length).toFixed(2);
    result.ok = result.match >= 0.8;
    // Second run: everything should now come from the disk cache.
    t0 = performance.now();
    const again = new Worker(BASE + "workers/stt.worker.js", { type: "module" });
    const c = await call(again, { type: "load" });
    t("reload_from_cache", t0);
    result.cached = c.ok;
    // The multilingual model used for "¿Cómo se dice…?" loads and accepts a language.
    t0 = performance.now();
    const es = await call(stt, { type: "transcribe", audio: pcm2, model: "Xenova/whisper-base", language: "english" }, [pcm2.buffer]);
    t("multilingual", t0);
    result.multilingual = es.ok ? es.text : "ERROR " + es.error;
    if (!es.ok) result.ok = false;
  } catch (e) {
    result.error = String(e && e.message || e);
  }
  window.api.selftestDone(result);
})();
