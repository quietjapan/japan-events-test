/* 🧳 북마크 공유·여행 플래너 (테스트 전용 시안)
   - 「내 북마크 링크 복사」: 북마크 키(seriesKey)를 7자리 해시로 줄여 URL 해시(#bm=…)에 담아요. 서버 없음.
   - 공유 링크로 들어오면 받은 목록을 보여 주고, 「내 북마크에 합치기」를 눌렀을 때만 기존 북마크에 더해요(덮어쓰지 않음).
   - 여행 날짜(시작~끝)를 넣으면 북마크 행사를 날짜별로 묶고, 하루를 고르면 그날 갈 곳만 번호 핀 지도로 보여요.
   app.js의 전역(BM·saveBM·seriesKey·EV·st·render)을 그대로 씀. 기존 지도(map.js)는 건드리지 않고 별도 작은 지도를 씀. */
(function(){
  /* 모바일 검색창 placeholder: 좁은 화면에선 짧게 (PC 문구는 index.html 그대로) */
  const qi=document.getElementById("q");if(qi){const PC=qi.getAttribute("placeholder"),mq=matchMedia("(max-width:719px)");const ph=()=>qi.setAttribute("placeholder",mq.matches?"🔍 작품명 검색 (한·일)":PC);ph();mq.addEventListener?mq.addEventListener("change",ph):mq.addListener(ph)}

  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const DOW="일월화수목금토";
  const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const pd=s=>{if(!s)return null;const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
  const md=s=>{const d=pd(s);return d?`${d.getMonth()+1}/${d.getDate()}(${DOW[d.getDay()]})`:""};
  const NAT=new Set(["쿠지","가챠","잡지 부록"]);
  const isNat=e=>(e.region||"")==="all"||e.area==="전국"||NAT.has(e.category);
  // 32비트 FNV-1a → base36 7자리
  const h7=s=>{let h=0x811c9dc5;for(const ch of s){h^=ch.codePointAt(0);h=Math.imul(h,0x01000193)>>>0}return h.toString(36).padStart(7,"0")};
  const TRIPK="qj_trip";
  let trip={from:"",to:""};try{trip=Object.assign(trip,JSON.parse(localStorage.getItem(TRIPK)||"{}"))}catch(e){}
  const saveTrip=()=>{try{localStorage.setItem(TRIPK,JSON.stringify(trip))}catch(e){}};
  const ready=()=>typeof EV!=="undefined"&&EV.length&&typeof BM!=="undefined";
  const keyMap=()=>{const m=new Map();EV.forEach(e=>{const k=seriesKey(e);m.set(h7(k),k)});return m};
  const bmEvents=keys=>EV.filter(e=>keys.has(seriesKey(e)));
  const shareURL=()=>{const toks=[...BM].map(h7).sort().join("");let u=location.origin+location.pathname+"#bm="+toks;if(trip.from&&trip.to)u+="&t="+trip.from.replace(/-/g,"")+"-"+trip.to.replace(/-/g,"");return u};
  async function copy(t){try{await navigator.clipboard.writeText(t);return true}catch(x){const a=document.createElement("textarea");a.value=t;a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand("copy")}catch(y){}a.remove();return ok}}
  async function copyBM(btn){if(!BM.size){btn.textContent="북마크가 아직 없어요";setTimeout(()=>btn.textContent="🔗 내 북마크 링크 복사",1600);return}
    const u=shareURL(),ok=await copy(u);btn.textContent=ok?`✓ ${BM.size}건 링크 복사됨`:"복사 실패 · 아래 주소를 길게 눌러 복사";const o=btn.parentNode.querySelector(".bpurl");if(o){o.hidden=false;o.value=u}
    window.gtag&&gtag("event","share_bookmarks",{n:BM.size});setTimeout(()=>btn.textContent="🔗 내 북마크 링크 복사",2200)}

  /* ── 필터 안 북마크 줄(bmbar)에도 버튼 추가 ── */
  const bb=document.getElementById("bmbar");if(bb&&!bb.querySelector(".bpcopy")){const b=document.createElement("button");b.type="button";b.className="bpcopy";b.textContent="🔗 내 북마크 링크 복사";b.onclick=()=>copyBM(b);bb.appendChild(b)}

  /* ── 플래너 패널(북마크만 보기일 때 목록 위) ── */
  const pan=document.createElement("section");pan.id="bplan";pan.className="bplan";pan.hidden=true;pan.setAttribute("aria-label","북마크 여행 플래너");
  pan.innerHTML=`<div class="bphd"><b>🧳 북마크 여행 플래너</b><span class="bpsub">이 기기에만 저장돼요 · 링크로 친구와 나눌 수 있어요</span></div>
  <div class="bpshare"><button type="button" class="bpcopy" id="bpcopy">🔗 내 북마크 링크 복사</button><input class="bpurl" readonly hidden aria-label="공유 링크"></div>
  <div class="bptrip"><span class="rl">✈️ 여행 날짜</span><input type="date" id="bpfrom" aria-label="여행 시작일"><span>~</span><input type="date" id="bpto" aria-label="여행 종료일"><button type="button" id="bpclr">지우기</button></div>
  <div id="bpbody" class="bpbody"></div>`;
  const list=document.getElementById("list"),cnt=document.getElementById("count");(cnt||list).parentNode.insertBefore(pan,cnt||list);
  const $=s=>pan.querySelector(s);$("#bpcopy").onclick=ev=>copyBM(ev.currentTarget);
  const fi=$("#bpfrom"),ti=$("#bpto");fi.value=trip.from;ti.value=trip.to;
  const onDate=()=>{trip.from=fi.value;trip.to=ti.value;if(trip.from&&trip.to&&trip.to<trip.from){trip.to=trip.from;ti.value=trip.from}ti.min=trip.from||"";saveTrip();day=null;paint()};
  fi.onchange=ti.onchange=onDate;$("#bpclr").onclick=()=>{fi.value=ti.value="";onDate()};
  let day=null,pmap=null,players=null;
  const onDay=(e,d)=>{if(e._dates)return e._dates.some(x=>x.start<=d&&d<=(x.end||x.start));if(!e.start||e.start>d)return false;return e.end?d<=e.end:isNat(e)};
  function days(){const a=[];if(!trip.from||!trip.to)return a;let d=pd(trip.from);const end=pd(trip.to);while(d<=end&&a.length<31){a.push(ymd(d));d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1)}return a}
  // 그날 갈 곳 순서: 첫 행사에서 가까운 곳 순(단순 최근접 경로)
  function route(a){if(a.length<3)return a;const r=[a[0]],left=a.slice(1);while(left.length){const p=r[r.length-1];let bi=0,bd=1e9;left.forEach((q,i)=>{const dd=(q.lat-p.lat)**2+((q.lon-p.lon)*Math.cos(p.lat*Math.PI/180))**2;if(dd<bd){bd=dd;bi=i}});r.push(left.splice(bi,1)[0])}return r}
  function paint(){if(!ready())return;const on=st.bm;pan.hidden=!on;if(!on)return;const body=$("#bpbody");
    const evs=bmEvents(BM);const D=days();
    if(!BM.size){body.innerHTML=`<p class="bpnote">☆를 눌러 북마크하면 여기서 여행 날짜별로 묶어 볼 수 있어요.</p>`;return}
    if(!D.length){body.innerHTML=`<p class="bpnote">여행 날짜를 넣으면 북마크한 ${BM.size}건을 날짜별로 묶어 보여 줘요.</p>`;return}
    const per=D.map(d=>{const a=evs.filter(e=>onDay(e,d));return{d,loc:a.filter(e=>!isNat(e)),nat:a.filter(isNat)}});
    if(!day||!D.includes(day))day=(per.find(x=>x.loc.length)||per[0]).d;
    const cur=per.find(x=>x.d===day);const pins=route(cur.loc.filter(e=>e.lat&&e.lon));const nopin=cur.loc.filter(e=>!(e.lat&&e.lon));
    body.innerHTML=`<div class="bpdays" role="tablist" aria-label="여행 날짜">${per.map(x=>`<button type="button" role="tab" data-d="${x.d}" class="${x.d===day?"on":""}" aria-selected="${x.d===day}"><b>${md(x.d)}</b><small>${x.loc.length?x.loc.length+"곳":"없음"}</small></button>`).join("")}</div>
    <div class="bpday"><div class="bpmap" id="bpmap" role="region" aria-label="${md(day)} 갈 곳 지도"></div>
    <ol class="bplist">${pins.map((e,i)=>`<li data-k="${esc(seriesKey(e))}" data-s="${esc(e.start)}"><span class="bpn">${i+1}</span><span class="bpt"><b>${esc(e.title_ko)}</b><small>${esc(e.venue||"")}${e.end?` · ~${md(e.end)}`:""}</small></span></li>`).join("")}${nopin.map(e=>`<li class="bpx" data-k="${esc(seriesKey(e))}" data-s="${esc(e.start)}"><span class="bpn">·</span><span class="bpt"><b>${esc(e.title_ko)}</b><small>${esc(e.venue||"")} · 위치 정보 없음</small></span></li>`).join("")}</ol>
    ${!cur.loc.length?`<p class="bpnote">${md(day)}에 열리는 북마크 행사가 없어요.</p>`:""}
    ${cur.nat.length?`<p class="bpnat">🛒 전국 매장(쿠지·가챠·잡지 부록) ${cur.nat.length}건: ${cur.nat.map(e=>esc(e.title_ko)).join(" · ")}</p>`:""}</div>`;
    body.querySelector(".bpdays").onclick=ev=>{const b=ev.target.closest("button[data-d]");if(!b)return;day=b.dataset.d;paint();window.gtag&&gtag("event","planner_day",{d:day})};
    body.querySelector(".bplist").onclick=ev=>{const li=ev.target.closest("li[data-k]");if(!li)return;const e=EV.find(x=>seriesKey(x)===li.dataset.k&&x.start===li.dataset.s);if(e&&window.QJ_openDetail)QJ_openDetail(e)};
    drawMap(pins)}
  /* 작은 지도: map.js가 쓰는 vendor Leaflet/MapLibre를 같이 씀(이미 불러왔으면 재사용) */
  function need(src,test,css){return new Promise(ok=>{if(test())return ok();if(css&&!document.querySelector(`link[href="${css}"]`)){const l=document.createElement("link");l.rel="stylesheet";l.href=css;document.head.appendChild(l)}
    if(document.querySelector(`script[src="${src}"]`)){let n=0;const t=setInterval(()=>{if(test()||++n>100){clearInterval(t);ok()}},100);return}
    const s=document.createElement("script");s.src=src;s.onload=s.onerror=()=>ok();document.head.appendChild(s)})}
  let ld=null;const load=()=>ld||(ld=need("vendor/leaflet/leaflet.js",()=>window.L&&L.map,"vendor/leaflet/leaflet.css").then(()=>need("vendor/maplibre/maplibre-gl.js",()=>window.maplibregl,"vendor/maplibre/maplibre-gl.css")).then(()=>need("vendor/maplibre/leaflet-maplibre-gl.js",()=>window.L&&L.maplibreGL)));
  const isDark=()=>document.documentElement.getAttribute("data-theme")==="dark";
  let base=null,baseDark=null;
  function drawMap(pins){const el=document.getElementById("bpmap");if(!el)return;el.hidden=!pins.length;if(!pins.length)return;
    load().then(()=>{const L=window.L;if(!L||!L.map)return;
      if(pmap&&pmap.getContainer()!==el){pmap.remove();pmap=null;base=null}
      if(!pmap){pmap=L.map(el,{scrollWheelZoom:true,wheelPxPerZoomLevel:90,tap:true,maxZoom:18,minZoom:5});pmap.attributionControl.setPrefix(false);
        let gl=false;try{const c=document.createElement("canvas");gl=!!(c.getContext("webgl2")||c.getContext("webgl"))}catch(e){}
        if(L.maplibreGL&&window.maplibregl&&gl){baseDark=isDark();base=L.maplibreGL({style:"vendor/maplibre/style-"+(baseDark?"dark":"light")+".json",attribution:'&copy; <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a>',interactive:false}).addTo(pmap)}
        else L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(pmap);
        players=L.layerGroup().addTo(pmap)}
      players.clearLayers();const pts=[];MKS=[];
      pins.forEach((e,i)=>{const ll=[+e.lat,+e.lon];pts.push(ll);
        const m=L.marker(ll,{icon:pinIcon(L,i,0,0),title:e.title_ko,zIndexOffset:1000-i});MKS.push(m);
        m.bindPopup(`<div class="bppop"><em>${i+1}번째</em><b>${esc(e.title_ko)}</b><small>${esc(e.venue||"")}</small><button type="button" class="bpdet" data-i="${i}">자세히 보기</button></div>`,{maxWidth:240,minWidth:180});
        m.on("popupopen",ev=>{const b=ev.popup.getElement().querySelector(".bpdet");if(b)b.onclick=()=>window.QJ_openDetail&&QJ_openDetail(e)});m.addTo(players)});
      setTimeout(()=>{pmap.invalidateSize();if(pts.length===1)pmap.setView(pts[0],15);else pmap.fitBounds(L.latLngBounds(pts).pad(.18),{maxZoom:15});spread(L)},0);
      if(!pmap._bpz){pmap._bpz=1;pmap.on("zoomend",()=>spread(window.L))}})}
  /* 가까운 핀이 겹치면 번호가 가려지지 않게 화면에서 살짝 비켜 그려요(실제 위치는 그대로, 줌 바뀌면 다시 계산) */
  let MKS=[];const pinIcon=(L,i,ox,oy)=>L.divIcon({className:"bppin"+(ox||oy?" bpoff":""),html:`<span>${i+1}</span>`,iconSize:[30,30],iconAnchor:[15-ox,15-oy],popupAnchor:[ox,oy-14]});
  const OFF=[[0,0],[24,0],[-24,0],[0,-24],[0,24],[24,-24],[-24,-24],[24,24],[-24,24],[48,0],[-48,0],[0,-48]];
  function spread(L){if(!pmap||!L)return;const placed=[];MKS.forEach((m,i)=>{const p=pmap.latLngToContainerPoint(m.getLatLng());let o=OFF[0];for(const c of OFF){if(placed.every(q=>Math.hypot(p.x+c[0]-q.x,p.y+c[1]-q.y)>=27)){o=c;break}}placed.push({x:p.x+o[0],y:p.y+o[1]});m.setIcon(pinIcon(L,i,o[0],o[1]))})}
  new MutationObserver(()=>{if(!base||!pmap)return;if(isDark()!==baseDark){baseDark=isDark();try{base.getMaplibreMap().setStyle("vendor/maplibre/style-"+(baseDark?"dark":"light")+".json")}catch(e){}}}).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  let lastSig="";
  const maybe=()=>{if(!ready())return;const sig=st.bm+"|"+BM.size+"|"+[...BM].join(",").length;if(sig!==lastSig||pan.hidden===st.bm){lastSig=sig;paint()}};
  if(list)new MutationObserver(maybe).observe(list,{childList:true});

  /* ── 공유 링크(#bm=…)로 들어왔을 때 ── */
  function landing(){const h=location.hash;if(!/^#bm=/.test(h))return;const p=new URLSearchParams(h.slice(1));const raw=(p.get("bm")||"").replace(/[^0-9a-z]/g,"");
    const toks=[];for(let i=0;i+7<=raw.length;i+=7)toks.push(raw.slice(i,i+7));const km=keyMap();const keys=new Set(),miss=[];toks.forEach(t=>{const k=km.get(t);k?keys.add(k):miss.push(t)});
    let tf="",tt="";const t=p.get("t");if(t&&/^\d{8}-\d{8}$/.test(t)){tf=`${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`;tt=`${t.slice(9,13)}-${t.slice(13,15)}-${t.slice(15,17)}`}
    const evs=bmEvents(keys);const seen=new Set(),rows=[];evs.sort((a,b)=>(a.start||"9").localeCompare(b.start||"9")).forEach(e=>{const k=seriesKey(e);if(seen.has(k))return;seen.add(k);rows.push(e)});
    const add=[...keys].filter(k=>!BM.has(k)).length;
    const ov=document.createElement("div");ov.className="bpov";ov.innerHTML=`<div class="bpdlg" role="dialog" aria-modal="true" aria-labelledby="bpdt"><div class="bpdhd"><b id="bpdt">🔗 공유받은 북마크 ${rows.length}건</b><button type="button" class="bpdx" aria-label="닫기">✕</button></div>
      ${tf?`<p class="bpdtrip">✈️ 여행 날짜 ${md(tf)} ~ ${md(tt)}</p>`:""}
      <ul class="bpdl">${rows.map(e=>`<li data-k="${esc(seriesKey(e))}"><span class="bpdc">${esc(e.category)}</span><b>${esc(e.title_ko)}</b><small>${e.start?md(e.start):""}${e.end?" ~ "+md(e.end):""} · ${esc(e.venue||e.area||"")}</small>${BM.has(seriesKey(e))?`<i class="bpdhas">이미 내 북마크</i>`:""}</li>`).join("")||`<li class="bpdnone">목록에서 찾을 수 있는 행사가 없어요(이미 끝났을 수 있어요).</li>`}</ul>
      ${miss.length?`<p class="bpdmiss">${miss.length}건은 끝났거나 목록에서 빠져 보여 줄 수 없어요.</p>`:""}
      <p class="bpdinfo">내 북마크(${BM.size}건)는 그대로 두고, 고르면 새 ${add}건만 더해요.</p>
      ${tf?`<label class="bpdchk"><input type="checkbox" id="bpdtrip" ${trip.from?"":"checked"}> 여행 날짜도 플래너에 넣기${trip.from?` (지금 ${md(trip.from)}~${md(trip.to)} 대신)`:""}</label>`:""}
      <div class="bpdact"><button type="button" class="bpdok" ${add||tf?"":"disabled"}>⭐ 내 북마크에 합치기${add?` (+${add})`:""}</button><button type="button" class="bpdno">보기만 할게요</button></div></div>`;
    document.body.appendChild(ov);document.body.classList.add("bpopen");
    const clean=()=>{try{history.replaceState(history.state,"",location.pathname+location.search)}catch(e){}};
    const close=()=>{ov.remove();document.body.classList.remove("bpopen");clean()};
    ov.addEventListener("click",ev=>{if(ev.target===ov||ev.target.closest(".bpdx,.bpdno")){close();return}
      if(ev.target.closest(".bpdok")){keys.forEach(k=>BM.add(k));saveBM();const tc=ov.querySelector("#bpdtrip");if(tc&&tc.checked){trip.from=tf;trip.to=tt;saveTrip();fi.value=tf;ti.value=tt;day=null}window.gtag&&gtag("event","merge_shared_bookmarks",{n:add});
        close();st.bm=true;window.QJ_paintChips&&QJ_paintChips();render();window.QJ_bmu&&QJ_bmu();paint();pan.scrollIntoView({behavior:"smooth",block:"start"});return}
      const li=ev.target.closest("li[data-k]");if(li){const e=rows.find(x=>seriesKey(x)===li.dataset.k);if(e&&window.QJ_openDetail){QJ_openDetail(e)}}});
    window.gtag&&gtag("event","open_shared_bookmarks",{n:rows.length})}
  (window.QJ_DATA||Promise.resolve()).then(()=>{let n=0;const t=setInterval(()=>{if(ready()||++n>100){clearInterval(t);if(ready()){landing();maybe()}}},100)});
})();
