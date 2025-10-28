## NCOJ Article Swap Playbook – Now with Reliable CSS, Header Roles, PDF & Feature Image

**What editors type (minimal header):**
```html
<header>
  <h1>Article Title</h1>
  <p><strong>By Full Name</strong></p>               <!-- author -->
  <p>Unit / Organization</p>                         <!-- org -->
  <p>Month DD, YYYY</p>                              <!-- date -->
  <!-- Optional: paste the official PDF button here. If omitted, the swapper inserts a template. -->
</header>
```

**What the swapper guarantees automatically**
- **CSS present:** Injects the standard inline CSS before `</head>` (fallback: top of `<body>`, then top of document).
- **No dependency on `.container-fluid`.**
- **Header roles:** Converts header lines into:
  - `<h3 class="author">By …</h3>`
  - `<h4 class="org">…</h4>`
  - `<p class="pubdate">Month DD, YYYY</p>` (or inserts a `(date goes here)` placeholder)
  - Adds `class="article-header"` to `<header>` if missing.
- **PDF button:** Ensures a Download the PDF button sits right after the date.
  - If a valid PDF button is already present (detects `pdficon_small.png` or “Download the PDF”), it doesn’t duplicate; it tags that spot internally.
  - If missing, inserts `templates/snippets/pdf-button.html` with `(PDF link here)` placeholder.
- **Feature/Main image:** Hoists the first Main image card to immediately follow the PDF button.
  - If you used `[photo main]`, it’s expanded and hoisted there.
  - If no Main image exists, it inserts a placeholder Main card:
    ```html
    <figure class="image-card Main">…</figure>
    ```
- **Left/Right images:** `[photo left]` / `[photo right]` tokens become framed image cards and the swapper inserts `<div class="image-clear"></div>` after each to end text wrapping.
- **References:** Under `<h3>References</h3>`, it:
  - wraps each entry as `<p class="reference">…</p>` (hanging indent is in CSS),
  - changes `<span>…</span>` titles to `<em>…</em>`,
  - adds `target="_blank"`, `rel="noopener"` and the GA click handler to links.
- **Bio:** If no bio exists, inserts `templates/snippets/bio.html` right after References (or end of article as fallback). Fill `(name)` and `(bio)`.

**Image tokens editors can use in body text**
```text
[photo main]
[photo left]
[photo right]
```

**Runner commands**
- Node: `node tools/article_swapper.js input.html output.html`
- Python: `python tools/article_swapper.py input.html output.html`

**Snippets to edit**
- PDF button: `templates/snippets/pdf-button.html` → replace `(PDF link here)`
- Images: replace `(image link here)`, `(image alt text here)`, `(image caption here)`
- Bio: replace `(name)` and `(bio)`

**CSS classes you can rely on in outputs**
- Header roles: `.author`, `.org`, `.pubdate`, optional `.subtitle`
- Image cards: `.image-card.Main` | `.Left` | `.Right`, `.image-body`, `.image-caption`, `.image-clear`
- Utilities: `.reference`, `.small-text`, `.panel-shadow`, etc.
