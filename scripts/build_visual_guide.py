"""Build a self-contained, static research reference from preserved evidence."""

import base64
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"


def image(name, alt, cls=""):
    path = DOCS / "research" / name
    kind = "image/svg+xml" if path.suffix == ".svg" else "image/png"
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return f'<img class="{cls}" alt="{alt}" src="data:{kind};base64,{data}">'


def footer(number, source):
    return (
        '<footer><span>Independent concept by Ayo Ahmed · No Rebolt affiliation</span>'
        f'<span>{source} · 11 Oct 2026</span><b>0{number}</b></footer>'
    )


def header(number, title, sub):
    return (
        f'<div class="eyebrow">RESEARCH REFERENCE / 0{number}</div>'
        f'<h1>{title}</h1><p class="subtitle">{sub}</p>'
    )


def clean_pdf_metadata():
    path = DOCS / "brand-visual-guide.pdf"
    data = path.read_bytes()
    pattern = rb'/Creator \((?:\\.|[^\\)])*\)'
    match = re.search(pattern, data)
    replacement = b'/Creator (Visual brand research)\n/Author (Ayo Ahmed)'
    if not match or len(match.group()) < len(replacement):
        raise ValueError("Expected print-export metadata field not found")
    data = data[:match.start()] + replacement.ljust(len(match.group())) + data[match.end():]
    path.write_bytes(data)
    print("PASS: PDF author/creator metadata normalized; cross-reference offsets preserved")


def main():
    aviation = image("screenshots/aviation-desktop.png", "Official aviation desktop hero, 1366 by 900")
    mobile = image("screenshots/aviation-mobile.png", "Official aviation mobile hero, 390 by 844")
    sections = image("screenshots/aviation-sections-desktop.png", "Actual outcome and platform sections")
    brand = image("screenshots/brand-desktop.png", "Official generic Rebolt brand page")
    pitch = image("screenshots/companyos-desktop.png", "Official generic Pitch Rebolt article")
    white = image("assets/wordmark-white.svg", "Literal official white wordmark")
    black = image("assets/wordmark-black.svg", "Literal official black wordmark")
    symbol = image("assets/aviation-nav-symbol.svg", "Literal inline aviation navigation symbol")
    square = image("assets/logo-icon-white-squared.svg", "Literal official square icon")
    rounded = image("assets/logo-icon-black-rounded.svg", "Literal official rounded icon")
    html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="author" content="Ayo Ahmed">
<title>Rebolt — visual brand research</title>
<style>
* {{ box-sizing: border-box }}
body {{ margin: 0; color: #181b20; background: #dedfe0; font: 14px/1.45 Arial,sans-serif }}
.sheet {{ width: 1122px; min-height: 793px; padding: 34px 42px 48px; margin: 28px auto;
  background: #fbfbf9; position: relative; box-shadow: 0 6px 28px #0001 }}
.dark {{ color: #fff; background: #101215 }}
.eyebrow {{ font: 11px/1.5 monospace; letter-spacing: 2px; color: #5e6268 }}
.dark .eyebrow {{ color: #ffaf00 }}
h1 {{ font-size: 36px; line-height: 1.12; letter-spacing: -1.2px; margin: 12px 0 }}
h2 {{ margin: 0 0 10px; font-size: 21px; letter-spacing: -.5px }}
h3 {{ font-size: 15px; margin: 0 0 6px }}
p {{ margin: 0 0 12px }}
.subtitle {{ font-size: 14px; max-width: 880px; color: #60656e; margin-bottom: 22px }}
.dark .subtitle {{ color: #bdc2ca }}
.hero-grid {{ display: grid; grid-template-columns: 1fr 214px; gap: 20px }}
img {{ max-width: 100%; display: block; height: auto }}
.frame {{ border: 1px solid #ffffff20; background: #090b11; padding: 6px }}
figcaption {{ font: 11px/1.5 monospace; color: #bdc2ca; margin-top: 9px }}
figure {{ margin: 0 }}
.note {{ border-left: 3px solid #ffaf00; padding: 10px 14px; background: #ffffff08;
  margin-top: 16px; color: #d6dae0; font-size: 13px }}
.columns {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px }}
.swatches {{ display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin: 14px 0 24px }}
.swatch {{ height: 80px; display: flex; align-items: end; padding: 10px;
  font: 12px monospace; border: 1px solid #ddd; color: #fff }}
.small {{ font-size: 12px; color: #60656e }}
.detail {{ border-top: 1px solid #d9dce0; padding: 12px 0; display: grid;
  grid-template-columns: 100px 1fr; gap: 14px }}
.detail b {{ font-size: 22px; line-height: 1.15 }}
.detail span {{ color: #545b63; font-size: 12px }}
.stripe {{ height: 95px; background: #ffaf00; background-image: repeating-linear-gradient(
  135deg, transparent 0px, transparent 9px, #202322 9px, #202322 18px);
  background-size: 100% 40%; background-repeat: no-repeat; background-position: bottom;
  padding: 10px; color: #000; font: 11px monospace; margin: 12px 0 }}
.token-shot {{ border: 1px solid #ddd; padding: 5px; margin-top: 14px }}
.brand-row {{ display: grid; grid-template-columns: 1.3fr 1.3fr 1fr; gap: 12px; margin: 12px 0 }}
.logo {{ padding: 18px; border: 1px solid #d9dce0; height: 80px; display: flex;
  align-items: center; justify-content: center; gap: 12px }}
.logo img {{ max-height: 38px; max-width: 140px }}
.logo.dark {{ background: #0d0e10 }}
.logo .icon {{ width: 28px }}
.source-shot {{ border: 1px solid #d9dce0; padding: 5px }}
.pill {{ display: inline-block; border: 1px solid #ccc; padding: 3px 8px;
  border-radius: 4px; font: 11px monospace; margin-bottom: 10px }}
.panel {{ border-top: 3px solid #181b20; background: #fff; padding: 18px }}
.panel ul {{ padding-left: 18px; margin: 8px 0 0 }}
li {{ margin-bottom: 7px }}
.big-stat {{ font-size: 40px; letter-spacing: -1px; margin: 10px 0 }}
.formula {{ font: 14px/1.5 monospace; background: #f0f1ef; padding: 12px }}
.gate {{ background: #ffaf00; color: #181b20; padding: 20px; margin-top: 20px }}
footer {{ position: absolute; bottom: 18px; left: 42px; right: 42px; display: flex;
  gap: 16px; align-items: center; justify-content: space-between; padding-top: 10px;
  border-top: 1px solid #8885; font: 9px/1.4 monospace; color: #60656e }}
.dark footer {{ color: #bdc2ca }}
@page {{ size: A4 landscape; margin: 0 }}
@media print {{ body {{ background: #fff; print-color-adjust: exact }}
 .sheet {{ margin: 0; box-shadow: none; width: 297mm; height: 210mm;
   padding: 28px 36px 48px; min-height: 0; break-after: page }}
 .sheet:last-child {{ break-after: auto }}
 body {{ font-size: 12px; line-height: 1.4 }} h1 {{ font-size: 30px }}
 .subtitle {{ font-size: 12px; margin-bottom: 16px }}
 .swatch {{ height: 68px }} .swatches {{ margin-bottom: 16px }}
 .detail {{ padding: 10px 0 }} .detail b {{ font-size: 20px }}
 .detail span {{ font-size: 11px }}
 .token-shot img {{ max-height: 200px; width: auto; margin: auto }}
 .hero-grid .frame img {{ max-height: 480px; width: auto; margin: auto }}
 .note {{ font-size: 12px; padding: 8px 12px }}
 .logo {{ height: 70px; padding: 14px }} }}
@media screen and (max-width: 1150px) {{ .sheet {{ width: calc(100% - 24px); padding: 24px 24px 62px }}
 footer {{ left: 24px; right: 24px; flex-wrap: wrap }} }}
@media screen and (max-width: 650px) {{ .hero-grid,.columns {{ grid-template-columns: 1fr }}
 .hero-grid figure:last-child {{ max-width: 240px; margin: auto }}
 .brand-row {{ grid-template-columns: 1fr }} .swatches {{ grid-template-columns: repeat(2,1fr) }}
 h1 {{ font-size: 28px }} .sheet {{ min-height: 0 }} footer {{ font-size: 8px }} }}
</style></head><body>
<section class="sheet dark">
{header(1, 'Aviation is the live reference.',
        'The official root redirects to /aviation. These are real public-site captures, '
        'not proposed product screens or a recreated design.')}
<div class="hero-grid"><figure><div class="frame">{aviation}</div>
<figcaption>DESKTOP · 1366 × 900 · www.rebolt.ai/aviation</figcaption></figure>
<figure><div class="frame">{mobile}</div><figcaption>MOBILE · 390 × 844</figcaption></figure></div>
<div class="note"><b>Read the visual correctly.</b> Uppercase white headline. Helvetica Now Display.
Layered warm charcoal with actual aircraft outline artwork. A square amber CTA with a lower hazard stripe.
The future concept is a GTM workbench, not an aircraft operations product.</div>
{footer(1, 'Source: official aviation page')}
</section>
<section class="sheet">
{header(2, 'Observed tokens, not invented rules.',
        'Values come from source CSS, computed styles and real rendered-font inspection. '
        'This sheet is documentation; its labels use Arial, not a substitute brand-font specimen.')}
<div class="swatches">
<div class="swatch" style="background:#090b11">#090B11 · section</div>
<div class="swatch" style="background:#242422">#242422 · backing</div>
<div class="swatch" style="background:#202322">#202322 · stripe</div>
<div class="swatch" style="background:#ffaf00;color:#000">#FFAF00 · action</div></div>
<div class="columns"><div><h2>Type &amp; layout</h2>
<div class="detail"><b>80 / 88</b><span>Desktop H1: 80px / 88px. Requested weight 450. −4px tracking.
Actual face: Helvetica Now Display Medium.</span></div>
<div class="detail"><b>48 / 52.8</b><span>Mobile H1: 48px / 52.8px. −2.4px tracking.
24px horizontal inset; desktop inset 80px.</span></div>
<div class="detail"><b>24 / 56</b><span>Heading-to-subtitle gap 24px. Desktop column gap 56px.
Form gap 8px. Header 48px high.</span></div>
<div class="detail"><b>36 / 36</b><span>CTA label: 36px / 36px, weight 500. 16px padding.
Zero-radius corners. Mobile button 327 × 112px.</span></div>
<p class="small">Commercial font license is unresolved for this concept. Source declarations and
screenshots are preserved; font binaries are not redistributed.</p></div>
<div><h2>Stripe &amp; motion</h2><div class="stripe">SOURCE-CSS PATTERN SWATCH · NOT AN INTERACTIVE BUTTON</div>
<p class="small">135° repeating gradient; 9px clear / 9px charcoal. Bottom 40% only.
CTA transition 100ms, cubic-bezier(.4,0,.2,1). No stripe animation.</p>
<p class="small">Explore arrow: 2.4s ease-in-out, 0→8→0px vertical bounce.
Reduced-motion emulation resolves it to no animation.</p>
<div class="token-shot">{sections}</div>
<p class="small">Real lower-page capture. Outcome figures are Rebolt marketing claims,
not independently verified results or prototype performance.</p></div></div>
{footer(2, 'Source: official CSS + computed evidence')}
</section>
<section class="sheet">
{header(3, 'Generic CompanyOS material stays separate.',
        'Working label only: no separate current public CompanyOS homepage was confirmed. '
        'Official brand assets and generic pitch material use a distinct light editorial system.')}
<div class="brand-row"><div class="logo">{black}</div><div class="logo dark">{white}</div>
<div class="logo">{symbol}<div style="background:#0d0e10;padding:4px">{square}</div>{rounded}</div></div>
<div class="columns"><div><span class="pill">OFFICIAL BRAND PAGE</span><div class="source-shot">{brand}</div></div>
<div><span class="pill">OFFICIAL PITCH ARTICLE — NOT A HOMEPAGE</span><div class="source-shot">{pitch}</div></div></div>
<div class="swatches" style="grid-template-columns:repeat(3,1fr);margin:16px 0 12px">
<div class="swatch" style="background:#006afe;height:48px">#006AFE · Blue</div>
<div class="swatch" style="background:#0d0e10;height:48px">#0D0E10 · Pitch Black</div>
<div class="swatch" style="background:#fff;color:#000;height:48px">#FFFFFF · Pure White</div></div>
<p><b>Official typography:</b> Inter primary, Geist Mono monospaced. Company name: <b>Rebolt</b>,
not “Rebolt AI” or “Rebolt.ai”. Literal SVG assets above retain their source geometry.</p>
<p class="small">Introducing Rebolt describes an operations platform and governed execution across systems.
These are published claims, not independently validated capability, onboarding or feature-gap evidence.</p>
{footer(3, 'Sources: /brand + /pitch-rebolt')}
</section>
<section class="sheet">
{header(4, 'First Value Engine: research, not product UI.',
        'A proposed GTM experiment workbench for acquisition, activation, onboarding/billing '
        'and growth experiments. All scope and milestone definitions remain provisional.')}
<div class="columns"><div class="panel"><span class="pill">PROPOSED SCOPE</span>
<h2>Make the next experiment defensible.</h2><ul>
<li>Validate synthetic signup/event CSVs, with explicit row-level issues.</li>
<li>Declare first-value milestones, windows and cohort eligibility.</li>
<li>Preserve unknown segments and incomplete outcomes.</li>
<li>Show rationale behind experiment ranking.</li>
<li>Construct UTM strings and export an activation plan.</li></ul>
<p class="small" style="margin-top:16px">No real aircraft work, payments, integrations, private data,
campaign launches or unsupported claims about missing Rebolt features.</p></div>
<div class="panel"><span class="pill">PROPOSED METRIC SAFEGUARD</span>
<h2>Unknown outcomes are not failures.</h2><div class="big-stat">N / D / U</div>
<p>N = confirmed value. D = eligible mature units.<br>U = outcomes unknown due to incomplete evidence.</p>
<div class="formula">Bounds: N/D → (N+U)/D<br>Coverage: (D−U)/D</div>
<p style="margin-top:14px"><b>Synthetic arithmetic illustration:</b><br>
4 confirmed / 10 eligible / 2 unknown → 40–60% bounds; 80% coverage.</p>
<p class="small">Not a Rebolt benchmark, real cohort, application result or tested uplift.</p></div></div>
<div class="gate"><h2>Stop at the research gate.</h2>
<p>Commit brand evidence and the brief. Await scoped product-use notes before UI implementation.
Later delivery may include PM docs, tests with actual results, free Cloudflare deployment and a voiced
live-browser demonstration. None is delivered at this stage.</p></div>
<p class="small" style="margin-top:18px">Research reference only. Third-party logos, text, website artwork
and screenshots remain the property of their rights holders. No endorsement or blanket reuse license is implied.</p>
{footer(4, 'Sources: provisional brief + metric contract')}
</section></body></html>'''
    target = DOCS / "brand-visual-guide.html"
    target.write_text(html, encoding="utf-8")
    print(f"Built {target.relative_to(ROOT)}: {len(html.encode('utf-8')):,} bytes")


if __name__ == "__main__":
    if sys.argv[1:] == ["--clean-pdf-metadata"]:
        clean_pdf_metadata()
    elif sys.argv[1:]:
        raise SystemExit("Usage: build_visual_guide.py [--clean-pdf-metadata]")
    else:
        main()
