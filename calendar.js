// 📅 달력 보기: 목록과 같은 필터(지역·카테고리·검색 등) 결과를 월 달력으로 보여줘요. app.js의 render()가 window.QJCAL(rows)를 불러줘요.
(function(){
  const WD=["일","월","화","수","목","금","토"],KEY="qj_view";
  const CC={"팝업스토어":"#e8590c","콜라보카페":"#c2255c","전시·행사":"#1971c2","축제":"#2f9e44","가챠":"#7048e8","쿠지":"#f08c00","플리마켓":"#0c8599","잡지 부록":"#868e96"};
  const col=e=>CC[e.category]||"#b5523b";
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const now=new Date();const TODAY=ymd(now);
  let view="list";try{const v=localStorage.getItem(KEY);if(v==="cal"||v==="map")view=v}catch(x){}
  let ym=[now.getFullYear(),now.getMonth()],ROWS=[],sel=null,dp=0;const DPER=12;
  const list=document.getElementById("list");if(!list)return;
  const bar=document.createElement("div");bar.className="vtoggle toggle";bar.setAttribute("role","group");bar.setAttribute("aria-label","보기 방식");
  bar.innerHTML=`<button type="button" data-v="list">📋 목록</button><button type="button" data-v="cal">📅 달력</button><button type="button" data-v="map">🗺️ 지도</button>`;
  const count=document.getElementById("count");count.parentNode.insertBefore(bar,count);
  const cal=document.createElement("section");cal.id="cal";cal.className="cal";cal.hidden=true;list.parentNode.insertBefore(cal,list.nextSibling);
  // 각 행사가 해당 날짜에 걸리는지: 시리즈는 개별 날짜, 기간이 있으면 시작~종료, 종료일이 없으면(발매·입고) 시작일 하루만
  const spans=e=>e._dates?e._dates.map(d=>[d.start,d.end||d.start]):(e.start?[[e.start,e.end||e.start]]:[]);
  const on=(e,day)=>spans(e).some(([s,en])=>s<=day&&day<=en);
  function paint(){bar.querySelectorAll("button").forEach(b=>{const o=b.dataset.v===view;b.classList.toggle("on",o);b.setAttribute("aria-pressed",o)});
    list.hidden=view!=="list";cal.hidden=view!=="cal";if(view==="cal")draw();window.QJMAP&&QJMAP.show(view==="map");const pg=document.querySelector(".pager:not(.calpager)");if(pg)pg.hidden=view!=="list"}
  function draw(){const [y,m]=ym;const first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),lead=first.getDay();
    const cells=[];for(let i=0;i<lead;i++)cells.push(null);for(let d=1;d<=days;d++)cells.push(ymd(new Date(y,m,d)));while(cells.length%7)cells.push(null);
    const by={};cells.forEach(c=>{if(c)by[c]=ROWS.map((e,i)=>({e,i})).filter(o=>on(o.e,c))});
    if(!sel||sel.slice(0,7)!==ymd(first).slice(0,7))sel=TODAY.slice(0,7)===ymd(first).slice(0,7)?TODAY:null;
    const MAX=3;
    cal.innerHTML=`<div class="calhd"><button type="button" class="calnav" data-d="-1" aria-label="이전 달">‹</button><b>${y}년 ${m+1}월</b><button type="button" class="calnav" data-d="1" aria-label="다음 달">›</button>${(y!==now.getFullYear()||m!==now.getMonth())?`<button type="button" class="caltoday">이번 달</button>`:""}</div>
<div class="calgrid">${WD.map((w,i)=>`<div class="calwd${i===0?" sun":i===6?" sat":""}">${w}</div>`).join("")}${cells.map((c,i)=>{if(!c)return`<div class="calc empty"></div>`;const a=by[c],d=+c.slice(8),wd=i%7;
  return`<button type="button" class="calc${c===TODAY?" today":""}${c===sel?" sel":""}${c<TODAY?" past":""}${wd===0?" sun":wd===6?" sat":""}" data-day="${c}" aria-label="${m+1}월 ${d}일 일정 ${a.length}건"><span class="cald">${d}</span>
<span class="calev">${a.slice(0,MAX).map(o=>`<span class="calbar" style="--c:${col(o.e)}" data-i="${o.i}">${esc(o.e.title_ko)}</span>`).join("")}${a.length>MAX?`<span class="calmore">+${a.length-MAX}</span>`:""}</span>
<span class="caldots">${a.slice(0,4).map(o=>`<i style="background:${col(o.e)}"></i>`).join("")}${a.length>4?`<em>+${a.length-4}</em>`:""}</span></button>`}).join("")}</div>
<div class="calday" id="calday">${dayList()}</div>`}
  function dayList(){if(!sel)return`<p class="calhint">날짜를 누르면 그날 일정을 볼 수 있어요.</p>`;const d=new Date(+sel.slice(0,4),+sel.slice(5,7)-1,+sel.slice(8));
    const a0=ROWS.map((e,i)=>({e,i})).filter(o=>on(o.e,sel));const np=Math.max(1,Math.ceil(a0.length/DPER));dp=Math.min(dp,np-1);const a=a0.slice(dp*DPER,dp*DPER+DPER);
    return`<h3>${d.getMonth()+1}월 ${d.getDate()}일 (${WD[d.getDay()]}) · ${a0.length}건</h3>`+(a.length?`<ul>${a.map(o=>{const e=o.e;const r=e.end&&e.end!==e.start?`${+e.start.slice(5,7)}/${+e.start.slice(8)} ~ ${+e.end.slice(5,7)}/${+e.end.slice(8)}`:`${+e.start.slice(5,7)}/${+e.start.slice(8)}`;
      return`<li><button type="button" class="calitem" data-i="${o.i}" style="--c:${col(e)}"><span class="calcat">${esc(e.category)}</span><b>${esc(e.title_ko)}</b><small>${e._dates?"여러 날짜 개최":esc(r)} · ${esc(e.venue||e.area||"")}</small></button></li>`}).join("")}</ul>${np>1&&window.QJ_pagerHTML?`<nav class="pager calpager" aria-label="페이지">${QJ_pagerHTML(dp,np)}</nav>`:""}`:`<p class="calhint">이날은 일정이 없어요.</p>`)}
  function open(i){const e=ROWS[i];if(!e)return;if(window.QJ_hasDetail&&QJ_hasDetail(e))QJ_openDetail(e);else if(e.official_url)window.open(e.official_url,"_blank","noopener")}
  bar.onclick=ev=>{const b=ev.target.closest("button[data-v]");if(!b||b.dataset.v===view)return;view=b.dataset.v;try{localStorage.setItem(KEY,view)}catch(x){}paint();window.gtag&&gtag("event","select_view",{view:{cal:"달력",map:"지도"}[view]||"목록"})};
  cal.onclick=ev=>{const t=ev.target;const nav=t.closest(".calnav");if(nav){ym=[ym[0],ym[1]+ +nav.dataset.d];const d=new Date(ym[0],ym[1],1);ym=[d.getFullYear(),d.getMonth()];sel=null;draw();return}
    if(t.closest(".caltoday")){ym=[now.getFullYear(),now.getMonth()];sel=null;draw();return}
    const pb=t.closest(".calpager button[data-p]");if(pb){if(pb.disabled)return;dp=+pb.dataset.p;const cd=document.getElementById("calday");cd.innerHTML=dayList();const y=cd.getBoundingClientRect().top+scrollY-12;scrollTo({top:y,behavior:"smooth"});return}
    const it=t.closest(".calitem");if(it){open(+it.dataset.i);return}
    const barEl=t.closest(".calbar");if(barEl&&matchMedia("(min-width:720px)").matches){open(+barEl.dataset.i);return}
    const c=t.closest(".calc[data-day]");if(c){sel=c.dataset.day;dp=0;cal.querySelectorAll(".calc.sel").forEach(x=>x.classList.remove("sel"));c.classList.add("sel");document.getElementById("calday").innerHTML=dayList();
      if(!matchMedia("(min-width:720px)").matches)document.getElementById("calday").scrollIntoView({behavior:"smooth",block:"nearest"})}};
  window.QJCAL=rows=>{ROWS=rows||[];dp=0;if(view==="cal")draw();window.QJMAP&&QJMAP.rows(ROWS)};
  window.QJ_repaintView=paint;
})();
