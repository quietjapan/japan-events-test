// 7일 날씨 (Open-Meteo, 키 없음). 행사 데이터와 완전히 별개. 지역 토글(도쿄/오사카)에 맞춰 도시가 바뀌어요: window.QJWX(region)
(()=>{const W={0:["☀️","맑음"],1:["🌤️","대체로 맑음"],2:["⛅","구름 조금"],3:["☁️","흐림"],45:["🌫️","안개"],48:["🌫️","안개"],51:["🌦️","이슬비"],53:["🌦️","이슬비"],55:["🌦️","이슬비"],61:["🌧️","비"],63:["🌧️","비"],65:["🌧️","강한 비"],71:["🌨️","눈"],73:["🌨️","눈"],75:["🌨️","많은 눈"],80:["🌦️","소나기"],81:["🌦️","소나기"],82:["⛈️","강한 소나기"],95:["⛈️","뇌우"],96:["⛈️","뇌우"],99:["⛈️","뇌우"]};
const C={tokyo:["도쿄",35.6812,139.7671],osaka:["오사카",34.6937,135.5023]};const cache={};
const row=document.getElementById("wxrow"),ttl=document.getElementById("wxtitle"),sum=document.getElementById("wxsum"),box=document.getElementById("wx");
const SK='<div class="wxd sk" aria-hidden="true"></div>'.repeat(7)+'<span class="wx-msg sr">날씨 불러오는 중…</span>';
let cur=null;
function load(r){const c=C[r]||C.tokyo;cur=r;if(ttl)ttl.textContent=`${c[0]} 7일 날씨`;if(box)box.setAttribute("aria-label",`${c[0]} 날씨`);
  if(sum)sum.textContent="";row.classList.add("wxload");row.setAttribute("aria-busy","true");row.innerHTML=SK;
  cache[r]=cache[r]||fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c[1]}&longitude=${c[2]}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=7`).then(x=>x.json());
  cache[r].then(d=>{if(cur!==r)return;const x=d.daily;row.classList.remove("wxload");row.removeAttribute("aria-busy");row.innerHTML=x.time.map((t,i)=>{const[y,m,dd]=t.split("-").map(Number);const dt=new Date(y,m-1,dd);const w=W[x.weather_code[i]]||["🌡️",""];
return `<div class="wxd" title="${w[1]}"><div>${m}/${dd}(${"일월화수목금토"[dt.getDay()]})</div><div class="i">${w[0]}</div><div class="t">${Math.round(x.temperature_2m_max[i])}° / ${Math.round(x.temperature_2m_min[i])}°</div><div class="p">☔ ${x.precipitation_probability_max[i]??"-"}%</div></div>`}).join("");
    if(sum){const w=W[x.weather_code[0]]||["🌡️",""];sum.textContent=`오늘 ${w[0]} ${Math.round(x.temperature_2m_max[0])}°/${Math.round(x.temperature_2m_min[0])}° ☔${x.precipitation_probability_max[0]??"-"}%`}})
  .catch(()=>{if(cur!==r)return;delete cache[r];row.classList.remove("wxload");row.removeAttribute("aria-busy");row.innerHTML='<span class="wx-msg">날씨를 불러오지 못했어요.</span>'})}
window.QJWX=load;load(window.QJ_REGION||"tokyo")})();
