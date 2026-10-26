"""행사별 'added'(사이트에 처음 올라간 날, YYYY-MM-DD, KST) 필드 채우기.
- 정기 업데이트(월/목)에서 새 항목을 넣을 때 added를 직접 안 넣어도, build.sh가 이 스크립트를 돌려 비어 있는 항목에 오늘 날짜(KST)를 넣어요.
- 이미 있는 added는 절대 바꾸지 않아요.  --backfill: git 기록(이 저장소 + 있으면 ../japan-events 읽기 전용)에서 처음 등장한 커밋 날짜로 채움.
- 프런트(app.js)는 last_updated와 같은 날 added된 항목을 '🆕 이번 업데이트에 추가'로 보여줘요."""
import json, subprocess, sys, datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(Path(__file__).parent))
def b36(n):
    s="0123456789abcdefghijklmnopqrstuvwxyz";r=""
    while True:
        n,m=divmod(n,36);r=s[m]+r
        if not n:return r
def skey(e):return f"s:{e['series']}" if e.get("series") else f"a:{e.get('category')}|{e.get('title_ko')}|{e.get('official_url') or ''}"
def hid(k):
    h=2166136261
    for c in k: h^=ord(c); h=(h*16777619)&0xFFFFFFFF
    return b36(h)
def key(e):return (e.get("id") or hid(skey(e)))+"|"+(e.get("start") or "")
def first_seen(repo):
    out={}
    try: log=subprocess.run(["git","-C",str(repo),"log","--reverse","--format=%h %ad","--date=short","--","events.json"],capture_output=True,text=True,check=True).stdout.split("\n")
    except Exception: return out
    for ln in filter(None,log):
        h,dt=ln.split()
        try: d=json.loads(subprocess.run(["git","-C",str(repo),"show",f"{h}:events.json"],capture_output=True,text=True,check=True).stdout)
        except Exception: continue
        for e in (d.get("events",d) if isinstance(d,dict) else d):
            if isinstance(e,dict): out.setdefault(key(e),dt)
    return out
def main():
    p=ROOT/"events.json";d=json.loads(p.read_text());today=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d")
    seen={}
    if "--backfill" in sys.argv:
        for repo in (ROOT, ROOT.parent/"japan-events"):
            for k,v in first_seen(repo).items():
                if k not in seen or v<seen[k]: seen[k]=v
    n=0
    for e in d["events"]:
        if not e.get("added"): e["added"]=seen.get(key(e)) or today; n+=1
    if n: p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n")
    print("added filled",n)
if __name__=="__main__": main()
