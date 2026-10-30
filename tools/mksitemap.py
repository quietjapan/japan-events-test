"""sitemap.xml + robots.txt 생성: 홈 + 공유 페이지 i/<id>/ (+ 월별 모아보기 m/<YYYY-MM>/ 있으면).
lastmod: 항목의 verified_at/checked_date/added 중 가장 최근 날짜, 없으면 빌드일(KST). build.sh에서 매번 실행."""
import json, re, datetime
from pathlib import Path
from xml.sax.saxutils import escape
ROOT=Path(__file__).resolve().parent.parent
SITE=re.search(r'SITE="([^"]+)"',(ROOT/"tools"/"mkshare.py").read_text()).group(1)
today=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).date().isoformat()
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
D=re.compile(r"^\d{4}-\d{2}-\d{2}$")
d=json.loads((ROOT/"events.json").read_text());lm={}
for e in d["events"]:
    i=item_id(e);ds=[v for v in (e.get("verified_at"),e.get("checked_date"),e.get("added")) if isinstance(v,str) and D.match(v) and v<=today]
    v=max(ds) if ds else today
    lm[i]=max(lm.get(i,v),v)
home=d.get("last_updated") if D.match(str(d.get("last_updated",""))) else today
urls=[(SITE,home,"daily","1.0")]
for p in sorted((ROOT/"m").glob("????-??")) if (ROOT/"m").exists() else []:
    if (p/"index.html").exists(): urls.append((f"{SITE}m/{p.name}/",home,"weekly","0.8"))
n=0
for p in sorted((ROOT/"i").iterdir()):
    if p.is_dir() and (p/"index.html").exists():
        urls.append((f"{SITE}i/{p.name}/",lm.get(p.name,today),"weekly","0.6"));n+=1
x=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
x+=[f"  <url><loc>{escape(u)}</loc><lastmod>{l}</lastmod><changefreq>{c}</changefreq><priority>{pr}</priority></url>" for u,l,c,pr in urls]
x.append("</urlset>")
(ROOT/"sitemap.xml").write_text("\n".join(x)+"\n")
(ROOT/"robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n")
print("sitemap urls",len(urls),"(share pages",n,")")
