"""원본 대표 이미지·갤러리 이미지 자체 보관(self-host).
공식 사이트 핫링크가 깨질 때(점검·504 등)를 대비해 img/<sha1>.webp 로 저장하고 events.json 에 로컬 경로를 기록해요.
- 대표 이미지(image_hd 또는 thumbnail) → e["image_local"] (가로·세로 최대 1600px, WebP q90, 업스케일 없음)
- 갤러리(full 또는 img) → g["img_local"] (최대 1600px, WebP q88)
규칙: 이미 있는 파일은 다시 받지 않음(증분). 지금 안 열려도 기존 파일·필드는 지우지 않음. 실패한 건 기존 동작(공식 URL→gfb 대체본) 그대로.
프런트(app.js)는 로컬 사본을 먼저 쓰고, 오류 시 공식 URL → gfb 순으로 대체해요."""
import json, hashlib, io, requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent; OUT=ROOT/"img"; OUT.mkdir(exist_ok=True)
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36"}
HD=(1600,90); GAL=(1600,88)  # 업스케일 안 함(원본이 더 작으면 원본 크기 그대로)
def name(u): return hashlib.sha1(u.encode()).hexdigest()[:16]+".webp"
def make(u,ref,mx,q):
    p=OUT/name(u)
    if p.exists(): return True,False
    try:
        r=requests.get(u,headers={**UA,"Referer":ref or ""},timeout=40,allow_redirects=True); r.raise_for_status()
        im=Image.open(io.BytesIO(r.content)); im.load(); im=im.convert("RGBA" if im.mode in("RGBA","LA","P") else "RGB")
        im.thumbnail((mx,mx),Image.LANCZOS); tmp=p.with_suffix(".tmp"); im.save(tmp,"WEBP",quality=q,method=6); tmp.rename(p); return True,True
    except Exception as x: return False,str(x)[:80]
def main():
    d=json.loads((ROOT/"events.json").read_text()); jobs=[]
    for e in d["events"]:
        ref=e.get("thumbnail_source") or e.get("official_url")
        hd=e.get("image_hd") or e.get("thumbnail")
        if hd: jobs.append((e,None,hd,ref)+HD)
        for g in e.get("gallery") or []:
            u=g.get("full") or g.get("img")
            if u: jobs.append((e,g,u,g.get("source") or e.get("gallery_source") or ref)+GAL)
    uniq={}
    for j in jobs: uniq.setdefault(j[2],j[2:])  # 같은 URL은 한 번만(동시 저장 충돌 방지)
    with ThreadPoolExecutor(8) as ex: done=dict(zip(uniq,ex.map(lambda a:make(*a),uniq.values())))
    res=[done[j[2]] for j in jobs]
    new=fail=0; fails=[]
    for (e,g,u,*_),(ok,info) in zip(jobs,res):
        tgt,key=(g,"img_local") if g else (e,"image_local")
        if ok: tgt[key]="img/"+name(u); new+=info is True
        else: fail+=1; fails.append((e["title_ko"],u,info))  # 기존 필드는 유지
    (ROOT/"events.json").write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n")
    print(f"images {len(jobs)} new {new} fail {fail}")
    for t,u,i in fails: print("FAIL(기존 동작 유지)",t,u,i)
if __name__=="__main__": main()
