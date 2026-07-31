import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { status } from './lib/status.mjs';
import { datumLabel } from './lib/datum.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'publiek', 'bewijs', 'claim');
const reg = JSON.parse(readFileSync(path.join(ROOT, 'whitepapers', '_register.json'), 'utf8')).claims;
const rel = JSON.parse(readFileSync(path.join(ROOT, 'whitepapers', '_publication-claims.json'), 'utf8')).publicaties;
const claims = new Map(reg.map((claim) => [claim.ext_ref, claim]));
const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);

let count = 0;
for (const ref of [...new Set(rel.flatMap((publication) => publication.claim_refs || []))]) {
  const claim = claims.get(ref);
  if (!claim) throw new Error(`build-claimpaspoorten: ${ref} ontbreekt`);

  const slug = ref.replace(/^claim:/, '').replaceAll(':', '-');
  const dir = path.join(OUT, slug);
  const used = rel.filter((publication) => publication.claim_refs.includes(ref));
  const claimStatus = status(claim);
  const canonical = `https://rob-concepting.com/bewijs/claim/${slug}/`;
  mkdirSync(dir, { recursive: true });

  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    identifier: ref,
    text: claim.text,
    dateModified: claim.nagetrokken_op,
    citation: claim.bron_url || claim.bron_naam,
    mainEntityOfPage: canonical,
  });

  const usedIn = used.map((publication) => `<a href="${esc(publication.url)}">${esc(publication.url)}</a>`).join('<br>');
  const source = claim.bron_url
    ? `<a href="${esc(claim.bron_url)}" rel="noopener noreferrer">${esc(claim.bron_naam)}</a>`
    : esc(claim.bron_naam);

  writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Claimpaspoort ${esc(ref)} — R.O.B.</title>
  <meta name="description" content="Controleerbare bewijskaart voor ${esc(ref)}">
  <link rel="canonical" href="${canonical}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/media/merk.css">
  <script type="application/ld+json">${structuredData}</script>
  <style>
    body { margin: 0; background: var(--cream); color: var(--ink); font: 17px/1.65 "DM Sans", Arial, sans-serif; }
    :root{--kolom:760px;--kolom-pad:24px}
    main { max-width: 760px; margin: auto; padding: 42px 24px 56px; }
    .brand { display: inline-block; margin-bottom: 28px; }
    .brand img { display: block; width: auto; height: 40px; }
    .back { font: 400 12px/1.5 "IBM Plex Mono", monospace; letter-spacing: .08em; text-decoration-color: var(--cyan); }
    h1 { margin: 24px 0; font-size: clamp(36px, 7vw, 54px); font-weight: 600; letter-spacing: -.03em; }
    .card { background: var(--paper); padding: 28px; border-left: 3px solid var(--cyan); }
    dt { margin-top: 18px; color: var(--muted); font: 400 11px/1.5 "IBM Plex Mono", monospace; letter-spacing: .14em; text-transform: uppercase; }
    dt:first-child { margin-top: 0; }
    dd { margin-left: 0; }
    a { color: var(--ink); text-decoration-color: var(--cyan); }
  </style>
</head>
<body>
  <main>
    <a class="brand" href="/" aria-label="Terug naar R.O.B. Concepting"><img src="/media/logo/logo-rob-lengte-wit-transparant.png" width="601" height="118" alt="R.O.B. Concepting"></a>
    <div><a class="back" href="/bewijs/">← Het bewijs</a></div>
    <h1>Claimpaspoort</h1>
    <div class="card"><dl>
      <dt>ID</dt><dd>${esc(ref)}</dd>
      <dt>Bewering</dt><dd>${esc(claim.text)}</dd>
      <dt>Status</dt><dd>${esc(claimStatus?.woord || 'Theoretische grondslag')} — ${esc(claimStatus?.uitleg || 'niet tijdgebonden')}</dd>
      <dt>Vastgesteld</dt><dd>${esc(datumLabel(claim.dated, claim.dated_precisie, claim.dated_soort))}</dd>
      <dt>Bron</dt><dd>${source}</dd>
      <dt>Gebruikt in</dt><dd>${usedIn}</dd>
    </dl></div>
  </main>
  <div class="afsluiter">
    <footer>
      <p>Deze bewering staat ook in het volledige overzicht: <a href="/bewijs/">alle beweringen met hun datum en bron</a>,
        of machineleesbaar via <a href="/bewijs.json">bewijs.json</a>.</p>
    </footer>
  </div>
</body>
</html>`);
  count += 1;
}

console.log(`build-claimpaspoorten: ${count} paspoorten gegenereerd`);
