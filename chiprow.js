// 칩 한 줄: 마우스 드래그·스와이프·휠(세로→가로)로 스크롤, 넘칠 때만 ‹ › 버튼과 가장자리 페이드. 짧은 드래그는 클릭으로 인정.
(()=>{const wrap=document.querySelector(".chipwrap"),row=wrap&&wrap.querySelector(".chrow");if(!row)return;
  const mk=(c,t,l)=>{const b=document.createElement("button");b.type="button";b.className="chnav "+c;b.textContent=t;b.setAttribute("aria-label",l);b.tabIndex=-1;wrap.appendChild(b);return b};
  const pv=mk("chprev","‹","왼쪽으로"),nx=mk("chnext","›","오른쪽으로");
  const upd=()=>{const max=row.scrollWidth-row.clientWidth-1;const l=row.scrollLeft>2,r=row.scrollLeft<max;wrap.classList.toggle("ofl",l);wrap.classList.toggle("ofr",r)};
  const by=d=>row.scrollBy({left:d*Math.max(160,row.clientWidth*.6),behavior:"smooth"});
  pv.onclick=()=>by(-1);nx.onclick=()=>by(1);
  row.addEventListener("scroll",upd,{passive:true});addEventListener("resize",upd);new ResizeObserver(upd).observe(row);
  row.addEventListener("wheel",e=>{if(row.scrollWidth<=row.clientWidth)return;const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!d)return;
    const max=row.scrollWidth-row.clientWidth;if((d<0&&row.scrollLeft<=0)||(d>0&&row.scrollLeft>=max-1))return;e.preventDefault();row.scrollLeft+=d},{passive:false});
  let sx=0,sl=0,down=false,moved=false,pid=null;
  row.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse"||e.button!==0)return;down=true;moved=false;sx=e.clientX;sl=row.scrollLeft;pid=e.pointerId});
  row.addEventListener("pointermove",e=>{if(!down)return;const dx=e.clientX-sx;if(!moved&&Math.abs(dx)>6){moved=true;row.setPointerCapture(pid);row.classList.add("drag")}if(moved)row.scrollLeft=sl-dx});
  const end=()=>{if(!down)return;down=false;row.classList.remove("drag");if(moved){const kill=ev=>{ev.stopPropagation();ev.preventDefault()};row.addEventListener("click",kill,{capture:true,once:true});setTimeout(()=>row.removeEventListener("click",kill,{capture:true}),50)}};
  row.addEventListener("pointerup",end);row.addEventListener("pointercancel",end);
  row.addEventListener("dragstart",e=>e.preventDefault());
  setTimeout(upd,300);upd()})();
