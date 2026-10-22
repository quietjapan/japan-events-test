"""행사장 좌표 채우기 (OpenStreetMap Nominatim, 1초 1건). map_query(주소)가 있고 lat/lon 이 없을 때만.
실패하면 비워둠 → 사이트에서 지역 도시 좌표 사용."""
import json, time, requests
from common import ROOT
def geocode(q):
    try:
        r = requests.get("https://nominatim.openstreetmap.org/search", params={"q": q, "format": "json", "limit": 1, "countrycodes": "jp"},
                         headers={"User-Agent": "japan-events-calendar/1.0 (github.com/quietjapan/japan-events)"}, timeout=20)
        j = r.json()
        return (round(float(j[0]["lat"]), 4), round(float(j[0]["lon"]), 4)) if j else None
    except Exception: return None
for fn in ("events.json", "pending.json"):
    f = ROOT / fn; d = json.loads(f.read_text()); n = 0
    for e in d["events"]:
        if e.get("area") == "전국" or e.get("lat") or not e.get("map_query"): continue
        q = e["map_query"]; c = geocode(q); time.sleep(1.1)
        if not c and "丁目" in q: c = geocode(q.split("丁目")[0] + "丁目"); time.sleep(1.1)
        if not c: c = geocode(q.rsplit("-", 1)[0]) if "-" in q else None; time.sleep(1.1)
        if c and 24 < c[0] < 46 and 122 < c[1] < 146: e["lat"], e["lon"] = c; n += 1
    f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n"); print(fn, "geocoded:", n)
