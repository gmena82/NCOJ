const fs = require('fs');

const CSS_PATH   = 'templates/article-style-inline.css.html';
const MAIN_TPL   = 'templates/snippets/image-card-Main.html';
const LEFT_TPL   = 'templates/snippets/image-card-Left.html';
const RIGHT_TPL  = 'templates/snippets/image-card-Right.html';
const BIO_TPL    = 'templates/snippets/bio.html';
const PDF_TPL    = 'templates/snippets/pdf-button.html';

function load(p){ return fs.readFileSync(p, 'utf8'); }

// A) CSS injection (idempotent)
const CSS_SENTINEL = '/* =========================\n       Tokens';
function injectCss(html, css){
  if (html.includes(CSS_SENTINEL)) return html; // already injected
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, css + '\n</head>');
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, (m)=> m + '\n' + css + '\n');
  return css + '\n' + html;
}

// Expand tokens
function expandPhotoTokens(html, tpls){
  return html.replace(/\[photo\s+(left|right|main)\]/gi, (_, pos)=>{
    const p = pos.toLowerCase();
    return p==='left' ? tpls.left : p==='right' ? tpls.right : tpls.main;
  });
}

// B) Header normalization
function ensureClassOnHeader(openTag){
  if (/class=/i.test(openTag)){
    return openTag.replace(/class=(["'])(.*?)\1/i, (m,q,cls)=>{
      return /\barticle-header\b/i.test(cls) ? m : `class=${q}${cls} article-header${q}`;
    });
  }
  return openTag.replace(/>$/, ' class="article-header">');
}

function normalizeHeader(html){
  return html.replace(/(<header[^>]*>)([\s\S]*?)(<\/header>)/i, (whole, open, inner, close)=>{
    let body = inner;
    open = ensureClassOnHeader(open);

    // Author -> h3.author (with/without <strong>)
    body = body.replace(/<p[^>]*>\s*(?:<strong>)?\s*By\s*[:—-]?\s+([^<]+?)(?:<\/strong>)?\s*<\/p>/i,
                        (_m, name)=> `<h3 class="author">By ${name.trim()}</h3>`);

    // Org -> first remaining p after author
    body = body.replace(
      /(<h3[^>]*class=["'][^"']*\bauthor\b[^"']*["'][^>]*>[\s\S]*?<\/h3>)([\s\S]*?)(<p(?![^>]*class=["'][^"']*pubdate)[^>]*>[\s\S]*?<\/p>)/i,
      (_m, author, mid, orgP)=> `${author}${mid}${orgP.replace(/^<p/i,'<h4 class="org"').replace(/<\/p>$/i,'</h4>')}`
    );

    // Pubdate
    if (!/<p[^>]*class=["'][^"']*\bpubdate\b/i.test(body)){
      body = body.replace(/<p>([A-Za-z]{3,}\s+\d{1,2},\s+\d{4})<\/p>/, '<p class="pubdate">$1</p>');
      if (!/<p[^>]*class=["'][^"']*\bpubdate\b/i.test(body)){
        body += '\n<p class="pubdate">(date goes here)</p>';
      }
    }

    // Marker after pubdate
    body = body.replace(/(<p[^>]*class=["'][^"']*\bpubdate\b[^"']*["'][^>]*>[\s\S]*?<\/p>)/i, '$1\n<!--__AFTER_PUBDATE__-->');

    return `${open}${body}${close}`;
  });
}

// C) PDF placement (de-dupe safe)
function insertPdfAfterDate(html, pdfTpl){
  const m = html.match(/(<header[^>]*>)([\s\S]*?)(<\/header>)/i);
  if (!m) return html;
  const [whole, open, inner, close] = m;

  if (/(pdficon_small\.png|Download the PDF)/i.test(inner)){
    const tagged = inner.replace(/(<p[^>]*>[\s\S]*?(?:pdficon_small\.png|Download the PDF)[\s\S]*?<\/p>)/i, '$1\n<!--__AFTER_PDF__-->');
    return html.replace(whole, `${open}${tagged}${close}`);
  }
  if (html.includes('<!--__AFTER_PUBDATE__-->')){
    return html.replace('<!--__AFTER_PUBDATE__-->', `${pdfTpl}\n<!--__AFTER_PDF__-->`);
  }
  return html.replace(/<\/header>/i, `${pdfTpl}\n<!--__AFTER_PDF__-->\n</header>`);
}

// D) Main image hoist / placeholder
function hoistMainAfterPdf(html, mainTpl){
  if (!html.includes('<!--__AFTER_PDF__-->')) return html;
  const mainRe = /<figure[^>]*class=["'][^"']*\bimage-card\b[^"']*\bMain\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/i;
  const found = mainRe.exec(html);
  if (found){
    const block = found[0];
    const without = html.slice(0, found.index) + html.slice(found.index + block.length);
    return without.replace('<!--__AFTER_PDF__-->', `${block}\n<!--__AFTER_PDF__-->`);
  }
  return html.replace('<!--__AFTER_PDF__-->', `${mainTpl}\n<!--__AFTER_PDF__-->`);
}

// E) References normalization
function normalizeReferences(html){
  const refsH3 = /<h3[^>]*>\s*References\s*<\/h3>/i;
  if (!refsH3.test(html)) return html;

  return html.replace(
    /(<h3[^>]*>\s*References\s*<\/h3>)([\s\S]*?)(?=(<\/section>|<h2|<h3|<\/article>|<\/div>\s*<\/div>\s*<\/div>|$))/i,
    (whole, h3, block, tail) => {
      let out = block;

      // p -> class="reference"
      out = out.replace(/<p(?![^>]*class=)[^>]*>/gi, '<p class="reference">');
      out = out.replace(/<p\s+class=(["'])(?![^"']*\breference\b)[^"']*\1/gi,
        m => m.replace(/class=(['"])[^'"]*\1/, 'class="reference"'));

      // <span> -> <em>
      out = out.replace(/<\/?span>/gi, m => m[1] === '/' ? '</em>' : '<em>');

      // link attrs
      out = out.replace(/<a([^>]*?)href=(["'])(.*?)\2([^>]*)>/gi, (_m, pre, q, url, post) => {
        const meta = (pre+post).toLowerCase();
        const target = meta.includes('target=') ? '' : ' target="_blank"';
        const rel    = meta.includes('rel=')    ? '' : ' rel="noopener"';
        const onclick= meta.includes('onclick=')? '' : ' onclick="_gaq.push([\'_trackEvent\',\'Notes Link\',\'Click\', this.href]);"';
        return `<a${pre}href="${url}"${post}${target}${rel}${onclick}>`;
      });

      return h3 + out + (tail ?? '');
    }
  );
}

// Bio after References (fallback safe)
function insertBioIfMissing(html, bioTpl){
  if (/<div[^>]*class=["'][^"']*\bbio-card\b/i.test(html)) return html;
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

// F) Final cleanup
function finalCleanup(html){
  return html
    .replace(/<!--__AFTER_PUBDATE__-->/g, '')
    .replace(/<!--__AFTER_PDF__-->/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

/* Runner */
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

  let out = injectCss(html, css);
  out = expandPhotoTokens(out, tpls);
  out = normalizeHeader(out);
  out = insertPdfAfterDate(out, pdfTpl);
  out = hoistMainAfterPdf(out, tpls.main);
  out = normalizeReferences(out);
  out = insertBioIfMissing(out, bioTpl);
  out = finalCleanup(out);

  fs.writeFileSync(outFile, out, 'utf8');
  console.log(`Wrote ${outFile}`);
}
