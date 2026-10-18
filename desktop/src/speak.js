/* ---------- 🎯 Pronunciation trainer ---------- */
function pronSets() {
  const w = week(CUR);
  const sets = [
    { id: "week", t: "Frases de la semana " + CUR, items: w.vocab.filter((v) => !/[…\/(]/.test(v)).concat(w.ej.filter((e) => !e.includes("___"))) },
    { id: "disney", t: "Entrevista Disney", items: INTERVIEW.map((q) => q.model.split(/(?<=[.!?])\s+/)[0]).concat(INTERVIEW.map((q) => q.q)) },
    { id: "story", t: "Historia: Viaje a Orlando", items: STORY.filter((c) => c.n <= CUR).flatMap((c) => c.scenes.map((sc) => sc.choices.find((x) => x.ok === 2).en)) },
    { id: "hard", t: "Sonidos difíciles", items: ["I think this is the third time.", "She sells sea shells.", "I usually watch TV in the evening.", "Thirty, thirteen, three.", "Very good, very well.", "I'd like a sandwich and a juice.", "The weather is beautiful this week.", "I live in a little village.", "Ship and sheep, live and leave.", "World, word, work, walk."] },
  ];
  if (S.errors.length) sets.splice(1, 0, { id: "err", t: "Mis errores (forma correcta)", items: S.errors.slice(0, 20).map((e) => e.bien) });
  return sets;
}
let PR = null;
VIEWS.pron = (target) => {
  const sets = pronSets();
  if (!PR || target) PR = { set: target ? "custom" : "week", i: 0, custom: target ? [target] : [] };
  const items = PR.set === "custom" ? PR.custom : (sets.find((s) => s.id === PR.set) || sets[0]).items;
  const t = items[PR.i % items.length];
  const finished = PR.i >= items.length;
  if (!finished) Voice.prefetch(items.slice(PR.i, PR.i + 3));
  const gate = voiceGate("practicar tu pronunciación");
  const miss = Object.entries(S.pronMiss || {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
  $("#main").innerHTML = `<div class="screen">
    <div class="head"><div><h1>Pronunciación</h1><p>Di la frase. Las palabras que la app entiende salen en verde; las que no, en rojo.</p></div><span class="pill" id="p-stats">${S.pronCount || 0} frases · mejor ${S.pronBest || 0}%</span></div>
    ${gate}
    <div class="grid pron-grid">
      <div class="card"><span class="label">Elige qué practicar</span><div class="setlist">${(PR.set === "custom" ? [{ id: "custom", t: "Frase del día" }] : []).concat(sets).map((s) => `<button class="sc" data-pset="${s.id}" aria-pressed="${PR.set === s.id}"><span class="e">${{ week: "📅", disney: "🏰", story: "✈️", hard: "👅", err: "🧠", custom: "⭐" }[s.id]}</span><span><b>${esc(s.t)}</b><small>${s.items ? s.items.length + " frases" : ""}</small></span></button>`).join("")}</div>
        ${miss.length ? `<span class="label">Tus palabras difíciles</span><div class="chips">${miss.map(([w, n]) => `<button class="chip" data-say="${esc(w)}" data-rate="0.7">🔊 ${esc(w)} <small class="muted">×${n}</small></button>`).join("")}</div>` : ""}
      </div>
      ${finished ? pronDone(items, sets) : `<div class="card pron-main">
        <div style="display:flex;justify-content:space-between"><span class="label">Frase ${PR.i % items.length + 1} de ${items.length}</span><button class="btn" id="p-next">Siguiente →</button></div>
        <div class="pron-target" id="p-target">${esc(t)}</div>
        <div class="pron-ctrl">
          <button class="listenbtn slow" data-say="${esc(t)}" data-rate="0.95" aria-label="Escuchar">🔊</button>
          <button class="recbtn" id="p-rec" ${gate ? "disabled" : ""} aria-label="Grabar"><span>🎙</span></button>
          <button class="listenbtn slow" data-say="${esc(t)}" data-rate="0.65" aria-label="Escuchar lento">🐢</button>
        </div>
        <div class="muted" style="text-align:center" id="p-hint">${gate ? "" : "Toca 🎙 y habla. Se detiene solo cuando haces una pausa."}</div>
        <div id="p-out"></div>
      </div>`}
    </div></div>`;
  document.querySelectorAll("[data-pset]").forEach((b) => (b.onclick = () => { PR = { set: b.dataset.pset, i: 0, custom: PR.custom }; VIEWS.pron(); }));
  if (finished) {
    $("#p-again").onclick = () => { PR.i = 0; PR.scores = {}; VIEWS.pron(); };
    const nx = $("#p-nextset"); if (nx) nx.onclick = () => { PR = { set: nx.dataset.set, i: 0, custom: PR.custom }; VIEWS.pron(); };
    return;
  }
  $("#p-next").onclick = () => { PR.i++; VIEWS.pron(); };
  const rb = $("#p-rec");
  rb.onclick = async () => {
    if (Voice.recording) { Voice.recording.finish(); return; }
    Voice.stop();
    rb.classList.add("rec"); $("#p-hint").textContent = "Te escucho… (toca otra vez para terminar)";
    const audio = await Voice.record({ vad: true, silenceMs: 1000, maxMs: 15000, onLevel: (l) => (rb.style.boxShadow = `0 0 0 ${Math.min(26, l * 300)}px rgba(62,214,155,.25)`) });
    rb.classList.remove("rec"); rb.style.boxShadow = "";
    if (!audio || !audio.length) { $("#p-hint").textContent = "No escuché nada. Revisa el micrófono e intenta otra vez."; return; }
    $("#p-hint").textContent = "Analizando…";
    let heard = "";
    try { heard = await Voice.transcribe(audio); } catch { $("#p-hint").textContent = "El reconocimiento de voz falló. Intenta otra vez."; return; }
    const a = alignWords(t, heard);
    PR.scores = PR.scores || {}; PR.scores[PR.i] = Math.max(PR.scores[PR.i] || 0, a.score);
    S.pronCount = (S.pronCount || 0) + 1; S.pronBest = Math.max(S.pronBest || 0, a.score);
    S.pronMiss = S.pronMiss || {};
    a.words.filter((x) => !x.ok).forEach((x) => { const w = wordsOf(x.w)[0]; if (w) S.pronMiss[w] = (S.pronMiss[w] || 0) + 1; });
    save();
    $("#p-stats").textContent = `${S.pronCount} frases · mejor ${S.pronBest}%`;
    sfx(a.score >= 80 ? "ok" : "bad");
    if (a.score >= 80) addXP(a.score === 100 ? 15 : 10, "Pronunciación"); else addXP(3, "Práctica de pronunciación");
    if (a.score === 100) confetti();
    $("#p-hint").textContent = "";
    $("#p-target").innerHTML = a.words.map((x) => `<span class="${x.ok ? "wok" : "wbad"}">${esc(x.w)}</span>`).join(" ");
    const bad = a.words.filter((x) => !x.ok);
    $("#p-out").innerHTML = `<div class="pron-res"><div class="score-ring" style="--p:${a.score}"><b>${a.score}%</b></div><div style="display:flex;flex-direction:column;gap:8px;min-width:0">
      <div><span class="label">La app entendió</span><p style="margin:2px 0 0">“${esc(heard || "(nada)")}”</p></div>
      ${bad.length ? `<div><span class="label">Repite estas palabras</span><div class="chips">${bad.map((x) => `<button class="chip" data-say="${esc(x.w)}" data-rate="0.7">🔊 ${esc(x.w)}</button>`).join("")}</div></div>` : `<b style="color:var(--green)">¡Perfecto! Se entendió todo.</b>`}
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="p-mine">▶ Escuchar mi grabación</button><button class="btn" data-say="${esc(t)}">🔊 Escuchar el modelo</button></div></div></div>`;
    $("#p-mine").onclick = () => Voice.playBuffer(audio, 16000);
  };
};

/* ---------- 🏰 Disney interview simulator ---------- */
let IV = null;
VIEWS.interview = () => {
  const past = S.interviews || [];
  $("#main").innerHTML = `<div class="screen" style="max-width:900px">
    <div class="head"><div><h1>Entrevista Disney</h1><p>8 preguntas reales del programa de intercambio. Respóndelas en voz alta (o escribiendo) y recibe tu reporte con respuestas modelo.</p></div></div>
    <div class="hero iv-hero"><div><span class="label">Simulador · 8 preguntas · 90 s por respuesta</span><h2>🏰 Tu entrevista para Disney</h2><p class="muted" style="margin:6px 0 0">La reclutadora te lee cada pregunta. Tienes 90 segundos para responder. Habla con calma y con ejemplos.</p></div><button class="btn gold big" id="iv-go">▶ Empezar entrevista</button></div>
    ${voiceGate("responder con tu voz") ? `<div class="banner">Sin la voz activada puedes responder escribiendo. ${S.voiceReady ? "" : `<button class="btn" id="voice-on" style="padding:2px 10px">Activar voz</button>`}</div>` : ""}
    <div class="card"><h3>Las preguntas</h3><div class="ivlist">${INTERVIEW.map((q, i) => `<details><summary><b>${i + 1}.</b> ${esc(q.q)} <span class="muted">· ${esc(q.q_es)}</span></summary><p class="muted" style="margin:6px 0">💡 ${esc(q.tip)}</p><p style="margin:0"><span class="label">Respuesta modelo</span><br>${esc(q.model)}</p><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-say="${esc(q.model)}">🔊 Escuchar</button><button class="btn" data-nav="pron" data-arg="${esc(q.model.split(/(?<=[.!?])\s+/)[0])}">🎯 Practicar</button></div></details>`).join("")}</div></div>
    ${past.length ? `<div class="card"><h3>Tus intentos</h3><div class="chips">${past.slice(-8).map((p) => `<span class="chip">${esc(p.date)} · ${"★".repeat(Math.round(p.score))}${"☆".repeat(5 - Math.round(p.score))}</span>`).join("")}</div></div>` : ""}
  </div>`;
  $("#iv-go").onclick = () => { IV = { i: 0, ans: [], t0: 0 }; ivQuestion(); };
};
function ivQuestion() {
  const q = INTERVIEW[IV.i], canVoice = !voiceGate("x");
  IV.t0 = Date.now(); IV.text = "";
  $("#main").innerHTML = `<div class="screen" style="max-width:860px"><div class="lesson" style="max-width:none">
    <div class="ltop"><button class="x" data-nav="interview" aria-label="Salir">✕</button><div class="bar"><i style="width:${IV.i / INTERVIEW.length * 100}%"></i></div><span class="xp">${IV.i + 1}/${INTERVIEW.length}</span></div>
    <div class="iv-q"><span class="avatar big">👩‍💼</span><div><span class="label">Reclutadora · Disney Cultural Exchange</span><div class="q" style="font-size:26px">${esc(q.q)}</div><button class="linkb" id="iv-es">Ver en español</button><p class="muted" id="iv-qes" hidden style="margin:4px 0 0">${esc(q.q_es)} · 💡 ${esc(q.tip)}</p></div></div>
    <div class="iv-timer"><div class="bar"><i id="iv-bar" style="width:100%"></i></div><span id="iv-sec" class="mono">90 s</span></div>
    ${canVoice ? `<div style="display:flex;justify-content:center;gap:12px;align-items:center"><button class="recbtn" id="iv-rec"><span>🎙</span></button><div class="muted" id="iv-hint">Toca para empezar a hablar y otra vez para terminar</div></div>` : ""}
    <textarea id="iv-in" placeholder="${canVoice ? "Aquí aparece lo que dijiste (puedes corregirlo o escribir)" : "Escribe tu respuesta en inglés"}" style="min-height:140px"></textarea>
    <div style="display:flex;justify-content:space-between;gap:10px"><button class="btn" data-say="${esc(q.q)}">🔊 Repetir pregunta</button><button class="btn primary big" id="iv-next">${IV.i + 1 < INTERVIEW.length ? "Siguiente pregunta →" : "Terminar y ver reporte"}</button></div>
  </div></div>`;
  setTimeout(() => speak(q.q, 0.95), 300);
  $("#iv-es").onclick = () => ($("#iv-qes").hidden = !$("#iv-qes").hidden);
  const timer = setInterval(() => {
    if (!$("#iv-sec")) return clearInterval(timer);
    const left = Math.max(0, 90 - (Date.now() - IV.t0) / 1000);
    $("#iv-sec").textContent = Math.ceil(left) + " s"; $("#iv-bar").style.width = left / 90 * 100 + "%";
    $("#iv-bar").classList.toggle("warn", left < 20);
    if (left <= 0) { clearInterval(timer); if (Voice.recording) Voice.recording.finish(); }
  }, 250);
  const rb = $("#iv-rec");
  if (rb) rb.onclick = async () => {
    if (Voice.recording) { Voice.recording.finish(); return; }
    Voice.stop(); rb.classList.add("rec"); $("#iv-hint").textContent = "Grabando… toca para terminar";
    const audio = await Voice.record({ vad: false, maxMs: 90000, onLevel: (l) => (rb.style.boxShadow = `0 0 0 ${Math.min(26, l * 300)}px rgba(62,214,155,.25)`) });
    rb.classList.remove("rec"); rb.style.boxShadow = "";
    if (!audio || !audio.length) { $("#iv-hint").textContent = "No escuché nada"; return; }
    $("#iv-hint").textContent = "Transcribiendo…";
    try { const t = await Voice.transcribe(audio); const ta = $("#iv-in"); if (ta) ta.value = (ta.value ? ta.value + " " : "") + t; $("#iv-hint").textContent = "Listo. Puedes grabar más o seguir."; IV.secs = (IV.secs || 0) + audio.length / 16000; }
    catch { $("#iv-hint").textContent = "No pude transcribir. Escribe tu respuesta."; }
  };
  $("#iv-next").onclick = () => {
    clearInterval(timer); if (Voice.recording) Voice.recording.cancel();
    IV.ans.push({ q: q.q, a: $("#iv-in").value.trim(), secs: Math.round((Date.now() - IV.t0) / 1000) });
    IV.i++;
    if (IV.i < INTERVIEW.length) ivQuestion(); else ivReport();
  };
}
// Offline score: length, the question's key ideas and some past-tense examples.
function ivHeuristic(item, a) {
  const words = a.split(/\s+/).filter(Boolean).length, low = a.toLowerCase();
  const kw = item.keywords.filter((k) => low.includes(k.toLowerCase()));
  const past = (low.match(/\b(\w+ed|was|were|did|had|went|made|took|helped)\b/g) || []).length;
  let score = 1 + Math.min(2, words / 30) + Math.min(1.5, kw.length * 0.5) + (past ? 0.5 : 0);
  if (words < 8) score = Math.min(score, 1.5);
  const mejora = words < 30 ? "Habla un poco más: intenta 3 o 4 frases con un ejemplo concreto." : kw.length < 2 ? "Incluye ideas clave como: " + item.keywords.slice(0, 4).join(", ") + "." : "Buena respuesta. Agrega un ejemplo real de tu vida para que sea memorable.";
  return { puntaje: Math.max(1, Math.min(5, Math.round(score * 2) / 2)), bien: kw.length ? "Usaste ideas clave: " + kw.join(", ") + "." : words >= 20 ? "Respondiste con varias frases." : "Te atreviste a responder.", mejora, mejor: "" };
}
async function ivReport() {
  $("#main").innerHTML = `<div class="screen" style="max-width:900px"><div class="head"><div><h1>Tu reporte de entrevista</h1><p>Preparando tu evaluación…</p></div></div><div class="card"><span class="muted">Revisando tus 8 respuestas…</span></div></div>`;
  const st = await window.api.getSettings();
  let per = null, resumen = "", total = 0, ai = false;
  if (st.provider !== "none") {
    const res = await window.api.feedback(`You are a friendly but honest recruiter for the Disney International Cultural Exchange Program, evaluating a Spanish-speaking A2-B1 candidate. ${PROFILE}
Answers (from speech recognition or typing):
${IV.ans.map((x, i) => `${i + 1}. Q: ${x.q}\nA: ${x.a || "(no answer)"}`).join("\n\n")}
Return JSON: {"total":1-5 (can be decimal),"resumen":"2 sentences in Spanish: overall impression and the single most important thing to improve","preguntas":[{"puntaje":1-5,"bien":"short Spanish praise","mejora":"short concrete Spanish tip","mejor":"an improved version of THE STUDENT'S OWN answer in natural English, B1 level, max 60 words, keeping their real facts"}]} with exactly ${IV.ans.length} items in order. Score content, clarity, enthusiasm and English.`);
    if (res.ok && Array.isArray(res.data.preguntas)) { per = res.data.preguntas; resumen = res.data.resumen || ""; total = +res.data.total || 0; ai = true; }
  }
  if (!per) { per = IV.ans.map((x, i) => ivHeuristic(INTERVIEW[i], x.a)); total = per.reduce((a, b) => a + b.puntaje, 0) / per.length; resumen = "Evaluación sin IA: mide qué tan completas son tus respuestas y si usas las ideas clave. Con Ollama o Claude recibes corrección de gramática y una versión mejorada de cada respuesta."; }
  total = Math.round(total * 10) / 10;
  S.interviews = (S.interviews || []).concat([{ date: TODAY, score: total }]);
  addMin(15); addXP(60, "Entrevista Disney"); if (total >= 4) confetti();
  const stars = (n) => `<span class="stars">${"★".repeat(Math.round(n))}<span class="off">${"★".repeat(5 - Math.round(n))}</span></span>`;
  $("#main").innerHTML = `<div class="screen" style="max-width:900px">
    <div class="head"><div><h1>Tu reporte de entrevista</h1><p>${ai ? "Evaluado por tu cerebro de IA" : "Evaluación rápida sin IA"} · ${TODAY}</p></div><div style="display:flex;gap:8px"><button class="btn primary" id="iv-again">↻ Repetir entrevista</button></div></div>
    <div class="hero iv-hero"><div><span class="label">Resultado general</span><h2>${stars(total)} ${total}/5</h2><p class="muted" style="margin:6px 0 0">${esc(resumen)}</p></div><div class="big-e">${total >= 4 ? "🏰" : total >= 3 ? "🎢" : "🎟️"}</div></div>
    ${IV.ans.map((x, i) => { const p = per[i] || {}, q = INTERVIEW[i]; return `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><h3>${i + 1}. ${esc(q.q)}</h3>${stars(p.puntaje || 1)}</div>
      <div class="ivans"><span class="label">Tu respuesta</span><p>${esc(x.a || "(sin respuesta)")}</p></div>
      <p style="margin:0">✅ ${esc(p.bien || "")}<br>💡 ${esc(p.mejora || "")}</p>
      ${p.mejor ? `<div class="ivbetter"><span class="label">Tu respuesta, mejorada</span><p>${esc(p.mejor)}</p><button class="btn" data-say="${esc(p.mejor)}">🔊 Escuchar</button></div>` : ""}
      <details><summary class="label">Respuesta modelo</summary><p>${esc(q.model)}</p><button class="btn" data-say="${esc(q.model)}">🔊 Escuchar</button></details></div>`; }).join("")}
  </div>`;
  $("#iv-again").onclick = () => { IV = { i: 0, ans: [] }; ivQuestion(); };
}

// Shown after the last sentence of a group: average score and the option to repeat it.
function pronDone(items, sets) {
  const sc = Object.values(PR.scores || {}), avg = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null;
  const weak = items.filter((_, i) => (PR.scores || {})[i] != null && PR.scores[i] < 80);
  const idx = sets.findIndex((x) => x.id === PR.set), next = sets[idx + 1];
  setTimeout(() => { sfx("win"); if (avg >= 80) confetti(); }, 100);
  return `<div class="card pron-main done-screen" style="justify-content:center">
    <div class="big">🏁</div><h1>¡Terminaste ${PR.set === "week" ? "las frases de la semana" : "este grupo"}!</h1>
    <p class="muted" style="margin:0">${avg == null ? "Escuchaste todas las frases." : `Dijiste ${sc.length} de ${items.length} frases. Promedio: <b style="color:var(--ink)">${avg}%</b>`}</p>
    ${weak.length ? `<div><span class="label">Para repetir</span><div class="chips" style="justify-content:center">${weak.map((w) => `<button class="chip" data-say="${esc(w)}">🔊 ${esc(w)}</button>`).join("")}</div></div>` : ""}
    <p style="font-size:18px;margin:0">¿Las quieres repetir?</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn gold big" id="p-again">🔁 Sí, repetirlas</button>${next ? `<button class="btn big" id="p-nextset" data-set="${next.id}">Siguiente grupo: ${esc(next.t)}</button>` : ""}</div>
  </div>`;
}
