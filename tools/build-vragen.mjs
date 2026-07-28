// R.O.B. Concepting — genereert /vragen/index.html uit de vragenpoorten.
//
// Alleen deuren met publication_status 'publishable' komen op de pagina. Een deur die
// terugvalt naar draft verdwijnt dus automatisch — de pagina volgt het register.
//
// TAAL-WET: naar bezoekers geen systeemtaal. Woorden als deur, claim, register,
// verdict of ring staan niet op deze pagina. Wat de bezoeker ziet: een vraag, een
// antwoord, en waar dat op rust met een datum.
//
// Draai: node tools/build-vragen.mjs   (na build-doors)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { datum, datumLabel as maakLabel } from './lib/datum.mjs';
import { statusHtml, STATUS_CSS } from './lib/status.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOORS = path.join(ROOT, 'whitepapers', '_doors.json');
const OUTDIR = path.join(ROOT, 'vragen');
const OUT = path.join(OUTDIR, 'index.html');

if (!existsSync(DOORS)) {
  console.error('build-vragen: whitepapers/_doors.json ontbreekt — draai eerst build-doors.');
  process.exit(1);
}
const data = JSON.parse(readFileSync(DOORS, 'utf8'));
const vragen = data.doors.filter(d => d.publication_status === 'publishable' && d.mode === 'public');

if (!vragen.length) {
  console.error('build-vragen: geen enkele vraag is leverbaar — pagina niet gebouwd.');
  process.exit(1);
}

// Taal-wet-poort: verboden systeemtermen mogen niet in de bezoekerstekst staan.
//
// Op WOORDGRENS toetsen, niet op substring. Eerste versie zocht op 'ring ' en sloeg
// aan op gewoon Nederlands ('ervaring', 'verankering') — een valse melding die de build
// blokkeerde. Het spiegelbeeld van de .env-fout in verify-publish-tree, die juist te
// weinig ving. Een poort moet precies zijn in beide richtingen, anders leer je hem
// negeren. 'ring' is als los woord te generiek voor Nederlands en staat er daarom niet in;
// de echte risicotermen zijn de systeemidentifiers.
const VERBODEN = ['claim', 'claims', 'verdict', 'publication_status', 'ext_ref',
                  'needs-review', 'showcase', 'ledger'];
const taalfouten = [];
for (const v of vragen) {
  const tekst = `${v.question} ${v.antwoord} ${v.bewijs.map(b => b.text).join(' ')}`.toLowerCase();
  const woorden = new Set(tekst.split(/[^a-z0-9_-]+/));
  for (const w of VERBODEN) if (woorden.has(w)) taalfouten.push(`${v.id}: bevat systeemterm "${w}"`);
}
if (taalfouten.length) {
  console.error('build-vragen: TAAL-WET GESCHONDEN — systeemtaal in bezoekerstekst:');
  for (const f of taalfouten) console.error('  · ' + f);
  process.exit(1);
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = id => id.split(':').pop();

// Datum- en soortweergave komen uit tools/lib/datum.mjs, gedeeld met
// build-site-kennis.mjs. Zie daar waarom dat een module is en geen kopie.
const datumLabel = (b) => maakLabel(b.dated, b.precisie, b.soort);

// De bronlink. /vragen/ toonde 34 gedateerde beweringen en NUL links: de pagina zei "waar
// dit op rust" en liet je het niet nazoeken. Het meest citeerbare oppervlak had daarmee de
// minst verifieerbare onderbouwing — op een site die herleidbaarheid bepleit.
//
// Niet elke bron heeft een URL: boeken en academische werken (Polanyi, Nonaka, Teece,
// Buchanan) staan er zonder. Dan komt de naam er wel, zonder link. Een naam is nog altijd
// herleidbaar; een verzonnen link is dat niet.
const bronlink = (b) => {
  if (!b.bron_naam) return '';
  const naam = esc(b.bron_naam);
  return b.bron_url
    ? ` <a class="v-bron" href="${esc(b.bron_url)}" target="_blank" rel="noopener noreferrer">${naam}</a>`
    : ` <span class="v-bron v-bron-los">${naam}</span>`;
};

const faq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: vragen.map(v => ({
    '@type': 'Question',
    name: v.question,
    acceptedAnswer: { '@type': 'Answer', text: v.antwoord }
  }))
};

const secties = vragen.map((v, i) => `
      <section class="vraag" id="${esc(slug(v.id))}">
        <div class="v-nr">${String(i + 1).padStart(2, '0')}</div>
        <h2>${esc(v.question)}</h2>
        <p class="v-antwoord">${esc(v.antwoord)}</p>
        <div class="v-grond">
          <div class="v-grond-kop">Waar dit op rust</div>
          <ul>
${v.bewijs.map(b => `            <li><span class="v-datum">${esc(datumLabel(b))}</span>${esc(b.text)}${bronlink(b)}${statusHtml(b, esc)}</li>`).join('\n')}
          </ul>
        </div>${(v.verder || []).length ? `
        <div class="v-verder">Uitgewerkt in ${v.verder.map(([t, u]) => `<a href="${esc(u)}">${esc(t)}</a>`).join(' &middot; ')}</div>` : ''}
      </section>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vragen die vaak terugkomen — R.O.B. Concepting</title>
  <meta name="description" content="Antwoorden op vragen over AI, vindbaarheid, kennis en besluitvorming in het MKB — met per antwoord de onderbouwing en de datum waarop die is vastgesteld.">
  <meta name="author" content="Rob de Rooij">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="https://rob-concepting.com/vragen/">
  <link rel="alternate" type="application/json" title="Gedateerd bewijs, machineleesbaar" href="https://rob-concepting.com/bewijs.json">
  <link rel="alternate" type="application/rss+xml" title="R.O.B. Concepting — nieuws" href="https://rob-concepting.com/nieuws/feed.xml">

  <meta property="og:title" content="Vragen die vaak terugkomen — R.O.B. Concepting">
  <meta property="og:description" content="Antwoorden met onderbouwing en datum. Ook waar het antwoord tegen de aanname in gaat.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://rob-concepting.com/vragen/">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:site_name" content="R.O.B. Concepting">
  <meta property="og:image" content="https://rob-concepting.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Vragen die vaak terugkomen">
  <meta name="twitter:image" content="https://rob-concepting.com/og-image.png">

  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%230e1525'/><circle cx='16' cy='16' r='12' fill='none' stroke='%230fa8cb' stroke-width='1.5'/><circle cx='16' cy='16' r='7' fill='none' stroke='%230fa8cb' stroke-width='1' opacity='.5'/><circle cx='16' cy='16' r='3' fill='%23e8391e'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=IBM+Plex+Mono:wght@300;400;500&display=swap" rel="stylesheet">

  <script type="application/ld+json">
${JSON.stringify(faq, null, 2).split('\n').map(l => '  ' + l).join('\n')}
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "R.O.B. Concepting", "item": "https://rob-concepting.com/" },
      { "@type": "ListItem", "position": 2, "name": "Vragen", "item": "https://rob-concepting.com/vragen/" }
    ]
  }
  </script>

  <style>
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
      text-transform:uppercase;color:rgba(255,255,255,.55);text-decoration:none;transition:color .2s}
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
    .vraag{background:var(--paper);border:1px solid var(--border);padding:30px clamp(22px,4vw,42px);
      margin-bottom:20px;position:relative}
    .v-nr{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.18em;
      color:var(--cyan);margin-bottom:12px}
    .vraag h2{font-size:clamp(21px,3vw,28px);font-weight:500;line-height:1.22;
      letter-spacing:-.01em;margin-bottom:14px;scroll-margin-top:24px;text-wrap:balance}
    .v-antwoord{font-size:17px;margin-bottom:24px}
    .v-grond{border-left:2px solid var(--cyan);padding:2px 0 2px 20px}
    .v-grond-kop{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.18em;
      text-transform:uppercase;color:var(--muted);margin-bottom:11px}
    .v-grond ul{list-style:none}
    .v-grond li{font-size:14.5px;line-height:1.6;color:var(--muted);margin-bottom:11px}
    .v-datum{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:11px;
      color:var(--purple);background:rgba(15,168,203,.1);padding:1px 7px;margin-right:9px;
      white-space:nowrap;font-variant-numeric:tabular-nums}
    .v-bron{font-size:13px;white-space:nowrap;color:var(--cyan);text-decoration:none;
      border-bottom:1px solid rgba(15,168,203,.35)}
    .v-bron:hover{border-bottom-color:var(--cyan)}
    .v-bron-los{color:var(--muted);border-bottom:1px dotted rgba(107,100,120,.5)}
${STATUS_CSS}
    .v-verder{margin-top:22px;padding-top:16px;border-top:1px solid var(--rule);
      font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.05em;color:var(--muted)}
    .v-verder a{color:var(--cyan);text-decoration:none}
    .v-verder a:hover{text-decoration:underline}
    .slot{max-width:820px;margin:0 auto;padding:14px 28px 0}
    .slot-in{background:var(--screen);color:#fff;padding:34px clamp(22px,4vw,42px)}
    .slot-in .lbl{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.2em;
      text-transform:uppercase;color:var(--cyan);margin-bottom:12px}
    .slot-in p{font-size:15.5px;color:rgba(255,255,255,.7);max-width:46em;margin-bottom:0}
    .foot{max-width:820px;margin:0 auto;padding:34px 28px 56px;display:flex;
      justify-content:space-between;gap:16px;flex-wrap:wrap;font-family:'IBM Plex Mono',monospace;
      font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
    .foot a{color:var(--muted);text-decoration:none}
    .mee{max-width:820px;margin:0 auto;padding:26px 28px 0;font-size:14.5px;color:var(--muted);line-height:1.6}
    .mee a{color:var(--cyan);text-decoration:none;border-bottom:1px solid rgba(15,168,203,.35)}
    .foot a:hover{color:var(--cyan)}
    @media(max-width:600px){.hero{padding:42px 22px 52px}.hero-rings{display:none}.wrap{padding:38px 22px 12px}}
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

  <section class="hero">
    <svg class="hero-rings" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".35"/>
      <circle cx="100" cy="100" r="66" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".28"/>
      <circle cx="100" cy="100" r="40" fill="none" stroke="#0fa8cb" stroke-width=".4" opacity=".2"/>
    </svg>
    <div class="hero-inner">
      <div class="eyebrow">R.O.B. Concepting</div>
      <h1>Vragen die vaak <strong>terugkomen</strong></h1>
      <div class="hero-bar"></div>
      <p>Bij elk antwoord staat waar het op rust, en wanneer dat is vastgesteld. Ook wanneer het antwoord tegen de aanname in gaat &mdash; dat is meestal het nuttigste antwoord.</p>
    </div>
  </section>

  <main class="wrap">
${secties}
  </main>

  <section class="slot">
    <div class="slot-in">
      <div class="lbl">Waarom hier datums staan</div>
      <p>Een cijfer zonder datum is een bewering zonder houdbaarheid. Alles hierboven is gebonden aan een bron met een vastgestelde datum; verandert die bron, dan is te herleiden welk antwoord dat raakt. Dat is dezelfde manier van werken die Rob voor opdrachtgevers bouwt.</p>
      <p style="margin-top:12px">Alles wat hierboven staat, is ook <a href="/bewijs/" style="color:var(--cyan)">in één overzicht</a> te vinden: elke bewering met haar datum, haar bron en of ze bij die bron is nagetrokken &mdash; inclusief wat nog niet is nagetrokken. Voor wie het machinaal wil inlezen: <a href="/bewijs.json" style="color:var(--cyan)">bewijs.json</a>.</p>
    </div>
  </section>

  <p class="mee">Nieuw werk verschijnt op deze site en op <a href="https://www.linkedin.com/in/rob-concepting/" target="_blank" rel="noopener noreferrer">LinkedIn</a>. Volg mee, of laat je leesapp het <a href="/nieuws/feed.xml">automatisch ophalen</a>.</p>

  <footer class="foot">
    <span>&copy; R.O.B. Concepting &middot; Rob de Rooij</span>
    <span><a href="/">rob-concepting.com</a> &middot; <a href="/whitepapers/">Whitepapers</a></span>
  </footer>
</body>
</html>
`;

mkdirSync(OUTDIR, { recursive: true });
writeFileSync(OUT, html);
console.log(`build-vragen: ${vragen.length} vragen gerenderd naar vragen/index.html (${data.doors.length - vragen.length} niet leverbaar, weggelaten)`);
