#!/usr/bin/env python3
"""
Smoke test suite for nis2-narzedzia.pl
Run: python smoke_test.py
All checks must pass before any commit.
"""

import os, re, json, sys
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).parent
SITE_URL = "https://nis2-strumenti.it"

PASS = "[OK]  "
FAIL = "[FAIL]"
WARN = "[WARN]"

failures = []
warnings = []

def ok(msg):    print(f"  {PASS} {msg}")
def fail(msg):  failures.append(msg); print(f"  {FAIL} {msg}")
def warn(msg):  warnings.append(msg); print(f"  {WARN} {msg}")

# ?? HTML parser ????????????????????????????????????????????????????????????????

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.links_css = []
        self.links_href = []
        self.metas = {}
        self.canonicals = []
        self.schemas = []
        self.classes_used = set()
        self.data_attrs = {}   # attr -> list of values
        self.text_chunks = []
        self._current_script = None
        self._in_script = False
        self._script_type = ""

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        self.classes_used.update(classes)

        if tag == "script":
            src = attrs.get("src", "")
            if src:
                self.scripts.append(src)
            self._script_type = attrs.get("type", "")
            self._in_script = True
            self._current_script = ""

        if tag == "link":
            if attrs.get("rel") == "stylesheet":
                self.links_css.append(attrs.get("href", ""))
            if attrs.get("rel") == "canonical":
                self.canonicals.append(attrs.get("href", ""))

        if tag == "a":
            href = attrs.get("href", "")
            if href:
                self.links_href.append(href)

        if tag == "meta":
            name = attrs.get("name", attrs.get("property", ""))
            content = attrs.get("content", attrs.get("value", ""))
            if name:
                self.metas[name] = content

        # Collect data attributes
        for k, v in attrs.items():
            if k.startswith("data-"):
                self.data_attrs.setdefault(k, []).append(v)

    def handle_endtag(self, tag):
        if tag == "script":
            if self._script_type == "application/ld+json" and self._current_script:
                self.schemas.append(self._current_script.strip())
            self._in_script = False
            self._current_script = None

    def handle_data(self, data):
        if self._in_script and self._current_script is not None:
            self._current_script += data
        if data.strip():
            self.text_chunks.append(data.strip())

def parse(path: Path) -> PageParser:
    p = PageParser()
    p.feed(path.read_text(encoding="utf-8"))
    return p

# ?? Collect all HTML files ?????????????????????????????????????????????????????

all_html   = sorted(ROOT.glob("**/*.html"))
# 404.html is exempted from most checks (no canonical, no site.js needed)
checked_html = [f for f in all_html if f.name != "404.html"]
root_html  = [f for f in checked_html if f.parent == ROOT]
tool_html  = [f for f in checked_html if f.parent.name == "strumenti"]

all_files  = {str(f.relative_to(ROOT)).replace("\\", "/") for f in ROOT.rglob("*") if f.is_file()}

print(f"\n{'='*60}")
print(f"  NIS2-Narzedzia.pl ? Smoke Test")
print(f"  {len(all_html)} HTML files | {len(tool_html)} tool pages")
print(f"{'='*60}\n")

# ==============================================================================
# CHECK 1 ? Every HTML file has valid parseable HTML (no Python parse errors)
# ==============================================================================
print("CHECK 1 ? HTML parseability")
for f in all_html:
    try:
        parse(f)
        ok(f.relative_to(ROOT))
    except Exception as e:
        fail(f"{f.relative_to(ROOT)}: parse error ? {e}")

# ==============================================================================
# CHECK 2 ? Every page has GA4 tag
# ==============================================================================
print("\nCHECK 2 ? GA4 tag (G-Y52ZG8JW71) on every page (excl. 404)")
GA4_ID = "G-XXXXXXXXXX"
for f in checked_html:
    content = f.read_text(encoding="utf-8")
    if GA4_ID in content:
        ok(f.relative_to(ROOT))
    else:
        fail(f"{f.relative_to(ROOT)}: missing GA4 tag")

# ==============================================================================
# CHECK 3 ? Every page has site.js included
# ==============================================================================
print("\nCHECK 3 ? site.js included on every page (excl. 404)")
for f in checked_html:
    p = parse(f)
    has_sitejs = any("site.js" in s for s in p.scripts)
    if has_sitejs:
        ok(f.relative_to(ROOT))
    else:
        fail(f"{f.relative_to(ROOT)}: missing site.js")

# ==============================================================================
# CHECK 4 ? Every page has canonical URL
# ==============================================================================
print("\nCHECK 4 ? Canonical URL on every page (excl. 404)")
for f in checked_html:
    p = parse(f)
    if p.canonicals:
        canon = p.canonicals[0]
        if SITE_URL in canon:
            ok(f"{f.relative_to(ROOT)} -> {canon}")
        else:
            warn(f"{f.relative_to(ROOT)}: canonical doesn't contain site URL -> {canon}")
    else:
        fail(f"{f.relative_to(ROOT)}: missing canonical")

# ==============================================================================
# CHECK 5 ? Every page has og:title and og:description
# ==============================================================================
print("\nCHECK 5 ? OG meta tags on every page (excl. 404)")
for f in checked_html:
    p = parse(f)
    has_og_title = "og:title" in p.metas
    has_og_desc  = "og:description" in p.metas
    if has_og_title and has_og_desc:
        ok(f.relative_to(ROOT))
    else:
        missing = []
        if not has_og_title: missing.append("og:title")
        if not has_og_desc:  missing.append("og:description")
        fail(f"{f.relative_to(ROOT)}: missing {', '.join(missing)}")

# ==============================================================================
# CHECK 6 ? Every page has <meta name="description">
# ==============================================================================
print("\nCHECK 6 ? Meta description on every page (excl. 404)")
for f in checked_html:
    p = parse(f)
    if "description" in p.metas:
        ok(f.relative_to(ROOT))
    else:
        fail(f"{f.relative_to(ROOT)}: missing meta description")

# ==============================================================================
# CHECK 7 ? Tool pages have AggregateRating schema
# ==============================================================================
print("\nCHECK 7 ? AggregateRating schema on tool pages")
for f in tool_html:
    p = parse(f)
    found = False
    for schema_str in p.schemas:
        try:
            schema = json.loads(schema_str)
            # May be nested in SoftwareApplication
            ar = schema.get("aggregateRating") or {}
            if schema.get("@type") == "AggregateRating" or ar.get("@type") == "AggregateRating":
                found = True
                break
        except json.JSONDecodeError:
            fail(f"{f.relative_to(ROOT)}: invalid JSON-LD")
    if found:
        ok(f.relative_to(ROOT))
    else:
        fail(f"{f.relative_to(ROOT)}: missing AggregateRating schema")

# ==============================================================================
# CHECK 8 ? Tool pages have methodology-box
# ==============================================================================
print("\nCHECK 8 ? methodology-box on tool pages")
for f in tool_html:
    content = f.read_text(encoding="utf-8")
    if "methodology-box" in content:
        ok(f.relative_to(ROOT))
    else:
        fail(f"{f.relative_to(ROOT)}: missing methodology-box")

# ==============================================================================
# CHECK 9 ? Tool pages have alternatives-section
# ==============================================================================
print("\nCHECK 9 ? alternatives-section on tool pages")
for f in tool_html:
    content = f.read_text(encoding="utf-8")
    if "alternatives-section" in content:
        ok(f.relative_to(ROOT))
    else:
        fail(f"{f.relative_to(ROOT)}: missing alternatives-section")

# ==============================================================================
# CHECK 10 ? Tool pages have countdown timer
# ==============================================================================
print("\nCHECK 10 ? data-countdown on tool pages")
for f in tool_html:
    content = f.read_text(encoding="utf-8")
    if "data-countdown" in content:
        ok(f.relative_to(ROOT))
    else:
        fail(f"{f.relative_to(ROOT)}: missing data-countdown")

# ==============================================================================
# CHECK 11 ? Tool pages have affiliate-links.js
# ==============================================================================
print("\nCHECK 11 ? affiliate-links.js on tool pages")
for f in tool_html:
    p = parse(f)
    if any("affiliate-links.js" in s for s in p.scripts):
        ok(f.relative_to(ROOT))
    else:
        fail(f"{f.relative_to(ROOT)}: missing affiliate-links.js")

# ==============================================================================
# CHECK 12 ? Tool pages have sticky-cta element
# ==============================================================================
print("\nCHECK 12 ? sticky-cta on tool pages")
for f in tool_html:
    content = f.read_text(encoding="utf-8")
    if 'class="sticky-cta"' in content or "sticky-cta" in content.split("class=")[-1][:200]:
        ok(f.relative_to(ROOT))
    else:
        fail(f"{f.relative_to(ROOT)}: missing sticky-cta element")

# ==============================================================================
# CHECK 13 ? Index + key pages have countdown, sticky-cta, exit-overlay
# ==============================================================================
print("\nCHECK 13 ? Key sitewide elements on index/porownanie/kalkulator")
key_pages = ["index.html", "porownanie.html", "kalkulator.html", "kalkulator-kary.html"]
for name in key_pages:
    f = ROOT / name
    if not f.exists():
        fail(f"{name}: file missing"); continue
    content = f.read_text(encoding="utf-8")
    checks = {
        "sticky-cta": "sticky-cta" in content,
        "exit-overlay": "exit-overlay" in content,
        "data-countdown": "data-countdown" in content,
    }
    all_ok = all(checks.values())
    if all_ok:
        ok(name)
    else:
        missing = [k for k, v in checks.items() if not v]
        fail(f"{name}: missing {', '.join(missing)}")

# ==============================================================================
# CHECK 14 ? All internal links resolve to real files
# ==============================================================================
print("\nCHECK 14 ? Internal links resolve")
broken = []
for f in checked_html:
    p = parse(f)
    for href in p.links_href:
        if href.startswith("#") or href.startswith("http") or href.startswith("mailto") or href.startswith("tel:"):
            continue
        # Absolute paths (e.g. /kalkulator.html) are relative to ROOT
        if href.startswith("/"):
            raw = href.lstrip("/").split("#")[0].split("?")[0]
            target = (ROOT / raw).resolve()
        else:
            raw = href.split("#")[0].split("?")[0]
            target = (f.parent / raw).resolve()
        if raw == "" or raw == ".":
            continue
        if not target.exists():
            broken.append(f"{f.relative_to(ROOT)} -> {href}")

if broken:
    for b in broken:
        fail(f"Broken link: {b}")
else:
    ok(f"All internal links resolve ({len(all_html)} pages checked)")

# ==============================================================================
# CHECK 15 ? All JSON-LD schemas are valid JSON
# ==============================================================================
print("\nCHECK 15 ? JSON-LD schemas are valid JSON")
schema_errors = []
for f in all_html:
    p = parse(f)
    for i, schema_str in enumerate(p.schemas):
        try:
            obj = json.loads(schema_str)
            if "@context" not in obj:
                warn(f"{f.relative_to(ROOT)} schema[{i}]: missing @context")
        except json.JSONDecodeError as e:
            schema_errors.append(f"{f.relative_to(ROOT)} schema[{i}]: {e}")

if schema_errors:
    for e in schema_errors:
        fail(f"Invalid JSON-LD: {e}")
else:
    ok("All JSON-LD schemas parse correctly")

# ==============================================================================
# CHECK 16 ? affiliate-links.js AFFILIATE_MAP covers all tools
# ==============================================================================
print("\nCHECK 16 ? affiliate-links.js covers expected tools")
aff_file = ROOT / "js" / "affiliate-links.js"
EXPECTED_TOOLS = [
    "sprinto.com", "reglyze.com", "secfix.com", "isms.online",
    "vanta.com", "complycloud.eu", "drata.com",
    "nordlayer.com", "1password.com", "bitwarden.com",
    "bitdefender.com", "acronis.com",
]
if aff_file.exists():
    aff_content = aff_file.read_text(encoding="utf-8")
    for tool in EXPECTED_TOOLS:
        if tool in aff_content:
            ok(f"affiliate-links.js covers {tool}")
        else:
            fail(f"affiliate-links.js missing entry for {tool}")
else:
    fail("affiliate-links.js not found")

# ==============================================================================
# CHECK 17 ? sitemap.xml covers all real HTML pages
# ==============================================================================
print("\nCHECK 17 ? sitemap.xml covers all pages")
sitemap = ROOT / "sitemap.xml"
if sitemap.exists():
    sitemap_content = sitemap.read_text(encoding="utf-8")
    for f in all_html:
        if f.name == "404.html":
            continue  # 404 should not be in sitemap
        # Build expected URL path
        rel = str(f.relative_to(ROOT)).replace("\\", "/")
        if rel == "index.html":
            expected = f"{SITE_URL}/"
        else:
            expected = f"{SITE_URL}/{rel}"
        if expected in sitemap_content:
            ok(f"Sitemap has {rel}")
        else:
            fail(f"Sitemap missing: {rel} (expected {expected})")
else:
    fail("sitemap.xml not found")

# ==============================================================================
# CHECK 18 ? JS files exist and are non-empty
# ==============================================================================
print("\nCHECK 18 ? JS/CSS assets exist and are non-empty")
REQUIRED_ASSETS = [
    "css/style.css", "js/site.js", "js/quiz.js", "js/affiliate-links.js"
]
for asset in REQUIRED_ASSETS:
    p = ROOT / asset
    if p.exists() and p.stat().st_size > 100:
        ok(f"{asset} ({p.stat().st_size} bytes)")
    elif p.exists():
        warn(f"{asset} exists but is suspiciously small ({p.stat().st_size} bytes)")
    else:
        fail(f"{asset}: file missing")

# ==============================================================================
# SUMMARY
# ==============================================================================
print(f"\n{'='*60}")
print(f"  RESULTS: {len(failures)} failures | {len(warnings)} warnings")
print(f"{'='*60}")

if failures:
    print(f"\n{FAIL} FAILING CHECKS:")
    for i, f in enumerate(failures, 1):
        print(f"  {i}. {f}")

if warnings:
    print(f"\n{WARN} WARNINGS:")
    for w in warnings:
        print(f"  ? {w}")

if not failures:
    print(f"\n{PASS} All checks passed. Safe to commit.")
    sys.exit(0)
else:
    print(f"\n  Fix all failures before committing.")
    sys.exit(1)
