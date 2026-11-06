/* 상단 정리(필터 패널 열고 닫기·초기화) + 데스크톱 지도 켜기/끄기(qj_map) */
(function(){
var H=document.documentElement,fm=document.getElementById("fmore");
if(fm){
  fm.addEventListener("toggle",function(){document.body.classList.toggle("fopen",fm.open);if(fm.open&&window.QJ_bmu)QJ_bmu()});
  document.getElementById("fclose").onclick=function(){fm.open=false};
  document.getElementById("fpreset").onclick=function(){if(window.resetFilters)resetFilters()};
  document.addEventListener("click",function(e){if(fm.open&&!fm.contains(e.target)&&document.contains(e.target))fm.open=false});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&fm.open){fm.open=false;fm.querySelector("summary").focus()}});
}
/* 지도 켜기/끄기(기본 꺼짐, 저장값 "on"일 때만 켜짐): 1024px 이상(목록+지도 한 화면)에서만 보여요 */
var bar=document.querySelector(".vtoggle");if(!bar)return;
var b=document.createElement("button");b.type="button";b.id="maptg";b.className="maptg";
function on(){return !H.classList.contains("nomap")}
function paint(){var o=on();b.textContent=o?"🗺️ 지도 끄기":"🗺️ 지도 켜기";b.setAttribute("aria-pressed",o);b.title=o?"지도를 숨기고 목록을 넓게 봐요":"오른쪽에 지도를 다시 보여줘요"}
b.onclick=function(){var o=!on();H.classList.toggle("nomap",!o);try{localStorage.setItem("qj_map",o?"on":"off")}catch(e){}paint();window.QJ_repaintView&&QJ_repaintView();window.gtag&&gtag("event","map_toggle",{on:o})};
var vr=document.createElement("div");vr.className="vrow";bar.parentNode.insertBefore(vr,bar);vr.appendChild(bar);vr.appendChild(b);paint();
})();
