"""번역 사전 적용: glossary.json(ja→ko)에 있는 작품은 title_ko_source 기록, 사전에 없는 새 작품은 '번역 확인 필요'로 표시."""
import json
from common import ROOT
G = json.loads((ROOT / "tools/glossary.json").read_text())
def run(files=("events.json", "pending.json")):
    flagged = []
    for fn in files:
        f = ROOT / fn; d = json.loads(f.read_text())
        for e in d["events"]:
            hit = next((k for k in G if k in (e.get("title_ja") or "")), None)
            if hit:
                e["title_ko_source"] = G[hit]["source"]; e.pop("translation_check", None)
            elif not e.get("title_ko_source"):
                e["translation_check"] = True; flagged.append(e["title_ko"])
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "tools/.translation_flags.json").write_text(json.dumps(sorted(set(flagged)), ensure_ascii=False))
if __name__ == "__main__": run()
