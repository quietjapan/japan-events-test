"""자세히 보기 공유용 정적 페이지 생성 (모든 항목): i/<id>/index.html (+ og.jpg 1200x630).
크롤러는 JS를 안 돌리니 OG 태그는 여기서, 사람은 ../../?item=<id> 로 즉시 이동.
id 규칙은 app.js itemId()와 동일: e.id 또는 FNV-1a(seriesKey) base36. 이미 있는 og.jpg는 건너뜀(--force로 재생성)."""
import json, io, sys, html, shutil, requests
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent; OUT=ROOT/"i"; SITE="https://quietjapan.github.io/japan-events/"
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36"}
SHOP={"팝업스토어","콜라보카페","쿠지","가챠","잡지 부록"}
# 로컬 공식 이미지로 OG를 만들 항목 (id -> 파일)
LOCAL={"conan-diner":Path(__file__).parent/"og_src"/"conan-diner.png"}
FORCE="--force" in sys.argv
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
def og_img(src_bytes,dst):
    im=Image.open(io.BytesIO(src_bytes)).convert("RGB");W,H=1200,630
    s=max(W/im.width,H/im.height);im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    l=(im.width-W)//2;t=max(0,(im.height-H)//3);im.crop((l,t,l+W,t+H)).save(dst,"JPEG",quality=80,optimize=True,progressive=True)
def ld(e,i,url,img):
    """schema.org Event JSON-LD (검색엔진용). 전국 공통(쿠지·가챠·잡지 부록)은 장소가 없어 Product 성격이라 Event로 넣지 않아요."""
    if not e.get("start") or (e.get("region")=="all" or e.get("area")=="전국"): return ""
    addr=e.get("map_query") or ""
    place={"@type":"Place","name":e.get("venue") or e.get("area"),"address":{"@type":"PostalAddress","streetAddress":addr,"addressLocality":e.get("area") or "","addressCountry":"JP"} if addr else {"@type":"PostalAddress","addressLocality":e.get("area") or "","addressCountry":"JP"}}
    if e.get("lat") and e.get("lon"): place["geo"]={"@type":"GeoCoordinates","latitude":e["lat"],"longitude":e["lon"]}
    o={"@context":"https://schema.org","@type":"Event","name":e.get("title_ko"),"alternateName":e.get("title_ja") or None,"startDate":e["start"],"endDate":e.get("end") or e["start"],
       "eventStatus":"https://schema.org/EventScheduled","eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode","location":place,
       "image":[img],"description":(e.get("summary_ko") or e.get("title_ko") or "")[:300],"url":e.get("official_url") or url,"sameAs":url,
       "organizer":{"@type":"Organization","name":host(e.get("official_url")) or "공식 주최","url":e.get("official_url") or url}}
    o={k:v for k,v in o.items() if v is not None}
    return '<script type="application/ld+json">'+json.dumps(o,ensure_ascii=False).replace("</","<\\/")+'</script>'
def host(u):
    from urllib.parse import urlparse
    try: return urlparse(u or "").hostname.replace("www.","")
    except Exception: return ""
d=json.loads((ROOT/"events.json").read_text());seen={};fail=0
for e in d["events"]:
    i=item_id(e)
    if i in seen:   # 시리즈: 첫 항목(=다음 회차 기준)이 대표. 썸네일 없으면 다음 것으로 보충
        if not seen[i].get("thumbnail") and e.get("thumbnail"): seen[i]=e
        continue
    seen[i]=e
keep=set()
for i,e in seen.items():
    dd=OUT/i;dd.mkdir(parents=True,exist_ok=True);keep.add(i);img=SITE+"og-v3.png";credit=""
    jp=dd/"og.jpg"
    try:
        if FORCE or not jp.exists():
            if i in LOCAL: og_img(LOCAL[i].read_bytes(),jp)
            elif e.get("thumbnail"):
                r=requests.get(e["thumbnail"],headers={**UA,"Referer":e.get("thumbnail_source") or e.get("official_url") or ""},timeout=30);r.raise_for_status();og_img(r.content,jp)
        if jp.exists(): img=f"{SITE}i/{i}/og.jpg";credit=" (이미지: 공식 이미지)"
    except Exception as x: print("FAIL",i,e.get("title_ko"),x);fail+=1
    t=f"{e.get('title_ko','')} · 오시카츠 재팬"
    desc=(e.get("summary_ko") or "").strip()
    meta=" · ".join(filter(None,[e.get("venue"),e.get("start") and (e["start"]+(" ~ "+e["end"] if e.get("end") else " ~"))]))
    desc=(desc+(" | " if desc and meta else "")+meta)[:170]+credit+(" "+e["copyright"] if e.get("copyright") else "")
    url=f"{SITE}i/{i}/";dest=f"../../?item={i}";q=lambda s:html.escape(s,quote=True)
    (dd/"index.html").write_text(f"""<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{q(t)}</title><meta name="description" content="{q(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="오시카츠 재팬">
<meta property="og:title" content="{q(t)}"><meta property="og:description" content="{q(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{q(t)}"><meta name="twitter:description" content="{q(desc)}"><meta name="twitter:image" content="{img}">
{ld(e,i,url,img)}
<script>location.replace("{dest}"+location.hash)</script>
</head><body><p><a href="{dest}">{q(e.get('title_ko',''))} 자세히 보기 →</a></p>{'<p>'+q(e['copyright'])+'</p>' if e.get('copyright') else ''}</body></html>
""")
for p in OUT.iterdir():
    if p.is_dir() and p.name not in keep: shutil.rmtree(p)
print("pages",len(keep),"fail",fail)
