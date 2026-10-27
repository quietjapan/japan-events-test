/* 준호 픽: data/picks.json → #picks. 블로그에 발행한 글이 있는 행사만, 끝난 행사는 숨김, 비면 띠 자체를 숨김 */
(function(){
var box=document.getElementById("picks"),ul=document.getElementById("pklist");if(!box||!ul)return;
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
var now=new Date(Date.now()+9*36e5).toISOString().slice(0,10);
Promise.all([fetch("data/picks.json",{cache:"no-store"}).then(function(r){return r.json()}),fetch("events.json").then(function(r){return r.json()})]).then(function(a){
  var ev=a[1].events||[];
  var rows=(a[0].picks||[]).map(function(p){var e=ev.find(function(x){return x.id===p.match||x.title_ko===p.match});return e?{p:p,e:e}:null})
    .filter(function(r){return r&&!(r.e.end&&r.e.end<now)});
  if(!rows.length){box.hidden=true;return}
  ul.innerHTML=rows.map(function(r){return '<li><a href="'+esc(r.p.blog_url)+'" target="_blank" rel="noopener"><b>'+esc(r.e.title_ko)+'</b><span>✍️ '+esc(r.p.post_title)+'</span></a></li>'}).join("");
  box.hidden=false;
}).catch(function(){box.hidden=true});
})();
