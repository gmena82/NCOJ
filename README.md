# NCOJ / Training Items — Clean HTML Conversion (Codex-Operated)

This README defines the **exact steps Codex must follow** to convert NCO Journal (NCOJ) source files into a **text-only, CSS-free, image-free** HTML artifact (`*--CLEAN.html`). The result preserves the article’s text, structure, title/byline/affiliation/date, **APA-style references**, **author bio**, and **disclaimer**—without altering site CSS (production uses an older Bootstrap).

> **Strict rule:** Do **not** paraphrase or rewrite content. Only fix truly obvious artifacts (e.g., a URL broken by line wrapping, or a clearly missing terminal period). When you make such a micro-fix, state it under **Flags** in your commit message.

---

## Repository locations (this article’s training seed)

All files are in `Training Items/`:

- `Training Items/Original-Equal_Opportunity.html` — Original source content (includes images/styles; **not for layout**).
- `Training Items/Actual-Equal-Opportunity-DW.html` — Canonical “Actual” site version (**primary source for text & metadata**).
- `Training Items/Equal_Opportunity-UA.pdf` — Companion PDF (optional; cross-check bios/references/spellings).

**Target output created by Codex for this article:**

- `Training Items/Developing-Equal-Opportunity-Advisors--CLEAN.html`

Keep the output **alongside** the inputs in `Training Items/`. Do **not** add new folders unless directed.

---

## Output requirements (CLEAN HTML)

Produce an HTML5 document with **no images** and **no CSS**. Only semantic elements are allowed.

- **Allowed:** `<article>`, `<header>`, `<section>`, `<footer>`, `<h1>–<h3>`, `<p>`, `<em>`, `<strong>`, `<a>`
- **Disallowed:** `<img>`, `<style>`, `<link rel="stylesheet">`, any inline `style=""`, any `class="..."`, layout `<div>` scaffolding, scripts, tracking attributes.

---

## Required structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{Article Title}</title>
</head>
<body>
  <article id="{kebab-slug}">
    <header>
      <h1>{Article Title}</h1>
      <p><strong>By {Rank First M. Last}</strong></p>
      <p>{Affiliation}</p>
      <p>{Month DD, YYYY}</p>
      <p><a href="{/Portals/.../Article.pdf}" target="_blank" rel="noopener">Download the PDF</a></p>
    </header>

    <!-- Body sections in order (use <h3> for section headings) -->
    <section>
      <h3>Introduction</h3>
      <p>{...}</p>
    </section>

    <!-- ...repeat sections as needed... -->

    <section aria-labelledby="references">
      <h3 id="references">References</h3>
      <p>Lastname, A. A. (Year). <em>Title of work</em>. Publisher.</p>
      <p>Organization. (Year, Month DD). <em>Title</em>. <a href="https://example.com" target="_blank" rel="noopener">https://example.com</a></p>
      <!-- one <p> per reference -->
    </section>

    <section aria-labelledby="author-bio">
      <h3 id="author-bio">Author Bio</h3>
      <p><strong>{Rank First M. Last}</strong> {bio text…}</p>
    </section>

    <footer>
      <p><strong>Disclaimer:</strong> The views expressed in this article are those of the authors and do not necessarily reflect the opinions of the NCO Journal, the U.S. Army, or the Department of Defense.</p>
    </footer>
  </article>
</body>
</html>
```

### Kebab-slug generation (for `<article id="…">`)

Generate kebab-slug from the full Article Title with these exact steps:

1. Normalize to Unicode NFKD, then remove diacritic marks.
2. Lowercase the string.
3. Replace any run of characters not in `[a-z0-9]` with a single hyphen `-`.
4. Collapse multiple hyphens to a single hyphen.
5. Trim any leading or trailing hyphens.

**Examples**

- Developing Equal Opportunity Advisors → `developing-equal-opportunity-advisors`
- Army’s Readiness—An Overview → `armys-readiness-an-overview`
- People, First: Lessons & Practices → `people-first-lessons-practices`

---

## Authoritative sources (priority order)

When multiple inputs exist, use this precedence:

1. **Actual HTML (`Training Items/Actual-Equal-Opportunity-DW.html`)** — authoritative for:
   - Title, byline (rank + name), affiliation
   - Publication date (e.g., September 22, 2025)
   - Section order and headings (e.g., Introduction, Training, Mentorship, etc.)
   - Reference entries as text (italicize titles; keep links)
   - Author bio content block
2. **Original HTML** — reference for baseline text and the standard disclaimer text.
3. **PDF** — only to confirm bio/references or resolve ambiguity (e.g., URL wrapped across lines).

Do not carry over any CSS, classes, layout `<div>`s, images/captions, QR codes, or buttons from the Actual file.

---

## What to extract (this article)

From Actual (`Training Items/Actual-Equal-Opportunity-DW.html`):

- Title: Developing Equal Opportunity Advisors
- Byline: By Sgt. Maj. Pedro I. Campoverde
- Affiliation: XVIII Airborne Corps and Fort Bragg
- Date: September 22, 2025
- PDF link: `/Portals/7/nco-journal/images/2025/September/Equal-Opportunity/Equal_Opportunity-UA.pdf`
- Section order: Introduction, Training, Mentorship, Evaluations, Collaboration, Building and Supporting EOAs, Conclusion
- References: One `<p>` per entry; wrap titles in `<em>`; include live links as shown.
- Author Bio: Single paragraph; preserve wording exactly.

From Original (`Training Items/Original-Equal_Opportunity.html`):

- Disclaimer paragraph (verbatim). If a disclaimer also appears in Actual, prefer that; otherwise fall back to Original.

Use PDF (`Training Items/Equal_Opportunity-UA.pdf`) to confirm the bio and reference text if unclear or broken in HTML.

---

## Strict editing rules

- Never paraphrase or modernize terms (e.g., do not change “Fort Bragg” to “Fort Liberty”).
- Allowed micro-fixes only (and must be flagged in commit):
  - Join URLs broken by line wrapping.
  - Add a clearly missing sentence-ending period.

---

## Link requirements

- All external links (including the PDF link) must use: `target="_blank" rel="noopener"`.
- Keep the exact URL text. If a URL is split/wrapped in the source, rejoin it to a single valid URL.

---

## File naming for the CLEAN artifact

Save the final output as:

- `Training Items/Developing-Equal-Opportunity-Advisors--CLEAN.html`

`--CLEAN` is uppercase and appended to the base title with two hyphens.

Use UTF-8 encoding.

---

## Definition of Done (DoD)

### Structure & Metadata

- `<title>` equals `<h1>`.
- Byline, affiliation, and date match Actual exactly.
- “Download the PDF” link is present and matches Actual.
- All sections appear in the same order as Actual.

### Presentation-free

- No `<img>` tags.
- No `<style>`, `<link rel="stylesheet">`, or inline `style=""`.
- No `class="..."`, no layout `<div>`s, no scripts.

### References & Bio

- References heading present.
- Each reference in its own `<p>`; titles wrapped in `<em>`; links clickable.
- Author Bio section present; bio text matches the source exactly.
- Disclaimer paragraph present (verbatim).

### Content integrity

- No paraphrasing; only micro-fixes allowed and flagged in commit.

---

## Quick validation (optional, local)

```bash
FILE="Training Items/Developing-Equal-Opportunity-Advisors--CLEAN.html"

grep -nE '<img|<style|<link[^>]+stylesheet| class=| style=' "$FILE" && {
  echo "❌ Presentation markup detected in $FILE" ; exit 1 ; }
echo "✅ No presentation markup detected"

grep -q '<h1>Developing Equal Opportunity Advisors</h1>' "$FILE" && \
grep -q '<h3>References</h3>' "$FILE" && \
grep -q '<h3 id="author-bio">Author Bio</h3>' "$FILE" && \
echo "✅ Key sections found" || echo "❌ Missing key sections"
```

---

## Commit guidance for Codex

**Message:**

```
add(clean): developing-equal-opportunity-advisors (text-only)
```

**Include Flags:**

Brief list of any micro-fixes or ambiguities (e.g., “rejoined DEOMI URL”, “added missing period in final paragraph”).
