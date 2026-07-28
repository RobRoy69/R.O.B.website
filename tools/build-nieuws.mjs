// R.O.B. Concepting — genereert /nieuws/ uit de berichten in het register.
//
// DE REGEL DIE DIT BESTAND AFDWINGT, en die een markdown-bestandje niet kan geven:
//
//   een bericht is nooit publiceerbaarder dan zijn zwakste bewering.
//
// Bindt een bericht zich aan claims, dan moeten die ALLE leverbaar zijn in de projectie
// (approved + ring open/showcase). Is er één niet, dan gaat het bericht niet live. Dat wordt
// hier AFGELEID, niet in de database beweerd — dezelfde constructie als build-doors.
//
// Gevolg: trek je een bewering in, dan verdwijnt elk bericht dat erop leunde. Dat is de
// correctielus waar de whitepapers over gaan, toegepast op je eigen publiceren.
//
// TAAL-WET: geen systeemtaal naar bezoekers. Zelfde poort als in build-vragen.
//
// Draai: node tools/build-nieuws.mjs   (na sync-berichten en sync-register)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { datumLabel } from './lib/datum.mjs';
import { BASIS, ID } from './lib/entiteiten.mjs';

const ROOT   = path.resolve(import.meta.dirname, '..');
const BER    = path.join(ROOT, 'nieuws', '_berichten.json');
const PROJ   = path.join(ROOT, 'whitepapers', '_register.json');
const OUTDIR = path.join(ROOT, 'nieuws');

if (!existsSync(BER))  { console.error('build-nieuws: _berichten.json ontbreekt — draai eerst sync-berichten.'); process.exit(1); }
if (!existsSync(PROJ)) { console.error('build-nieuws: _register.json ontbreekt — draai eerst sync-register.'); process.exit(1); }

const alle    = JSON.parse(readFileSync(BER, 'utf8')).berichten || [];
const claims  = new Map(JSON.parse(readFileSync(PROJ, 'utf8')).claims.map(c => [c.ext_ref, c]));

// ── de afgeleide regel ──
const berichten = [];
for (const b of alle) {
  const refs = (b.claim_refs || '').split(',').map(s => s.trim()).filter(Boolean);
  const ontbreekt = refs.filter(r => !claims.has(r));
  if (ontbreekt.length) {
    console.warn(`  · ${b.ext_ref} NIET gepubliceerd — rust op ${ontbreekt.join(', ')}, niet leverbaar`);
    continue;
  }
  berichten.push({ ...b, bewijs: refs.map(r => claims.get(r)) });
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MND = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const nlDatum = d => { const [j,m,dg] = d.split('-').map(Number); return `${dg} ${MND[m-1]} ${j}`; };

// Taal-wet: systeemtermen mogen niet in bezoekerstekst. Zelfde lijst als build-vragen.
const VERBODEN = ['claim','claims','verdict','publication_status','ext_ref','needs-review','showcase','ledger'];
const taalfouten = [];
for (const b of berichten) {
  const woorden = new Set(`${b.titel} ${b.samenvatting} ${b.tekst}`.toLowerCase().split(/[^a-z0-9_-]+/));
  for (const w of VERBODEN) if (woorden.has(w)) taalfouten.push(`${b.ext_ref}: bevat systeemterm "${w}"`);
}
if (taalfouten.length) {
  console.error('build-nieuws: TAAL-WET GESCHONDEN — systeemtaal in bezoekerstekst:');
  for (const f of taalfouten) console.error('  · ' + f);
  process.exit(1);
}

const STIJL = `
    :root{--cream:#e8e4dc;--paper:#f4f2ed;--purple:#001a4d;--cyan:#0fa8cb;--red:#e8391e;
      --screen:#0e1525;--muted:#6b6478;--border:rgba(0,26,77,.12);--rule:rgba(0,26,77,.08)}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'DM Sans',system-ui,sans-serif;background:var(--cream);color:var(--purple);
      line-height:1.7;-webkit-font-smoothing:antialiased}
    .topbar{background:var(--screen);padding:16px 28px;display:flex;align-items:center;
      justify-content:space-between;gap:20px;flex-wrap:wrap}
    .tb-brand{display:flex;align-items:center;gap:12px;text-decoration:none}
    .tb-name{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.16em;
      text-transform:uppercase;color:#fff}
    .tb-name span{color:var(--cyan)}
    .tb-back{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;
      text-transform:uppercase;color:rgba(255,255,255,.55);text-decoration:none}
    .tb-back:hover{color:var(--cyan)}
    .hero{background:var(--screen);color:#fff;padding:56px 28px 66px;position:relative;overflow:hidden}
    .hero-inner{max-width:820px;margin:0 auto;position:relative;z-index:2}
    .hero-rings{position:absolute;right:-130px;top:50%;transform:translateY(-50%);
      width:480px;height:480px;opacity:.5;pointer-events:none;z-index:1}
    .eyebrow{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.22em;
      text-transform:uppercase;color:var(--cyan);margin-bottom:20px}
    .hero h1{font-size:clamp(33px,6vw,54px);line-height:1.07;font-weight:400;
      letter-spacing:-.02em;margin-bottom:18px}
    .hero h1 strong{font-weight:600}
    .hero-bar{width:46px;height:2px;background:var(--red);margin-bottom:24px}
    .hero p{font-size:clamp(16px,2.2vw,19px);font-weight:300;color:rgba(255,255,255,.72);max-width:44em}
    .wrap{max-width:820px;margin:0 auto;padding:52px 28px 20px}
    .b{background:var(--paper);border:1px solid var(--border);padding:30px clamp(22px,4vw,42px);
      margin-bottom:20px}
    .b-datum{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;
      text-transform:uppercase;color:var(--cyan);margin-bottom:12px}
    .b h2{font-size:clamp(21px,3vw,28px);font-weight:500;line-height:1.22;
      letter-spacing:-.01em;margin-bottom:14px;text-wrap:balance;scroll-margin-top:24px}
    .b h2 a{color:inherit;text-decoration:none}
    .b h2 a:hover{color:var(--cyan)}
    .b p{font-size:16.5px;margin-bottom:14px}
    .b-grond{border-left:2px solid var(--cyan);padding:2px 0 2px 20px;margin-top:22px}
    .b-grond-kop{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.18em;
      text-transform:uppercase;color:var(--muted);margin-bottom:11px}
    .b-grond ul{list-style:none}
    .b-grond li{font-size:14.5px;line-height:1.6;color:var(--muted);margin-bottom:11px}
    .b-datumchip{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:11px;
      color:var(--purple);background:rgba(15,168,203,.1);padding:1px 7px;margin-right:9px;
      white-space:nowrap;font-variant-numeric:tabular-nums}
    .b-media{margin:0 0 20px;line-height:0}
    .b-media img,.b-media video{width:100%;height:auto;display:block;border:1px solid var(--border)}
    .b-media figcaption{font-size:13px;color:var(--muted);line-height:1.5;padding-top:8px;
      font-style:italic}
    .b-vid{position:relative;display:block}
    .b-vid .speel{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
    .b-vid .speel span{background:rgba(14,21,37,.82);color:#fff;font-family:'IBM Plex Mono',monospace;
      font-size:12px;letter-spacing:.12em;text-transform:uppercase;padding:12px 22px}
    .b-vid:hover .speel span{background:var(--cyan)}
    .b-bron{font-size:13px;white-space:nowrap;color:var(--cyan);text-decoration:none;
      border-bottom:1px solid rgba(15,168,203,.35)}
    .b-bron-los{color:var(--muted);border-bottom:1px dotted rgba(107,100,120,.5)}
    .instap a:hover{border-bottom-color:var(--cyan)}
    .route{background:var(--paper);border-left:3px solid var(--red);padding:16px 20px;
      margin-bottom:20px;font-size:15px}
    .route a{color:var(--cyan);text-decoration:none;border-bottom:1px solid rgba(15,168,203,.4)}
    .deel{margin-top:24px;padding-top:16px;border-top:1px solid var(--rule);
      display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .deel-lbl{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.18em;
      text-transform:uppercase;color:var(--muted);margin-right:4px}
    .deel a{font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.08em;
      color:var(--cyan);text-decoration:none;border:1px solid rgba(15,168,203,.35);
      padding:6px 14px;transition:background .15s,color .15s}
    .deel a:hover{background:var(--cyan);color:#fff}
    .foot{max-width:820px;margin:0 auto;padding:34px 28px 56px;display:flex;
      justify-content:space-between;gap:16px;flex-wrap:wrap;font-family:'IBM Plex Mono',monospace;
      font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
    .foot a{color:var(--muted);text-decoration:none}
    .mee{max-width:820px;margin:0 auto;padding:0 28px;font-size:14.5px;color:var(--muted);
      line-height:1.6;text-transform:none;letter-spacing:0}
    .mee a{color:var(--cyan);text-decoration:none;border-bottom:1px solid rgba(15,168,203,.35)}
    .mee a:hover{border-bottom-color:var(--cyan)}
    .foot a:hover{color:var(--cyan)}
    @media(max-width:600px){.hero{padding:42px 22px 52px}.hero-rings{display:none}.wrap{padding:38px 22px 12px}}`;

const KOP = (titel, omschr, canon, extraLd = '', ogBeeld = `${BASIS}/og-image.png`) => `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(titel)}</title>
  <meta name="description" content="${esc(omschr)}">
  <meta name="author" content="Rob de Rooij">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="${canon}">
  <link rel="alternate" type="application/rss+xml" title="R.O.B. Concepting — nieuws" href="${BASIS}/nieuws/feed.xml">
  <meta property="og:title" content="${esc(titel)}">
  <meta property="og:description" content="${esc(omschr)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canon}">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:site_name" content="R.O.B. Concepting">
  <meta property="og:image" content="${ogBeeld}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%230e1525'/><circle cx='16' cy='16' r='12' fill='none' stroke='%230fa8cb' stroke-width='1.5'/><circle cx='16' cy='16' r='7' fill='none' stroke='%230fa8cb' stroke-width='1' opacity='.5'/><circle cx='16' cy='16' r='3' fill='%23e8391e'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=IBM+Plex+Mono:wght@300;400;500&display=swap" rel="stylesheet">
${extraLd}  <style>${STIJL}
  </style>
</head>
<body>
  <header class="topbar">
    <a class="tb-brand" href="/">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="12" fill="none" stroke="#0fa8cb" stroke-width="1.5"/>
        <circle cx="16" cy="16" r="7" fill="none" stroke="#0fa8cb" stroke-width="1" opacity=".5"/>
        <circle cx="16" cy="16" r="3" fill="#e8391e"/>
      </svg>
      <span class="tb-name">R.O.B. <span>Concepting</span></span>
    </a>
    <a class="tb-back" href="/">&larr; Terug naar de site</a>
  </header>
`;

const VOET = `  <p class="mee">Nieuw werk verschijnt op deze site en op <a href="https://www.linkedin.com/in/rob-concepting/" target="_blank" rel="noopener noreferrer">LinkedIn</a>. Volg mee, of laat je leesapp het <a href="/nieuws/feed.xml">automatisch ophalen</a>.</p>

  <footer class="foot">
    <span>&copy; R.O.B. Concepting &middot; Rob de Rooij</span>
    <span><a href="/">rob-concepting.com</a> &middot; <a href="/whitepapers/">Whitepapers</a> &middot; <a href="/vragen/">Vragen</a> &middot; <a href="/nieuws/feed.xml">Feed</a></span>
  </footer>
</body>
</html>
`;

// Media. Twee keuzes die uitleg verdienen.
//
// ALT-TEKST is verplicht in de database (constraint sinds 0012), dus hier hoeft niet
// gecontroleerd te worden of hij bestaat — dat kan al niet meer misgaan.
//
// VIDEO: een zelf-gehoste mp4 speelt op de pagina. Een YouTube-URL wordt NIET als iframe
// ingebed maar als aanklikbare poster gerenderd. Reden: een YouTube-embed laadt code van
// derden op een site die verder geen enkele tracker heeft, en de CSP hier staat geen
// frame-src toe. Wie doorklikt, kiest daar zelf voor. Wil je een echte embed, dan is dat
// een bewuste CSP-wijziging en geen bijvangst van een bouwstap.
const jtId = (u) => (String(u).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/) || [])[1];

const media = (b) => {
  if (b.video) {
    const id = jtId(b.video);
    if (id) {
      return `
        <figure class="b-media">
          <a class="b-vid" href="${esc(b.video)}" target="_blank" rel="noopener noreferrer"
             aria-label="Bekijk de video op YouTube (opent in een nieuw tabblad)">
            <img src="${b.afbeelding ? esc(b.afbeelding) : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}"
                 alt="${esc(b.afbeelding_alt || 'Videovoorbeeld')}" loading="lazy">
            <span class="speel"><span>Bekijk op YouTube &rarr;</span></span>
          </a>
          <figcaption>Deze video opent bij YouTube. Op deze pagina staat geen ingebedde speler, zodat er geen code van derden meelaadt.</figcaption>
        </figure>`;
    }
    return `
        <figure class="b-media">
          <video controls preload="metadata"${b.afbeelding ? ` poster="${esc(b.afbeelding)}"` : ''}>
            <source src="${esc(b.video)}" type="video/mp4">
            Je browser kan deze video niet weergeven.
          </video>${b.afbeelding_alt ? `
          <figcaption>${esc(b.afbeelding_alt)}</figcaption>` : ''}
        </figure>`;
  }
  if (b.afbeelding) {
    return `
        <figure class="b-media">
          <img src="${esc(b.afbeelding)}" alt="${esc(b.afbeelding_alt)}" loading="lazy">
          <figcaption>${esc(b.afbeelding_alt)}</figcaption>
        </figure>`;
  }
  return '';
};

const grond = (b) => b.bewijs.length ? `
        <div class="b-grond">
          <div class="b-grond-kop">Waar dit op rust</div>
          <ul>
${b.bewijs.map(c => `            <li><span class="b-datumchip">${esc(datumLabel(c.dated, c.dated_precisie, c.dated_soort))}</span>${esc(c.text)}${c.bron_naam ? (c.bron_url ? ` <a class="b-bron" href="${esc(c.bron_url)}" target="_blank" rel="noopener noreferrer">${esc(c.bron_naam)}</a>` : ` <span class="b-bron b-bron-los">${esc(c.bron_naam)}</span>`) : ''}</li>`).join('\n')}
          </ul>
        </div>` : '';

// Deel-knoppen. Mail is een gewone mailto — Rob koos bewust geen mailinglijst, en dat
// scheelt een toestemmingsvraagstuk dat je niet wilt hebben.
const deel = (b, u) => `
        <div class="deel">
          <span class="deel-lbl">Delen</span>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="mailto:?subject=${encodeURIComponent(b.titel)}&body=${encodeURIComponent(b.samenvatting + '\n\n' + u)}">Mail dit door</a>
          <a href="/nieuws/feed.xml">Feed</a>
        </div>`;

mkdirSync(OUTDIR, { recursive: true });

// ── losse berichtpagina's ──
for (const b of berichten) {
  const u = `${BASIS}/nieuws/${b.slug}/`;
  const ld = '  <script type="application/ld+json">\n' + JSON.stringify({
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: b.titel, description: b.samenvatting,
    inLanguage: 'nl-NL', datePublished: b.gepubliceerd_op,
    dateModified: (b.updated_at || '').slice(0, 10) || b.gepubliceerd_op,
    author: { '@id': ID.persoon }, publisher: { '@id': ID.org },
    mainEntityOfPage: { '@type': 'WebPage', '@id': u },
    image: b.afbeelding ? `${BASIS}${b.afbeelding}` : `${BASIS}/og-image.png`,
  }, null, 2).split('\n').map(l => '  ' + l).join('\n') + '\n  </script>\n';

  const alineas = b.tekst.split(/\n\s*\n/).map(p => `      <p>${esc(p.trim())}</p>`).join('\n');
  mkdirSync(path.join(OUTDIR, b.slug), { recursive: true });
  writeFileSync(path.join(OUTDIR, b.slug, 'index.html'),
    KOP(`${b.titel} — R.O.B. Concepting`, b.samenvatting, u, ld, b.afbeelding ? `${BASIS}${b.afbeelding}` : `${BASIS}/og-image.png`) +
`  <section class="hero">
    <svg class="hero-rings" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".35"/>
      <circle cx="100" cy="100" r="66" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".28"/>
      <circle cx="100" cy="100" r="40" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".2"/>
    </svg>
    <div class="hero-inner">
      <div class="eyebrow">${esc(nlDatum(b.gepubliceerd_op))}</div>
      <h1>${esc(b.titel)}</h1>
      <div class="hero-bar"></div>
      <p>${esc(b.samenvatting)}</p>
    </div>
  </section>

  <main class="wrap">
      <div class="b">
${media(b)}
${alineas}
${grond(b)}
${deel(b, u)}
      </div>
      <div class="route">
        Dit bericht hoort bij een doorlopend betoog over wat AI verandert aan organisaties. Het leest het best van voren af aan: begin bij <a href="/whitepapers/de-beste-keuze-is.html">De beste keuze is&hellip;</a>.
      </div>

      <p style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.1em;
         text-transform:uppercase"><a href="/nieuws/" style="color:var(--cyan);text-decoration:none">&larr; Alle berichten</a></p>
  </main>

` + VOET);
}

// ── overzicht ──
const lijstLd = '  <script type="application/ld+json">\n' + JSON.stringify({
  '@context': 'https://schema.org', '@type': 'CollectionPage',
  name: 'Nieuws — R.O.B. Concepting', url: `${BASIS}/nieuws/`, inLanguage: 'nl-NL',
  publisher: { '@id': ID.org },
  mainEntity: { '@type': 'ItemList', itemListElement: berichten.map((b, i) => ({
    '@type': 'ListItem', position: i + 1, url: `${BASIS}/nieuws/${b.slug}/`, name: b.titel })) },
}, null, 2).split('\n').map(l => '  ' + l).join('\n') + '\n  </script>\n';

writeFileSync(path.join(OUTDIR, 'index.html'),
  KOP('Nieuws — R.O.B. Concepting',
      'Berichten van R.O.B. Concepting over systeemontwerp, AI en het organiseren van waarde — met per bericht de onderbouwing en de datum waarop die is vastgesteld.',
      `${BASIS}/nieuws/`, lijstLd) +
`  <section class="hero">
    <svg class="hero-rings" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".35"/>
      <circle cx="100" cy="100" r="66" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".28"/>
      <circle cx="100" cy="100" r="40" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".2"/>
    </svg>
    <div class="hero-inner">
      <div class="eyebrow">R.O.B. Concepting</div>
      <h1>Nieuws en <strong>berichten</strong></h1>
      <div class="hero-bar"></div>
      <p>Wat er speelt, wat er verschijnt, en waar het op rust. Bij elk bericht staat de onderbouwing met de datum waarop die is vastgesteld.</p>
    </div>
  </section>

  <main class="wrap">
      <div class="route">
        Nieuw hier? De whitepapers vormen &eacute;&eacute;n doorlopend betoog. Het leest het best van voren af aan: begin bij <a href="/whitepapers/de-beste-keuze-is.html">De beste keuze is&hellip;</a>, of bekijk <a href="/whitepapers/">de hele reeks</a>.
      </div>

${berichten.length ? '' : `      <div class="b"><p>Er staan nog geen berichten. Het eerste volgt binnenkort.</p>
        <p style="font-size:14.5px;color:var(--muted)">Ondertussen: de <a href="/whitepapers/" style="color:var(--cyan)">whitepapers</a> en de <a href="/vragen/" style="color:var(--cyan)">vragen met onderbouwing</a>.</p></div>`}
${berichten.map(b => `      <article class="b">
        <div class="b-datum">${esc(nlDatum(b.gepubliceerd_op))}</div>
        <h2><a href="/nieuws/${esc(b.slug)}/">${esc(b.titel)}</a></h2>
${media(b)}
        <p>${esc(b.samenvatting)}</p>
${grond(b)}
${deel(b, `${BASIS}/nieuws/${b.slug}/`)}
      </article>`).join('\n')}
  </main>

` + VOET);

// ── feed ──
const rfc = d => new Date(d + 'T09:00:00+02:00').toUTCString();
writeFileSync(path.join(OUTDIR, 'feed.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>R.O.B. Concepting — nieuws</title>
    <link>${BASIS}/nieuws/</link>
    <atom:link href="${BASIS}/nieuws/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Berichten over systeemontwerp, AI en het organiseren van waarde. Bij elk bericht de onderbouwing met datum.</description>
    <language>nl-NL</language>
${berichten.map(b => `    <item>
      <title>${esc(b.titel)}</title>
      <link>${BASIS}/nieuws/${b.slug}/</link>
      <guid isPermaLink="true">${BASIS}/nieuws/${b.slug}/</guid>
      <pubDate>${rfc(b.gepubliceerd_op)}</pubDate>
      <description>${esc(b.samenvatting)}</description>
    </item>`).join('\n')}
  </channel>
</rss>
`);

console.log(`build-nieuws: ${berichten.length} bericht(en) van ${alle.length} goedgekeurd(e), plus overzicht en feed`);
