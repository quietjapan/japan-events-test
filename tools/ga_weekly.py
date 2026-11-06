#!/usr/bin/env python3
"""주간 GA4 리포트 (quietjapan.github.io/japan-events)

사용법:
  /workspace/.gavenv/bin/python tools/ga_weekly.py                 # 지난주 월~일 vs 그 전주
  /workspace/.gavenv/bin/python tools/ga_weekly.py --since 2026-10-16   # since ~ 어제 (첫 실행용)
출력: stdout + reports/ga_YYYY-MM-DD.md (실행일 기준)
"""
import argparse, datetime as dt, json, os, sys
from urllib.parse import unquote
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (RunReportRequest, DateRange, Metric, Dimension,
    FilterExpression, FilterExpressionList, Filter)
from google.oauth2 import service_account

# ── 설정 ─────────────────────────────────────────────
KEY = "/home/box/.config/quietjapan/ga-key.json"   # 읽기 전용, 출력 금지
PROP = "properties/559074434"
DATA_START = dt.date(2026, 10, 16)       # GA 수집 시작
SELF_EXCLUDE_START = dt.date(2026, 10, 17)  # ?me=1 자기 제외 시작
COUNTRY = "South Korea"
EXCLUDE_CITIES = ["Cheongju-si"]  # 준호님 거주지(본인 접속)          # 예: ["Cheongju-si"] (운영자 도시 확정 시)
ALT_EXCLUDE_CITY = ("Cheongju-si", "청주")   # '청주 제외 시' 참고 줄
STD_EVENTS = {"page_view", "user_engagement", "scroll", "session_start", "click", "first_visit",
              "file_download", "view_search_results", "video_start", "video_progress",
              "video_complete", "form_start", "form_submit"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# ────────────────────────────────────────────────────

client = BetaAnalyticsDataClient(credentials=service_account.Credentials.from_service_account_file(KEY))

def f_eq(field, val, neg=False):
    e = FilterExpression(filter=Filter(field_name=field, string_filter=Filter.StringFilter(value=val)))
    return FilterExpression(not_expression=e) if neg else e

def f_and(*exprs):
    exprs = [e for e in exprs if e is not None]
    if not exprs: return None
    if len(exprs) == 1: return exprs[0]
    return FilterExpression(and_group=FilterExpressionList(expressions=exprs))

def kr(extra_cities=()):
    return f_and(f_eq("country", COUNTRY), *[f_eq("city", c, neg=True) for c in list(EXCLUDE_CITIES) + list(extra_cities)])

def run(rng, dims, mets, flt=None, limit=200):
    req = RunReportRequest(property=PROP, date_ranges=[DateRange(start_date=str(rng[0]), end_date=str(rng[1]))],
                           dimensions=[Dimension(name=d) for d in dims], metrics=[Metric(name=m) for m in mets],
                           limit=limit)
    if flt is not None: req.dimension_filter = flt
    r = client.run_report(req)
    return [[v.value for v in row.dimension_values] + [v.value for v in row.metric_values] for row in r.rows]

def total(rng, metric="activeUsers", flt=None):
    if rng[1] < DATA_START: return None
    rows = run(rng, [], [metric], flt)
    return int(rows[0][0]) if rows else 0

def delta(cur, prev):
    if prev is None: return "지난 기간 데이터 없음 (비교 불가)"
    d = cur - prev
    pct = f" ({d/prev*100:+.0f}%)" if prev else ""
    return f"지난 기간 {prev}명 → {'+' if d>=0 else ''}{d}명{pct}"

def md(d): return f"{d.month}/{d.day}"

# events.json 링크 → 행사 제목 매핑
def link_map():
    try:
        d = json.load(open(os.path.join(ROOT, "events.json"), encoding="utf-8"))
    except Exception:
        return {}
    m = {}
    for e in d.get("events", []):
        urls = [e.get("official_url"), e.get("source_url")] + [x.get("url") for x in e.get("evidence") or []]
        for u in urls:
            if u: m.setdefault(u.rstrip("/"), e.get("title_ko"))
    return m

def label_link(url, lm):
    u = url.rstrip("/")
    if u in lm: return lm[u]
    if "google.com/maps" in u:
        return "🗺️ 지도: " + unquote(u.split("query=")[-1])[:20]
    if "blog.naver.com/rownsh00" in u: return "📝 블로그 링크"
    for k, v in lm.items():   # 잘린 URL 대비 앞부분 매칭
        if k.startswith(u) or u.startswith(k): return v
    return u[:60]

def source_bucket(src, med):
    s = src.lower()
    if s == "m.blog.naver.com": return "네이버 블로그 (모바일)"
    if "blog.naver.com" in s: return "네이버 블로그 (PC)"
    if med == "organic" or s in ("google", "naver", "search.naver.com", "m.search.naver.com", "bing", "daum", "yahoo"):
        return "검색"
    if s == "(direct)": return "직접 접속"
    return "기타"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", help="YYYY-MM-DD ~ 어제 범위로 집계 (첫 실행용)")
    ap.add_argument("--today", help="실행일 대체 (테스트용) YYYY-MM-DD")
    a = ap.parse_args()
    today = dt.date.fromisoformat(a.today) if a.today else dt.date.today()
    if a.since:
        start, end = dt.date.fromisoformat(a.since), today - dt.timedelta(days=1)
    else:
        end = today - dt.timedelta(days=today.weekday() + 1)   # 직전 일요일
        start = end - dt.timedelta(days=6)
    n = (end - start).days + 1
    pstart, pend = start - dt.timedelta(days=n), start - dt.timedelta(days=1)
    cur, prev = (start, end), (pstart, pend)
    eff = (max(start, DATA_START), end)

    alt_city, alt_name = ALT_EXCLUDE_CITY
    raw = total(eff)
    real = total(eff, flt=kr())
    real_alt = total(eff, flt=kr([alt_city]))
    prev_real = total((max(pstart, DATA_START), pend), flt=kr()) if pend >= DATA_START else None
    pv = total(eff, "screenPageViews", kr())

    cities = run(eff, ["city", "deviceCategory"], ["activeUsers", "sessions"], kr())
    srcs = run(eff, ["sessionSource", "sessionMedium"], ["sessions"], kr())
    devs = run(eff, ["deviceCategory"], ["activeUsers"], kr())
    clicks = run(eff, ["linkUrl"], ["eventCount"], f_and(kr(), f_eq("eventName", "click")))
    evnames = [r[0] for r in run(eff, ["eventName"], ["eventCount"])]
    custom = [e for e in evnames if e not in STD_EVENTS]

    L = []
    L.append(f"# 📊 사이트 주간 리포트 · {md(start)}~{md(end)}")
    notes = []
    if start < DATA_START: notes.append(f"GA 수집은 {md(DATA_START)}부터라 {md(eff[0])}~{md(end)}만 집계됐어요")
    if eff[0] < SELF_EXCLUDE_START: notes.append(f"{md(SELF_EXCLUDE_START)} 전에는 우리 접속 제외 설정이 없어서 테스트 방문이 섞여 있을 수 있어요")
    if notes: L.append("<sub>" + " · ".join(notes) + "</sub>")
    L.append("")

    # 1
    L.append("## 1. 👥 실제 방문자 (추정)")
    L.append(f"**{real}명** · 페이지 조회 {pv}회  ")
    L.append(f"{delta(real, prev_real)}  ")
    L.append(f"<sub>GA 원본 {raw}명 (해외·데이터센터 접속 제외 전)"
             + (f" · 제외 도시: {', '.join(EXCLUDE_CITIES)}" if EXCLUDE_CITIES else "") + "</sub>  ")
    if alt_city not in EXCLUDE_CITIES:
        L.append(f"<sub>{alt_name} 제외 시: {real_alt}명</sub>")
    L.append("")
    L.append("국내 도시별 (방문자 / 세션)")
    agg = {}
    for c, dev, u, s in cities:
        x = agg.setdefault(c, {"u": 0, "s": 0, "d": set()})
        x["u"] += int(u); x["s"] += int(s); x["d"].add("PC" if dev == "desktop" else "모바일" if dev == "mobile" else dev)
    for c, x in sorted(agg.items(), key=lambda kv: -kv[1]["s"]):
        L.append(f"- {c}: {x['u']}명 / {x['s']}세션 ({'·'.join(sorted(x['d']))})")
    if not agg: L.append("- (없음)")
    L.append("")

    # 2
    L.append("## 2. 🚪 유입 경로 (세션)")
    order = ["네이버 블로그 (PC)", "네이버 블로그 (모바일)", "검색", "직접 접속", "기타"]
    b = {k: 0 for k in order}
    for src, med, s in srcs: b[source_bucket(src, med)] += int(s)
    tot_s = sum(b.values()) or 1
    for k in order:
        L.append(f"- {k}: {b[k]} ({b[k]/tot_s*100:.0f}%)")
    L.append("")

    # 3
    L.append("## 3. 🔥 많이 클릭된 항목 TOP 3")
    lm = link_map()
    cc = {}
    for url, cnt in clicks:
        k = label_link(url, lm); cc[k] = cc.get(k, 0) + int(cnt)
    top = sorted(cc.items(), key=lambda kv: -kv[1])[:3]
    for i, (k, v) in enumerate(top, 1): L.append(f"{i}. {k} · {v}회")
    if not top: L.append("- (클릭 없음)")
    L.append("<sub>공식 사이트·출처·지도 버튼의 외부 링크 클릭 기준이에요</sub>  ")
    if custom:
        L.append(f"<sub>커스텀 이벤트: {', '.join(custom)}</sub>")
    else:
        L.append("ℹ️ 탭(카테고리) 선택과 자세히 보기 열람은 아직 GA에 기록되지 않아요.")
    L.append("")

    # 4
    L.append("## 4. 📱 PC / 모바일")
    dd = {r[0]: int(r[1]) for r in devs}
    dsum = sum(dd.values()) or 1
    name = {"desktop": "PC", "mobile": "모바일", "tablet": "태블릿"}
    L.append(" · ".join(f"{name.get(k,k)} {v}명 ({v/dsum*100:.0f}%)" for k, v in sorted(dd.items(), key=lambda kv: -kv[1])) or "(없음)")
    L.append("")

    # 5
    L.append("## 5. 📝 메모용 포인트")
    pts = []
    if prev_real is not None and prev_real:
        pts.append(f"방문자 {prev_real}→{real}명 ({(real-prev_real)/prev_real*100:+.0f}%)")
    else:
        pts.append(f"비교 기간 데이터 없음, 이번 기간 방문자 {real}명")
    blog = b["네이버 블로그 (PC)"] + b["네이버 블로그 (모바일)"]
    pts.append(f"블로그 경유 세션 {blog}/{sum(b.values())} ({blog/tot_s*100:.0f}%), 검색 유입 {b['검색']}")
    if top: pts.append(f"클릭 1위: {top[0][0]} ({top[0][1]}회)")
    if dd: pts.append(f"모바일 비중 {dd.get('mobile',0)/dsum*100:.0f}%")
    if raw is not None and real is not None and raw - real > 0:
        pts.append(f"해외·미상 접속 {raw-real}명 제외됨")
    if alt_city not in EXCLUDE_CITIES and real_alt is not None:
        pts.append(f"{alt_name}({alt_city})가 운영자라면 실제 방문자 {real_alt}명")
    for p in pts: L.append(f"- {p}")
    L.append("")
    L.append(f"<sub>생성 {dt.datetime.now().strftime('%Y-%m-%d %H:%M')} (KST) · 기준: activeUsers, 국가=대한민국</sub>")

    out = "\n".join(L) + "\n"
    os.makedirs(os.path.join(ROOT, "reports"), exist_ok=True)
    path = os.path.join(ROOT, "reports", f"ga_{today.isoformat()}.md")
    open(path, "w", encoding="utf-8").write(out)
    sys.stdout.write(out)
    print(f"\n[saved] {path}", file=sys.stderr)

if __name__ == "__main__":
    main()
