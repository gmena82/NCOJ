# NCOJ Article Swap – Training & Rules

This training ensures every article gets the **same NCOJ look**, stays **AFPIMS/Bootstrap** compatible, and remains **508-friendly**.

---

## Editor Input (ELI5)

Minimal header that editors paste into AFPIMS:
```html
<header>
  <h1>Article Title</h1>
  <p><strong>By Full Name</strong></p>   <!-- author -->
  <p>Unit / Organization</p>             <!-- org -->
  <p>Month DD, YYYY</p>                  <!-- date -->
  <!-- PDF button optional; swapper will add if missing -->
</header>
```

Body images use tokens (don’t hand-build figures):

[photo main]
[photo left]
[photo right]


References (plain paragraphs – no classes needed):

<h3>References</h3>
<p>Author, A. (Year). Title. <a href="https://example.com">https://example.com</a></p>


Bio (optional). If you skip it, the swapper inserts a placeholder after References.

What the swapper ALWAYS does (in order)

Inline CSS is injected before </head> (fallback: top of <body>, then top of document).
Idempotent (uses a hidden sentinel so we never double-inject).

Header normalization

Any By… line → <h3 class="author">By …</h3> (accepts By:, By —, BY etc.)

Next line → <h4 class="org">…</h4>

Next line → <p class="pubdate">Month DD, YYYY</p> (or inserts (date goes here))

Ensures <header class="article-header">…</header>

PDF button goes right after the date.

If present already (detects “Download the PDF” or pdficon_small.png), no duplicate.

If missing, inserts templates/snippets/pdf-button.html with (PDF link here) placeholder.

Feature/Main image is hoisted to immediately follow the PDF button.

If none exists, inserts a Main placeholder (change link/alt/caption later).

Image tokens expand into framed cards with uniform caption area & subtle shadow.

Left/Right get a trailing <div class="image-clear"></div> to stop text wrapping.

References under <h3>References</h3> are normalized:

each entry → <p class="reference">…</p> (hanging indent)

book/report titles: <span>…</span> → <em>…</em>

every link gets target="_blank" rel="noopener" and GA click handler:

onclick="_gaq.push(['_trackEvent','Notes Link','Click', this.href]);"


Bio appears after the last reference paragraph (or end of article if no refs).

Final cleanup removes internal markers and extra blank lines.

Definition of Done (quick checklist)

Head:

 <style>…</style> block present before </head> (NCOJ CSS)

Header block:

 <h3 class="author">By …</h3>

 <h4 class="org">…</h4>

 <p class="pubdate">Month DD, YYYY</p> or (date goes here)

 PDF button directly under the date

Feature image:

 Exactly one Main image card directly under the PDF button

Body images:

 Left/Right images are framed and followed by <div class="image-clear"></div>

References:

 Heading is <h3>References</h3>

 All entries are <p class="reference">…</p>

 Links have GA onclick + target="_blank" rel="noopener"

Bio:

 Bio card appears after the last reference

508 spot checks:

 Every <img> has meaningful alt

 Focus ring visible on links/buttons (TAB through)

Where things live (repo layout)

templates/article-style-inline.css.html – injected NCOJ CSS (tokens, utilities, image cards, header classes).

templates/snippets/pdf-button.html – standard AFPIMS/Bootstrap PDF button (fill (PDF link here)).

templates/snippets/image-card-*.html – Main, Left, Right image card snippets.

✅ Tools now support both image-card-main.html and image-card-Main.html (same for left/Left, right/Right).

templates/snippets/bio.html – bio card snippet.

tools/article_swapper.js / tools/article_swapper.py – Node/Python transformers (identical behavior).

training-items/ – example New-Original-Input.html and New-Output.html.

Running the swapper

Node:

node tools/article_swapper.js input.html output.html


Python:

python tools/article_swapper.py input.html output.html

Snippets you edit (and only these placeholders)

PDF: templates/snippets/pdf-button.html → set (PDF link here)

Images: each image card → (image link here), (image alt text here), (image caption here)

Bio: templates/snippets/bio.html → (name) and (bio)

Why we don’t change Bootstrap or AFPIMS

We honor the platform. The swapper adds a thin, self-contained inline CSS layer and transforms HTML without modifying the underlying AFPIMS or Bootstrap version.

---
