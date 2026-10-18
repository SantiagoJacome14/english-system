/* ---------- ✈️ Story mode: Viaje a Orlando ---------- */
VIEWS.story = () => {
  const done = S.story || {};
  $("#main").innerHTML = `<div class="screen">
    <div class="head"><div><h1>Viaje a Orlando</h1><p>Vive tu intercambio en Disney en 11 capítulos. Cada semana se abre uno nuevo con la gramática que estás aprendiendo.</p></div><span class="pill">${Object.keys(done).length} / ${STORY.length} capítulos</span></div>
    <div class="chapters">${STORY.map((c) => { const w = week(c.n), locked = c.n > CUR, d = done[c.n]; return `<button class="chap ${locked ? "locked" : ""} ${d ? "done" : ""} ${!locked && !d ? "open" : ""}" ${locked ? "disabled" : `data-nav="chapter" data-arg="${c.n}"`}>
      <span class="chap-n">Cap. ${c.n}</span><span class="chap-e">${locked ? "🔒" : c.e}</span><b>${esc(c.t)}</b><small>${locked ? "Se abre el " + opensOn(c.n) : esc(w.gram)}</small>
      ${d ? `<span class="stars">${"★".repeat(d.stars)}<span class="off">${"★".repeat(4 - d.stars)}</span></span>` : ""}</button>`; }).join("")}</div>
  </div>`;
};
let ST = null;
VIEWS.chapter = (n) => {
  const c = STORY.find((x) => x.n === +n);
  if (!c || c.n > CUR) { go("story"); return; }
  ST = { c, i: 0, pick: null, stars: 0, xp: 0, es: false, said: null };
  renderScene();
};
function renderScene() {
  const { c } = ST, sc = c.scenes[ST.i], best = sc.choices.find((x) => x.ok === 2);
  const canVoice = !voiceGate("x");
  $("#main").innerHTML = `<div class="screen"><div class="lesson" style="max-width:820px">
    <div class="ltop"><button class="x" data-nav="story" aria-label="Salir">✕</button><div class="bar"><i style="width:${ST.i / c.scenes.length * 100}%"></i></div><span class="xp">+${ST.xp} XP</span></div>
    ${ST.i === 0 && ST.pick == null ? `<div class="banner">${c.e} <b>Capítulo ${c.n}: ${esc(c.t)}</b> · ${esc(c.intro)}</div>` : ""}
    <div class="scene">
      <span class="label">📍 ${esc(sc.place)}</span>
      <p class="narr">${esc(ST.es ? sc.narr_es : sc.narr)}</p>
      <div class="bubble-row"><span class="avatar big">${sc.avatar}</span><div class="bubble"><b>${esc(sc.who)} <small class="muted">· ${esc(sc.role)}</small></b><p data-lk>${esc(sc.line)}</p>${ST.es ? `<p class="muted" style="margin:0">${esc(sc.line_es)}</p>` : ""}<div style="display:flex;gap:10px"><button class="linkb" data-say="${esc(sc.line)}">🔊 Escuchar</button><button class="linkb" id="st-es">${ST.es ? "Ocultar español" : "Ver en español"}</button></div></div></div>
    </div>
    <span class="label">¿Qué le respondes?</span>
    <div class="opts">${sc.choices.map((ch, i) => { const cls = ST.pick == null ? "" : ch.ok === 2 ? "right" : i === ST.pick ? "wrong" : ""; return `<button class="opt ${cls}" data-stc="${i}" ${ST.pick != null ? "disabled" : ""}><span class="k">${i + 1}</span>${esc(ch.en)}</button>`; }).join("")}</div>
    ${ST.pick != null ? `<div class="feedback ${sc.choices[ST.pick].ok === 2 ? "ok" : "no"}"><div><b>${["Uy, no…", "Casi…", "¡Perfecto! 🎉"][sc.choices[ST.pick].ok]}</b><p>${esc(sc.choices[ST.pick].fb)}${sc.choices[ST.pick].ok !== 2 ? `<br>Mejor: <strong>${esc(best.en)}</strong>` : ""}</p></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${canVoice ? `<button class="btn" id="st-say">${ST.said != null ? `🎙 ${ST.said}%` : "🎙 Dila en voz alta +5"}</button>` : ""}<button class="btn primary big" id="st-next">${ST.i + 1 < c.scenes.length ? "Continuar" : "Terminar capítulo"}</button></div></div>` : ""}
  </div></div>`;
  $("#st-es").onclick = () => { ST.es = !ST.es; renderScene(); };
  document.querySelectorAll("[data-stc]").forEach((b) => (b.onclick = () => pickScene(+b.dataset.stc)));
  const nx = $("#st-next"); if (nx) nx.onclick = nextScene;
  const sy = $("#st-say");
  if (sy) sy.onclick = async () => {
    if (Voice.recording) { Voice.recording.finish(); return; }
    Voice.stop(); sy.textContent = "🔴 Te escucho…";
    const audio = await Voice.record({ vad: true, silenceMs: 1000, maxMs: 12000 });
    if (!audio || !audio.length) { sy.textContent = "🎙 Otra vez"; return; }
    sy.textContent = "…";
    try {
      const a = alignWords(best.en, await Voice.transcribe(audio));
      if (ST.said == null && a.score >= 70) { ST.xp += 5; addXP(5, "¡Lo dijiste bien!"); }
      ST.said = a.score; S.pronCount = (S.pronCount || 0) + 1; S.pronBest = Math.max(S.pronBest || 0, a.score); save();
      sfx(a.score >= 70 ? "ok" : "bad"); renderScene();
    } catch { sy.textContent = "🎙 Otra vez"; }
  };
  if (ST.pick == null) setTimeout(() => speak(sc.line, 0.95), 250);
}
function pickScene(i) {
  if (ST.pick != null) return;
  const sc = ST.c.scenes[ST.i], ch = sc.choices[i];
  ST.pick = i;
  sfx(ch.ok === 2 ? "ok" : "bad");
  if (ch.ok === 2) { ST.stars++; ST.xp += 10; }
  else if (ch.ok === 1) ST.xp += 3;
  else if (ch.ok === 0) { S.errors = mergeErr([{ mal: ch.en, bien: sc.choices.find((x) => x.ok === 2).en, porque: ch.fb }], S.errors); save(); }
  if (ch.ok === 1) { S.errors = mergeErr([{ mal: ch.en, bien: sc.choices.find((x) => x.ok === 2).en, porque: ch.fb }], S.errors); save(); }
  renderScene();
  speak(sc.choices.find((x) => x.ok === 2).en, 0.95);
}
function nextScene() {
  ST.i++; ST.pick = null; ST.said = null;
  if (ST.i < ST.c.scenes.length) { renderScene(); return; }
  const c = ST.c, prev = (S.story || {})[c.n];
  S.story = S.story || {}; S.story[c.n] = { stars: Math.max(ST.stars, prev ? prev.stars : 0), date: TODAY };
  addMin(10); addXP(ST.xp + 30, "Capítulo terminado"); sfx("win"); confetti();
  const next = STORY.find((x) => x.n === c.n + 1);
  $("#main").innerHTML = `<div class="screen done-screen"><div class="big">${c.e}</div><h1>¡Capítulo ${c.n} completo!</h1><p class="muted">${esc(c.t)}</p>
    <div class="stars big">${"★".repeat(ST.stars)}<span class="off">${"★".repeat(4 - ST.stars)}</span></div>
    <p class="muted">${ST.stars === 4 ? "¡Todas las respuestas perfectas a la primera!" : "Repite el capítulo para conseguir las 4 estrellas."}</p>
    <div style="display:flex;gap:10px">${next && next.n <= CUR ? `<button class="btn primary big" data-nav="chapter" data-arg="${next.n}">Capítulo ${next.n} →</button>` : next ? `<span class="pill">El capítulo ${next.n} se abre el ${opensOn(next.n)}</span>` : ""}<button class="btn big" data-nav="story">Ver capítulos</button></div></div>`;
}
document.addEventListener("keydown", (e) => { if (view === "chapter" && ST && /^[1-3]$/.test(e.key) && ST.pick == null && e.target.tagName !== "TEXTAREA") pickScene(+e.key - 1); else if (view === "chapter" && ST && e.key === "Enter" && ST.pick != null) nextScene(); });

/* ---------- 🎮 Games hub ---------- */
VIEWS.games = () => {
  const b = S.best || {};
  $("#main").innerHTML = `<div class="screen">
    <div class="head"><div><h1>Juegos</h1><p>Para los días con poca energía. Todo usa las frases que ya viste.</p></div></div>
    <button class="hero blitz-hero" data-nav="blitz"><div style="text-align:left"><span class="label">60 segundos · combos</span><h2>⚡ Reto relámpago</h2><p class="muted" style="margin:6px 0 0">Responde lo más rápido que puedas. Cada 3 aciertos seguidos multiplicas tus puntos.</p></div><div class="best"><span class="label">Récord</span><b>${b.blitz || 0}</b></div></button>
    <div class="grid g3">
      <button class="qa" data-nav="numbers"><span class="e">🔢</span><b>¿Qué número dijo?</b><small>Precios, horas, años y teléfonos. Récord: ${b.numbers != null ? b.numbers + "/10" : "—"}</small></button>
      <button class="qa" data-nav="pairs"><span class="e">🧩</span><b>Parejas contra reloj</b><small>Une cada frase con su significado. Récord: ${b.pairs != null ? b.pairs + " s" : "—"}</small></button>
      <button class="qa" data-nav="spell"><span class="e">🐝</span><b>Deletreo</b><small>Escucha la palabra y escríbela bien. Récord: ${b.spell != null ? b.spell + "/10" : "—"}</small></button>
    </div>
  </div>`;
};
function setBest(k, v, lowerIsBetter) {
  S.best = S.best || {};
  const old = S.best[k];
  const better = old == null || (lowerIsBetter ? v < old : v > old);
  if (better) S.best[k] = v;
  save();
  return better && old != null;
}

/* ---------- ⚡ Blitz ---------- */
function blitzPool() {
  const pool = [];
  WEEKS.filter((w) => w.n <= CUR).forEach((w) => {
    (EXTRA.grammar[w.n] || []).forEach((q) => pool.push({ q: q.q, sub: "Completa", options: q.options, answer: q.answer }));
    const vs = w.vocab.filter((v) => EXTRA.meanings[v]);
    vs.forEach((v) => {
      const others = shuffle(vs.filter((x) => x !== v)).slice(0, 2);
      const opts = shuffle([v, ...others]);
      if (Math.random() < 0.5) pool.push({ q: v, sub: "¿Qué significa?", options: opts.map((o) => EXTRA.meanings[o]), answer: opts.indexOf(v), say: v });
      else pool.push({ q: EXTRA.meanings[v], sub: "¿Cómo se dice?", options: opts, answer: opts.indexOf(v) });
    });
  });
  S.errors.slice(0, 30).forEach((e) => { if (e.mal && e.bien && norm(e.mal) !== norm(e.bien)) { const o = shuffle([e.bien, e.mal]); pool.push({ q: "¿Cuál está bien?", sub: "Tus errores", options: o, answer: o.indexOf(e.bien) }); } });
  return shuffle(pool);
}
let BZ = null;
VIEWS.blitz = () => {
  $("#main").innerHTML = `<div class="screen done-screen"><div class="big">⚡</div><h1>Reto relámpago</h1><p class="muted">60 segundos. Usa las teclas 1, 2 y 3. Cada 3 aciertos seguidos, tu multiplicador sube.</p><p>Récord: <b>${(S.best || {}).blitz || 0}</b> puntos</p><button class="btn gold big" id="bz-go">¡Empezar!</button></div>`;
  $("#bz-go").onclick = startBlitz;
};
function startBlitz() {
  BZ = { pool: blitzPool(), i: 0, score: 0, combo: 0, maxCombo: 0, right: 0, total: 0, end: Date.now() + 60000, lock: false };
  onLeave = () => { if (BZ) BZ.over = true; };
  renderBlitz();
  const t = setInterval(() => {
    if (!BZ || BZ.over) return clearInterval(t);
    const left = Math.max(0, BZ.end - Date.now());
    const bar = $("#bz-bar"); if (bar) { bar.style.width = left / 600 + "%"; bar.classList.toggle("warn", left < 10000); }
    const s = $("#bz-sec"); if (s) s.textContent = Math.ceil(left / 1000);
    if (left < 10000 && Math.ceil(left / 1000) !== BZ.lastTick) { BZ.lastTick = Math.ceil(left / 1000); sfx("tick"); }
    if (left <= 0) { clearInterval(t); endBlitz(); }
  }, 100);
}
const mult = () => Math.min(5, 1 + Math.floor(BZ.combo / 3));
function renderBlitz(flash) {
  const it = BZ.pool[BZ.i % BZ.pool.length];
  $("#main").innerHTML = `<div class="screen"><div class="lesson">
    <div class="bz-top"><div class="bar"><i id="bz-bar" style="width:100%"></i></div><span class="mono" id="bz-sec">60</span></div>
    <div class="bz-stats"><div><span class="label">Puntos</span><b id="bz-score">${BZ.score}</b></div><div class="bz-mult m${mult()}"><span class="label">Combo</span><b>x${mult()}</b><small>${BZ.combo} seguidas</small></div></div>
    <div class="bz-card ${flash || ""}"><span class="label">${esc(it.sub)}</span><div class="q">${esc(it.q)}</div></div>
    <div class="opts">${it.options.map((o, i) => `<button class="opt" data-bz="${i}"><span class="k">${i + 1}</span>${esc(o)}</button>`).join("")}</div>
  </div></div>`;
  const left = Math.max(0, BZ.end - Date.now()); $("#bz-bar").style.width = left / 600 + "%"; $("#bz-sec").textContent = Math.ceil(left / 1000);
  document.querySelectorAll("[data-bz]").forEach((b) => (b.onclick = () => answerBlitz(+b.dataset.bz)));
}
function answerBlitz(i) {
  if (!BZ || BZ.over || BZ.lock) return;
  const it = BZ.pool[BZ.i % BZ.pool.length], ok = i === it.answer;
  BZ.total++;
  if (ok) { BZ.combo++; BZ.right++; BZ.score += 10 * mult(); BZ.maxCombo = Math.max(BZ.maxCombo, BZ.combo); sfx(BZ.combo >= 3 ? "combo" : "ok", BZ.combo); }
  else { BZ.combo = 0; sfx("bad"); }
  const btns = document.querySelectorAll("[data-bz]");
  btns[it.answer].classList.add("right"); if (!ok) btns[i].classList.add("wrong");
  BZ.lock = true;
  setTimeout(() => { if (!BZ || BZ.over) return; BZ.lock = false; BZ.i++; renderBlitz(ok ? "pop" : "shake"); }, ok ? 220 : 650);
}
document.addEventListener("keydown", (e) => { if (view === "blitz" && BZ && !BZ.over && /^[1-3]$/.test(e.key)) answerBlitz(+e.key - 1); });
function endBlitz() {
  BZ.over = true;
  const rec = setBest("blitz", BZ.score);
  S.bestCombo = Math.max(S.bestCombo || 0, BZ.maxCombo);
  addMin(1); addXP(Math.max(5, Math.round(BZ.score / 10)), "Reto relámpago");
  sfx("win"); if (rec) confetti();
  $("#main").innerHTML = `<div class="screen done-screen"><div class="big">${rec ? "🏆" : "⚡"}</div><h1>${rec ? "¡Nuevo récord!" : "¡Tiempo!"}</h1>
    <div class="stats3"><div class="card"><span class="label">Puntos</span><b class="bigN">${BZ.score}</b></div><div class="card"><span class="label">Aciertos</span><b class="bigN">${BZ.right}/${BZ.total}</b></div><div class="card"><span class="label">Mejor combo</span><b class="bigN">${BZ.maxCombo}</b></div></div>
    <p class="muted">Récord: ${S.best.blitz}</p><div style="display:flex;gap:10px"><button class="btn gold big" id="bz-again">Otra vez</button><button class="btn big" data-nav="games">Juegos</button></div></div>`;
  $("#bz-again").onclick = startBlitz;
}

/* ---------- 🔢 What number did they say? ---------- */
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function numWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  if (n < 1000) return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + numWords(n % 100) : "");
  return numWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + numWords(n % 1000) : "");
}
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function numberItem() {
  const k = rnd(0, 5);
  if (k === 0) { const n = [13, 30, 14, 40, 15, 50, 16, 60, 17, 70, 18, 80, 19, 90][rnd(0, 13)]; return { say: `The answer is ${numWords(n)}.`, ans: String(n), hint: "Número" }; }
  if (k === 1) { const d = rnd(2, 89), c = rnd(1, 99); return { say: `That's ${numWords(d)} dollars and ${numWords(c)} cents.`, ans: d + "." + String(c).padStart(2, "0"), hint: "Precio (ej. 12.99)" }; }
  if (k === 2) { const y = rnd(1950, 2030), a = Math.floor(y / 100), b = y % 100; return { say: `I was there in ${y >= 2000 && y < 2010 ? "two thousand" + (b ? " and " + numWords(b) : "") : numWords(a) + " " + (b === 0 ? "hundred" : b < 10 ? "oh " + numWords(b) : numWords(b))}.`, ans: String(y), hint: "Año" }; }
  if (k === 3) { const h = rnd(1, 12), m = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][rnd(0, 11)]; return { say: `The bus leaves at ${numWords(h)} ${m === 0 ? "o'clock" : m < 10 ? "oh " + numWords(m) : numWords(m)}.`, ans: h + ":" + String(m).padStart(2, "0"), hint: "Hora (ej. 7:45)" }; }
  if (k === 4) { const digits = [...Array(7)].map(() => rnd(0, 9)); return { say: `My number is ${digits.slice(0, 3).map((d) => ONES[d]).join(", ")}, ${digits.slice(3).map((d) => ONES[d]).join(", ")}.`, ans: digits.join(""), hint: "Teléfono (7 dígitos)" }; }
  const n = rnd(101, 9999); return { say: `There are ${numWords(n)} people in the park.`, ans: String(n), hint: "Número grande" };
}
let NG = null;
VIEWS.numbers = () => { NG = { items: [...Array(10)].map(numberItem), i: 0, right: 0, done: false }; renderNumbers(); };
function renderNumbers() {
  if (NG.i >= NG.items.length) {
    const rec = setBest("numbers", NG.right); addMin(3); addXP(NG.right * 3, "¿Qué número dijo?"); sfx("win"); if (NG.right === 10 || rec) confetti();
    $("#main").innerHTML = `<div class="screen done-screen"><div class="big">🔢</div><h1>${NG.right}/10</h1><p class="muted">${NG.right >= 8 ? "¡Tienes oído de cajero!" : "Los números rápidos son difíciles para todos. Practica 13/30 y los precios."}</p><div style="display:flex;gap:10px"><button class="btn primary big" data-nav="numbers">Otra ronda</button><button class="btn big" data-nav="games">Juegos</button></div></div>`;
    return;
  }
  const it = NG.items[NG.i];
  $("#main").innerHTML = `<div class="screen"><div class="lesson">
    <div class="ltop"><button class="x" data-nav="games" aria-label="Salir">✕</button><div class="bar"><i style="width:${NG.i * 10}%"></i></div><span class="xp">${NG.right} ✓</span></div>
    <span class="label">Escucha y escribe el número · ${esc(it.hint)}</span>
    <div style="display:flex;gap:16px;justify-content:center"><button class="listenbtn" data-say="${esc(it.say)}" data-rate="0.95">🔊</button><button class="listenbtn slow" data-say="${esc(it.say)}" data-rate="0.65">🐢</button></div>
    <input id="ng-in" class="bigin" inputmode="decimal" autocomplete="off" placeholder="Solo el número" ${NG.done ? "disabled" : ""} value="${esc(NG.typed || "")}">
    ${NG.done ? `<div class="feedback ${NG.ok ? "ok" : "no"}"><div><b>${NG.ok ? "¡Exacto!" : "Era " + esc(it.ans)}</b><p>“${esc(it.say)}”</p></div><button class="btn primary big" id="ng-next">Continuar</button></div>` : `<div style="display:flex;justify-content:flex-end"><button class="btn primary big" id="ng-check">Comprobar</button></div>`}
  </div></div>`;
  const inp = $("#ng-in");
  if (!NG.done) { inp.focus(); inp.onkeydown = (e) => { if (e.key === "Enter") checkNumber(); }; $("#ng-check").onclick = checkNumber; if (!NG.played) { NG.played = true; setTimeout(() => speak(it.say, 0.95), 300); } }
  else { $("#ng-next").onclick = () => { NG.i++; NG.done = false; NG.typed = ""; NG.played = false; renderNumbers(); }; $("#ng-next").focus(); }
}
function checkNumber() {
  const it = NG.items[NG.i], v = $("#ng-in").value.trim();
  if (!v) return;
  const clean = (x) => x.replace(/[$\s,-]/g, "").replace(/^0+(?=\d)/, "");
  NG.typed = v; NG.ok = clean(v) === clean(it.ans) || clean(v).replace(".", ":") === clean(it.ans); NG.done = true;
  if (NG.ok) NG.right++;
  sfx(NG.ok ? "ok" : "bad"); renderNumbers();
}

/* ---------- 🧩 Pairs against the clock ---------- */
let PG = null;
VIEWS.pairs = () => {
  const vs = shuffle(WEEKS.filter((w) => w.n <= CUR).flatMap((w) => w.vocab).filter((v) => EXTRA.meanings[v] && v.length <= 34)).slice(0, 6);
  const tiles = shuffle(vs.flatMap((v, i) => [{ k: i, t: v, en: true }, { k: i, t: EXTRA.meanings[v] }]));
  PG = { tiles, sel: null, gone: new Set(), t0: Date.now(), miss: 0, lock: false };
  onLeave = () => { PG.over = true; };
  renderPairs();
  const t = setInterval(() => { if (!PG || PG.over) return clearInterval(t); const el = $("#pg-t"); if (el) el.textContent = ((Date.now() - PG.t0) / 1000).toFixed(1) + " s"; }, 100);
};
function renderPairs() {
  $("#main").innerHTML = `<div class="screen" style="max-width:900px">
    <div class="head"><div><h1>Parejas contra reloj</h1><p>Une cada frase en inglés con su significado.</p></div><div style="display:flex;gap:10px;align-items:center"><span class="pill" id="pg-t">0.0 s</span><span class="pill gold">Récord ${(S.best || {}).pairs != null ? S.best.pairs + " s" : "—"}</span></div></div>
    <div class="pairs">${PG.tiles.map((t, i) => `<button class="ptile ${t.en ? "en" : ""} ${PG.gone.has(t.k) ? "gone" : ""} ${PG.sel === i ? "sel" : ""}" data-pt="${i}" ${PG.gone.has(t.k) ? "disabled" : ""}>${esc(t.t)}</button>`).join("")}</div>
  </div>`;
  document.querySelectorAll("[data-pt]").forEach((b) => (b.onclick = () => pickPair(+b.dataset.pt)));
}
function pickPair(i) {
  if (PG.lock || PG.over) return;
  const t = PG.tiles[i];
  if (PG.sel == null) { PG.sel = i; sfx("tap"); if (t.en) speak(t.t, 1); renderPairs(); return; }
  if (PG.sel === i) { PG.sel = null; renderPairs(); return; }
  const a = PG.tiles[PG.sel];
  if (a.k === t.k && a.en !== t.en) {
    PG.gone.add(t.k); PG.sel = null; sfx("combo", PG.gone.size * 2); renderPairs();
    if (PG.gone.size === 6) {
      PG.over = true;
      const secs = Math.round((Date.now() - PG.t0) / 100) / 10, rec = setBest("pairs", secs, true);
      addMin(2); addXP(20, "Parejas"); sfx("win"); confetti();
      setTimeout(() => { $("#main").innerHTML = `<div class="screen done-screen"><div class="big">🧩</div><h1>${secs} segundos</h1><p class="muted">${rec ? "¡Nuevo récord! " : ""}${PG.miss} ${PG.miss === 1 ? "error" : "errores"}</p><div style="display:flex;gap:10px"><button class="btn primary big" data-nav="pairs">Otra ronda</button><button class="btn big" data-nav="games">Juegos</button></div></div>`; }, 500);
    }
  } else {
    PG.miss++; sfx("bad"); PG.lock = true;
    const els = document.querySelectorAll("[data-pt]"); els[i].classList.add("wrong"); els[PG.sel].classList.add("wrong");
    setTimeout(() => { PG.sel = null; PG.lock = false; renderPairs(); }, 600);
  }
}

/* ---------- 🐝 Spelling ---------- */
let SP = null;
VIEWS.spell = () => { SP = { items: shuffle(SPELL).slice(0, 10), i: 0, right: 0, done: false }; renderSpell(); };
function renderSpell() {
  if (SP.i >= SP.items.length) {
    const rec = setBest("spell", SP.right); addMin(3); addXP(SP.right * 3, "Deletreo"); sfx("win"); if (SP.right >= 9 || rec) confetti();
    $("#main").innerHTML = `<div class="screen done-screen"><div class="big">🐝</div><h1>${SP.right}/10</h1><p class="muted">${SP.right >= 8 ? "¡Excelente ortografía!" : "Las palabras que fallaste vuelven en tus tarjetas de errores."}</p><div style="display:flex;gap:10px"><button class="btn primary big" data-nav="spell">Otra ronda</button><button class="btn big" data-nav="games">Juegos</button></div></div>`;
    return;
  }
  const it = SP.items[SP.i];
  const diff = SP.done && !SP.ok ? letterDiff(SP.typed, it.w) : "";
  $("#main").innerHTML = `<div class="screen"><div class="lesson">
    <div class="ltop"><button class="x" data-nav="games" aria-label="Salir">✕</button><div class="bar"><i style="width:${SP.i * 10}%"></i></div><span class="xp">${SP.right} ✓</span></div>
    <span class="label">Escucha la palabra y escríbela · pista: ${esc(it.es)}</span>
    <div style="display:flex;gap:16px;justify-content:center"><button class="listenbtn" data-say="${esc(it.w)}. ${esc(it.ex)} ${esc(it.w)}." data-rate="0.9">🔊</button><button class="listenbtn slow" data-say="${esc(it.w)}" data-rate="0.6">🐢</button></div>
    <input id="sp-in" class="bigin" autocomplete="off" spellcheck="false" placeholder="Escribe la palabra" ${SP.done ? "disabled" : ""} value="${esc(SP.typed || "")}">
    ${SP.done ? `<div class="feedback ${SP.ok ? "ok" : "no"}"><div><b>${SP.ok ? "¡Bien escrita!" : "Se escribe: " + esc(it.w)}</b>${diff ? `<p class="mono">${diff}</p>` : ""}<p>${esc(it.ex)}</p></div><button class="btn primary big" id="sp-next">Continuar</button></div>` : `<div style="display:flex;justify-content:flex-end"><button class="btn primary big" id="sp-check">Comprobar</button></div>`}
  </div></div>`;
  const inp = $("#sp-in");
  if (!SP.done) { inp.focus(); inp.onkeydown = (e) => { if (e.key === "Enter") checkSpell(); }; $("#sp-check").onclick = checkSpell; if (!SP.played) { SP.played = true; setTimeout(() => speak(it.w + ". " + it.ex + " " + it.w + ".", 0.9), 300); } }
  else { $("#sp-next").onclick = () => { SP.i++; SP.done = false; SP.typed = ""; SP.played = false; renderSpell(); }; $("#sp-next").focus(); }
}
function letterDiff(typed, word) {
  return [...word].map((ch, i) => (typed[i] || "").toLowerCase() === ch.toLowerCase() ? `<span class="wok">${esc(ch)}</span>` : `<span class="wbad">${esc(ch)}</span>`).join("");
}
function checkSpell() {
  const it = SP.items[SP.i], v = $("#sp-in").value.trim();
  if (!v) return;
  SP.typed = v; SP.ok = v.toLowerCase() === it.w.toLowerCase(); SP.done = true;
  if (SP.ok) SP.right++; else { S.errors = mergeErr([{ mal: v, bien: it.w, porque: "Ortografía (" + it.es + ")" }], S.errors); save(); }
  sfx(SP.ok ? "ok" : "bad"); renderSpell();
}
