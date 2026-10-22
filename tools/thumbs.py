"""규칙: 쿠지·가챠 = 그 상품 페이지의 상품 이미지만(없으면 텍스트). 그 외 카테고리 = 실제 이미지면 출처 무관(정리 사이트 OK).
쿠지·가챠 썸네일: 공식 상품 페이지의 '그 상품' 이미지로 교체 (일반 로고/OGP 대신).
1kuji.com: assets.1kuji.com/uploads/product/... 첫 이미지, gashapon.jp: 상품 이미지(og:image가 상품이면 그대로)."""
import json, re, sys, requests
from urllib.parse import urljoin
from common import ROOT, UA, og_image
GENERIC = re.compile(r"(1kuji\.com/ogp|/images/common/|/img/common/|logo|noimage|xxxx|ogp_portal)", re.I)

def product_image(url):
    try: h = requests.get(url, headers={"User-Agent": UA}, timeout=25).text
    except Exception: return ""
    if "1kuji.com" in url:
        m = re.search(r'https://assets\.1kuji\.com/uploads/product/[^"\'\s)]+\.(?:webp|jpe?g|png)', h)
        return m.group(0) if m else ""
    if "gashapon.jp" in url:
        og = og_image(h, url)
        if og and not GENERIC.search(og): return og
        m = re.search(r'(?:src|data-src)="([^"]*(?:/products/images|item_img|/img/item)[^"]*\.(?:jpe?g|png|webp))"', h)
        return urljoin(url, m.group(1)) if m else ""
    return ""

def og_any(e):
    """기본 규칙: 실제 이미지(공식 og:image) 우선, 없을 때만 텍스트 썸네일."""
    for u in [e.get("official_url"), e.get("source_url")]:
        if not u: continue
        try: h = requests.get(u, headers={"User-Agent": UA}, timeout=10).text
        except Exception: continue
        og = og_image(h, u)
        if og and not GENERIC.search(og) and "xxxx" not in og: return og, u
    return "", ""

def run(files=("events.json", "pending.json")):
    for fn in files:
        f = ROOT / fn; d = json.loads(f.read_text()); n = 0
        for e in d["events"]:
            if e.get("category") not in ("쿠지", "가챠"):
                if e.get("thumbnail") and not GENERIC.search(e["thumbnail"]): continue
                img, src = og_any(e)
                if img: e["thumbnail"], e["thumbnail_source"] = img, src; n += 1
                else: e.pop("thumbnail", None); e.pop("thumbnail_source", None)
                continue
            # 소유자 규칙: 쿠지·가챠는 '그 상품' 자체 상품 페이지 이미지만 허용. 같은 캐릭터/작품의 다른 이미지 금지 → 없으면 텍스트 썸네일.
            if not e.get("official_url"):
                if e.get("thumb_kind") != "product": e.pop("thumbnail", None); e.pop("thumbnail_source", None)
                continue
            if e.get("thumbnail") and not GENERIC.search(e["thumbnail"]) and e.get("thumb_kind") == "product": continue
            img = product_image(e["official_url"])
            if img:
                e["thumbnail"], e["thumbnail_source"], e["thumb_kind"] = img, e["official_url"], "product"; n += 1
            else:   # 상품 이미지 못 찾으면 기존 이미지(로고·작품 일반 이미지 포함)는 모두 제거
                for k in ("thumbnail", "thumbnail_source", "thumb_kind"): e.pop(k, None)
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n"); print(fn, "product thumbs set:", n)

if __name__ == "__main__": run()
