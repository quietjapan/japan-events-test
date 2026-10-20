(()=>{
const CACHE_KEY="fx_jpy_krw_v1", TTL=12*3600e3;
/** 키패드(+−×÷)는 모바일 탭 버그로 일시 중지. true로 바꾸면 다시 켜짐. */
const KEYPAD_ENABLED=false;
const FX=window.FX={rate:null,asOf:"",ts:0,ready:false};

function roundKrw(jpy){return Math.round(jpy*FX.rate/100)*100}
function fmtKrw(n){return n.toLocaleString("ko-KR")}
function yenSpan(jpy){
  const k=roundKrw(jpy);
  return ` <span class="fxkrw">(약 ${fmtKrw(k)}원)</span>`}
/** Escape then append muted KRW next to each yen amount. No-op if no rate. */
FX.annotate=function(raw){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  if(raw==null||raw==="")return"";
  if(!(FX.rate>0))return esc(raw);
  const s=String(raw);
  // ¥12,000 / ¥11,550~13,750 / 1,500엔 / 1,000〜2,000円 / 660엔
  const re=/(¥|￥)\s*(\d{1,3}(?:,\d{3})*|\d+)(?:\s*([~～〜\-–])\s*(\d{1,3}(?:,\d{3})*|\d+))?|(\d{1,3}(?:,\d{3})*|\d+)(?:\s*([~～〜\-–])\s*(\d{1,3}(?:,\d{3})*|\d+))?\s*(円|엔)/g;
  let out="",last=0,m;
  while((m=re.exec(s))){
    out+=esc(s.slice(last,m.index));
    const full=m[0];
    if(m[1]){ // ¥ form
      const a=+m[2].replace(/,/g,""), sep=m[3], b=m[4]?+m[4].replace(/,/g,""):null;
      out+=esc(m[1])+esc(m[2])+yenSpan(a);
      if(b!=null)out+=esc(sep)+esc(m[4])+yenSpan(b);
    }else{
      const a=+m[5].replace(/,/g,""), sep=m[6], b=m[7]?+m[7].replace(/,/g,""):null, unit=m[8];
      if(b!=null){
        out+=esc(m[5])+yenSpan(a)+esc(sep)+esc(m[7])+yenSpan(b)+esc(unit);
      }else{
        out+=esc(m[5])+esc(unit)+yenSpan(a);
      }
    }
    last=m.index+full.length;
  }
  out+=esc(s.slice(last));
  return out;
};

function loadCache(){
  try{const c=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
    if(c&&c.rate>0&&Date.now()-c.ts<TTL){FX.rate=c.rate;FX.asOf=c.asOf||"";FX.ts=c.ts||0;FX.ready=true;return true}}catch{}
  return false}
function saveCache(){
  FX.ts=Date.now();
  try{localStorage.setItem(CACHE_KEY,JSON.stringify({rate:FX.rate,asOf:FX.asOf,ts:FX.ts}))}catch{}}
function emit(){window.dispatchEvent(new CustomEvent("fxrate",{detail:{rate:FX.rate,asOf:FX.asOf}}))}

async function fetchRate(force){
  if(!force&&loadCache()){emit();return true}
  const tryApis=[
    async()=>{const r=await fetch("https://open.er-api.com/v6/latest/JPY",{cache:"no-store"});
      if(!r.ok)throw 0;const j=await r.json();
      if(j.result!=="success"||!(j.rates&&j.rates.KRW>0))throw 0;
      return{rate:+j.rates.KRW,asOf:String(j.time_last_update_utc||"").slice(0,16).trim()||new Date().toISOString().slice(0,10)}},
    async()=>{const r=await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/jpy.json",{cache:"no-store"});
      if(!r.ok)throw 0;const j=await r.json();const krw=j.jpy&&j.jpy.krw;
      if(!(krw>0))throw 0;return{rate:+krw,asOf:j.date||new Date().toISOString().slice(0,10)}}
  ];
  for(const fn of tryApis){
    try{const {rate,asOf}=await fn();FX.rate=rate;FX.asOf=asOf;FX.ready=true;saveCache();emit();return true}catch{}}
  FX.ready=true;emit();return false}

/* —— UI —— */
const btn=document.getElementById("fxbtn"), ov=document.getElementById("fxov");
const panel=document.getElementById("fxpanel"), rateEl=document.getElementById("fxrate"), whenEl=document.getElementById("fxwhen");
const inp=document.getElementById("fxin"), out=document.getElementById("fxout"), exprEl=document.getElementById("fxexpr");
const keysEl=document.getElementById("fxkeys");
const fromLbl=document.getElementById("fxfromlbl"), toLbl=document.getElementById("fxtolbl");
if(!btn||!ov){loadCache();fetchRate();return}

// 키패드 일시 중지: 숨기고 시스템 숫자 키보드 사용
if(!KEYPAD_ENABLED){
  if(keysEl)keysEl.hidden=true;
  if(exprEl){exprEl.hidden=true;exprEl.textContent=""}
  inp.setAttribute("inputmode","decimal");
  inp.setAttribute("aria-label","엔화 금액");
}else{
  const COARSE=window.matchMedia&&matchMedia("(pointer:coarse)").matches;
  if(COARSE)inp.setAttribute("inputmode","none");
}

let jpyToKrw=true;
function fmtNum(n,dec){if(!isFinite(n))return"-";return n.toLocaleString("ko-KR",{maximumFractionDigits:dec,minimumFractionDigits:0})}
function pad2(n){return String(n).padStart(2,"0")}
function seoulTime(ts){try{
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(ts)).map(x=>[x.type,x.value]));
  return `${+p.month}/${+p.day} ${pad2(+p.hour%24)}:${pad2(p.minute)}`}catch{const d=new Date(ts);return `${d.getMonth()+1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`}}
function showRate(){
  if(!(FX.rate>0)){rateEl.textContent=rateEl.dataset.err||"환율 불러오는 중…";if(whenEl)whenEl.textContent="";return}
  rateEl.innerHTML=`<b>100엔 = ${fmtNum(Math.round(FX.rate*100),0)}원</b>`;
  if(whenEl)whenEl.textContent=FX.ts?`환율 적용: ${seoulTime(FX.ts)} (12시간마다 갱신)`:""}

/* —— simple mode (키패드 off) —— */
function calcSimple(){
  const v=parseFloat(String(inp.value).replace(/,/g,""));
  if(!(FX.rate>0)||!isFinite(v)||v<0){out.textContent="0";return}
  out.textContent=jpyToKrw?fmtNum(v*FX.rate,0):fmtNum(v/FX.rate,2)}
function setDirSimple(toJpy){
  jpyToKrw=toJpy;
  fromLbl.textContent=jpyToKrw?"엔화 (JPY)":"원화 (KRW)";
  toLbl.textContent=jpyToKrw?"원화 (KRW)":"엔화 (JPY)";
  inp.setAttribute("aria-label",jpyToKrw?"엔화 금액":"원화 금액");
  calcSimple()}

/* —— keypad mode (kept for later rewrite; KEYPAD_ENABLED) —— */
const OPS="+−×÷";
function evalExpr(raw){
  let s=String(raw||"").replace(/[,\s]/g,"").replace(/\*/g,"×").replace(/[xX]/g,"×").replace(/\//g,"÷").replace(/-/g,"−");
  s=s.replace(/[+−×÷.]+$/,"");
  if(!s)return NaN;
  const toks=s.match(/(\d*\.?\d+|\d+\.|[+−×÷])/g);
  if(!toks||toks.join("")!==s)return NaN;
  if(toks[0]==="−")toks.unshift("0");
  const terms=[];let cur=null,op="+",mul=null;
  for(let i=0;i<toks.length;i++){const t=toks[i];
    if(OPS.includes(t)){if(cur===null)return NaN;
      if(t==="×"||t==="÷"){mul=t;continue}
      terms.push(op==="−"?-cur:cur);op=t;cur=null;mul=null;continue}
    const v=parseFloat(t);if(!isFinite(v))return NaN;
    if(mul&&cur!==null){cur=mul==="×"?cur*v:cur/v;mul=null}else{if(cur!==null)return NaN;cur=v}}
  if(cur===null)return NaN;
  terms.push(op==="−"?-cur:cur);
  return terms.reduce((a,b)=>a+b,0)}
const hasOp=s=>/[+−×÷*\/xX]|.-/.test(String(s).replace(/^-/,""));
const unitIn=()=>jpyToKrw?"엔":"원", unitOut=()=>jpyToKrw?"원":"엔";
function calcKeypad(){
  const raw=inp.value, v=evalExpr(raw);
  if(hasOp(raw)&&isFinite(v)){exprEl.textContent=`= ${fmtNum(v,jpyToKrw?0:2)}${unitIn()}`;exprEl.hidden=false}
  else if(!exprEl.dataset.done){exprEl.hidden=true}
  if(!(FX.rate>0)||!isFinite(v)||v<0){out.textContent="0";return}
  out.textContent=jpyToKrw?fmtNum(v*FX.rate,0):fmtNum(v/FX.rate,2)}
function setDirKeypad(toJpy){
  jpyToKrw=toJpy;
  fromLbl.textContent=jpyToKrw?"엔화 (JPY)":"원화 (KRW)";
  toLbl.textContent=jpyToKrw?"원화 (KRW)":"엔화 (JPY)";
  inp.setAttribute("aria-label",jpyToKrw?"엔화 금액 또는 계산식":"원화 금액 또는 계산식");
  calcKeypad()}
function clearDone(){delete exprEl.dataset.done}
function press(k){
  let s=inp.value;
  if(k==="C"){inp.value="";clearDone();exprEl.hidden=true;calcKeypad();return}
  if(k==="⌫"){clearDone();inp.value=s.slice(0,-1);calcKeypad();return}
  if(k==="="){const v=evalExpr(s);if(!isFinite(v)){return}
    const r=Math.round(v*100)/100;
    const shown=hasOp(s)?s.replace(/[+−×÷]+$/,""):"";
    inp.value=String(r);
    if(shown){exprEl.textContent=`${shown} = ${fmtNum(r,2)}${unitIn()}`;exprEl.dataset.done="1";exprEl.hidden=false}
    calcKeypad();return}
  if(exprEl.dataset.done){clearDone();if(!OPS.includes(k)){s=""}}
  if(OPS.includes(k)){
    if(!s){if(k!=="−")return}
    if(OPS.includes(s.slice(-1)))s=s.slice(0,-1);
    inp.value=s+k;calcKeypad();return}
  if(k==="."){const last=s.split(/[+−×÷]/).pop();if(last.includes("."))return;inp.value=s+(last===""?"0.":".");calcKeypad();return}
  if(s.replace(/[^\d]/g,"").length>=15)return;
  inp.value=s+k;calcKeypad()}

const calc=KEYPAD_ENABLED?calcKeypad:calcSimple;
const setDir=KEYPAD_ENABLED?setDirKeypad:setDirSimple;

function open(){ov.hidden=false;btn.setAttribute("aria-expanded","true");
  showRate();calc();
  fetchRate().then(ok=>{if(!ok&&!(FX.rate>0)){rateEl.dataset.err="환율을 불러오지 못했어요. 잠시 후 다시 열어 주세요.";rateEl.textContent=rateEl.dataset.err}
    showRate();calc()});
  setTimeout(()=>inp.focus(),50)}
function close(){ov.hidden=true;btn.setAttribute("aria-expanded","false");btn.focus()}
function toggle(){ov.hidden?open():close()}

btn.addEventListener("click",e=>{e.stopPropagation();toggle()});
document.getElementById("fxx").addEventListener("click",close);
ov.addEventListener("click",e=>{if(e.target===ov)close()});
panel.addEventListener("click",e=>e.stopPropagation());
inp.addEventListener("input",()=>{if(KEYPAD_ENABLED)clearDone();calc()});
if(KEYPAD_ENABLED){
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();press("=")}});
  if(keysEl)keysEl.addEventListener("click",e=>{const b=e.target.closest("button[data-k]");if(!b)return;press(b.dataset.k)});
}
document.getElementById("fxswap").addEventListener("click",()=>{
  if(KEYPAD_ENABLED){
    const prev=evalExpr(inp.value);
    const converted=FX.rate>0&&isFinite(prev)?(jpyToKrw?prev*FX.rate:prev/FX.rate):NaN;
    clearDone();exprEl.hidden=true;
    setDir(!jpyToKrw);
    if(isFinite(converted)){inp.value=jpyToKrw?String(Math.round(converted*100)/100):String(Math.round(converted));calc()}
  }else{
    const prev=parseFloat(String(inp.value).replace(/,/g,""));
    const converted=FX.rate>0&&isFinite(prev)?(jpyToKrw?prev*FX.rate:prev/FX.rate):NaN;
    setDir(!jpyToKrw);
    if(isFinite(converted)){inp.value=jpyToKrw?String(Math.round(converted*100)/100):String(Math.round(converted));calc()}
  }
});
document.getElementById("fxquick").addEventListener("click",e=>{
  const b=e.target.closest("button[data-jpy]");if(!b)return;
  if(KEYPAD_ENABLED){
    if(!jpyToKrw){setDir(true);inp.value=""}
    const s=inp.value;
    if(s&&OPS.includes(s.slice(-1))&&!exprEl.dataset.done)inp.value=s+String(+b.dataset.jpy);
    else{clearDone();exprEl.hidden=true;inp.value=String(+b.dataset.jpy)}
    calc();inp.focus();
  }else{
    if(!jpyToKrw)setDir(true);
    inp.value=String(+b.dataset.jpy);calc();inp.focus();
  }
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!ov.hidden){e.stopPropagation();close()}},true);
window.addEventListener("fxrate",()=>{if(!ov.hidden){showRate();calc()}});

loadCache();showRate();fetchRate();
})();
