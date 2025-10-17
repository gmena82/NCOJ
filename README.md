# NCOJ / Training Items — Clean HTML Conversion (Codex-Operated)

This README defines the exact steps Codex must follow to convert NCO Journal (NCOJ) source files into a publish-ready, text-focused HTML artifact (`*--CLEAN.html`).

> **Strict rule:** Do **not** paraphrase or rewrite content. Only fix truly obvious artifacts (for example, a URL broken by line wrapping, or a clearly missing terminal period). When you make such a micro-fix, state it under **Flags** in your commit message.

---

## Repository locations (inputs and output)

All files for each article live in the `Training Items/` folder:

- `Training Items/<Something-TM>.html` — manuscript or "TM"/template content.
- `Training Items/<Something-DW>.html` — "Actual/DW" site version (older Bootstrap).
- `Training Items/<Something-UA>.pdf` — companion PDF (optional cross-check only).

**Target output created by Codex for each article:**

- `Training Items/<Full Article Title>--CLEAN.html`

Keep the output alongside the inputs in `Training Items/`. Do **not** add new folders unless directed.

---

## Output requirements (CLEAN HTML)

Produce an HTML5 document with no site CSS blocks and no content images/captions. Exceptions and whitelist below are intentional to preserve site behavior.

### Allowed tags

`<!DOCTYPE html>`, `<html lang="en">`, `<head>`, `<meta charset="utf-8">`, `<title>`, `<body>`, `<article>`, `<header>`, `<section>`, `<footer>` (only when explicitly instructed), `<h1>`, `<h2>`, `<h3>`, `<p>`, `<em>`, `<strong>`, `<a>`, `<span>`, and `<div>` (Bio well only), and the PDF-button icon `<img>` inside the header link.

### Disallowed content

- All content images, image captions, social links, QR codes, panels/wells for images, and layout scaffolding.
- Any CSS `<style>` blocks or external CSS `<link>` tags in the article file.

### Class & attribute whitelist (use only these, exactly where stated)

- **PDF button (header):**
  ```html
  <a class="btn btn-xs btn-primary"
     title="Download the PDF"
     target="_blank"
     onclick="_gaq.push(['_trackEvent','PDF Blue Button Download','Click', this.href]);">
    Download the PDF <img src="/portals/7/Images/pdficon_small.png" alt=""/>
  </a>
  ```
- **References:** each entry is `<p class="reference">…<a …>URL</a></p>`.
  - Every reference link must include `target="_blank"` and `onclick="_gaq.push(['_trackEvent','Notes Link','Click', this.href]);"`.
- **Author Bio well:**
  - Add `<span id="bio">&nbsp;</span>` immediately before the bio.
  - Wrap the bio text in `<div class="well well-lg panel-shadow">` and place the copy inside `<p class="small">…</p>`.
- No other classes or attributes are allowed. We intentionally omit `rel="noopener"` on these anchors to match current site behavior.

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
      <!-- If the article has a deck/subtitle, keep it as an H2 directly under the H1 -->
      <h2>{Optional Deck/Subtitle}</h2>

      <p><strong>By {Rank First M. Last}</strong></p>
      <p>{Affiliation}</p>
      <p>{Month DD, YYYY}</p>

      <p>
        <a href="{insert PDF link here}"
           title="Download the PDF"
           class="btn btn-xs btn-primary"
           onclick="_gaq.push(['_trackEvent','PDF Blue Button Download','Click', this.href]);"
           target="_blank">
          Download the PDF <img alt="" src="/portals/7/Images/pdficon_small.png"/>
        </a>
      </p>
    </header>

    <!-- Sections in source order; use <h3> for section headings when present -->
    <section>
      <h3>Introduction</h3>
      <p>{…}</p>
    </section>

    <!-- …repeat sections as needed… -->

    <!-- References -->
    <section aria-labelledby="references">
      <h3 id="references">References</h3>

      <!-- Each entry is ONE paragraph with class="reference". Use <em> for titles. -->
      <p class="reference">
        Department of the Army. (2025). <em>Foot Marches</em> (ATP 3-21.18).
        <a href="https://armypubs.army.mil/ProductMaps/PubForm/Details.aspx?PUB_ID=1031491"
           onclick="_gaq.push(['_trackEvent','Notes Link','Click', this.href]);"
           target="_blank">https://armypubs.army.mil/ProductMaps/PubForm/Details.aspx?PUB_ID=1031491</a>
      </p>
      <!-- …add one <p class="reference"> per citation… -->
    </section>

    <!-- Author Bio (no heading) -->
    <span id="bio">&nbsp;</span>
    <div class="well well-lg panel-shadow">
      <p class="small"><strong>{Rank First M. Last}</strong> {Bio text…}</p>
    </div>

    <!-- Footer/Disclaimer: OMIT in CLEAN; editorial inserts this later -->
  </article>
</body>
</html>
```

### Kebab-slug generation (for `<article id="…">`)

1. Unicode NFKD normalize and remove diacritics.
2. Lowercase the string.
3. Replace any run of non-`[a-z0-9]` characters with a single hyphen `-`.
4. Collapse multiple hyphens to one.
5. Trim leading/trailing hyphens.

**Examples**

- `Pounds for Pain` → `pounds-for-pain`
- `The Power of Stability` → `the-power-of-stability`

---

## Source precedence (what to trust for what)

When multiple inputs exist, use this order:

1. **DW/Actual HTML** — authoritative for title/byline/affiliation/date, section order, reference text, and the blue PDF button pattern.
2. **TM/Manuscript HTML** — base narrative when DW is absent; also a cross-check.
3. **PDF** — only to verify bio or references or to resolve obvious breaks (for example, a URL wrapped across lines).

If the exact portal path for the PDF is unknown at conversion time, keep `href="insert PDF link here"` as a placeholder and note it under **Flags** in the commit.

---

## Editing rules

- Never paraphrase or modernize terms.
- Remove all image captions, photo credits, QR-code notes, social links, and image-only paragraphs.
- Allowed micro-fixes only (must be flagged):
  - Join URLs split by line wraps.
  - Add a clearly missing sentence-ending period.

---

## Definition of Done (DoD)

### Header & Metadata

- [ ] `<title>` equals `<h1>`.
- [ ] Byline, affiliation, and date match DW/Actual exactly.
- [ ] Deck/subtitle appears as `<h2>` directly under `<h1>` when present.
- [ ] PDF blue button present with exact classes and analytics `onclick`; includes the small PDF icon image.

### Body & Structure

- [ ] Section order matches source.
- [ ] No content images, captions, social links, or QR codes remain.

### References

- [ ] References heading present.
- [ ] Each entry is one `<p class="reference">…</p>`; book/report titles wrapped in `<em>`.
- [ ] Each reference URL anchor includes `target="_blank"` and the analytics `onclick` with label `Notes Link`.

### Author Bio

- [ ] A `<span id="bio">` anchor exists.
- [ ] Bio is rendered as `<div class="well well-lg panel-shadow"><p class="small">…</p></div>`.
- [ ] No "Author Bio" heading is added.

### Classes & Attributes

- [ ] Only whitelisted classes appear (`btn btn-xs btn-primary`, `reference`, `well well-lg panel-shadow`, `small`).
- [ ] Only whitelisted `onclick` patterns appear (PDF: `PDF Blue Button Download`; References: `Notes Link`).
- [ ] Footer/disclaimer is omitted in CLEAN (editorial inserts this later).

### Content integrity

- [ ] No paraphrasing; only micro-fixes allowed and flagged in the commit.

---

## Quick validation (optional, local)

```bash
FILE="Training Items/<Full Article Title>--CLEAN.html"

# Fail if style/link stylesheet blocks or content images slipped in
grep -nE '<style|<link[^>]+stylesheet' "$FILE" && { echo "❌ CSS detected"; exit 1; }
grep -nE '<img(?![^>]*pdficon_small\.png)' "$FILE" && { echo "❌ Content image detected"; exit 1; }

# Whitelist class check (flag anything not in the set)
grep -oE 'class="[^"]+"' "$FILE" | grep -vE \
'class="btn btn-xs btn-primary"|class="reference"|class="well well-lg panel-shadow"|class="small"' \
&& echo "⚠️ Non-whitelisted class detected" || echo "✅ Class whitelist OK"

# Check analytics onclick usage
grep -q "_gaq.push(['_trackEvent','PDF Blue Button Download','Click'" "$FILE" && \
grep -q "_gaq.push(['_trackEvent','Notes Link','Click'" "$FILE" \
&& echo "✅ Analytics onclicks OK" || echo "⚠️ Missing required onclicks"
```

---

## Commit guidance for Codex

- **Message:** `add(clean): {kebab-slug} (text-only with PDF button, p.reference, bio well)`
- **Flags:**
  - “Inserted placeholder PDF href” or “Set PDF href to UA path”.
  - Any micro-fixes (for example, “rejoined ADP URL”, “added missing period in final paragraph”).
