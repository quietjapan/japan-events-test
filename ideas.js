// ✨ 테스트: 벤치마크 아이디어 1~5 (이번 주 마감·새로 추가 줄 / 장르 칩 보조·작품명 자동완성 / 내 캘린더·구독 / 목록+지도 한 화면)
(function(){
  const SITE="https://quietjapan.github.io/japan-events-test/";
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const pd=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
  const md=s=>s?`${+s.slice(5,7)}/${+s.slice(8,10)}`:"";
  const SPLITQ=matchMedia("(min-width:1024px)");window.QJ_SPLIT=()=>SPLITQ.matches;
  const list=document.getElementById("list"),qmap=document.getElementById("qmap");
  // ── 5. 목록+지도 래퍼 (데스크톱: 왼쪽 목록, 오른쪽 지도) ──
  const wrap=document.createElement("div");wrap.className="lmwrap";const left=document.createElement("div");left.className="lmlist";
  list.parentNode.insertBefore(wrap,list);wrap.appendChild(left);left.appendChild(list);if(qmap)wrap.appendChild(qmap);
  SPLITQ.addEventListener("change",()=>{window.QJ_repaintView&&QJ_repaintView();fab()});
  document.addEventListener("mouseover",ev=>{const c=ev.target.closest&&ev.target.closest(".lmlist .card[data-i]");const i=c?+c.dataset.i:null;if(i===hov)return;hov=i;window.QJMAP&&QJMAP.hl(i,i!=null)});let hov=null;
  // 모바일 플로팅 버튼: 지도로 보기 ↔ 목록으로 (목록 스크롤 위치 기억)
  const fb=document.createElement("button");fb.type="button";fb.id="mapfab";fb.className="mapfab";document.body.appendChild(fb);let saveY=0;
  function fab(){const v=window.QJ_view?QJ_view():"list";fb.hidden=SPLITQ.matches;fb.textContent=v==="map"?"📋 목록으로":"🗺️ 지도로 보기";fb.setAttribute("aria-label",fb.textContent)}
  fb.onclick=()=>{const v=QJ_view();if(v==="map"){QJ_setView("list");fab();requestAnimationFrame(()=>scrollTo(0,saveY))}else{saveY=scrollY;QJ_setView("map");fab();const s=document.getElementById("qmap");if(s){const y=s.getBoundingClientRect().top+scrollY-70;scrollTo(0,Math.max(0,y))}window.gtag&&gtag("event","map_fab")}};
  document.addEventListener("click",ev=>{if(ev.target.closest(".vtoggle button"))setTimeout(fab,0)});
  setTimeout(fab,0);
  // ── 1. 이번 주에 끝나요 / 이번 업데이트에 추가 ──
  const strips=document.createElement("section");strips.id="strips";strips.className="strips";strips.setAttribute("aria-label","이번 주 하이라이트");
  const cnt=document.getElementById("count");const vt=document.querySelector(".vtoggle");(vt||cnt).parentNode.insertBefore(strips,vt||cnt);
  let S={};const chip=(e,i,k,lab)=>`<button type="button" class="stc" data-k="${k}" data-i="${i}">${e.thumb_small?`<img src="${esc(e.thumb_small)}" alt="" loading="lazy" width="56" height="56">`:`<span class="stnoimg">${esc((e.category||"")[0])}</span>`}<span class="stx"><em class="${k==="end"?"stdn":"stnew"}">${lab}</em><b>${esc(e.title_ko)}</b><small>${esc(e.venue?e.venue.replace(/\s*\(.*$/,""):e.category)}</small></span></button>`;
  window.QJ_afterRender=o=>{S=o;const T=window.QJ_TODAY;const isNat=e=>(e.region||"")==="all"||e.area==="전국";
    const ending=o.units.filter(({e,x})=>!isNat(e)&&!e._dates&&e.end&&(x.k==="now"||x.k==="ending")).map(({e})=>({e,n:Math.round((pd(e.end)-T)/864e5)})).filter(a=>a.n>=0&&a.n<=7).sort((a,b)=>a.n-b.n);
    const fresh=o.units.filter(({e})=>o.last&&(e.added===o.last||(e._dates||[]).some(d=>d.added===o.last))).map(({e})=>e).sort((a,b)=>isNat(a)-isNat(b));
    S.ending=ending;S.fresh=fresh;
    const row=(id,h,sub,items)=>items.length?`<div class="strow" id="${id}"><div class="sthd"><b>${h}</b><span>${sub}</span></div><div class="stsc">${items}</div></div>`:"";
    strips.innerHTML=row("st-end","🔥 이번 주에 끝나요",`${ending.length}건 · 종료 7일 안`,ending.map((a,i)=>chip(a.e,i,"end",a.n===0?"오늘 종료":`D-${a.n}`)).join(""))
      +row("st-new","✨ 이번 업데이트에 추가",`${md(o.last)} 업데이트 · ${fresh.length}건`,fresh.map((e,i)=>chip(e,i,"new",isNat(e)?"전국 공통":"NEW")).join(""));
    strips.hidden=!strips.innerHTML;fab()};
  strips.onclick=ev=>{const b=ev.target.closest(".stc");if(!b||!S.openDetail)return;const e=b.dataset.k==="end"?S.ending[+b.dataset.i].e:S.fresh[+b.dataset.i];if(e)S.openDetail(e);window.gtag&&gtag("event","strip_click",{strip:b.dataset.k})};
  // ── 2. 작품명 자동완성 (한국어·일본어 원제) ──
  const qi=document.getElementById("q");qi.setAttribute("autocomplete","off");qi.setAttribute("role","combobox");qi.setAttribute("aria-autocomplete","list");qi.setAttribute("aria-controls","qac");qi.setAttribute("aria-expanded","false");
  qi.placeholder="🔍 작품명 검색 (한국어·일본어, 예: 체인소맨 / チェンソーマン)";
  const ac=document.createElement("ul");ac.id="qac";ac.className="qac";ac.setAttribute("role","listbox");ac.hidden=true;qi.parentNode.style.position="relative";qi.parentNode.appendChild(ac);let AC=[],ai=-1;
  const norm=s=>String(s||"").normalize("NFKC").toLowerCase();
  const hlt=(s,q)=>{const i=norm(s).indexOf(q);return i<0||norm(s).length!==String(s).length?esc(s):esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+q.length))+"</mark>"+esc(s.slice(i+q.length))};
  function sug(){const q=norm(qi.value.trim());if(!q||!window.QJ_EV){ac.hidden=true;qi.setAttribute("aria-expanded","false");return}const seen=new Set();AC=[];
    for(const e of QJ_EV()){const k=e.title_ko;if(seen.has(k))continue;const hk=norm(k).includes(q),hj=norm(e.title_ja).includes(q);if(hk||hj){seen.add(k);AC.push({e,s:hk?0:1})}if(AC.length>=30)break}
    AC=AC.sort((a,b)=>a.s-b.s||norm(a.e.title_ko).indexOf(q)-norm(b.e.title_ko).indexOf(q)).slice(0,8);ai=-1;
    ac.innerHTML=AC.map((o,i)=>`<li role="option" id="qac${i}" data-i="${i}"><b>${hlt(o.e.title_ko,q)}</b>${o.e.title_ja?`<small lang="ja">${hlt(o.e.title_ja,q)}</small>`:""}</li>`).join("");ac.hidden=!AC.length;qi.setAttribute("aria-expanded",String(!!AC.length))}
  const pick=i=>{const o=AC[i];if(!o)return;ac.hidden=true;window.QJ_setQ&&QJ_setQ(o.e.title_ko);window.gtag&&gtag("event","search_pick",{q:o.e.title_ko})};
  qi.addEventListener("input",sug);qi.addEventListener("focus",sug);qi.addEventListener("blur",()=>setTimeout(()=>{ac.hidden=true},150));
  qi.addEventListener("keydown",ev=>{if(ac.hidden)return;if(ev.key==="ArrowDown"||ev.key==="ArrowUp"){ev.preventDefault();ai=(ai+(ev.key==="ArrowDown"?1:-1)+AC.length)%AC.length;ac.querySelectorAll("li").forEach((l,i)=>l.classList.toggle("on",i===ai));qi.setAttribute("aria-activedescendant","qac"+ai)}else if(ev.key==="Enter"&&ai>=0){ev.preventDefault();pick(ai)}else if(ev.key==="Escape")ac.hidden=true});
  ac.addEventListener("mousedown",ev=>{const l=ev.target.closest("li");if(l){ev.preventDefault();pick(+l.dataset.i)}});
  // ── 3. 내 캘린더에 넣기 (구글 캘린더 / .ics) + 구독 ──
  const ymd=s=>s.replace(/-/g,"");const nx=s=>{const d=pd(s);d.setDate(d.getDate()+1);return`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`};
  const span=e=>{const s=e._dates?e._dates[0].start:e.start;const en=e._dates?(e._dates[0].end||s):(e.end||s);return[s,en]};
  function gcal(e){const[s,en]=span(e);const p=new URLSearchParams({action:"TEMPLATE",text:e.title_ko,dates:`${ymd(s)}/${nx(en)}`,details:`${e.summary_ko||""}\n공식: ${e.official_url||""}\n오시카츠 재팬: ${SITE}`,location:e.venue||"",ctz:"Asia/Tokyo"});return"https://calendar.google.com/calendar/render?"+p.toString()}
  const ie=s=>String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
  function ics(e){const[s,en]=span(e);const st=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");return["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//quietjapan//japan-events-test//KO","BEGIN:VEVENT",`UID:${ymd(s)}-${Math.abs([...e.title_ko].reduce((h,c)=>h*31+c.charCodeAt(0)|0,7))}@quietjapan.github.io`,`DTSTAMP:${st}`,`DTSTART;VALUE=DATE:${ymd(s)}`,`DTEND;VALUE=DATE:${nx(en)}`,`SUMMARY:${ie(e.title_ko)}`,`LOCATION:${ie(e.venue)}`,`DESCRIPTION:${ie((e.summary_ko||"")+"\n공식: "+(e.official_url||""))}`,e.official_url?`URL:${e.official_url}`:"","END:VEVENT","END:VCALENDAR"].filter(Boolean).join("\r\n")+"\r\n"}
  const CE=[];window.QJ_calBtns=e=>{if(!e||!e.start)return"";const n=CE.push(e)-1;return`<a class="dcal" href="${esc(gcal(e))}" target="_blank" rel="noopener">📅 구글 캘린더에 넣기</a><button type="button" class="dics" data-ce="${n}">⬇️ .ics (아이폰·아웃룩)</button>`};
  function dl(e){const b=new Blob([ics(e)],{type:"text/calendar;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=(e.title_ko||"event").replace(/[\\/:*?"<>|]/g,"").slice(0,40)+".ics";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);window.gtag&&gtag("event","add_calendar",{type:"ics",item:e.title_ko})}
  document.addEventListener("click",ev=>{const b=ev.target.closest(".dics");if(b){ev.stopPropagation();const e=CE[+b.dataset.ce];if(e)dl(e);return}
    const g=ev.target.closest(".dcal");if(g){window.gtag&&gtag("event","add_calendar",{type:"google"});return}
    const c=ev.target.closest(".card .cadd");const old=document.querySelector(".capop");
    if(old&&!ev.target.closest(".capop")){old.remove();if(c&&old.dataset.for===c.dataset.ci){ev.stopPropagation();return}}
    if(!c)return;ev.stopPropagation();const e=(window.QJ_cards?QJ_cards():[])[+c.dataset.ci];if(!e)return;
    const p=document.createElement("div");p.className="capop";p.dataset.for=c.dataset.ci;p.setAttribute("role","menu");p.innerHTML=`<b>📅 내 캘린더에 넣기</b>${QJ_calBtns(e)}`;document.body.appendChild(p);const r=c.getBoundingClientRect();p.style.top=(r.bottom+scrollY+6)+"px";p.style.left=Math.max(8,Math.min(r.right+scrollX-p.offsetWidth,innerWidth-p.offsetWidth-8))+"px"},true);
  // 구독 UI
  const sub=document.createElement("details");sub.className="subs";sub.id="subs";
  const F=r=>`${SITE}feeds/${r}.ics`,W=r=>F(r).replace(/^https:/,"webcal:");
  const RG=[["tokyo","🗼 도쿄"],["osaka","🏯 오사카"],["fukuoka","🍜 후쿠오카"],["nationwide","🗾 전국 공통"]];
  sub.innerHTML=`<summary>📅 일정 구독하기 <span>내 캘린더·RSS에 자동으로 들어와요</span></summary><div class="subb"><p>구독해 두면 월·목 업데이트 때 새 행사가 내 캘린더에 저절로 들어와요.</p>${RG.map(([r,l])=>`<div class="subr"><b>${l}</b><a href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(W(r))}" target="_blank" rel="noopener">구글 캘린더</a><a href="${W(r)}">아이폰·맥</a><button type="button" data-u="${F(r)}">주소 복사</button></div>`).join("")}<div class="subr"><b>📰 RSS</b><a href="rss.xml" target="_blank" rel="noopener">새로 추가된 행사 RSS</a><button type="button" data-u="${SITE}rss.xml">주소 복사</button></div></div>`;
  const main=document.querySelector("main.wrap");main.appendChild(sub);
  sub.addEventListener("click",async ev=>{const b=ev.target.closest("button[data-u]");if(!b)return;try{await navigator.clipboard.writeText(b.dataset.u);b.textContent="복사됐어요 ✓"}catch(x){prompt("주소를 복사해 주세요",b.dataset.u)}setTimeout(()=>b.textContent="주소 복사",1600)});
  sub.addEventListener("toggle",()=>{if(sub.open)window.gtag&&gtag("event","open_subscribe")});
})();
