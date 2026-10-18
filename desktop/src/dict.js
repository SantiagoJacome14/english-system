/* ---------- 📖 Diccionario: toca una palabra en inglés y ve qué significa y cómo cambia (presente, pasado, futuro) ---------- */
const IRREG_TXT = `be:was/were:been;have:had:had;do:did:done;go:went:gone;see:saw:seen;eat:ate:eaten;take:took:taken;make:made:made;come:came:come;get:got:gotten;give:gave:given;know:knew:known;think:thought:thought;say:said:said;tell:told:told;buy:bought:bought;bring:brought:brought;write:wrote:written;read:read:read;speak:spoke:spoken;drink:drank:drunk;drive:drove:driven;sleep:slept:slept;run:ran:run;meet:met:met;leave:left:left;pay:paid:paid;send:sent:sent;sit:sat:sat;stand:stood:stood;begin:began:begun;break:broke:broken;build:built:built;catch:caught:caught;choose:chose:chosen;cost:cost:cost;cut:cut:cut;draw:drew:drawn;fall:fell:fallen;feel:felt:felt;fight:fought:fought;find:found:found;fly:flew:flown;forget:forgot:forgotten;forgive:forgave:forgiven;freeze:froze:frozen;grow:grew:grown;hang:hung:hung;hear:heard:heard;hide:hid:hidden;hit:hit:hit;hold:held:held;hurt:hurt:hurt;keep:kept:kept;lead:led:led;lend:lent:lent;let:let:let;lie:lay:lain;lose:lost:lost;mean:meant:meant;put:put:put;quit:quit:quit;ride:rode:ridden;ring:rang:rung;rise:rose:risen;sell:sold:sold;set:set:set;shake:shook:shaken;shine:shone:shone;shoot:shot:shot;show:showed:shown;shut:shut:shut;sing:sang:sung;sink:sank:sunk;slide:slid:slid;spend:spent:spent;spin:spun:spun;spread:spread:spread;steal:stole:stolen;stick:stuck:stuck;sweep:swept:swept;swim:swam:swum;swing:swung:swung;teach:taught:taught;tear:tore:torn;throw:threw:thrown;understand:understood:understood;wake:woke:woken;wear:wore:worn;win:won:won;wind:wound:wound;withdraw:withdrew:withdrawn;bet:bet:bet;bite:bit:bitten;blow:blew:blown;bend:bent:bent;bleed:bled:bled;bind:bound:bound;breed:bred:bred;burst:burst:burst;deal:dealt:dealt;dig:dug:dug;feed:fed:fed;flee:fled:fled;kneel:knelt:knelt;lay:laid:laid;light:lit:lit;prove:proved:proven;seek:sought:sought;sew:sewed:sewn;shrink:shrank:shrunk;split:split:split;spit:spat:spat;strike:struck:struck;swear:swore:sworn;weep:wept:wept;undo:undid:undone;forbid:forbade:forbidden;become:became:become;beat:beat:beaten;mistake:mistook:mistaken;overcome:overcame:overcome;upset:upset:upset;rebuild:rebuilt:rebuilt;redo:redid:redone;rewrite:rewrote:rewritten;retell:retold:retold;outgrow:outgrew:outgrown;oversleep:overslept:overslept;broadcast:broadcast:broadcast;cast:cast:cast;bid:bid:bid;shed:shed:shed;thrust:thrust:thrust;arise:arose:arisen;awake:awoke:awoken;bear:bore:borne;lean:leaned:leaned;learn:learned:learned;dream:dreamed:dreamed;burn:burned:burned;spell:spelled:spelled`;
const IRREG = {}, IRREG_BACK = {};
IRREG_TXT.split(";").forEach((r) => {
  const [b, p, pp] = r.split(":");
  IRREG[b] = { past: p, pp };
  p.split("/").concat(pp.split("/")).forEach((f) => { if (f !== b) (IRREG_BACK[f] = IRREG_BACK[f] || []).push(b); });
});
const DOUBLE = new Set(["admit", "prefer", "permit", "refer", "occur", "control", "commit", "regret", "equip", "begin", "forget", "upset"]);
const cvc = (w) => (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(w) && w.length <= 4) || DOUBLE.has(w);
function verbForms(b) {
  b = b.toLowerCase();
  if (b === "be") return { base: "be", s3: "is", past: "was / were", pp: "been", ing: "being", be: true };
  if (b === "have") return { base: "have", s3: "has", past: "had", pp: "had", ing: "having" };
  const ir = IRREG[b];
  let s3 = /(s|x|z|ch|sh|o)$/.test(b) ? b + "es" : /[^aeiou]y$/.test(b) ? b.slice(0, -1) + "ies" : b + "s";
  let ing = /ie$/.test(b) ? b.slice(0, -2) + "ying" : /[^eyo]e$/.test(b) || /[^e]ee$/.test(b) && false ? b.slice(0, -1) + "ing" : cvc(b) ? b + b.slice(-1) + "ing" : b + "ing";
  if (/(ee|ye|oe)$/.test(b)) ing = b + "ing";
  let past, pp;
  if (ir) { past = ir.past.replace("/", " / "); pp = ir.pp.replace("/", " / "); }
  else { past = /e$/.test(b) ? b + "d" : /[^aeiou]y$/.test(b) ? b.slice(0, -1) + "ied" : cvc(b) ? b + b.slice(-1) + "ed" : b + "ed"; pp = past; }
  return { base: b, s3, past, pp, ing, irregular: !!ir };
}
// "look for" → { forms of "look", rest: " for" }
function phraseForms(en) {
  const [v, ...rest] = en.trim().split(/\s+/), f = verbForms(v), tail = rest.length ? " " + rest.join(" ") : "";
  const t = (x) => x.split(" / ").map((y) => y + tail).join(" / ");
  return { base: f.base + tail, s3: t(f.s3), past: t(f.past), pp: t(f.pp), ing: t(f.ing), be: f.be, irregular: f.irregular, v: f.base, tail };
}
function inflectionOf(w) {
  w = w.toLowerCase();
  if (IRREG_BACK[w]) { const b = IRREG_BACK[w][0], r = IRREG[b]; return { base: b, kind: r.past.split("/").includes(w) ? "pasado" : "participio" }; }
  if (IRREG[w]) return null;
  const tries = [];
  if (/ing$/.test(w)) { const s = w.slice(0, -3); tries.push([s, "gerundio (-ing)"], [s + "e", "gerundio (-ing)"]); if (/(.)\1$/.test(s)) tries.push([s.slice(0, -1), "gerundio (-ing)"]); if (/ying$/.test(w)) tries.push([w.slice(0, -4) + "ie", "gerundio (-ing)"]); }
  if (/ied$/.test(w)) tries.push([w.slice(0, -3) + "y", "pasado"]);
  else if (/ed$/.test(w)) { const s = w.slice(0, -2); tries.push([s, "pasado"], [s + "e", "pasado"]); if (/(.)\1$/.test(s)) tries.push([s.slice(0, -1), "pasado"]); }
  if (/ies$/.test(w)) tries.push([w.slice(0, -3) + "y", "tercera persona (he/she/it)"]);
  else if (/es$/.test(w)) tries.push([w.slice(0, -2), "tercera persona (he/she/it)"], [w.slice(0, -1), "tercera persona (he/she/it)"]);
  else if (/s$/.test(w) && !/ss$/.test(w)) tries.push([w.slice(0, -1), "plural o tercera persona"]);
  for (const [b, kind] of tries) if (b.length > 1 && (localEntry(b) || IRREG[b])) return { base: b, kind };
  return null;
}

/* Offline dictionary (the 500 most common words) */
let LOCAL = null;
function localEntry(w) {
  if (!LOCAL) { LOCAL = new Map(); (typeof DICTW !== "undefined" ? DICTW : []).forEach((x) => LOCAL.set(x.w.toLowerCase(), x)); }
  return LOCAL.get(String(w).toLowerCase()) || null;
}
const PHRASAL = /^(?!(a|an|the|my|your|his|her|our|their|good|no|of|in|on|at)\s)[a-z]+ (up|down|out|off|on|in|for|at|back|away|over|around|after|with|into|about|through|along|to)( [a-z]+)?$/i;
const POS_ES = { noun: "sustantivo", verb: "verbo", adjective: "adjetivo", adverb: "adverbio", pronoun: "pronombre", preposition: "preposición", conjunction: "conjunción", determiner: "determinante", interjection: "interjección", number: "número", phrase: "expresión", other: "" };
const normKey = (t) => String(t).toLowerCase().replace(/[^a-záéíóúñü' -]/g, "").replace(/\s+/g, " ").trim();

// Returns { en, es:[...], pos, ex, exEs, note, inflected, forms, src, ai } for an English or Spanish word or phrase.
async function lookupWord(raw) {
  const key = normKey(raw); if (!key) return null;
  S.dict = S.dict || {};
  if (S.dict[key] && S.dict[key].es && S.dict[key].es.length) return S.dict[key];
  const infl = !key.includes(" ") ? inflectionOf(key) : null;
  const lk = localEntry(infl ? infl.base : key);
  let e = null;
  const st = await window.api.getSettings().catch(() => ({ provider: "none" }));
  if (st.provider !== "none") {
    const r = await window.api.feedback(`You are a bilingual English-Spanish dictionary for a Spanish-speaking A1 student from Colombia. Look up: "${raw}". It may be English or Spanish. If it is an inflected English form (went, running, children...), give the BASE form in "en" and say what it was in "inflected".
Return JSON: {"en":"the English word or phrase, base form","es":["1 to 3 Spanish meanings, most common first"],"pos":"noun|verb|adjective|adverb|preposition|pronoun|conjunction|phrase|other","ex":"one simple English example sentence, max 10 words","exEs":"its Spanish translation","note":"optional: one short tip in Spanish if the word is tricky (false friend, irregular plural, two meanings...), otherwise empty","inflected":"in Spanish, e.g. 'pasado de go', or empty"}`);
    if (r.ok && r.data && r.data.en && Array.isArray(r.data.es) && r.data.es.length) e = { ...r.data, ai: true };
  }
  if (!e && lk) e = { en: lk.w, es: lk.es.split(",").map((x) => x.trim()), pos: lk.pos, ex: "", exEs: "", note: "", inflected: infl ? `${infl.kind} de ${infl.base}` : "", ai: false };
  if (!e) return { en: raw, es: [], pos: "other", offline: true };
  e.en = String(e.en).trim(); e.es = e.es.map(String);
  e.fromEs = normKey(e.en) !== key && !infl && !e.inflected;
  if (e.pos === "verb" || (infl && localEntry(infl.base) && (localEntry(infl.base).pos === "verb"))) e.forms = phraseForms(e.en.replace(/^to /, ""));
  else if (e.pos === "phrase" && PHRASAL.test(e.en.trim())) e.forms = phraseForms(e.en);
  if (!e.inflected && infl) e.inflected = `${infl.kind} de ${infl.base}`;
  if (e.ai || e.es.length) S.dict[key] = e;
  const ks = Object.keys(S.dict); if (ks.length > 400) delete S.dict[ks[0]];
  save();
  return e;
}

/* The card that shows an entry (used by the popover and by "Mis palabras") */
function entryHTML(e, { saved } = {}) {
  if (!e) return "";
  if (e.offline) return `<p class="muted" style="margin:0">No encontré “${esc(e.en)}” sin conexión. Elige una IA en <button class="btn" data-nav="settings" style="padding:2px 10px">Ajustes</button> y se podrá buscar cualquier palabra.</p>`;
  const f = e.forms, pos = POS_ES[e.pos] || "";
  const inf = e.inflected ? `<span class="pill">${esc(e.inflected)}</span>` : "";
  const verb = f ? (f.be
    ? `<table class="vt"><thead><tr><th>Presente</th><th>Pasado</th><th>Participio</th><th>-ing</th><th>Futuro</th></tr></thead><tbody><tr><td>I am<br>he/she/it is<br>you/we/they are</td><td>I/he/she/it was<br>you/we/they were</td><td>been</td><td>being</td><td>will be</td></tr></tbody></table>`
    : `<table class="vt"><thead><tr><th>Presente</th><th>Pasado</th><th>Participio</th><th>-ing</th><th>Futuro</th></tr></thead><tbody><tr><td><b>${esc(f.base)}</b><small>he/she/it ${esc(f.s3)}</small></td><td><b>${esc(f.past)}</b><small>yesterday</small></td><td><b>${esc(f.pp)}</b><small>have/has ${esc(f.pp.split(" / ")[0])}</small></td><td><b>${esc(f.ing)}</b><small>am/is/are ${esc(f.ing.split(" / ")[0])}</small></td><td><b>will ${esc(f.base)}</b><small>tomorrow</small></td></tr></tbody></table>${f.irregular ? `<p class="muted" style="margin:0;font-size:12px">⚠️ Verbo irregular: el pasado y el participio no terminan en -ed.</p>` : ""}`) : "";
  return `<div class="lkc">
    <div class="lk-top"><div><b class="lk-w">${esc(e.en)}</b>${pos ? `<span class="muted"> · ${pos}</span>` : ""} ${inf}</div><button class="btn" data-say="${esc(e.en)}" title="Escuchar">🔊</button></div>
    <div class="lk-es">${e.es.map(esc).join(" · ")}</div>
    ${e.ex ? `<div class="lk-ex"><span>${esc(e.ex)}</span>${e.exEs ? `<small>${esc(e.exEs)}</small>` : ""}<button class="btn ghost" data-say="${esc(e.ex)}" title="Escuchar el ejemplo">🔊</button></div>` : ""}
    ${e.note ? `<p class="lk-note">💡 ${esc(e.note)}</p>` : ""}
    ${verb}
    <div class="lk-act"><button class="btn gold" id="lk-save" ${saved ? "disabled" : ""}>${saved ? "✓ Guardada en Mis palabras" : "＋ Guardar en Mis palabras"}</button></div>
  </div>`;
}
function saveEntry(e) {
  if (!e || e.offline || !e.es.length) return false;
  S.vocab = S.vocab || [];
  const k = e.en.toLowerCase();
  const old = S.vocab.find((v) => (v.src === "en" ? v.en : v.en || "").toLowerCase() === k);
  if (old) { old.n = (old.n || 1) + 1; save(); return true; }
  S.vocab.unshift({ es: e.es.join(", "), en: e.en, ex: e.ex || "", exEs: e.exEs || "", pos: e.pos, forms: e.forms || null, src: e.fromEs ? "es" : "en", d: TODAY, n: 1 });
  save(); toast(`📒 Guardé “${e.en}” en Mis palabras`);
  return true;
}
const isSaved = (e) => !!e && (S.vocab || []).some((v) => (v.en || "").toLowerCase() === e.en.toLowerCase());

/* Popover: tap any English word (or select a short phrase) inside [data-lk] */
let lkEl = null;
function closeLookup() { if (lkEl) { lkEl.remove(); lkEl = null; } }
function wordAt(x, y) {
  let r = null;
  if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(x, y);
  else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); } }
  if (!r || r.startContainer.nodeType !== 3) return "";
  const t = r.startContainer.textContent; let a = r.startOffset, b = a;
  const ch = (c) => /[A-Za-zÀ-ÿ'’]/.test(c || "");
  if (!ch(t[a]) && ch(t[a - 1])) a--, b--;
  while (a > 0 && ch(t[a - 1])) a--; while (b < t.length && ch(t[b])) b++;
  return t.slice(a, b).replace(/^['’]+|['’]+$/g, "");
}
async function openLookup(text, x, y) {
  closeLookup();
  const el = document.createElement("div"); el.className = "lk"; lkEl = el;
  el.innerHTML = `<button class="lk-x" aria-label="Cerrar">✕</button><div class="lk-load"><span class="dots"><i></i><i></i><i></i></span> Buscando “${esc(text)}”…</div>`;
  document.body.appendChild(el);
  const W = 360, H = 120;
  el.style.left = Math.max(12, Math.min(innerWidth - W - 12, x - W / 2)) + "px";
  el.style.top = Math.max(12, Math.min(innerHeight - 300, y + 18)) + "px";
  el.querySelector(".lk-x").onclick = closeLookup;
  const e = await lookupWord(text).catch(() => null);
  if (lkEl !== el) return;
  el.innerHTML = `<button class="lk-x" aria-label="Cerrar">✕</button>` + (e ? entryHTML(e, { saved: isSaved(e) }) : `<p class="muted" style="margin:0">No pude buscar esa palabra.</p>`);
  el.querySelector(".lk-x").onclick = closeLookup;
  const sv = el.querySelector("#lk-save"); if (sv) sv.onclick = () => { saveEntry(e); sv.disabled = true; sv.textContent = "✓ Guardada en Mis palabras"; };
  const r = el.getBoundingClientRect(); if (r.bottom > innerHeight - 8) el.style.top = Math.max(12, innerHeight - r.height - 12) + "px";
  speak(e && e.en ? e.en : text);
}
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeLookup(); });
document.addEventListener("mousedown", (ev) => { if (lkEl && !ev.target.closest(".lk")) closeLookup(); });
document.addEventListener("mouseup", (ev) => {
  const host = ev.target.closest && ev.target.closest("[data-lk]"); if (!host || ev.target.closest("button,a,input,textarea,select,.lk")) return;
  const sel = String(getSelection()).trim();
  if (sel && sel.length >= 2 && sel.length <= 40 && sel.split(/\s+/).length <= 4) { openLookup(sel, ev.clientX, ev.clientY); return; }
  if (sel) return;
  const w = wordAt(ev.clientX, ev.clientY);
  if (w && w.length >= 2) openLookup(w, ev.clientX, ev.clientY);
});
