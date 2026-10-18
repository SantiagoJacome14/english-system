/* ---------- Sounds (synthesized, no files) ---------- */
let sfxCtx = null;
function sfx(name, n = 1) {
  if (S.sound === false) return;
  try {
    if (!sfxCtx) sfxCtx = new AudioContext();
    if (sfxCtx.state === "suspended") sfxCtx.resume();
    const t0 = sfxCtx.currentTime;
    const tone = (f, at, dur, type = "sine", vol = 0.18) => {
      const o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0 + at);
      g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g); g.connect(sfxCtx.destination); o.start(t0 + at); o.stop(t0 + at + dur + 0.02);
    };
    if (name === "ok") { tone(660, 0, 0.12, "triangle"); tone(990, 0.08, 0.2, "triangle"); }
    else if (name === "bad") { tone(220, 0, 0.18, "sawtooth", 0.08); tone(165, 0.12, 0.25, "sawtooth", 0.08); }
    else if (name === "tap") tone(520, 0, 0.05, "triangle", 0.08);
    else if (name === "flip") { tone(400, 0, 0.06, "sine", 0.07); tone(600, 0.04, 0.06, "sine", 0.07); }
    else if (name === "tick") tone(1200, 0, 0.03, "square", 0.04);
    else if (name === "combo") { const b = 520 * Math.pow(1.12, Math.min(n, 12)); tone(b, 0, 0.09, "triangle"); tone(b * 1.5, 0.06, 0.16, "triangle"); }
    else if (name === "win") [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.3, "triangle", 0.16));
    else if (name === "ring") [0, 0.5].forEach((at) => { tone(880, at, 0.18, "sine", 0.1); tone(660, at + 0.2, 0.18, "sine", 0.1); });
    else if (name === "hang") { tone(480, 0, 0.12, "sine", 0.12); tone(360, 0.13, 0.2, "sine", 0.12); }
  } catch {}
}

/* ---------- Confetti ---------- */
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas");
  c.className = "confetti"; c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const g = c.getContext("2d"), colors = ["#ffc04d", "#5b8cff", "#3ed69b", "#ff6b7a", "#eaf0ff"];
  const P = [...Array(140)].map(() => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 4, c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * 6, s: Math.random() * 0.3 - 0.15 }));
  const t0 = performance.now();
  (function frame(t) {
    g.clearRect(0, 0, c.width, c.height);
    for (const p of P) { p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.s; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); }
    if (t - t0 < 2200) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

/* ---------- Achievements ---------- */
const ACH = [
  { id: "lesson1", e: "📘", t: "Despegue", d: "Completa tu primera lección", ok: () => Object.keys(S.lessons).length >= 1 },
  { id: "streak3", e: "🔥", t: "En racha", d: "Practica 3 días seguidos", ok: () => streak() >= 3 },
  { id: "streak7", e: "🌟", t: "Semana perfecta", d: "7 días seguidos", ok: () => streak() >= 7 },
  { id: "streak30", e: "☄️", t: "Imparable", d: "30 días seguidos", ok: () => streak() >= 30 },
  { id: "call1", e: "📞", t: "Primera llamada", d: "Termina una llamada en inglés", ok: () => (S.calls || 0) >= 1 },
  { id: "call10", e: "🎙️", t: "Hablador", d: "10 llamadas en inglés", ok: () => (S.calls || 0) >= 10 },
  { id: "speak30", e: "🗣️", t: "Media hora hablando", d: "30 minutos hablando en llamadas", ok: () => (S.speakSec || 0) >= 1800 },
  { id: "pron90", e: "🎯", t: "Pronunciación de oro", d: "Saca 90% o más en pronunciación", ok: () => (S.pronBest || 0) >= 90 },
  { id: "pron50", e: "🎧", t: "Afinando el acento", d: "Practica 50 frases en voz alta", ok: () => (S.pronCount || 0) >= 50 },
  { id: "interview1", e: "🏰", t: "Candidato Disney", d: "Termina el simulador de entrevista", ok: () => (S.interviews || []).length >= 1 },
  { id: "interview4", e: "⭐", t: "Entrevista de 4 estrellas", d: "Saca 4 de 5 o más en la entrevista", ok: () => (S.interviews || []).some((x) => x.score >= 4) },
  { id: "story1", e: "🛬", t: "Aterrizaje en Orlando", d: "Termina el capítulo 1 de la historia", ok: () => !!(S.story || {})[1] },
  { id: "storyAll", e: "🎆", t: "Fin del viaje", d: "Termina los 11 capítulos", ok: () => Object.keys(S.story || {}).length >= 11 },
  { id: "blitz", e: "⚡", t: "Rayo", d: "300 puntos en el Reto relámpago", ok: () => (S.best || {}).blitz >= 300 },
  { id: "combo10", e: "💥", t: "Combo x10", d: "10 respuestas seguidas sin fallar", ok: () => (S.bestCombo || 0) >= 10 },
  { id: "games", e: "🎮", t: "Jugador", d: "Juega los tres minijuegos", ok: () => ["numbers", "pairs", "spell"].every((g) => (S.best || {})[g] != null) },
  { id: "numbers", e: "🔢", t: "Oído de cajero", d: "10 de 10 en ¿Qué número dijo?", ok: () => (S.best || {}).numbers >= 10 },
  { id: "cards100", e: "🃏", t: "100 tarjetas", d: "Repasa 100 tarjetas", ok: () => (S.cardReviews || 0) >= 100 },
  { id: "errors10", e: "🧠", t: "Aprendo de mis errores", d: "Repasa 10 tarjetas de tus errores", ok: () => (S.errReviews || 0) >= 10 },
  { id: "phrases50", e: "📚", t: "50 frases", d: "Aprende 50 frases", ok: () => learned() >= 50 },
  { id: "writer", e: "✍️", t: "Escritor", d: "Completa 5 misiones de escritura", ok: () => Object.keys(S.lessons).filter((k) => /-w$/.test(k)).length >= 5 },
  { id: "piloto", e: "👨‍✈️", t: "Piloto", d: "Llega al rango Piloto (800 XP)", ok: () => S.xp >= 800 },
  { id: "hours10", e: "⏱️", t: "10 horas de vuelo", d: "Practica 10 horas en total", ok: () => Object.values(S.minutes).reduce((a, b) => a + b, 0) >= 600 },
  { id: "cls1", e: "🎓", t: "Primera clase", d: "Termina la clase 1 del curso", ok: () => courseDone() >= 1 },
  { id: "cls10", e: "📚", t: "Diez clases", d: "Termina 10 clases del curso", ok: () => courseDone() >= 10 },
  { id: "cls30", e: "🏅", t: "Graduado del curso básico", d: "Termina las 30 clases", ok: () => typeof COURSE !== "undefined" && courseDone() >= COURSE.length },
  { id: "clsperf", e: "💯", t: "Clase perfecta", d: "100% en una clase", ok: () => Object.values((S.course || {}).done || {}).some((x) => x.best === 100) },
  { id: "owl", e: "🦉", t: "Búho", d: "Practica después de las 10 p. m.", ok: () => !!S.owl },
];
let achQueue = [], achShowing = false;
function checkAch() {
  S.ach = S.ach || {};
  if (new Date().getHours() >= 22) S.owl = true;
  for (const a of ACH) if (!S.ach[a.id] && a.ok()) { S.ach[a.id] = TODAY; achQueue.push(a); }
  save();
  showAch();
}
function showAch() {
  if (achShowing || !achQueue.length) return;
  achShowing = true;
  const a = achQueue.shift();
  const el = document.createElement("div");
  el.className = "ach-pop";
  el.innerHTML = `<span class="ach-e">${a.e}</span><div><span class="label">Logro desbloqueado</span><b>${esc(a.t)}</b><small>${esc(a.d)}</small></div>`;
  document.body.appendChild(el);
  sfx("win"); confetti();
  setTimeout(() => { el.classList.add("out"); setTimeout(() => { el.remove(); achShowing = false; showAch(); }, 400); }, 3200);
}
function celebrate(text) {
  sfx("win"); confetti();
  const el = document.createElement("div");
  el.className = "ach-pop";
  el.innerHTML = `<span class="ach-e">🎉</span><div><b>${esc(text)}</b></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, 2600);
}
