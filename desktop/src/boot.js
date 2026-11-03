/* ---------- Boot ---------- */
if(!S.seeded){S.seeded=true;S.errors=EXTRA.seedErrors;if(TODAY==="2026-10-17"){S.xp=80;S.xpLog[TODAY]=80;S.minutes[TODAY]=60}save()}
window.api.onNavigate(v=>{checkNewDay();go(v)});
renderRank();go("home");warmVoice();paintStatus();refreshAi();setTimeout(checkAch,1500);
// New day while the app stayed open (it lives in the tray): move today's date, streak and plan forward.
// Home is redrawn right away; any other screen keeps going and picks up the new day on the next navigation.
function checkNewDay(){const d=new Date();if(key(d)===TODAY)return;setDay();renderRank();if(view==="home")go("home")}
setInterval(checkNewDay,60e3);
window.addEventListener("focus",checkNewDay);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkNewDay()});
