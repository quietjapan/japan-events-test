// 🗺️ 지도 보기(테스트): 목록과 같은 필터 결과 중 오늘 진행 중인 행사만 핀으로 표시(옵션: 곧 시작 포함). Leaflet+OSM은 지도를 처음 열 때만 불러와요.
// 쿠지·가챠·잡지 부록(전국)과 좌표 없는 행사는 제외. 같은 건물(좌표 동일)의 행사는 핀 하나로 묶고 팝업에 목록으로 보여줘요.
(function(){
  const CC={"팝업스토어":"#e8590c","콜라보카페":"#c2255c","전시·행사":"#1971c2","축제":"#2f9e44","플리마켓":"#0c8599"};
  const CENTER={tokyo:[35.6895,139.7300,11],osaka:[34.6800,135.5100,11]};
  const NOFIX=new Set(["쿠지","가챠","잡지 부록"]);const SOONDAYS=14;
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const md=s=>s?`${+s.slice(5,7)}/${+s.slice(8,10)}`:"";
  let L_=null,map=null,layer=null,ROWS=[],soon=false,loading=null,lastRegion=null;
  const sec=document.createElement("section");sec.id="qmap";sec.className="qmap";sec.hidden=true;
  sec.innerHTML=`<div class="qmhd"><label class="qmsoon"><input type="checkbox" id="qmsoon"> 곧 시작(2주 안)도 보기</label><span class="qmcnt" id="qmcnt"></span></div><div id="qmapc" class="qmapc" role="region" aria-label="진행 중인 행사 지도"></div><p class="qmnote" id="qmnote"></p>`;
  const list=document.getElementById("list");list.parentNode.insertBefore(sec,list.nextSibling);
  sec.querySelector("#qmsoon").onchange=ev=>{soon=ev.target.checked;draw()};
  function load(){if(window.L)return Promise.resolve(window.L);if(loading)return loading;
    loading=new Promise((ok,ng)=>{const c=document.createElement("link");c.rel="stylesheet";c.href="vendor/leaflet/leaflet.css";document.head.appendChild(c);
      const s=document.createElement("script");s.src="vendor/leaflet/leaflet.js";s.onload=()=>{const MC="vendor/markercluster/";const c2=document.createElement("link");c2.rel="stylesheet";c2.href=MC+"MarkerCluster.css";document.head.appendChild(c2);const s2=document.createElement("script");s2.src=MC+"leaflet.markercluster.js";s2.onload=()=>ok(window.L);s2.onerror=()=>ok(window.L);document.head.appendChild(s2)};s.onerror=ng;document.head.appendChild(s)});return loading}
  const pick=e=>{if(NOFIX.has(e.category))return null;const k=status(e).k;
    if(k==="now"||k==="ending")return"now";if(soon&&k==="soon"&&e.start){const d=(new Date(e.start)-Date.now())/864e5;if(d<=SOONDAYS)return"soon"}return null};
  function draw(){if(sec.hidden)return;load().then(L=>{L_=L;
    if(!map){map=L.map("qmapc",{scrollWheelZoom:false,tap:true});L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);layer=(L.markerClusterGroup?L.markerClusterGroup({maxClusterRadius:36,showCoverageOnHover:false,spiderfyOnMaxZoom:true,iconCreateFunction:cl=>{const n=cl.getAllChildMarkers().reduce((t,m)=>t+(m.options.qn||1),0);return L.divIcon({className:"qmpin",html:`<span class="qmdot qmcl">${n}</span>`,iconSize:[34,34],iconAnchor:[17,17]})}}):L.layerGroup()).addTo(map);
      map.on("popupopen",ev=>{ev.popup.getElement().onclick=x=>{const b=x.target.closest("[data-i]");if(b)openE(+b.dataset.i)}})}
    const reg=window.QJ_REGION||"tokyo";layer.clearLayers();
    const grp=new Map();let total=0,nocoord=0;
    ROWS.forEach((e,i)=>{const s=pick(e);if(!s)return;total++;if(!(e.lat&&e.lon)){nocoord++;return}
      const key=(+e.lat).toFixed(4)+","+(+e.lon).toFixed(4);if(!grp.has(key))grp.set(key,[]);grp.get(key).push({e,i,s})});
    const pts=[];
    grp.forEach((a,key)=>{const [la,lo]=key.split(",").map(Number);pts.push([la,lo]);const allSoon=a.every(o=>o.s==="soon");const c=a.length===1?(CC[a[0].e.category]||"#b5523b"):"#b5523b";
      const icon=L.divIcon({className:"qmpin",html:`<span class="qmdot${allSoon?" soon":""}" style="--c:${c}">${a.length>1?a.length:""}</span>`,iconSize:[28,28],iconAnchor:[14,14],popupAnchor:[0,-12]});
      const venue=a[0].e.venue||"";
      const html=`<div class="qmpop">${a.length>1?`<p class="qmvn">📍 ${esc(venue.replace(/\s*\(.*$/,""))} · ${a.length}건</p>`:""}${a.map(o=>{const e=o.e;return`<button type="button" class="qmit" data-i="${o.i}">${e.thumb_small?`<img src="${esc(e.thumb_small)}" alt="" loading="lazy">`:`<span class="qmnoimg" style="--c:${CC[e.category]||"#b5523b"}"></span>`}<span class="qmtx"><em style="--c:${CC[e.category]||"#b5523b"}">${esc(e.category)}${o.s==="soon"?" · 곧 시작":""}</em><b>${esc(e.title_ko)}</b><small>${md(e.start)}${e.end&&e.end!==e.start?" ~ "+md(e.end):""}${a.length>1?"":" · "+esc(venue)}</small></span></button>`}).join("")}</div>`;
      L.marker([la,lo],{icon,qn:a.length,title:a.map(o=>o.e.title_ko).join(" / ")}).bindPopup(html,{maxWidth:300,minWidth:230,autoPanPadding:[20,60]}).addTo(layer)});
    document.getElementById("qmcnt").textContent=`핀 ${grp.size}곳 · 행사 ${total-nocoord}건`;
    document.getElementById("qmnote").textContent=(nocoord?`위치 정보가 없는 ${nocoord}건은 지도에서 빠졌어요(목록에서 볼 수 있어요). `:"")+"쿠지·가챠·잡지 부록처럼 정해진 행사장이 없는 건 표시하지 않아요.";
    map.invalidateSize();
    if(reg!==lastRegion||!pts.length){const c=CENTER[reg]||CENTER.tokyo;map.setView([c[0],c[1]],c[2]);lastRegion=reg}
    if(pts.length){const b=L.latLngBounds(pts);map.fitBounds(b.pad(0.12),{maxZoom:14})}
  }).catch(()=>{document.getElementById("qmnote").textContent="지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."})}
  function openE(i){const e=ROWS[i];if(!e)return;if(window.QJ_hasDetail&&QJ_hasDetail(e))QJ_openDetail(e);else if(e.official_url)window.open(e.official_url,"_blank","noopener")}
  window.QJMAP={show(on){sec.hidden=!on;if(on)draw()},rows(r){ROWS=r||[];draw()}};
})();
