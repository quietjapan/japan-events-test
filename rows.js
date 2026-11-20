/* 가로 띠 2개: 🏆 지난주 많이 본 행사 TOP 5(data/top5.json, GA '자세히' 열람 기준) · 🎄 크리스마스·연말연시(12/24~25에 열리거나 해를 넘겨 열리는 행사)
   지역 토글을 따라가고, 카드를 누르면 기존 '자세히' 창을 열어요. 연말연시 영업시간은 events의 ny_hours(공식 안내)만 표시. */
(function(){
var t5=document.getElementById("top5"),xm=document.getElementById("xmas");if(!t5||!xm||!window.QJ_DATA)return;
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
var today=new Date(Date.now()+9*36e5).toISOString().slice(0,10),Y=+today.slice(0,4),M=+today.slice(5,7);
var md=function(d){var m=/^\d{4}-(\d{2})-(\d{2})$/.exec(d||"");return m?(+m[1])+"/"+(+m[2]):""};
var SKIP={"가챠":1,"쿠지":1,"잡지 부록":1};
/* 연말 시즌: 11/1~1/3에만 띠를 보여요 (1월이면 지난해 12월 기준) */
var XY=M>=11?Y:(M===1&&+today.slice(8)<=3?Y-1:0);
var X1=XY+"-12-24",X2=XY+"-12-25",NY1=XY+"-12-31",NY2=(XY+1)+"-01-01",NYE=(XY+1)+"-01-03";
var EV=[],TOP=[],last="";
function reg(){return window.QJ_REGION||"tokyo"}
function rOf(e){return e.region||"all"}
function card(e){if(!window.QJ_cards)return e;var c=QJ_cards().find(function(x){return x===e||(e.id&&x.id===e.id)||(x.title_ko===e.title_ko&&x.official_url===e.official_url)});return c||e}
function when(e){return md(e.start)+(!e.end?" ~":e.end!==e.start?" ~ "+md(e.end):"")}
function thumb(e){var s=e.thumb_small||"";return s?'<img src="'+esc(s)+'" alt="" loading="lazy" decoding="async" width="160" height="100">':'<span class="hrph" aria-hidden="true">'+esc((e.title_ko||"").slice(0,1))+'</span>'}
function li(e,extra,rank){var k=EV.indexOf(e);return '<li><button type="button" class="hrcard" data-k="'+k+'">'+(rank?'<span class="hrrank">'+rank+'</span>':'')+'<span class="hrth">'+thumb(e)+'</span><span class="hrtx"><b>'+esc(e.title_ko)+'</b><small>'+esc(e.category)+' · '+when(e)+'</small>'+(extra||"")+'</span></button></li>'}
function paintTop(){var r=reg(),seen={},rows=[];TOP.forEach(function(t){var e=EV.find(function(x){return x.id===t.match||x.title_ko===t.match});if(!e||seen[e.title_ko])return;var g=rOf(e);if(g!==r&&g!=="all")return;if(e.end&&e.end<today)return;seen[e.title_ko]=1;rows.push(e)});rows=rows.slice(0,5);
  if(!rows.length){t5.hidden=true;return}
  document.getElementById("t5list").innerHTML=rows.map(function(e,i){return li(e,"",i+1)}).join("");t5.hidden=false}
function paintX(){if(!XY){xm.hidden=true;return}var r=reg(),seen={};
  var rows=EV.filter(function(e){if(SKIP[e.category]||!e.start)return false;var g=rOf(e);if(g!==r)return false;var en=e.end||e.start;if(en<today)return false;
    e._xc=e.start<=X2&&en>=X1;e._ny=e.start<=NY1&&en>=NY2;if(!(e._xc||e._ny))return false;var k=e.title_ko+"|"+e.official_url;if(seen[k])return false;seen[k]=1;return true});
  rows.sort(function(a,b){return (!!b.ny_hours-!!a.ny_hours)||((b._xc&&b._ny)-(a._xc&&a._ny))||(a.start<b.start?-1:a.start>b.start?1:0)});
  if(!rows.length){xm.hidden=true;return}
  document.getElementById("xmlist").innerHTML=rows.map(function(e){var tg='<span class="hrtg">'+(e._xc?'<em class="tx">🎄 성탄</em>':'')+(e._ny?'<em class="tn">🎍 연말연시</em>':'')+'</span>';
    return li(e,tg+(e.ny_hours?'<span class="hrny">🕒 '+esc(e.ny_hours)+'</span>':''))}).join("");
  var nh=rows.filter(function(e){return e.ny_hours}).length;
  document.getElementById("xmsub").textContent=rows.length+"건"+(nh?" · 연말연시 영업 안내 "+nh+"건":"");xm.hidden=false}
function paint(){var r=reg();if(r===last)return;last=r;paintTop();paintX()}
document.addEventListener("click",function(ev){var b=ev.target.closest(".hrcard");if(!b)return;var e=EV[+b.dataset.k];if(!e||!window.QJ_openDetail)return;
  var box=b.closest(".hrow");window.gtag&&gtag("event","strip_click",{strip:box&&box.id,item:e.title_ko});QJ_openDetail(card(e))});
document.getElementById("xmall").onclick=function(){var f=document.getElementById("from"),t=document.getElementById("to");if(!f||!t)return;f.value=X1;t.value=NYE;f.dispatchEvent(new Event("change"));t.dispatchEvent(new Event("change"));var l=document.getElementById("count")||document.getElementById("list");l&&l.scrollIntoView({behavior:"smooth",block:"start"})};
Promise.all([QJ_DATA,fetch("data/top5.json",{cache:"no-cache"}).then(function(r){return r.ok?r.json():{}}).catch(function(){return{}})]).then(function(a){
  EV=(a[0]&&a[0].events)||[];TOP=(a[1]&&a[1].items)||[];
  var rg=a[1]&&a[1].range;if(rg)document.getElementById("t5sub").textContent=md(rg[0])+"~"+md(rg[1])+" ‘자세히’ 많이 연 순서";
  paint();var L=document.getElementById("list");if(L)new MutationObserver(paint).observe(L,{childList:true});
}).catch(function(){});
})();
