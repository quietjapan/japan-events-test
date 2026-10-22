#!/usr/bin/env python3
"""행사 카드 이미지 생성: python3 tools/card.py "<title_ko 일부>"  → cards/<slug>.png (1080x1350)"""
import json,sys,re,html,urllib.request,base64,pathlib
ROOT=pathlib.Path(__file__).resolve().parent.parent
d=json.load(open(ROOT/'events.json'));d=d.get('events',d) if isinstance(d,dict) else d
q=sys.argv[1];e=next(x for x in d if q in x['title_ko'])
def fmt(s):return s.replace('-','. ') if s else ''
period=fmt(e.get('start'))+(' ~ '+fmt(e['end']) if e.get('end') else ' ~')
img=''
if e.get('thumbnail'):
    try:
        r=urllib.request.urlopen(urllib.request.Request(e['thumbnail'],headers={'User-Agent':'Mozilla/5.0'}),timeout=20)
        img='data:image/jpeg;base64,'+base64.b64encode(r.read()).decode()
    except Exception as ex:print('img fail',ex)
src=re.sub(r'^https?://','',e.get('thumbnail_source') or e.get('official_url','')).split('/')[0]
h=lambda s:html.escape(s or '')
page=f'''<html><head><meta charset="utf-8"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"><style>
body{{margin:0;width:1080px;height:1350px;font-family:Pretendard,sans-serif;background:#1b1b1b;overflow:hidden}}
.f{{position:absolute;inset:24px;border-radius:36px;overflow:hidden;border:6px solid #f29b72;background:#222 url('{img}') center/cover}}
.tag{{position:absolute;top:40px;left:40px;background:#000a;color:#fff;font-size:30px;font-weight:700;padding:10px 26px;border-radius:999px}}
.src{{position:absolute;top:48px;right:44px;color:#fffc;font-size:22px;text-shadow:0 1px 4px #000}}
.box{{position:absolute;left:40px;right:40px;bottom:40px}}
.t{{display:inline-block;background:#fbe3c8;color:#2a1a10;font-size:60px;font-weight:900;padding:14px 34px;border-radius:24px;border:5px solid #2a1a10;box-shadow:6px 6px 0 #2a1a10;margin-left:-6px;margin-bottom:-26px;position:relative;z-index:2;max-width:900px}}
.p{{background:#ffffffee;border-radius:28px;padding:56px 40px 32px;font-size:31px;line-height:1.55;color:#222}}
.r{{display:flex;justify-content:space-between;margin-top:18px;font-size:29px;font-weight:600;color:#333}}
.r div{{margin-top:8px}}
</style></head><body><div class="f"><div class="tag">#{h(e['category'])} · {h(e.get('area'))}</div><div class="src">이미지 출처: {h(src)}</div>
<div class="box"><div class="t">{h(re.sub(r'\s*\(.*?\)','',e['title_ko']))}</div><div class="p">{h(e.get('summary_ko'))}
<div class="r"><div><div>📍 {h(e.get('venue'))}</div><div>🗓️ {period}</div></div><div style="align-self:flex-end">🏷️ {h(e.get('price'))}</div></div>
</div></div></div></body></html>'''
slug=re.sub(r'\W+','-',e.get('title_ja') or q).strip('-')[:40] or 'card'
tmp=ROOT/'cards'/'_tmp.html';tmp.write_text(page,encoding='utf-8')
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1080,'height':1350})
    pg.goto(tmp.as_uri());pg.wait_for_timeout(1500);out=ROOT/'cards'/f'{slug}.png';pg.screenshot(path=str(out));b.close()
tmp.unlink();print(out)
