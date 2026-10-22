"""요약 원문 추출: 공식(또는 근거) 페이지의 title/meta description/본문 앞부분."""
import json, sys
from bs4 import BeautifulSoup
from common import ROOT, fetch
def source(e):
    urls=[e.get("official_url")]+[v["url"] for v in e.get("evidence",[]) if v.get("tier")=="official"]+[e.get("source_url")]
    for u in [x for x in urls if x]:
        d=fetch(u)
        if not d.get("text"): continue
        s=BeautifulSoup(d["html"] or "","html.parser")
        md=""
        for k in ("og:description","description"):
            m=s.find("meta",attrs={"property":k}) or s.find("meta",attrs={"name":k})
            if m and m.get("content"): md=m["content"]; break
        t=(s.title.string if s.title and s.title.string else "")
        return u, (t+" | "+md+" | "+d["text"][:700]).strip()
    return "",""
if __name__=="__main__":
    d=json.load(open(ROOT/"events.json"))
    for i,e in enumerate(d["events"]):
        if e.get("summary_ko") is not None: continue
        u,t=source(e); print(f"### {i} {e['title_ko']} [{e['category']}]\nURL {u}\n{t}\n")
