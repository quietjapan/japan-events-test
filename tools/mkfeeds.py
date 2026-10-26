"""구독용 피드 + 검색엔진 구조화 데이터 생성 (build.sh에서 매번 실행, 네트워크 없음).
- feeds/<region>.ics (tokyo/osaka/fukuoka: 지역 행사, nationwide: 전국 공통 쿠지·가챠·잡지 부록) — 구글 캘린더 등에서 URL로 구독
- rss.xml — 새로 추가된 행사(added 기준 최신순 80건)
- index.html 의 <!--LD:start-->…<!--LD:end--> 사이에 schema.org ItemList(JSON-LD) — 각 항목 url은 i/<id>/ (그 페이지에 Event JSON-LD는 mkshare.py가 넣어요)"""
import json, datetime, html, re, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
ROOT=Path(__file__).resolve().parent.parent;SITE="https://quietjapan.github.io/japan-events-test/";NAME="오시카츠 재팬"
from added import skey, hid
iid=lambda e:e.get("id") or hid(skey(e))
KST=datetime.timezone(datetime.timedelta(hours=9));now=datetime.datetime.now(KST);today=now.strftime("%Y-%m-%d")
d=json.loads((ROOT/"events.json").read_text());EV=d["events"]
reg=lambda e:e.get("region") or {"오사카":"osaka","후쿠오카":"fukuoka","전국":"all"}.get(e.get("area"),"tokyo")
live=[e for e in EV if e.get("start") and (e.get("end") or e["start"])>=today]
def esc(s):return str(s or "").replace("\\","\\\\").replace(";","\\;").replace(",","\\,").replace("\n","\\n")
def fold(l):
    b=l.encode();out=[]
    while len(b)>75:
        cut=75
        while (b[cut]&0xC0)==0x80: cut-=1
        out.append(b[:cut].decode());b=b" "+b[cut:]
    out.append(b.decode());return "\r\n".join(out)
def nd(s):return (datetime.date.fromisoformat(s)+datetime.timedelta(days=1)).strftime("%Y%m%d")
def vevent(e):
    s=e["start"];en=e.get("end") or s;i=iid(e)
    L=["BEGIN:VEVENT",f"UID:{i}-{s}@quietjapan.github.io",f"DTSTAMP:{now.astimezone(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
       f"DTSTART;VALUE=DATE:{s.replace('-','')}",f"DTEND;VALUE=DATE:{nd(en)}",f"SUMMARY:{esc(e.get('title_ko'))}",
       f"DESCRIPTION:{esc(((e.get('summary_ko') or '')+chr(10)+'공식: '+(e.get('official_url') or '')+chr(10)+'자세히: '+SITE+'i/'+i+'/').strip())}",
       f"URL:{SITE}i/{i}/"]
    if e.get("venue"): L.append(f"LOCATION:{esc(e['venue'])}")
    L.append("END:VEVENT");return L
def cal(name,evs):
    L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//quietjapan//japan-events-test//KO","CALSCALE:GREGORIAN","METHOD:PUBLISH",f"X-WR-CALNAME:{esc(name)}","X-WR-TIMEZONE:Asia/Tokyo","REFRESH-INTERVAL;VALUE=DURATION:PT12H","X-PUBLISHED-TTL:PT12H"]
    for e in evs: L+=vevent(e)
    L.append("END:VCALENDAR");return "\r\n".join(fold(x) for x in L)+"\r\n"
F=ROOT/"feeds";F.mkdir(exist_ok=True)
for r,n in (("tokyo","도쿄"),("osaka","오사카"),("fukuoka","후쿠오카"),("nationwide","전국 공통")):
    ev=[e for e in live if reg(e)==("all" if r=="nationwide" else r)]
    (F/f"{r}.ics").write_text(cal(f"{NAME} · {n} 행사",ev),newline="")
# RSS
q=lambda s:html.escape(str(s or ""),quote=True)
items=sorted([e for e in EV if e.get("added")],key=lambda e:(e["added"],e.get("start") or ""),reverse=True)
seen=set();rows=[]
for e in items:
    i=iid(e)
    if i in seen: continue
    seen.add(i);rows.append(e)
    if len(rows)>=80: break
def rfc(s):return datetime.datetime.fromisoformat(s+"T10:00:00+09:00").strftime("%a, %d %b %Y %H:%M:%S +0900")
body="".join(f"<item><title>{q(e.get('title_ko'))}</title><link>{SITE}i/{iid(e)}/</link><guid isPermaLink=\"false\">{iid(e)}</guid><pubDate>{rfc(e['added'])}</pubDate><category>{q(e.get('category'))}</category><description>{q(' · '.join(filter(None,[e.get('area'),e.get('venue'),(e.get('start') or '')+(' ~ '+e['end'] if e.get('end') else '')]))+(' — '+e['summary_ko'] if e.get('summary_ko') else ''))}</description></item>" for e in rows)
(ROOT/"rss.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>{NAME} · 새로 추가된 행사</title><link>{SITE}</link><atom:link href="{SITE}rss.xml" rel="self" type="application/rss+xml"/><description>도쿄·오사카·후쿠오카 애니·팝업·콜라보 행사 (공식 발표 기준)</description><language>ko</language><lastBuildDate>{now.strftime("%a, %d %b %Y %H:%M:%S +0900")}</lastBuildDate>{body}</channel></rss>\n')
# ItemList JSON-LD in index.html
seen=set();lst=[]
for e in sorted(live,key=lambda e:e["start"]):
    i=iid(e)
    if i in seen or reg(e)=="all": continue
    seen.add(i);lst.append({"@type":"ListItem","position":len(lst)+1,"url":f"{SITE}i/{i}/","name":e.get("title_ko")})
ld={"@context":"https://schema.org","@type":"ItemList","name":"도쿄·오사카·후쿠오카 애니·팝업·콜라보 행사","numberOfItems":len(lst),"itemListElement":lst}
blk='<!--LD:start--><script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace("</","<\\/")+'</script><!--LD:end-->'
ix=ROOT/"index.html";t=ix.read_text()
t=re.sub(r"<!--LD:start-->.*?<!--LD:end-->",lambda m:blk,t,flags=re.S) if "<!--LD:start-->" in t else t.replace("</head>",blk+"\n</head>",1)
ix.write_text(t);print("feeds ok",{r:sum(1 for e in live if reg(e)==r) for r in ("tokyo","osaka","fukuoka","all")},"rss",len(rows),"itemlist",len(lst))
