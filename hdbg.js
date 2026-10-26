/* 헤더 지역 수채화 배너 (데스크톱 >900px만) */
(()=>{const hd=document.querySelector("header.hd");if(!hd)return;const R=["tokyo","osaka","fukuoka"];
  const mq=matchMedia("(min-width:901px)");const sz=()=>(devicePixelRatio||1)>=1.5||innerWidth>1700?1600:960;
  const box=document.createElement("div");box.className="hdbg";box.setAttribute("aria-hidden","true");const L={};
  R.forEach(r=>{const d=document.createElement("div");d.className="hdbg-i";d.dataset.r=r;box.appendChild(d);L[r]=d});hd.prepend(box);
  const cur=()=>document.documentElement.getAttribute("data-region")||window.QJ_REGION||"tokyo";
  const show=()=>{if(!mq.matches)return;const r=cur();const d=L[r];if(!d)return;
    if(!d.dataset.src){const u=`hdbg/${r}-${sz()}.webp`;const im=new Image();im.decoding="async";im.onload=()=>{d.style.backgroundImage=`url(${u})`;d.dataset.src=u;if(cur()===r)d.classList.add("on")};im.src=u}
    R.forEach(k=>{if(k!==r)L[k].classList.remove("on")});if(d.dataset.src)d.classList.add("on")};
  new MutationObserver(show).observe(document.documentElement,{attributes:true,attributeFilter:["data-region"]});
  mq.addEventListener?mq.addEventListener("change",show):mq.addListener(show);show()})();
