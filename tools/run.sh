#!/usr/bin/env bash
# 한 번에 실행 (기본 정책: 공식 출처로 확인된 것만 게시, 나머지는 pending.json 에 보관만 — 사람 검수 대기열 없음)
# 1) 근거 없는 항목 근거 채우기 → 2) 쿠지/가챠 상품 썸네일 → 3) 공식 원문 재검증·종료 삭제 → review.md
# 업데이트 배포 전: events.json 의 last_updated 를 오늘(Asia/Seoul, YYYY-MM-DD)로 꼭 올려요. 상단 "다음 업데이트"가 이 값 기준으로 계산돼요.
set -e
cd "$(dirname "$0")/.."
PY=/workspace/.pwvenv/bin/python
(cd tools && $PY thumbs.py && $PY glossary.py && $PY geo.py)
$PY tools/verify.py --backfill "$@"
# 4) 공식 페이지 요약: 캐시(tools/summaries.json) 적용, 새 항목만 tools/.summary_todo.txt 로 원문 추출
(cd tools && $PY summarize.py)
# 번역 확인 필요 항목을 review.md 에 추가 (사전에 없는 작품명 — 일본어 원제는 카드에 항상 표시됨)
$PY - <<'P'
import json
f=json.load(open("tools/.translation_flags.json"))
open("review.md","a").write("\n## 번역 확인 필요 (tools/glossary.json에 없는 작품)\n\n"+("\n".join("- "+t for t in f) or "- 없음")+"\n")
P
