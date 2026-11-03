"""행사장 좌표 채우기. lat/lon 이 없을 때만 (지역 '전국' 제외).
1) data/venues.json(자주 나오는 매장 공식 주소·좌표 사전): keys 중 하나가 map_query 또는 venue 에 들어 있으면
   map_query 가 주소가 아닐 때 공식 주소로 바꾸고 사전 좌표를 씀.
2) 그 외에는 map_query(주소)를 국토지리원 주소검색 → OpenStreetMap Nominatim 순으로 지오코딩.
실패하면 비워둠 → 사이트에서 지역 도시 좌표 사용 (추측해서 넣지 않음)."""
import json, re, time, requests
from common import ROOT
VEN = json.loads((ROOT / "data" / "venues.json").read_text())["venues"]
ADDR = re.compile(r"(都|道|府|県).+(区|市|町|村).*\d")
def venue_match(e):
    s = (e.get("map_query") or "") + " " + (e.get("venue") or "")
    for v in VEN:
        if any(k in s for k in v["keys"]): return v
def gsi(q):
    try:
        j = requests.get("https://msearch.gsi.go.jp/address-search/AddressSearch", params={"q": q}, timeout=20).json()
        if j and ADDR.search(q):
            x, y = j[0]["geometry"]["coordinates"]; return (round(y, 5), round(x, 5))
    except Exception: pass
def osm(q):
    try:
        r = requests.get("https://nominatim.openstreetmap.org/search", params={"q": q, "format": "json", "limit": 1, "countrycodes": "jp"},
                         headers={"User-Agent": "japan-events-calendar/1.0 (github.com/quietjapan/japan-events)"}, timeout=20)
        j = r.json(); time.sleep(1.1)
        return (round(float(j[0]["lat"]), 4), round(float(j[0]["lon"]), 4)) if j else None
    except Exception: return None
def geocode(q):
    c = gsi(q); time.sleep(0.3)
    if not c: c = osm(q)
    if not c and "丁目" in q: c = osm(q.split("丁目")[0] + "丁目")
    return c
if __name__ == "__main__":
    for fn in ("events.json", "pending.json"):
        f = ROOT / fn; d = json.loads(f.read_text()); n = m = 0; left = []
        for e in d["events"]:
            if e.get("area") == "전국" or e.get("lat"): continue
            v = venue_match(e)
            if v:
                if not ADDR.search(e.get("map_query") or ""): e["map_query"] = v["address"] if ADDR.search(v["address"]) else (e.get("map_query") or v["address"])
                e["lat"], e["lon"] = v["lat"], v["lon"]; m += 1; continue
            if not e.get("map_query"): left.append(e.get("venue")); continue
            c = geocode(e["map_query"])
            if c and 24 < c[0] < 46 and 122 < c[1] < 146: e["lat"], e["lon"] = c; n += 1
            else: left.append(e.get("venue"))
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
        print(fn, "venues.json:", m, "geocoded:", n, "left:", left)
