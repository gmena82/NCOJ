const fs = require('fs');

const CSS_PATH   = 'templates/article-style-inline.css.html';
const MAIN_TPL   = 'templates/snippets/image-card-Main.html';
const LEFT_TPL   = 'templates/snippets/image-card-Left.html';
const RIGHT_TPL  = 'templates/snippets/image-card-Right.html';
const BIO_TPL    = 'templates/snippets/bio.html';
const PDF_TPL    = 'templates/snippets/pdf-button.html';

function load(p) { return fs.readFileSync(p, 'utf8'); }

function injectCssAtTop(html, css) {
  const re = /<div[^>]*class=["'][^"']*container-fluid/ig;
  const m = re.exec(html);
  return m ? html.slice(0, m.index) + css + '\n' + html.slice(m.index) : css + '\n' + html;
}

function expandPhotoTokens(html, tpls) {
  return html.replace(/\[photo\s+(left|right|main)\]/gi, (_, pos) => {
    const p = pos.toLowerCase();
    if (p === 'left')  return tpls.left;
    if (p === 'right') return tpls.right;
    return tpls.main;
  });
}

function normalizeHeader(html) {
  return html.replace(
    /(<header[^>]*class=["'][^"']*article-header[^"']*["'][^>]*>)([\s\S]*?)(<\/header>)/i,
    (whole, open, inner, close) => {
      let body = inner;

      // Author -> h3.author
      body = body.replace(/<p>\s*By\s+([^<]+?)\s*<\/p>/i, (_m, name) =>
        `<h3 class="author">By ${name}</h3>`
      );

      // Org -> h4.org (first remaining p after author)
      body = body.replace(
        /(<h3[^>]*class=["'][^"']*author[^"']*["'][^>]*>[\s\S]*?<\/h3>)([\s\S]*?)(<p>(?!\s*By\s)[\s\S]*?<\/p>)/i,
        (_m, authorBlock, mid, orgP) => `${authorBlock}${mid}${orgP.replace(/^<p>/i,'<h4 class="org">').replace(/<\/p>$/i,'<\/h4>')}`
      );

      // Ensure date
      const hasDate = /<p[^>]*class=["'][^"']*pubdate[^"']*["'][^>]*>[\s\S]*?<\/p>|<time|[A-Za-z]{3,}\s+\d{1,2},\s+\d{4}/.test(body);
      if (!hasDate) {
        if (/<h4[^>]*class=["'][^"']*org/i.test(body)) {
          body = body.replace(/(<h4[^>]*class=["'][^"']*org[^"']*["'][^>]*>[\s\S]*?<\/h4>)/i,
            '$1\n<p class="pubdate">(date goes here)</p>');
        } else if (/<h3[^>]*class=["'][^"']*author/i.test(body)) {
          body = body.replace(/(<h3[^>]*class=["'][^"']*author[^"']*["'][^>]*>[\s\S]*?<\/h3>)/i,
            '$1\n<p class="pubdate">(date goes here)</p>');
        } else {
          body = body.replace(/$/, '\n<p class="pubdate">(date goes here)</p>');
        }
      }

      // Insert marker after pubdate for later PDF/Main injection
      body = body.replace(/(<p[^>]*class=["'][^"']*pubdate[^"']*["'][^>]*>[\s\S]*?<\/p>)/i, '$1\n<!--__AFTER_PUBDATE__-->');

      return `${open}${body}${close}`;
    }
  );
}

// Insert PDF button right after the date (or after author/org if date missing fallback marker not found)
function insertPdfAfterDate(html, pdfTpl) {
  if (html.includes('<!--__AFTER_PUBDATE__-->')) {
    return html.replace('<!--__AFTER_PUBDATE__-->', `${pdfTpl}\n<!--__AFTER_PDF__-->`);
  }
  // Fallback: insert at end of header
  return html.replace(/(<header[^>]*class=["'][^"']*article-header[^"']*["'][^>]*>[\s\S]*?<\/header>)/i,
    (m)=> m.replace(/<\/header>/i, `${pdfTpl}\n<!--__AFTER_PDF__-->\n<\/header>`));
}

// Move the first Main image card to immediately after PDF (or create placeholder if none)
function hoistMainImageAfterPdf(html, mainTpl) {
  // Find first Main figure
  const mainRe = /<figure[^>]*class=["'][^"']*\bimage-card\b[^"']*\bMain\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/i;
  const found = mainRe.exec(html);

  if (html.includes('<!--__AFTER_PDF__-->')) {
    if (found) {
      const block = found[0];
      // remove original
      let without = html.slice(0, found.index) + html.slice(found.index + block.length);
      // insert after PDF marker
      return without.replace('<!--__AFTER_PDF__-->', `${block}\n<!--__AFTER_PDF__-->`);
    } else {
      // No Main provided—insert placeholder Main
      return html.replace('<!--__AFTER_PDF__-->', `${mainTpl}\n<!--__AFTER_PDF__-->`);
    }
  }
  return html; // no marker; leave as-is
}

/* References normalization */
function normalizeReferences(html){
  const refsH3 = /<h3[^>]*>\s*References\s*<\/h3>/i;
  if (!refsH3.test(html)) return html;

  return html.replace(
    /(<h3[^>]*>\s*References\s*<\/h3>)([\s\S]*?)(?=(<\/section>|<h2|<h3|<\/div>\s*<\/div>\s*<\/div>|$))/i,
    (whole, h3, block, tailStart) => {
      let out = block;

      // paragraphs -> class="reference"
      out = out.replace(/<p(?![^>]*class=)[^>]*>/gi, '<p class="reference">');
      out = out.replace(/<p\s+class=(['"])(?![^'"]*\breference\b)[^'"]*\1(\s*)/gi,
        (_m, _quote, space) => `<p class="reference"${space}`);

      // <span> -> <em> in refs
      out = out.replace(/<\/?span>/gi, m => m[1] === '/' ? '</em>' : '<em>');

      // link attrs
      out = out.replace(/<a([^>]*?)href=(['"])(.*?)\2([^>]*)>/gi, (_m, pre, q, url, post) => {
        const hasTarget = /target=/i.test(pre+post);
        const hasRel    = /rel=/i.test(pre+post);
        const hasOnclick= /onclick=/i.test(pre+post);
        const target = hasTarget ? '' : ' target="_blank"';
        const rel    = hasRel ? '' : ' rel="noopener"';
        const onclick= hasOnclick ? '' : ' onclick="_gaq.push([\'_trackEvent\',\'Notes Link\',\'Click\', this.href]);"';
        return `<a${pre}href="${url}"${post}${target}${rel}${onclick}>`;
      });

      return h3 + out + (tailStart ?? '');
    }
  );
}

function insertBioIfMissing(html, bioTpl) {
  if (/<div[^>]*class=["'][^"']*bio-card/i.test(html)) return html;
  const refsH3 = /<h3[^>]*>\s*References\s*<\/h3>/i;
  if (!refsH3.test(html)) {
    return html.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/i, `${bioTpl}\n$&`);
  }
  const idx = html.search(/<h3[^>]*>\s*References\s*<\/h3>/i);
  const afterRefs = html.slice(idx);
  const closeSec = afterRefs.search(/<\/section>/i);
  if (closeSec !== -1) {
    const insertAt = idx + closeSec + '</section>'.length;
    return html.slice(0, insertAt) + '\n' + bioTpl + '\n' + html.slice(insertAt);
  }
  return html.replace(/(<h3[^>]*>\s*References\s*<\/h3>)/i, `$1\n${bioTpl}\n`);
}

/*
USAGE:
node tools/article_swapper.js input.html output.html
*/
if (require.main === module) {
  const [,, inFile, outFile] = process.argv;
  if (!inFile || !outFile) {
    console.error('Usage: node tools/article_swapper.js input.html output.html');
    process.exit(1);
  }
  const css   = load(CSS_PATH);
  const html  = load(inFile);
  const tpls  = { main: load(MAIN_TPL), left: load(LEFT_TPL), right: load(RIGHT_TPL) };
  const bio   = load(BIO_TPL);
  const pdf   = load(PDF_TPL);

  let out = injectCssAtTop(html, css);
  out = expandPhotoTokens(out, tpls);          // turn [photo ...] into cards
  out = normalizeHeader(out);                  // author/org/date + marker
  out = insertPdfAfterDate(out, pdf);          // PDF button after date
  out = hoistMainImageAfterPdf(out, tpls.main);// ensure Main right after PDF
  out = normalizeReferences(out);              // fix refs paragraphs/links
  out = insertBioIfMissing(out, bio);          // bio after References

  fs.writeFileSync(outFile, out, 'utf8');
  console.log(`Wrote ${outFile}`);
}
