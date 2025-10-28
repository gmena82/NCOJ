const fs = require('fs');

const CSS_PATH   = 'templates/article-style-inline.css.html';
const MAIN_TPL   = 'templates/snippets/image-card-Main.html';
const LEFT_TPL   = 'templates/snippets/image-card-Left.html';
const RIGHT_TPL  = 'templates/snippets/image-card-Right.html';
const BIO_TPL    = 'templates/snippets/bio.html';
const PDF_TPL    = 'templates/snippets/pdf-button.html';

function load(p){ return fs.readFileSync(p, 'utf8'); }

/* Inject CSS before </head>, else right after <body>, else at very top */
function injectCss(html, css){
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, css + '\n</head>');
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, (m)=> m + '\n' + css + '\n');
  return css + '\n' + html;
}

/* Expand [photo left|right|main] tokens into our snippets */
function expandPhotoTokens(html, tpls){
  return html.replace(/\[photo\s+(left|right|main)\]/gi, (_, pos)=>{
    const p = pos.toLowerCase();
    return p==='left' ? tpls.left : p==='right' ? tpls.right : tpls.main;
  });
}

function ensureClassOnHeader(openTag){
  if (/class=/i.test(openTag)){
    return openTag.replace(/class=(['"])(.*?)\1/i, (m,q,cls)=>{
      if (/\barticle-header\b/i.test(cls)) return m;
      return `class=${q}${cls} article-header${q}`;
    });
  }
  return openTag.replace(/>$/, ' class="article-header">');
}

/* Normalize header (works with <header> with or without class) and insert marker after date */
function normalizeHeader(html){
  return html.replace(/(<header[^>]*>)([\s\S]*?)(<\/header>)/i, (whole, open, inner, close)=>{
    let newOpen = ensureClassOnHeader(open);
    let body = inner;

    // Author -> h3.author (supports <p><strong>By …</strong></p> and <p>By …</p>)
    body = body.replace(/<p[^>]*>\s*(?:<strong>)?\s*By\s+([^<]+?)(?:<\/strong>)?\s*<\/p>/i,
                        (_m, name)=> `<h3 class="author">By ${name.trim()}</h3>`);

    // Org -> first remaining <p> after author -> h4.org
    body = body.replace(
      /(<h3[^>]*class=["'][^"']*author[^"']*["'][^>]*>[\s\S]*?<\/h3>)([\s\S]*?)(<p(?![^>]*class=["'][^"']*pubdate)[^>]*>[\s\S]*?<\/p>)/i,
      (_m, author, mid, orgP)=> `${author}${mid}${orgP.replace(/^<p/i,'<h4 class="org"').replace(/<\/p>$/i,'</h4>')}`
    );

    // Date -> ensure <p class="pubdate">…</p>
    if (!/<p[^>]*class=["'][^"']*pubdate/i.test(body)){
      body = body.replace(/<p>([A-Za-z]{3,}\s+\d{1,2},\s+\d{4})<\/p>/, '<p class="pubdate">$1</p>');
      if (!/<p[^>]*class=["'][^"']*pubdate/i.test(body)){
        // If still no date, append placeholder
        body = body.replace(/$/, '\n<p class="pubdate">(date goes here)</p>');
      }
    }

    // Place a marker after pubdate for later PDF/Main insertion
    body = body.replace(/(<p[^>]*class=["'][^"']*pubdate[^"']*["'][^>]*>[\s\S]*?<\/p>)/i, '$1\n<!--__AFTER_PUBDATE__-->');

    return `${newOpen}${body}${close}`;
  });
}

/* Insert PDF after date. If an existing PDF link already exists in header, tag it instead of adding a duplicate. */
function insertPdfAfterDate(html, pdfTpl){
  // Find header block
  const m = html.match(/(<header[^>]*>)([\s\S]*?)(<\/header>)/i);
  if (!m) return html;
  const [whole, open, inner, close] = m;

  // If header already contains a PDF link, append marker after that <p>
  if (/(pdficon_small\.png|Download the PDF)/i.test(inner)){
    const tagged = inner.replace(/(<p[^>]*>[\s\S]*?(?:pdficon_small\.png|Download the PDF)[\s\S]*?<\/p>)/i, '$1\n<!--__AFTER_PDF__-->');
    return html.replace(whole, `${open}${tagged}${close}`);
  }

  // Otherwise, insert our PDF template after the pubdate marker
  if (html.includes('<!--__AFTER_PUBDATE__-->')){
    return html.replace('<!--__AFTER_PUBDATE__-->', `${pdfTpl}\n<!--__AFTER_PDF__-->`);
  }

  // Fallback: at end of header
  return html.replace(/<\/header>/i, `${pdfTpl}\n<!--__AFTER_PDF__-->\n</header>`);
}

/* Move first Main image to right after PDF; if none exists, insert a placeholder Main image */
function hoistMainAfterPdf(html, mainTpl){
  const mainRe = /<figure[^>]*class=["'][^"']*\bimage-card\b[^"']*\bMain\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/i;
  const found = mainRe.exec(html);

  if (!html.includes('<!--__AFTER_PDF__-->')) return html;

  if (found){
    const block = found[0];
    const without = html.slice(0, found.index) + html.slice(found.index + block.length);
    return without.replace('<!--__AFTER_PDF__-->', `${block}\n<!--__AFTER_PDF__-->`);
  }
  // No Main exists: insert placeholder
  return html.replace('<!--__AFTER_PDF__-->', `${mainTpl}\n<!--__AFTER_PDF__-->`);
}

/* References: ensure <p class="reference">, <span>-><em>, add link attrs */
function normalizeReferences(html){
  const refsH3 = /<h3[^>]*>\s*References\s*<\/h3>/i;
  if (!refsH3.test(html)) return html;

  return html.replace(
    /(<h3[^>]*>\s*References\s*<\/h3>)([\s\S]*?)(?=(<\/section>|<h2|<h3|<\/article>|<\/div>\s*<\/div>\s*<\/div>|$))/i,
    (whole, h3, block, tail) => {
      let out = block;

      // p -> class="reference"
      out = out.replace(/<p(?![^>]*class=)[^>]*>/gi, '<p class="reference">');
      out = out.replace(/<p\s+class=(['"])(?![^'"]*\breference\b)[^'"]*\1/gi,
        m => m.replace(/class=(['"])[^'"]*\1/, 'class="reference"'));

      // <span> -> <em>
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

      return h3 + out;
    }
  );
}

/* Bio after References if missing */
function insertBioIfMissing(html, bioTpl){
  if (/<div[^>]*class=["'][^"']*bio-card/i.test(html)) return html;
  const refsH3 = /<h3[^>]*>\s*References\s*<\/h3>/i;
  if (!refsH3.test(html)) {
    return html.replace(/<\/article>|<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/i, (m)=> bioTpl + '\n' + m);
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
if (require.main === module){
  const [,, inFile, outFile] = process.argv;
  if (!inFile || !outFile){
    console.error('Usage: node tools/article_swapper.js input.html output.html');
    process.exit(1);
  }
  const css    = load(CSS_PATH);
  const html   = load(inFile);
  const tpls   = { main: load(MAIN_TPL), left: load(LEFT_TPL), right: load(RIGHT_TPL) };
  const bioTpl = load(BIO_TPL);
  const pdfTpl = load(PDF_TPL);

  let out = injectCss(html, css);              // ensure CSS is present
  out = expandPhotoTokens(out, tpls);          // expand any [photo …] tokens
  out = normalizeHeader(out);                  // author/org/date (add class + marker)
  out = insertPdfAfterDate(out, pdfTpl);       // place/mark PDF after date (dedupe-safe)
  out = hoistMainAfterPdf(out, tpls.main);     // place Main image right after PDF (or placeholder)
  out = normalizeReferences(out);              // proper <p class="reference"> + link attrs
  out = insertBioIfMissing(out, bioTpl);       // add bio if missing

  fs.writeFileSync(outFile, out, 'utf8');
  console.log(`Wrote ${outFile}`);
}
