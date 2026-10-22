"""근거(evidence) 자동 채우기: 공식/출처 페이지를 실제로 가져와서, 행사 날짜가 들어있는 원문 구절을 그대로 잘라 저장.
지어내지 않음: 원문에 날짜가 없으면 evidence 를 비워 두고 verify 가 pending 으로 보냄.
사용: python tools/backfill.py [--fresh] [파일...]   (기본: events.json, pending.json)"""
import json, sys, datetime as dt
from common import ROOT, fetch, norm, parse_dates, derivable, host, og_image, address, DATE_RE

def find_quote(text, start, end):
    if not start: return ""
    best = ""
    for m in DATE_RE.finditer(text):
        if start not in parse_dates(m.group(0)) and start not in parse_dates(text[max(0,m.start()-12):m.end()]):
            continue
        for w in (60, 120, 200):
            a, b = max(0, m.start() - 40), min(len(text), m.end() + w)
            q = text[a:b]
            if derivable(q, start, end)[0]:
                if not best or len(q) < len(best): best = q
                break
    return best

def enrich(e, fresh=False):
    today = dt.date.today().isoformat()
    urls = [(e.get("official_url"), "official")]
    if e.get("source_url") and e["source_url"] != e.get("official_url"):
        urls.append((e["source_url"], "official" if host(e["source_url"]) == host(e.get("official_url")) else "aggregator"))
    ev = []
    for u, tier in urls:
        if not u: continue
        p = fetch(u, fresh)
        q = find_quote(p["text"], e.get("start"), e.get("end"))
        if q: ev.append({"url": u, "tier": tier, "quote": q})
        if tier == "official" and u == e.get("official_url"):
            img = og_image(p["html"], p["final_url"])
            e["thumbnail"] = img; e["thumbnail_source"] = u if img else ""
            if e.get("area") != "전국":
                e["map_query"] = address(p["text"])
    if not e.get("map_query") and e.get("area") != "전국":
        # 공식 페이지에 주소가 없으면 집계 사이트 주소라도 (지도는 참고용)
        for u, tier in urls[1:]:
            a = address(fetch(u)["text"])
            if a: e["map_query"] = a; break
    e["evidence"] = ev
    e["source_tier"] = "official" if any(x["tier"] == "official" for x in ev) else ("aggregator" if ev else "")
    e["verified_at"] = today if ev else ""
    return e

if __name__ == "__main__":
    fresh = "--fresh" in sys.argv
    files = [a for a in sys.argv[1:] if not a.startswith("--")] or ["events.json", "pending.json"]
    for fn in files:
        f = ROOT / fn
        if not f.exists(): continue
        d = json.loads(f.read_text())
        for i, e in enumerate(d["events"]):
            enrich(e, fresh); print(fn, i, e["title_ko"][:30], len(e["evidence"]), e["source_tier"], bool(e.get("thumbnail")), e.get("map_query","")[:30], flush=True)
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
