"""공통 유틸: 페이지 가져오기(캐시), 텍스트 정규화, 일본어 날짜 파싱."""
import hashlib, json, re, unicodedata, datetime as dt
from pathlib import Path
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / ".cache"; CACHE.mkdir(exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
_pw = None

def norm(s):
    s = unicodedata.normalize("NFKC", s or "")
    s = s.replace("～", "〜").replace("~", "〜")
    return re.sub(r"\s+", " ", s).strip()

def _render(url):
    global _pw
    from playwright.sync_api import sync_playwright
    if _pw is None:
        p = sync_playwright().start(); _pw = (p, p.chromium.launch())
    pg = _pw[1].new_page(user_agent=UA)
    try:
        pg.goto(url, timeout=45000, wait_until="networkidle")
    except Exception:
        pass
    html = pg.content(); pg.close(); return html

def fetch(url, fresh=False):
    """returns dict(html, text, final_url, ok). fresh=True ignores cache."""
    f = CACHE / (hashlib.sha1(url.encode()).hexdigest() + ".json")
    if f.exists() and not fresh:
        return json.loads(f.read_text())
    html, final, ok = "", url, False
    try:
        r = requests.get(url, headers={"User-Agent": UA, "Accept-Language": "ja"}, timeout=25)
        r.encoding = r.apparent_encoding if r.encoding in (None, "ISO-8859-1") else r.encoding
        html, final, ok = r.text, r.url, r.ok
    except Exception:
        pass
    text = page_text(html)
    if not ok or len(text) < 400 or not parse_dates(text):
        try:
            h2 = _render(url); t2 = page_text(h2)
            if len(t2) > len(text): html, text, ok = h2, t2, True
        except Exception:
            pass
    d = {"html": html, "text": text, "final_url": final, "ok": ok}
    f.write_text(json.dumps(d, ensure_ascii=False)); return d

def page_text(html):
    if not html: return ""
    s = BeautifulSoup(html, "html.parser")
    for t in s(["script", "style", "noscript"]): t.decompose()
    return norm(s.get_text(" "))

def og_image(html, base):
    if not html: return ""
    s = BeautifulSoup(html, "html.parser")
    for k in ("og:image", "og:image:url", "twitter:image"):
        m = s.find("meta", attrs={"property": k}) or s.find("meta", attrs={"name": k})
        if m and m.get("content", "").strip():
            return urljoin(base, m["content"].strip())
    return ""

ADDR = re.compile(r"東京都[^\s、。,/]{1,6}?[区市](?:[^\s、。,/\d]{1,12}?)\d+(?:\s?[-‐−ー–丁目番地号の]\s?\d*)*(?:丁目|番地?|号)?")
def address(text):
    t = (text or "").replace("\u200b", "")
    for m in ADDR.finditer(t):
        ctx = t[max(0, m.start() - 25):m.end() + 15]
        if any(k in ctx for k in ("電話", "TEL", "Tel", "事務局", "運営会社", "本社", "お問い合わせ", "お問合せ")):
            continue  # 주최사·사무국 주소는 행사장이 아닐 수 있어서 제외
        return m.group(0).strip(" -‐−ー")
    return ""

DATE_RE = re.compile(
    r"(?:(?P<y>20\d\d)\s*[年./-]\s*)?(?P<m>1[0-2]|0?[1-9])\s*(?:月|/|\.)\s*(?P<d>3[01]|[12]\d|0?[1-9])(?!\d)\s*日?"
    r"(?:\s*[((][月火水木金土日祝・]+[))])?"
    r"(?:\s*[〜\-ー–]\s*(?P<d2>3[01]|[12]\d|0?[1-9])\s*日)?")

def date_tokens(text, default_year=2026):
    """[(start_pos, end_pos, {iso dates}), ...]  '10月1日〜8日' gives two tokens. Year carries forward."""
    out, year = [], default_year
    t = norm(text)
    for m in DATE_RE.finditer(t):
        if m.group("y"): year = int(m.group("y"))
        def mk(mo, dd):
            s = set()
            for y in ({year} if m.group("y") else {year, year + 1}):
                try: s.add(dt.date(y, mo, dd).isoformat())
                except ValueError: pass
            return s
        mo = int(m.group("m"))
        if m.group("d2"):
            out.append((m.start(), m.start("d2") - 1, mk(mo, int(m.group("d")))))
            out.append((m.start("d2"), m.end(), mk(mo, int(m.group("d2")))))
        else:
            out.append((m.start(), m.end(), mk(mo, int(m.group("d")))))
    # Peatix 등 영문 표기: "Nov 7, 2026"
    for m in EN_DATE_RE.finditer(t):
        try: out.append((m.start(), m.end(), {dt.date(int(m.group(3)), EN_MON[m.group(1)[:3].lower()], int(m.group(2))).isoformat()}))
        except ValueError: pass
    out.sort(key=lambda x: x[0])
    return out

EN_MON = {k: i + 1 for i, k in enumerate("jan feb mar apr may jun jul aug sep oct nov dec".split())}
EN_DATE_RE = re.compile(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2}), (20\d\d)\b")

def parse_dates(text, default_year=2026):
    return set().union(*[s for _, _, s in date_tokens(text, default_year)]) if text else set()

RANGE_CH = "〜-ー–―→至"
MONTH_HDR = re.compile(r"(20\d\d)年(1[0-2]|[1-9])月の予定")
def expand_month_headers(t):
    """'2026年10月の予定 18日(日) …' 처럼 달력형 일정표에서 '日'만 있는 날짜에 앞의 달을 붙임."""
    out, last, mo = [], 0, None
    for m in MONTH_HDR.finditer(t):
        out.append((m.start(), m.group(1), m.group(2)))
    if not out: return t
    res, pos = [], 0
    for i, (st, y, mo) in enumerate(out):
        nxt = out[i + 1][0] if i + 1 < len(out) else len(t)
        res.append(t[pos:st]); seg = t[st:nxt]
        seg = re.sub(r"(?<![月\d/.])(3[01]|[12]\d|[1-9])日", lambda m: f"{y}年{mo}月{m.group(1)}日", seg)
        res.append(seg); pos = nxt
    return "".join(res)

WEEK_RE = re.compile(r"(20\d\d)年\s*(1[0-2]|[1-9])月\s*第\s*([1-5])\s*週")
def week_start(quote):
    """'発売時期 2026年10月 第5週' → 그 주의 첫날(7*(n-1)+1일)."""
    m = WEEK_RE.search(norm(quote))
    if not m: return None
    y, mo, n = map(int, m.groups())
    try: return dt.date(y, mo, 7 * (n - 1) + 1).isoformat()
    except ValueError: return None

def derivable(quote, start, end):
    """시작일이 인용문에 있어야 하고, 종료일이 다르면 '시작일 〜 종료일' 이 바로 붙은 범위 표현이어야 통과
    (다른 도시 일정의 날짜가 섞여 우연히 통과하는 것을 막음)."""
    if not start: return False, "시작일 없음(근거로 확정 불가)"
    if not end and week_start(quote) == start: return True, ""   # 가챠 '○월 제N주' 발매
    t = expand_month_headers(norm(quote)); toks = date_tokens(t)
    if not any(start in s for _, _, s in toks): return False, f"인용문에서 시작일 {start} 확인 안 됨"
    if not end or end == start: return True, ""
    for (a1, e1, s1), (a2, e2, s2) in zip(toks, toks[1:]):
        gap = t[e1:a2]
        if start in s1 and end in s2 and len(gap) <= 20 and any(c in gap for c in RANGE_CH):
            return True, ""
    return False, f"인용문에 '{start} 〜 {end}' 범위 표현이 없음"

def host(u): return (urlparse(u or "").hostname or "").removeprefix("www.")
