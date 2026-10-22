"""자세히 보기 이미지 대체본(fallback) 생성.
원본(image_hd·thumbnail 대표 이미지, gallery img)은 그대로 쓰고, 원본이 깨질 때(점검·리다이렉트 등) 쓸 작은 WebP 사본을 gfb/<sha1>.webp에 저장.
events.json: 대표 이미지 → e["image_fb"], 갤러리 → g["img_fb"].
규칙: 이미 있는 사본은 다시 받지 않음. 원본이 지금 안 열려도 기존 사본·필드는 절대 지우지 않음(pending 처리·원복 때도 유지).
대상: 자세히 보기가 있는 항목(SHOP 카테고리 또는 갤러리 보유)."""
import json, hashlib, io, sys, requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent; OUT=ROOT/"gfb"; OUT.mkdir(exist_ok=True)
SHOP={"팝업스토어","콜라보카페","쿠지","가챠","잡지 부록"}
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36"}
HD_MAX,HD_Q,G_MAX,G_Q=1000,72,720,68
def name(u): return hashlib.sha1(u.encode()).hexdigest()[:16]+".webp"
def make(u,ref,mx,q):
    p=OUT/name(u)
    if p.exists(): return True,False
    try:
        r=requests.get(u,headers={**UA,"Referer":ref or ""},timeout=30,allow_redirects=True); r.raise_for_status()
        if "image" not in r.headers.get("content-type","") and not r.content[:4] in (b"\x89PNG",b"RIFF") and r.content[:2]!=b"\xff\xd8": raise ValueError("not image ("+r.headers.get("content-type","")+")")
        im=Image.open(io.BytesIO(r.content)); im.load(); im=im.convert("RGBA" if im.mode in("RGBA","LA","P") else "RGB")
        im.thumbnail((mx,mx),Image.LANCZOS); im.save(p,"WEBP",quality=q,method=6); return True,True
    except Exception as x: return False,str(x)[:80]
def main():
    d=json.loads((ROOT/"events.json").read_text()); jobs=[]
    for e in d["events"]:
        if not(e.get("category") in SHOP or e.get("gallery")): continue
        ref=e.get("thumbnail_source") or e.get("official_url")
        hd=e.get("image_hd") or e.get("thumbnail")
        if hd: jobs.append((e,None,hd,ref,HD_MAX,HD_Q))
        for g in e.get("gallery") or []:
            if g.get("img"): jobs.append((e,g,g["img"],g.get("source") or e.get("gallery_source") or ref,G_MAX,G_Q))
    with ThreadPoolExecutor(8) as ex: res=list(ex.map(lambda j:make(*j[2:]),jobs))
    new=fail=0; pend=[]
    for (e,g,u,*_),(ok,info) in zip(jobs,res):
        tgt,key=(g,"img_fb") if g else (e,"image_fb")
        if ok: tgt[key]="gfb/"+name(u); new+=info is True
        else:
            fail+=1
            if not g and not tgt.get(key) and e.get("thumb_small") and (ROOT/e["thumb_small"]).exists(): tgt[key]=e["thumb_small"]  # 임시: 카드용 480px 사본
            if not (tgt.get(key) and (ROOT/tgt[key]).exists()): pend.append((e["title_ko"],u,info))
    (ROOT/"events.json").write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n")
    print(f"images {len(jobs)} new {new} fail {fail} without_copy {len(pend)}")
    for t,u,i in pend: print("PENDING",t,u,i)
if __name__=="__main__": main()
