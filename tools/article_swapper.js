const fs = require('fs');

const CSS_PATH   = 'templates/article-style-inline.css.html';
const MAIN_TPL   = 'templates/snippets/image-card-Main.html';
const LEFT_TPL   = 'templates/snippets/image-card-Left.html';
const RIGHT_TPL  = 'templates/snippets/image-card-Right.html';
const BIO_TPL    = 'templates/snippets/bio.html';

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

/* === NEW: normalize article header ===
   - <p>By NAME</p> -> <h3 class="author">By NAME</h3>
   - Next org <p>...</p> -> <h4 class="org">...</h4>
   - Ensure date line exists -> <p class="pubdate">(date goes here)</p> (if not found)
*/
function normalizeHeader(html) {
  return html.replace(
    /(<header[^>]*class=["'][^"']*article-header[^"']*["'][^>]*>)([\s\S]*?)(<\/header>)/i,
    (whole, open, inner, close) => {
      let body = inner;

      // Author: p starting with "By "
      body = body.replace(/<p>\s*By\s+([^<]+?)\s*<\/p>/i, (_m, name) =>
        `<h3 class="author">By ${name}</h3>`
      );

      // Org: the first <p> AFTER author becomes h4.org (if it exists and isn't a date)
      // Simple heuristic: promote the very first remaining <p> to h4.org
      body = body.replace(/(<h3[^>]*class=["'][^"']*author[^"']*["'][^>]*>[\s\S]*?<\/h3>)([\s\S]*?)(<p>(?!\s*By\s)[\s\S]*?<\/p>)/i,
        (_m, authorBlock, mid, orgP) => `${authorBlock}${mid}${orgP.replace(/^<p>/i,'<h4 class="org">').replace(/<\/p>$/i,'<\/h4>')}`
      );

      // Date: ensure a date line exists; if we do not detect a month/day/year, insert placeholder after org or author
      const hasDate = /<p[^>]*class=["'][^"']*pubdate[^"']*["'][^>]*>[\s\S]*?<\/p>|<time|<\/time>|[A-Za-z]{3,}\s+\d{1,2},\s+\d{4}/.test(body);
      if (!hasDate) {
        // insert after org if present; else after author
        if (/<h4[^>]*class=["'][^"']*org/i.test(body)) {
          body = body.replace(/(<h4[^>]*class=["'][^"']*org[^"']*["'][^>]*>[\s\S]*?<\/h4>)/i,
            '$1\n<p class="pubdate">(date goes here)</p>');
        } else if (/<h3[^>]*class=["'][^"']*author/i.test(body)) {
          body = body.replace(/(<h3[^>]*class=["'][^"']*author[^"']*["'][^>]*>[\s\S]*?<\/h3>)/i,
            '$1\n<p class="pubdate">(date goes here)</p>');
        } else {
          // fallback: append at end of header
          body = body.replace(/$/, '\n<p class="pubdate">(date goes here)</p>');
        }
      }

      return `${open}${body}${close}`;
    }
  );
}

/* === NEW: ensure bio after References section ===
   - If no bio container exists, insert bio snippet after the References section.
*/
function insertBioIfMissing(html, bioTpl) {
  if (/<div[^>]*class=["'][^"']*bio-card/i.test(html)) return html; // already present

  const refsH3 = /<h3[^>]*>\s*References\s*<\/h3>/i;
  if (!refsH3.test(html)) {
    // If no explicit References, append to the main container
    return html.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/i, `${bioTpl}\n$&`);
  }

  // Insert after the section that contains References heading (closest closing </section> after it)
  const idx = html.search(/<h3[^>]*>\s*References\s*<\/h3>/i);
  if (idx === -1) return html;

  // Find the closing </section> after References
  const afterRefs = html.slice(idx);
  const closeSec = afterRefs.search(/<\/section>/i);
  if (closeSec !== -1) {
    const insertAt = idx + closeSec + '</section>'.length;
    return html.slice(0, insertAt) + '\n' + bioTpl + '\n' + html.slice(insertAt);
  }

  // Fallback: insert right after the References heading
  return html.replace(/(<h3[^>]*>\s*References\s*<\/h3>)/i, `$1\n${bioTpl}\n`);
}

/*
USAGE:
node tools/article_swapper.js input.html output.html
- Injects CSS at top
- Expands [photo main|left|right] tokens into image-card containers with placeholders
- Normalizes header: author -> h3.author, org -> h4.org, adds date if missing
- Ensures a bio container appears after the References section
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

  let out = injectCssAtTop(html, css);
  out = expandPhotoTokens(out, tpls);
  out = normalizeHeader(out);
  out = insertBioIfMissing(out, bio);

  fs.writeFileSync(outFile, out, 'utf8');
  console.log(`Wrote ${outFile}`);
}


