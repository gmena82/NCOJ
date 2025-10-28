from pathlib import Path
import re
import sys

CSS_PATH  = Path('templates/article-style-inline.css.html')
MAIN_TPL  = Path('templates/snippets/image-card-Main.html')
LEFT_TPL  = Path('templates/snippets/image-card-Left.html')
RIGHT_TPL = Path('templates/snippets/image-card-Right.html')
BIO_TPL   = Path('templates/snippets/bio.html')

def inject_css_at_top(html: str, css: str) -> str:
    m = re.search(r'<div[^>]*class=["\']([^"\']*)container-fluid', html, flags=re.I)
    return (html[:m.start()] + css + '\n' + html[m.start():]) if m else (css + '\n' + html)

def expand_photo_tokens(html: str, main_tpl: str, left_tpl: str, right_tpl: str) -> str:
    def repl(match):
        pos = match.group(1).lower()
        return {'left':left_tpl,'right':right_tpl,'main':main_tpl}[pos]
    return re.sub(r'\[photo\s+(left|right|main)\]', repl, html, flags=re.I)

def normalize_header(html: str) -> str:
    header_re = re.compile(r'(<header[^>]*class=["\'][^"\']*article-header[^"\']*["\'][^>]*>)([\s\S]*?)(</header>)', re.I)
    m = header_re.search(html)
    if not m: 
        return html
    open_tag, inner, close_tag = m.groups()
    body = inner

    # Author: <p>By ...</p> -> <h3 class="author">By ...</h3>
    body = re.sub(r'<p>\s*By\s+([^<]+?)\s*</p>', r'<h3 class="author">By \1</h3>', body, flags=re.I)

    # Org: first remaining <p> after author -> <h4 class="org">...</h4>
    body = re.sub(r'(<h3[^>]*class=["\'][^"\']*author[^"\']*["\'][^>]*>[\s\S]*?</h3>)([\s\S]*?)(<p>(?!\s*By\s)[\s\S]*?</p>)',
                  lambda mm: mm.group(1) + mm.group(2) + mm.group(3).replace('<p>','<h4 class="org">').replace('</p>','</h4>'),
                  body, count=1, flags=re.I)

    # Date present?
    has_date = bool(re.search(r'<p[^>]*class=["\'][^"\']*pubdate[^"\']*["\'][^>]*>.*?</p>|<time|[A-Za-z]{3,}\s+\d{1,2},\s+\d{4}', body, flags=re.I))
    if not has_date:
        if re.search(r'<h4[^>]*class=["\'][^"\']*org', body, flags=re.I):
            body = re.sub(r'(<h4[^>]*class=["\'][^"\']*org[^"\']*["\'][^>]*>[\s\S]*?</h4>)',
                          r'\1\n<p class="pubdate">(date goes here)</p>', body, count=1, flags=re.I)
        elif re.search(r'<h3[^>]*class=["\'][^"\']*author', body, flags=re.I):
            body = re.sub(r'(<h3[^>]*class=["\'][^"\']*author[^"\']*["\'][^>]*>[\s\S]*?</h3>)',
                          r'\1\n<p class="pubdate">(date goes here)</p>', body, count=1, flags=re.I)
        else:
            body = body + '\n<p class="pubdate">(date goes here)</p>'

    new_header = f'{open_tag}{body}{close_tag}'
    return html[:m.start()] + new_header + html[m.end():]

def normalize_references(html: str) -> str:
    refs_head = re.search(r'(<h3[^>]*>\s*References\s*</h3>)', html, flags=re.I)
    if not refs_head:
        return html

    start = refs_head.end()
    boundary = re.search(r'(</section>|<h2\b|<h3\b|</div>\s*</div>\s*</div>)', html[start:], flags=re.I)
    end = start + boundary.start() if boundary else len(html)

    block = html[start:end]

    def fix_p(match: re.Match) -> str:
        tag = match.group(0)
        if re.search(r'class=["\'][^"\']*reference', tag, flags=re.I):
            return re.sub(r'class=["\'][^"\']*["\']', 'class="reference"', tag, count=1, flags=re.I)
        if re.search(r'class=', tag, flags=re.I):
            return re.sub(r'class=["\'][^"\']*["\']', 'class="reference"', tag, count=1, flags=re.I)
        return re.sub(r'<p', '<p class="reference"', tag, count=1, flags=re.I)

    block = re.sub(r'<p[^>]*>', fix_p, block, flags=re.I)
    block = re.sub(r'<span\b[^>]*>', '<em>', block, flags=re.I)
    block = re.sub(r'</span>', '</em>', block, flags=re.I)

    def fix_link(match: re.Match) -> str:
        pre, quote, url, post = match.groups()
        attrs_lower = (pre + post).lower()
        new_post = post
        if 'target=' not in attrs_lower:
            new_post += ' target="_blank"'
        if 'rel=' not in attrs_lower:
            new_post += ' rel="noopener"'
        if 'onclick=' not in attrs_lower:
            new_post += ' onclick="_gaq.push([\'_trackEvent\',\'Notes Link\',\'Click\', this.href]);"'
        return f'<a{pre}href={quote}{url}{quote}{new_post}>'

    block = re.sub(r'<a([^>]*?)href=(["\'])(.*?)\2([^>]*)>', fix_link, block, flags=re.I)

    return html[:start] + block + html[end:]

def insert_bio_if_missing(html: str, bio_tpl: str) -> str:
    if re.search(r'<div[^>]*class=["\'][^"\']*bio-card', html, flags=re.I):
        return html
    ref_h3 = re.search(r'<h3[^>]*>\s*References\s*</h3>', html, flags=re.I)
    if not ref_h3:
        # Append at end of main container
        return re.sub(r'</div>\s*</div>\s*</div>\s*</body>', bio_tpl + '\n\\g<0>', html, flags=re.I)
    idx = ref_h3.start()
    after_refs = html[idx:]
    close_sec = re.search(r'</section>', after_refs, flags=re.I)
    if close_sec:
        insert_at = idx + close_sec.end()
        return html[:insert_at] + '\n' + bio_tpl + '\n' + html[insert_at:]
    return html.replace(ref_h3.group(0), ref_h3.group(0) + '\n' + bio_tpl + '\n', 1)

def main():
    if len(sys.argv) < 3:
        print('Usage: python tools/article_swapper.py input.html output.html')
        sys.exit(1)
    in_file, out_file = Path(sys.argv[1]), Path(sys.argv[2])
    css   = CSS_PATH.read_text(encoding='utf-8')
    html  = in_file.read_text(encoding='utf-8')
    main_tpl  = MAIN_TPL.read_text(encoding='utf-8')
    left_tpl  = LEFT_TPL.read_text(encoding='utf-8')
    right_tpl = RIGHT_TPL.read_text(encoding='utf-8')
    bio_tpl   = BIO_TPL.read_text(encoding='utf-8')

    out = inject_css_at_top(html, css)
    out = expand_photo_tokens(out, main_tpl, left_tpl, right_tpl)
    out = normalize_header(out)
    out = normalize_references(out)
    out = insert_bio_if_missing(out, bio_tpl)

    Path(out_file).write_text(out, encoding='utf-8')
    print(f'Wrote {out_file}')

if __name__ == '__main__':
    main()


