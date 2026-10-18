/* ---------- Repaso inteligente y plan del día ---------- */
// Cards from the vocabulary of classes the student already finished.
function courseCards() {
  if (typeof COURSE === "undefined") return [];
  const done = cState().done, out = [];
  COURSE.filter((c) => done[c.n]).forEach((c) => (c.vocab || []).forEach((v) => out.push({ id: "cls:" + c.n + ":" + v.en.toLowerCase(), en: v.en, es: v.es + (v.ex ? " · " + v.ex : ""), cls: c.n })));
  return out;
}
const cardTag = (c) => (c.err ? "Un error tuyo" : c.voc ? "Tu palabra" : c.cls ? "Clase " + c.cls : "Frase de la semana");
// Everything that is due, hardest first: cards you failed most, your own mistakes and words, then the most overdue.
function smartCards() {
  const now = Date.now();
  const pool = allCards().concat(errorCards(), vocabCards(), courseCards());
  return pool.filter((c) => { const s = S.cards[c.id]; return !s || s.due <= now; }).map((c) => {
    const s = S.cards[c.id], late = s ? Math.min(10, (now - s.due) / 864e5) : 0;
    return { c, p: (s ? (s.lapses || 0) * 3 : 0.5) + (c.err ? 2 : 0) + (c.voc ? 1.5 : 0) + (c.cls ? 0.5 : 0) + late + Math.random() * 0.4 };
  }).sort((a, b) => b.p - a.p).map((x) => x.c);
}
const smartToday = () => (S.smartDone || {})[TODAY] || 0;
// Today's plan: about an hour, with what to do first and whether it is done.
const DAILY_GOAL = 60;
function dailyPlan() {
  const due = smartCards().length, nc = typeof nextClass === "function" ? nextClass() : null, st = typeof cState === "function" ? cState() : { done: {} };
  const classToday = Object.values(st.done).some((d) => d.date === TODAY), wToday = Object.entries(S.lessons || {}).some(([k, v]) => v.date === TODAY && /-w$/.test(k));
  return [
    { k: "smart", t: "Repaso inteligente", s: due ? `${Math.min(due, 20)} tarjetas · tus puntos débiles primero` : "Todo al día, sin tarjetas pendientes", min: 5, go: "cards", arg: "smart", done: due === 0 || smartToday() >= 10, tag: due === 0 ? "AL DÍA" : null },
    { k: "class", t: nc ? "Clase " + nc.n + ": " + nc.title : "Curso terminado", s: nc ? nc.minutes + " min · " + nc.goal.replace(/^Al final de esta clase podrás /, "Aprenderás a ") : "Repasa cuando quieras", min: nc ? nc.minutes : 0, go: "course", arg: nc ? String(nc.n) : "", done: classToday || !nc },
    { k: "call", t: "Llamada con Max", s: "15 min · habla y recibe corrección al instante", min: 15, go: "call", done: !!(S.chatLog || {})[TODAY] },
    { k: "dict", t: "Dictado", s: "10 min · entrena tu oído", min: 10, go: "listen", done: !!(S.dictLog || {})[TODAY] },
    { k: "write", t: "Misión de escritura", s: "10 min · escribe y corrige", min: 10, go: "path", done: wToday },
  ];
}
function planStats() {
  const mins = S.minutes[TODAY] || 0, days = [...Array(7)].map((_, i) => { const d = new Date(today); d.setDate(d.getDate() - i); return S.minutes[key(d)] || 0; });
  return { mins, pct: Math.min(100, Math.round(mins / DAILY_GOAL * 100)), hit: days.filter((m) => m >= DAILY_GOAL).length, left: Math.max(0, DAILY_GOAL - mins) };
}
