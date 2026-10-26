#!/usr/bin/env bash
# 이미지·공유 페이지 빌드 (정기 업데이트 월/목, 새 항목 추가 후 매번 실행). 모두 증분 처리: 이미 있는 파일은 건너뛰고, 실패해도 기존 파일·필드는 지우지 않아요.
set -e
cd "$(dirname "$0")/.."
python3 tools/added.py --backfill  # 새 항목에 added(처음 올라간 날, KST) 자동 기입 — 기존 값은 안 바꿈
python3 tools/mkthumbs.py    # 카드 썸네일 thumbs/*.webp (480px)
python3 tools/mkfallback.py  # 작은 대체본 gfb/*.webp
python3 tools/mkimg.py       # 원본 대표·갤러리 이미지 자체 보관 img/*.webp (최대 1200/1000px)
python3 tools/mkshare.py     # 항목별 공유 페이지 i/<id>/
python3 tools/mkfeeds.py     # 구독용 feeds/*.ics, rss.xml, index.html ItemList JSON-LD
