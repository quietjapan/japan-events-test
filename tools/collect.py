"""후보 수집 도우미: python tools/collect.py URL [URL ...]  -> candidates.json
각 URL(공식 페이지/1kuji/gashapon/charagoo 등)을 가져와 제목·og:image·주소·날짜가 들어간 원문 구절을 그대로 뽑음.
여기서 나온 건 '후보'일 뿐 — 사람이 title_ko/category 등을 채워 pending.json 에 넣고 verify.py 를 돌리면 검증됨."""
import json, sys, re
from bs4 import BeautifulSoup
from common import ROOT, fetch, og_image, address, date_tokens, host

KEYS = ("開催期間", "会期", "期間", "日程", "発売日", "販売期間", "開催日")
def snippets(text, n=5):
    out = []
    for k in KEYS:
        for m in re.finditer(k, text):
            q = text[m.start():m.start() + 90]
            if date_tokens(q) and q not in out: out.append(q)
            if len(out) >= n: return out
    return out

def main(urls):
    f = ROOT / "candidates.json"
    cands = json.loads(f.read_text()) if f.exists() else []
    have = {c["url"] for c in cands}
    for u in urls:
        if u in have: continue
        p = fetch(u, fresh=True)
        s = BeautifulSoup(p["html"] or "", "html.parser")
        t = s.find("meta", attrs={"property": "og:title"})
        cands.append({"url": u, "host": host(u), "title": (t.get("content") if t else (s.title.string if s.title else "")) or "",
                      "thumbnail": og_image(p["html"], p["final_url"]), "map_query": address(p["text"]),
                      "quotes": snippets(p["text"]), "links": sorted({a["href"] for a in s.select("a[href]") if "/event/" in a["href"] or "/products/" in a["href"]})[:50]})
        print(u, len(cands[-1]["quotes"]), "quotes")
    f.write_text(json.dumps(cands, ensure_ascii=False, indent=2) + "\n")

if __name__ == "__main__": main(sys.argv[1:])
