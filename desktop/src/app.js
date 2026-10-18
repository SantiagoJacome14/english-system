const PROFILE = `The student is a 20-year-old Colombian systems engineering student (6th semester) in Bucaramanga, from Ocaña. Has a 1-year-old Yorkshire terrier called Rebecca, plays tennis and goes to the gym, girlfriend called Sara. Family in Cúcuta (mother) and Ocaña (father). Goal: apply to an international exchange program at Disney in the USA, pass the interview in English, work and save money there. Level: A2. Main problems: uses present tense for past and future; switches to Spanish words when stuck; confuses his/her/your; "I have 20 years"; "for + verb" instead of "to + verb"; "before" meaning "after that"; spelling.`;
const RANKS=[["Pasajero",0],["Cadete",150],["Copiloto",400],["Piloto",800],["Capitán",1400],["Comandante",2200]];
const DAYS=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const MON=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const md=s=>esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1");
const key=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today=new Date(); today.setHours(0,0,0,0);
const TODAY=key(today);
const W1=new Date(2026,9,19), START=new Date(2026,9,17), END=new Date(2027,0,3);
const dow=d=>(d.getDay()+6)%7;
const WK=today<W1?0:Math.min(11,Math.floor((today-W1)/(7*864e5))+1);
const CUR=Math.max(1,WK);
const week=n=>WEEKS.find(w=>w.n===n);
const opensOn=n=>{const d=new Date(W1.getTime()+(n-1)*7*864e5);return d.getDate()+" "+MON[d.getMonth()]};
const topicToday=WK===0?(dow(today)===5?"Test de nivel y primera conversación":"Prepara tus herramientas y lee la Semana 1"):week(CUR).dias[dow(today)];

/* ---------- State ---------- */
const DEFAULT={name:"Santiago",xp:0,xpLog:{},minutes:{},lessons:{},cards:{},errors:[],chats:0,dictations:0,theme:"dark"};
let S=Object.assign({},DEFAULT);
try{Object.assign(S,JSON.parse(localStorage.getItem("ebp2")||"{}"))}catch(e){}
function save(){try{localStorage.setItem("ebp2",JSON.stringify(S))}catch(e){}}
function addXP(n,why){const before=rank().name;S.xp+=n;S.xpLog[TODAY]=(S.xpLog[TODAY]||0)+n;save();toast("+"+n+" XP · "+why);renderRank();if(rank().name!==before)celebrate("¡Subiste a "+rank().name+"!");checkAch()}
function addMin(n){S.minutes[TODAY]=(S.minutes[TODAY]||0)+n;save()}
let toastT;function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,1800)}
document.documentElement.dataset.theme=S.theme;

/* ---------- Derived ---------- */
function rank(){let i=0;RANKS.forEach((r,j)=>{if(S.xp>=r[1])i=j});const cur=RANKS[i],nxt=RANKS[i+1];return{name:cur[0],pct:nxt?Math.round((S.xp-cur[1])/(nxt[1]-cur[1])*100):100,next:nxt}}
function streak(){let n=0;const d=new Date(today);if(!S.xpLog[key(d)])d.setDate(d.getDate()-1);while(S.xpLog[key(d)]){n++;d.setDate(d.getDate()-1)}return n}
function renderRank(){const r=rank();$("#r-xp").textContent=S.xp+" XP";$("#r-name").textContent=r.name;$("#r-bar").style.width=r.pct+"%";$("#r-next").textContent=r.next?`${r.next[1]-S.xp} XP para ${r.next[0]}`:"Rango máximo";const due=dueCards().length;$("#due-badge").hidden=!due;$("#due-badge").textContent=due}
function allCards(){const out=[];WEEKS.filter(w=>w.n<=CUR).forEach(w=>w.vocab.forEach(v=>out.push({id:v,en:v,es:(EXTRA.meanings[v]||""),wk:w.n})));return out}
// "Mis errores": every mistake saved from lessons, conversations, calls and writing becomes a card.
function errorCards(){return S.errors.filter(e=>e&&e.bien).map(e=>({id:"err:"+e.mal+"|"+e.bien,en:e.bien,es:e.porque||"",mal:e.mal,err:true}))}
function vocabCards(){return(S.vocab||[]).filter(v=>v.en).map(v=>({id:"voc:"+(v.src==="en"?"e:"+v.en.toLowerCase():v.es.toLowerCase()),en:v.en,es:v.es,ex:v.ex||"",voc:true,rev:v.src==="en",forms:v.forms||null}))}
function dueCards(deck){const now=Date.now();const src=deck==="err"?errorCards():deck==="vocab"?vocabCards():deck==="words"?allCards():allCards().concat(errorCards(),vocabCards());return src.filter(c=>{const s=S.cards[c.id];return !s||s.due<=now})}
function learned(){return Object.entries(S.cards).filter(([k,c])=>c.reps>=2&&!k.startsWith("err:")).length}
function lessonsOf(n){const w=week(n);return[
  {id:n+"-g",icon:"📘",t:"Gramática",sub:w.gram,kind:"grammar"},
  {id:n+"-b",icon:"🧩",t:"Construye frases",sub:"Ordena las palabras",kind:"build"},
  {id:n+"-d",icon:"🎧",t:"Dictado",sub:"Escucha y escribe",kind:"dict"},
  {id:n+"-t",icon:"💬",t:"Conversación",sub:"Habla del tema",kind:"talk"},
  {id:n+"-w",icon:"✍️",t:"Misión",sub:"Escribe y corrige",kind:"write"}]}
function nextLesson(){for(const w of WEEKS){if(w.n>CUR)break;for(const l of lessonsOf(w.n))if(!S.lessons[l.id])return l}return null}

/* ---------- Router ---------- */
let view="home";
let onLeave=null;
function go(v,arg){if(view==="talk"&&v!=="talk"&&typeof resolveVocab==="function")resolveVocab();if(onLeave){const f=onLeave;onLeave=null;f()}view=v;Voice.stop();if(Voice.recording)Voice.recording.cancel();document.querySelectorAll("#nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.go===(NAV_ALIAS[v]||v)?"page":"false"));$("#main").scrollTop=0;(VIEWS[v]||VIEWS.home)(arg)}
$("#nav").onclick=e=>{const b=e.target.closest("[data-go]");if(b)go(b.dataset.go)};
document.addEventListener("click",e=>{const b=e.target.closest("[data-nav]");if(b){go(b.dataset.nav,b.dataset.arg)}});

const VIEWS={};
const NAV_ALIAS={lesson:"path",blitz:"games",numbers:"games",pairs:"games",spell:"games",chapter:"story"};
/* ---------- Home ---------- */
VIEWS.home=()=>{
  const r=rank(),nl=nextLesson(),due=dueCards().length,st=streak(),pod=phraseOfDay();
  const hour=new Date().getHours();const greet=hour<12?"Good morning":hour<19?"Good afternoon":"Good evening";
  const totalDays=Math.round((END-START)/864e5),gone=Math.max(0,Math.round((today-START)/864e5));
  const pct=Math.min(100,Math.round(gone/totalDays*100));
  const wps=[...Array(12)].map((_,i)=>{const d=i===0?START:new Date(W1.getTime()+(i-1)*7*864e5);const p=Math.round((d-START)/(END-START)*100);return`<span class="wp ${d<=today?"on":""}" style="left:${p}%" title="Semana ${i}"></span>`}).join("");
  const days=[...Array(7)].map((_,i)=>{const d=new Date(today);d.setDate(d.getDate()-6+i);return d});
  const vals=days.map(d=>S.xpLog[key(d)]||0);const max=Math.max(100,...vals);
  const blocks=[["Repasar tarjetas","5 min · frases de la semana","cards"],["Lección del día",nl?nl.t+" · Semana "+nl.id.split("-")[0]:"¡Ruta al día!","path"],["Dictado","10 min · entrena tu oído","listen"],["Llamada en inglés","15 min · "+topicToday,"call"],["Misión de escritura","10 min · escribe y corrige","path"]];
  const doneB=[(S.xpLog[TODAY]&&Object.values(S.cards).some(c=>c.last===TODAY)),!!Object.entries(S.lessons).some(([k,v])=>v.date===TODAY&&!/-t$|-w$/.test(k)),(S.dictLog||{})[TODAY],(S.chatLog||{})[TODAY],!!Object.entries(S.lessons).some(([k,v])=>v.date===TODAY&&/-w$/.test(k))];
  $("#main").innerHTML=`<div class="screen">
    <div class="hall">
      <div class="hall-l">
        <div class="hall-t"><i class="live"></i><span class="label">${DAYS[dow(today)]} ${today.getDate()} ${MON[today.getMonth()]} · Semana ${WK} de 11 · ${greet}, ${esc(S.name)}</span></div>
        <h2>Tu vuelo a <em>Orlando</em> sale en</h2>
        <div class="countdown"><span class="flap-n" data-n="${String(Math.max(0,totalDays-gone)).padStart(3,"0")}"></span><small>días para<br>despegar</small></div>
        <div class="tk-route"><div class="code">BGA<small>BUCARAMANGA</small></div><div class="track"><span class="done" style="width:${pct}%"></span>${wps}<span class="plane" style="left:${pct}%"><svg viewBox="0 0 256 256"><use href="#i-plane"/></svg></span></div><div class="code">MCO<small>ORLANDO</small></div></div>
      </div>
      <div class="hall-r">
        <div><span class="label">Puerta de hoy</span><p style="margin:6px 0 0;font-family:var(--display);font-stretch:80%;font-weight:800;font-size:26px;line-height:1.1;text-transform:uppercase">${esc(topicToday)}</p></div>
        <button class="btn primary big" data-nav="${nl?"lesson":"talk"}" data-arg="${nl?nl.id:""}"><svg class="ic"><use href="#i-arrow"/></svg>${nl?"Continuar":"Conversar"}</button>
      </div>
    </div>
    <div class="board">
      <div class="board-h"><span>Min</span><span>Vuelo</span><span>Actividad</span><span>Estado</span><span></span></div>
      ${blocks.map((bk,i)=>{const first=doneB.findIndex(x=>!x);const st=doneB[i]?["ATERRIZADO","done"]:i===first?["ABORDANDO",""]:["PROGRAMADO",""];return`<div class="brow ${st[1]}"><span class="tm">${["05","—","10","15","10"][i]}</span><span class="fn">EB ${String(101+i)}</span><div class="ds"><b>${bk[0]}</b><small>${esc(bk[1])}</small></div><span class="stt">${i===first||doneB[i]?"<i></i>":""}${st[0]}</span><button class="btn" data-nav="${bk[2]}">${doneB[i]?"Repetir":"Ir"}</button></div>`}).join("")}
    </div>
    <div class="grid g4">
      <div class="card stat"><svg class="ic"><use href="#i-flame"/></svg><div><b>${st}</b><span>${st===1?"día de racha":"días de racha"}</span></div></div>
      <div class="card stat"><svg class="ic"><use href="#i-star"/></svg><div><b>${S.xp}</b><span>XP · ${r.name}</span></div></div>
      <div class="card stat"><svg class="ic"><use href="#i-cards"/></svg><div><b>${learned()}</b><span>frases aprendidas</span></div></div>
      <div class="card stat"><svg class="ic"><use href="#i-pron"/></svg><div><b>A2</b><span>nivel actual · meta B1</span></div></div>
    </div>
    <div class="grid g2">
      <div class="card pod"><span class="label">Frase del día</span><div class="pod-en">${esc(pod.en)}</div><div class="pod-es">${esc(pod.es)}</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-say="${esc(pod.en)}"><svg class="ic"><use href="#i-speaker"/></svg>Escuchar</button><button class="btn" data-nav="pron" data-arg="${esc(pod.en)}"><svg class="ic"><use href="#i-pron"/></svg>Practicar pronunciación</button></div></div>
      ${voiceCard()}
    </div>
    <div class="grid g2">
      <div class="card">
        <h3>XP de la semana</h3>
        <div class="chart">${days.map((d,i)=>`<div class="col"><span class="v">${vals[i]||""}</span><div class="b ${vals[i]>=100?"full":""} ${key(d)===TODAY?"today":""}" style="height:${Math.max(3,vals[i]/max*100)}%"></div><span class="d">${"LMXJVSD"[dow(d)]}</span></div>`).join("")}</div>
        <p class="muted" style="margin:0;font-size:13px">Meta diaria: 100 XP. La barra llena = día completo.</p>
      </div>
      ${typeof classCard==="function"?classCard():""}
    </div>
    <div class="quick">
      <button class="qa hot" data-nav="call"><span class="e"><svg class="ic"><use href="#i-call"/></svg></span><b>Llamada en inglés</b><small>Habla con tu voz, manos libres</small></button>
      <button class="qa" data-nav="story"><span class="e"><svg class="ic"><use href="#i-plane"/></svg></span><b>Viaje a Orlando</b><small>Capítulo ${Math.min(CUR,11)} desbloqueado</small></button>
      <button class="qa" data-nav="blitz"><span class="e"><svg class="ic"><use href="#i-bolt"/></svg></span><b>Reto relámpago</b><small>60 segundos · récord ${(S.best||{}).blitz||0}</small></button>
      <button class="qa" data-nav="interview"><span class="e"><svg class="ic"><use href="#i-disney"/></svg></span><b>Entrevista Disney</b><small>Simulador con preguntas reales</small></button>
      <button class="qa" data-nav="pron"><span class="e"><svg class="ic"><use href="#i-pron"/></svg></span><b>Pronunciación</b><small>Habla y mira qué palabras se entienden</small></button>
      <button class="qa" data-nav="cards" data-arg="${dueCards("err").length?"err":"words"}"><span class="e"><svg class="ic"><use href="#i-cards"/></svg></span><b>Tarjetas</b><small>${due} pendientes · ${dueCards("err").length} de tus errores</small></button>
    </div>
  </div>`;
};

function phraseOfDay(d=today){const n=d<W1?1:Math.max(1,Math.min(11,Math.floor((d-W1)/(7*864e5))+1));const w=week(n);const v=w.vocab[((dow(d)*2+Math.floor((d-W1)/(7*864e5)))%w.vocab.length+w.vocab.length)%w.vocab.length];return{en:v,es:EXTRA.meanings[v]||""}}
function voiceCard(){const st=Voice.state;
  if(S.voiceReady&&st.tts!=="error")return`<div class="card"><span class="label">Voz natural</span><h3>🎙️ Lista para hablar</h3><p class="muted" style="margin:0">Reconocimiento y voz en inglés funcionando en tu PC, sin internet.</p><div><button class="btn primary" data-nav="call">📞 Hacer una llamada</button></div></div>`;
  if(st.tts==="loading"||st.stt==="loading")return`<div class="card"><span class="label">Voz natural</span><h3>Descargando voces… ${Voice.downloadPct()}%</h3><div class="bar"><i id="dl-bar" style="width:${Voice.downloadPct()}%"></i></div><p class="muted" style="margin:0">Solo pasa una vez. Puedes seguir usando la app.</p></div>`;
  return`<div class="card voice-cta"><span class="label">Nuevo · voz natural</span><h3>🎙️ Activa la conversación por voz</h3><p class="muted" style="margin:0">Descarga una sola vez las voces (unos 170 MB). Después la app te escucha y te habla en inglés sin internet y gratis.</p><div><button class="btn gold" id="voice-on">Activar voz</button></div></div>`}
function enableVoice(){S.voice=Object.assign({},Voice.cfg(),{neural:true});save();Voice.loadTTS();Voice.loadSTT();if(view==="home")VIEWS.home()}
document.addEventListener("click",e=>{if(e.target.closest("#voice-on"))enableVoice()});
Voice.on(st=>{if((st.tts==="error"||st.stt==="error")&&!st.warned){st.warned=true;toast("No pude descargar las voces. Revisa tu internet e intenta otra vez.")}const b=$("#dl-bar");if(b)b.style.width=Voice.downloadPct()+"%";if(view==="home"&&(Voice.state.tts!=="loading"&&Voice.state.stt!=="loading"))VIEWS.home()});

/* ---------- Path ---------- */
VIEWS.path=()=>{
  const nl=nextLesson();
  $("#main").innerHTML=`<div class="screen">
    <div class="head"><div><h1>Tu ruta</h1><p>11 semanas, 5 lecciones por semana. Completa una para desbloquear la siguiente.</p></div><span class="pill">${Object.keys(S.lessons).length} / 55 lecciones</span></div>
    ${WEEKS.map(w=>{const ls=lessonsOf(w.n);const locked=w.n>CUR;return`<div class="unit ${locked?"locked":""} ${w.n===CUR?"now":""}">
      <div><span class="label">Semana · ${esc(w.fechas)}</span><div class="wk">${w.n}</div><b>${esc(w.tema)}</b></div>
      <div class="nodes">${ls.map(l=>{const done=S.lessons[l.id];const isNext=nl&&nl.id===l.id;return`<button class="node ${done?"done":""} ${isNext?"next":""}" ${locked?"disabled title='Se desbloquea el "+opensOn(w.n)+"'":`data-nav="lesson" data-arg="${l.id}"`}><span class="c">${locked?"🔒":done?"✓":l.icon}</span><span>${l.t}</span></button>`}).join("")}</div>
    </div>`}).join("")}
  </div>`;
};

/* ---------- Lesson engine ---------- */
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const norm=s=>s.toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9' ]/g," ").replace(/\s+/g," ").trim();
function buildItems(n){const w=week(n);const ex=EXTRA.build[n]||w.ej.filter(e=>!e.includes("___")).map(e=>({en:e}));return ex.map(x=>({type:"build",es:x.es,answer:x.en}))}
function dictItems(n){const w=week(n);return shuffle([...w.ej.filter(e=>!e.includes("___")),...w.vocab.filter(v=>!/[…\/(]/.test(v))]).slice(0,6).map(t=>({type:"dict",answer:t}))}
let L=null;
VIEWS.lesson=id=>{
  const n=+String(id).split("-")[0],kind=lessonsOf(n).find(l=>l.id===id);
  if(!kind){go("path");return}
  if(kind.kind==="talk"){talkMode="daily";go("talk");return}
  if(kind.kind==="write"){writeView(n,id);return}
  const items=kind.kind==="grammar"?(EXTRA.grammar[n]||[]).map(q=>({type:"mc",...q})).concat(buildItems(n).slice(0,2)):kind.kind==="build"?buildItems(n):dictItems(n);
  L={id,n,kind,items:items.length?items:buildItems(n),i:0,right:0,xp:0,answered:false,sel:null,tray:[]};
  if(kind.kind==="grammar") L.intro=true;
  renderLesson();
};
function renderLesson(){
  const it=L.items[L.i],pct=Math.round(L.i/L.items.length*100);
  let body="";
  if(L.intro&&L.i===0&&!L.seenIntro){
    const w=week(L.n);
    body=`<div class="card"><span class="label">Antes de empezar</span><h3>${md(w.gram)}</h3><div>${mdBlock(w.expl)}</div><div class="chips">${w.ej.map(e=>`<button class="chip" data-say="${esc(e)}">🔊 ${esc(e)}</button>`).join("")}</div></div><button class="btn primary big" id="intro-ok">Entendido, ¡a practicar!</button>`;
  } else if(it.type==="mc"){
    const parts=it.q.split("___");
    body=`<span class="label">Elige la opción correcta</span><div class="q">${parts.length>1?esc(parts[0])+`<span class="blank">${L.sel!=null?esc(it.options[L.sel]):"&nbsp;"}</span>`+esc(parts[1]):esc(it.q)}</div>
      <div class="opts">${it.options.map((o,i)=>`<button class="opt ${L.sel===i?"sel":""} ${L.answered&&i===it.answer?"right":""} ${L.answered&&L.sel===i&&i!==it.answer?"wrong":""}" data-opt="${i}" ${L.answered?"disabled":""}><span class="k">${i+1}</span>${esc(o)}</button>`).join("")}</div>`;
  } else if(it.type==="build"){
    if(!L.bank){const words=it.answer.replace(/[.?!,]/g,"").split(" ");const extra=shuffle(["is","are","the","do","my","to","have"].filter(x=>!words.includes(x))).slice(0,2);L.bank=shuffle([...words,...extra]).map((w,i)=>({w,i}));L.tray=[]}
    body=`<span class="label">${it.es?"Traduce esta frase":"Ordena la frase"}</span><div class="q">${it.es?esc(it.es):"🔊 Escucha y arma la frase"}</div>${it.es?"":`<div><button class="btn" data-say="${esc(it.answer)}">🔊 Escuchar</button></div>`}
      <div class="tray">${L.tray.map(t=>`<button class="tile" data-untile="${t.i}" ${L.answered?"disabled":""}>${esc(t.w)}</button>`).join("")}</div>
      <div class="bank">${L.bank.map(t=>`<button class="tile ${L.tray.some(x=>x.i===t.i)?"used":""}" data-tile="${t.i}" ${L.answered?"disabled":""}>${esc(t.w)}</button>`).join("")}</div>`;
  } else if(it.type==="dict"){
    body=`<span class="label">Escucha y escribe lo que oyes</span><div style="display:flex;gap:16px;align-items:center;justify-content:center;padding:10px 0"><button class="listenbtn" data-say="${esc(it.answer)}" data-rate="0.9" aria-label="Escuchar">🔊</button><button class="listenbtn slow" data-say="${esc(it.answer)}" data-rate="0.6" aria-label="Escuchar lento">🐢</button></div>
      <textarea id="dict-in" placeholder="Escribe en inglés…" ${L.answered?"disabled":""}>${esc(L.typed||"")}</textarea>`;
  }
  let foot="";
  if(!(L.intro&&L.i===0&&!L.seenIntro)){
    if(L.answered){const ok=L.lastOk;foot=`<div class="feedback ${ok?"ok":"no"}"><div><b>${ok?"¡Excelente! 🎉":"Casi…"}</b><p>${ok?(it.explain?md(it.explain):"Sigue así."):`Respuesta correcta: <strong>${esc(it.type==="mc"?it.options[it.answer]:it.answer)}</strong>${it.explain?"<br>"+md(it.explain):""}`}</p></div><button class="btn ${ok?"primary":""} big" id="next">Continuar</button></div>`}
    else foot=`<div style="display:flex;justify-content:flex-end"><button class="btn primary big" id="check" ${canCheck()?"":"disabled"}>Comprobar</button></div>`;
  }
  $("#main").innerHTML=`<div class="screen"><div class="lesson">
    <div class="ltop"><button class="x" data-nav="path" aria-label="Salir">✕</button><div class="bar"><i style="width:${pct}%"></i></div><span class="xp">+${L.xp} XP</span></div>
    <div><span class="label">Semana ${L.n} · ${esc(L.kind.t)}</span></div>
    ${body}${foot}</div></div>`;
  const io=$("#intro-ok");if(io)io.onclick=()=>{L.seenIntro=true;renderLesson()};
  const ch=$("#check");if(ch)ch.onclick=check;
  const nx=$("#next");if(nx)nx.onclick=next;
  const di=$("#dict-in");if(di){di.focus();di.oninput=()=>{L.typed=di.value;const c=$("#check");if(c)c.disabled=!canCheck()};di.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(canCheck())check()}}}
  if(it&&it.type==="dict"&&!L.answered&&!L.played){L.played=true;setTimeout(()=>speak(it.answer,.9),300)}
}
function canCheck(){const it=L.items[L.i];return it.type==="mc"?L.sel!=null:it.type==="build"?L.tray.length>0:(L.typed||"").trim().length>0}
function check(){const it=L.items[L.i];let ok;
  if(it.type==="mc")ok=L.sel===it.answer;
  else if(it.type==="build")ok=norm(L.tray.map(t=>t.w).join(" "))===norm(it.answer);
  else ok=norm(L.typed||"")===norm(it.answer);
  L.answered=true;L.lastOk=ok;sfx(ok?"ok":"bad");if(ok){L.right++;L.xp+=10}else if(it.type!=="mc"){S.errors=mergeErr([{mal:it.type==="build"?L.tray.map(t=>t.w).join(" "):L.typed,bien:it.answer,porque:it.type==="dict"?"Dictado: escucha otra vez":"Orden de la frase"}],S.errors);save()}
  speak(it.type==="mc"?it.q.replace("___",it.options[it.answer]):it.answer);renderLesson()}
function next(){L.i++;L.sel=null;L.answered=false;L.bank=null;L.tray=[];L.typed="";L.played=false;
  if(L.i>=L.items.length){finishLesson();return}renderLesson()}
function finishLesson(){const bonus=50;const total=L.xp+bonus;S.lessons[L.id]={date:TODAY,score:L.right+"/"+L.items.length};if(L.kind.kind==="dict"){S.dictLog=S.dictLog||{};S.dictLog[TODAY]=1;S.dictations=(S.dictations||0)+L.items.length}addMin(8);addXP(total,"Lección completa");sfx("win");if(L.right===L.items.length)confetti();
  const nl=nextLesson();
  $("#main").innerHTML=`<div class="screen done-screen"><div class="big">🏆</div><h1>¡Lección completa!</h1><p class="muted">Semana ${L.n} · ${esc(L.kind.t)}</p>
  <div class="stats3"><div class="card"><span class="label">Aciertos</span><b style="font-family:var(--display);font-size:30px">${L.right}/${L.items.length}</b></div><div class="card"><span class="label">XP ganados</span><b style="font-family:var(--display);font-size:30px;color:var(--gold)">+${total}</b></div><div class="card"><span class="label">Racha</span><b style="font-family:var(--display);font-size:30px">🔥 ${streak()}</b></div></div>
  <div style="display:flex;gap:10px">${nl?`<button class="btn primary big" data-nav="lesson" data-arg="${nl.id}">Siguiente: ${esc(nl.t)}</button>`:""}<button class="btn big" data-nav="home">Volver al inicio</button></div></div>`}
document.addEventListener("click",e=>{if(view!=="lesson"||!L)return;
  const o=e.target.closest("[data-opt]");if(o&&!L.answered){L.sel=+o.dataset.opt;renderLesson();return}
  const t=e.target.closest("[data-tile]");if(t&&!L.answered){const i=+t.dataset.tile;if(!L.tray.some(x=>x.i===i)){L.tray.push(L.bank.find(b=>b.i===i));speak(L.bank.find(b=>b.i===i).w,1)}renderLesson();return}
  const u=e.target.closest("[data-untile]");if(u&&!L.answered){const i=+u.dataset.untile;L.tray=L.tray.filter(x=>x.i!==i);renderLesson()}});
document.addEventListener("keydown",e=>{if(view!=="lesson"||!L||e.target.tagName==="TEXTAREA")return;const it=L.items[L.i];if(it&&it.type==="mc"&&!L.answered&&/^[1-4]$/.test(e.key)&&+e.key<=it.options.length){L.sel=+e.key-1;renderLesson()}if(e.key==="Enter"){if(L.answered)next();else if(canCheck())check()}});
function mdBlock(s){let out="",inL=false;for(const l of s.split("\n")){if(/^\s*- /.test(l)){if(!inL){out+="<ul style='margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px'>";inL=true}out+="<li>"+md(l.replace(/^\s*- /,""))+"</li>"}else if(/^\s+\S/.test(l)&&inL){out=out.replace(/<\/li>$/," "+md(l.trim())+"</li>")}else{if(inL){out+="</ul>";inL=false}if(l.trim())out+="<p style='margin:0'>"+md(l)+"</p>"}}return out+(inL?"</ul>":"")}

/* ---------- Writing mission ---------- */
function writeView(n,id){const w=week(n);view="lesson";
  $("#main").innerHTML=`<div class="screen"><div class="lesson">
    <div class="ltop"><button class="x" data-nav="path" aria-label="Salir">✕</button><span class="label">Semana ${n} · Misión de escritura</span></div>
    <div class="q">✍️ ${md(w.mision)}</div>
    <textarea id="w-in" style="min-height:220px" placeholder="Escribe aquí en inglés, sin traductor…">${esc((S.drafts||{})[id]||"")}</textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span class="muted" id="w-count">0 palabras</span><button class="btn primary big" id="w-go">Corregir mi texto</button></div>
    <div id="w-out"></div></div></div>`;
  const ta=$("#w-in");const cnt=()=>{$("#w-count").textContent=(ta.value.trim().split(/\s+/).filter(Boolean).length)+" palabras";S.drafts=S.drafts||{};S.drafts[id]=ta.value;save()};ta.oninput=cnt;cnt();
  $("#w-go").onclick=async()=>{if(ta.value.trim().length<20){$("#w-out").innerHTML=`<div class="banner">Escribe un poco más antes de pedir corrección.</div>`;return}
    $("#w-go").disabled=true;$("#w-out").innerHTML=`<div class="card"><span class="muted">Revisando tu texto…</span></div>`;
    const res=await window.api.feedback(`You are an English teacher for a Spanish-speaking A2 student. ${PROFILE}
Writing task: ${w.mision}
Student text:
"""${ta.value}"""
Return JSON: {"corregido":"the full corrected text in English","errores":[{"mal":"...","bien":"...","porque":"short reason in Spanish"}],"bien":"one encouraging sentence in Spanish","puntaje":1-10}. 3 to 6 errors max.`);
    $("#w-go").disabled=false;
    if(!res.ok){if(res.code==="no_ai"&&!S.lessons[id]){S.lessons[id]={date:TODAY,score:"✓"};addMin(10);addXP(30,"Misión de escritura")}$("#w-out").innerHTML=`<div class="banner">${res.code==="no_ai"?"Guardé tu texto y la misión cuenta como hecha. Para que te lo corrija, activa un cerebro en Ajustes (Ollama es gratis).":esc(ERR[res.code]||ERR.error)}</div>`;return}
    const r=res.data;S.errors=mergeErr(r.errores||[],S.errors);S.lessons[id]={date:TODAY,score:(r.puntaje||"")+"/10"};addMin(10);addXP(60,"Misión de escritura");
    $("#w-out").innerHTML=`<div class="fbk"><h3 style="color:var(--green)">Puntaje: ${esc(r.puntaje)}/10</h3><p style="margin:0">${esc(r.bien)}</p><span class="label">Versión corregida</span><p style="margin:0;white-space:pre-wrap">${esc(r.corregido)}</p><button class="btn" data-say="${esc(r.corregido)}">🔊 Escuchar versión corregida</button>${errTable(r.errores||[])}</div>`}}
function errTable(es){return`<div style="overflow-x:auto"><table><thead><tr><th>❌ Escribiste</th><th>✅ Mejor así</th><th>Por qué</th></tr></thead><tbody>${es.map(e=>`<tr><td>${esc(e.mal)}</td><td><strong>${esc(e.bien)}</strong></td><td class="muted">${esc(e.porque)}</td></tr>`).join("")}</tbody></table></div>`}
function mergeErr(a,b){const seen=new Set();return[...a,...b].filter(e=>{if(!e||!e.mal)return false;const k=e.mal+"|"+e.bien;if(seen.has(k))return false;seen.add(k);return true}).slice(0,80)}

/* ---------- Flashcards (spaced repetition) ---------- */
let FC=null;
VIEWS.cards=async deck=>{if(deck==="vocab"&&(S.vocab||[]).some(v=>!v.en))await resolveVocab();if(deck==="repeat"){FC={deck:"words",practice:true,q:shuffle(allCards().filter(c=>c.wk===CUR)),i:0,flip:false,done:0};renderCards();return}deck=deck||(FC&&FC.deck)||"words";const due=shuffle(dueCards(deck)).slice(0,20);FC={deck,q:due,i:0,flip:false,done:0};renderCards()};
function deckTabs(){const a=dueCards("words").length,b=dueCards("err").length;return`<div class="tabs"><button class="tab" aria-pressed="${FC.deck==="words"}" data-nav="cards" data-arg="words">${FC.practice?"🔁 Repaso extra · ":""}🃏 Frases de la semana <span class="pill">${a}</span></button><button class="tab" aria-pressed="${FC.deck==="err"}" data-nav="cards" data-arg="err">🧠 Mis errores <span class="pill gold">${b}</span></button><button class="tab" aria-pressed="${FC.deck==="vocab"}" data-nav="cards" data-arg="vocab">📒 Mis palabras <span class="pill gold">${dueCards("vocab").length}</span></button></div>`}
function renderCards(){
  if(!FC.q.length||FC.i>=FC.q.length){
    const voc=FC.deck==="vocab",err=FC.deck==="err"||voc,errDue=dueCards("err").length,first=FC.done&&!FC.practice;
    if(FC.done){sfx("win");if(!err)confetti()}
    const title=voc?(FC.done?"¡Repasaste tus palabras!":(S.vocab||[]).length?"No hay palabras pendientes":"Aún no tienes palabras guardadas"):err?(FC.done?"¡Repasaste tus errores!":"No hay errores pendientes"):FC.practice?"¡Terminaste otra vuelta! 💪":FC.done?"¡Terminaste las frases de la semana! 🎉":"Ya terminaste las frases de la semana";
    const sub=err?"Vuelven cuando toque repasarlas.":FC.done?`Repasaste ${FC.done} tarjetas. Las que marcaste difíciles vuelven pronto.`:"Las tarjetas vuelven solas cuando toca repasarlas.";
    $("#main").innerHTML=`<div class="screen">${deckTabs()}</div><div class="screen done-screen" style="padding-top:0"><div class="big">${voc?"📒":err?"🧠":"🏁"}</div><h1>${title}</h1><p class="muted">${sub}</p>${err?"":`<p style="font-size:18px;margin:0">¿Las quieres repetir?</p>`}
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${err?"":`<button class="btn gold big" data-nav="cards" data-arg="repeat">🔁 Sí, repetirlas</button>`}${!err&&errDue?`<button class="btn big" data-nav="cards" data-arg="err">🧠 Repasar mis errores (${errDue})</button>`:""}${voc?`<button class="btn gold big" data-nav="vocab">📒 Ir a Mis palabras</button>`:""}<button class="btn big" data-nav="home">${err?"Volver al inicio":"No, volver al inicio"}</button></div>
      <p class="muted">Frases aprendidas: <strong style="color:var(--ink)">${learned()}</strong> de ${allCards().length}</p></div>`;return}
  const c=FC.q[FC.i];
  $("#main").innerHTML=`<div class="screen">
    <div class="head"><div><h1>Tarjetas</h1><p>${FC.deck==="err"?"Tus propios errores, convertidos en tarjetas. Di la forma correcta antes de voltear.":FC.deck==="vocab"?"Las palabras que preguntaste. Dila en inglés antes de voltear.":"Di la frase en voz alta antes de voltearla."}</p></div><span class="pill">${FC.i+1} / ${FC.q.length}</span></div>${deckTabs()}
    <div class="fc-wrap"><div class="fc ${FC.flip?"flip":""}" id="fc">
      ${c.voc?(c.rev?`<div class="side"><span class="label">📒 Tu palabra · ¿qué significa?</span><div class="phrase">${esc(c.en)}</div><button class="btn" data-say="${esc(c.en)}">🔊 Escuchar</button><span class="muted" style="font-size:13px">Piensa qué significa y voltea (clic o barra espaciadora)</span></div>`:`<div class="side"><span class="label">📒 Tu palabra · ¿cómo se dice en inglés?</span><div class="phrase">${esc(c.es)}</div><span class="muted" style="font-size:13px">Dila en inglés en voz alta y voltea (clic o barra espaciadora)</span></div>`):c.err?`<div class="side"><span class="label">🧠 Un error tuyo · ¿cómo se dice bien?</span><div class="phrase wrongp">${esc(c.mal)}</div><span class="muted" style="font-size:13px">Dila bien en voz alta y voltea (clic o barra espaciadora)</span></div>`:`<div class="side"><span class="label">Semana ${c.wk} · ¿Qué significa?</span><div class="phrase">${esc(c.en)}</div><button class="btn" data-say="${esc(c.en)}">🔊 Escuchar</button><span class="muted" style="font-size:13px">Clic o barra espaciadora para voltear</span></div>`}
      <div class="side back"><span class="label">${c.err?"✅ Mejor así":c.voc&&c.rev?"Significa":"Significado"}</span><div class="phrase" style="font-size:26px">${esc(c.voc&&c.rev?c.es:c.en)}</div><div class="mean">${esc(c.voc?(c.rev&&c.forms?formsLine(c.forms)+(c.ex?" · "+c.ex:""):c.ex):c.es||(c.err?"":"Inventa una frase tuya con esta expresión"))}</div>${c.voc&&c.ex?`<button class="btn" data-say="${esc(c.ex)}">🔊 Ejemplo</button>`:""}<button class="btn" data-say="${esc(c.en)}">🔊 Escuchar</button></div>
    </div></div>
    <div class="rate" ${FC.flip?"":"style='visibility:hidden'"}>
      <button class="r1" data-rate="1">Otra vez<small>1 min</small></button><button class="r2" data-rate="2">Difícil<small>${ivl(c,2)}</small></button><button class="r3" data-rate="3">Bien<small>${ivl(c,3)}</small></button><button class="r4" data-rate="4">Fácil<small>${ivl(c,4)}</small></button>
    </div></div>`;
  $("#fc").onclick=e=>{if(e.target.closest("[data-say]"))return;FC.flip=!FC.flip;sfx("flip");renderCards();if(FC.flip)speak(c.en)};
  document.querySelectorAll("[data-rate]").forEach(b=>b.onclick=()=>rate(+b.dataset.rate));
  if(!FC.flip&&!FC.spoke&&!c.err&&!c.voc){FC.spoke=true;setTimeout(()=>speak(c.en),250)}
}
function sched(c,g){const s=S.cards[c.id]||{ease:2.5,int:0,reps:0};let ease=s.ease,int=s.int,reps=s.reps;
  if(g===1){reps=0;int=0}else{ease=Math.max(1.3,ease+(g===2?-.15:g===4?.15:0));int=reps===0?(g===4?3:1):reps===1?(g===2?2:g===4?6:4):Math.round(int*ease*(g===2?.7:g===4?1.3:1));reps++}
  return{ease,int,reps,due:g===1?Date.now()+60e3:Date.now()+int*864e5,last:TODAY}}
function ivl(c,g){const d=sched(c,g).int;return d<1?"1 min":d===1?"1 día":d+" días"}
function rate(g){const c=FC.q[FC.i];if(!FC.practice||g===1)S.cards[c.id]=sched(c,g);S.cardReviews=(S.cardReviews||0)+1;if(c.err)S.errReviews=(S.errReviews||0)+1;sfx(g===1?"bad":"tap");if(g===1)FC.q.push(c);FC.done++;addXP(2,"Tarjeta");FC.i++;FC.flip=false;FC.spoke=false;if(FC.done%10===0)addMin(5);renderCards()}
document.addEventListener("keydown",e=>{if(view!=="cards"||!FC||e.target.tagName==="TEXTAREA"||e.target.tagName==="INPUT")return;if(e.key===" "){e.preventDefault();FC.flip=!FC.flip;renderCards();if(FC.flip)speak(FC.q[FC.i].en)}if(FC.flip&&/^[1-4]$/.test(e.key))rate(+e.key)});

/* ---------- Dictation hub ---------- */
VIEWS.listen=()=>{
  $("#main").innerHTML=`<div class="screen">
    <div class="head"><div><h1>Dictado</h1><p>Escucha frases reales y escríbelas. Entrena tu oído para los números, las contracciones y las palabras rápidas.</p></div><span class="pill">${S.dictations||0} frases escritas</span></div>
    <div class="grid g3">${WEEKS.filter(w=>w.n<=CUR).map(w=>`<button class="qa" data-nav="lesson" data-arg="${w.n}-d"><span class="e">🎧</span><b>Semana ${w.n}</b><small>${esc(w.tema)}</small>${S.lessons[w.n+"-d"]?`<span class="pill ok" style="align-self:flex-start">✓ ${esc(S.lessons[w.n+"-d"].score)}</span>`:""}</button>`).join("")}</div>
    <div class="card"><h3>Escucha libre</h3><p class="muted" style="margin:0">Toca para escuchar a velocidad normal o lenta. Repite en voz alta encima del audio (shadowing).</p>
      <div class="chips">${week(CUR).ej.concat(week(CUR).vocab).map(e=>`<button class="chip" data-say="${esc(e)}">🔊 ${esc(e)}</button>`).join("")}</div></div>
  </div>`};

/* ---------- Talk ---------- */
const SCEN=[
  {id:"daily",e:"📅",t:"Tema del día",s:()=>topicToday,brief:()=>`Today's topic: "${topicToday}". This week's grammar: ${week(CUR).gram}. Ask questions one by one about the topic so the student practices that grammar.`},
  {id:"disney",e:"🏰",t:"Entrevista Disney",s:()=>"Recruiter del programa de intercambio",brief:()=>"Role-play: you are a friendly recruiter interviewing the student for the Disney International College / Cultural Exchange Program in the USA. Ask typical interview questions one at a time (tell me about yourself, why Disney, customer service experience, teamwork, a difficult situation, availability). Keep it realistic but kind."},
  {id:"free",e:"☕",t:"Charla libre",s:()=>"Hablamos de lo que quieras",brief:()=>"Free conversation about the student's life, interests and plans. Ask one question at a time."},
  {id:"restaurant",e:"🍔",t:"Restaurante",s:()=>"Pide comida en USA",brief:()=>"Role-play: you are a waiter at a diner in Orlando. The student is the customer. Be natural and ask the usual questions (table, drinks, order, how they want it, check)."},
  {id:"airport",e:"🛫",t:"Aeropuerto",s:()=>"Migración y check-in",brief:()=>"Role-play: you are a US immigration officer at Orlando airport, then an airline agent. Ask the usual questions (purpose of visit, how long, where staying, luggage)."},
  {id:"park",e:"🎢",t:"Trabajo en el parque",s:()=>"Atiende a un visitante",brief:()=>"Role-play: the student works at a theme park attraction or store; you are a tourist with questions and a small complaint. The student must help you politely."},
  {id:"correct",e:"✍️",t:"Corrige mi texto",s:()=>"Pega un texto tuyo",brief:()=>"The student will paste a short text they wrote. Reply in Spanish with: the corrected version in English (bold the changes), then the 3 most important errors explained briefly, then one encouraging line. Then ask in English for the next text."}
];
let talkMode="daily",hist=[],busy=false;
function sysPrompt(){const m=SCEN.find(x=>x.id===talkMode);return`You are Max, a warm, patient English conversation partner for a Spanish-speaking student from Colombia. ${PROFILE}
Session: ${m.brief()}
Rules: speak simple, natural English at A2 level (short sentences, common words). Keep each reply to 1–3 short sentences and always end with ONE question, unless the session says otherwise. Do not correct every mistake during the chat; if the student writes a Spanish word or [brackets], give the English word in one short parenthesis, e.g. (piscina = pool). If the student writes "?", rephrase your last message more simply. Be encouraging. Plain text only.${coachBrief()}`}
VIEWS.talk=()=>{
  const m=SCEN.find(x=>x.id===talkMode),w=week(CUR);
  $("#main").innerHTML=`<div class="screen" style="max-width:1280px">
    <div class="head"><div><h1>Conversar</h1><p>Chatea en inglés escribiendo o con el micrófono. Al final, pide tu corrección.</p></div><div style="display:flex;gap:8px"><button class="btn" data-nav="call" data-arg="${talkMode}">📞 Llamar con voz</button><button class="btn" id="t-new">↻ Nueva</button><button class="btn gold" id="t-end">Terminar y corregirme</button></div></div>
    <div class="banner" id="no-key" hidden>Para conversar, elige un cerebro en <button class="btn" data-nav="settings" style="padding:2px 10px">Ajustes</button>: Claude (pago por uso) u Ollama (gratis, en tu PC). Las lecciones, tarjetas, juegos e historia funcionan sin esto.</div>
    <div class="talk">
      <div class="scen">${SCEN.map(s=>`<button class="sc" data-scen="${s.id}" aria-pressed="${s.id===talkMode}"><span class="e">${s.e}</span><span><b>${s.t}</b><small>${esc(s.s())}</small></span></button>`).join("")}</div>
      <div class="chatbox">
        <div class="chathead"><span class="avatar">🧑‍✈️</span><div><b>Max · ${esc(m.t)}</b><small>● en línea · voz en inglés</small></div><label style="margin-left:auto;font-size:13px;color:var(--muted);display:flex;gap:6px;align-items:center"><input type="checkbox" id="autospeak" ${S.autospeak===false?"":"checked"}> Leer en voz alta</label></div>
        <div class="msgs" id="msgs"></div>
        <div class="composer"><button class="mic" title="Hablar (mantén para grabar)" id="mic">🎙</button><textarea id="t-in" rows="1" placeholder="Escribe, o toca 🎙 y habla en inglés"></textarea><button class="btn primary" id="t-send" style="height:48px">Enviar</button></div>
      </div>
      <div class="hints">
        <div class="card"><span class="label">Frases útiles · semana ${CUR}</span><div class="chips">${w.vocab.slice(0,10).map(v=>`<button class="chip" data-insert="${esc(v)}">${esc(v)}</button>`).join("")}</div></div>
        <div class="card"><span class="label">Salvavidas</span><div class="chips">${["Could you repeat that?","How do you say…?","What does … mean?","Let me think…","Sorry, I didn't catch that."].map(v=>`<button class="chip" data-insert="${esc(v)}">${esc(v)}</button>`).join("")}</div></div>
        <div class="card"><span class="label">Gramática de la semana</span><b>${md(w.gram)}</b></div>
      </div>
    </div><div id="t-fb"></div></div>`;
  $("#autospeak").onchange=e=>{S.autospeak=e.target.checked;save()};
  $("#t-send").onclick=send;$("#t-new").onclick=()=>{hist=[];newAngle();renderMsgs();ask()};$("#t-end").onclick=endTalk;
  $("#mic").onclick=micToText;
  const ti=$("#t-in");ti.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}};ti.oninput=()=>{ti.style.height="auto";ti.style.height=Math.min(140,ti.scrollHeight)+"px"};
  renderMsgs();if(!hist.length){newAngle();ask()}
};
document.addEventListener("click",e=>{const s=e.target.closest("[data-scen]");if(s){talkMode=s.dataset.scen;hist=[];VIEWS.talk()}const ins=e.target.closest("[data-insert]");if(ins){const t=$("#t-in");t.value=(t.value?t.value+" ":"")+ins.dataset.insert;t.focus()}});
function renderMsgs(){const box=$("#msgs");if(!box)return;box.innerHTML=`<div class="msg note">${esc(SCEN.find(x=>x.id===talkMode).t)} · responde en inglés · escribe “?” si no entiendes</div>`+hist.map(m=>m.role==="assistant"?`<div class="msg bot" data-lk>${esc(m.content)}<button class="say" data-say="${esc(m.content)}">🔊 Escuchar</button>${m.ms?`<small class="lat">${(m.ms/1000).toFixed(1)} s</small>`:""}</div>`:`<div class="msg me">${esc(m.content)}</div>`).join("");box.scrollTop=box.scrollHeight}
const ERR={ssh_fail:"No pude conectarme a tu VM. Revisa que esté prendida y el comando ssh en Ajustes.",no_ai:"Elige un cerebro para conversar en Ajustes: Claude (API) u Ollama (gratis).",ollama_off:"Ollama no está abierto. Ábrelo (icono de la llama) e intenta de nuevo.",ollama_model:"Ese modelo no está instalado en Ollama. En una terminal escribe: ollama pull llama3.2",ollama_error:"Ollama tuvo un problema. Intenta de nuevo.",no_key:"Primero pega tu clave de API en Ajustes.",bad_key:"La clave de API no es válida. Revísala en Ajustes.",no_credit:"Tu cuenta de la API no tiene saldo. Agrega saldo en console.anthropic.com.",rate_limited:"Muchas solicitudes seguidas. Espera un minuto.",offline:"No hay conexión a internet.",refusal:"No puedo responder eso. Cambiemos de tema.",error:"No pude responder. Intenta de nuevo."};
async function ask(){
  const st=await window.api.getSettings();if(st.provider==="none"){const b=$("#no-key");if(b)b.hidden=false;return}
  busy=true;const box=$("#msgs");const el=document.createElement("div");el.className="msg bot typing";el.innerHTML="<span class='dots'><i></i><i></i><i></i></span>";box.appendChild(el);box.scrollTop=box.scrollHeight;const t0=performance.now();
  const r=await window.api.chat(sysPrompt(),[{role:"user",content:"Start the conversation now with a short greeting and your first question."},...hist],t=>{if(t){el.classList.remove("typing");el.textContent=t}box.scrollTop=box.scrollHeight});
  busy=false;
  if(r.ok){hist.push({role:"assistant",content:r.text,ms:performance.now()-t0});renderMsgs();if(S.autospeak!==false)speak(r.text)}else{el.classList.remove("typing");el.textContent=ERR[r.code]||ERR.error}
}
async function send(){const t=$("#t-in").value.trim();if(!t||busy)return;const asked=askedWord(t);if(asked)addVocab(asked);$("#t-in").value="";if(!hist.length)hist.push({role:"assistant",content:"Hi! Let's talk."});hist.t0=hist.t0||Date.now();hist.push({role:"user",content:t});renderMsgs();await ask()}
async function micToText(){const b=$("#mic");if(Voice.recording){Voice.recording.finish();return}
  if(Voice.state.stt!=="ready"){if(!S.voiceReady){toast("Activa la voz en Ajustes para hablar");return}toast("Cargando el reconocimiento de voz…")}
  b.classList.add("rec");b.textContent="⏹";const audio=await Voice.record({vad:true,silenceMs:1300});b.classList.remove("rec");b.textContent="🎙";
  if(!audio||!audio.length)return;b.textContent="…";try{const t=await Voice.transcribe(audio);const ti=$("#t-in");if(t&&ti){ti.value=(ti.value?ti.value+" ":"")+t;ti.focus()}else if(!t)toast("No te escuché bien, intenta otra vez")}catch(e){toast("No pude usar el reconocimiento de voz")}b.textContent="🎙"}
async function endTalk(){const said=hist.filter(m=>m.role==="user").map(m=>m.content);if(!said.length){toast("Conversa un poco primero");return}
  $("#t-fb").innerHTML=`<div class="card"><span class="muted">Revisando tu conversación…</span></div>`;
  const sess=coachSession("chat",talkMode,hist),t0=hist.t0||Date.now();
  const res=await window.api.feedback(`You are an English teacher for a Spanish-speaking A2 student. ${PROFILE}
Here is a written conversation between Max (the tutor) and the student (scenario: ${SCEN.find(x=>x.id===talkMode).t}):
${transcriptOf(hist)}
Judge ONLY the student's lines. ${COACH_JSON}`);
  if(!res.ok){$("#t-fb").innerHTML=`<div class="banner">${esc(ERR[res.code]||ERR.error)}</div>`;return}
  const r=res.data,p=r.puntajes||{},nE=(r.errores||[]).length,prev=avgScores((S.scores||[]).slice(-3)),xp=40;
  S.errors=mergeErr(r.errores||[],S.errors);S.chats=(S.chats||0)+1;S.chatLog=S.chatLog||{};S.chatLog[TODAY]=1;S.scores=S.scores||[];S.scores.push({date:TODAY,...p});addMin(15);addXP(xp,"Conversación");coachFinish(sess,r,p);
  $("#t-fb").innerHTML=sessionReport({r,p,prev:S.scores.length>1?prev:null,said,secs:Math.max(60,Math.round((Date.now()-t0)/1000)),newWords:0,xp,again:`<button class="btn primary" id="t-again">↻ Nueva conversación</button>`});
  const ag=$("#t-again");if(ag)ag.onclick=()=>{hist=[];newAngle();VIEWS.talk()};
  checkAch();$("#t-fb").scrollIntoView({behavior:"smooth"})}

/* ---------- Progress ---------- */
VIEWS.progress=()=>{
  const lessonsDone=Object.keys(S.lessons).length;
  const sk=[["Speaking",Math.min(100,(S.chats||0)*4+20)],["Listening",Math.min(100,(S.dictations||0)*1.5+35)],["Gramática",Math.min(100,lessonsDone*3+25)],["Vocabulario",Math.min(100,learned()*1.2+20)],["Writing",Math.min(100,Object.keys(S.lessons).filter(k=>/-w$/.test(k)).length*8+20)]];
  let heat=["L","M","X","J","V","S","D"].map(h=>`<span class="h">${h}</span>`).join("");
  for(let d=new Date(2026,9,12);d<=END;d.setDate(d.getDate()+1)){if(d<START){heat+='<span class="d blank"></span>';continue}const x=S.xpLog[key(d)]||0;heat+=`<span class="d ${x>=100?"l3":x>=50?"l2":x>0?"l1":""} ${key(d)===TODAY?"today":""}" title="${d.getDate()} ${MON[d.getMonth()]}: ${x} XP">${d.getDate()}</span>`}
  const mins=Object.values(S.minutes).reduce((a,b)=>a+b,0);
  $("#main").innerHTML=`<div class="screen">
    <div class="head"><div><h1>Tu progreso</h1><p>Del 17 de octubre al 3 de enero. Meta: B1 y entrevista de Disney.</p></div></div>
    <div class="grid g4">
      <div class="card stat"><svg class="ic"><use href="#i-flame"/></svg><div><b>${streak()}</b><span>racha actual</span></div></div>
      <div class="card stat"><span class="ic" style="background:var(--blue-soft)">⏱️</span><div><b>${Math.round(mins/60*10)/10}</b><span>horas practicadas</span></div></div>
      <div class="card stat"><span class="ic" style="background:var(--green-soft)">📘</span><div><b>${lessonsDone}</b><span>lecciones de 55</span></div></div>
      <div class="card stat"><span class="ic" style="background:var(--panel-3)">💬</span><div><b>${S.chats||0}</b><span>conversaciones</span></div></div>
    </div>
    <div class="grid g2">
      <div class="card"><h3>Habilidades</h3>${sk.map(s=>`<div class="skill"><span>${s[0]}</span><div class="bar"><i style="width:${Math.round(s[1])}%"></i></div><b>${Math.round(s[1])}%</b></div>`).join("")}<p class="muted" style="margin:0;font-size:13px">Suben con lo que practicas en cada sección.</p></div>
      <div class="card"><h3>Calendario</h3><div class="heat">${heat}</div></div>
    </div>
    ${coachCard()}
    <div class="card"><h3>Nivel</h3><div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Gramática</th><th>Lectura</th><th>Listening</th><th>Speaking</th><th>Nivel</th></tr></thead><tbody>
      <tr><td>17 oct</td><td>8/20</td><td>3/4</td><td>75%</td><td>Fluidez 3 · Gram. 2 · Vocab. 2</td><td><span class="pill">A2</span></td></tr>
      <tr><td>29 nov</td><td colspan="5" class="muted">Re-test</td></tr><tr><td>31 dic</td><td colspan="5" class="muted">Test final</td></tr></tbody></table></div></div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Logros</h3><span class="pill gold">${Object.keys(S.ach||{}).length} / ${ACH.length}</span></div><div class="achs">${ACH.map(a=>{const got=(S.ach||{})[a.id];return`<div class="achc ${got?"got":""}" title="${esc(a.d)}"><span class="e">${got?a.e:"🔒"}</span><b>${esc(a.t)}</b><small>${esc(a.d)}</small></div>`}).join("")}</div></div>
    <div class="card"><h3>Mis errores frecuentes</h3>${S.errors.length?errTable(S.errors):'<p class="muted">Aún no hay errores guardados.</p>'}</div>
  </div>`};

/* ---------- Settings ---------- */
VIEWS.settings=async()=>{
  const s=await window.api.getSettings(),vc=Voice.cfg(),cache=await window.api.voiceCache();
  const prov=[["ollama","🦙","Ollama","Gratis. Corre en tu PC, sin internet y sin cuenta."],["claude","✳️","Claude (API)","La mejor calidad. Pagas solo lo que usas (centavos por conversación)."],["none","📴","Sin IA","Lecciones, tarjetas, historia, juegos y pronunciación siguen funcionando."]];
  $("#main").innerHTML=`<div class="screen" style="max-width:820px">
    <div class="head"><div><h1>Ajustes</h1><p>Todo se guarda solo en este computador.</p></div></div>
    <div class="card"><h3>Tu perfil</h3><label class="label" for="s-name">Nombre</label><input id="s-name" value="${esc(S.name)}">
      <label class="label">Tema</label><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ${S.theme==="dark"?"primary":""}" data-theme-set="dark">🌙 Oscuro</button><button class="btn ${S.theme==="light"?"primary":""}" data-theme-set="light">☀️ Claro</button></div>
      <label class="toggle"><input type="checkbox" id="s-sound" ${S.sound===false?"":"checked"}> Sonidos y celebraciones</label></div>
    <div class="card"><h3>Cerebro de la conversación</h3><p class="muted" style="margin:0">Es quien te responde en las llamadas, el chat y las correcciones. No necesitas la membresía de Claude: elige uno.</p>
      <div class="prov">${prov.map(p=>`<button class="provc" data-prov="${p[0]}" aria-pressed="${s.provider===p[0]}"><span class="e">${p[1]}</span><b>${p[2]}</b><small>${p[3]}</small></button>`).join("")}</div>
      <div id="prov-ollama" ${s.provider==="ollama"?"":"hidden"} class="sub">
        <ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px"><li>Descarga e instala Ollama desde <a href="https://ollama.com/download" style="color:var(--blue)">ollama.com/download</a>.</li><li>Abre una terminal (Windows + R → <code>cmd</code>) y escribe <code>ollama pull llama3.2</code>. Descarga unos 2 GB una sola vez.</li><li>Toca <em>Probar conexión</em>.</li></ol>
        <label class="toggle"><input type="checkbox" id="s-sshon" ${s.sshOn?"checked":""}> Mi Ollama está en un servidor o VM (la app abre el túnel sola)</label>
        <div id="s-sshbox" class="sub" ${s.sshOn?"":"hidden"} style="border:0;padding-top:0">
          <label class="label" for="s-sshcmd">Pega el comando ssh que usas para entrar a la VM</label>
          <input id="s-sshcmd" class="mono" spellcheck="false" placeholder='ssh -i "C:\Users\tu\llave.pem" usuario@20.80.31.111' value="${s.ssh?esc(`ssh -i "${s.ssh.key}" ${s.ssh.host}`):""}">
          <p class="muted" style="margin:0;font-size:13px" id="s-sshinfo">${s.ssh?`✓ Servidor ${esc(s.ssh.host)} · llave ${esc(s.ssh.key.split(/[\\/]/).pop())}. Busco solo la dirección del contenedor de Ollama cada vez que me conecto.`:"Uso la llave solo para abrir el túnel en tu PC; no se envía a ningún lado."}</p>
        </div>
        <div class="row2" id="s-urlrow"><div ${s.sshOn?`style="display:none"`:""}><label class="label" for="s-ourl">Dirección</label><input id="s-ourl" value="${esc(s.ollama.url)}"></div><div><label class="label" for="s-omodel">Modelo</label><input id="s-omodel" list="s-olist" value="${esc(s.ollama.model)}"><datalist id="s-olist"></datalist></div></div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn primary" id="s-otest">Probar conexión</button><span class="muted" id="s-ostatus"></span></div>
        <p class="muted" style="margin:0;font-size:13px">Si tu PC tiene 16 GB de RAM o más, <code>qwen2.5:7b</code> o <code>llama3.1:8b</code> conversan mejor.</p></div>
      <div id="prov-claude" ${s.provider==="claude"?"":"hidden"} class="sub">
        <ol style="margin:0;padding-left:20px"><li>Entra a <a href="https://console.anthropic.com/settings/keys" style="color:var(--blue)">console.anthropic.com</a> y crea una cuenta (es distinta a la membresía).</li><li>En <em>Billing</em>, agrega saldo (unos pocos dólares duran meses).</li><li>En <em>API Keys</em>, crea una clave y pégala aquí.</li></ol>
        <label class="label" for="s-key">Clave de API</label><input id="s-key" type="password" autocomplete="off" placeholder="${s.hasKey?"•••••••• guardada (pega otra para cambiarla)":"sk-ant-..."}">
        <label class="label" for="s-model">Modelo</label><select id="s-model">${Object.entries(s.models).map(([id,m])=>`<option value="${id}" ${id===s.model?"selected":""}>${esc(m.label)}</option>`).join("")}</select>
        <div style="display:flex;gap:10px;align-items:center"><button class="btn primary" id="s-save">Guardar</button><span class="muted" id="s-status">${s.hasKey?"✓ Clave guardada":"Aún no hay clave"}</span></div></div>
    </div>
    <div class="card"><h3>Voz</h3>
      <p class="muted" style="margin:0" id="v-status">${S.voiceReady?"✓ Voz natural y reconocimiento instalados ("+Math.round(cache.bytes/1e6)+" MB). Funcionan sin internet.":"La voz natural y el reconocimiento se descargan una vez (unos 170 MB)."}</p>
      ${S.voiceReady?"":`<div><button class="btn gold" id="v-dl">Descargar voces ahora</button></div>`}
      <label class="label">Voz de tu compañero</label><div class="voices">${VOICES.map(v=>`<button class="voicec" data-voice="${v.id}" aria-pressed="${vc.voice===v.id}"><span>${v.e}</span>${esc(v.t)}</button>`).join("")}</div>
      <label class="label" for="v-speed">Velocidad · <span id="v-sv">${vc.speed.toFixed(2)}×</span></label><input id="v-speed" type="range" min="0.7" max="1.2" step="0.05" value="${vc.speed}">
      <label class="label" for="v-stt">Reconocimiento de voz</label><select id="v-stt">${Object.entries(STT_MODELS).map(([id,t])=>`<option value="${id}" ${vc.stt===id?"selected":""}>${t}</option>`).join("")}</select>
      <label class="toggle"><input type="checkbox" id="v-sys" ${vc.neural?"":"checked"}> Usar las voces de Windows en lugar de la voz natural</label>
      ${cache.bytes?`<div><button class="btn" id="v-clear">Borrar voces descargadas (${Math.round(cache.bytes/1e6)} MB)</button></div>`:""}</div>
    <div class="card"><h3>Recordatorio diario</h3>
      <label class="toggle"><input type="checkbox" id="r-on" ${s.reminder.on?"checked":""}> Avisarme todos los días con la frase del día</label>
      <div class="row2"><div><label class="label" for="r-time">Hora</label><input id="r-time" type="time" value="${s.reminder.time}"></div><div style="align-self:end"><button class="btn" id="r-test">Probar notificación</button></div></div>
      <label class="toggle"><input type="checkbox" id="r-tray" ${s.tray?"checked":""}> Al cerrar, quedarme en la bandeja (para poder avisarte)</label>
      <label class="toggle"><input type="checkbox" id="r-login" ${s.openAtLogin?"checked":""}> Iniciar con Windows (oculta, solo para el recordatorio)</label></div>
  </div>`;
  const set=patch=>window.api.setSettings(patch);
  $("#s-name").oninput=e=>{S.name=e.target.value||"Santiago";save()};
  $("#s-sound").onchange=e=>{S.sound=e.target.checked;save();sfx("ok")};
  document.querySelectorAll("[data-theme-set]").forEach(b=>b.onclick=()=>{S.theme=b.dataset.themeSet;document.documentElement.dataset.theme=S.theme;save();VIEWS.settings()});
  document.querySelectorAll("[data-prov]").forEach(b=>b.onclick=async()=>{await set({provider:b.dataset.prov});VIEWS.settings()});
  const so=$("#s-save");if(so)so.onclick=async()=>{const r=await set({key:$("#s-key").value,model:$("#s-model").value});$("#s-key").value="";$("#s-status").textContent=r.hasKey?"✓ Guardado. Ya puedes conversar.":"Falta la clave de API."};
  const sshOn=$("#s-sshon");if(sshOn)sshOn.onchange=async()=>{await set({sshOn:sshOn.checked});VIEWS.settings()};
  const sshCmd=$("#s-sshcmd");if(sshCmd)sshCmd.onchange=async()=>{const r=await set({sshCommand:sshCmd.value});$("#s-sshinfo").textContent=r.sshError?"✗ No entendí ese comando. Debe verse así: ssh -i \"C:\\ruta\\llave.pem\" usuario@IP":"✓ Guardado. Toca Probar conexión."};
  const ot=$("#s-otest");if(ot)ot.onclick=async()=>{const sc=$("#s-sshcmd");if(sc&&sc.value&&!$("#s-sshbox").hidden){const r=await set({sshCommand:sc.value});if(r.sshError){$("#s-ostatus").textContent="✗ Revisa el comando ssh";return}}
    const ou2=$("#s-ourl");await set({ollamaModel:$("#s-omodel").value,...(ou2&&!$("#s-sshon").checked?{ollamaUrl:ou2.value}:{})});$("#s-ostatus").textContent=$("#s-sshon")&&$("#s-sshon").checked?"Abriendo el túnel a tu VM…":"Probando…";const r=await window.api.ollamaTest();
    if(!r.ok){$("#s-ostatus").textContent="✗ "+(r.code==="ssh_fail"?"No pude abrir el túnel: "+(r.message||"revisa el comando y que la VM esté prendida"):(ERR[r.code]||ERR.ollama_off));return}
    $("#s-olist").innerHTML=r.models.map(m=>`<option value="${esc(m)}">`).join("");
    if(!r.models.length){$("#s-ostatus").textContent="Conectado, pero no hay modelos. Escribe: ollama pull llama3.2";return}
    if(r.model)$("#s-omodel").value=r.model;
    const wps=r.tps?r.tps*0.75:0;
    $("#s-ostatus").textContent=`✓ Conectado. Modelo ${r.model||$("#s-omodel").value} listo.`+(r.tps?` Escribe ~${wps.toFixed(0)} palabras por segundo`+(wps<4?" (lento: prueba un modelo más pequeño como qwen2.5:1.5b).":wps<8?" (aceptable para llamadas).":" (rápido)."):"");
    refreshAi()};
  const om=$("#s-omodel");if(om)om.onchange=()=>set({ollamaModel:om.value});
  const ou=$("#s-ourl");if(ou)ou.onchange=()=>set({ollamaUrl:ou.value});
  const vd=$("#v-dl");if(vd)vd.onclick=()=>{enableVoice();go("home")};
  const setV=patch=>{S.voice=Object.assign({},Voice.cfg(),patch);save()};
  document.querySelectorAll("[data-voice]").forEach(b=>b.onclick=()=>{setV({voice:b.dataset.voice});document.querySelectorAll("[data-voice]").forEach(x=>x.setAttribute("aria-pressed",x===b));{const t="Hi Santiago! This is how I sound. Are you ready to practice?";if(S.voiceReady&&Voice.cfg().neural){if(Voice.state.tts!=="ready")toast("Preparando la voz natural… un momento");Voice.sayNatural(t)}else Voice.say(t)}});
  $("#v-speed").oninput=e=>{setV({speed:+e.target.value});$("#v-sv").textContent=(+e.target.value).toFixed(2)+"×"};
  $("#v-speed").onchange=()=>Voice.say("This is my new speed.");
  $("#v-stt").onchange=e=>{setV({stt:e.target.value});toast("Se descargará la próxima vez que hables")};
  $("#v-sys").onchange=e=>setV({neural:!e.target.checked});
  const vcl=$("#v-clear");if(vcl)vcl.onclick=async()=>{if(!confirm("¿Borrar las voces? Tendrás que descargarlas otra vez."))return;await window.api.voiceClear();S.voiceReady=false;save();VIEWS.settings()};
  $("#r-on").onchange=e=>set({reminderOn:e.target.checked});
  $("#r-time").onchange=e=>set({reminderTime:e.target.value});
  $("#r-test").onclick=async()=>{const ok=await window.api.reminderTest();if(!ok)toast("Windows no permite notificaciones ahora")};
  $("#r-tray").onchange=e=>set({tray:e.target.checked});
  $("#r-login").onchange=e=>set({openAtLogin:e.target.checked});
};
document.addEventListener("click",e=>{const a=e.target.closest("a[href^='https://']");if(a){e.preventDefault();window.api.openExternal(a.href)}});



/* ---------- 📒 Mis palabras: words the student asks for ("How do you say…?") ---------- */
// Returns the Spanish word in "How do you say X?" / "¿Cómo se dice X?", or "".
function askedWord(t){const m=String(t).match(/(?:how (?:do|can|would|should) (?:you|i) say|how to say|c[oó]mo se dice|c[oó]mo digo)\s+(.+?)\s*(?:in english|en ingl[eé]s)?\s*[?.!]*$/i);if(!m)return"";const w=m[1].replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g,"").trim();return w&&w.split(/\s+/).length<=6?w:""}
function addVocab(es,en=""){es=String(es).trim().replace(/[¿?¡!.,"“”]+/g,"").trim();if(!es)return;S.vocab=S.vocab||[];const k=es.toLowerCase();const old=S.vocab.find(v=>v.es.toLowerCase()===k);if(old){if(en&&!old.en)old.en=en;old.n=(old.n||1)+1;save();return}S.vocab.unshift({es,en,ex:"",d:TODAY,n:1});save();toast(`📒 Guardé “${es}” en Mis palabras`)}
let vocabBusy=null;
// Translates the saved words that don't have their English yet (one request for all of them).
async function resolveVocab(){if(vocabBusy)return vocabBusy;const pend=(S.vocab||[]).filter(v=>!v.en);if(!pend.length)return;vocabBusy=(async()=>{
  const r=await window.api.feedback(`A Spanish-speaking A2 English student from Colombia asked how to say these Spanish words or phrases in English. The speech recognizer may have small spelling mistakes; use the most likely intended Spanish word.
${pend.map((v,i)=>i+1+". "+v.es).join("\n")}
Return JSON: {"palabras":[{"es":"the Spanish word, correctly spelled","en":"the most common natural English equivalent (if a noun, without article unless needed)","ex":"one short, simple English example sentence using it (max 10 words)"}]} in the same order.`);
  if(r.ok&&r.data&&Array.isArray(r.data.palabras))pend.forEach((v,i)=>{const x=r.data.palabras[i];if(x&&x.en){v.en=String(x.en).trim();v.ex=String(x.ex||"").trim();if(x.es)v.es=String(x.es).trim()}});
  save();return r.ok})().finally(()=>{vocabBusy=null});return vocabBusy}
VIEWS.vocab=async()=>{
  const st=await window.api.getSettings(),noAi=st.provider==="none";
  const V=S.vocab||[],due=dueCards("vocab").length;
  $("#main").innerHTML=`<div class="screen">
    <div class="head"><div><h1>Mis palabras</h1><p>Busca cualquier palabra, en inglés o en español, y guárdala. También puedes <b>tocar cualquier palabra en inglés</b> en el chat, la llamada, la historia o las clases.</p></div>${V.some(v=>v.en)?`<button class="btn gold" data-nav="cards" data-arg="vocab">🃏 Repasar${due?` (${due})`:""}</button>`:""}</div>
    <div class="card"><span class="label">📖 Diccionario</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="vc-in" placeholder="Escribe una palabra: went, mariposa, look for…" autocomplete="off" style="flex:1;min-width:220px"><button class="btn" id="vc-mic" title="Dila en español">🎙 En español</button><button class="btn primary" id="vc-go">Buscar</button></div>
      ${noAi?`<p class="muted" style="margin:0">Sin IA solo conozco las 500 palabras más comunes y los verbos. Elige una IA en <button class="btn" data-nav="settings" style="padding:2px 10px">Ajustes</button> para buscar cualquier palabra.</p>`:""}
      <div id="vc-res"></div></div>
    <div class="card"><span class="label">${V.length} ${V.length===1?"palabra guardada":"palabras guardadas"}</span>${V.length?`<div class="vlist">${V.map((v,i)=>`<div class="vrow"><div>${v.en?`<b style="color:var(--gold)">${esc(v.en)}</b> <span class="muted">→</span> <b>${esc(v.es)}</b>`:`<b>${esc(v.es)}</b> <span class="muted">→ ${noAi?"sin traducir":"traduciendo…"}</span>`}${v.forms?`<small>${esc(formsLine(v.forms))}</small>`:""}${v.ex?`<small>${esc(v.ex)}</small>`:""}</div>${v.en?`<button class="btn" data-say="${esc(v.en)}" title="Escuchar">🔊</button>`:""}<button class="btn ghost" data-vdel="${i}" title="Borrar">✕</button></div>`).join("")}</div>`:`<p class="muted" style="margin:0">Aún no hay palabras. Búscala arriba, toca una palabra en inglés mientras lees, o en una llamada toca <b>🇪🇸 ¿Cómo se dice…?</b>.</p>`}</div>
  </div>`;
  document.querySelectorAll("[data-vdel]").forEach(b=>b.onclick=()=>{S.vocab.splice(+b.dataset.vdel,1);save();VIEWS.vocab()});
  const find=async w=>{w=String(w||"").trim();if(!w)return;$("#vc-res").innerHTML=`<p class="muted" style="margin:10px 0 0"><span class="dots"><i></i><i></i><i></i></span> Buscando “${esc(w)}”…</p>`;
    const e=await lookupWord(w).catch(()=>null);if(view!=="vocab")return;
    $("#vc-res").innerHTML=`<div class="lk-inline">${entryHTML(e,{saved:isSaved(e)})}</div>`;
    const sv=$("#lk-save");if(sv)sv.onclick=()=>{saveEntry(e);VIEWS.vocab()};
    if(e&&e.en&&!e.offline)speak(e.en)};
  $("#vc-go").onclick=()=>find($("#vc-in").value);$("#vc-in").onkeydown=e=>{if(e.key==="Enter")find($("#vc-in").value)};
  $("#vc-mic").onclick=async()=>{if(Voice.state.stt!=="ready"&&!S.voiceReady){toast("Activa la voz en Ajustes para hablar");return}const b=$("#vc-mic");b.textContent="🔴 Te escucho…";b.disabled=true;Voice.stop();
    try{const a=await Voice.record({vad:true,silenceMs:900,maxMs:8000});b.textContent="Entendiendo…";const t=a?await Voice.transcribe(a,{lang:"es"}):"";const w=spanishWord(t)||t;if(w){$("#vc-in").value=w.replace(/[¿?¡!.]+/g,"").trim();b.textContent="🎙 En español";b.disabled=false;find($("#vc-in").value);return}else toast("No te escuché. Intenta otra vez.")}catch{toast("No pude usar el reconocimiento en español. Revisa tu internet la primera vez.")}
    b.textContent="🎙 En español";b.disabled=false};
  if(!noAi&&V.some(v=>!v.en)){await resolveVocab();if(view==="vocab"&&!$("#vc-res").innerHTML)VIEWS.vocab()}
};
// From a Spanish transcription of "How do you say <word>", keeps the word.
function spanishWord(t){let x=String(t||"").toLowerCase().replace(/[¿?¡!.,"“”«»]/g," ").replace(/\s+/g," ").trim();if(!x)return"";
  const ms=[...x.matchAll(/\b(?:say|sei|sey|sai|zei|dice|decir|digo|dices)\b/g)];if(ms.length){const m=ms[ms.length-1];x=x.slice(m.index+m[0].length).trim()}
  x=x.replace(/\s*\b(?:in|en|em)\s+(?:english|ingl[eé]s|inglis|inglich)\b.*$/,"").replace(/^(?:la palabra|the word)\s+/,"").trim();
  return x&&x.split(" ").length<=5?x:""}


/* ---------- Connection and voice status (sidebar): everything connects by itself on open ---------- */
let AIST = { s: "wait", t: "Conectando…" };
function paintStatus() {
  const a = $("#st-ai"), v = $("#st-voice"); if (!a || !v) return;
  a.dataset.s = AIST.s; a.querySelector("span").textContent = AIST.t; a.title = AIST.tip || "";
  const st = Voice.state, neural = Voice.cfg().neural;
  let vs = "wait", vt = "Voz sin descargar";
  if (!neural) { vs = "warn"; vt = "Voz de Windows (robótica)"; }
  else if (st.tts === "ready" && st.stt === "ready") { vs = "ok"; vt = "Voz natural lista"; }
  else if (st.tts === "error" || st.stt === "error") { vs = "bad"; vt = "Voz con error"; }
  else if (st.tts === "loading" || st.stt === "loading") { vs = "wait"; vt = "Cargando la voz…"; }
  else if (S.voiceReady) { vs = "wait"; vt = "Iniciando la voz…"; }
  v.dataset.s = vs; v.querySelector("span").textContent = vt;
}
let aiTries = 0;
async function refreshAi() {
  AIST = { s: "wait", t: "Conectando con la IA…" }; paintStatus();
  const r = await window.api.aiStatus().catch(() => ({ ok: false }));
  if (r.provider === "none") AIST = { s: "warn", t: "Sin IA: elígela en Ajustes" };
  else if (r.ok) { AIST = { s: "ok", t: r.provider === "claude" ? "Claude listo" : "IA lista · " + r.model, tip: "Conectada. No necesitas probar la conexión." }; aiTries = 0; }
  else {
    AIST = { s: "bad", t: r.code === "ssh_fail" ? "No encuentro tu VM" : r.code === "ollama_model" ? "Falta un modelo en Ollama" : "IA sin conexión", tip: ERR[r.code] || "" };
    if (aiTries++ < 4) setTimeout(refreshAi, 12000);
  }
  paintStatus();
}
Voice.on(paintStatus);
document.addEventListener("click", (e) => { if (e.target.closest("#st-ai")) { if (AIST.s === "bad") refreshAi(); else go("settings"); } });

function formsLine(f){return f.be?"am/is/are · was/were · been · being":`${f.base} · ${f.past} · ${f.pp} · ${f.ing}`}
