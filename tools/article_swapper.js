// tools/article_swapper.js
const fs = require('fs');

function readFirst(paths){
  for (const p of paths){
    try { return fs.readFileSync(p, 'utf8'); } catch (_) {}
  }
  throw new Error('None of the candidate paths exist:\n' + paths.join('\n'));
}

// --- Candidate paths (kebab lowercase first, then existing mixed-case)
const CSS_PATHS   = ['templates/article-style-inline.css.html'];
const PDF_PATHS   = ['templates/snippets/pdf-button.html'];
const MAIN_PATHS  = ['templates/snippets/image-card-main.html',  'templates/snippets/image-card-Main.html'];
const LEFT_PATHS  = ['templates/snippets/image-card-left.html',  'templates/snippets/image-card-Left.html'];
const RIGHT_PATHS = ['templates/snippets/image-card-right.html', 'templates/snippets/image-card-Right.html'];
const BIO_PATHS   = ['templates/snippets/bio.html'];

// Load assets
const CSS_SENTINEL = '/* =========================\n       Tokens';
const CSS     = readFirst(CSS_PATHS);
const PDF_TPL = readFirst(PDF_PATHS);
const MAIN_T  = readFirst(MAIN_PATHS);
const LEFT_T  = readFirst(LEFT_PATHS);
const RIGHT_T = readFirst(RIGHT_PATHS);
const BIO_T   = readFirst(BIO_PATHS);

// === A) CSS injection (idempotent)
function injectCss(html){
  if (html.includes(CSS_SENTINEL)) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, CSS + '\n</head>');
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, (m)=> m + '\n' + CSS + '\n');
  return CSS + '\n' + html;
}

// Expand [photo ...] tokens
function expandPhotoTokens(html){
  return html.replace(/\[photo\s+(left|right|main)\]/gi, (_, pos)=>{
    switch (pos.toLowerCase()){
      case 'left':  return LEFT_T;
      case 'right': return RIGHT_T;
      default:      return MAIN_T;
    }
  });
}

// Ensure <header class="article-header">
function ensureHeaderClass(openTag){
  if (/class=/i.test(openTag)){
    return openTag.replace(/class=(["'])(.*?)\1/i, (m,q,cls)=>{
      return /\barticle-header\b/i.test(cls) ? m : `class=${q}${cls} article-header${q}`;
    });
  }
  return openTag.replace(/>$/, ' class="article-header">');
}

// B) Header normalization
function normalizeHeader(html){
  return html.replace(/(<header[^>]*>)([\s\S]*?)(<\/header>)/i, (whole, open, inner, close)=>{
    let body = inner;
    open = ensureHeaderClass(open);

    // Author -> h3.author
    body = body.replace(
      /<p[^>]*>\s*(?:<strong>)?\s*By\s*[:—-]?\s+([^<]+?)(?:<\/strong>)?\s*<\/p>/i,
      (_m, name)=> `<h3 class="author">By ${name.trim()}</h3>`
    );

    // Organization -> first p after author → h4.org
    body = body.replace(
      /(<h3[^>]*class=["'][^"']*\bauthor\b[^"']*["'][^>]*>[\s\S]*?<\/h3>)([\s\S]*?)(<p(?![^>]*class=["'][^"']*\bpubdate\b)[^>]*>[\s\S]*?<\/p>)/i,
      (_m, author, mid, p) => `${author}${mid}${p.replace(/^<p/i,'<h4 class="org"').replace(/<\/p>$/i,'</h4>')}`
    );

    // Pubdate -> p.pubdate (or placeholder)
    if (!/<p[^>]*class=["'][^"']*\bpubdate\b/i.test(body)){
      body = body.replace(
        /<p>([A-Za-z]{3,}\s+\d{1,2},\s+\d{4})<\/p>/,
        '<p class="pubdate">$1</p>'
      );
      if (!/<p[^>]*class=["'][^"']*\bpubdate\b/i.test(body)){
        body += '\n<p class="pubdate">(date goes here)</p>';
      }
    }

    // Marker to anchor later inserts
    body = body.replace(/(<p[^>]*class=["'][^"']*\bpubdate\b[^"']*["'][^>]*>[\s\S]*?<\/p>)/i, '$1\n<!--__AFTER_PUBDATE__-->'
);
    return `${open}${body}${close}`;
  });
}

// C) PDF placement (dedupe-safe)
function insertPdfAfterDate(html){
  const m = html.match(/(<header[^>]*>)([\s\S]*?)(<\/header>)/i);
  if (!m) return html;
  const [whole, open, inner, close] = m;

  if (/(pdficon_small\.png|Download the PDF)/i.test(inner)){
    const tagged = inner.replace(
      /(<p[^>]*>[\s\S]*?(?:pdficon_small\.png|Download the PDF)[\s\S]*?<\/p>)/i,
      '$1\n<!--__AFTER_PDF__-->'
    );
    return html.replace(whole, `${open}${tagged}${close}`);
  }
  if (html.includes('<!--__AFTER_PUBDATE__-->')){
    return html.replace('<!--__AFTER_PUBDATE__-->', `${PDF_TPL}\n<!--__AFTER_PDF__-->`);
  }
  return html.replace(/<\/header>/i, `${PDF_TPL}\n<!--__AFTER_PDF__-->\n</header>`);
}

// D) Main image hoist / placeholder
function hoistMainAfterPdf(html){
  if (!html.includes('<!--__AFTER_PDF__-->')) return html;
  const mainRe = /<figure[^>]*class=["'][^"']*\bimage-card\b[^"']*\bMain\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/i;
  const found = mainRe.exec(html);
  if (found){
    const block = found[0];
    const without = html.slice(0, found.index) + html.slice(found.index + block.length);
    return without.replace('<!--__AFTER_PDF__-->', `${block}\n<!--__AFTER_PDF__-->`);
  }
  return html.replace('<!--__AFTER_PDF__-->', `${MAIN_T}\n<!--__AFTER_PDF__-->`);
}

// E) References normalization
function normalizeReferences(html){
  const refsH3 = /<h3[^>]*>\s*References\s*<\/h3>/i;
  if (!refsH3.test(html)) return html;

  return html.replace(
    /(<h3[^>]*>\s*References\s*<\/h3>)([\s\S]*?)(?=(<\/section>|<h2|<h3|<\/article>|$))/i,
    (whole, h3, block, tail) => {
      let out = block;

      // Ensure <p class="reference">
      out = out.replace(/<p(?![^>]*class=)[^>]*>/gi, '<p class="reference">');
      out = out.replace(/<p\s+class=(["'])(?![^"']*\breference\b)[^"']*\1/gi,
        m => m.replace(/class=(['"])[^'"]*\1/, 'class="reference"'));

      // <span> -> <em>
      out = out.replace(/<\/?span>/gi, m => m[1] === '/' ? '</em>' : '<em>');

      // Add link attrs
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

// F) Bio after the last reference
function insertBioAfterReferences(html){
  if (/<div[^>]*class=["'][^"']*\bbio-card\b/i.test(html)) return html;

  // Try contiguous reference block
  const block = new RegExp(
    '(<h3[^>]*>\\s*References\\s*<\\/h3>)' +
    '((?:\\s*<p\\s+class="reference"[^>]*>[\\s\\S]*?<\\/p>)+)',
    'i'
  );
  const m = html.match(block);
  if (m){
    return html.replace(block, `${m[1]}${m[2]}\n${BIO_T}`);
  }

  // If only the heading exists (no normalized ref paragraphs yet), insert after heading
  if (/<h3[^>]*>\s*References\s*<\/h3>/i.test(html)){
    return html.replace(/(<h3[^>]*>\s*References\s*<\/h3>)/i, `$1\n${BIO_T}\n`);
  }

  // No references at all → append near end
  return html.replace(/<\/article>|<\/body>/i, (t)=> `${BIO_T}\n${t}`);
}

// G) Final cleanup
function finalCleanup(html){
  return html
    .replace(/<!--__AFTER_PUBDATE__-->/g, '')
    .replace(/<!--__AFTER_PDF__-->/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

// === Runner
if (require.main === module){
  const [,, inFile, outFile] = process.argv;
  if (!inFile || !outFile){
    console.error('Usage: node tools/article_swapper.js input.html output.html');
    process.exit(1);
  }
  let out = fs.readFileSync(inFile, 'utf8');
  out = injectCss(out);
  out = expandPhotoTokens(out);
  out = normalizeHeader(out);
  out = insertPdfAfterDate(out);
  out = hoistMainAfterPdf(out);
  out = normalizeReferences(out);
  out = insertBioAfterReferences(out);
  out = finalCleanup(out);
  fs.writeFileSync(outFile, out, 'utf8');
  console.log(`Wrote ${outFile}`);
}
