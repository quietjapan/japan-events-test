#!/usr/bin/env python3
"""GA self-exclusion smoke test (Playwright + network).

Serves the static site locally and checks that googletagmanager / google-analytics
collect requests are NOT sent when qj_no_ga is set (or navigator.webdriver is true),
and ARE sent for a normal visitor (webdriver overridden, no flag).
"""
from __future__ import annotations

import http.server
import re
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 8765
GA_HOST_RE = re.compile(r"(googletagmanager\.com|google-analytics\.com)", re.I)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):  # quiet
        pass


def start_server():
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd


def is_ga(url: str) -> bool:
    return bool(GA_HOST_RE.search(url))


def open_page(page, path: str, *, clear_flag: bool, pretend_human: bool):
    """Navigate and return (hits_so_far_list that keeps growing, get_toast fn)."""
    hits: list[str] = []

    def on_req(req):
        if is_ga(req.url):
            hits.append(req.url)

    page.on("request", on_req)

    scripts = []
    if clear_flag:
        scripts.append("try{localStorage.removeItem('qj_no_ga')}catch(e){}")
    if pretend_human:
        scripts.append(
            "Object.defineProperty(navigator,'webdriver',{get:function(){return undefined}});"
        )
    if scripts:
        page.add_init_script("\n".join(scripts))

    page.goto(f"http://127.0.0.1:{PORT}/{path.lstrip('/')}", wait_until="domcontentloaded")
    return hits


def wait_ga(page, hits, ms=3500):
    page.wait_for_timeout(ms)
    return list(hits)


def main() -> int:
    httpd = start_server()
    fails: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1) Playwright default (webdriver=true): GA must not load even with no flag
        ctx = browser.new_context()
        page = ctx.new_page()
        hits = open_page(page, "index.html", clear_flag=True, pretend_human=False)
        hits = wait_ga(page, hits)
        if hits:
            fails.append(f"webdriver skip failed; GA hits={hits[:3]}")
        else:
            print("OK webdriver=true → no GA")
        ctx.close()

        # 2) ?me=1 sets flag, toast, no GA (even if pretending human)
        ctx = browser.new_context()
        page = ctx.new_page()
        hits = open_page(page, "index.html?me=1", clear_flag=True, pretend_human=True)
        try:
            toast = page.locator(".qj-toast").inner_text(timeout=2000)
        except Exception as e:
            toast = f"<missing: {e}>"
        flag = page.evaluate("() => localStorage.getItem('qj_no_ga')")
        url = page.url
        if "me=1" in url or re.search(r"[?&]me=", url):
            fails.append(f"?me=1 not stripped from URL: {url}")
        if flag != "1":
            fails.append(f"?me=1 did not set localStorage (got {flag!r})")
        if "제외" not in toast:
            fails.append(f"toast wrong for me=1: {toast!r}")
        hits = wait_ga(page, hits)
        if hits:
            fails.append(f"?me=1 still sent GA: {hits[:3]}")
        else:
            print(f"OK ?me=1 → flag set, toast={toast!r}, no GA")
        ctx.close()

        # 3) Persisted flag: revisit without param, still no GA
        ctx = browser.new_context()
        page = ctx.new_page()
        page.add_init_script("localStorage.setItem('qj_no_ga','1');")
        hits = open_page(page, "index.html", clear_flag=False, pretend_human=True)
        hits = wait_ga(page, hits)
        if hits:
            fails.append(f"persisted flag still sent GA: {hits[:3]}")
        else:
            print("OK persisted qj_no_ga → no GA")
        ctx.close()

        # 4) ?me=0 clears flag + toast; with human override, GA should load
        ctx = browser.new_context()
        page = ctx.new_page()
        page.add_init_script("localStorage.setItem('qj_no_ga','1');")
        hits = open_page(page, "index.html?me=0", clear_flag=False, pretend_human=True)
        try:
            toast = page.locator(".qj-toast").inner_text(timeout=2000)
        except Exception as e:
            toast = f"<missing: {e}>"
        flag = page.evaluate("() => localStorage.getItem('qj_no_ga')")
        if flag is not None:
            fails.append(f"?me=0 did not clear flag (got {flag!r})")
        if "해제" not in toast:
            fails.append(f"toast wrong for me=0: {toast!r}")
        hits = wait_ga(page, hits)
        if not hits:
            fails.append("?me=0 + human: expected GA network hits, got none")
        else:
            print(f"OK ?me=0 → cleared, toast={toast!r}, GA hits={len(hits)}")
        ctx.close()

        # 5) Normal visitor (no flag, human): GA loads
        ctx = browser.new_context()
        page = ctx.new_page()
        hits = open_page(page, "index.html", clear_flag=True, pretend_human=True)
        hits = wait_ga(page, hits)
        if not hits:
            fails.append("normal visitor: expected GA network hits, got none")
        else:
            kinds = sorted({("gtag/js" if "gtag/js" in u else "collect/other") for u in hits})
            print(f"OK normal visitor → GA hits={len(hits)} ({', '.join(kinds)})")
        ctx.close()
        browser.close()

    httpd.shutdown()
    if fails:
        print("FAIL:")
        for f in fails:
            print(" -", f)
        return 1
    print("ALL PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
