// 다크/라이트 모드 토글. 초기 테마는 <head> 인라인 스크립트가 첫 페인트 전에 적용.
(()=>{const KEY="qj_theme",root=document.documentElement,btns=[...document.querySelectorAll(".theme-toggle")];
const meta=document.querySelector('meta[name="theme-color"]');
const cur=()=>root.getAttribute("data-theme")==="dark"?"dark":"light";
function apply(t){root.setAttribute("data-theme",t);if(meta)meta.setAttribute("content",t==="dark"?"#211d18":"#fffdf8");
  const d=t==="dark";btns.forEach(b=>{const icon=b.classList.contains("themeicon");b.textContent=icon?(d?"☀️":"🌙"):(d?"☀️ 라이트모드":"🌙 다크모드");b.setAttribute("aria-label",d?"라이트모드":"다크모드");b.setAttribute("aria-pressed",d?"true":"false")})}
apply(cur());
btns.forEach(b=>b.addEventListener("click",()=>{const t=cur()==="dark"?"light":"dark";apply(t);try{localStorage.setItem(KEY,t)}catch(e){}window.gtag&&gtag("event","toggle_theme",{theme:t})}));
// 직접 고른 적이 없으면 기기 설정 변경을 따라감
try{const mq=matchMedia("(prefers-color-scheme: dark)");const f=ev=>{let saved=null;try{saved=localStorage.getItem(KEY)}catch(e){}if(saved!=="dark"&&saved!=="light")apply(ev.matches?"dark":"light")};
  mq.addEventListener?mq.addEventListener("change",f):mq.addListener(f)}catch(e){}
})();
