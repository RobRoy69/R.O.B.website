// R.O.B. Concepting — rekent het merkblad na en bewaakt de twee regels die het vaakst breken.
//
// AANLEIDING. "Brandstyle publicaties v1" geeft zeven contrastwaarden op als gemeten. Een
// tabel die niemand naretkent is een bewering zonder bron — precies wat deze site bij anderen
// aanwijst. Dus rekent deze toets ze uit de hex-waarden zelf uit.
//
// En hij vangt de fout die er stond: op /nieuws/ was cyaan de kleur van datumlabels,
// bronlinks en de routelink, op een licht vlak. Gemeten 2,5:1 waar 4,5:1 de vloer is. Dat is
// niet zichtbaar bij het lezen van de opmaak — je ziet het pas als je het uitrekent.
//
// Draai: node tools/test-merk.mjs
// Exit 0 = groen, exit 1 = rood.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { KLEUR, PAPIER, MAAT, GEMETEN, VLOER, contrast, TOEGESTANE_HEX, BLAD, gelezenToken } from './lib/merk.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
let gezakt = 0;
const toets = (naam, goed, uitleg = '') => {
  console.log(`  ${goed ? '✓' : '✗'} ${naam}${goed ? '' : `  — ${uitleg}`}`);
  if (!goed) gezakt++;
};

console.log('\n0. één bron: media/merk.css houdt zich aan Stylesheet v2');
{
  const afwijkend = Object.entries(BLAD).filter(([k, v]) => gelezenToken(k) !== v);
  toets(`${Object.keys(BLAD).length} tokens gelijk aan het blad`, afwijkend.length === 0,
        afwijkend.map(([k, v]) => `--${k} is ${gelezenToken(k)}, blad zegt ${v}`).join(' · '));
  // De hairline liep op 31 juli al uiteen: 0,14 in merk.css tegen 0,12 in het blad — één dag
  // nadat beide bestanden waren gemaakt. Daarom leest merk.mjs de waarden nu en herhaalt ze
  // niet, en daarom toetst dit blok ze tegen de norm in plaats van tegen zichzelf.
  // Alleen code telt. Een hex in een toelichting is documentatie — het stuk hierboven legt
  // uit wélke waarden uiteenliepen, en dat moet je kunnen opschrijven zonder dat de poort
  // denkt dat je een tweede palet aanlegt. Commentaar er dus af voor je telt.
  const zonderUitleg = readFileSync(path.join(ROOT, 'tools', 'lib', 'merk.mjs'), 'utf8')
    .split('export const BLAD')[0]
    .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const herhaald = zonderUitleg.match(/#[0-9a-f]{6}\b/gi) || [];
  toets('merk.mjs definieert geen eigen hex', herhaald.length === 0, herhaald.join(' '));
}

console.log('\n1. de contrasttabel uit het blad, nagerekend uit de hex-waarden');
for (const g of GEMETEN) {
  const echt = contrast(g.voor, g.achter);
  toets(`${g.voor} op ${g.achter} → ${g.verwacht}:1`,
        Math.abs(echt - g.verwacht) <= 0.15, `nagerekend ${echt}:1`);
}

console.log('\n2. de oordelen kloppen met de vloeren');
{
  const tekstOpLicht = contrast(KLEUR.navy, PAPIER.geldig);
  const cyaanOpLicht = contrast(KLEUR.cyan, KLEUR.cream);
  const cyaanOpDonker = contrast(KLEUR.cyan, KLEUR.dark);
  const mutedOpLicht = contrast(KLEUR.muted, KLEUR.cream);
  toets('navy op papier is tekstwaardig', tekstOpLicht >= VLOER.tekst, `${tekstOpLicht}:1`);
  toets('cyaan op licht is dat NIET', cyaanOpLicht < VLOER.tekst, `${cyaanOpLicht}:1 — dan mag het wel`);
  toets('cyaan op donker mag als label', cyaanOpDonker >= VLOER.grootTekst, `${cyaanOpDonker}:1`);
  toets('muted haalt de tekstvloer niet — alleen metadata', mutedOpLicht < VLOER.tekst, `${mutedOpLicht}:1`);
}

// ── de poort op wat er werkelijk gegenereerd wordt ──
//
// EERST STOND HIER EEN LIJST met selectors die "op donker" staan, met de hand bijgehouden.
// Dat is dezelfde fout als een handmatig bijgehouden publicatielijst, alleen in CSS: hij
// klopt tot iemand een vlak toevoegt. Op 31 juli gebeurde dat meteen — ik zette de links in
// .slot-in van cyaan naar navy omdat "cyaan geen tekstkleur is", zonder te zien dat .slot-in
// een dónkere achtergrond heeft. Resultaat: navy op dark, 1,2:1, onleesbaar. De poort zweeg,
// want .slot-in stond niet op het lijstje.
//
// Nu leidt hij af wélke vlakken donker zijn: elke regel die background op --dark of --screen
// zet, maakt zichzelf en alles eronder donker. Daarna wordt per tekstkleur de verhouding
// tegen de júiste ondergrond uitgerekend. Dat werkt in beide richtingen — te licht op licht
// én te donker op donker — en er valt niets meer te vergeten.
const HEX = { cyan: KLEUR.cyan, navy: KLEUR.navy, muted: KLEUR.muted, red: KLEUR.red,
              cream: KLEUR.cream, dark: KLEUR.dark, screen: KLEUR.screen,
              paper: PAPIER.geldig, papier: PAPIER.geldig };

/** Kleurwaarde uit een CSS-waarde halen: var(--x), #hex, of rgba over een bekende grond. */
const kleurUit = (waarde, achter) => {
  const v = waarde.match(/var\(--([a-z-]+)\)/);
  if (v) return HEX[v[1]] ?? null;
  const h = waarde.match(/#[0-9a-f]{6}\b/i);
  if (h) return h[0].toLowerCase();
  const r = waarde.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/i);
  if (!r) return null;
  const a = r[4] === undefined ? 1 : Number(r[4]);
  const b = (achter || KLEUR.cream).replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16));
  return '#' + [1, 2, 3].map(i => Math.round(a * Number(r[i]) + (1 - a) * b[i - 1])
    .toString(16).padStart(2, '0')).join('');
};

// Alle gegenereerde oppervlakken, niet alleen /nieuws/. De contrastfout van vanochtend zat
// in build-nieuws, maar dezelfde constructie stond in build-vragen — en die viel buiten de
// poort omdat die maar naar één bestand keek. Een poort die één pagina bewaakt, bewaakt de
// andere niet: dat is geen dekking maar een steekproef.
const PAGINAS = ['nieuws/index.html', 'vragen/index.html', 'publiek/bewijs/index.html'];

const overgeslagen = [];

console.log('\n3. geen cyaan als tekstkleur op licht, in de gebouwde pagina');
for (const pagina of PAGINAS) {
  console.log(`  · ${pagina}`);
  const volPad = path.join(ROOT, pagina);
  // Sommige oppervlakken bestaan alleen in de publicatie, en publiek/ staat in .gitignore.
  // Zonder deze regel stierf `node tools/test-merk.mjs` op een verse checkout met ENOENT —
  // hij werkte alleen doordat npm run deploy toevallig eerst bouwt. Overslaan mag, maar dan
  // wél hardop: een toets die stil minder controleert dan hij belooft, is de ergste soort.
  if (!existsSync(volPad)) {
    console.log(`    overgeslagen — ${pagina} bestaat niet; draai eerst npm run bouw`);
    overgeslagen.push(pagina);
    continue;
  }
  const bron = readFileSync(volPad, 'utf8');

  // De gedeelde merklaag telt mee, en wel IN DE VOLGORDE WAARIN DE BROWSER HEM LAADT.
  // Elke gegenereerde pagina zet <link href="/media/merk.css"> ná zijn eigen <style>, dus de
  // merklaag komt LATER en wint bij gelijk gewicht. Mijn eerste versie zette hem ervóór —
  // dan worden gelijkwaardige regels precies omgekeerd opgelost, en meet de toets iets
  // anders dan er op het scherm staat. Dat is geen detail: een poort die de verkeerde kant
  // op resolvet, keurt juist de regressies goed die hij moet vangen.
  const merklaag = bron.includes('/media/merk.css')
    ? readFileSync(path.join(ROOT, 'media', 'merk.css'), 'utf8') : '';
  const css = (bron.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '')
    + merklaag
    // Inline style-attributen tellen mee: daar zat de cyaan linkkleur op /vragen/.
    + [...bron.matchAll(/style="([^"]*)"/g)].map(m => `[inline]{${m[1]}}`).join('');
  toets('opmaak gevonden in de pagina', css.length > 500, `${css.length} tekens`);

  // Commentaar eruit vóór het parsen. Zonder deze stap slurpt de selector-match alles wat
  // tussen de vorige `}` en de volgende `{` staat — inclusief een toelichtingsblok — en dan
  // heet het donkere vlak niet `.afsluiter` maar `/* Ritme: ... */ .afsluiter`. Gevolg: geen
  // enkele afstammeling wordt als "op donker" herkend en de hele meting kantelt.
  // @media print eruit. Deze toets meet het SCHERM; de printregels zetten alles op donkere
  // inkt omdat browsers zonder achtergronden printen. Zonder deze stap las de toets die
  // regels als altijd-geldend — ze staan achteraan, dus ze wonnen — en meldde de hele
  // donkere afsluiter als navy-op-dark, 1,2:1. Een bevinding over een toestand die alleen
  // op papier bestaat, en daar juist klopt.
  const zonderPrint = (bron) => {
    let uit = '', i = 0;
    while (i < bron.length) {
      const start = bron.indexOf('@media print', i);
      if (start < 0) { uit += bron.slice(i); break; }
      uit += bron.slice(i, start);
      let j = bron.indexOf('{', start), diepte = 0;
      for (; j < bron.length; j++) {
        if (bron[j] === '{') diepte++;
        else if (bron[j] === '}' && --diepte === 0) { j++; break; }
      }
      i = j;
    }
    return uit;
  };

  // De HELE selectorlijst, niet alleen de laatste regel ervan. Dat laatste was een noodgreep
  // tegen commentaar dat vóór de selector staat — maar commentaar wordt nu al gestript, en de
  // noodgreep sloeg in de merklaag de halve lijst weg: bij
  //     .afsluiter .mee,
  //     .afsluiter .wp-mee { … }
  // bleef alleen de tweede over, en dus dacht de toets dat .mee in de afsluiter geen eigen
  // regel had. Uitkomst: hij meldde de hele donkere voet als navy-op-dark.
  const regels = [...zonderPrint(css.replace(/\/\*[\s\S]*?\*\//g, '')).matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .map(m => ({ sel: m[1].trim().replace(/\s*\n\s*/g, ' '), body: m[2] }));

  // Welke vlakken zijn donker? Afgeleid uit de opmaak — en welke tekst dáárin staat, uit de
  // echte DOM. Selector-tekst alleen kan afstamming niet bepalen: .eyebrow zegt niet dat hij
  // in .hero staat, en een inline style zegt helemaal niets. Daarom wordt de pagina hier
  // werkelijk geparseerd. linkedom staat al in de dependencies voor de kennisproef.
  const { document } = parseHTML(bron);

  // Per element de LAATSTE regel die een eigenschap zet — dat benadert de cascade. Zonder
  // deze stap sloeg de toets alarm op `.foot{color:navy}` terwijl `.afsluiter .foot` die
  // regel op elke pagina overschrijft: een melding over een kleur die nergens zichtbaar is.
  // SPECIFICITEIT, niet alleen volgorde. Een eerdere versie nam simpelweg de laatste regel
  // die paste. Dat ging goed zolang alle opmaak in de pagina zelf stond, maar zodra de
  // gedeelde merklaag meetelt — die de browser vóór de pagina laadt — klopt het niet meer:
  // `.afsluiter .mee` uit de merklaag wint van `.mee` uit de pagina, ook al staat die later.
  // De toets meldde daardoor de hele donkere voet als navy-op-dark terwijl de browser gewoon
  // cream toonde. Een poort die dat doet, leer je negeren.
  const gewicht = (sel) => {
    const s = sel.replace(/::[a-z-]+/g, '');
    return (s.match(/#[\w-]+/g) || []).length * 100
         + (s.match(/\.[\w-]+|\[[^\]]+\]|:[a-z-]+(\([^)]*\))?/g) || []).length * 10
         + (s.match(/(^|[\s>+~])[a-z]+[\w-]*/gi) || []).length;
  };

  const gezet = (el, eig) => {
    let laatste = null, best = -1;
    for (const [volgnr, r] of regels.entries()) {
      if (r.sel.startsWith(':root') || r.sel.startsWith('[inline]')) continue;
      const m = r.body.match(new RegExp(`(?:^|[;{\\s])${eig}:\\s*([^;]+)`));
      if (!m) continue;
      for (const sel of r.sel.split(',')) {
        try {
          if (!el.matches(sel.trim())) continue;
          const score = gewicht(sel.trim()) * 10000 + volgnr; // gelijk gewicht → later wint
          if (score >= best) { best = score; laatste = m[1].trim(); }
        } catch {}
      }
    }
    const inline = el.getAttribute && el.getAttribute('style');
    const im = inline && inline.match(new RegExp(`(?:^|[;\\s])${eig}:\\s*([^;]+)`));
    return im ? im[1].trim() : laatste;
  };

  // Donker is niet "staat er dark in" maar "de opgeloste kleur is donker". De datumchip heeft
  // background rgba(15,168,203,.12) — cyaan op 12 procent, dus lichter dan het papier
  // eronder. Een tekstmatch op "rgba(15," zou hem donker noemen; de luminantie weet beter.
  const grondVan = (el) => {
    for (let n = el; n && n.tagName; n = n.parentElement) {
      const bg = gezet(n, 'background(?:-color)?');
      if (!bg || /transparent|none/.test(bg)) continue;
      const opgelost = kleurUit(bg, PAPIER.geldig);
      if (opgelost) return opgelost;
    }
    return PAPIER.geldig;
  };

  const laag = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (!el.textContent || !el.textContent.trim()) continue;
    const kleur = gezet(el, 'color');
    if (!kleur) continue;
    const grond = grondVan(el);
    const voor = kleurUit(kleur, grond);
    if (!voor) continue;
    const v = contrast(voor, grond);
    if (v < VLOER.tekst) {
      // De melding moet aanwijzen WELK element, niet alleen welke kleur. Een bevinding die
      // je niet kunt terugvinden, kost meer tijd dan hij bespaart: bij de eerste rode CI-run
      // stond er alleen "a → 2,5:1" en dat kan overal zitten. Nu staat het pad erbij.
      const pad = [];
      for (let n = el; n && n.tagName && n.tagName !== 'BODY'; n = n.parentElement) {
        pad.unshift(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).trim().split(/\s+/).join('.') : ''));
      }
      const naam = pad.join(' > ');
      const tekst = (el.textContent || '').trim().slice(0, 40);
      laag.set(naam, `${naam} → ${v}:1 (${voor} op ${grond}) "${tekst}"`);
    }
  }

  toets(`elke tekstkleur haalt ${VLOER.tekst}:1 op zijn eigen ondergrond`,
        laag.size === 0, [...laag.values()].join(' · '));
}

// Overslaan mag, maar niet stilzwijgend. Zonder deze regel kan de toets in de toekomst
// nul pagina's controleren en toch groen melden — dat is de vorm van dekking die je pas
// ontdekt als er iets fout is gegaan.
if (overgeslagen.length) {
  console.log(`  · ${overgeslagen.length} van ${PAGINAS.length} oppervlakken NIET gecontroleerd (${overgeslagen.join(', ')})`);
}
toets(`${PAGINAS.length - overgeslagen.length} van ${PAGINAS.length} oppervlakken werkelijk gemeten`,
      PAGINAS.length - overgeslagen.length > 0,
      'geen enkele pagina gecontroleerd — draai eerst npm run bouw');

console.log('\n4. de maten uit het blad staan in de pagina');
{
  const html = readFileSync(path.join(ROOT, 'nieuws', 'index.html'), 'utf8');
  toets(`radius ${MAAT.radius}, één waarde`, html.includes(`--radius:${MAAT.radius}`));
  toets(`document ${MAAT.maxDocument} breed`, html.includes(`max-width:${MAAT.maxDocument}`));
  toets(`kaartpadding ${MAAT.cardPadding}`, html.includes(`padding:${MAAT.cardPadding}`));
  toets('geen pil- of capsulevorm', !/border-radius:\s*(999|9999|50%)/.test(html),
        'het blad verbiedt hoeken groter dan 2px');
  toets('geen afgeronde hoek groter dan 2px',
        !/border-radius:\s*(?!var\()(?:[3-9]|[1-9]\d)/.test(html));
  toets('geen verdwenen drift-waarden', !html.includes('#6b6478') && !html.includes('#f4f2ed'),
        'oude muted of oud papier staat er nog in');
}

// ── 5. de keuringslijst uit Stylesheet v2 ──
//
// Tien regels staan er; deze vier zijn op een webpagina machinaal te toetsen. De zes andere
// gaan over bewegend beeld en foto — bandbreedtes per formaat, laagoverlap, bronresolutie,
// leestijd — en horen in de werkbank, niet hier. Ze staan bewust NIET stil overgeslagen:
// wie ze hier zoekt, leest in KEURING_WEB waarom er vier zijn.
console.log('\n5. de keuring, voor zover een webpagina hem kan afleggen');
{
  const html = readFileSync(path.join(ROOT, 'nieuws', 'index.html'), 'utf8');
  // %23 is een # in een data-URI (het favicon). Zonder deze stap glipt elke kleur daarin door.
  const genormaliseerd = html.replace(/%23/g, '#');

  const hexen = [...new Set((genormaliseerd.match(/#[0-9a-fA-F]{6}\b/g) || []).map(h => h.toLowerCase()))];
  const vreemd = hexen.filter(h => !TOEGESTANE_HEX.includes(h));
  toets(`elke hex komt uit de negen tokens (${hexen.length} gevonden)`,
        vreemd.length === 0, `buiten het palet: ${vreemd.join(', ')}`);

  toets('geen gradient', !/(linear|radial|conic)-gradient/i.test(html));
  toets('geen cursief', !/font-style:\s*italic/i.test(html));

  const gewichten = [...new Set((html.match(/font-weight:\s*(\d{3})/g) || [])
    .map(m => Number(m.match(/\d{3}/)[0])))];
  toets(`geen gewicht boven 600 (${gewichten.sort().join(', ')})`,
        gewichten.every(g => g <= 600), `te zwaar: ${gewichten.filter(g => g > 600).join(', ')}`);

  // v2 noemt 0.14em bij 'meta' expliciet "de enige tracking-waarde". Negatieve waarden zijn
  // geen tracking maar optische correctie op display-tekst en vallen er dus buiten.
  const trackings = [...new Set((html.match(/letter-spacing:\s*([-.\d]+em)/g) || [])
    .map(m => m.split(':')[1].trim()))].filter(v => !v.startsWith('-'));
  toets(`één positieve tracking-waarde (${trackings.join(', ')})`,
        trackings.length === 1 && trackings[0] === '0.14em', 'v2 kent er maar één');
}

// ── 6. het ritme, op elke gepubliceerde pagina ──
//
// Donker openen, licht lezen, donker sluiten. Vier pagina's hadden dat en vijftien niet; nu
// is het een eigenschap van de publicatie in plaats van van een paar bouwstappen.
//
// ÉÉN UITZONDERING, en die staat hier met de reden erbij. De homepage is geen schuivend
// document maar een applicatie met vijf panelen en zeven donkere vlakken; een afsluiter
// onderaan zou daar niets afsluiten. Wordt deze lijst ooit langer dan één, dan is het geen
// uitzondering meer maar een tweede regel — en dan hoort hij in CLAUDE.md, niet hier.
const GEEN_AFSLUITER = ['index.html'];

console.log('\n6. elke gepubliceerde pagina sluit donker af');
{
  const pub = path.join(ROOT, 'publiek');
  const paginas = [];
  const loop = (map, pre = '') => {
    for (const naam of readdirSync(map)) {
      const vol = path.join(map, naam);
      if (statSync(vol).isDirectory()) { loop(vol, `${pre}${naam}/`); continue; }
      // Klantmateriaal in de besloten demozone valt buiten de merkkeuring — regel in
      // CLAUDE.md (2026-08-05). Alleen deze ene map; de demonstratie zelf doet gewoon mee.
      if (`${pre}${naam}`.startsWith('ervaring/presentaties/')) continue;
      if (naam.endsWith('.html')) paginas.push([`${pre}${naam}`, readFileSync(vol, 'utf8')]);
    }
  };
  if (existsSync(pub)) loop(pub);

  toets('er is een publicatie om te toetsen', paginas.length > 5, `${paginas.length} pagina's`);
  const zonder = paginas
    .filter(([, h]) => !/class="afsluiter"/.test(h.split('</head>')[1] || ''))
    .map(([n]) => n)
    .filter(n => !GEEN_AFSLUITER.includes(n));
  toets(`${paginas.length - zonder.length - GEEN_AFSLUITER.length} van ${paginas.length} pagina's, plus ${GEEN_AFSLUITER.length} met reden uitgezonderd`,
        zonder.length === 0, `zonder afsluiter: ${zonder.join(', ')}`);

  // De opmaak hoort in de gedeelde laag te staan en niet per bouwstap. Stond eerst dubbel.
  const merkcss = readFileSync(path.join(ROOT, 'media', 'merk.css'), 'utf8');
  toets('de afsluiter staat in de merklaag', /\.afsluiter\s*\{/.test(merkcss));
  const dubbel = ['build-nieuws.mjs', 'build-vragen.mjs']
    .filter(f => /\.afsluiter\s*\{/.test(readFileSync(path.join(ROOT, 'tools', f), 'utf8')));
  toets('en nergens anders', dubbel.length === 0, `ook nog in: ${dubbel.join(', ')}`);

  // Een <footer> binnen een <section> verliest zijn contentinfo-landmark. Die les is betaald.
  const secties = paginas.filter(([, h]) => /<section[^>]*class="afsluiter"/.test(h)).map(([n]) => n);
  toets('de afsluiter is altijd een div', secties.length === 0, secties.join(', '));
}

console.log('\n' + '='.repeat(46));
console.log(gezakt === 0 ? 'ALLE TOETSEN GESLAAGD' : `${gezakt} TOETS(EN) GEZAKT`);
process.exit(gezakt === 0 ? 0 : 1);
