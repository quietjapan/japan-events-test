// 도쿄 7일 날씨 (Open-Meteo, 키 없음). 행사 데이터와 완전히 별개.
(()=>{const W={0:["☀️","맑음"],1:["🌤️","대체로 맑음"],2:["⛅","구름 조금"],3:["☁️","흐림"],45:["🌫️","안개"],48:["🌫️","안개"],51:["🌦️","이슬비"],53:["🌦️","이슬비"],55:["🌦️","이슬비"],61:["🌧️","비"],63:["🌧️","비"],65:["🌧️","강한 비"],71:["🌨️","눈"],73:["🌨️","눈"],75:["🌨️","많은 눈"],80:["🌦️","소나기"],81:["🌦️","소나기"],82:["⛈️","강한 소나기"],95:["⛈️","뇌우"],96:["⛈️","뇌우"],99:["⛈️","뇌우"]};
const row=document.getElementById("wxrow");
fetch("https://api.open-meteo.com/v1/forecast?latitude=35.6812&longitude=139.7671&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=7")
.then(r=>r.json()).then(d=>{const x=d.daily;row.classList.remove("wxload");row.removeAttribute("aria-busy");row.innerHTML=x.time.map((t,i)=>{const[y,m,dd]=t.split("-").map(Number);const dt=new Date(y,m-1,dd);const w=W[x.weather_code[i]]||["🌡️",""];
return `<div class="wxd" title="${w[1]}"><div>${m}/${dd}(${"일월화수목금토"[dt.getDay()]})</div><div class="i">${w[0]}</div><div class="t">${Math.round(x.temperature_2m_max[i])}° / ${Math.round(x.temperature_2m_min[i])}°</div><div class="p">☔ ${x.precipitation_probability_max[i]??"-"}%</div></div>`}).join("")})
.catch(()=>{row.classList.remove("wxload");row.removeAttribute("aria-busy");row.innerHTML='<span class="wx-msg">날씨를 불러오지 못했어요.</span>'})})();
