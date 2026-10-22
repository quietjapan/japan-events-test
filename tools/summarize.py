"""공식 페이지 요약(summary_ko) 적용. 캐시: tools/summaries.json (key=title_ja|start).
규칙: 요약은 summary_source 페이지 원문에 있는 내용만, 1~2문장 해요체. 정보가 적으면 중립 한 줄.
새 항목(캐시에 없는 것)만 원문을 tools/.summary_todo.txt 로 뽑아 두고, 요약을 작성해 summaries.json 에 추가하면 다음 실행부터 반영돼요.
(요약 작성은 매번 새로 생성하지 않음 — 이미 있는 항목은 캐시 재사용)"""
import json
from common import ROOT
from sumsrc import source
C = ROOT/"tools"/"summaries.json"
def key(e): return f'{e.get("title_ja","")}|{e.get("start","")}'
def run():
    cache = json.loads(C.read_text()) if C.exists() else {}
    todo = []
    for fn in ("events.json",):
        f = ROOT/fn; d = json.loads(f.read_text())
        for e in d["events"]:
            c = cache.get(key(e))
            if c: e["summary_ko"], e["summary_source"] = c["summary_ko"], c["summary_source"]
            else:
                e.pop("summary_ko", None); u, t = source(e)
                todo.append(f"### {key(e)}\nURL {u}\n{t[:1500]}\n")
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2)+"\n")
    (ROOT/"tools"/".summary_todo.txt").write_text("\n".join(todo))
    print("summaries applied; new items needing summary:", len(todo))
if __name__ == "__main__": run()
