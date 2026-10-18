/* ---------- 🧭 Coach: Max remembers earlier sessions, adapts to how you're doing, and reports at the end ---------- */
const ANGLES = [
  "something that happened to the student recently (yesterday, last weekend)",
  "a plan or wish for the future (next month, next year, working at Disney)",
  "an opinion: ask what they prefer and why",
  "a comparison (Colombia and the USA, then and now, a city and a small town)",
  "a hypothetical: \"what would you do if…\"",
  "a short story: ask them to tell what happened step by step",
  "describing a place, a person or an object in detail",
  "habits and routines, and how often they do things",
  "food, music, sports or free time",
  "engineering studies: projects, classes and what they want to build",
  "a problem that went wrong and how they solved it",
  "teaching Max something about Colombia (Ocaña, Bucaramanga, food, customs)",
];
let ANGLE = "";
function newAngle() {
  const used = new Set(((S.coach || {}).sessions || []).slice(0, 4).map((x) => x.angle));
  const pool = ANGLES.filter((a) => !used.has(a)), l = pool.length ? pool : ANGLES;
  return (ANGLE = l[Math.floor(Math.random() * l.length)]);
}
const dayDiff = (d) => Math.round((new Date(TODAY) - new Date(d)) / 864e5);
const daysAgoTxt = (d) => { const n = dayDiff(d); return n <= 0 ? "earlier today" : n === 1 ? "yesterday" : n + " days ago"; };
function avgScores(list) {
  const ks = ["fluidez", "gramatica", "vocabulario"], out = {};
  ks.forEach((k) => { const v = list.map((x) => +x[k]).filter((x) => x > 0); out[k] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; });
  out.all = (out.fluidez + out.gramatica + out.vocabulario) / 3;
  return out;
}
// Everything Max should remember, added to his instructions in calls and chats.
function coachBrief() {
  const ss = (S.coach || {}).sessions || [], L = [];
  if (ANGLE) L.push(`Fresh angle for THIS session (move the conversation toward it after the first exchange): ${ANGLE}.`);
  if (ss.length) {
    const topics = [...new Set(ss.flatMap((x) => x.topics || []))].slice(0, 10);
    const asked = [...new Set(ss.flatMap((x) => x.asked || []))].slice(0, 28);
    if (topics.length) L.push(`Topics already covered in earlier sessions (don't go back over them; build on them or move to something new): ${topics.join("; ")}.`);
    if (asked.length) L.push(`Questions you already asked before. NEVER ask these or close variations again: ${asked.map((q) => `"${q}"`).join(" ")}`);
    const last = ss[0];
    L.push(`The last session was ${daysAgoTxt(last.date)} (${last.title}).${last.foco ? ` Its main thing to practice was: ${String(last.foco).replace(/[.\s]+$/, "")}.` : ""} You may mention it in one short phrase if it feels natural.`);
  }
  const weak = (S.errors || []).filter((e) => e && e.mal && e.bien).slice(0, 4);
  if (weak.length) L.push(`The student's recent mistakes (create chances to use the right form, without lecturing): ${weak.map((e) => `"${e.mal}" → "${e.bien}"`).join("; ")}.`);
  const ps = (S.scores || []).slice(-3);
  if (ps.length) {
    const a = avgScores(ps).all;
    L.push(a >= 4 ? `The student is doing well (average ${a.toFixed(1)}/5): sound a bit more natural, ask "why" and "how" questions, use past and future, and slip in one new useful word or phrase per turn.`
      : a <= 2.5 ? `The student is struggling (average ${a.toFixed(1)}/5): keep sentences very short with common words, and use yes/no or either/or questions first.`
        : `The student is at a steady A2 (average ${a.toFixed(1)}/5): keep it simple but stretch them a little each turn.`);
  }
  return L.length ? "\nWhat you know about this student:\n- " + L.join("\n- ") : "";
}
function questionsFrom(hist) {
  const out = [];
  for (const m of hist) if (m.role === "assistant") for (const q of (m.content.match(/[^.!?]*\?/g) || [])) { const t = q.trim(); if (t.length > 8 && t.length < 120 && !out.includes(t)) out.push(t); }
  return out.slice(0, 8);
}
function coachSession(kind, scen, hist) {
  S.coach = S.coach || { sessions: [] };
  const s = { id: Date.now(), date: TODAY, kind, scen, title: (SCEN.find((x) => x.id === scen) || {}).t || scen, angle: ANGLE, asked: questionsFrom(hist), topics: [] };
  S.coach.sessions.unshift(s); S.coach.sessions = S.coach.sessions.slice(0, 14); save();
  return s;
}
function coachFinish(s, r, p) {
  if (!s) return;
  const x = r.resumen || {};
  s.topics = (Array.isArray(x.temas) ? x.temas : []).slice(0, 4).map(String);
  s.foco = x.foco ? String(x.foco) : ""; s.fuerte = x.fuerte ? String(x.fuerte) : ""; s.nivel = x.nivel ? String(x.nivel) : "";
  s.scores = p; save();
}
// The JSON the teacher returns, shared by calls and chats.
const COACH_JSON = `Return JSON: {"bien":"one sentence in Spanish about what they did well","errores":[{"mal":"exact wrong phrase","bien":"corrected English","porque":"very short reason in Spanish"}],"frases":["3 useful natural English phrases for this topic"],"puntajes":{"fluidez":1-5,"gramatica":1-5,"vocabulario":1-5},"consejo":"one concrete tip in Spanish","resumen":{"temas":["2 to 4 topics they talked about, in English, 2-4 words each"],"fuerte":"in Spanish, what they do best now","foco":"in Spanish, the ONE thing to practice in the next session","nivel":"estimated CEFR level such as A1+, A2, A2+, B1-"}}. Only real grammar or word-choice errors, 3 to 5 max. Scores are integers.`;
function transcriptOf(hist) { return hist.map((m) => (m.role === "assistant" ? "Max: " : "Student: ") + m.content).join("\n"); }

// The end-of-session results screen, with how you did compared to your last sessions.
function sessionReport({ r, p, prev, said, secs, newWords, xp, again }) {
  const x = r.resumen || {}, words = said.join(" ").split(/\s+/).filter(Boolean).length;
  const now = avgScores([p]).all, was = prev && prev.all ? prev.all : 0, d = was ? now - was : 0;
  const head = !was ? "¡Primera medición guardada! 🎯" : d > 0.2 ? "¡Vas mejorando! 📈" : d < -0.2 ? "Hoy costó más, así se aprende 💪" : "Buen ritmo, sigue así 👏";
  const delta = (k) => { if (!prev || !prev[k]) return `<small class="dl">nuevo</small>`; const v = +p[k] - prev[k]; return `<small class="dl ${v > 0.15 ? "up" : v < -0.15 ? "down" : ""}">${v > 0.15 ? "▲ +" + v.toFixed(1) : v < -0.15 ? "▼ " + v.toFixed(1) : "= igual"}</small>`; };
  const nE = (r.errores || []).length;
  return `<div class="rep">
    <div class="rep-top"><div><span class="label">Resultados de tu sesión</span><h2>${head}</h2><p>${esc(r.bien || "")}</p></div>${x.nivel ? `<div class="rep-level"><span class="label">Nivel estimado</span><b>${esc(x.nivel)}</b></div>` : ""}</div>
    <div class="rep-stats"><span>⏱ ${fmtTime(secs)}</span><span>🗣 ${words} palabras dichas</span>${nE ? `<span>🧠 ${nE} ${nE === 1 ? "error guardado" : "errores guardados"}</span>` : ""}${newWords ? `<span>📒 ${newWords} ${newWords === 1 ? "palabra nueva" : "palabras nuevas"}</span>` : ""}${xp ? `<span>✨ +${xp} XP</span>` : ""}</div>
    <div class="scores3">${[["Fluidez", "fluidez"], ["Gramática", "gramatica"], ["Vocabulario", "vocabulario"]].map(([t, k]) => `<div><span class="label">${t}</span><b>${esc(p[k] || "–")}<small>/5</small></b>${delta(k)}</div>`).join("")}</div>
    ${nE ? `<div class="card" style="padding:0;background:none;border:0"><span class="label">Tus errores de hoy</span>${errTable(r.errores)}<p class="muted" style="margin:6px 0 0">🧠 Ya están en <button class="btn" data-nav="cards" data-arg="err" style="padding:2px 10px">Mis errores</button> para repasarlos.</p></div>` : ""}
    <div class="rep-two">
      ${x.fuerte ? `<div class="rep-box good"><span class="label">Lo que mejor haces</span><p>${esc(x.fuerte)}</p></div>` : ""}
      ${x.foco ? `<div class="rep-box focus"><span class="label">Para tu próxima sesión</span><p>${esc(x.foco)}</p></div>` : ""}
    </div>
    <span class="label">Frases para tu próxima vez</span><div class="chips">${(r.frases || []).map((f) => `<button class="chip" data-say="${esc(f)}">🔊 ${esc(f)}</button>`).join("")}</div>
    ${r.consejo ? `<p style="margin:0"><strong>Consejo:</strong> ${esc(r.consejo)}</p>` : ""}
    <div style="display:flex;gap:8px;flex-wrap:wrap">${again || ""}<button class="btn" data-nav="progress">📈 Ver mi progreso</button></div>
  </div>`;
}

// "Lo que Max sabe de ti", shown in Progress.
function coachCard() {
  const ss = ((S.coach || {}).sessions || []).filter((x) => x.scores);
  if (!ss.length) return `<div class="card"><h3>Lo que Max sabe de ti</h3><p class="muted" style="margin:0">Después de tu primera llamada o conversación, Max empieza a recordar de qué hablaron, qué te cuesta y cómo vas mejorando. Cada sesión nueva es distinta a la anterior.</p></div>`;
  const last = ss[0], topics = [...new Set(ss.flatMap((x) => x.topics || []))].slice(0, 12);
  const rows = ss.slice(0, 8).map((x) => { const a = avgScores([x.scores]).all; return `<div class="trow"><span>${esc(x.date.slice(5))} · ${esc(x.title)}</span><div class="bar"><i style="width:${Math.round(a / 5 * 100)}%"></i></div><b>${a.toFixed(1)}</b></div>`; }).join("");
  return `<div class="card"><h3>Lo que Max sabe de ti</h3>
    <div class="rep-stats">${last.nivel ? `<span>📊 Nivel estimado: <b>${esc(last.nivel)}</b></span>` : ""}<span>🗓 ${(S.coach.sessions || []).length === 1 ? "1 sesión recordada" : (S.coach.sessions || []).length + " sesiones recordadas"}</span></div>
    ${last.foco ? `<div class="rep-box focus"><span class="label">Tu foco ahora</span><p>${esc(last.foco)}</p></div>` : ""}
    <span class="label">Tu promedio por sesión (de 5)</span>${rows}
    ${topics.length ? `<span class="label">De qué ya hablaron</span><div class="chips">${topics.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>` : ""}</div>`;
}

/* ---------- Corrección al momento: after each thing the student says, a quick check while they think ---------- */
async function liveFix(text) {
  text = (text || "").trim();
  if (text.split(/\s+/).length < 3 || /^how do you say/i.test(text)) return null;
  const st = await window.api.getSettings(); if (st.provider === "none") return null;
  const r = await window.api.feedback(`A Spanish-speaking A2 English student from Colombia said: "${text}". It is a speech-recognition or typed line, so ignore punctuation and capital letters. If it has a real grammar or word-choice mistake, return {"ok":false,"mejor":"the corrected, natural English sentence","porque":"very short reason in Spanish"}. If it is correct or just a small style difference, return {"ok":true}.`);
  if (!r.ok || !r.data || r.data.ok !== false || !r.data.mejor) return null;
  if (normEn(r.data.mejor) === normEn(text)) return null;
  const f = { mal: text, bien: String(r.data.mejor), porque: String(r.data.porque || "") };
  S.errors = mergeErr([f], S.errors); S.liveFixes = (S.liveFixes || 0) + 1; save();
  return f;
}
const fixHtml = (f) => `<div class="fix"><div>💡 Mejor: <b>${esc(f.bien)}</b>${f.porque ? `<small>${esc(f.porque)}</small>` : ""}</div><button class="btn ghost" data-say="${esc(f.bien)}" title="Escuchar">🔊</button></div>`;
