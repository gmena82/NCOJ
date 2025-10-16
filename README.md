# NCOJ / Training Items — Clean HTML Conversion (Codex-Operated)

This README defines the **exact steps Codex must follow** to convert NCO Journal (NCOJ) source files into a **text-only, CSS-free, image-free** HTML artifact (`*--CLEAN.html`). The process preserves the article’s text, structure, title/subtitle/byline/affiliation/date, **APA-style references**, **author bio**, and **disclaimer**, without changing any site styles (production uses an older Bootstrap build).

> **Important:** Do **not** paraphrase or re-write content. Only flag truly missing punctuation (e.g., an obviously missing period) — **do not auto-fix** without calling it out in the commit.

---

## Repository locations (this article’s training seed)

All files are in the `Training Items/` folder:

- `Training Items/Original-Equal_Opportunity.html` — Original source content (*images present; not for layout copying*).
- `Training Items/Actual-Equal-Opportunity-DW.html` — Canonical “Actual” site version (older Bootstrap + inline CSS, **primary source for text & metadata**).
- `Training Items/Equal_Opportunity-UA.pdf` — Companion PDF (for cross-checking bio, references, and spellings; **optional**).

**Target output file created by Codex for this article:**

- `Training Items/Developing-Equal-Opportunity-Advisors--CLEAN.html`

> Keep the output alongside the training inputs in `Training Items/`. Do **not** create new folders unless instructed.

---

## Output requirements (CLEAN HTML)

Produce a single `<!DOCTYPE html>` document with **no images** and **no CSS**. Use only semantic elements:

- **Allowed:** `<article>`, `<header>`, `<section>`, `<footer>`, `<h1>–<h3>`, `<p>`, `<em>`, `<strong>`, `<a>`
- **Disallowed:** `<img>`, `<style>`, `<link rel="stylesheet">`, inline `style=""`, classes (`class="..."`), layout `<div>` scaffolding, scripts, tracking attributes (e.g., `onclick`).

### Required structure

The `<article id="{kebab-slug}">` must use the kebab-case version of the full Article Title `<h1>` (e.g., Title "The Power of Stability" becomes id `the-power-of-stability`).

If a subtitle is present in the source, include it as an `<h2>` immediately following the `<h1>`.

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
      <h2>{Subtitle}</h2>
      <p><strong>By {Rank First M. Last}</strong></p>
      <p>{Affiliation}</p>
      <p>{Month DD, YYYY}</p>
      <p><a href="{/Portals/.../Filename-UA.pdf}" target="_blank" rel="noopener">Download the PDF</a></p>
    </header>

    <section>
      <h3>Introduction</h3>
      <p>...</p>
    </section>

    <section aria-labelledby="references">
      <h3 id="references">References</h3>
      <p>Lastname, A. A. (Year). <em>Title of work</em>. Publisher.</p>
      <p>Organization. (Year, Month DD). <em>Title</em>. <a href="https://example" target="_blank" rel="noopener">https://example</a></p>
    </section>

    <section aria-labelledby="author-bio">
      <h3 id="author-bio">Author Bio</h3>
      <p><strong>{Rank First M. Last}</strong> {bio text...}</p>
    </section>

    <footer>
      <p><strong>Disclaimer:</strong> The views expressed in this article are those of the authors and do not necessarily reflect the opinions of the NCO Journal, the U.S. Army, or the Department of Defense.</p>
    </footer>
  </article>
</body>
</html>
```

---

## Authoritative sources (priority order)

When multiple inputs exist, follow this precedence:

1. **Actual HTML (`Training Items/Actual-Equal-Opportunity-DW.html`)** — authoritative for:
   - Title (H1), subtitle (H2, if present), byline (rank + name), affiliation
   - Publication date (e.g., “September 22, 2025”)
   - Section order and headings (e.g., “Introduction”, “Training”, “Mentorship”, etc.)
   - Reference entries as text (italicize titles; keep links intact)
   - Author bio content block
   - PDF link path
2. **Original HTML (`Training Items/Original-Equal_Opportunity.html`)** — use for baseline text checks and the standard disclaimer if missing in Actual.
3. **PDF (`Training Items/Equal_Opportunity-UA.pdf`)** — only to confirm bio/references or resolve ambiguity (e.g., URL split across lines).

Do not carry over any CSS, classes, layout `<div>`s, images/captions, QR codes, or buttons from the Actual file.

---

## What to extract (Example: Developing Equal Opportunity Advisors)

From `Training Items/Actual-Equal-Opportunity-DW.html` capture:

- **Title:** Developing Equal Opportunity Advisors
- **Byline:** By Sgt. Maj. Pedro I. Campoverde
- **Affiliation:** XVIII Airborne Corps and Fort Bragg
- **Date:** September 22, 2025
- **PDF link:** `/Portals/7/nco-journal/images/2025/September/Equal-Opportunity/Equal_Opportunity-UA.pdf`
- **Section order:** Introduction, Training, Mentorship, Evaluations, Collaboration, Building and Supporting EOAs, Conclusion
- **References:** One paragraph per entry; wrap titles in `<em>`; include live links exactly as shown (do not normalize initials spacing unless the source shows it).
- **Author Bio:** Single paragraph block; preserve wording exactly.

From `Training Items/Original-Equal_Opportunity.html` capture:

- **Disclaimer:** Use the paragraph verbatim if the Actual file does not contain it.

Use the PDF only to verify the bio and reference text if the HTML sources are unclear or broken.

---

## Strict editing rules

- Do not paraphrase or rewrite sentences.
- Do not modernize terminology (e.g., keep “Fort Bragg,” do not swap to “Fort Liberty”).
- Remove stylistic flourishes like drop-caps (e.g., `<span class="q"><em>I</em></span>`).
- Allowed micro-fixes (only when obvious and necessary — and must be noted under **Flags** in the commit message):
  - Join URLs broken by line wraps.
  - Add a clearly missing sentence-ending period.

---

## Link requirements

- All external links (including the PDF link) must use `target="_blank" rel="noopener"`.
- Preserve the exact URL text from the source, even if it appears incorrect.
- If a link is wrapped/broken in the source, rejoin it into a single valid URL.
- Strip tracking attributes such as `onclick="_gaq.push(...)"`.

---

## File naming for the CLEAN artifact

Save the final output as:

- `Training Items/Developing-Equal-Opportunity-Advisors--CLEAN.html`

`--CLEAN` is always uppercase and appended to the base title with two hyphens. Use UTF-8 encoding.

---

## Definition of Done (DoD)

### Structure & Metadata

- [ ] `<title>` equals `<h1>`.
- [ ] Byline, affiliation, and date match Actual exactly.
- [ ] `<h2>` present if a subtitle exists in Actual.
- [ ] “Download the PDF” link present and matches Actual.
- [ ] All sections appear in the order shown in Actual.
- [ ] `<article id>` uses the kebab-case version of the `<h1>`.

### Presentation-free

- [ ] No `<img>` tags.
- [ ] No `<style>` blocks, `<link rel="stylesheet">`, or inline `style=""`.
- [ ] No `class="..."`, no layout `<div>`s, no scripts.
- [ ] No tracking attributes (e.g., `onclick`).

### References & Bio

- [ ] References heading present.
- [ ] Each reference is its own `<p>`; titles wrapped in `<em>`; links clickable and clean.
- [ ] Author Bio section present; bio text matches the source wording.
- [ ] Disclaimer paragraph present (verbatim).

### Content integrity

- [ ] No paraphrasing; only micro-fixes allowed and flagged in the commit.

---

## Quick validation (optional, local)

To sanity-check a CLEAN file with basic greps:

```bash
FILE="Training Items/Developing-Equal-Opportunity-Advisors--CLEAN.html"

# Fail if any images, CSS, classes, inline styles, or tracking attributes slipped in
grep -nE '<img|<style|<link[^>]+stylesheet| class=| style=|onclick=' "$FILE" && \
  { echo "❌ Presentation markup detected"; exit 1; } || \
  echo "✅ No presentation markup detected"

# Basic structure checks
grep -n '<h1>Developing Equal Opportunity Advisors</h1>' "$FILE" >/dev/null && \
grep -n '<h3>References</h3>' "$FILE" >/dev/null && \
grep -n '<h3 id="author-bio">Author Bio</h3>' "$FILE" >/dev/null && \
echo "✅ Key sections found" || echo "❌ Missing key sections"
```

*Note:* The path includes a space in `Training Items/`; wrap the file path in quotes as shown.

---

## Adding more training items later

Place each new article’s three inputs in `Training Items/` using this naming pattern:

- `Original-<SlugOrShortTitle>.html`
- `Actual-<SlugOrShortTitle>-DW.html` (or similar “Actual” export)
- `<SlugOrShortTitle>.pdf` (optional companion)

Then produce `Training Items/<Full Article Title>--CLEAN.html` following this spec.

---

## Commit guidance for Codex

- **Message:** `add(clean): {kebab-slug} (text-only)`
- **Flags:** Brief list of any micro-fixes or ambiguities noted (e.g., “URL rejoined in DEOMI ref”, “Disclaimer sourced from Original”, “Removed drop-cap styling”, “Kept PDF link exactly as found in Actual”).
