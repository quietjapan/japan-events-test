"""월별 「N월에 시작하는 행사 모아보기」 m/<YYYY-MM>/index.html 생성 (이번 달 + 다음 달, 지난 달 페이지는 삭제).
events.json에서 start가 그 달인 항목을 지역 → 장르 순으로 묶고, 카드는 공유 페이지 i/<id>/로 연결.
홈 헤더의 <a id="mlink"> 링크를 '추천 달'(20일 이후면 다음 달)로 갱신. build.sh에서 매번 실행."""
import json, re, html, shutil, datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SITE=re.search(r'SITE="([^"]+)"',(ROOT/"tools"/"mkshare.py").read_text()).group(1)
now=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).date()
def b36(n):
    s="0123456789abcdefghijklmnopqrstuvwxyz";r=""
    while True:
        n,m=divmod(n,36);r=s[m]+r
        if not n:return r
def skey(e):return f"s:{e['series']}" if e.get("series") else f"a:{e.get('category')}|{e.get('title_ko')}|{e.get('official_url') or ''}"
def hid(k):
    h=2166136261
    for c in k: h^=ord(c); h=(h*16777619)&0xFFFFFFFF
    return b36(h)
def item_id(e):return e.get("id") or hid(skey(e))
q=lambda s:html.escape(str(s or ""),quote=True)
REG=[("도쿄","🗼","tokyo"),("오사카","🏯","osaka"),("후쿠오카","🍜","fukuoka"),("전국","🗾","all")]
GEN=["팝업스토어","콜라보카페","전시·행사","축제","플리마켓","쿠지","가챠","잡지 부록"]
WD="월화수목금토일"
def md(s):
    try: d=datetime.date.fromisoformat(s); return f"{d.month}/{d.day}({WD[d.weekday()]})"
    except Exception: return q(s)
def ym_add(y,m,k):
    m+=k; y+=(m-1)//12; m=(m-1)%12+1; return y,m
d=json.loads((ROOT/"events.json").read_text())
months=[ym_add(now.year,now.month,k) for k in (0,1)]
pick=months[1] if now.day>=20 else months[0]
out=ROOT/"m"; out.mkdir(exist_ok=True)
keepm={f"{y}-{m:02d}" for y,m in months}
for p in out.iterdir():
    if p.is_dir() and p.name not in keepm: shutil.rmtree(p)
CSS="""<style>
.mhd{padding:22px 0 16px}.mhd .back{font-size:13px;color:var(--accent);text-decoration:none}.mhd h1{font-size:24px;margin:8px 0 4px}
.mnav{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0}.mnav a{border:1px solid var(--line);background:var(--card);color:var(--ink);padding:6px 12px;border-radius:999px;font-size:13px;text-decoration:none}
.msec{margin:26px 0 0;scroll-margin-top:12px}.msec>h2{font-size:20px;margin:0 0 4px;padding-bottom:6px;border-bottom:2px solid var(--line)}
.mgen{font-size:15px;color:var(--mute);margin:16px 0 8px}
.mlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.mcard{display:flex;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px;text-decoration:none;color:var(--ink)}
.mcard:hover{border-color:var(--accent)}.mcard img,.mcard .ph{width:76px;height:76px;flex:none;border-radius:10px;object-fit:cover;background:var(--soft)}
.mcard .ph{display:flex;align-items:center;justify-content:center;font-size:26px}
.mcard b{display:block;font-size:14px;line-height:1.35}.mcard small{display:block;color:var(--mute);font-size:12px;margin-top:3px;line-height:1.35}
.mcard .dt{color:var(--accent);font-weight:700}
.mft{margin:34px 0 40px;font-size:12px;color:var(--mute)}
</style>"""
def page(y,m):
    key=f"{y}-{m:02d}";seen={}
    for e in d["events"]:
        if str(e.get("start","")).startswith(key):
            i=item_id(e)
            if i not in seen or e["start"]<seen[i]["start"]: seen[i]=e
    ev=[(i,e) for i,e in seen.items() if (ROOT/"i"/i/"index.html").exists()]
    url=f"{SITE}m/{key}/";title=f"{m}월에 시작하는 행사 모아보기 · 오시카츠 재팬"
    cnt={r:sum(1 for _,e in ev if e.get("area")==r) for r,_,_ in REG}
    desc=f"{y}년 {m}월에 시작하는 일본 팝업스토어·콜라보카페·전시 {len(ev)}건을 지역·장르별로 모았어요. "+" · ".join(f"{r} {c}" for r,c in cnt.items() if c)+". 공식 발표 기준."
    nav="".join(f'<a href="#{s}">{ic} {r} {cnt[r]}</a>' for r,ic,s in REG if cnt[r])
    secs=[]
    for r,ic,s in REG:
        rs=[x for x in ev if x[1].get("area")==r]
        if not rs: continue
        b=[f'<section class="msec" id="{s}"><h2>{ic} {r} <small style="font-size:14px;color:var(--mute)">{len(rs)}건</small></h2>']
        gens=GEN+sorted({e.get("category") for _,e in rs}-set(GEN))
        for g in gens:
            gs=sorted([x for x in rs if x[1].get("category")==g],key=lambda x:(x[1]["start"],x[1].get("title_ko","")))
            if not gs: continue
            b.append(f'<h3 class="mgen">{q(g)} · {len(gs)}</h3><div class="mlist">')
            for i,e in gs:
                th=e.get("thumb_small");img=f'<img src="../../{q(th)}" alt="" loading="lazy" width="76" height="76">' if th and (ROOT/th).exists() else '<span class="ph">🎌</span>'
                when=q(e["date_label"]) if e.get("date_label") else f'{md(e["start"])} ~ {md(e.get("end"))}' if e.get("end") and e.get("end")!=e["start"] else md(e["start"])
                b.append(f'<a class="mcard" href="../../i/{i}/">{img}<span><b>{q(e.get("title_ko"))}</b><small class="dt">{when}</small><small>📍 {q(e.get("venue"))}</small></span></a>')
            b.append("</div>")
        b.append("</section>");secs.append("".join(b))
    other=" ".join(f'<a href="../{yy}-{mm:02d}/">{mm}월 모아보기 →</a>' for yy,mm in months if (yy,mm)!=(y,m))
    h=f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{q(title)}</title><meta name="description" content="{q(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="오시카츠 재팬"><meta property="og:title" content="{q(title)}"><meta property="og:description" content="{q(desc)}"><meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}og-v2.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../../favicon.ico" sizes="any"><meta name="color-scheme" content="light dark">
<script>(function(){{var t=null;try{{t=localStorage.getItem('qj_theme')}}catch(e){{}}if(t!=='dark'&&t!=='light')t=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.setAttribute('data-theme',t)}})();</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="../../style.css">{CSS}
<script type="application/ld+json">{json.dumps({"@context":"https://schema.org","@type":"CollectionPage","name":title,"url":url,"description":desc,"mainEntity":{"@type":"ItemList","numberOfItems":len(ev),"itemListElement":[{"@type":"ListItem","position":k+1,"url":f"{SITE}i/{i}/"} for k,(i,_) in enumerate(ev)]}},ensure_ascii=False)}</script>
</head><body><header class="hd mhd"><div class="wrap"><a class="back" href="../../">← 오시카츠 재팬 전체 일정</a>
<h1>🗓️ {m}월에 시작하는 행사 모아보기</h1><p class="sub">{y}년 {m}월에 문을 여는 팝업·카페·전시 {len(ev)}건 · 공식 발표 기준 · {q(d.get("last_updated",""))} 업데이트</p>
<nav class="mnav" aria-label="지역 바로가기">{nav}</nav></div></header>
<main class="wrap">{"".join(secs) or '<p>아직 등록된 행사가 없어요.</p>'}
<p class="mft">일정·가격은 바뀔 수 있어요. 방문 전 각 행사 공식 사이트를 꼭 확인해 주세요. {other}</p></main></body></html>
"""
    (out/key).mkdir(exist_ok=True);(out/key/"index.html").write_text(h)
    return key,len(ev),cnt
for y,m in months: print(page(y,m))
# 헤더 링크 갱신
ix=ROOT/"index.html";s=ix.read_text();py,pm=pick
s2=re.sub(r'<a class="vnav mlink" id="mlink" href="[^"]*">[^<]*</a>',f'<a class="vnav mlink" id="mlink" href="m/{py}-{pm:02d}/">🗓️ {pm}월 시작 행사</a>',s)
if s2!=s: ix.write_text(s2)
