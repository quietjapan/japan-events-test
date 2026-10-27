const CATS=["팝업스토어","콜라보카페","전시·행사","축제","가챠","쿠지","플리마켓","잡지 부록"];
const STOCK=new Set(["가챠","쿠지"]);const SHOP=new Set(["팝업스토어","콜라보카페","쿠지","가챠","잡지 부록"]);
const hasGal=e=>!!(e.gallery&&e.gallery.length);const hasDetail=e=>!!e;const MAG="잡지 부록";const MAG_DAYS=35;
const CATCLS={"팝업스토어":"c-pop","콜라보카페":"c-cafe","전시·행사":"c-expo","축제":"c-fest","가챠":"c-gacha","쿠지":"c-kuji","플리마켓":"c-flea","잡지 부록":"c-mag"};
const GEN={"콜라보카페":"cafe","팝업스토어":"pop","전시·행사":"expo","쿠지":"kuji","가챠":"kuji","잡지 부록":"mag","축제":"fest","플리마켓":"flea"};const GENL=[["cafe","☕ 콜라보카페"],["pop","🛍️ 팝업"],["expo","🖼️ 원화전·전시"],["fest","🎪 축제"],["flea","🧺 플리마켓"],["kuji","🎟️ 쿠지·가챠"],["mag","📚 잡지 부록"]];window.QJ_GEN=GEN;
const st={g:new Set(),qd:"all",cat:"",area:"",q:"",s:"all",from:"",to:"",bm:false,region:"tokyo",tg:new Set()};
const TAGS=e=>{const p=String(e.price||"").trim(),r=String(e.reservation||"").trim(),t=[];if(p==="무료"||/입장 무료/.test(p))t.push("free");if(/^필요/.test(r))t.push("resv");if(/^추첨/.test(r))t.push("lot");return t};const TAGL={free:"입장 무료",resv:"예약 필수",lot:"추첨"};window.QJ_TAGS=TAGS;
// 🗾 지역(도쿄/오사카) 토글: events.json의 region(tokyo/osaka/all). all(전국: 가챠·쿠지·잡지 부록)은 두 지역 모두에 보여요.
const REG={tokyo:"도쿄",osaka:"오사카",fukuoka:"후쿠오카"};const REGK="qj_region";
const regionOf=e=>e.region||(e.area==="오사카"?"osaka":e.area==="후쿠오카"?"fukuoka":e.area==="전국"?"all":"tokyo");
const isNat=e=>regionOf(e)==="all";let NAT0=-1,NATN=0;
const inRegion=e=>{const r=regionOf(e);return r==="all"||r===st.region};
(()=>{let r=null;try{r=new URLSearchParams(location.search).get("region")}catch(e){}if(!REG[r]){try{r=localStorage.getItem(REGK)}catch(e){}}st.region=REG[r]?r:"tokyo";try{const sp=new URLSearchParams(location.search);(sp.get("g")||"").split(",").forEach(x=>{if(x==="etc"){st.g.add("fest");st.g.add("flea")}else if(x)st.g.add(x)});st.q=sp.get("q")||""}catch(e){}window.QJ_REGION=st.region;document.documentElement.setAttribute("data-region",st.region);document.querySelectorAll("#region button[data-r]").forEach(b=>{const on=b.dataset.r===st.region;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)})})();
// ⭐ 북마크: 이 기기 브라우저(localStorage)에만 저장. 묶인 카드도 같은 키(seriesKey)로 저장돼요.
const BMK="qj_bm";let BM=new Set();try{BM=new Set(JSON.parse(localStorage.getItem(BMK)||"[]"))}catch(e){}
const saveBM=()=>{try{localStorage.setItem(BMK,JSON.stringify([...BM]))}catch(e){}};let EV=[];
const tokyoYMD=(d=new Date())=>{const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);const g=t=>p.find(x=>x.type===t).value;return`${g("year")}-${g("month")}-${g("day")}`};
const today=(()=>{const[y,m,d]=tokyoYMD().split("-").map(Number);return new Date(y,m-1,d)})();window.QJ_TODAY=today;
const pd=s=>{if(!s)return null;const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const fmt=s=>{const d=pd(s);if(!d)return"";return `${d.getMonth()+1}/${d.getDate()}(${"일월화수목금토"[d.getDay()]})`};
function status(e){const s=pd(e.start),en=pd(e.end);
  if(e.category===MAG){if(!s)return{k:"end"};const age=Math.round((today-s)/864e5);if(age>MAG_DAYS)return{k:"end"};return age<0?{k:"soon",t:"발매 예정"}:{k:"now",t:"발매 중"}}
  const sk=STOCK.has(e.category);
  if(en&&en<today)return{k:"end"};if(!s&&sk)return{k:"soon",t:"입고 예정"};if(s&&s>today)return{k:"soon",t:sk?"입고 예정":"예정"};
  const left=en?Math.round((en-today)/864e5):99;
  return left<=14?{k:"ending",t:left===0?"오늘 종료":`곧 종료 D-${left}`}:{k:"now",t:sk?"입고 중":"진행 중"}}
function urg(e,x){const s=pd(e.start),en=pd(e.end);
  if(x.k==="ending"){const l=Math.round((en-today)/864e5);return{c:l<=7?"u-hot":"u-warm",t:`🔥 ${l===0?"오늘 종료":"D-"+l}`}}
  if((STOCK.has(e.category)||e.category===MAG)&&s&&s>today){const l=Math.round((s-today)/864e5);if(l<=7)return{c:"u-new",t:`🆕 곧 발매 D-${l}`}}
  return null}
// 상태 배지(일본 시간 기준): 종료 임박=3일 안에 끝남, 곧 시작=7일 안에 시작, 진행 중
function qstat(e,x){if(e._dates)return null;const s=pd(e.start),en=pd(e.end);x=x||status(e);
  if(x.k==="soon"){if(!s)return null;const n=Math.round((s-today)/864e5);return n<=7?{k:"start7",t:n<=1?(n===0?"오늘 시작":"내일 시작"):`곧 시작 D-${n}`}:null}
  if(x.k==="now"||x.k==="ending"){if(en&&e.category!==MAG){const l=Math.round((en-today)/864e5);if(l<=3)return{k:"end3",t:l===0?"오늘 종료":`종료 임박 D-${l}`}}return{k:"live",t:x.t||"진행 중"}}return null}
window.QJ_qstat=qstat;
// 빠른 날짜 필터: 전체 / 오늘 / 이번 주말 / 2주 이내 (일본 시간)
const iso2=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function qdRange(k){const t=new Date(today);if(k==="today")return[iso2(t),iso2(t)];
  if(k==="weekend"){const w=t.getDay();const a=new Date(t),b=new Date(t);if(w===0)return[iso2(t),iso2(t)];a.setDate(t.getDate()+(6-w));b.setDate(a.getDate()+1);return[iso2(a),iso2(b)]}
  if(k==="2w"){const b=new Date(t);b.setDate(t.getDate()+13);return[iso2(t),iso2(b)]}return null}
const inQD=e=>{const r=qdRange(st.qd);if(!r)return true;const s=e.start||"0000",en=e.end||(e.category===MAG&&e.start?magEnd(e):"9999");return s<=r[1]&&en>=r[0]};
const magEnd=e=>{const d=pd(e.start);d.setDate(d.getDate()+MAG_DAYS);return iso(d)};
const inRange=e=>{if(!st.from&&!st.to)return true;const s=e.start||"0000",en=e.end||(e.category===MAG&&e.start?magEnd(e):"9999");
  return(!st.to||s<=st.to)&&(!st.from||en>=st.from)};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pricet=s=>(window.FX&&FX.annotate)?FX.annotate(s):esc(s);
const CITY={"도쿄":[35.6812,139.7671],"오사카":[34.6937,135.5023],"교토":[35.0116,135.7681],"나고야":[35.1709,136.8815],"후쿠오카":[33.5902,130.4017],"삿포로":[43.0618,141.3545],"요코하마":[35.4437,139.638]};
const WX={0:["☀️","맑음"],1:["🌤️","대체로 맑음"],2:["⛅","구름 조금"],3:["☁️","흐림"],45:["🌫️","안개"],48:["🌫️","안개"],51:["🌦️","약한 이슬비"],53:["🌦️","이슬비"],55:["🌦️","강한 이슬비"],56:["🌧️","어는 이슬비"],57:["🌧️","어는 이슬비"],61:["🌧️","약한 비"],63:["🌧️","비"],65:["🌧️","강한 비"],66:["🌧️","어는 비"],67:["🌧️","어는 비"],71:["🌨️","약한 눈"],73:["🌨️","눈"],75:["🌨️","많은 눈"],77:["🌨️","싸락눈"],80:["🌦️","소나기"],81:["🌦️","소나기"],82:["⛈️","강한 소나기"],85:["🌨️","눈 소나기"],86:["🌨️","눈 소나기"],95:["⛈️","뇌우"],96:["⛈️","뇌우·우박"],99:["⛈️","뇌우·우박"]};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const FC_DAYS=16;const wxCache={};
function coords(e){if(e.lat&&e.lon)return[e.lat,e.lon,true];const c=CITY[e.area];return c?[c[0],c[1],false]:null}
function pickRange(e){if(e.area==="전국"||e.category===MAG||!coords(e)||!e.start)return null;const mn=[e.start,iso(today)].sort()[1];const mx=e.end||e.start;return mn<=mx?[mn,mx]:null}
function dayWx(lat,lon,date){const k=`${lat},${lon}`;
  wxCache[k]=wxCache[k]||fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=${FC_DAYS}`).then(r=>r.json());
  return wxCache[k].then(d=>{const i=d.daily.time.indexOf(date);return i<0?null:{c:d.daily.weather_code[i],hi:d.daily.temperature_2m_max[i],lo:d.daily.temperature_2m_min[i],p:d.daily.precipitation_probability_max[i]}})}
document.addEventListener("change",ev=>{const inp=ev.target;if(!inp.classList||!inp.classList.contains("visit"))return;
  const out=inp.closest(".pick").querySelector(".pickwx");const v=inp.value;if(!v){out.innerHTML="";return}
  const lim=new Date(today);lim.setDate(lim.getDate()+FC_DAYS-1);
  if(pd(v)>lim){out.innerHTML=`<span class="wx-msg">🗓️ ${fmt(v)} · 아직 예보가 없어요 (약 2주 전부터 확인 가능)</span>`;return}
  out.innerHTML='<span class="wx-msg">불러오는 중…</span>';
  dayWx(+inp.dataset.lat,+inp.dataset.lon,v).then(w=>{if(!w){out.innerHTML=`<span class="wx-msg">🗓️ ${fmt(v)} · 아직 예보가 없어요 (약 2주 전부터 확인 가능)</span>`;return}
    const x=WX[w.c]||["🌡️","-"];
    out.innerHTML=`<div class="pw"><span class="pi">${x[0]}</span><div><b>${fmt(v)} ${x[1]}</b><div>최고 ${Math.round(w.hi)}° / 최저 ${Math.round(w.lo)}° · ☔ 강수확률 ${w.p??"-"}%</div><div class="ps">${esc(inp.dataset.src)} 기준 예보 (Open-Meteo)</div></div></div>`})
  .catch(()=>{out.innerHTML='<span class="wx-msg">날씨를 불러오지 못했어요.</span>'})});
function picker(e){const r=pickRange(e);if(!r)return"";const [la,lo,venue]=coords(e);
  return `<div class="pick"><label>📅 방문 날짜 <input type="date" class="visit" min="${r[0]}" max="${r[1]}" data-lat="${la}" data-lon="${lo}" data-src="${venue?"행사장 위치":e.area+" 시내"}"></label><div class="pickwx"><span class="wx-msg">날짜를 고르면 그날 날씨가 보여요</span></div></div>`}
const mapq=e=>e.area!=="전국"&&e.category!==MAG&&e.map_query?e.map_query:"";
const thumb=e=>`<div class="th dt ${CATCLS[e.category]||""}"><span>${esc(e.category)}</span>${e.thumbnail?`<img src="${esc(e.thumb_small||e.thumbnail)}" ${e.thumb_small?`data-orig="${esc(e.thumbnail)}"`:""} alt="" ${e.thumb_pos?`style="object-position:${esc(e.thumb_pos)}"`:""} loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="if(this.dataset.orig){this.src=this.dataset.orig;delete this.dataset.orig}else this.remove()">`:""}</div>`;
document.addEventListener("toggle",ev=>{const d=ev.target;if(!(d instanceof HTMLDetailsElement)||!d.open||!d.classList.contains("map"))return;
  mapLoad(d)},true);
function mapLoad(d){const box=d.querySelector(".mapbox");if(box.querySelector("iframe"))return;
  box.innerHTML=`<div class="mapwait" aria-live="polite">📍 지도 불러오는 중…</div><iframe referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(d.dataset.q)}&output=embed" title="지도"></iframe>`;
  const f=box.querySelector("iframe");f.addEventListener("load",()=>{const w=box.querySelector(".mapwait");if(w)w.remove();f.classList.add("ok")},{once:true})}
// PC: 마우스를 올리면 미리 불러와서 펼칠 때 바로 보이게
document.addEventListener("pointerenter",ev=>{if(ev.pointerType!=="mouse")return;const s=ev.target;if(!(s instanceof Element)||s.tagName!=="SUMMARY")return;const d=s.closest("details.map");if(d)mapLoad(d)},true);
// 같은 행사가 날짜만 다른 경우(오이 경마장 플리마켓 등) 한 카드로 묶기. events.json은 날짜별 항목 그대로 유지.
// 키: 명시적 `series` 필드가 있으면 그것, 없으면 카테고리+한국어 제목+공식 URL이 모두 같을 때.
const seriesKey=e=>e.series?`s:${e.series}`:`a:${e.category}|${e.title_ko}|${e.official_url||""}`;
let GROUPS=[],CARDS=[];
function buildGroups(){const m=new Map();EV.forEach(e=>{const k=seriesKey(e);if(!m.has(k))m.set(k,[]);m.get(k).push(e)});
  GROUPS=[...m.values()].map(a=>a.slice().sort((x,y)=>(x.start||"").localeCompare(y.start||"")))}
const HRS=/^\s*(\d{1,2}:\d{2}\s*[~〜-]\s*\d{1,2}:\d{2}(?:\s*\([^)]*\))?)\s*[.,]?\s*/;
const DATELIST=/\d{1,2}\/\d{1,2}\s*·/;
const md=s=>{const d=pd(s);return `${d.getMonth()+1}/${d.getDate()}`};
const mdList=a=>{let pm=null;return a.map(s=>{const d=pd(s),m=d.getMonth()+1;const t=pm===m?`${d.getDate()}`:`${m}/${d.getDate()}`;pm=m;return t}).join("·")};
function seriesUnit(rem){const nx=rem[0],last=rem[rem.length-1];
  const any=f=>(rem.find(e=>e[f]&&(!Array.isArray(e[f])||e[f].length))||{})[f];
  const v=Object.assign({},nx,{_dates:rem,start:nx.start,end:last.end||last.start,date_label:null,blog_url:nx.blog_url||any("blog_url"),gallery:hasGal(nx)?nx.gallery:(any("gallery")||nx.gallery),thumbnail:nx.thumbnail||any("thumbnail")});
  if(v.thumbnail&&!nx.thumbnail){const t=rem.find(e=>e.thumbnail);v.thumbnail_source=t.thumbnail_source;v.thumb_pos=t.thumb_pos;v.image_local=t.image_local;v.image_hd=t.image_hd;v.image_fb=t.image_fb}
  const s=pd(nx.start),en=pd(nx.end||nx.start);let x;
  if(s<=today&&today<=en)x={k:"now",t:"오늘 개최"};else{const n=Math.round((s-today)/864e5);x={k:"soon",t:n===1?"다음 개최 내일":`다음 개최 D-${n}`}}
  return{e:v,x,series:true}}
function seriesInfo(e){const rem=e._dates;
  const parts=rem.map(d=>{const n=d.notes||"";const m=n.match(HRS);return{d,h:m?m[1].trim():"",rest:(m?n.slice(m[0].length):n).trim()}});
  // 시간: 다르면 시간별로 묶어서, 모두 같으면 한 줄
  const hs=[...new Set(parts.map(p=>p.h))];let hours="";
  if(hs.some(Boolean)){if(hs.length===1)hours=esc(hs[0]);
    else hours=hs.map(h=>`<div class="hrow"><b class="hdt">${mdList(parts.filter(p=>p.h===h).map(p=>p.d.start))}</b> <span class="hh${h?"":" hnone"}">${h?esc(h):"공식 안내 확인"}</span></div>`).join("")}
  // 공통 메모: 가장 많이 나온 메모(날짜 나열 메모는 날짜 목록으로 대체되므로 제외), 다른 날짜만의 추가 메모는 날짜와 함께
  const rests=parts.map(p=>p.rest).filter(r=>r&&!DATELIST.test(r));const cnt={};rests.forEach(r=>cnt[r]=(cnt[r]||0)+1);
  const common=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]||a.length-b.length)[0]||"";
  const extra=parts.filter(p=>p.rest&&p.rest!==common&&!DATELIST.test(p.rest)).map(p=>{let r=p.rest;if(common&&r.startsWith(common.replace(/[.\s]+$/,"")))r=r.slice(common.replace(/[.\s]+$/,"").length).replace(/^[.\s,]+/,"");return r?`${md(p.d.start)}: ${esc(r)}`:""}).filter(Boolean);
  const inR=d=>(st.from||st.to)&&inRange(d);const SHOW=6;
  const chip=d=>`<span class="sd${inR(d)?" inr":""}">${fmt(d.start)}</span>`;
  const list=rem.length>SHOW&&!rem.slice(SHOW).some(inR)?`${rem.slice(0,SHOW).map(chip).join("")}<button type="button" class="moredates">+${rem.length-SHOW}개 더 보기</button><span class="sdx" hidden>${rem.slice(SHOW).map(chip).join("")}</span>`:rem.map(chip).join("");
  return{list,hours,note:[common&&esc(common),...extra].filter(Boolean).join(" · ")}}
function dlDates(e){if(e._dates){const i=seriesInfo(e);
    return `<dt>다음</dt><dd><b class="nextd">${fmt(e._dates[0].start)}</b> <span class="cntd">외 ${e._dates.length-1}회</span></dd><dt>일정</dt><dd class="sdates">${i.list}</dd>${i.hours?`<dt>시간</dt><dd class="hours">${i.hours}</dd>`:""}`}
  return `<dt>${STOCK.has(e.category)||e.category===MAG?"발매":"기간"}</dt><dd>${e.date_label?esc(e.date_label):`${e.start?fmt(e.start):""}${e.end&&e.end!==e.start?" ~ "+fmt(e.end):(!e.end&&!STOCK.has(e.category)&&e.category!==MAG?" ~":"")}`}</dd>`}
const noteOf=e=>e._dates?seriesInfo(e).note:(e.notes?esc(e.notes):"");
const sortKey=e=>e._dates?(e._dates[0].end||e._dates[0].start):(e.category===MAG?magEnd(e):(e.end||"9"));
function units(){return GROUPS.map(g=>{if(g.length===1)return{e:g[0],x:status(g[0])};
  const rem=g.filter(e=>status(e).k!=="end");if(!rem.length)return null;if(rem.length===1)return{e:rem[0],x:status(rem[0])};return seriesUnit(rem)}).filter(Boolean)}
const PER=12;let PAGE=0;
function pagerHTML(cur,n){if(n<2)return"";const set=new Set([0,n-1,cur-1,cur,cur+1]);if(cur<=3)[1,2,3,4].forEach(i=>set.add(i));if(cur>=n-4)[n-5,n-4,n-3,n-2].forEach(i=>set.add(i));const ps=[...set].filter(i=>i>=0&&i<n).sort((a,b)=>a-b);let h=`<button type="button" class="pg pnav" data-p="${cur-1}" ${cur===0?"disabled":""} aria-label="이전 페이지">‹</button>`,last=-1;
  ps.forEach(i=>{if(i-last>1)h+=`<span class="pgdots">…</span>`;h+=`<button type="button" class="pg${i===cur?" on":""}" data-p="${i}" ${i===cur?'aria-current="page"':""} aria-label="${i+1}페이지">${i+1}</button>`;last=i});
  return h+`<button type="button" class="pg pnav" data-p="${cur+1}" ${cur===n-1?"disabled":""} aria-label="다음 페이지">›</button>`}
window.QJ_pagerHTML=pagerHTML;
let LAST="";
function syncURL(){if(DETAIL_E||!EV.length)return;try{const sp=new URLSearchParams(location.search);sp.delete("item");sp.set("region",st.region);st.g.size?sp.set("g",[...st.g].join(",")):sp.delete("g");st.q.trim()?sp.set("q",st.q.trim()):sp.delete("q");history.replaceState(history.state,"",location.pathname+"?"+sp.toString()+location.hash)}catch(e){}}
window.QJ_render=k=>render(k);window.QJ_bm=()=>({on:st.bm,list:EV.filter(e=>BM.has(seriesKey(e))&&e.start)});window.QJ_cards=()=>CARDS;
function render(keep){if(!keep)PAGE=0;
  const q=st.q.trim().normalize("NFKC").toLowerCase();
  const rows=units().filter(({e,x})=>x.k!=="end"
    &&(st.bm?BM.has(seriesKey(e)):inRegion(e))
    &&(st.bm||!st.g.size||st.g.has(GEN[e.category]))&&(st.bm||!window.QJ_BOUNDS||(!isNat(e)&&e.lat&&e.lon&&QJ_BOUNDS(e)))&&(!st.area||e.area===st.area)
    &&(st.s==="all"||(st.s==="soon"?x.k==="soon":x.k!=="soon"))
    &&(e._dates?e._dates.some(inRange):inRange(e))&&(e._dates?e._dates.some(inQD):inQD(e))
    &&(!st.tg.size||TAGS(e).some(t=>st.tg.has(t)))
    &&(!q||[e.title_ko,e.title_ja,e.venue,e.summary_ko].join(" ").normalize("NFKC").toLowerCase().includes(q)))
   .sort((a,b)=>st.bm?((a.e.start||"9").localeCompare(b.e.start||"9")||sortKey(a.e).localeCompare(sortKey(b.e))):sortKey(a.e).localeCompare(sortKey(b.e)));
  // 지역 행사 먼저, 그 아래 전국 공통(쿠지·가챠·잡지 부록) 구역
  {const loc=rows.filter(r=>!isNat(r.e)),nat=rows.filter(r=>isNat(r.e));rows.length=0;rows.push(...loc,...nat);NAT0=nat.length?loc.length:-1;NATN=nat.length}
  CARDS=rows.map(r=>r.e);
  {const vl=document.getElementById("vline");if(vl){const n=units().filter(({e,x})=>inRegion(e)&&(x.k==="now"||x.k==="ending")).length;vl.innerHTML=`지금 ${REG[st.region]}에서 열리는 애니·팝업 <b>${n}건</b>`}}
  window.QJCAL&&QJCAL(CARDS);
  document.getElementById("count").textContent=st.bm?`${rows.length}건 (전 지역)`:(NATN?`${REG[st.region]} ${rows.length-NATN}건 + 전국 공통 ${NATN}건`:`${REG[st.region]} ${rows.length}건`);
  const fc=document.getElementById("fcnt");if(fc){const n=(st.area?1:0)+((st.from||st.to)?1:0)+(st.s!=="all"?1:0)+st.tg.size+(st.bm?1:0)+(st.qd!=="all"?1:0);fc.hidden=!n;fc.textContent=n?String(n):"";fc.setAttribute("aria-label",n?`${n}개 적용 중`:"");const fr0=document.getElementById("fpreset");if(fr0)fr0.disabled=!n}
  document.getElementById("magintro").hidden=st.bm||!(st.g.size===1&&st.g.has("mag"));syncURL();window.QJ_afterRender&&QJ_afterRender({units:units().filter(({e,x})=>x.k!=="end"&&inRegion(e)),region:st.region,REG,status,openDetail,fmt,last:LAST});
  const NP=Math.max(1,Math.ceil(rows.length/PER));PAGE=Math.min(Math.max(0,PAGE),NP-1);const P0=PAGE*PER;
  {let pg=document.getElementById("pager");if(!pg){pg=document.createElement("nav");pg.id="pager";pg.className="pager";pg.setAttribute("aria-label","페이지");const L=document.getElementById("list");L.parentNode.appendChild(pg);
    pg.onclick=ev=>{const b=ev.target.closest("button[data-p]");if(!b||b.disabled)return;PAGE=+b.dataset.p;render(true);const L2=document.getElementById("list");const y=L2.getBoundingClientRect().top+scrollY-12;scrollTo({top:Math.max(0,y-(document.querySelector(".vtoggle")?60:0)),behavior:"smooth"})}}
   pg.innerHTML=pagerHTML(PAGE,NP);pg.hidden=NP<2}
  document.getElementById("list").innerHTML=rows.length?rows.slice(P0,P0+PER).map(({e,x},ci0)=>{const ci=ci0+P0;const u=e._dates?null:urg(e,x);return `${ci===NAT0||(ci0===0&&NAT0>=0&&ci>NAT0)?`<div class="natsec" role="heading" aria-level="2"><b>🗾 전국 공통 · 일본 어디서나</b> <span>쿠지·가챠·잡지 부록 ${NATN}건</span><p>지역과 상관없이 전국 편의점·서점·가챠 코너에서 살 수 있는 상품이에요.</p></div>`:""}
  <article tabindex="0" role="button" aria-label="${esc(e.title_ko)} 자세히 보기" class="card${u?" "+u.c:""}${e._dates?" series":""}" data-i="${ci}" data-eid="${itemId(e)}">${u?`<div class="ub">${u.t}</div>`:""}${(()=>{const on=BM.has(seriesKey(e));return `<button type="button" class="bm${on?" on":""}" aria-pressed="${on}" aria-label="${on?"북마크 해제":"북마크"}" title="${on?"북마크 해제":"북마크"}">${on?"★":"☆"}</button>`})()}${e.start?`<button type="button" class="cadd" data-ci="${ci}" aria-label="내 캘린더에 넣기" title="내 캘린더에 넣기">📅</button>`:""}
  <div class="top">${thumb(e)}<div class="tx"><div class="badges"><span class="b cat ${CATCLS[e.category]||""}">${esc(e.category)}</span>${(()=>{const q=qstat(e,x);return q?`<span class="b sb sb-${q.k}">${esc(q.t)}</span>`:`<span class="b ${x.k}">${u&&x.k==="ending"?"곧 종료":x.t}</span>`})()}${isNat(e)?`<span class="b natb">전국 공통</span>`:`<span class="b">${esc(e.area)}</span>`}${TAGS(e).map(t=>`<span class="b tg tg-${t}">${TAGL[t]}</span>`).join("")}</div>
  <h2 class="dt">${esc(e.title_ko)}</h2>${e.title_ja?`<p class="ja">${esc(e.title_ja)}</p>`:""}</div></div>
  <ul class="cmeta"><li><span class="ci">🗓️</span>${e._dates?`다음 ${esc(fmt(e._dates[0].start))} <em>외 ${e._dates.length-1}회</em>`:esc(period(e))}</li>${e.venue?`<li><span class="ci">📍</span>${esc(e.venue)}</li>`:""}${e.price?`<li><span class="ci">🏷️</span>${pricet(e.price)}</li>`:""}</ul>
  <span class="cgo" aria-hidden="true">자세히 ›</span>
  </article>`}).join(""):(st.bm?`<div class="empty"><p>⭐ 아직 북마크한 일정이 없어요.</p><p class="esub">가고 싶은 일정의 ☆를 누르면 여기에 날짜순으로 모여요. (이 기기·브라우저에만 저장돼요)</p></div>`:`<div class="empty"><p>조건에 맞는 일정이 없어요.</p><button type="button" id="freset" class="freset">🔄 필터 초기화</button></div>`)}

const WD=["일","월","화","수","목","금","토"];
const seoulYMD=()=>{const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t).value;return`${g("year")}-${g("month")}-${g("day")}`};
const parseYMD=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const fmtMDW=dt=>`${dt.getMonth()+1}/${dt.getDate()}(${WD[dt.getDay()]})`;
function nextMonThuAfter(ymd,{inclusive=false}={}){
  const d=parseYMD(ymd);d.setDate(d.getDate()+(inclusive?0:1));
  for(let i=0;i<8;i++){const w=d.getDay();if(w===1||w===4)return d;d.setDate(d.getDate()+1)}
  return d;
}
function setUpdateLabel(last){
  const el=document.getElementById("upd");if(!el||!last)return;
  const lastD=parseYMD(last);if(Number.isNaN(lastD.getTime()))return;
  let next=nextMonThuAfter(last,{inclusive:false});
  const today=seoulYMD();
  const nextYMD=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`;
  if(nextYMD<today) next=nextMonThuAfter(today,{inclusive:true});
  el.textContent=`${fmtMDW(lastD)} 업데이트 · 다음 ${fmtMDW(next)}`;
  el.hidden=false;
}

fetch("events.json",{cache:"no-store"}).then(r=>r.json()).then(d=>{
  EV=d.events||[];LAST=d.last_updated||"";buildGroups();document.getElementById("base").textContent=`기준일: ${d.base_date}`;
  setUpdateLabel(d.last_updated);
  if(d.is_sample)document.getElementById("banner").hidden=false;
  const chips=document.getElementById("chips");
  chips.setAttribute("role","group");chips.setAttribute("aria-label","장르 (여러 개 선택 가능)");
  const paintChips=()=>document.querySelectorAll("#chips button,#bmwrap button").forEach(x=>{const on=x.dataset.bm?st.bm:x.dataset.g?(!st.bm&&st.g.has(x.dataset.g)):(!st.bm&&!st.g.size);x.classList.toggle("on",on);x.setAttribute("aria-pressed",on)});window.QJ_paintChips=paintChips;
  chips.innerHTML=`<button data-g="">전체</button>`+GENL.map(([k,l])=>`<button data-g="${k}">${l}</button>`).join("");const bmw=document.getElementById("bmwrap");if(bmw)bmw.innerHTML=`<button type="button" data-bm="1" class="bmtab">⭐ 북마크만 보기</button>`;else chips.insertAdjacentHTML("beforeend",`<button data-bm="1" class="bmtab">⭐ 북마크</button>`);paintChips();
  const chipClick=ev=>{const b=ev.target.closest("button");if(!b)return;if(b.dataset.bm){st.bm=!st.bm}else{st.bm=false;const k=b.dataset.g;if(!k)st.g.clear();else st.g.has(k)?st.g.delete(k):st.g.add(k)}paintChips();render();window.gtag&&gtag("event","select_tab",{tab:st.bm?"북마크":([...st.g].join(",")||"전체")})};chips.onclick=chipClick;if(bmw)bmw.onclick=chipClick;
  const tgb=document.getElementById("tg");if(tgb){tgb.onclick=ev=>{const b=ev.target.closest("button[data-tg]");if(!b)return;const k=b.dataset.tg;st.tg.has(k)?st.tg.delete(k):st.tg.add(k);const on=st.tg.has(k);b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);render();window.gtag&&gtag("event","select_tag_chip",{chip:k,on})}}
  const qd=document.getElementById("qd");if(qd){qd.onclick=ev=>{const b=ev.target.closest("button[data-qd]");if(!b)return;st.qd=b.dataset.qd;qd.querySelectorAll("button").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on)});render();window.gtag&&gtag("event","select_date_chip",{chip:st.qd})}}
  const sel=document.getElementById("area");
  const fillArea=()=>{const areas=[...new Set(EV.filter(inRegion).map(e=>e.area))];while(sel.options.length>1)sel.remove(1);areas.forEach(a=>sel.add(new Option(a,a)));if(st.area&&!areas.includes(st.area))st.area="";sel.value=st.area};fillArea();
  sel.onchange=()=>{st.area=sel.value;render()};
  const rg=document.getElementById("region");
  const paintRegion=()=>{document.documentElement.setAttribute("data-region",st.region);if(rg)rg.querySelectorAll("button").forEach(b=>{const on=b.dataset.r===st.region;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on)})};
  window.setRegion=(r,{persist=true,track=false}={})=>{if(!REG[r])return;const ch=r!==st.region;st.region=r;window.QJ_REGION=r;if(persist){try{localStorage.setItem(REGK,r)}catch(x){}}
    paintRegion();if(ch){fillArea();render();window.QJWX&&QJWX(r)}if(track&&window.gtag)gtag("event","select_region",{region:REG[r]})};
  if(rg)rg.onclick=ev=>{const b=ev.target.closest("button[data-r]");if(!b)return;const r=b.dataset.r;if(r===st.region)return;setRegion(r,{track:true})};
  paintRegion();
  const fr=document.getElementById("from"),to=document.getElementById("to");
  const setR=()=>{st.from=fr.value;st.to=to.value;if(st.from&&st.to&&st.from>st.to){st.to=st.from;to.value=st.from}to.min=st.from||"";render()};
  fr.onchange=setR;to.onchange=setR;
  document.getElementById("rreset").onclick=()=>{fr.value=to.value="";setR()};
  window.resetFilters=()=>{fr.value=to.value="";st.from=st.to="";to.min="";sel.value="";st.area="";const qi=document.getElementById("q");qi.value="";st.q="";st.s="all";st.cat="";st.g.clear();st.bm=false;window.QJ_clearBounds&&QJ_clearBounds();st.tg.clear();document.querySelectorAll("#tg button").forEach(x=>{x.classList.remove("on");x.setAttribute("aria-pressed","false")});st.qd="all";document.querySelectorAll("#qd button").forEach(x=>{const on=x.dataset.qd==="all";x.classList.toggle("on",on);x.setAttribute("aria-pressed",on)});
    document.querySelectorAll("#status button").forEach(x=>x.classList.toggle("on",x.dataset.s==="all"));paintChips();render()};
  {const qi=document.getElementById("q");qi.value=st.q;qi.oninput=e=>{st.q=e.target.value;render()};window.QJ_setQ=v=>{qi.value=v;st.q=v;render()};window.QJ_EV=()=>EV.filter(inRegion)}
  const tg=document.getElementById("status");tg.onclick=ev=>{const b=ev.target.closest("button");if(!b)return;st.s=b.dataset.s;tg.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));render()};
  render();
  const want=new URLSearchParams(location.search).get("item");
  if(want){try{history.replaceState(null,"",baseURL()+location.hash)}catch(x){}
    {const raw0=EV.find(c=>itemId(c)===want);if(raw0){const r0=regionOf(raw0);if(r0!=="all"&&r0!==st.region&&window.setRegion)setRegion(r0,{persist:false})}}
    let e=CARDS.find(c=>itemId(c)===want)||CARDS.find(c=>(c._dates||[]).some(d=>itemId(d)===want));
    if(!e){const raw=EV.find(c=>itemId(c)===want);if(raw){st.g=new Set([GEN[raw.category]]);st.q="";document.getElementById("q").value="";paintChips();render();e=CARDS.find(c=>c.title_ko===raw.title_ko&&c.category===raw.category)||raw}}
    if(e){const ix=CARDS.indexOf(e);if(ix>=PER){PAGE=Math.floor(ix/PER);render(true)}}
    if(e&&hasDetail(e))openDetail(e)}
  }).catch(()=>document.getElementById("list").innerHTML='<p class="empty">데이터를 불러오지 못했어요.</p>');

const host=u=>{try{return new URL(u).hostname.replace(/^www\./,"")}catch{return""}};
const period=e=>e._dates?`${fmt(e._dates[0].start)} 외 ${e._dates.length-1}회 (${e._dates.map(x=>md(x.start)).join(" · ")})`:e.date_label?e.date_label:`${e.start?fmt(e.start):""}${e.end&&e.end!==e.start?" ~ "+fmt(e.end):""}`;
// 원본 이미지가 깨지면(점검·HTML 리다이렉트 등) data-fb에 적힌 저장 사본으로 순서대로 바꿔요.
window.qjGalGone=f=>{const g=f.parentNode,dv=f.closest(".dv");f.remove();if(g&&!g.querySelector("figure")){const h=g.previousElementSibling;if(h&&h.classList.contains("dgh"))h.remove();g.remove()}
  if(dv&&!dv.querySelector(".dgrid figure")&&!dv.querySelector(".dwait.dgone")){const n=document.createElement("div");n.className="dwait dgone";n.setAttribute("role","note");n.innerHTML='<div class="dwait-i" aria-hidden="true">🛠️</div><p class="dwait-t">공식 사이트 점검 중이라 사진을 잠시 불러올 수 없어요</p><p class="dwait-s">사이트가 복구되면 다시 보여요. 그동안은 위 정보와 공식 사이트를 참고해 주세요.</p>';const a=dv.querySelector(".dnote")||dv.querySelector(".dlink");a?a.before(n):dv.appendChild(n)}};
window.qjLow=im=>{if(im.naturalWidth&&im.naturalWidth<400){const c=im.closest(".dcard");if(c)c.classList.add("dlow")}};
window.qjFb=im=>{const l=(im.dataset.fb||"").split("|").filter(Boolean);if(!l.length){im.onerror=null;const f=im.closest(".dgrid figure");if(f)qjGalGone(f);return}im.dataset.fb=l.slice(1).join("|");im.src=l[0]};
const fbAttr=a=>{a=a.filter(Boolean);return a.length?`data-fb="${esc(a.join("|"))}" onerror="qjFb(this)"`:""};
function dmeta(e){const m=mapq(e);const links=[m?`<a class="sec" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m)}" target="_blank" rel="noopener">지도 보기</a>`:"",e.source_url&&e.source_url!==e.official_url?`<a class="sec" href="${esc(e.source_url)}" target="_blank" rel="noopener">출처</a>`:""].join("");
  return `<div class="dmeta">${e.summary_ko?`<p class="dsumsrc"><a href="${esc(e.summary_source||e.official_url)}" target="_blank" rel="noopener">↑ 공식 페이지 요약 원문</a></p>`:""}
  <dl>${dlDates(e)}<dt>장소</dt><dd>${esc(e.venue)}</dd>${e.reservation?`<dt>예약</dt><dd>${esc(e.reservation)}</dd>`:""}${e.price?`<dt>가격</dt><dd>${pricet(e.price)}</dd>`:""}</dl>
  ${noteOf(e)?`<p class="note">📝 ${noteOf(e)}</p>`:""}${e.verified_at?`<p class="note">✅ 공식 사이트 원문 대조 ${esc(e.verified_at)}</p>`:""}
  ${picker(e)}${m?`<details class="map" data-q="${esc(m)}"><summary>📍 지도 펼치기</summary><div class="mapbox"></div></details>`:""}${links?`<div class="btns">${links}</div>`:""}</div>`}
function detail(e){const g=e.gallery||[];const groups=[...new Set(g.map(x=>x.group||""))];
  return `<div class="dv" role="dialog" aria-modal="true" aria-label="${esc(e.title_ko)} 자세히 보기"><button class="dvx" aria-label="닫기">✕</button>
  <div class="dcard${e.image_fit==="contain"?" dfit":""}${(e.image_hd||e.thumbnail)?"":" dnoimg"}">${(e.image_hd||e.thumbnail)?(e.image_fit==="contain"?`<img class="dblur" src="${esc(e.image_local||e.image_hd||e.thumbnail)}" alt="" aria-hidden="true" referrerpolicy="no-referrer" ${fbAttr([e.image_local?(e.image_hd||e.thumbnail):"",e.image_fb])}>`:"")+`<img class="dbg" onload="qjLow(this)" src="${esc(e.image_local||e.image_hd||e.thumbnail)}" alt="" ${e.thumb_pos&&e.image_fit!=="contain"?`style="object-position:${esc(e.thumb_pos)}"`:""} referrerpolicy="no-referrer" ${fbAttr([e.image_local?(e.image_hd||e.thumbnail):"",e.image_hd&&e.thumbnail&&e.image_hd!==e.thumbnail?e.thumbnail:"",e.image_fb])}>`:""}
   <div class="dpill">${esc(e.title_ko)}</div>
   <div class="dpanel">${e.title_ja?`<p class="dja">${esc(e.title_ja)}</p>`:""}${e.summary_ko?`<p class="dsum">${esc(e.summary_ko)}</p>`:""}
    <ul><li>📍 ${esc(e.venue)}</li><li>🗓️ ${esc(period(e))}</li>${e.price?`<li>🏷️ ${pricet(e.price)}</li>`:""}</ul>
    <div class="dtag">#${esc(e.category)} · ${esc(e.area)}</div>
    ${e.thumbnail?`<div class="dsrc">이미지 출처: <a href="${esc(e.thumbnail_source||e.official_url)}" target="_blank" rel="noopener">${esc(host(e.thumbnail_source||e.official_url||e.thumbnail))}</a></div>`:""}</div></div>
  <div class="dact"><button type="button" class="dshare">🔗 링크 복사</button>${window.QJ_calBtns?QJ_calBtns(e):""}</div>
  ${dmeta(e)}
  ${(e.info||[]).length?`<div class="dinfo">${e.info.map(b=>`<section><h3 class="dgh">${esc(b.h)}</h3><ul>${(b.items||[]).map(t=>`<li>${pricet(t)}</li>`).join("")}</ul></section>`).join("")}${e.info_source?`<p class="dnote">출처: <a href="${esc(e.info_source)}" target="_blank" rel="noopener">${esc(host(e.info_source))}</a></p>`:""}</div>`:""}
  ${g.length?groups.map(gr=>`<h3 class="dgh">${esc(gr||"갤러리")}</h3><div class="dgrid">${g.filter(x=>(x.group||"")===gr).map(x=>`<figure><a class="zoom" href="${esc(x.img_local||x.full||x.img)}" target="_blank" rel="noopener" data-cap="${esc(x.caption_ko)}" data-orig="${esc(x.full||x.img)}"${(x.img_local||x.img_fb)?` data-fb="${esc(x.img_local?(x.full||x.img):x.img_fb)}"`:""}><img src="${esc(x.img_local||x.img)}" alt="${esc(x.caption_ko)}" loading="lazy" referrerpolicy="no-referrer" ${fbAttr([x.img_local?x.img:"",x.img_fb])||`onerror="qjFb(this)"`}></a><figcaption><b>${esc(x.caption_ko)}</b>${x.caption_ja?`<span>${esc(x.caption_ja)}</span>`:""}${x.kinds||x.size?`<i>${esc([x.kinds,x.size].filter(Boolean).join(" · "))}</i>`:""}${x.price?`<em>${pricet(x.price)}</em>`:""}</figcaption></figure>`).join("")}</div>`).join("")
   +(e.gallery_more?`<a class="dmore" href="${esc(e.gallery_more.url)}" target="_blank" rel="noopener">${esc(e.gallery_more.label||"전체 보기")} →</a>`:"")+`<p class="dnote">${e.gallery_note?esc(e.gallery_note)+" · ":""}출처: <a href="${esc(e.gallery_source||e.official_url)}" target="_blank" rel="noopener">${esc(host(e.gallery_source||e.official_url))}</a>${e.copyright?` · ${esc(e.copyright)}`:""}</p>`:!SHOP.has(e.category)?"":`<div class="dwait" role="note"><div class="dwait-i" aria-hidden="true">⏳</div><p class="dwait-t">아직 공식 이미지·상품 정보가 공개되지 않았어요</p><p class="dwait-s">공개되는 대로 업데이트할게요. 그동안은 공식 사이트에서 소식을 확인해 주세요.</p></div>`}
  ${e.official_url?`<a class="dlink" href="${esc(e.official_url)}" target="_blank" rel="noopener">공식 사이트에서 확인하기</a>`:""}${e.blog_url?`<a class="dblog" href="${esc(e.blog_url)}" target="_blank" rel="noopener">블로그 글 보기</a>`:""}</div>`}
let DETAIL_E=null;
// 뒤로가기: 모달·라이트박스를 열 때 history 항목을 하나씩 쌓고, 뒤로가기는 맨 위 층만 닫아요.
// ✕·바깥·Esc로 닫으면 쌓았던 항목을 history.back()으로 걷어내요(그때 생기는 popstate는 무시).
let POP_SKIP=0;
const pushLayer=(k,u)=>{try{u?history.pushState({qj:k},"",u):history.pushState({qj:k},"")}catch(e){}};
const popLayer=k=>{if(history.state&&history.state.qj===k){POP_SKIP++;history.back()}};
try{if(history.state&&history.state.qj)history.replaceState(null,"")}catch(e){}
window.addEventListener("popstate",()=>{if(POP_SKIP>0){POP_SKIP--;return}
  if(document.querySelector(".lb"))closeLB(true);else if(document.querySelector(".dov"))closeDetail(true)});
// 🔗 딥링크: ?item=<id>. id는 events.json의 id, 없으면 seriesKey 해시(고정)
const hid=k=>{let h=2166136261;for(const c of k){h^=c.codePointAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(36)};
const itemId=e=>e.id||hid(seriesKey(e));
const baseURL=()=>location.pathname;
const itemURL=e=>location.origin+location.pathname.replace(/[^/]*$/,"")+"i/"+encodeURIComponent(itemId(e))+"/";
function toast(t){let el=document.querySelector(".qtoast");if(!el){el=document.createElement("div");el.className="qtoast";el.setAttribute("role","status");document.body.appendChild(el)}el.textContent=t;el.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove("on"),1600)}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(x){const a=document.createElement("textarea");a.value=t;a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand("copy")}catch(y){}a.remove();return ok}}
document.addEventListener("click",async ev=>{const b=ev.target.closest(".dshare");if(!b||!DETAIL_E)return;ev.stopPropagation();const u=itemURL(DETAIL_E);const ok=await copyText(u);toast(ok?"복사됐어요 ✨":"복사 실패 · 주소창 링크를 길게 눌러 복사해 주세요");window.gtag&&gtag("event","share_link",{item:DETAIL_E.title_ko,category:DETAIL_E.category})});
function openDetail(e){window.gtag&&gtag("event","open_detail",{item:e.title_ko,category:e.category,has_gallery:hasGal(e)});if(document.querySelector(".dov"))return;DETAIL_E=e;const o=document.createElement("div");o.className="dov";o.innerHTML=detail(e);document.body.appendChild(o);document.body.style.overflow="hidden";document.body.classList.add("modal-open");pushLayer("detail","?item="+encodeURIComponent(itemId(e)));o.querySelector(".dvx").focus();
  o.addEventListener("click",ev=>{if(ev.target===o||ev.target.closest(".dvx"))closeDetail()})}
function closeDetail(fromPop){const o=document.querySelector(".dov");if(!o)return;const l=document.querySelector(".lb");if(l)l.remove();o.remove();document.body.style.overflow="";document.body.classList.remove("modal-open");DETAIL_E=null;
  const fixURL=()=>{if(location.search.includes("item=")){syncURL()}};setTimeout(fixURL,60);
  if(!fromPop){const st=history.state&&history.state.qj;const n=st==="lb"?2:st==="detail"?1:0;if(n){POP_SKIP++;history.go(-n)}}}
function closeLB(fromPop){const l=document.querySelector(".lb");if(!l)return false;l.remove();if(!fromPop)popLayer("lb");return true}
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"){if(!closeLB())closeDetail()}});
// 사진 크게 보기: ◀▶ 버튼·좌우 화살표 키·스와이프로 같은 행사 사진 넘기기
let LB={list:[],i:0};
function lbShow(){const l=document.querySelector(".lb");if(!l)return;const a=LB.list[LB.i];const href=a.getAttribute("href");
  {const im=l.querySelector("img");im.onerror=a.dataset.fb?()=>{im.onerror=null;im.src=a.dataset.fb}:null;im.src=href}l.querySelector(".lbcap").innerHTML=`${esc(a.dataset.cap||"")} <span class="lbn">${LB.i+1} / ${LB.list.length}</span> · <a href="${esc(a.dataset.orig||href)}" target="_blank" rel="noopener">원본 열기</a>`;
  l.querySelectorAll(".lbnav").forEach(b=>b.hidden=LB.list.length<2)}
const lbStep=n=>{if(!LB.list.length)return;LB.i=(LB.i+n+LB.list.length)%LB.list.length;lbShow()};
document.addEventListener("click",ev=>{const a=ev.target.closest(".dgrid a.zoom");if(!a)return;ev.preventDefault();ev.stopPropagation();if(document.querySelector(".lb"))return;
  LB.list=[...document.querySelectorAll(".dov .dgrid a.zoom")];LB.i=Math.max(0,LB.list.indexOf(a));
  const l=document.createElement("div");l.className="lb";l.setAttribute("role","dialog");l.setAttribute("aria-label","사진 크게 보기");
  l.innerHTML=`<button class="dvx" aria-label="닫기">✕</button><button type="button" class="lbnav lbprev" aria-label="이전 사진">◀</button><img src="" alt="" referrerpolicy="no-referrer"><button type="button" class="lbnav lbnext" aria-label="다음 사진">▶</button><p class="lbcap"></p>`;
  l.addEventListener("click",e2=>{if(e2.target.closest(".lbcap a"))return;const nv=e2.target.closest(".lbnav");if(nv){e2.stopPropagation();lbStep(nv.classList.contains("lbprev")?-1:1);return}if(e2.target.tagName==="IMG")return;closeLB()});
  let sx=null,sy=null;l.addEventListener("touchstart",t=>{sx=t.touches[0].clientX;sy=t.touches[0].clientY},{passive:true});
  l.addEventListener("touchend",t=>{if(sx===null)return;const dx=t.changedTouches[0].clientX-sx,dy=t.changedTouches[0].clientY-sy;sx=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)lbStep(dx<0?1:-1)});
  document.body.appendChild(l);lbShow();pushLayer("lb")},true);
document.addEventListener("keydown",ev=>{if(!document.querySelector(".lb"))return;if(ev.key==="ArrowLeft")lbStep(-1);else if(ev.key==="ArrowRight")lbStep(1)});
document.addEventListener("click",ev=>{if(ev.target.closest(".card .bm,.card a,.card .cadd"))return;const c=ev.target.closest(".card[data-i]");if(!c)return;const e=CARDS[+c.dataset.i];if(e)openDetail(e)});

window.addEventListener("fxrate",()=>{if(typeof render==="function")render(true);const o=document.querySelector(".dov");if(o&&DETAIL_E){const sc=o.scrollTop;o.innerHTML=detail(DETAIL_E);o.scrollTop=sc}});
document.addEventListener("click",ev=>{const b=ev.target.closest(".moredates");if(!b)return;const x=b.nextElementSibling;if(x){x.hidden=false;b.remove()}});

document.addEventListener("click",ev=>{const b=ev.target.closest(".card .bm");if(!b)return;ev.stopPropagation();const e=CARDS[+b.closest(".card").dataset.i];if(!e)return;
  const k=seriesKey(e),on=!BM.has(k);on?BM.add(k):BM.delete(k);saveBM();window.gtag&&gtag("event","toggle_bookmark",{item:e.title_ko,category:e.category,on});
  if(st.bm&&!on){render(true);return}b.classList.toggle("on",on);b.textContent=on?"★":"☆";b.setAttribute("aria-pressed",on);b.setAttribute("aria-label",on?"북마크 해제":"북마크");b.title=on?"북마크 해제":"북마크"});
document.addEventListener("click",ev=>{if(ev.target.closest("#freset")&&window.resetFilters)resetFilters()});
window.QJ_gotoCard=e=>{const ix=CARDS.indexOf(e);if(ix<0)return false;const p=Math.floor(ix/PER);if(p!==PAGE){PAGE=p;render(true)}return true};window.QJ_openDetail=openDetail;window.QJ_hasDetail=hasDetail;

document.addEventListener("keydown",ev=>{if(ev.key!=="Enter"&&ev.key!==" ")return;const c=ev.target.closest&&ev.target.closest(".card[data-i]");if(!c||ev.target!==c)return;ev.preventDefault();const e=CARDS[+c.dataset.i];if(e)openDetail(e)});
