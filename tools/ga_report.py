import sys
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Metric, Dimension
from google.oauth2 import service_account
KEY="/home/box/.config/quietjapan/ga-key.json"; PROP="properties/559074434"
days=sys.argv[1] if len(sys.argv)>1 else "7"
c=BetaAnalyticsDataClient(credentials=service_account.Credentials.from_service_account_file(KEY))
def run(dims,mets,limit=10):
    r=c.run_report(RunReportRequest(property=PROP,date_ranges=[DateRange(start_date=f"{days}daysAgo",end_date="today")],dimensions=[Dimension(name=d) for d in dims],metrics=[Metric(name=m) for m in mets],limit=limit))
    return [[v.value for v in row.dimension_values]+[v.value for v in row.metric_values] for row in r.rows]
print("TOTAL",run([],["activeUsers","sessions","screenPageViews"]))
print("DAILY",run(["date"],["activeUsers","screenPageViews"],40))
print("DEVICE",run(["deviceCategory"],["activeUsers"]))
print("SOURCE",run(["sessionSource"],["sessions"]))
print("COUNTRY",run(["country"],["activeUsers"]))
