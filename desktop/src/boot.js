/* ---------- Boot ---------- */
if(!S.seeded){S.seeded=true;S.errors=EXTRA.seedErrors;if(TODAY==="2026-10-17"){S.xp=80;S.xpLog[TODAY]=80;S.minutes[TODAY]=60}save()}
window.api.onNavigate(v=>go(v));
renderRank();go("home");warmVoice();paintStatus();refreshAi();setTimeout(checkAch,1500);
