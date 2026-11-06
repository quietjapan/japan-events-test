/* 여행 날짜 공유 링크·표시줄, 마감 D-day, 북마크 일괄 .ics */
(function(){
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
var fr=document.getElementById("from"),to=document.getElementById("to"),bar=document.getElementById("tripbar"),tx=document.getElementById("triptx"),tb=document.getElementById("tripbtn");
var md=function(d){var m=/^\d{4}-(\d{2})-(\d{2})$/.exec(d);return m?(+m[1])+"/"+(+m[2]):""};
function sync(){var f=fr.value,t=to.value,on=!!(f||t);bar.hidden=!on;if(tb){tb.classList.toggle("on",on);tb.setAttribute("aria-pressed",on)}
  if(on)tx.innerHTML="✈️ <b>"+(md(f)||"…")+" ~ "+(md(t)||"…")+"</b> 기간에 열리는 행사만 보는 중";
  var u=new URL(location.href);f?u.searchParams.set("from",f):u.searchParams.delete("from");t?u.searchParams.set("to",t):u.searchParams.delete("to");history.replaceState(history.state,"",u)}
if(fr&&to){fr.addEventListener("change",sync);to.addEventListener("change",sync);document.getElementById("rreset").addEventListener("click",sync);
  document.getElementById("tripx").onclick=function(){fr.value=to.value="";fr.dispatchEvent(new Event("change"));sync()};
  document.getElementById("tripcopy").onclick=function(ev){var b=ev.currentTarget;(navigator.clipboard?navigator.clipboard.writeText(location.href):Promise.reject()).then(function(){b.textContent="✓ 복사됨"},function(){b.textContent="주소창 링크를 공유해 주세요"});setTimeout(function(){b.textContent="🔗 링크 복사"},1800)};
  if(tb)tb.onclick=function(){var d=document.getElementById("fmore");if(d){d.open=true;d.scrollIntoView({block:"nearest",behavior:"smooth"})}setTimeout(function(){try{fr.showPicker?fr.showPicker():fr.focus()}catch(e){fr.focus()}},250)};
  var P=new URLSearchParams(location.search),re=/^\d{4}-\d{2}-\d{2}$/,pf=P.get("from")||"",pt=P.get("to")||"";
  if(re.test(pf)||re.test(pt)){var n=0,iv=setInterval(function(){if(window.QJ_cards&&QJ_cards().length||++n>60){clearInterval(iv);if(re.test(pf))fr.value=pf;if(re.test(pt))to.value=pt;fr.dispatchEvent(new Event("change"));sync()}},100)}}
var _rf=window.resetFilters;if(_rf)window.resetFilters=function(){_rf.apply(this,arguments);sync()};
/* 마감 D-day */
var dv=document.getElementById("dlv"),dl=document.getElementById("dllist");
var today=new Date(Date.now()+9*36e5).toISOString().slice(0,10);
var RG={tokyo:"도쿄",osaka:"오사카",fukuoka:"후쿠오카",all:"전국"};
if(dv)Promise.all([fetch("data/deadlines.json",{cache:"no-store"}).then(function(r){return r.json()}),fetch("events.json").then(function(r){return r.json()})]).then(function(a){
  var ev=a[1].events||[];
  var rows=(a[0].deadlines||[]).map(function(d){var e=ev.find(function(x){return x.id===d.match||x.title_ko===d.match});return e&&d.deadline>=today?{d:d,e:e,n:Math.round((Date.parse(d.deadline)-Date.parse(today))/864e5)}:null}).filter(Boolean).sort(function(x,y){return x.d.deadline<y.d.deadline?-1:1});
  if(!rows.length)return;
  dl.innerHTML=rows.map(function(r){var id=r.e.id;return '<li><span class="dday'+(r.n<=3?" hot":"")+'">'+(r.n?"D-"+r.n:"D-DAY")+'</span><div><b>'+(id?'<a href="i/'+encodeURIComponent(id)+'/">':"")+esc(r.e.title_ko)+(id?"</a>":"")+'</b><small>'+esc(RG[r.e.region]||"")+' · '+esc(r.d.label)+' '+md(r.d.deadline)+'까지</small></div></li>'}).join("");
  document.getElementById("dlsub").textContent=rows.length+"건 · 가장 빠른 마감 "+md(rows[0].d.deadline);
  dv.hidden=false;
}).catch(function(){});
/* 북마크 일괄 .ics */
var bb=document.getElementById("bmbar"),bt=document.getElementById("bmtx");
function bmu(){if(!window.QJ_bm||!bb)return;var s=QJ_bm();bb.hidden=!s.list.length;if(!bb.hidden)bt.textContent="저장한 행사 "+s.list.length+"건"}
window.QJ_bmu=bmu;var L=document.getElementById("list");bmu();if(L)new MutationObserver(bmu).observe(L,{childList:true});
document.getElementById("bmics").onclick=function(){var s=QJ_bm();if(s.list.length&&window.QJ_icsMulti)QJ_icsMulti(s.list)};
})();
