"""첫 화면용 가벼운 목록 파일 events-lite.json + '자세히' 열 때만 받는 갤러리 gal/<key>.json.
- events.json(원본)은 그대로 둠(다른 도구·피드가 씀). 화면 스크립트(app·picks·extras·rows)는 lite만 한 번 받아 공유.
- lite에서 빠지는 것: 근거(evidence)·검증 메타·갤러리 본문. 갤러리는 gk(파일 키)·gn(사진 수)만 남김.
- 연말연시 영업 안내는 events.json의 ny_hours(공식 안내 원문 기준, 출처 ny_hours_source)를 그대로 씀 — 새로 만들지 않음."""
import json, hashlib, re
from common import ROOT
DROP = {"evidence", "checked_date", "source_tier", "lead_source", "title_ko_source", "translation_check",
        "prizes", "thumb_kind", "verified_at_src"}
GAL = ("gallery", "gallery_note", "gallery_source", "gallery_more")
def main():
    d = json.loads((ROOT / "events.json").read_text())
    gdir = ROOT / "gal"; gdir.mkdir(exist_ok=True)
    keep = set(); lite = []
    for e in d["events"]:
        x = {k: v for k, v in e.items() if k not in DROP and k not in GAL}
        g = {k: e[k] for k in GAL if e.get(k)}
        if e.get("gallery"):
            blob = json.dumps(g, ensure_ascii=False, separators=(",", ":"))
            k = hashlib.sha1(blob.encode()).hexdigest()[:12]
            (gdir / f"{k}.json").write_text(blob) if not (gdir / f"{k}.json").exists() else None
            keep.add(k); x["gk"] = k; x["gn"] = len(e["gallery"])
        lite.append(x)
    for f in gdir.glob("*.json"):
        if f.stem not in keep: f.unlink()
    out = {k: v for k, v in d.items() if k != "events"}; out["events"] = lite
    s = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    (ROOT / "events-lite.json").write_text(s)
    print("lite", len(s.encode()) // 1024, "KB (원본", (ROOT / "events.json").stat().st_size // 1024, "KB) gal", len(keep), "ny_hours", sum(1 for x in lite if x.get("ny_hours")))
if __name__ == "__main__": main()
