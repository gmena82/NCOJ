# NCOJ Article Swap – Training

## Editor Rules (ELI5)

**Minimal header**:
```html
<header>
  <h1>Article Title</h1>
  <p><strong>By Full Name</strong></p>       <!-- author -->
  <p>Unit / Organization</p>                 <!-- org -->
  <p>Month DD, YYYY</p>                      <!-- date -->
  <!-- PDF button optional. If omitted, the swapper inserts one. -->
</header>
```

Images (use tokens in the body):
```text
[photo main]
[photo left]
[photo right]
```

References:
```html
<h3>References</h3>
<p>Plain reference line … <a href="https://…">https://…</a></p>
```
(No need to add classes or italics—the swapper does that.)

Bio: If you don’t include one, the swapper adds a bio box after References.

## What the swapper ALWAYS does (in order)
1. **Injects CSS** into `<head>` (fallback `<body>` or top) – idempotent via sentinel.
2. **Normalizes header** → `<h3 class="author">`, `<h4 class="org">`, `<p class="pubdate">`.
3. **Places PDF button** under the date (dedupe-safe).
4. **Hoists Feature (Main) image** under the PDF; inserts a placeholder if none found.
5. **Expands image tokens** into framed `.image-card` containers; Left/Right get a trailing `<div class="image-clear"></div>`.
6. **Formats References**:
   - each line becomes `<p class="reference">…</p>` (hanging indent)
   - `<span>` titles become `<em>`
   - anchors get `target="_blank"` `rel="noopener"` + GA onclick
7. **Ensures Bio** directly after the last reference (or end if no refs).
8. **Final cleanup** removes internal markers and extra blank lines.

## Do / Don’t (so Codex isn’t confused)
✅ Do type By Full Name as a plain `<p>` (with/without `<strong>`).
✅ Do provide org and date as plain `<p>` lines.
✅ Do use `[photo main|left|right]` tokens.
✅ Do paste your own PDF button if you have one; the swapper won’t duplicate it.
❌ Don’t hand-build `.image-card` unless necessary—use tokens.
❌ Don’t add `class="reference"` or hand italics in citations.
❌ Don’t modify Bootstrap/AFPIMS templates.

## Definition of Done (quick checklist)
**Head:**
- Inline CSS `<style>…</style>` is present before `</head>`.

**Header:**
- `<h3 class="author">By …</h3>`
- `<h4 class="org">…</h4>`
- `<p class="pubdate">Month DD, YYYY</p>` *(or (date goes here))*
- PDF button directly under the date

**Images:**
- Exactly one Main image card under the PDF
- Left/Right images have captions and a following `.image-clear`

**References:**
- `<h3>References</h3>` followed by only `<p class="reference">…</p>` entries
- Links have analytics + `target="_blank"` + `rel="noopener"`

**Bio:**
- Bio card appears after the last reference

## Snippets editors will fill
- PDF: `templates/snippets/pdf-button.html` → replace only `(PDF link here)`
- Images: replace `(image link here)`, `(image alt text here)`, `(image caption here)`
- Bio: replace `(name)` and `(bio)`

## Runners
- Node: `node tools/article_swapper.js input.html output.html`
- Python: `python tools/article_swapper.py input.html output.html`

## Classes guaranteed in the output
- Header: `.author`, `.org`, `.pubdate`, optional `.subtitle`
- Images: `.image-card.Main` | `.Left` | `.Right`, `.image-body`, `.image-caption`, `.image-clear`
- References: `.reference` (hanging indent)
- PDF button: `.btn.btn-xs.btn-primary`
- Bio: `.bio-card.panel-shadow`
