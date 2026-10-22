"""검증 파이프라인 (한 번에 실행: python tools/verify.py)
1) 종료일 지난 행사 삭제  2) 근거 URL 을 다시 가져와 인용문이 그대로 있는지 + 인용문에서 시작/종료일이 나오는지 확인
3) 공식(official) 근거가 통과한 것만 events.json(라이브)에 남기고 나머지는 pending.json 으로 (사유 포함)
4) review.md 작성.  --no-fetch: 캐시 사용(빠른 재실행).  --backfill: 근거 없는 항목은 먼저 backfill 시도"""
import json, sys, datetime as dt
from common import ROOT, fetch, norm, derivable
import backfill

FRESH = "--no-fetch" not in sys.argv
today = dt.date.today()

def load(fn):
    f = ROOT / fn
    return json.loads(f.read_text()) if f.exists() else {"events": []}

def key(e): return (e.get("title_ja") or e["title_ko"], e.get("start"), e.get("venue"))

def check(e):
    ev = e.get("evidence") or []
    if not ev:
        if not e.get("start"): return False, "날짜(시작일) 미정 — 근거로 확정할 수 없음"
        return False, "근거 없음: 공식/출처 페이지에서 이 날짜가 적힌 원문을 찾지 못함"
    ok_off, reasons, seen = False, [], {}
    for x in ev:
        p = seen.get(x["url"]) or fetch(x["url"], fresh=FRESH); seen[x["url"]] = p
        if not p["text"]: reasons.append(f"페이지를 가져오지 못함 ({x['url']})"); continue
        if norm(x["quote"]) not in p["text"]: reasons.append(f"인용문이 페이지에서 사라짐 ({x['url']})"); continue
        good, why = derivable(x["quote"], e.get("start"), e.get("end"))
        if not good: reasons.append(why + f" ({x['url']})"); continue
        x["checked"] = today.isoformat()
        if x["tier"] == "official": ok_off = True
    if ok_off: return True, ""
    if not any(x["tier"] == "official" for x in ev):
        u = e.get("official_url")
        if not u: reasons.append("공식 URL 없음 — 집계 사이트에서만 확인됨")
        else:
            t = fetch(u)["text"]
            if not t: reasons.append("공식 페이지를 읽지 못함(차단/JS) — 집계 사이트에서만 확인됨")
            else:
                i = max(t.find("開催期間"), t.find("会期"), t.find("期間"))
                hint = f" · 공식 페이지 표기: 「{t[i:i+60]}」" if i >= 0 else ""
                reasons.append(f"공식 페이지에 시작·종료일({e.get('start')}~{e.get('end') or ''})이 그대로 적힌 문장이 없음 — 날짜가 다를 수 있음{hint}")
    return False, "; ".join(dict.fromkeys(reasons))

def main():
    live, pend = load("events.json"), load("pending.json")
    prev_live = {key(e) for e in live["events"]}
    allev = live["events"] + pend["events"]
    removed, new_live, new_pend = [], [], []
    for e in allev:
        end = e.get("end") or e.get("start")
        if not e.get("end") and e.get("start") and e.get("category") in ("가챠", "쿠지"):
            end = (dt.date.fromisoformat(e["start"]) + dt.timedelta(days=30)).isoformat()  # 발매 후 30일간 '입고 중'
        if not e.get("end") and e.get("start") and e.get("category") == "잡지 부록":
            end = (dt.date.fromisoformat(e["start"]) + dt.timedelta(days=35)).isoformat()  # 발매 후 약 5주(다음 호로 교체)
        if end and dt.date.fromisoformat(end) < today:
            removed.append(e); continue
        if "--backfill" in sys.argv and not e.get("evidence"): backfill.enrich(e)
        ok, why = check(e)
        if ok:
            e.pop("pending_reason", None); e["verified_at"] = today.isoformat(); new_live.append(e)
        else:
            e["pending_reason"] = why; new_pend.append(e)
    live["events"], pend["events"] = new_live, new_pend
    live["base_date"] = pend["base_date"] = today.isoformat()
    (ROOT / "events.json").write_text(json.dumps(live, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "pending.json").write_text(json.dumps(pend, ensure_ascii=False, indent=2) + "\n")
    added = [e for e in new_live if key(e) not in prev_live]
    dropped = [e for e in new_pend if key(e) in prev_live]
    L = [f"# 검수 리포트 ({today.isoformat()})", "",
         f"- 라이브 {len(new_live)}건 / 미게시(공식 미확인) {len(new_pend)}건 / 종료 삭제 {len(removed)}건", ""]
    L += ["## 새로 자동 게시된 항목", ""] + ([f"- {e['title_ko']} ({e.get('start')}~{e.get('end') or ''}) — {e['evidence'][0]['url']}" for e in added] or ["- 없음"])
    L += ["", "## 라이브에서 빠진 항목 (재검증 실패)", ""] + ([f"- {e['title_ko']}: {e['pending_reason']}" for e in dropped] or ["- 없음"])
    L += ["", "## 미게시 보관 (pending.json) — 공식 출처로 확인되지 않아 사이트에 올리지 않음 (사람 검수 불필요, 공식 근거가 생기면 다음 실행 때 자동 게시)", ""]
    for e in new_pend:
        L.append(f"- **{e['title_ko']}** ({e.get('start') or '?'}~{e.get('end') or ''})  \n  사유: {e['pending_reason']}  \n  공식: {e.get('official_url') or '-'} · 출처: {e.get('source_url') or '-'}")
    L += ["", "## 종료되어 삭제", ""] + ([f"- {e['title_ko']} (종료 {e.get('end') or e.get('start')})" for e in removed] or ["- 없음"])
    (ROOT / "review.md").write_text("\n".join(L) + "\n")
    print(f"live={len(new_live)} pending={len(new_pend)} removed={len(removed)}")

if __name__ == "__main__": main()
