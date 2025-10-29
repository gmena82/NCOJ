from pathlib import Path
import re
import sys

CSS_PATH  = Path('templates/article-style-inline.css.html')
MAIN_TPL  = Path('templates/snippets/image-card-Main.html')
LEFT_TPL  = Path('templates/snippets/image-card-Left.html')
RIGHT_TPL = Path('templates/snippets/image-card-Right.html')
BIO_TPL   = Path('templates/snippets/bio.html')
PDF_TPL   = Path('templates/snippets/pdf-button.html')

CSS_SENTINEL = '/* =========================\n       Tokens'

def inject_css(html: str, css: str) -> str:
    if CSS_SENTINEL in html:
        return html
    if re.search(r'</head>', html, flags=re.I):
        return re.sub(r'</head>', css + '\n</head>', html, count=1, flags=re.I)
    if re.search(r'<body[^>]*>', html, flags=re.I):
        return re.sub(r'(<body[^>]*>)', r'\1\n' + css + '\n', html, count=1, flags=re.I)
    return css + '\n' + html

def expand_photo_tokens(html: str, main_tpl: str, left_tpl: str, right_tpl: str) -> str:
    def repl(m):
        pos = m.group(1).lower()
        return {'left': left_tpl, 'right': right_tpl, 'main': main_tpl}[pos]
    return re.sub(r'\[photo\s+(left|right|main)\]', repl, html, flags=re.I)

def ensure_class_on_header(open_tag: str) -> str:
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
    open_tag = ensure_class_on_header(open_tag)
    body = inner

    # Author
    body = re.sub(r'<p[^>]*>\s*(?:<strong>)?\s*By\s*[:—-]?\s+([^<]+?)(?:</strong>)?\s*</p>',
                  lambda mm: f'<h3 class="author">By {mm.group(1).strip()}</h3>',
                  body, count=1, flags=re.I)

    # Org (first remaining p after author)
    body = re.sub(r'(<h3[^>]*class=["\'][^"\']*\bauthor\b[^"\']*["\'][^>]*>[\s\S]*?</h3>)([\s\S]*?)(<p(?![^>]*class=["\'][^"\']*pubdate)[\s\S]*?</p>)',
                  lambda mm: mm.group(1) + mm.group(2) + mm.group(3).replace('<p','<h4 class="org"').replace('</p>','</h4>'),
                  body, count=1, flags=re.I)

    # Pubdate
    if not re.search(r'<p[^>]*class=["\'][^"\']*\bpubdate\b', body, flags=re.I):
        body = re.sub(r'<p>([A-Za-z]{3,}\s+\d{1,2},\s+\d{4})</p>',
                      r'<p class="pubdate">\1</p>', body, count=1, flags=re.I)
        if not re.search(r'<p[^>]*class=["\'][^"\']*\bpubdate\b', body, flags=re.I):
            body += '\n<p class="pubdate">(date goes here)</p>'

    # Marker after pubdate
    body = re.sub(r'(<p[^>]*class=["\'][^"\']*\bpubdate\b[^"\']*["\'][^>]*>[\s\S]*?</p>)',
                  r'\1\n<!--__AFTER_PUBDATE__-->', body, count=1, flags=re.I)

    new_header = f'{open_tag}{body}{close_tag}'
    return html[:m.start()] + new_header + html[m.end():]

def insert_pdf_after_date(html: str, pdf_tpl: str) -> str:
    hm = re.search(r'(<header[^>]*>)([\s\S]*?)(</header>)', html, flags=re.I)
    if not hm:
        return html
    open_tag, inner, close_tag = hm.groups()

    if re.search(r'(pdficon_small\.png|Download the PDF)', inner, flags=re.I):
        inner = re.sub(r'(<p[^>]*>[\s\S]*?(?:pdficon_small\.png|Download the PDF)[\s\S]*?</p>)',
                       r'\1\n<!--__AFTER_PDF__-->', inner, count=1, flags=re.I)
        return html[:hm.start()] + open_tag + inner + close_tag + html[hm.end():]

    if '<!--__AFTER_PUBDATE__-->' in html:
        return html.replace('<!--__AFTER_PUBDATE__-->', pdf_tpl + '\n<!--__AFTER_PDF__-->')

    return re.sub(r'</header>', pdf_tpl + '\n<!--__AFTER_PDF__-->\n</header>', html, count=1, flags=re.I)

def hoist_main_after_pdf(html: str, main_tpl: str) -> str:
    if '<!--__AFTER_PDF__-->' not in html:
        return html
    m = re.search(r'<figure[^>]*class=["\'][^"\']*\bimage-card\b[^"\']*\bMain\b[^"\']*["\'][^>]*>[\s\S]*?</figure>', html, flags=re.I)
    if m:
        block = m.group(0)
        without = html[:m.start()] + html[m.end():]
        return without.replace('<!--__AFTER_PDF__-->', block + '\n<!--__AFTER_PDF__-->')
    return html.replace('<!--__AFTER_PDF__-->', main_tpl + '\n<!--__AFTER_PDF__-->')

def normalize_references(html: str) -> str:
    refs_head = re.search(r'(<h3[^>]*>\s*References\s*</h3>)', html, flags=re.I)
    if not refs_head:
        return html
    start = refs_head.end()
    tail_match = re.search(r'(</section>|<h2|<h3|</article>|</div>\s*</div>\s*</div>|$)', html[start:], flags=re.I)
    end = start + (tail_match.start() if tail_match else 0)
    block = html[start:end]

    def fix_p(m):
        tag = m.group(0)
        if re.search(r'class=["\'][^"\']*\breference\b', tag, flags=re.I):
            return tag
        if not re.search(r'class=', tag, flags=re.I):
            return tag.replace('<p','<p class="reference"', 1)
        return re.sub(r'class=["\'][^"\']*["\']', 'class="reference"', tag, flags=re.I)
    block = re.sub(r'<p[^>]*>', fix_p, block, flags=re.I)

    block = re.sub(r'</?span>', lambda mm: '</em>' if mm.group(0).startswith('</') else '<em>', block, flags=re.I)

    def link_repl(mm):
        pre, quote, url, post = mm.group(1), mm.group(2), mm.group(3), mm.group(4)
        meta = (pre + post).lower()
        if 'target=' not in meta:
            post += ' target="_blank"'
        if 'rel=' not in meta:
            post += ' rel="noopener"'
        if 'onclick=' not in meta:
            post += ' onclick="_gaq.push([\'_trackEvent\',\'Notes Link\',\'Click\', this.href]);"'
        return f'<a{pre}href="{url}"{post}>'
    block = re.sub(r'<a([^>]*?)href=(["\'])(.*?)\2([^>]*)>', link_repl, block, flags=re.I)

    return html[:start] + block + html[end:]

def insert_bio_if_missing(html: str, bio_tpl: str) -> str:
    if re.search(r'<div[^>]*class=["\'][^"\']*\bbio-card\b', html, flags=re.I):
        return html
    ref_h3 = re.search(r'<h3[^>]*>\s*References\s*</h3>', html, flags=re.I)
    if not ref_h3:
        return re.sub(r'</article>|</div>\s*</div>\s*</div>\s*</body>', bio_tpl + '\n\\g<0>', html, flags=re.I)
    idx = ref_h3.start()
    after_refs = html[idx:]
    close_sec = re.search(r'</section>', after_refs, flags=re.I)
    if close_sec:
        insert_at = idx + close_sec.end()
        return html[:insert_at] + '\n' + bio_tpl + '\n' + html[insert_at:]
    return html.replace(ref_h3.group(0), ref_h3.group(0) + '\n' + bio_tpl + '\n', 1)

def final_cleanup(html: str) -> str:
    html = html.replace('<!--__AFTER_PUBDATE__-->', '').replace('<!--__AFTER_PDF__-->', '')
    html = re.sub(r'\n{3,}', '\n\n', html)
    return html

def main():
    if len(sys.argv) < 3:
        print('Usage: python tools/article_swapper.py input.html output.html')
        sys.exit(1)
    in_file, out_file = Path(sys.argv[1]), Path(sys.argv[2])

    css     = CSS_PATH.read_text(encoding='utf-8')
    html    = in_file.read_text(encoding='utf-8')
    main_t  = MAIN_TPL.read_text(encoding='utf-8')
    left_t  = LEFT_TPL.read_text(encoding='utf-8')
    right_t = RIGHT_TPL.read_text(encoding='utf-8')
    bio_t   = BIO_TPL.read_text(encoding='utf-8')
    pdf_t   = PDF_TPL.read_text(encoding='utf-8')

    out = inject_css(html, css)
    out = expand_photo_tokens(out, main_t, left_t, right_t)
    out = normalize_header(out)
    out = insert_pdf_after_date(out, pdf_t)
    out = hoist_main_after_pdf(out, main_t)
    out = normalize_references(out)
    out = insert_bio_if_missing(out, bio_t)
    out = final_cleanup(out)

    Path(out_file).write_text(out, encoding='utf-8')
    print(f'Wrote {out_file}')

if __name__ == '__main__':
    main()
