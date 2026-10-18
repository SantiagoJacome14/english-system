/* ---------- 🎓 Clases de inglés: 30 clases desde lo básico, con explicación, vocabulario, ejercicios y práctica de voz ---------- */
const clsOf = (n) => COURSE.find((c) => c.n === n);
function cState() { return (S.course = S.course || { start: TODAY, done: {} }); }
const courseDone = () => Object.keys(cState().done).length;
const nextClass = () => COURSE.find((c) => !cState().done[c.n]) || null;
function clsDate(n) { const d = new Date(cState().start + "T12:00:00"); d.setDate(d.getDate() + n - 1); return d; }
const clsDateTxt = (n) => { const d = clsDate(n); return `${DAYS[dow(d)].slice(0, 3)} ${d.getDate()} ${MON[d.getMonth()]}`; };

// Card for the home screen: today's class.
function classCard() {
  if (typeof COURSE === "undefined" || !COURSE.length) return "";
  const c = nextClass(), done = courseDone();
  if (!c) return `<div class="card clshome"><span class="e">🎓</span><div><span class="label">Curso básico</span><b>¡Terminaste las ${COURSE.length} clases!</b><small>Repasa cuando quieras desde Clases.</small></div><button class="btn" data-nav="course">Ver clases</button></div>`;
  return `<div class="card clshome"><span class="e">${c.emoji}</span><div><span class="label">Tu clase · ${done} de ${COURSE.length} terminadas</span><b>Clase ${c.n}: ${esc(c.title)}</b><small>${c.minutes} min · ${esc(c.goal.replace(/^Al final de esta clase podrás /, "Aprenderás a "))}</small></div><button class="btn gold" data-nav="course" data-arg="${c.n}">▶ ${done ? "Seguir" : "Empezar"}</button></div>`;
}

VIEWS.course = (arg) => { const n = parseInt(arg); if (n && clsOf(n)) return openClass(n); renderCourseList(); };

function renderCourseList() {
  const st = cState(), done = courseDone(), nx = nextClass(), blocks = [...new Set(COURSE.map((c) => c.block))];
  $("#main").innerHTML = `<div class="screen">
    <div class="head"><div><h1>Clases de inglés</h1><p>Un curso paso a paso, desde lo más básico hasta poder conversar. Cada clase dura unos 25 minutos: explicación, vocabulario, ejercicios y práctica de voz. Sugerimos una por día.</p></div><span class="pill gold">${done} / ${COURSE.length}</span></div>
    <div class="card"><div class="bar"><i style="width:${Math.round(done / COURSE.length * 100)}%"></i></div></div>
    ${nx ? `<div class="card clshome big"><span class="e">${nx.emoji}</span><div><span class="label">${done ? "Sigue con" : "Empieza por aquí"} · sugerida para el ${clsDateTxt(nx.n)}</span><b>Clase ${nx.n}: ${esc(nx.title)}</b><small>${esc(nx.goal)}</small></div><button class="btn gold big" data-nav="course" data-arg="${nx.n}">▶ ${done ? "Continuar" : "Empezar"}</button></div>` : ""}
    ${blocks.map((b) => `<div class="card"><span class="label">${esc(b)}</span><div class="clgrid">${COURSE.filter((c) => c.block === b).map((c) => { const d = st.done[c.n]; return `<button class="clc ${d ? "done" : ""} ${nx && nx.n === c.n ? "next" : ""}" data-nav="course" data-arg="${c.n}"><span class="no">${c.n}</span><span class="e">${c.emoji}</span><div><b>${esc(c.title)}</b><small>${c.minutes} min · ${clsDateTxt(c.n)}</small></div><span class="stt">${d ? "✓ " + d.best + "%" : nx && nx.n === c.n ? "Siguiente" : ""}</span></button>`; }).join("")}</div></div>`).join("")}
  </div>`;
}

/* ---------- One class ---------- */
let CL = null;
const CTABS = [["learn", "📖 Aprende"], ["vocab", "🔤 Vocabulario"], ["ex", "🗣️ Ejemplos"], ["practice", "✏️ Practica"], ["speak", "🎙️ Habla"]];
function openClass(n, tab = "learn") {
  CL = { n, c: clsOf(n), tab, ex: null };
  onLeave = () => { CL = null; Voice.stop(); };
  renderClass();
}
function renderClass() {
  const { c, tab } = CL, done = cState().done[c.n];
  $("#main").innerHTML = `<div class="screen" style="max-width:980px">
    <div class="head"><div><button class="btn ghost" data-nav="course" style="padding:2px 10px;margin-bottom:6px">← Todas las clases</button><h1>${c.emoji} Clase ${c.n}: ${esc(c.title)}</h1><p>${esc(c.goal)}</p></div>${done ? `<span class="pill ok">✓ Terminada · ${done.best}%</span>` : `<span class="pill">${c.minutes} min</span>`}</div>
    <div class="tabs cltabs">${CTABS.map(([k, t]) => `<button class="tab" data-ctab="${k}" aria-pressed="${k === tab}">${t}</button>`).join("")}</div>
    <div id="cl-body"></div>
  </div>`;
  document.querySelectorAll("[data-ctab]").forEach((b) => (b.onclick = () => { Voice.stop(); CL.tab = b.dataset.ctab; renderClass(); $("#main").scrollTop = 0; }));
  ({ learn: tabLearn, vocab: tabVocab, ex: tabExamples, practice: tabPractice, speak: tabSpeak })[tab]();
}
const nextTab = (k, label) => `<div style="display:flex;justify-content:flex-end"><button class="btn primary" data-ctab-go="${k}">${label} →</button></div>`;
function bindNext() { document.querySelectorAll("[data-ctab-go]").forEach((b) => (b.onclick = () => { CL.tab = b.dataset.ctabGo; renderClass(); $("#main").scrollTop = 0; })); }

function tabLearn() {
  const c = CL.c;
  $("#cl-body").innerHTML = c.sections.map((s) => `<div class="card cls">
    <h3>${esc(s.h)}</h3>
    ${s.body ? mdBlock(s.body) : ""}
    ${s.list ? `<ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px">${s.list.map((x) => `<li>${md(x)}</li>`).join("")}</ul>` : ""}
    ${s.table ? `<div style="overflow-x:auto"><table class="ctab" data-lk><thead><tr>${s.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows.map((r) => `<tr>${r.map((x, i) => `<td>${i === 0 ? "<b>" + md(x) + "</b>" : md(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}
    ${s.note ? `<p class="cnote">💡 ${md(s.note)}</p>` : ""}
  </div>`).join("") + `<div class="card tipc"><span class="label">Consejo</span><p style="margin:0">${md(c.tip)}</p></div><p class="muted" style="margin:0;font-size:13px">Toca cualquier palabra en inglés para ver qué significa y cómo cambia.</p>${nextTab("vocab", "Vocabulario")}`;
  bindNext();
}

function saveClassVocab(c) {
  S.vocab = S.vocab || []; let n = 0;
  for (const v of c.vocab) { if (S.vocab.some((x) => (x.en || "").toLowerCase() === v.en.toLowerCase())) continue; S.vocab.unshift({ es: v.es, en: v.en, ex: v.ex, pos: "", forms: null, src: "en", d: TODAY, n: 1 }); n++; }
  save(); return n;
}
function tabVocab() {
  const c = CL.c;
  $("#cl-body").innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span class="label">${c.vocab.length} palabras de esta clase</span><button class="btn gold" id="cv-save">＋ Guardar todas en Mis palabras</button></div>
    <div class="vlist">${c.vocab.map((v) => `<div class="vrow"><div><b style="color:var(--gold)" data-lk>${esc(v.en)}</b> <span class="muted">→</span> <b>${esc(v.es)}</b><small data-lk>${esc(v.ex)}</small></div><button class="btn" data-say="${esc(v.en)}" title="Escuchar">🔊</button><button class="btn ghost" data-say="${esc(v.ex)}" title="Escuchar la frase">🔊 frase</button></div>`).join("")}</div></div>
    ${nextTab("ex", "Ejemplos")}`;
  $("#cv-save").onclick = () => { const n = saveClassVocab(c); toast(n ? `📒 Guardé ${n} palabras para repasar` : "Ya las tenías guardadas"); $("#cv-save").disabled = true; $("#cv-save").textContent = "✓ Guardadas en Mis palabras"; };
  bindNext();
}

let clPlay = 0;
function tabExamples() {
  const c = CL.c;
  $("#cl-body").innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span class="label">Escucha y repite en voz alta</span><div style="display:flex;gap:8px"><button class="btn" id="ce-es">Ocultar traducción</button><button class="btn gold" id="ce-all">▶ Escuchar todas</button></div></div>
    <div class="vlist">${c.examples.map((x, i) => `<div class="vrow"><div><span data-lk>${esc(x.en)}</span><small class="ces">${esc(x.es)}</small></div><button class="btn" data-say="${esc(x.en)}">🔊</button></div>`).join("")}</div></div>
    ${nextTab("practice", "Practicar")}`;
  $("#ce-es").onclick = () => { const h = document.body.classList.toggle("hide-es"); $("#ce-es").textContent = h ? "Mostrar traducción" : "Ocultar traducción"; };
  $("#ce-all").onclick = async () => {
    const my = ++clPlay; $("#ce-all").disabled = true;
    for (const x of c.examples) { if (my !== clPlay || !CL) break; await Voice.say(x.en, { rate: 0.92, wait: true }); await sleep(500); }
    const b = $("#ce-all"); if (b) b.disabled = false;
  };
  bindNext();
}

/* ---------- Exercises ---------- */
const CONTR = [["i'm", "i am"], ["you're", "you are"], ["he's", "he is"], ["she's", "she is"], ["it's", "it is"], ["we're", "we are"], ["they're", "they are"], ["that's", "that is"], ["there's", "there is"], ["what's", "what is"], ["where's", "where is"], ["who's", "who is"], ["how's", "how is"], ["isn't", "is not"], ["aren't", "are not"], ["wasn't", "was not"], ["weren't", "were not"], ["don't", "do not"], ["doesn't", "does not"], ["didn't", "did not"], ["can't", "cannot"], ["won't", "will not"], ["haven't", "have not"], ["hasn't", "has not"], ["i'll", "i will"], ["you'll", "you will"], ["he'll", "he will"], ["she'll", "she will"], ["we'll", "we will"], ["they'll", "they will"], ["i've", "i have"], ["you've", "you have"], ["we've", "we have"], ["they've", "they have"], ["i'd", "i would"], ["let's", "let us"], ["can not", "cannot"]];
function normEn(s) {
  s = String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?;:"“”]/g, " ").replace(/\s+/g, " ").trim();
  for (const [a, b] of CONTR) s = s.replace(new RegExp("(^| )" + a.replace("'", "'") + "(?= |$)", "g"), "$1" + b);
  return s.replace(/\s+/g, " ").trim();
}
const sameEn = (user, acc) => acc.some((a) => normEn(a) === normEn(user));

function tabPractice() {
  const c = CL.c;
  if (!CL.ex) {
    const best = (cState().done[c.n] || {}).best;
    $("#cl-body").innerHTML = `<div class="card done-screen" style="padding:40px 20px"><div class="big" style="font-size:54px">✏️</div><h2>${c.exercises.length} ejercicios</h2><p class="muted">Elige la respuesta, completa frases, ordena palabras y traduce. Necesitas 60% para terminar la clase.${best ? ` Tu mejor resultado: ${best}%.` : ""}</p><button class="btn gold big" id="cx-start">Empezar</button></div>`;
    $("#cx-start").onclick = () => { CL.ex = { list: c.exercises.map((_, i) => i), i: 0, ok: [], wrong: [], answered: false, built: [] }; renderEx(); };
    return;
  }
  renderEx();
}
function renderEx() {
  const c = CL.c, E = CL.ex;
  if (E.i >= E.list.length) return exSummary();
  const idx = E.list[E.i], q = c.exercises[idx], pct = Math.round(E.i / E.list.length * 100);
  let body = "";
  if (q.type === "choice") body = `<p class="exq" data-lk>${esc(q.q)}</p><div class="opts">${q.options.map((o, i) => `<button class="opt" data-opt="${i}">${esc(o)}</button>`).join("")}</div>`;
  else if (q.type === "fill") body = `<p class="exq" data-lk>${esc(q.q).replace("___", '<span class="blank">_____</span>')}</p><div class="exin"><input id="ex-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escribe la palabra que falta"><button class="btn primary" id="ex-ok">Comprobar</button></div>`;
  else if (q.type === "translate") body = `<p class="exq">Traduce al inglés:</p><p class="exq es">${esc(q.es)}</p><div class="exin"><input id="ex-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escribe en inglés"><button class="btn primary" id="ex-ok">Comprobar</button></div>`;
  else body = `<p class="exq">Ordena las palabras${q.es ? ": <span class='es'>" + esc(q.es) + "</span>" : ""}</p><div class="built" id="ex-built"></div><div class="chips" id="ex-chips">${q.words.map((w, i) => `<button class="chip wchip" data-w="${i}">${esc(w)}</button>`).join("")}</div><div style="display:flex;gap:8px"><button class="btn" id="ex-clear">Borrar</button><button class="btn primary" id="ex-ok">Comprobar</button></div>`;
  $("#cl-body").innerHTML = `<div class="card exc"><div class="exh"><span class="label">Ejercicio ${E.i + 1} de ${E.list.length}</span><span class="pill">${E.ok.length} bien</span></div><div class="bar"><i style="width:${pct}%"></i></div>${body}<div id="ex-fb"></div></div>`;
  E.answered = false; E.built = [];
  const finish = (good, userAns, correctText) => {
    if (E.answered) return; E.answered = true;
    if (good) { sfx("ok"); if (!E.wrong.includes(idx)) E.ok.push(idx); } else {
      sfx("bad"); if (!E.wrong.includes(idx)) E.wrong.push(idx);
      if ((q.type === "fill" || q.type === "translate") && userAns) {
        const bien = q.type === "fill" ? q.q.replace("___", q.answer[0]) : q.answer[0], mal = q.type === "fill" ? q.q.replace("___", userAns) : userAns;
        S.errors = mergeErr([{ mal, bien, porque: q.why || "" }], S.errors); save();
      }
    }
    const fb = $("#ex-fb");
    fb.innerHTML = `<div class="exfb ${good ? "good" : "bad"}"><b>${good ? "¡Correcto! ✓" : "Casi. La respuesta es: " + esc(correctText)}</b>${q.why ? `<p>${md(q.why)}</p>` : ""}<button class="btn primary" id="ex-next">${E.i + 1 >= E.list.length ? "Ver resultado" : "Continuar"} →</button></div>`;
    $("#ex-next").onclick = () => { E.i++; renderEx(); $("#main").scrollTop = 0; };
    setTimeout(() => { const nb = $("#ex-next"); if (nb) nb.focus(); }, 120); // not during the Enter keypress, or it would skip the feedback
    if (q.type !== "choice" || good) { const t = q.type === "choice" ? q.options[q.answer] : q.type === "order" ? q.answer : q.type === "fill" ? q.q.replace("___", q.answer[0]) : q.answer[0]; if (good && q.type !== "choice") speak(t); }
  };
  if (q.type === "choice") document.querySelectorAll("[data-opt]").forEach((b) => (b.onclick = () => {
    if (E.answered) return; const i = +b.dataset.opt, good = i === q.answer;
    document.querySelectorAll("[data-opt]").forEach((x) => { x.disabled = true; if (+x.dataset.opt === q.answer) x.classList.add("right"); });
    if (!good) b.classList.add("wrong"); finish(good, "", q.options[q.answer]);
  }));
  else if (q.type === "order") {
    const draw = () => { $("#ex-built").innerHTML = E.built.map((i) => `<span class="chip on">${esc(q.words[i])}</span>`).join("") || `<span class="muted">Toca las palabras en orden…</span>`; document.querySelectorAll("[data-w]").forEach((x) => (x.disabled = E.built.includes(+x.dataset.w) || E.answered)); };
    document.querySelectorAll("[data-w]").forEach((b) => (b.onclick = () => { if (E.answered) return; E.built.push(+b.dataset.w); sfx("tap"); draw(); }));
    $("#ex-clear").onclick = () => { if (!E.answered) { E.built = []; draw(); } };
    $("#ex-ok").onclick = () => { if (E.built.length < 2) return; const ans = E.built.map((i) => q.words[i]).join(" "); finish(normEn(ans) === normEn(q.answer), ans, q.answer); };
    draw();
  } else {
    const inp = $("#ex-in"); inp.focus();
    const check = () => { const v = inp.value.trim(); if (!v || E.answered) return; inp.disabled = true; finish(sameEn(v, q.answer), v, q.type === "fill" ? q.answer[0] : q.answer[0]); };
    $("#ex-ok").onclick = check; inp.onkeydown = (e) => { if (e.key === "Enter") check(); };
  }
}
function exSummary() {
  const c = CL.c, E = CL.ex, total = E.list.length, first = c.exercises.length;
  const good = c.exercises.length - E.wrong.length, pct = Math.round(good / first * 100);
  const st = cState(), prev = st.done[c.n], passed = pct >= 60;
  let xp = 0, firstTime = false;
  if (passed && !CL.counted) {
    CL.counted = true; firstTime = !prev; xp = firstTime ? 25 + Math.round(pct / 10) * 2 : 8;
    st.done[c.n] = { date: prev ? prev.date : TODAY, best: Math.max(pct, prev ? prev.best : 0) }; addMin(c.minutes); addXP(xp, "Clase " + c.n); save();
    if (firstTime) celebrate("¡Clase " + c.n + " terminada!"); else sfx("win");
    checkAch();
  } else if (!passed) sfx("bad");
  const nx = nextClass();
  $("#cl-body").innerHTML = `<div class="card done-screen" style="padding:36px 20px"><div class="big" style="font-size:54px">${pct === 100 ? "🏆" : passed ? "🎉" : "💪"}</div><h2>${pct}% · ${good} de ${first} bien</h2>
    <p class="muted">${passed ? (xp ? `¡Clase terminada! +${xp} XP.` : "¡Muy bien!") : "Todavía no llegas al 60%. Repite las que fallaste y vuelve a intentarlo."}${E.wrong.length ? " Tus respuestas escritas incorrectas ya están en Mis errores." : ""}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
      ${E.wrong.length ? `<button class="btn gold big" id="cx-retry">🔁 Repetir las que fallé (${E.wrong.length})</button>` : ""}
      ${passed && nx && nx.n !== c.n ? `<button class="btn primary big" data-nav="course" data-arg="${nx.n}">Clase ${nx.n} →</button>` : ""}
      <button class="btn big" id="cx-speak">🎙️ Practicar hablando</button>
      <button class="btn big" data-nav="course">Todas las clases</button></div></div>`;
  const rt = $("#cx-retry"); if (rt) rt.onclick = () => { const w = E.wrong.slice(); CL.ex = { list: w, i: 0, ok: [], wrong: w.slice(), answered: false, built: [], retry: true }; CL.ex.wrong = []; CL.ex.list = w; CL.ex.base = first; renderEx(); };
  $("#cx-speak").onclick = () => { CL.tab = "speak"; renderClass(); };
}

/* ---------- Speaking ---------- */
function tabSpeak() {
  const c = CL.c, gate = voiceGate("practicar tu pronunciación");
  $("#cl-body").innerHTML = `${gate}<div class="card"><span class="label">Escucha cada frase, di la frase en voz alta y mira cómo te fue</span><div class="vlist">${c.speak.map((t, i) => `<div class="vrow" id="sp-${i}"><div><span data-lk class="sptxt">${esc(t)}</span><small class="spres"></small></div><button class="btn" data-say="${esc(t)}" title="Escuchar">🔊</button><button class="btn gold" data-sp="${i}" ${gate ? "disabled" : ""}>🎙️ Decirla</button></div>`).join("")}</div></div>
    <div style="display:flex;justify-content:flex-end"><button class="btn primary" data-nav="course">Terminar la clase</button></div>`;
  document.querySelectorAll("[data-sp]").forEach((b) => (b.onclick = async () => {
    const i = +b.dataset.sp, target = c.speak[i], row = $("#sp-" + i);
    if (Voice.recording) { Voice.recording.finish(); return; }
    Voice.stop(); b.textContent = "⏹ Listo"; row.querySelector(".spres").textContent = "Te escucho…";
    const a = await Voice.record({ vad: true, silenceMs: 1000, maxMs: 15000 });
    b.textContent = "🎙️ Decirla";
    if (!a || a.length < 16000 * 0.4) { row.querySelector(".spres").textContent = "No te escuché. Intenta otra vez."; return; }
    row.querySelector(".spres").textContent = "Revisando…";
    let heard = ""; try { heard = await Voice.transcribe(a); } catch {}
    const r = alignWords(target, heard);
    row.querySelector(".sptxt").innerHTML = r.words.map((w) => `<span class="${w.ok ? "okw" : "badw"}">${esc(w.w)}</span>`).join(" ");
    row.querySelector(".spres").textContent = heard ? `${r.score}% · Te oí: “${heard}”` : "No te entendí. Habla más cerca del micrófono.";
    if (r.score >= 80) { sfx("ok"); S.pronCount = (S.pronCount || 0) + 1; S.pronBest = Math.max(S.pronBest || 0, r.score); addXP(3, "Pronunciación"); checkAch(); } else sfx("bad");
  }));
}
