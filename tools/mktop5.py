"""지난주 많이 본 행사 TOP 5 (지역별 상위 5, 파일엔 전체 상위 15) → data/top5.json (빌드·정기 업데이트 때 실행).
기준: GA4 이벤트 open_detail('자세히' 열람)의 customEvent:item(=title_ko), 최근 7일(어제까지), 메인 사이트(/japan-events/)만,
운영자 본인 도시(Cheongju-si)·자동화 브라우저 제외. 숫자를 지어내지 않음: GA 실패 시 기존 파일 유지, 데이터 없으면 빈 목록.
실행: /workspace/gavenv/bin/python tools/mktop5.py   (키 파일 내용은 출력·커밋하지 않음)"""
import json, datetime as dt, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
KEY = "/home/box/.config/quietjapan/ga-key.json"  # 읽기 전용, 출력 금지
PROP = "properties/559074434"
SELF_CITIES = ["Cheongju-si"]
def ga_rows(start, end):
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Metric, Dimension, FilterExpression, FilterExpressionList, Filter
    from google.oauth2 import service_account
    c = BetaAnalyticsDataClient(credentials=service_account.Credentials.from_service_account_file(KEY), transport="rest")
    eq = lambda f, v: FilterExpression(filter=Filter(field_name=f, string_filter=Filter.StringFilter(value=v)))
    flt = FilterExpression(and_group=FilterExpressionList(expressions=[
        eq("eventName", "open_detail"),
        FilterExpression(filter=Filter(field_name="pagePath", string_filter=Filter.StringFilter(value="/japan-events/", match_type=Filter.StringFilter.MatchType.BEGINS_WITH))),
        *[FilterExpression(not_expression=eq("city", x)) for x in SELF_CITIES]]))
    r = c.run_report(RunReportRequest(property=PROP, date_ranges=[DateRange(start_date=str(start), end_date=str(end))],
        dimensions=[Dimension(name="customEvent:item")], metrics=[Metric(name="eventCount"), Metric(name="totalUsers")],
        dimension_filter=flt, limit=200))
    return [(x.dimension_values[0].value, int(x.metric_values[0].value), int(x.metric_values[1].value)) for x in r.rows]
def main():
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
    end = today - dt.timedelta(days=1); start = end - dt.timedelta(days=6)
    out = ROOT / "data" / "top5.json"
    try: rows = ga_rows(start, end)
    except Exception as x:
        print("top5: GA 조회 실패 — 기존 파일 유지", type(x).__name__); return
    ev = json.loads((ROOT / "events.json").read_text())["events"]
    by = {}
    for e in ev: by.setdefault(e["title_ko"], e)
    items = []
    for title, n, u in sorted(rows, key=lambda r: (-r[1], -r[2])):
        e = by.get(title)
        if not e or title in ("(not set)", ""): continue           # 이미 끝나 빠진 행사·빈 값은 제외
        if e.get("end") and e["end"] < str(today): continue
        items.append({"match": e.get("id") or title, "title_ko": title, "region": e.get("region"), "opens": n, "users": u})
        if len(items) == 15: break   # 화면은 지역별 상위 5개
    data = {"generated": str(today), "range": [str(start), str(end)], "metric": "open_detail(자세히 열람) 이벤트 수, 메인 사이트·본인 접속 제외", "items": items}
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print("top5", data["range"], [(i["title_ko"][:18], i["opens"]) for i in items])
if __name__ == "__main__": main()
