from pathlib import Path
import re
import sys

def read_first(paths):
    for p in paths:
        fp = Path(p)
        if fp.exists():
            return fp.read_text(encoding='utf-8')
    raise FileNotFoundError("None of the candidate paths exist:\n" + "\n".join(paths))

# Candidate paths
CSS_PATHS   = ['templates/article-style-inline.css.html']
PDF_PATHS   = ['templates/snippets/pdf-button.html']
MAIN_PATHS  = ['templates/snippets/image-card-main.html',  'templates/snippets/image-card-Main.html']
LEFT_PATHS  = ['templates/snippets/image-card-left.html',  'templates/snippets/image-card-Left.html']
RIGHT_PATHS = ['templates/snippets/image-card-right.html', 'templates/snippets/image-card-Right.html']
BIO_PATHS   = ['templates/snippets/bio.html']

CSS_SENTINEL = '/* =========================\n       Tokens'
CSS     = read_first(CSS_PATHS)
PDF_TPL = read_first(PDF_PATHS)
MAIN_T  = read_first(MAIN_PATHS)
LEFT_T  = read_first(LEFT_PATHS)
RIGHT_T = read_first(RIGHT_PATHS)
BIO_T   = read_first(BIO_PATHS)

def inject_css(html: str) -> str:
    if CSS_SENTINEL in html:
        return html
    if re.search(r'</head>', html, flags=re.I):
        return re.sub(r'</head>', CSS + '\n</head>', html, count=1, flags=re.I)
    if re.search(r'<body[^>]*>', html, flags=re.I):
        return re.sub(r'(<body[^>]*>)', r'\1\n' + CSS + '\n', html, count=1, flags=re.I)
    return CSS + '\n' + html

def expand_photo_tokens(html: str) -> str:
    def repl(m):
        pos = m.group(1).lower()
        return LEFT_T if pos == 'left' else RIGHT_T if pos == 'right' else MAIN_T
    return re.sub(r'\[photo\s+(left|right|main)\]', repl, html, flags=re.I)

def ensure_header_class(open_tag: str) -> str:
    if re.search(r'class=', open_tag, flags=re.I):
        def repl(m):
            cls = m.group(2)
            return f'class="{cls} article-header"' if 'article-header' not in cls.lower() else m.group(0)
        return re.sub(r'class=(["\'])(.*?)\1', repl, open_tag, count=1, flags=re.I)
    return open_tag[:-1] + ' class="article-header">'

def normalize_header(html: str) -> str:
    m = re.search(r'(<header[^>]*>)([\s\S]*?)(</header>)', html, flags=re.I)
    if not m:
        return html
    open_tag, inner, close_tag = m.groups()
    open_tag = ensure_header_class(open_tag)
    body = inner

    # Author
    body = re.sub(r'<p[^>]*>\s*(?:<strong>)?\s*By\s*[:—-]?\s+([^<]+?)(?:</strong>)?\s*</p>',
                  lambda mm: f'<h3 class="author">By {mm.group(1).strip()}</h3>',
                  body, count=1, flags=re.I)

    # Org
    body = re.sub(r'(<h3[^>]*class=["\'][^"\']*\bauthor\b[^"\']*["\'][^>]*>[\s\S]*?</h3>)([\s\S]*?)(<p(?![^>]*class=["\'][^"\']*\bpubdate\b)[\s\S]*?</p>)',
                  lambda mm: mm.group(1) + mm.group(2) + mm.group(3).replace('<p','<h4 class="org"').replace('</p>','</h4>'),
                  body, count=1, flags=re.I)

    # Pubdate
    if not re.search(r'<p[^>]*class=["\'][^"\']*\bpubdate\b', body, flags=re.I):
        body = re.sub(r'<p>([A-Za-z]{3,}\s+\d{1,2},\s+\d{4})</p>',
                      r'<p class="pubdate">\1</p>', body, count=1, flags=re.I)
        if not re.search(r'<p[^>]*class=["\'][^"\']*\bpubdate\b', body, flags=re.I):
            body += '\n<p class="pubdate">(date goes here)</p>'

    body = re.sub(r'(<p[^>]*class=["\'][^"\']*\bpubdate\b[^"\']*["\'][^>]*>[\s\S]*?</p>)',
                  r'\1\n<!--__AFTER_PUBDATE__-->', body, count=1, flags=re.I)

    new_header = f'{open_tag}{body}{close_tag}'
    return html[:m.start()] + new_header + html[m.end():]

def insert_pdf_after_date(html: str) -> str:
    hm = re.search(r'(<header[^>]*>)([\s\S]*?)(</header>)', html, flags=re.I)
    if not hm:
        return html
    open_tag, inner, close_tag = hm.groups()

    if re.search(r'(pdficon_small\.png|Download the PDF)', inner, flags=re.I):
        inner = re.sub(r'(<p[^>]*>[\s\S]*?(?:pdficon_small\.png|Download the PDF)[\s\S]*?</p>)',
                       r'\1\n<!--__AFTER_PDF__-->', inner, count=1, flags=re.I)
        return html[:hm.start()] + open_tag + inner + close_tag + html[hm.end():]

    if '<!--__AFTER_PUBDATE__-->' in html:
        return html.replace('<!--__AFTER_PUBDATE__-->', PDF_TPL + '\n<!--__AFTER_PDF__-->')

    return re.sub(r'</header>', PDF_TPL + '\n<!--__AFTER_PDF__-->\n</header>', html, count=1, flags=re.I)

def hoist_main_after_pdf(html: str) -> str:
    if '<!--__AFTER_PDF__-->' not in html:
        return html
    m = re.search(r'<figure[^>]*class=["\'][^"\']*\bimage-card\b[^"\']*\bMain\b[^"\']*["\'][^>]*>[\s\S]*?</figure>', html, flags=re.I)
    if m:
        block = m.group(0)
        without = html[:m.start()] + html[m.end():]
        return without.replace('<!--__AFTER_PDF__-->', block + '\n<!--__AFTER_PDF__-->')
    return html.replace('<!--__AFTER_PDF__-->', MAIN_T + '\n<!--__AFTER_PDF__-->')

def normalize_references(html: str) -> str:
    refs_head = re.search(r'(<h3[^>]*>\s*References\s*</h3>)', html, flags=re.I)
    if not refs_head:
        return html
    start = refs_head.end()
    tail_match = re.search(r'(</section>|<h2|<h3|</article>|$)', html[start:], flags=re.I)
    end = start + (tail_match.start() if tail_match else 0)
    block = html[start:end]

    # p -> class="reference"
    def fix_p(m):
        tag = m.group(0)
        if re.search(r'class=["\'][^"\']*\breference\b', tag, flags=re.I):
            return tag
        if not re.search(r'class=', tag, flags=re.I):
            return tag.replace('<p','<p class="reference"', 1)
        return re.sub(r'class=["\'][^"\']*["\']','class="reference"', tag, flags=re.I)
    block = re.sub(r'<p[^>]*>', fix_p, block, flags=re.I)

    # <span> -> <em>
    block = re.sub(r'</?span>', lambda mm: '</em>' if mm.group(0).startswith('</') else '<em>', block, flags=re.I)

    # link attrs
    def link_repl(mm):
        pre, url, post = mm.group(1), mm.group(3), mm.group(4)
        meta = (pre+post).lower()
        if 'target=' not in meta: post += ' target="_blank"'
        if 'rel=' not in meta:    post += ' rel="noopener"'
        if 'onclick=' not in meta: post += ' onclick="_gaq.push([\'_trackEvent\',\'Notes Link\',\'Click\', this.href]);"'
        return f'<a{pre}href="{url}"{post}>'
    block = re.sub(r'<a([^>]*?)href=(["\'])(.*?)\2([^>]*)>', link_repl, block, flags=re.I)

    return html[:start] + block + html[end:]

def insert_bio_after_references(html: str) -> str:
    if re.search(r'<div[^>]*class=["\'][^"\']*\bbio-card\b', html, flags=re.I):
        return html

    block = re.search(
        r'(<h3[^>]*>\s*References\s*</h3>)((?:\s*<p\s+class="reference"[^>]*>[\s\S]*?</p>)+)',
        html, flags=re.I
    )
    if block:
        s, e = block.span()
        head, refs = block.group(1), block.group(2)
        return html[:s] + head + refs + '\n' + BIO_T + html[e:]

    if re.search(r'<h3[^>]*>\s*References\s*</h3>', html, flags=re.I):
        return re.sub(r'(<h3[^>]*>\s*References\s*</h3>)', r'\1\n' + BIO_T + '\n', html, count=1, flags=re.I)

    return re.sub(r'</article>|</body>', BIO_T + '\n' + r'\g<0>', html, flags=re.I)

def final_cleanup(html: str) -> str:
    html = html.replace('<!--__AFTER_PUBDATE__-->', '').replace('<!--__AFTER_PDF__-->', '')
    html = re.sub(r'\n{3,}', '\n\n', html)
    return html

def main():
    if len(sys.argv) < 3:
        print('Usage: python tools/article_swapper.py input.html output.html')
        sys.exit(1)
    in_file, out_file = Path(sys.argv[1]), Path(sys.argv[2])

    html = in_file.read_text(encoding='utf-8')

    out = inject_css(html)
    out = expand_photo_tokens(out)
    out = normalize_header(out)
    out = insert_pdf_after_date(out)
    out = hoist_main_after_pdf(out)
    out = normalize_references(out)
    out = insert_bio_after_references(out)
    out = final_cleanup(out)

    Path(out_file).write_text(out, encoding='utf-8')
    print(f'Wrote {out_file}')

if __name__ == '__main__':
    main()
