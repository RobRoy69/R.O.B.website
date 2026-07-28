// R.O.B. Concepting — /bewijs/: hetzelfde bewijs, nu leesbaar.
//
// WAAROM UIT bewijs.json EN NIET UIT HET REGISTER. Deze pagina leest het bestand dat
// build-bewijs zojuist heeft geschreven. Niet uit gemak: het maakt afdrijven onmogelijk. Twee
// bouwers die allebei uit het register putten, kunnen uit elkaar gaan lopen zodra iemand de
// ene aanpast en de andere vergeet — en dat is precies het patroon achter elke fout van deze
// week. Eén projectie, twee representaties.
//
// WAAROM ÉÉN PAGINA EN GEEN PAGINA PER BEWERING. Zesendertig pagina's van vier regels
// concurreren met elkaar op dezelfde termen en dragen geen van alle genoeg om zelfstandig te
// staan. Eén pagina met een vast anker per bewering is even citeerbaar — /bewijs/#wp-021
// wijst even scherp aan — en leest als één samenhangend document.
//
// Draai: node tools/build-bewijs-pagina.mjs   (na build-bewijs)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { BASIS, ID, graaf } from './lib/entiteiten.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BRON = path.join(ROOT, 'publiek', 'bewijs.json');
const UITMAP = path.join(ROOT, 'publiek', 'bewijs');

if (!existsSync(BRON)) {
  console.error('build-bewijs-pagina: publiek/bewijs.json ontbreekt — draai eerst build-bewijs.');
  process.exit(1);
}
const b = JSON.parse(readFileSync(BRON, 'utf8'));

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const anker = id => id.replace(/^claim:/, '').replace(/:/g, '-');

const paginanaam = (url) => {
  const p = url.replace(BASIS, '');
  if (p.startsWith('/vragen/')) return 'Vragen';
  if (p.startsWith('/nieuws/')) return 'Nieuws';
  return p;
};

const TOON = { Klopt: 'klopt', Verloopt: 'verloopt', Wacht: 'wacht' };

const regels = b.beweringen.map(x => {
  const s = x.stand;
  const soortLabel = { prognose: 'prognose', bronversie: 'gebonden aan een bronversie',
                       grondslag: 'theoretische grondslag' }[x.soort] || '';
  const bron = x.bron.url
    ? `<a href="${esc(x.bron.url)}" target="_blank" rel="noopener noreferrer">${esc(x.bron.naam)}</a>`
    : x.bron.naam ? `<span class="los">${esc(x.bron.naam)}</span>` : '<span class="los">bron niet vastgelegd</span>';
  return `
      <article class="bw" id="${esc(anker(x.id))}">
        <div class="bw-kop">
          <code class="bw-id">${esc(x.id)}</code>
          ${s ? `<span class="st st-${TOON[s.status]}" title="${esc(s.waarom)}">${s.status}</span>` : ''}
          ${soortLabel ? `<span class="st-soort">${esc(soortLabel)}</span>` : ''}
        </div>
        <p class="bw-tekst">${esc(x.bewering)}</p>
        <dl class="bw-meta">
          <dt>Vastgesteld</dt><dd>${esc(x.vastgesteld.weergave)}</dd>
          <dt>Bron</dt><dd>${bron}</dd>
          ${s ? `<dt>Stand</dt><dd>${esc(s.waarom)}</dd>` : ''}
          <dt>Gebruikt op</dt><dd>${x.gebruikt_in.map(u =>
            `<a href="${esc(u.replace(BASIS, ''))}">${esc(paginanaam(u))}</a>`).join(' &middot; ')}</dd>
        </dl>
      </article>`;
}).join('\n');

const tel = (w) => b.beweringen.filter(x => x.stand?.status === w).length;
const grondslagen = b.beweringen.filter(x => !x.stand).length;

// De entiteitengraaf van de site, met dit bestand er als Dataset aan toegevoegd. Zo hangt
// het bewijs aan dezelfde @id's als de rest en niet ernaast — dat was de fout die de vijf
// losse Person-objecten opleverde.
const graf = graaf();
graf['@graph'].push({
      '@type': 'Dataset',
      '@id': `${BASIS}/bewijs/#dataset`,
      name: 'Het bewijs onder rob-concepting.com',
      description: b.wat_dit_is,
      url: `${BASIS}/bewijs/`,
      creator: { '@id': ID.persoon },
      publisher: { '@id': ID.org },
      inLanguage: 'nl-NL',
      license: 'https://creativecommons.org/licenses/by/4.0/',
      distribution: [{
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${BASIS}/bewijs.json`,
      }],
});

const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Het bewijs &mdash; R.O.B. Concepting</title>
  <meta name="description" content="Elke bewering op deze site staat hier met haar datum, haar bron en de pagina's die erop rusten. Inclusief wat nog niet is nagetrokken.">
  <meta name="author" content="Rob de Rooij">
  <meta name="robots" content="index, follow, max-snippet:-1">
  <link rel="canonical" href="${BASIS}/bewijs/">
  <link rel="alternate" type="application/json" title="Hetzelfde bewijs, machineleesbaar" href="${BASIS}/bewijs.json">
  <meta property="og:title" content="Het bewijs &mdash; R.O.B. Concepting">
  <meta property="og:description" content="Elke bewering met datum, bron en stand. Inclusief wat nog niet is nagetrokken.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASIS}/bewijs/">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:site_name" content="R.O.B. Concepting">
  <meta property="og:image" content="${BASIS}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${BASIS}/og-image.png">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%230e1525'/><circle cx='16' cy='16' r='12' fill='none' stroke='%230fa8cb' stroke-width='1.5'/><circle cx='16' cy='16' r='7' fill='none' stroke='%230fa8cb' stroke-width='1' opacity='.5'/><circle cx='16' cy='16' r='3' fill='%23e8391e'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=IBM+Plex+Mono:wght@300;400;500&display=swap" rel="stylesheet">
  <script type="application/ld+json">
${JSON.stringify(graf, null, 2).split('\n').map(l => '  ' + l).join('\n')}
  </script>
  <style>
    :root{--navy:#001a4d;--purple:#2d1b4e;--red:#e8391e;--cyan:#0fa8cb;
      --ink:#1a1428;--grijs:#6b6478;--rand:rgba(0,26,77,.13);--bg:#fbfaf8}
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:var(--bg);color:var(--ink);font-family:'DM Sans',sans-serif;
      font-weight:300;line-height:1.65;-webkit-font-smoothing:antialiased}
    .wrap{max-width:820px;margin:0 auto;padding:0 clamp(20px,5vw,40px)}
    header{padding:52px 0 0}
    .terug{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;
      text-transform:uppercase;color:var(--grijs);text-decoration:none}
    .terug:hover{color:var(--red)}
    h1{font-size:clamp(30px,5vw,42px);font-weight:300;letter-spacing:-.02em;
      color:var(--navy);margin:22px 0 16px;line-height:1.15}
    .inleiding{font-size:17px;color:var(--purple);max-width:64ch}
    .inleiding + .inleiding{margin-top:14px}
    .stand{display:flex;flex-wrap:wrap;gap:10px;margin:28px 0 8px;
      padding:18px 0;border-top:1px solid var(--rand);border-bottom:1px solid var(--rand)}
    .stand div{font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.05em;
      color:var(--grijs)}
    .stand b{font-weight:500;color:var(--navy)}
    main{padding:22px 0 60px}
    .bw{padding:26px 0;border-bottom:1px solid var(--rand)}
    .bw:target{background:rgba(15,168,203,.06);box-shadow:-14px 0 0 rgba(15,168,203,.06),14px 0 0 rgba(15,168,203,.06)}
    .bw-kop{display:flex;align-items:center;flex-wrap:wrap;gap:2px;margin-bottom:9px}
    .bw-id{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.05em;
      color:var(--cyan)}
    .bw-tekst{font-size:17.5px;color:var(--ink);max-width:66ch;margin-bottom:14px}
    .bw-meta{display:grid;grid-template-columns:118px 1fr;gap:5px 14px;font-size:13.5px}
    .bw-meta dt{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.1em;
      text-transform:uppercase;color:var(--grijs);padding-top:3px}
    .bw-meta dd{color:var(--purple)}
    .bw-meta a{color:var(--navy);text-decoration:none;border-bottom:1px solid var(--rand)}
    .bw-meta a:hover{color:var(--red);border-color:var(--red)}
    .los{color:var(--grijs)}
    .st{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:10.5px;
      letter-spacing:.08em;padding:1px 7px;margin-left:8px;white-space:nowrap;
      border:1px solid transparent}
    .st-klopt{color:#1a7f4b;border-color:rgba(26,127,75,.28)}
    .st-verloopt{color:#a86400;border-color:rgba(168,100,0,.32);background:rgba(217,136,0,.07)}
    .st-wacht{color:#a03a2a;border-color:rgba(160,58,42,.3);background:rgba(232,57,30,.05)}
    .st-soort{display:inline-block;font-size:11.5px;font-style:italic;color:var(--grijs);
      margin-left:8px}
    footer{border-top:1px solid var(--rand);padding:26px 0 46px;font-size:13px;color:var(--grijs)}
    footer a{color:var(--navy)}
    @media(max-width:560px){.bw-meta{grid-template-columns:1fr;gap:2px}
      .bw-meta dt{padding-top:9px}}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <a class="terug" href="/">&larr; R.O.B. Concepting</a>
      <h1>Het bewijs</h1>
      <p class="inleiding">Alles wat op deze site als feit staat, staat hier met de datum waarop het
        is vastgesteld, de bron waar het vandaan komt en de pagina&rsquo;s die erop rusten.</p>
      <p class="inleiding">Ook wat nog niet is nagetrokken. Een bewering die als
        <b>Wacht</b> staat, is niet minder waar &mdash; ze is niet gecontroleerd, en dat hoort
        u te weten voordat u haar overneemt.</p>
      <div class="stand">
        <div><b>${b.beweringen.length}</b> beweringen</div>
        <div><b>${tel('Klopt')}</b> nagetrokken bij de bron</div>
        ${tel('Verloopt') ? `<div><b>${tel('Verloopt')}</b> aan herziening toe</div>` : ''}
        <div><b>${tel('Wacht')}</b> nog niet nagetrokken</div>
        ${grondslagen ? `<div><b>${grondslagen}</b> theoretische grondslag</div>` : ''}
      </div>
    </header>
    <main>
${regels}
    </main>
    <footer>
      <p>Hetzelfde bewijs machineleesbaar: <a href="/bewijs.json">bewijs.json</a>.
        Overnemen mag, met bronvermelding &mdash; en met de datum erbij.</p>
    </footer>
  </div>
</body>
</html>
`;

mkdirSync(UITMAP, { recursive: true });
writeFileSync(path.join(UITMAP, 'index.html'), html);
console.log(`build-bewijs-pagina: ${b.beweringen.length} beweringen naar publiek/bewijs/index.html `
  + `(${tel('Klopt')} klopt / ${tel('Verloopt')} verloopt / ${tel('Wacht')} wacht / ${grondslagen} grondslag)`);
