// 🗺️ 지도 보기(테스트): 목록과 같은 필터 결과 중 오늘 진행 중인 행사만 핀으로 표시(옵션: 곧 시작 포함). Leaflet+글자 없는 배경지도(OpenFreeMap)는 지도를 처음 열 때만 불러와요.
// 쿠지·가챠·잡지 부록(전국)과 좌표 없는 행사는 제외. 같은 건물(좌표 동일)의 행사는 핀 하나로 묶고 팝업에 목록으로 보여줘요.
(function(){
  const CC={"팝업스토어":"#e8590c","콜라보카페":"#c2255c","전시·행사":"#1971c2","축제":"#2f9e44","플리마켓":"#0c8599"};
  const CENTER={tokyo:[35.6895,139.7300,11],osaka:[34.6800,135.5100,11]};
  // 처음 보여줄 중심 구역(남·서·북 끝 행사장 때문에 너무 축소되지 않게). 밖의 핀은 지도를 움직이면 보여요.
  const CORE={tokyo:[35.60,139.64,35.76,139.83],osaka:[34.635,135.48,34.71,135.535]};
  const NOFIX=new Set(["쿠지","가챠","잡지 부록"]);const SOONDAYS=7;
  const SC={live:"#d9603b",end3:"#a61e3a",start7:"#2f4b7c"},SL={live:"진행 중",end3:"종료 임박",start7:"곧 시작"};
  const JUMP={tokyo:[["신주쿠",35.6916,139.7020,15],["시부야",35.6605,139.7005,15],["이케부쿠로",35.7300,139.7135,15],["아키하바라",35.6995,139.7725,15],["긴자·도쿄역",35.6770,139.7660,14],["오다이바",35.6260,139.7770,14]],
    osaka:[["우메다",34.7030,135.4970,15],["난바",34.6655,135.5010,15],["덴노지",34.6470,135.5130,15],["오사카성",34.6873,135.5262,15]]};
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const md=s=>s?`${+s.slice(5,7)}/${+s.slice(8,10)}`:"";
  let L_=null,map=null,layer=null,ROWS=[],soon=false,loading=null,lastRegion=null;
  const sec=document.createElement("section");sec.id="qmap";sec.className="qmap";sec.hidden=true;
  sec.innerHTML=`<div class="qmhd"><div class="qmopts"><label class="qmsoon"><input type="checkbox" id="qmsoon"> 곧 시작(7일 안)도 보기</label><label class="qmsoon qmspt"><input type="checkbox" id="qmspot" checked> ⭐ 덕질·명소 스팟</label></div><span class="qmcnt" id="qmcnt"></span></div><div class="qmjump" id="qmjump" role="group" aria-label="지역 바로가기"></div><div class="qmleg"><span style="--c:#d9603b">진행 중</span><span style="--c:#a61e3a">종료 임박 (3일 안)</span><span class="s" style="--c:#2f4b7c">곧 시작 (7일 안)</span><b class="qmlg-sp" id="qmlgsp"><i class="qmsq">🗼</i>명소 <i class="qmsq">🛍️</i>덕질숍 <i class="qmsq">📚</i>서점</b></div><div id="qmapc" class="qmapc" role="region" aria-label="진행 중인 행사 지도"></div><p class="qmnote" id="qmnote"></p>`;
  const list=document.getElementById("list");list.parentNode.insertBefore(sec,list.nextSibling);
  sec.querySelector("#qmsoon").onchange=ev=>{soon=ev.target.checked;draw()};
  // ⭐ 덕질·명소 스팟 레이어(spots.json): 행사 핀과 다른 네모 아이콘
  let SPOTS=null,spotLayer=null,spotOn=true,spotReg=null;const SPI={landmark:"🗼",shop:"🛍️",book:"📚"},SPN={landmark:"명소",shop:"덕질숍",book:"서점"};
  sec.querySelector("#qmspot").onchange=ev=>{spotOn=ev.target.checked;sec.querySelector("#qmlgsp").hidden=!spotOn;paintSpots(true)};
  function paintSpots(force){if(!map||!L_)return;const reg=window.QJ_REGION||"tokyo";
    if(!SPOTS){SPOTS=[];fetch("spots.json").then(r=>r.json()).then(d=>{SPOTS=d.spots||[];paintSpots(true)}).catch(()=>{});return}
    if(!spotLayer){spotLayer=L_.layerGroup().addTo(map)}if(!force&&spotReg===reg)return;spotReg=reg;spotLayer.clearLayers();if(!spotOn)return;
    SPOTS.filter(o=>o.region===reg).forEach(o=>{const ic=L_.divIcon({className:"qmspot",html:`<span class="qmsq qmsq-${o.type}">${SPI[o.type]||"⭐"}</span>`,iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-14]});
      L_.marker([o.lat,o.lon],{icon:ic,title:o.ko,zIndexOffset:-200}).bindPopup(`<div class="qmsp"><em>${SPI[o.type]||""} ${SPN[o.type]||""}</em><b>${esc(o.ko)}</b><small>${esc(o.ja)}</small><p>${esc(o.desc)}</p>${o.url?`<a href="${esc(o.url)}" target="_blank" rel="noopener">공식 사이트 ↗</a>`:""}</div>`,{maxWidth:260,minWidth:200}).addTo(spotLayer)})}
  let jumpReg=null;function paintJump(reg){if(jumpReg===reg)return;jumpReg=reg;const el=sec.querySelector("#qmjump");el.innerHTML=(JUMP[reg]||[]).map((j,i)=>`<button type="button" data-j="${i}">${j[0]}</button>`).join("")+`<button type="button" data-j="all" class="qmall">전체 보기</button>`;
    el.onclick=ev=>{const b=ev.target.closest("button[data-j]");if(!b||!map)return;el.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));if(b.dataset.j==="all"){lastRegion=null;draw();return}const j=JUMP[reg][+b.dataset.j];map.flyTo([j[1],j[2]],j[3],{duration:.8});window.gtag&&gtag("event","map_jump",{area:j[0]})}}
  function load(){if(window.L)return Promise.resolve(window.L);if(loading)return loading;
    loading=new Promise((ok,ng)=>{const c=document.createElement("link");c.rel="stylesheet";c.href="vendor/leaflet/leaflet.css";document.head.appendChild(c);
      const s=document.createElement("script");s.src="vendor/leaflet/leaflet.js";s.onload=()=>{const MC="vendor/markercluster/";const c2=document.createElement("link");c2.rel="stylesheet";c2.href=MC+"MarkerCluster.css";document.head.appendChild(c2);const s2=document.createElement("script");s2.src=MC+"leaflet.markercluster.js";const fin=()=>ok(window.L);const MLP="vendor/maplibre/";const loadML=()=>{const c3=document.createElement("link");c3.rel="stylesheet";c3.href=MLP+"maplibre-gl.css";document.head.appendChild(c3);const s3=document.createElement("script");s3.src=MLP+"maplibre-gl.js";s3.onload=()=>{const s4=document.createElement("script");s4.src=MLP+"leaflet-maplibre-gl.js";s4.onload=fin;s4.onerror=fin;document.head.appendChild(s4)};s3.onerror=fin;document.head.appendChild(s3)};s2.onload=loadML;s2.onerror=loadML;document.head.appendChild(s2)};s.onerror=ng;document.head.appendChild(s)});return loading}
  const pick=e=>{if(NOFIX.has(e.category))return null;const k=status(e).k;
    if(k==="now"||k==="ending")return"now";if(soon&&k==="soon"&&e.start){const d=(new Date(e.start)-Date.now())/864e5;if(d<=SOONDAYS)return"soon"}return null};

  // 배경 지도: 글자 없는 OpenFreeMap 벡터(positron/dark에서 글자 레이어를 모두 뺀 스타일) + 우리가 고른 한글 지명만 얹어요.
  const ATTR='<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  const ATTR_S='&copy; <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a>';
  const isDark=()=>document.documentElement.getAttribute("data-theme")==="dark";
  const styleUrl=()=>"vendor/maplibre/style-"+(isDark()?"dark":"light")+"-nolabels.json";
  let base=null,baseDark=null;
  function webgl(){try{const c=document.createElement("canvas");return !!(c.getContext("webgl2")||c.getContext("webgl"))}catch(e){return false}}
  function addBase(L,mob){
    if(L.maplibreGL&&window.maplibregl&&webgl()){baseDark=isDark();base=L.maplibreGL({style:styleUrl(),attribution:mob?ATTR_S:ATTR,interactive:false}).addTo(map);
      new MutationObserver(()=>{if(isDark()!==baseDark){baseDark=isDark();try{base.getMaplibreMap().setStyle(styleUrl())}catch(e){}}}).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]})}
    else L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map)}
  // [이름, 위도, 경도, 종류(a=지역 b=랜드마크 s=역), 보이는 최소 줌, 최대 줌]
  const LBL=[
    ["신주쿠",35.6938,139.7034,"a",11,14],["시부야",35.6610,139.6990,"a",11,14],["이케부쿠로",35.7310,139.7120,"a",11,14],["아키하바라",35.7000,139.7740,"a",11,14],
    ["하라주쿠",35.6705,139.7050,"a",12,14],["긴자·유라쿠초",35.6720,139.7650,"a",11,14],["우에노",35.7140,139.7760,"a",12,14],["오다이바",35.6268,139.7752,"a",11,99],
    ["롯폰기",35.6628,139.7314,"a",13,99],["나카노",35.7074,139.6659,"a",12,14],["기치조지",35.7033,139.5797,"a",11,14],
    ["도쿄타워",35.6586,139.7454,"b",12,99],["스카이트리",35.7101,139.8107,"b",11,99],["도쿄돔",35.7056,139.7519,"b",12,99],["도쿄 빅사이트",35.6298,139.7942,"b",13,99],["요미우리랜드",35.6250,139.5175,"b",11,99],
    ["신주쿠역",35.6896,139.7006,"s",14,99],["시부야역",35.6580,139.7016,"s",14,99],["이케부쿠로역",35.7295,139.7109,"s",14,99],["아키하바라역",35.6984,139.7731,"s",14,99],
    ["하라주쿠역",35.6702,139.7027,"s",14,99],["도쿄역",35.6812,139.7671,"s",13,99],["유라쿠초역",35.6751,139.7630,"s",14,99],["우에노역",35.7138,139.7773,"s",14,99],["나카노역",35.7056,139.6657,"s",14,99],["기치조지역",35.7031,139.5798,"s",14,99],
    ["우메다",34.7035,135.4985,"a",11,14],["난바",34.6640,135.5000,"a",11,14],["신사이바시",34.6760,135.5010,"a",13,15],["도톤보리",34.6687,135.5013,"a",14,99],["닛폰바시",34.6610,135.5065,"a",13,15],["덴노지·아베노",34.6465,135.5135,"a",11,14],
    ["오사카성",34.6873,135.5262,"b",11,99],["쓰텐카쿠",34.6525,135.5063,"b",13,99],
    ["오사카·우메다역",34.7025,135.4959,"s",14,99],["난바역",34.6664,135.5003,"s",14,99],["덴노지역",34.6467,135.5140,"s",14,99],["닛폰바시역",34.6680,135.5060,"s",15,99],["신사이바시역",34.6753,135.5009,"s",15,99]];
  let lblLayer=null;
  function addLabels(L){map.createPane("qmlbl");const pn=map.getPane("qmlbl");pn.style.zIndex=450;pn.style.pointerEvents="none";
    const ms=LBL.map(([t,la,lo,k,z0,z1])=>({z0,z1,m:L.marker([la,lo],{pane:"qmlbl",interactive:false,keyboard:false,icon:L.divIcon({className:"qmlbl qmlbl-"+k,html:`<span>${k==="s"?"🚉 ":k==="b"?"◆ ":""}${t}</span>`,iconSize:null})})}));
    lblLayer=L.layerGroup().addTo(map);
    const upd=()=>{const z=map.getZoom();ms.forEach(o=>{const on=z>=o.z0&&z<o.z1;if(on&&!lblLayer.hasLayer(o.m))lblLayer.addLayer(o.m);else if(!on&&lblLayer.hasLayer(o.m))lblLayer.removeLayer(o.m)})};
    map.on("zoomend",upd);map.whenReady(upd)}
  function draw(){if(sec.hidden)return;load().then(L=>{L_=L;
    if(!map){map=L.map("qmapc",{scrollWheelZoom:true,wheelPxPerZoomLevel:90,tap:true,maxZoom:18,minZoom:5});const mob=matchMedia("(max-width:719px)").matches;if(mob){map.attributionControl.setPrefix(false);map.attributionControl.setPosition("bottomleft");sec.classList.add("qmob")}addBase(L,mob);addLabels(L);layer=(L.markerClusterGroup?L.markerClusterGroup({maxClusterRadius:36,showCoverageOnHover:false,spiderfyOnMaxZoom:true,iconCreateFunction:cl=>{const n=cl.getAllChildMarkers().reduce((t,m)=>t+(m.options.qn||1),0);return L.divIcon({className:"qmpin",html:`<span class="qmdot qmcl">${n}</span>`,iconSize:[34,34],iconAnchor:[17,17]})}}):L.layerGroup()).addTo(map);
      map.on("popupopen",ev=>{ev.popup.getElement().onclick=x=>{const b=x.target.closest("[data-i]");if(b)openE(+b.dataset.i)}})}
    const reg=window.QJ_REGION||"tokyo";paintJump(reg);paintSpots(false);layer.clearLayers();
    const grp=new Map();let total=0,nocoord=0;
    ROWS.forEach((e,i)=>{if(!pick(e))return;const q=window.QJ_qstat&&QJ_qstat(e);const s=q?q.k:(pick(e)==="soon"?"start7":"live");total++;if(!(e.lat&&e.lon)){nocoord++;return}
      const key=(+e.lat).toFixed(4)+","+(+e.lon).toFixed(4);if(!grp.has(key))grp.set(key,[]);grp.get(key).push({e,i,s})});
    const pts=[];
    grp.forEach((a,key)=>{const [la,lo]=key.split(",").map(Number);pts.push([la,lo]);const allSoon=a.every(o=>o.s==="start7");const ks=a.map(o=>o.s);const k=ks.includes("end3")?"end3":ks.includes("live")?"live":"start7";const c=SC[k];
      const icon=L.divIcon({className:"qmpin",html:`<span class="qmdot${allSoon?" soon":""}${k==="end3"?" hot":""}" style="--c:${c}">${a.length>1?a.length:""}</span>`,iconSize:[28,28],iconAnchor:[14,14],popupAnchor:[0,-12]});
      const venue=a[0].e.venue||"";
      const html=`<div class="qmpop">${a.length>1?`<p class="qmvn">📍 ${esc(venue.replace(/\s*\(.*$/,""))} · ${a.length}건</p>`:""}${a.map(o=>{const e=o.e;return`<button type="button" class="qmit" data-i="${o.i}">${e.thumb_small?`<img src="${esc(e.thumb_small)}" alt="" loading="lazy">`:`<span class="qmnoimg" style="--c:${CC[e.category]||"#b5523b"}"></span>`}<span class="qmtx"><em style="--c:${CC[e.category]||"#b5523b"}">${esc(e.category)}</em><i class="qmst" style="--c:${SC[o.s]}">${SL[o.s]}</i><b>${esc(e.title_ko)}</b><small>${md(e.start)}${e.end&&e.end!==e.start?" ~ "+md(e.end):""}${a.length>1?"":" · "+esc(venue)}</small></span></button>`}).join("")}</div>`;
      L.marker([la,lo],{icon,qn:a.length,title:a.map(o=>o.e.title_ko).join(" / ")}).bindPopup(html,{maxWidth:300,minWidth:230,autoPanPadding:[20,60]}).addTo(layer)});
    document.getElementById("qmcnt").textContent=`핀 ${grp.size}곳 · 행사 ${total-nocoord}건`;
    document.getElementById("qmnote").textContent=(nocoord?`위치 정보가 없는 ${nocoord}건은 지도에서 빠졌어요(목록에서 볼 수 있어요). `:"")+"쿠지·가챠·잡지 부록처럼 정해진 행사장이 없는 건 표시하지 않아요.";
    map.invalidateSize();
    if(reg!==lastRegion||!pts.length){const c=CENTER[reg]||CENTER.tokyo;map.setView([c[0],c[1]],c[2]);lastRegion=reg}
    if(pts.length){const cb=CORE[reg],cp=cb?pts.filter(p=>p[0]>=cb[0]&&p[0]<=cb[2]&&p[1]>=cb[1]&&p[1]<=cb[3]):[];const b=L.latLngBounds(cp.length>=2?cp:pts);map.fitBounds(b.pad(0.12),{maxZoom:14})}
  }).catch(err=>{console.error("QJMAP",err);document.getElementById("qmnote").textContent="지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."})}
  function openE(i){const e=ROWS[i];if(!e)return;if(window.QJ_hasDetail&&QJ_hasDetail(e))QJ_openDetail(e);else if(e.official_url)window.open(e.official_url,"_blank","noopener")}
  window.QJMAP={show(on){sec.hidden=!on;if(on)draw()},rows(r){ROWS=r||[];draw()}};
})();
