/* ---------- Voice: speaking (Kokoro) and listening (Whisper), both on this computer ----------
   Falls back to the Windows voices while the natural voice isn't downloaded. */
const VOICES = [
  { id: "af_heart", t: "Emma · EE. UU.", e: "👩" },
  { id: "am_michael", t: "Michael · EE. UU.", e: "👨" },
  { id: "af_bella", t: "Bella · EE. UU.", e: "👩‍🦰" },
  { id: "am_fenrir", t: "Ryan · EE. UU.", e: "🧔" },
  { id: "bf_emma", t: "Olivia · Reino Unido", e: "💂‍♀️" },
  { id: "bm_george", t: "George · Reino Unido", e: "🎩" },
];
const STT_MODELS = { "Xenova/whisper-base.en": "Rápido (recomendado)", "Xenova/whisper-small.en": "Más preciso (descarga más grande)" };
const HALLUCINATION = /^(\s*(thank you|thanks for watching|you|bye|okay)[.!]?\s*|\s*[\[(].*[\])]\s*|\s*)$/i;

const Voice = (() => {
  const cfg = () => Object.assign({ neural: true, voice: "af_heart", speed: 1, stt: "Xenova/whisper-base.en" }, S.voice || {});
  const state = { tts: "idle", stt: "idle", progress: {} }; // idle | loading | ready | error
  const listeners = new Set();
  const emit = () => listeners.forEach((f) => f(state));
  let tts = null, stt = null, seq = 0;
  const pending = new Map();

  function worker(name) {
    const w = new Worker("workers/" + name + ".worker.js", { type: "module" });
    w.onmessage = ({ data }) => {
      if (data.type === "progress") {
        const p = data.p;
        if (p.status === "progress" && p.total > 1e6) { state.progress[name + ":" + p.file] = { loaded: p.loaded, total: p.total }; emit(); }
        return;
      }
      const cb = pending.get(data.id);
      if (cb) { pending.delete(data.id); cb(data); }
    };
    w.onerror = (e) => console.error(name, e.message);
    return w;
  }
  function call(w, msg, transfer) {
    return new Promise((res) => { const id = ++seq; pending.set(id, res); w.postMessage({ ...msg, id }, transfer || []); });
  }
  function loadTTS() {
    if (!tts) tts = worker("tts");
    if (state.tts === "ready" || state.tts === "loading") return ttsReady;
    state.tts = "loading"; state.warned = false; emit();
    ttsReady = call(tts, { type: "load" }).then((r) => { state.tts = r.ok ? "ready" : "error"; state.ttsError = r.error; emit(); if (r.ok) gen("Hi.", cfg().voice, cfg().speed, false); return r.ok; });
    return ttsReady;
  }
  function loadSTT() {
    if (!stt) stt = worker("stt");
    if (state.stt === "ready" || state.stt === "loading") return sttReady;
    state.stt = "loading"; emit();
    sttReady = call(stt, { type: "load", model: cfg().stt }).then((r) => { state.stt = r.ok ? "ready" : "error"; state.sttError = r.error; emit(); return r.ok; });
    return sttReady;
  }
  let ttsReady = Promise.resolve(false), sttReady = Promise.resolve(false);

  /* ---- Playback ---- */
  let ctx = null, analyser = null, playing = null, token = 0;
  function audioCtx() {
    if (!ctx) { ctx = new AudioContext(); analyser = ctx.createAnalyser(); analyser.fftSize = 512; analyser.connect(ctx.destination); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function playBuffer(samples, rate) {
    const c = audioCtx();
    const buf = c.createBuffer(1, samples.length, rate);
    buf.copyToChannel(samples, 0);
    return new Promise((res) => {
      const src = c.createBufferSource();
      src.buffer = buf; src.connect(analyser);
      src.onended = () => { if (playing === src) playing = null; res(); };
      playing = src; src.start();
    });
  }
  function level() {
    if (!analyser) return 0;
    const a = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(a);
    let s = 0; for (const v of a) s += ((v - 128) / 128) ** 2;
    return Math.sqrt(s / a.length);
  }
  function stop() {
    token++;
    try { if (playing) playing.stop(); } catch {}
    playing = null;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
  const clean = (t) => String(t).replace(/[*_#>]/g, "").replace(/___/g, "blank").replace(/\s+/g, " ").trim();
  function sentences(t) {
    const parts = clean(t).match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [];
    const out = [];
    for (const p of parts) { const s = p.trim(); if (!s) continue; if (out.length && out[out.length - 1].length < 25) out[out.length - 1] += " " + s; else out.push(s); }
    return out;
  }

  /* System voice (Windows) as fallback */
  let sysVoice = null;
  function pickSys() { const vs = speechSynthesis.getVoices(); sysVoice = vs.find((v) => /en-US/i.test(v.lang) && /Aria|Jenny|Guy|Zira|Natural|Google US|Samantha/i.test(v.name)) || vs.find((v) => /en-US/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null; }
  if ("speechSynthesis" in window) { pickSys(); speechSynthesis.onvoiceschanged = pickSys; }
  function saySystem(t, rate, my) {
    return new Promise((res) => {
      if (!("speechSynthesis" in window)) return res();
      const u = new SpeechSynthesisUtterance(clean(t)); u.lang = "en-US"; u.rate = rate; if (sysVoice) u.voice = sysVoice;
      u.onend = u.onerror = () => res();
      if (my !== token) return res();
      speechSynthesis.speak(u);
    });
  }

  /* ---- Generated audio: one job at a time, user requests first, cached in memory and on disk ---- */
  const mem = new Map(), queue = [], queued = new Map();
  let busy = false;
  const keyOf = (t, v, sp) => v + "|" + sp.toFixed(2) + "|" + t;
  const speedFor = (rate) => { const c = cfg(); return rate < 0.8 ? Math.max(0.6, c.speed * 0.72) : c.speed; };
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res) => {
      try {
        const r = indexedDB.open("ebp-voice", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("tts");
        r.onsuccess = () => res(r.result); r.onerror = () => res(null);
      } catch { res(null); }
    });
    return dbp;
  }
  async function diskGet(k) {
    const d = await db(); if (!d) return null;
    return new Promise((res) => { try { const q = d.transaction("tts").objectStore("tts").get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch { res(null); } });
  }
  async function diskPut(k, r) {
    const d = await db(); if (!d) return;
    const pcm = new Int16Array(r.audio.length);
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.max(-1, Math.min(1, r.audio[i])) * 32767;
    try { d.transaction("tts", "readwrite").objectStore("tts").put({ pcm, rate: r.rate }, k); } catch {}
  }
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    const j = queue.shift(); queued.delete(j.k);
    call(tts, { type: "say", text: j.text, voice: j.voice, speed: j.speed }).then((r) => {
      busy = false;
      j.res(r.ok ? { audio: r.audio, rate: r.rate } : null);
      pump();
    });
  }
  // Returns a promise of {audio, rate} (or null if it failed). Urgent requests jump the queue.
  function gen(text, voice, speed, urgent) {
    const k = keyOf(text, voice, speed);
    if (mem.has(k)) {
      const j = queued.get(k);
      if (urgent && j) { queue.splice(queue.indexOf(j), 1); queue.unshift(j); }
      return mem.get(k);
    }
    const p = (async () => {
      const hit = await diskGet(k);
      if (hit) { const a = new Float32Array(hit.pcm.length); for (let i = 0; i < a.length; i++) a[i] = hit.pcm[i] / 32767; return { audio: a, rate: hit.rate }; }
      const r = await new Promise((res) => { const j = { k, text, voice, speed, res }; queued.set(k, j); if (urgent) queue.unshift(j); else queue.push(j); pump(); });
      if (r) diskPut(k, r);
      return r;
    })();
    mem.set(k, p);
    p.then((r) => { if (!r) mem.delete(k); });
    if (mem.size > 500) mem.delete(mem.keys().next().value);
    return p;
  }
  // Generates audio in the background so it plays instantly later.
  function prefetch(texts) {
    const c = cfg();
    if (!c.neural || state.tts !== "ready") return;
    for (const t of texts) for (const sTxt of sentences(t)) gen(sTxt, c.voice, c.speed, false);
  }
  const within = (p, ms) => Promise.race([p.then((r) => ({ r })), new Promise((res) => setTimeout(() => res(null), ms))]);

  // Speaks text; resolves when it finishes (or is interrupted by stop()/another say()).
  // Short texts never wait: if the natural voice isn't ready in 0.7 s, the Windows voice says it
  // and the natural audio is kept for next time. Pass wait:true to always use the natural voice.
  async function say(text, { rate = 0.95, voice, wait = false } = {}) {
    stop();
    const my = token;
    const c = cfg();
    if (!c.neural || state.tts !== "ready") return saySystem(text, rate, my);
    const speed = speedFor(rate), v = voice || c.voice;
    const jobs = sentences(text).map((p) => gen(p, v, speed, true));
    if (!jobs.length) return;
    if (!wait) {
      const first = await within(jobs[0], 700);
      if (my !== token) return;
      if (!first) return saySystem(text, rate, my);
    }
    for (const j of jobs) {
      const r = await j;
      if (my !== token) return;
      if (!r) return saySystem(text, rate, my);
      await playBuffer(r.audio, r.rate);
      if (my !== token) return;
    }
  }
  // For replies that arrive word by word: each sentence starts generating as soon as it's complete,
  // so the first one plays while the rest of the reply is still being written.
  function stream({ voice, onStart } = {}) {
    stop();
    const my = token, c = cfg(), v = voice || c.voice, neural = c.neural && state.tts === "ready";
    let used = 0, chain = Promise.resolve(), started = false;
    const enqueue = (raw) => {
      const sTxt = clean(raw); if (!sTxt) return;
      const job = neural ? gen(sTxt, v, c.speed, true) : null;
      chain = chain.then(async () => {
        if (my !== token) return;
        const r = job ? await job : null;
        if (my !== token) return;
        if (!started) { started = true; if (onStart) onStart(); }
        if (r) await playBuffer(r.audio, r.rate); else await saySystem(sTxt, 0.95, my);
      });
    };
    return {
      push(full) {
        for (;;) {
          const m = full.slice(used).match(/^[\s\S]*?[.!?]+["')\]]*\s+/);
          if (!m) break;
          used += m[0].length; enqueue(m[0]);
        }
      },
      end(full) { if (full.length > used) enqueue(full.slice(used)); used = full.length; return chain; },
      cancel() { if (my === token) stop(); },
    };
  }
  async function synth(text, voice) {
    if (state.tts !== "ready" && !(await loadTTS())) return null;
    const r = await call(tts, { type: "say", text: clean(text), voice: voice || cfg().voice, speed: 1 });
    return r.ok ? r : null;
  }

  /* ---- Microphone ---- */
  let mic = null, micCtx = null, rec = null;
  async function openMic() {
    if (mic) return true;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      micCtx = new AudioContext({ sampleRate: 16000 });
      return true;
    } catch (e) { console.warn("mic", e); mic = null; return false; }
  }
  function closeMic() {
    if (rec) rec.finish();
    if (mic) mic.getTracks().forEach((t) => t.stop());
    if (micCtx) micCtx.close();
    mic = null; micCtx = null;
  }
  // Records one utterance at 16 kHz. With vad, it starts on speech and stops after a pause;
  // without it, it records until finish() is called (push to talk).
  function record({ vad = true, silenceMs = 1100, maxMs = 30000, onLevel, onStart } = {}) {
    return new Promise(async (resolve) => {
      if (!(await openMic())) return resolve(null);
      if (micCtx.state === "suspended") await micCtx.resume();
      const src = micCtx.createMediaStreamSource(mic);
      const proc = micCtx.createScriptProcessor(1024, 1, 1);
      const mute = micCtx.createGain(); mute.gain.value = 0;
      const chunks = [], pre = [];
      let speaking = !vad, above = 0, quietMs = 0, spokeMs = 0, totalMs = 0, noise = 0.008, ended = false;
      const frameMs = 1024 / 16;
      const finish = (cancel) => {
        if (ended) return; ended = true;
        proc.disconnect(); src.disconnect(); rec = null;
        if (cancel || !chunks.length) return resolve(cancel ? null : new Float32Array(0));
        const n = chunks.reduce((a, c) => a + c.length, 0), out = new Float32Array(n);
        let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
        resolve(out);
      };
      rec = { finish: () => finish(false), cancel: () => finish(true), get speaking() { return speaking; } };
      proc.onaudioprocess = (e) => {
        if (ended) return;
        const d = new Float32Array(e.inputBuffer.getChannelData(0));
        let s = 0; for (const v of d) s += v * v; const rms = Math.sqrt(s / d.length);
        totalMs += frameMs;
        if (onLevel) onLevel(rms, speaking);
        if (!speaking) {
          noise = noise * 0.95 + Math.min(rms, 0.05) * 0.05;
          pre.push(d); if (pre.length > 5) pre.shift();
          above = rms > Math.max(0.015, noise * 3) ? above + 1 : 0;
          if (above >= 2) { speaking = true; chunks.push(...pre); if (onStart) onStart(); }
          if (totalMs > 60000) finish(false);
          return;
        }
        chunks.push(d); spokeMs += frameMs;
        if (vad) {
          quietMs = rms < Math.max(0.01, noise * 2) ? quietMs + frameMs : 0;
          if (quietMs >= silenceMs && spokeMs > 400) finish(false);
        }
        if (spokeMs >= maxMs) finish(false);
      };
      src.connect(proc); proc.connect(mute); mute.connect(micCtx.destination);
    });
  }
  async function transcribe(audio) {
    if (!audio || audio.length < 16000 * 0.3) return "";
    if (state.stt !== "ready" && !(await loadSTT())) throw new Error(state.sttError || "stt");
    const copy = new Float32Array(audio);
    const r = await call(stt, { type: "transcribe", audio: copy, model: cfg().stt }, [copy.buffer]);
    if (!r.ok) throw new Error(r.error);
    return HALLUCINATION.test(r.text) ? "" : r.text;
  }
  function resample(samples, from, to) {
    const ratio = from / to, n = Math.floor(samples.length / ratio), out = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * ratio, j = Math.floor(x), f = x - j; out[i] = samples[j] * (1 - f) + (samples[j + 1] || 0) * f; }
    return out;
  }
  function downloadPct() {
    const v = Object.values(state.progress);
    const total = v.reduce((a, b) => a + b.total, 0);
    return total ? Math.round(v.reduce((a, b) => a + b.loaded, 0) / total * 100) : 0;
  }
  return {
    state, cfg, on: (f) => { listeners.add(f); return () => listeners.delete(f); },
    loadTTS, loadSTT, say, stream, prefetch, synth, stop, level, playBuffer, record, transcribe, openMic, closeMic, resample, downloadPct,
    get recording() { return rec; }, get speaking() { return !!playing || ("speechSynthesis" in window && speechSynthesis.speaking); },
  };
})();

// Every 🔊 button and the older code use speak(); keep that name.
function speak(t, rate = 0.92) { Voice.say(t, { rate }); }
document.addEventListener("click", (e) => { const s = e.target.closest("[data-say]"); if (s) speak(s.dataset.say, s.dataset.rate ? +s.dataset.rate : 0.92); });

// Load the voice models in the background once they were downloaded before (they're on disk, so this is quick).
function warmVoice() { if (S.voiceReady && Voice.cfg().neural) { Voice.loadTTS(); Voice.loadSTT(); } }
Voice.on((st) => { if (st.tts === "ready" && st.stt === "ready" && !S.voiceReady) { S.voiceReady = true; save(); } });

/* ---------- Word alignment for pronunciation scoring ---------- */
const NUMW = { 0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty", 30: "thirty" };
function wordsOf(s) {
  return String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean)
    .map((w) => NUMW[w] || w.replace(/^'+|'+$/g, ""));
}
// Longest common subsequence between target and heard words; returns which target words were heard.
function alignWords(target, heard) {
  const T = String(target).split(/\s+/).filter(Boolean), tw = T.map((w) => wordsOf(w).join(" ")), hw = wordsOf(heard);
  const eq = (a, b) => a === b || (a.length > 3 && b.length > 3 && (a.startsWith(b) || b.startsWith(a)) && Math.abs(a.length - b.length) <= 2);
  const n = tw.length, m = hw.length, dp = [...Array(n + 1)].map(() => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = tw[i] && eq(tw[i], hw[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ok = new Array(n).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) { if (tw[i] && eq(tw[i], hw[j])) { ok[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  tw.forEach((w, k) => { if (!w) ok[k] = true; });
  const counted = tw.filter(Boolean).length || 1;
  return { words: T.map((w, k) => ({ w, ok: ok[k] })), score: Math.round(ok.filter((x, k) => x && tw[k]).length / counted * 100) };
}

// Once the natural voice is ready, prepare the audio for this week's content in the background,
// so cards, lessons, the story and the interview play instantly (it's saved for next time too).
let prefetched = false;
function weekTexts() {
  const out = [], w = week(CUR);
  out.push(...w.vocab, ...w.ej.filter((e) => !e.includes("___")));
  (EXTRA.grammar[CUR] || []).forEach((q) => out.push(q.q.replace("___", q.options[q.answer])));
  (EXTRA.build[CUR] || []).forEach((b) => out.push(b.en));
  STORY.filter((c) => c.n === CUR).forEach((c) => c.scenes.forEach((sc) => out.push(sc.line, sc.choices.find((x) => x.ok === 2).en)));
  S.errors.slice(0, 15).forEach((e) => e.bien && out.push(e.bien));
  INTERVIEW.forEach((q) => out.push(q.q));
  return out;
}
Voice.on((st) => { if (st.tts === "ready" && !prefetched) { prefetched = true; setTimeout(() => Voice.prefetch(weekTexts()), 1500); } });
