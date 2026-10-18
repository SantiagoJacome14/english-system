/* ---------- Shared: is the voice ready? ---------- */
// Returns a banner for screens that need to hear the student, or "" when speech recognition can run.
function voiceGate(what) {
  const st = Voice.state;
  if (S.voiceReady || st.stt === "ready") { if (st.stt === "idle") Voice.loadSTT(); if (st.tts === "idle" && Voice.cfg().neural) Voice.loadTTS(); return ""; }
  if (st.stt === "loading" || st.tts === "loading") return `<div class="card"><span class="label">Preparando la voz</span><h3>Descargando voces… <span class="dl-pct">${Voice.downloadPct()}</span>%</h3><div class="bar"><i class="dl-bar" style="width:${Voice.downloadPct()}%"></i></div><p class="muted" style="margin:0">Solo pasa una vez. Cuando termine, ${what}.</p></div>`;
  return `<div class="card voice-cta"><span class="label">Falta un paso</span><h3>🎙️ Activa la voz para ${what}</h3><p class="muted" style="margin:0">Se descargan una vez las voces y el reconocimiento (unos 170 MB). Después funcionan sin internet.</p><div><button class="btn gold" id="voice-on">Activar voz</button></div></div>`;
}
Voice.on(() => {
  document.querySelectorAll(".dl-bar").forEach((b) => (b.style.width = Voice.downloadPct() + "%"));
  document.querySelectorAll(".dl-pct").forEach((b) => (b.textContent = Voice.downloadPct()));
  const st = Voice.state;
  if (st.stt !== "loading" && st.tts !== "loading" && ["call", "pron", "interview"].includes(view) && !CALL) VIEWS[view]();
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtTime = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(Math.floor(s % 60)).padStart(2, "0");

/* ---------- 📞 Call mode: hands-free voice conversation ---------- */
let CALL = null;
VIEWS.call = async (scen) => {
  const st = await window.api.getSettings();
  const gate = voiceGate("hacer llamadas");
  if (!scen || gate || st.provider === "none") {
    $("#main").innerHTML = `<div class="screen">
      <div class="head"><div><h1>Llamada en inglés</h1><p>Habla con tu voz, sin escribir. Max te escucha, te responde en voz alta y al colgar te da tu corrección.</p></div></div>
      ${st.provider === "none" ? `<div class="banner">Para llamar necesitas un cerebro: elige Ollama (gratis) o Claude en <button class="btn" data-nav="settings" style="padding:2px 10px">Ajustes</button>.</div>` : ""}
      ${gate}
      <div class="grid g3">${SCEN.filter((s) => s.id !== "correct").map((s) => `<button class="qa scenq" data-nav="call" data-arg="${s.id}" ${gate || st.provider === "none" ? "disabled" : ""}><span class="e">${s.e}</span><b>${esc(s.t)}</b><small>${esc(s.s())}</small><span class="pill" style="align-self:flex-start">📞 Llamar</span></button>`).join("")}</div>
      <div class="card"><span class="label">Cómo funciona</span><div class="howto"><div><b>1 · Habla</b><small>Cuando veas “Te escucho”, habla normal. Al hacer una pausa, Max entiende que terminaste.</small></div><div><b>2 · Escucha</b><small>Max responde en voz alta. Activa los subtítulos si no entiendes.</small></div><div><b>3 · Cuelga</b><small>Recibes tu puntaje, tus errores y frases nuevas. Tus errores se vuelven tarjetas.</small></div></div></div>
    </div>`;
    return;
  }
  startCall(scen);
};

function callPrompt() {
  return sysPrompt() + `
This is a VOICE PHONE CALL. The student's words come from speech recognition, so ignore small transcription mistakes and missing punctuation. You are speaking out loud: reply in 1–2 short sentences (max 30 words), no emojis, no lists, no parentheses, no Spanish. If the student uses a Spanish word, naturally say the English word in your reply. If the student says "repeat" or seems lost, say it again more slowly with simpler words.`;
}

function startCall(scen) {
  talkMode = scen;
  const m = SCEN.find((x) => x.id === scen) || SCEN[0];
  CALL = { scen, m, hist: [], active: true, muted: false, ptt: !!S.ptt, subs: S.subs !== false, t0: Date.now(), speakSec: 0, miss: 0, state: "ring", micLevel: 0 };
  $("#main").innerHTML = `<div class="callv">
    <div class="call-top"><span class="label">📞 ${esc(m.t)}</span><span class="call-timer" id="c-time">00:00</span></div>
    <div class="call-mid">
      <button class="call-avatar" id="c-av" title="Toca para saltar lo que está diciendo"><span class="ring" id="c-ring"></span><span class="ring r2" id="c-ring2"></span><span class="face">🧑‍✈️</span></button>
      <b class="call-name">Max</b><div class="call-state" id="c-state">Llamando…</div>
      <div class="subs" id="c-subs" ${CALL.subs ? "" : "hidden"}></div>
    </div>
    <div class="call-help">${["Could you repeat that?", "Sorry, I didn't catch that.", "How do you say… in English?", "Can you speak more slowly?", "Let me think…"].map((v) => `<button class="chip" data-callsay="${esc(v)}">${esc(v)}</button>`).join("")}</div>
    <div class="ptt" id="c-ptt" ${CALL.ptt ? "" : "hidden"}><button class="btn big" id="c-pttb">🎙 Mantén presionado para hablar <kbd>Espacio</kbd></button></div>
    <div class="call-ctrls">
      <button class="cbtn" id="c-mute" title="Silenciar micrófono"><span>🎙️</span><small>Micrófono</small></button>
      <button class="cbtn" id="c-mode" title="Cambiar modo"><span>${CALL.ptt ? "✋" : "🙌"}</span><small>${CALL.ptt ? "Presionar" : "Manos libres"}</small></button>
      <button class="cbtn" id="c-cc" aria-pressed="${CALL.subs}" title="Subtítulos"><span>CC</span><small>Subtítulos</small></button>
      <button class="cbtn hang" id="c-hang" title="Colgar"><span>📞</span><small>Colgar</small></button>
    </div>
  </div>`;
  $("#c-hang").onclick = hangUp;
  $("#c-av").onclick = () => Voice.stop();
  $("#c-mute").onclick = () => { CALL.muted = !CALL.muted; $("#c-mute").classList.toggle("off", CALL.muted); $("#c-mute span").textContent = CALL.muted ? "🔇" : "🎙️"; if (CALL.muted && Voice.recording) Voice.recording.cancel(); };
  $("#c-mode").onclick = () => { CALL.ptt = !CALL.ptt; S.ptt = CALL.ptt; save(); $("#c-mode").innerHTML = `<span>${CALL.ptt ? "✋" : "🙌"}</span><small>${CALL.ptt ? "Presionar" : "Manos libres"}</small>`; $("#c-ptt").hidden = !CALL.ptt; if (Voice.recording) Voice.recording.cancel(); };
  $("#c-cc").onclick = () => { CALL.subs = !CALL.subs; S.subs = CALL.subs; save(); $("#c-subs").hidden = !CALL.subs; $("#c-cc").setAttribute("aria-pressed", CALL.subs); };
  const pb = $("#c-pttb");
  pb.onpointerdown = () => pttDown(); pb.onpointerup = pb.onpointerleave = () => pttUp();
  document.querySelectorAll("[data-callsay]").forEach((b) => (b.onclick = () => userSaid(b.dataset.callsay, 1)));
  onLeave = () => { if (CALL && CALL.active) { CALL.active = false; Voice.stop(); if (Voice.recording) Voice.recording.cancel(); } CALL = null; };
  const tick = setInterval(() => { if (!CALL || !CALL.active) return clearInterval(tick); $("#c-time").textContent = fmtTime((Date.now() - CALL.t0) / 1000); }, 500);
  animateCall();
  callLoop();
}

function setCallState(s, text) { if (!CALL) return; CALL.state = s; const el = $("#c-state"); if (el) { el.textContent = text; el.dataset.s = s; } }
function renderSubs() {
  const el = $("#c-subs"); if (!el || !CALL) return;
  const last = CALL.hist.slice(-2);
  el.innerHTML = last.map((h) => h.role === "assistant" ? `<p class="sb">${esc(h.content)}</p>` : `<p class="su"><span class="label">Te entendí</span> ${esc(h.content)}</p>`).join("");
}
function animateCall() {
  const r1 = $("#c-ring"), r2 = $("#c-ring2");
  if (!CALL || !r1) return;
  const lv = Voice.speaking ? Voice.level() * 5 : CALL.state === "listen" ? CALL.micLevel * 9 : 0;
  const k = Math.min(1, lv);
  r1.style.transform = `scale(${1 + k * 0.35})`; r2.style.transform = `scale(${1 + k * 0.7})`;
  r1.style.opacity = r2.style.opacity = CALL.state === "think" ? 0.35 : 0.25 + k * 0.6;
  $("#c-av").dataset.s = Voice.speaking ? "speak" : CALL.state;
  requestAnimationFrame(animateCall);
}

let pttResolve = null;
function pttDown() { if (!CALL || !CALL.ptt || Voice.recording || CALL.state !== "listen") return; Voice.stop(); $("#c-pttb").classList.add("rec"); pttResolve && pttResolve(Voice.record({ vad: false, maxMs: 45000, onLevel: (l) => (CALL.micLevel = l) })); }
function pttUp() { const b = $("#c-pttb"); if (b) b.classList.remove("rec"); if (Voice.recording) Voice.recording.finish(); }
document.addEventListener("keydown", (e) => { if (view === "call" && CALL && CALL.ptt && e.code === "Space" && !e.repeat) { e.preventDefault(); pttDown(); } });
document.addEventListener("keyup", (e) => { if (view === "call" && CALL && CALL.ptt && e.code === "Space") { e.preventDefault(); pttUp(); } });

async function listenOnce() {
  if (CALL.ptt) {
    setCallState("listen", "Mantén presionado para hablar");
    return new Promise((res) => { pttResolve = (p) => { pttResolve = null; p.then(res); }; CALL.cancelWait = () => { pttResolve = null; res(null); }; });
  }
  setCallState("listen", "Te escucho…");
  return Voice.record({ vad: true, silenceMs: 1200, maxMs: 40000, onLevel: (l) => (CALL.micLevel = l), onStart: () => setCallState("listen", "Te escucho… 🟢") });
}

async function callLoop() {
  const me = CALL;
  sfx("ring"); await sleep(1300);
  if (!me.active) return;
  if (!(await Voice.openMic())) { setCallState("error", "No pude usar el micrófono. Revisa que esté conectado y permitido en Windows."); return; }
  await botTurn(me);
  while (me.active) {
    if (me.busyChip) { await sleep(150); continue; }
    if (me.muted) { setCallState("muted", "Micrófono silenciado"); await sleep(300); continue; }
    const audio = await listenOnce();
    if (!me.active) return;
    if (!audio || audio.length < 16000 * 0.4 || me.busyChip) continue;
    setCallState("think", "Entendiendo…");
    let text = "";
    try { text = await Voice.transcribe(audio); } catch { setCallState("error", "El reconocimiento de voz falló. Intenta otra vez."); await sleep(1500); continue; }
    if (!me.active) return;
    me.speakSec += audio.length / 16000;
    if (!text) {
      me.miss++;
      if (me.miss >= 2) { me.miss = 0; setCallState("speak", "Hablando…"); await Voice.say("Sorry, I didn't catch that. Could you say it again?"); }
      continue;
    }
    me.miss = 0;
    await userSaid(text, 0, me);
  }
}
async function userSaid(text, fromChip, me = CALL) {
  if (!me || !me.active) return;
  if (fromChip) { if (me.state !== "listen" || me.busyChip) return; me.busyChip = true; if (Voice.recording) Voice.recording.cancel(); if (me.cancelWait) me.cancelWait(); }
  me.hist.push({ role: "user", content: text });
  renderSubs();
  if (fromChip) { await botTurn(me); me.busyChip = false; }
  else await botTurn(me);
}
async function botTurn(me) {
  if (me.thinking) return; me.thinking = true;
  setCallState("think", "Pensando…");
  // Max starts talking as soon as the first sentence of the reply is written.
  const sp = Voice.stream({ onStart: () => setCallState("speak", "Hablando…") });
  const r = await window.api.chat(callPrompt(), [{ role: "user", content: "(The phone call starts now. Greet the student by name and ask your first question.)" }, ...me.hist], (t) => { if (me.active) sp.push(t); });
  me.thinking = false;
  if (!me.active) { sp.cancel(); return; }
  if (!r.ok) { sp.cancel(); setCallState("error", ERR[r.code] || ERR.error); await sleep(2500); return; }
  me.hist.push({ role: "assistant", content: r.text });
  renderSubs();
  await sp.end(r.text);
}

async function hangUp() {
  if (!CALL) return;
  const c = CALL; c.active = false; Voice.stop(); if (Voice.recording) Voice.recording.cancel(); if (c.cancelWait) c.cancelWait();
  sfx("hang"); CALL = null; onLeave = null;
  const said = c.hist.filter((m) => m.role === "user").map((m) => m.content);
  const secs = Math.round((Date.now() - c.t0) / 1000);
  $("#main").innerHTML = `<div class="screen" style="max-width:860px">
    <div class="head"><div><h1>Llamada terminada</h1><p>${esc(c.m.t)} · ${fmtTime(secs)} · ${said.length} ${said.length === 1 ? "respuesta tuya" : "respuestas tuyas"}</p></div><div style="display:flex;gap:8px"><button class="btn primary" data-nav="call" data-arg="${c.scen}">📞 Llamar otra vez</button><button class="btn" data-nav="home">Inicio</button></div></div>
    <div id="c-fb">${said.length ? `<div class="card"><span class="muted">Revisando lo que dijiste…</span></div>` : `<div class="banner">No alcanzaste a decir nada. La próxima vez habla después de que Max termine.</div>`}</div>
    ${c.hist.length ? `<div class="card"><h3>Transcripción</h3><div class="transcript">${c.hist.map((h) => `<p class="${h.role === "assistant" ? "tb" : "tu"}"><b>${h.role === "assistant" ? "Max" : "Tú"}:</b> ${esc(h.content)}</p>`).join("")}</div></div>` : ""}
  </div>`;
  if (!said.length) return;
  S.calls = (S.calls || 0) + 1; S.speakSec = (S.speakSec || 0) + c.speakSec; S.chatLog = S.chatLog || {}; S.chatLog[TODAY] = 1;
  addMin(Math.max(1, Math.round(secs / 60))); addXP(30 + Math.min(40, said.length * 4), "Llamada en inglés");
  const res = await window.api.feedback(`You are an English teacher for a Spanish-speaking A2 student. ${PROFILE}
Here is everything the student SAID in a voice call (speech recognition transcript, so ignore punctuation and capitalization; scenario: ${c.m.t}):
${said.map((x, i) => i + 1 + ". " + x).join("\n")}
Return JSON: {"bien":"one sentence in Spanish about what they did well","errores":[{"mal":"exact wrong phrase","bien":"corrected English","porque":"very short reason in Spanish"}],"frases":["3 useful natural English phrases for this topic"],"puntajes":{"fluidez":1-5,"gramatica":1-5,"vocabulario":1-5},"consejo":"one concrete tip in Spanish"}. Only real grammar or word-choice errors, 3 to 5 max.`);
  const box = $("#c-fb"); if (!box) return;
  if (!res.ok) { box.innerHTML = `<div class="banner">${esc(ERR[res.code] || ERR.error)}</div>`; return; }
  const r = res.data, p = r.puntajes || {}, nE = (r.errores || []).length;
  S.errors = mergeErr(r.errores || [], S.errors); S.scores = S.scores || []; S.scores.push({ date: TODAY, ...p }); save();
  box.innerHTML = `<div class="fbk"><div class="scores3">${[["Fluidez", p.fluidez], ["Gramática", p.gramatica], ["Vocabulario", p.vocabulario]].map(([k, v]) => `<div><span class="label">${k}</span><b>${esc(v)}<small>/5</small></b></div>`).join("")}</div><p style="margin:0">${esc(r.bien)}</p>${nE ? errTable(r.errores) + `<p class="muted" style="margin:0">🧠 Estos errores ya están en tus tarjetas, en <button class="btn" data-nav="cards" data-arg="err" style="padding:2px 10px">Mis errores</button></p>` : ""}<span class="label">Frases para tu próxima llamada</span><div class="chips">${(r.frases || []).map((f) => `<button class="chip" data-say="${esc(f)}">🔊 ${esc(f)}</button>`).join("")}</div><p style="margin:0"><strong>Consejo:</strong> ${esc(r.consejo)}</p></div>`;
  checkAch();
}
