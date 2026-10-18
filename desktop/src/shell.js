/* Shell: top bar with grouped tabs, sliding indicator, sub-tabs, XP ring, Ctrl+K palette and screen transitions. Wraps go() and renderRank() from app.js. */
(function () {
  const GROUP = { home: "home", settings: "home", course: "learn", path: "learn", lesson: "learn", story: "learn", chapter: "learn", cards: "learn", vocab: "learn", listen: "learn",
    call: "speak", talk: "speak", pron: "speak", interview: "speak", games: "play", blitz: "play", numbers: "play", pairs: "play", spell: "play", progress: "play" };
  const ICO = { home: "house", settings: "settings", course: "course", path: "path", story: "plane", cards: "cards", vocab: "vocab", listen: "listen", call: "call", talk: "chat", pron: "pron", interview: "disney", games: "games", progress: "progress", blitz: "bolt" };
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

  if (!S.skinV) { S.skinV = 1; S.theme = "light"; root.dataset.theme = "light"; save(); }

  function place() {
    const act = $("#tabs button[aria-current=page]"), sl = $("#slider"); if (!act || !sl) return;
    sl.style.width = act.offsetWidth + "px"; sl.style.transform = `translateX(${act.offsetLeft}px)`; sl.classList.add("on");
  }
  function paintShell(v) {
    const g = GROUP[NAV_ALIAS[v] || v] || "home";
    $$("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.group === g ? "page" : "false"));
    $$("#nav button").forEach(b => { b.hidden = b.dataset.g !== g || g === "home"; });
    const sb = $("#subbar"); sb.dataset.open = g !== "home" ? "1" : "0";
    place();
  }
  const _go = go;
  go = function (v, arg) {
    _go(v, arg);
    paintShell(v);
    const sc = $("#main").firstElementChild;
    if (sc) { sc.classList.remove("enter"); void sc.offsetWidth; sc.classList.add("enter"); [...sc.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 9))); }
    countUp();
  };
  $("#tabs").addEventListener("click", e => {
    const b = e.target.closest("button[data-group]"); if (!b) return;
    const first = { home: "home", learn: "course", speak: "call", play: "games" }[b.dataset.group];
    go(first);
  });
  document.addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b && !b.closest("#nav")) go(b.dataset.go); });

  const _rr = renderRank;
  renderRank = function () {
    _rr();
    const r = rank(), v = $("#ring-v"); if (v) v.style.strokeDashoffset = String(113.1 * (1 - r.pct / 100));
    const n = $("#streak-n"); if (n) n.textContent = streak();
    $("#streak-chip").dataset.on = streak() ? "1" : "0";
  };

  function countUp() {
    $$(".stat b").forEach(el => {
      const t = el.textContent.trim(); if (!/^\d+$/.test(t) || +t < 2) return;
      const end = +t, t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / 700); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      el.textContent = "0"; requestAnimationFrame(step);
    });
  }

  /* boarding pass tilt on hover */
  document.addEventListener("pointermove", e => {
    const t = e.target.closest && e.target.closest(".ticket"); if (!t) return;
    const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    t.style.transform = `perspective(900px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`;
  });
  document.addEventListener("pointerout", e => { const t = e.target.closest && e.target.closest(".ticket"); if (t && !t.contains(e.relatedTarget)) t.style.transform = ""; });

  /* Command palette */
  const pal = $("#pal"), q = $("#pal-q"), list = $("#pal-list");
  let items = [], sel = 0;
  function build() {
    const base = [["Inicio", "home"], ["Clases", "course"], ["Ruta", "path"], ["Viaje a Orlando", "story"], ["Tarjetas", "cards"], ["Mis palabras", "vocab"], ["Dictado", "listen"], ["Llamada en inglés", "call"], ["Chat", "talk"], ["Pronunciación", "pron"], ["Entrevista Disney", "interview"], ["Juegos", "games"], ["Reto relámpago", "blitz"], ["Progreso y logros", "progress"], ["Ajustes", "settings"]];
    items = base.map(([t, v]) => ({ t, ico: ICO[v], run: () => go(v), k: t.toLowerCase() }));
    if (typeof COURSE !== "undefined") COURSE.forEach(c => items.push({ t: `Clase ${c.n}: ${c.title}`, ico: "course", run: () => go("course", c.n), k: `clase ${c.n} ${c.title}`.toLowerCase() }));
    items.push({ t: S.theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro", ico: S.theme === "dark" ? "sun" : "moon", run: () => { S.theme = S.theme === "dark" ? "light" : "dark"; root.dataset.theme = S.theme; save(); }, k: "tema oscuro claro" });
  }
  const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function paint() {
    const w = norm(q.value.trim()); let r = items.filter(i => !w || w.split(/\s+/).every(p => norm(i.k).includes(p)));
    r = r.slice(0, 9); sel = Math.min(sel, Math.max(0, r.length - 1)); list.__r = r;
    list.innerHTML = r.length ? r.map((i, n) => `<button class="pi" data-n="${n}" aria-selected="${n === sel}"><svg class="ic"><use href="#i-${i.ico}"/></svg><span>${esc(i.t)}</span><svg class="ic go"><use href="#i-arrow"/></svg></button>`).join("") : `<p class="muted" style="padding:14px 18px;margin:0">Nada con “${esc(q.value)}”.</p>`;
  }
  function open() { build(); q.value = ""; sel = 0; pal.hidden = false; paint(); q.focus(); }
  function close() { pal.hidden = true; }
  function run(n) { const i = (list.__r || [])[n]; if (i) { close(); i.run(); } }
  $("#open-pal").onclick = open;
  pal.addEventListener("mousedown", e => { if (e.target === pal) close(); });
  list.addEventListener("click", e => { const b = e.target.closest(".pi"); if (b) run(+b.dataset.n); });
  q.addEventListener("input", () => { sel = 0; paint(); });
  q.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { sel = Math.min(sel + 1, (list.__r || []).length - 1); paint(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); paint(); e.preventDefault(); }
    else if (e.key === "Enter") run(sel);
    else if (e.key === "Escape") close();
  });
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? open() : close(); }
  });
  window.addEventListener("resize", place);
  document.fonts && document.fonts.ready.then(place);
  renderRank();
})();
