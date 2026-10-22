"""카드용 작은 WebP 썸네일 생성 (원본 thumbnail은 자세히 보기/갤러리용으로 그대로 둠).
thumbs/<sha1>.webp (가로 최대 480px), events.json의 thumb_small에 상대경로 기록. 이미 있으면 건너뜀. 실패해도 기존 thumb_small·파일은 지우지 않음."""
import json, hashlib, io, sys, requests
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent; OUT=ROOT/"thumbs"; OUT.mkdir(exist_ok=True)
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36"}
d=json.loads((ROOT/"events.json").read_text()); n=fail=0; used=set()
for e in d["events"]:
    u=e.get("thumbnail")
    if not u: e.pop("thumb_small",None); continue
    name=hashlib.sha1(u.encode()).hexdigest()[:16]+".webp"; p=OUT/name; used.add(name)
    if not p.exists():
        try:
            r=requests.get(u,headers={**UA,"Referer":e.get("thumbnail_source") or e.get("official_url") or ""},timeout=30); r.raise_for_status()
            im=Image.open(io.BytesIO(r.content)); im=im.convert("RGBA" if im.mode in("RGBA","LA","P") else "RGB")
            if im.width>480: im=im.resize((480,round(im.height*480/im.width)),Image.LANCZOS)
            im.save(p,"WEBP",quality=78,method=6); n+=1
        except Exception as x: print("FAIL(기존 thumb_small 유지)",e["title_ko"],u,x); fail+=1; continue
    e["thumb_small"]="thumbs/"+name
# 기존 썸네일 파일은 지우지 않아요(원본 점검·pending 후 원복 때 필요).
(ROOT/"events.json").write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n"); print("new",n,"fail",fail)
