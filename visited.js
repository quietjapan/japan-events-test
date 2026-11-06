/* 다녀온 곳: data/visited.json → #visited. 준호 본인의 말은 그대로(텍스트로만) 보여줘요. */
(function(){
var R={tokyo:"🗼 도쿄",osaka:"🏯 오사카",fukuoka:"🍜 후쿠오카"};
var box=document.getElementById("vlist"),seg=document.getElementById("vseg");if(!box)return;
var all=[],f="all",ids=new Set();
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function fd(d){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||"");return m?m[1]+"."+m[2]+"."+m[3]:esc(d)}
function stars(n){n=Math.max(0,Math.min(5,n|0));return n?'<span class="vstar" aria-label="별점 '+n+'/5">'+"★★★★★".slice(0,n)+'<i>'+"★★★★★".slice(n)+'</i></span>':""}
function paint(){
  var rows=all.filter(function(e){return f==="all"||e.region===f});
  if(!rows.length){box.innerHTML='<div class="vempty"><b>🧳 아직 비어 있어요</b><p>'+(all.length?"이 지역은 아직 다녀온 곳이 없어요.":"11월 여행 다녀와서 채워질 예정이에요. 직접 가 본 곳만, 솔직한 한 줄과 함께 올릴게요.")+'</p></div>';return}
  box.innerHTML=rows.map(function(e){
    var ph=(e.photos||[]).slice(0,4).map(function(p){return '<img src="'+esc(p)+'" alt="'+esc(e.name_ko)+' 방문 사진" loading="lazy" decoding="async">'}).join("");
    var lk=[];if(e.event_id)lk.push('<a href="i/'+encodeURIComponent(e.event_id)+'/">📅 행사 정보</a>');if(e.blog_url)lk.push('<a href="'+esc(e.blog_url)+'" target="_blank" rel="noopener">✍️ 블로그 후기</a>');
    return '<article class="vcard"><div class="vtop"><span class="vrg">'+(R[e.region]||"")+'</span><time datetime="'+esc(e.date)+'">'+fd(e.date)+'</time>'+stars(e.rating)+'</div>'+
      '<h3 class="vname">'+esc(e.name_ko)+(e.name_ja?' <small lang="ja">'+esc(e.name_ja)+'</small>':"")+'</h3>'+
      (e.verdict?'<p class="vverd">'+esc(e.verdict)+'</p>':"")+
      (ph?'<div class="vph">'+ph+'</div>':"")+
      '<blockquote class="vcom">'+esc(e.comment).replace(/\n/g,"<br>")+'<cite>— 준호</cite></blockquote>'+
      (lk.length?'<p class="vlk">'+lk.join("")+'</p>':"")+'</article>'}).join("");
}
function mark(){if(!ids.size)return;document.querySelectorAll("#list .card[data-eid]").forEach(function(c){if(ids.has(c.dataset.eid)&&!c.querySelector(".vmk")){var s=document.createElement("span");s.className="vmk";s.textContent="다녀옴 ✓";c.appendChild(s)}})}
if(seg)seg.onclick=function(ev){var b=ev.target.closest("button[data-v]");if(!b)return;f=b.dataset.v;seg.querySelectorAll("button").forEach(function(x){var on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on)});paint()};
fetch("data/visited.json",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){
  all=(d.entries||[]).slice().sort(function(a,b){return a.date<b.date?1:-1});
  all.forEach(function(e){if(e.event_id)ids.add(e.event_id)});
  var c=document.getElementById("vcnt");if(c&&all.length)c.textContent=all.length+"곳";
  paint();mark();var l=document.getElementById("list");if(l&&ids.size)new MutationObserver(mark).observe(l,{childList:true});
}).catch(function(){all=[];paint()});
})();
