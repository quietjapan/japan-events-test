#!/usr/bin/env python3
"""다녀온 곳 항목 추가: data/visited.json 에 한 건을 검증 후 추가해요.
예) python3 tools/add_visited.py --date 2026-11-09 --region tokyo --name "MAPPA EXPO" --comment "생각보다 넓었고..." [--name-ja ..] [--event-id 10846mo] [--rating 5] [--verdict "한 줄 평"] [--photo visited/a.webp ...] [--blog https://blog.naver.com/rownsh00/...]
   또는 python3 tools/add_visited.py --json '{"date":"2026-11-09","region":"tokyo","name_ko":"...","comment":"..."}'
   --dry-run: 저장 없이 검증만, --remove-id <id>: 항목 삭제, --list: 목록"""
import argparse,json,re,sys,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;F=ROOT/"data/visited.json"
REG={"tokyo","osaka","fukuoka"};FIELDS={"id","date","name_ko","name_ja","region","event_id","comment","rating","verdict","photos","blog_url"}
def load():return json.loads(F.read_text("utf-8")) if F.exists() else {"entries":[]}
def save(d):F.write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n","utf-8")
def validate(e):
    err=[];bad=set(e)-FIELDS
    if bad:err.append(f"모르는 필드: {sorted(bad)}")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}",str(e.get("date",""))):err.append("date는 YYYY-MM-DD")
    if not str(e.get("name_ko","")).strip():err.append("name_ko 필수")
    if e.get("region") not in REG:err.append("region은 tokyo/osaka/fukuoka")
    if not str(e.get("comment","")).strip():err.append("comment(준호의 말 그대로) 필수")
    if "rating" in e and not (isinstance(e["rating"],int) and 1<=e["rating"]<=5):err.append("rating은 1~5 정수")
    if e.get("event_id"):
        if not (ROOT/"i"/e["event_id"]).is_dir():err.append(f"event_id {e['event_id']}에 해당하는 i/<id>/ 페이지가 없어요")
    for p in e.get("photos",[]) or []:
        if p.startswith("http"):err.append(f"사진은 준호 본인 사진만, repo 안 경로로: {p}")
        elif not (ROOT/p).is_file():err.append(f"사진 파일 없음: {p}")
    if e.get("blog_url") and not str(e["blog_url"]).startswith("https://"):err.append("blog_url은 https://")
    return err
def main():
    a=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("--json");a.add_argument("--date");a.add_argument("--region");a.add_argument("--name");a.add_argument("--name-ja")
    a.add_argument("--event-id");a.add_argument("--comment");a.add_argument("--rating",type=int);a.add_argument("--verdict")
    a.add_argument("--photo",action="append");a.add_argument("--blog");a.add_argument("--dry-run",action="store_true")
    a.add_argument("--remove-id");a.add_argument("--list",action="store_true")
    o=a.parse_args();d=load()
    if o.list:
        for e in d["entries"]:print(e["id"],e["date"],e["region"],e["name_ko"])
        return
    if o.remove_id:
        n=len(d["entries"]);d["entries"]=[e for e in d["entries"] if e.get("id")!=o.remove_id]
        if len(d["entries"])==n:sys.exit("그런 id 없음")
        save(d);print("삭제:",o.remove_id);return
    e=json.loads(o.json) if o.json else {}
    for k,v in [("date",o.date),("region",o.region),("name_ko",o.name),("name_ja",o.name_ja),("event_id",o.event_id),("comment",o.comment),("rating",o.rating),("verdict",o.verdict),("photos",o.photo),("blog_url",o.blog)]:
        if v not in (None,[],""):e[k]=v
    if isinstance(e.get("comment"),str):e["comment"]=e["comment"].replace("\\n","\n")
    e={k:v for k,v in e.items() if v not in (None,"",[])}
    e.setdefault("id",e.get("date","x").replace("-","")+"-"+hashlib.md5(e.get("name_ko","").encode()).hexdigest()[:6])
    err=validate(e)
    if any(x.get("id")==e["id"] for x in d["entries"]):err.append(f"같은 id가 이미 있어요: {e['id']}")
    if err:sys.exit("❌ "+"\n❌ ".join(err))
    print(json.dumps(e,ensure_ascii=False,indent=2))
    if o.dry_run:print("(dry-run: 저장 안 함)");return
    d["entries"].append(e);d["entries"].sort(key=lambda x:x["date"],reverse=True);save(d);print("✅ 추가됨 →",F.relative_to(ROOT))
if __name__=="__main__":main()
