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

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { datumLabel } from './lib/datum.mjs';
import { BASIS, ID } from './lib/entiteiten.mjs';
import { statusHtml, STATUS_CSS } from './lib/status.mjs';
import { reeksPositie, SOORT_LABEL } from './lib/reeks.mjs';
import { KLEUR, PAPIER, MAAT, FONT, TRACKING } from './lib/merk.mjs';

const ROOT    = path.resolve(import.meta.dirname, '..');
const BER     = path.join(ROOT, 'nieuws', '_berichten.json');
const PROJ    = path.join(ROOT, 'whitepapers', '_register.json');
const PAPERDIR = path.join(ROOT, 'whitepapers');
const OUTDIR  = path.join(ROOT, 'nieuws');

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

// ── plaats in de reeks ──
// Het totaal wordt hier GETELD uit wat werkelijk gepubliceerd wordt, niet uit een veld.
// Valt een bericht weg doordat een bewering eronder is ingetrokken, dan telt het niet meer
// mee en sluit de reeks zich — geen leesroute naar een pagina die er niet is.
const { posities, fouten: reeksfouten } = reeksPositie(berichten);
if (reeksfouten.length) {
  console.error('build-nieuws: ROOD — de reeksgegevens kloppen niet:');
  for (const f of reeksfouten) console.error('  · ' + f);
  process.exit(1);
}

// De titel van een paper staat in het paper zelf. Hier overtypen zou een tweede exemplaar
// zijn van iets dat al bestaat; bij de eerste hertitelde pagina lopen ze uiteen.
const paperTitel = (slug) => {
  const bestand = path.join(PAPERDIR, `${slug}.html`);
  if (!existsSync(bestand)) return null;
  const t = (readFileSync(bestand, 'utf8').match(/<title>([^<]*)<\/title>/) || [])[1];
  return t ? t.split(' — ')[0].split(' | ')[0].trim() : null;
};

// Een 'hoort bij' die nergens heen wijst, is een gebroken belofte op de pagina zelf. De
// schrijfstap weigert een onbekende slug al, maar die draait op een andere machine dan deze
// build — en een paper kan hernoemd worden nadat het bericht is goedgekeurd.
const wees = berichten.filter(b => b.hoort_bij && !paperTitel(b.hoort_bij));
if (wees.length) {
  console.error('build-nieuws: ROOD — bericht verwijst naar een whitepaper dat er niet is:');
  for (const b of wees) console.error(`  · ${b.slug} → ${b.hoort_bij}`);
  process.exit(1);
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

// De opmaak leest de kleuren, maten en letters uit lib/merk.mjs. Dat bestand is de
// machineleesbare kant van "Brandstyle publicaties v1"; hier staat geen enkele hex meer.
//
// DRIE DINGEN DIE HIERMEE ZIJN RECHTGEZET, en waarom ze fout waren:
//
// · CYAAN WAS EEN TEKSTKLEUR. Datumlabels, bronlinks en de routelink stonden in cyaan op het
//   lichte vlak: 2,5:1 gemeten, waar 4,5:1 de vloer is. Op donker haalt cyaan 6,9:1 en daar
//   mag hij blijven. Op licht is tekst navy; cyaan doet nog wel de onderlijn, want een lijn
//   is geen tekst.
// · TWEE ACCENTEN OP ÉÉN PAGINA. De herobalk en de routekaart stonden in rood terwijl de
//   labels cyaan waren. Het blad staat één accent per uiting toe. Cyaan is hier het
//   systeemaccent; rood is gereserveerd voor de status Weerlegd en komt dus alleen op de
//   pagina als een bewering werkelijk is tegengesproken.
// · DE ONDERBOUWING STOND IN MUTED. Muted is metadata (3,8:1). "Waar dit op rust" is de
//   inhoud van deze site, geen bijschrift — die staat nu in navy.
const STIJL = `
    :root{--cream:${KLEUR.cream};--papier:${PAPIER.geldig};--navy:${KLEUR.navy};
      --cyan:${KLEUR.cyan};--red:${KLEUR.red};--dark:${KLEUR.dark};--screen:${KLEUR.screen};
      --muted:${KLEUR.muted};--border:${KLEUR.hairline};--rule:rgba(0,26,77,.08);
      --radius:${MAAT.radius}}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:${FONT.sans};background:var(--cream);color:var(--navy);
      font-size:16px;font-weight:300;line-height:1.65;-webkit-font-smoothing:antialiased}
    .topbar{background:var(--screen);padding:16px 28px;display:flex;align-items:center;
      justify-content:space-between;gap:20px;flex-wrap:wrap}
    .tb-brand{display:flex;align-items:center;gap:12px;text-decoration:none}
    .tb-name{font-family:${FONT.mono};font-size:12px;letter-spacing:${TRACKING};
      text-transform:uppercase;color:var(--papier)}
    .tb-name span{color:var(--cyan)}
    .tb-back{font-family:${FONT.mono};font-size:11px;letter-spacing:${TRACKING};
      text-transform:uppercase;color:rgba(232,228,220,.58);text-decoration:none}
    .tb-back:hover{color:var(--cyan)}
    .hero{background:var(--dark);color:var(--papier);padding:56px 28px 66px;position:relative;overflow:hidden}
    .hero-inner{max-width:${MAAT.maxDocument};margin:0 auto;position:relative;z-index:2}
    .hero-rings{position:absolute;right:-130px;top:50%;transform:translateY(-50%);
      width:480px;height:480px;opacity:.5;pointer-events:none;z-index:1}
    .eyebrow{font-family:${FONT.mono};font-size:11px;letter-spacing:${TRACKING};
      text-transform:uppercase;color:var(--cyan);margin-bottom:20px}
    .hero h1{font-size:clamp(32px,6vw,42px);line-height:1.08;font-weight:600;
      letter-spacing:-.02em;margin-bottom:18px}
    .hero h1 strong{font-weight:600}
    .hero-bar{width:46px;height:2px;background:var(--cyan);margin-bottom:24px}
    .hero p{font-size:18px;font-weight:300;line-height:1.6;color:rgba(232,228,220,.80);max-width:${MAAT.maxRegel}}
    .wrap{max-width:${MAAT.maxDocument};margin:0 auto;padding:52px 28px 20px}
    .b{background:var(--papier);border:1px solid var(--border);border-radius:var(--radius);
      padding:${MAAT.cardPadding};margin-bottom:20px}
    .b-datum{font-family:${FONT.mono};font-size:11px;letter-spacing:${TRACKING};
      text-transform:uppercase;color:var(--navy);margin-bottom:12px}
    .b h2{font-size:clamp(22px,3vw,26px);font-weight:500;line-height:1.2;
      letter-spacing:-.01em;margin-bottom:14px;text-wrap:balance;scroll-margin-top:24px}
    .b h2 a{color:inherit;text-decoration:none}
    .b h2 a:hover{text-decoration:underline;text-decoration-color:var(--cyan);
      text-underline-offset:4px}
    .b p{font-size:16px;line-height:1.65;margin-bottom:14px;max-width:${MAAT.maxRegel}}
    /* Vlak op vlak, gescheiden door hairline — cream ín papier. Allebei basiskleuren, dus
       geen dubbele betekenis: de papiertreden blijven gereserveerd voor de toestand van een
       document (geldig · verlopend · achtergebleven) en doen hier geen dienst als diepte. */
    .b-grond{background:var(--cream);border:1px solid var(--border);
      border-left:${MAAT.accentrand} solid var(--cyan);border-radius:var(--radius);
      padding:16px 20px;margin-top:22px}
    .b-grond-kop{font-family:${FONT.mono};font-size:10px;letter-spacing:${TRACKING};
      text-transform:uppercase;color:var(--navy);margin-bottom:11px}
    .b-grond ul{list-style:none}
    .b-grond li{font-size:15px;line-height:1.6;color:var(--navy);margin-bottom:11px}
    .b-datumchip{display:inline-block;font-family:${FONT.mono};font-size:11px;
      color:var(--navy);background:rgba(15,168,203,.12);border-radius:var(--radius);
      padding:1px 7px;margin-right:9px;white-space:nowrap;font-variant-numeric:tabular-nums}
    .b-media{margin:0 0 20px;line-height:0}
    .b-media img,.b-media video{width:100%;height:auto;display:block;
      border:1px solid var(--border);border-radius:var(--radius)}
    .b-media figcaption{font-size:13px;color:var(--navy);line-height:1.5;padding-top:8px}
    .b-vid{position:relative;display:block}
    .b-vid .speel{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
    .b-vid .speel span{background:rgba(13,13,26,.85);color:var(--papier);font-family:${FONT.mono};
      font-size:12px;letter-spacing:${TRACKING};text-transform:uppercase;padding:12px 22px;
      border-radius:var(--radius)}
    .b-vid:hover .speel span{background:var(--cyan);color:var(--navy)}
    .b-merk{font-family:${FONT.mono};font-size:11px;letter-spacing:${TRACKING};
      text-transform:uppercase;color:var(--navy);margin-bottom:10px}
    .b-merk b{font-weight:400;color:var(--navy)}
    .reeksnav{margin-top:24px;padding-top:16px;border-top:1px solid var(--rule)}
    .reeksnav-kop{font-family:${FONT.mono};font-size:10px;letter-spacing:${TRACKING};
      text-transform:uppercase;color:var(--navy);margin-bottom:12px}
    .reeksnav-kop a{color:var(--navy);text-decoration:none;
      border-bottom:1px solid var(--cyan)}
    .reeksnav-paar{display:flex;gap:14px;flex-wrap:wrap}
    /* Op .reeksnav-paar en NIET op .reeksnav: de kopregel bevat bij 'hoort bij' een gewone
       inline link, en die kreeg met de bredere selector de kaderopmaak van een kaart —
       padding, rand en flex-basis rond drie woorden midden in een zin. */
    .reeksnav-paar a{flex:1 1 220px;text-decoration:none;color:var(--navy);font-size:15px;
      line-height:1.45;border:1px solid var(--border);border-radius:var(--radius);padding:12px 15px}
    .reeksnav-paar a:hover{border-color:var(--cyan)}
    .reeksnav-paar a span{display:block;font-family:${FONT.mono};font-size:10px;
      letter-spacing:${TRACKING};text-transform:uppercase;color:var(--navy);margin-bottom:5px}
    .b-bron{font-size:14px;white-space:nowrap;color:var(--navy);text-decoration:none;
      border-bottom:1px solid var(--cyan)}
    .b-bron-los{color:var(--navy);border-bottom:1px dotted rgba(122,110,133,.5)}
    .route{background:var(--papier);border-left:${MAAT.accentrand} solid var(--cyan);
      border-radius:var(--radius);padding:16px 20px;margin-bottom:20px;font-size:16px}
    .route a{color:var(--navy);text-decoration:none;border-bottom:1px solid var(--cyan)}
${STATUS_CSS}
    .deel{margin-top:24px;padding-top:16px;border-top:1px solid var(--rule);
      display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .deel-lbl{font-family:${FONT.mono};font-size:10px;letter-spacing:${TRACKING};
      text-transform:uppercase;color:var(--navy);margin-right:4px}
    .deel a{font-family:${FONT.mono};font-size:12px;letter-spacing:${TRACKING};
      color:var(--navy);text-decoration:none;border:1px solid var(--cyan);
      border-radius:var(--radius);padding:6px 14px;transition:background ${'160ms'} ease-out}
    .deel a:hover{background:rgba(15,168,203,.12)}
    .foot{max-width:${MAAT.maxDocument};margin:0 auto;padding:34px 28px 56px;display:flex;
      justify-content:space-between;gap:16px;flex-wrap:wrap;font-family:${FONT.mono};
      font-size:11px;letter-spacing:${TRACKING};text-transform:uppercase;color:var(--navy)}
    .foot a{color:var(--navy);text-decoration:none}
    .mee{max-width:${MAAT.maxDocument};margin:0 auto;padding:0 28px;font-size:15px;
      color:var(--navy);line-height:1.6;text-transform:none;letter-spacing:0}
    .mee a{color:var(--navy);text-decoration:none;border-bottom:1px solid var(--cyan)}
    .foot a:hover{color:var(--navy)}
    /* Ritme: donker openen, licht lezen, donker sluiten. De grootste sprong in levendigheid
       die er is, en hij kost niets aan corporate karakter — dezelfde schaal, anders verdeeld.
       Op donker mag cyaan wél tekst zijn: 6,9:1, ruim boven de vloer. */
    .afsluiter{background:var(--dark);margin-top:46px;padding-top:40px}
    .afsluiter .mee{color:rgba(232,228,220,.82)}
    .afsluiter .mee a{color:var(--cyan);border-bottom-color:var(--cyan)}
    .afsluiter .foot{color:rgba(232,228,220,.58);padding-bottom:46px}
    .afsluiter .foot a{color:rgba(232,228,220,.58)}
    .afsluiter .foot a:hover{color:var(--cyan)}
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
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400;500&display=swap" rel="stylesheet">
${extraLd}  <style>${STIJL}
  </style>
  <link rel="stylesheet" href="/media/merk.css">
</head>
<body>
  <header class="topbar">
    <a class="tb-brand rob-lockup-link" href="/" aria-label="Terug naar R.O.B. Concepting">
      <img class="rob-lockup" src="/media/logo/logo-rob-lengte-donker-transparant.png" width="589" height="117" alt="R.O.B. Concepting">
    </a>
    <a class="tb-back" href="/">&larr; Terug naar de site</a>
  </header>
`;

const VOET = `  <div class="afsluiter">
  <p class="mee">Nieuw werk verschijnt op deze site en op <a href="https://www.linkedin.com/in/rob-concepting/" target="_blank" rel="noopener noreferrer">LinkedIn</a>. Volg mee, of laat je leesapp het <a href="/nieuws/feed.xml">automatisch ophalen</a>.</p>

  <footer class="foot">
    <span>&copy; R.O.B. Concepting &middot; Rob de Rooij</span>
    <span><a href="/">rob-concepting.com</a> &middot; <a href="/whitepapers/">Whitepapers</a> &middot; <a href="/vragen/">Vragen</a> &middot; <a href="/nieuws/feed.xml">Feed</a></span>
  </footer>
  </div>
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
    // ONDERTITELING WORDT GEVONDEN, NIET GEMELD. Ligt er naast de mp4 een .vtt met dezelfde
    // naam, dan komt die er als spoor bij. Geen veld in het register en geen vinkje dat
    // iemand moet zetten: het bestand ís de aanwijzing. Zet je er later een neer, dan
    // verschijnt het spoor bij de eerstvolgende build.
    //
    // De video heeft de ondertiteling al ingebrand — dat is voor wie zonder geluid kijkt.
    // Het spoor is voor wie de tekst nodig heeft in plaats van ziet: een schermlezer, of
    // iemand die hem wil doorzoeken. Dat zijn twee verschillende dingen.
    const vttPad = b.video.replace(/\.mp4$/, '.vtt');
    const heeftVtt = vttPad !== b.video && existsSync(path.join(ROOT, vttPad.replace(/^\//, '')));
    return `
        <figure class="b-media">
          <video controls preload="metadata"${b.afbeelding ? ` poster="${esc(b.afbeelding)}"` : ''}>
            <source src="${esc(b.video)}" type="video/mp4">${heeftVtt ? `
            <track kind="captions" src="${esc(vttPad)}" srclang="nl" label="Nederlands">` : ''}
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
${b.bewijs.map(c => `            <li><span class="b-datumchip">${esc(datumLabel(c.dated, c.dated_precisie, c.dated_soort))}</span>${esc(c.text)}${c.bron_naam ? (c.bron_url ? ` <a class="b-bron" href="${esc(c.bron_url)}" target="_blank" rel="noopener noreferrer">${esc(c.bron_naam)}</a>` : ` <span class="b-bron b-bron-los">${esc(c.bron_naam)}</span>`) : ''}${statusHtml(c, esc)}</li>`).join('\n')}
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

// Het merkje boven een bericht in het overzicht: welke soort, en als het in een reeks staat
// het hoeveelste deel. Niet meer — het overzicht is een lijst, geen leesroute.
const merk = (b) => {
  const p = posities.get(b.slug);
  const soort = SOORT_LABEL[b.soort] || SOORT_LABEL.nieuws;
  return `        <div class="b-merk">${esc(soort)}${p ? ` &middot; deel <b>${p.nummer}</b>` : ''}</div>`;
};

// De voet van een berichtpagina: waar dit stuk staat en waar je heen kunt.
//
// "3 delen verschenen" en niet "van de 18" — het plan zegt achttien weken, maar een totaal
// dat vooruitloopt op wat er staat, is een belofte en geen telling. Deze zin klopt op elk
// moment, ook als de reeks halverwege een andere vorm krijgt.
const reeksnav = (b) => {
  const p = posities.get(b.slug);
  const regels = [];
  if (b.hoort_bij) {
    regels.push(`Hoort bij het whitepaper <a href="/whitepapers/${esc(b.hoort_bij)}">${esc(paperTitel(b.hoort_bij))}</a>`);
  }
  if (p) regels.push(`Deel ${p.nummer} &middot; ${p.totaal} ${p.totaal === 1 ? 'deel' : 'delen'} verschenen`);
  if (!regels.length) return '';

  const link = (ander, vorige) => `
            <a href="/nieuws/${esc(ander.slug)}/"><span>${vorige ? '&larr; Vorige' : 'Volgende &rarr;'} &middot; deel ${ander.volgnummer}</span>${esc(ander.titel)}</a>`;
  const paar = p && (p.vorige || p.volgende) ? `
          <div class="reeksnav-paar">${p.vorige ? link(p.vorige, true) : ''}${p.volgende ? link(p.volgende, false) : ''}
          </div>` : '';

  return `
        <nav class="reeksnav">
          <div class="reeksnav-kop">${regels.join(' &middot; ')}</div>${paar}
        </nav>`;
};

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
${reeksnav(b)}
${deel(b, u)}
      </div>
      <div class="route">
        De achtergrond bij dit bericht staat uitgewerkt in de whitepapers, met de bronnen erbij. <a href="/whitepapers/de-beste-keuze-is">De beste keuze is&hellip;</a> is het eerste deel.<br>
        Wil je weten waar je eigen organisatie het kwetsbaarst is? <a href="/kennisgezagsscan/">Doe de Kennisgezagsscan</a> in ongeveer vijf minuten.
      </div>

      <p style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:${TRACKING};
         text-transform:uppercase"><a href="/nieuws/" style="color:var(--cyan);text-decoration:none">&larr; Alle berichten</a></p>
  </main>

` + VOET);
}

// ── wat niet meer publiceerbaar is, gaat weg ──
//
// Deze stap schreef alleen wat er WEL is. Een bericht dat werd ingetrokken — of dat wegviel
// doordat een bewering eronder niet meer leverbaar is — hield daardoor zijn map, en
// build-publiek kopieert alles onder nieuws/. Gevolg: de pagina bleef online terwijl het
// register zei dat hij dat niet mocht zijn, en hij bleef in de sitemap staan.
//
// Dat is de ergste vorm van drift die deze site kent: de publicatie zegt iets anders dan het
// register. Publiceren is daarom vanaf hier tweezijdig — schrijven wat er is, én weghalen wat
// er niet meer is.
const levend = new Set(berichten.map(b => b.slug));
for (const naam of readdirSync(OUTDIR, { withFileTypes: true })) {
  if (!naam.isDirectory() || naam.name === 'concept' || levend.has(naam.name)) continue;
  const map = path.join(OUTDIR, naam.name);
  // Alleen mappen die deze stap zelf gemaakt kan hebben: precies één index.html erin.
  const inhoud = readdirSync(map);
  if (inhoud.length === 1 && inhoud[0] === 'index.html') {
    rmSync(map, { recursive: true, force: true });
    console.log(`  · ${naam.name} verwijderd — niet langer publiceerbaar`);
  } else {
    console.warn(`  · ${naam.name} staat er nog maar is geen berichtmap — met rust gelaten`);
  }
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
${berichten.length ? '' : `      <div class="b"><p>Er staan nog geen berichten. Het eerste volgt binnenkort.</p>
        <p style="font-size:15px">Ondertussen: de <a href="/whitepapers/" class="b-bron">whitepapers</a> en de <a href="/vragen/" class="b-bron">vragen met onderbouwing</a>.</p></div>`}
${berichten.map(b => `      <article class="b">
        <div class="b-datum">${esc(nlDatum(b.gepubliceerd_op))}</div>
${merk(b)}
        <h2><a href="/nieuws/${esc(b.slug)}/">${esc(b.titel)}</a></h2>
${media(b)}
        <p>${esc(b.samenvatting)}</p>
${grond(b)}
${deel(b, `${BASIS}/nieuws/${b.slug}/`)}
      </article>`).join('\n')}
      <div class="route">
        Deze berichten bouwen voort op de whitepapers &mdash; daar staat het betoog uitgewerkt, met de bronnen erbij. Het leest van voren af aan: <a href="/whitepapers/de-beste-keuze-is">De beste keuze is&hellip;</a> is het eerste deel, <a href="/whitepapers/">hier staat de hele reeks</a>.
      </div>
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
      <guid isPermaLink="false">${esc(b.ext_ref)}</guid>
      <pubDate>${rfc(b.gepubliceerd_op)}</pubDate>
      <description>${esc(b.samenvatting)}</description>
    </item>`).join('\n')}
  </channel>
</rss>
`);

console.log(`build-nieuws: ${berichten.length} bericht(en) van ${alle.length} goedgekeurd(e), plus overzicht en feed`);
