/* 준호 픽: data/picks.json → #picks. 준호가 고른 행사만, 끝난 행사는 숨김, 비면 띠 자체를 숨김 */
(function(){
var box=document.getElementById("picks"),ul=document.getElementById("pklist");if(!box||!ul)return;
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
var now=new Date(Date.now()+9*36e5).toISOString().slice(0,10);
Promise.all([fetch("data/picks.json",{cache:"no-store"}).then(function(r){return r.json()}),fetch("events.json").then(function(r){return r.json()})]).then(function(a){
  var ev=a[1].events||[];
  var rows=(a[0].picks||[]).map(function(p){var e=ev.find(function(x){return x.id===p.match||x.title_ko===p.match});return e?{p:p,e:e}:null})
    .filter(function(r){return r&&!(r.e.end&&r.e.end<now)});
  if(!rows.length){box.hidden=true;return}
  ul.innerHTML=rows.map(function(r){return (r.e.id?'<li><a href="i/'+encodeURIComponent(r.e.id)+'/"><b>'+esc(r.e.title_ko)+'</b></a></li>':r.e.official_url?'<li><a href="'+esc(r.e.official_url)+'" target="_blank" rel="noopener"><b>'+esc(r.e.title_ko)+'</b><span>공식 사이트</span></a></li>':'<li><b>'+esc(r.e.title_ko)+'</b></li>')}).join("");
  box.hidden=false;var ps=document.getElementById("pksub");if(ps)ps.textContent=rows.length+"건 · 준호가 고른 행사";
}).catch(function(){box.hidden=true});
})();
