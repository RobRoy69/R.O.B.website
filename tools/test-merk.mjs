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

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { KLEUR, PAPIER, MAAT, GEMETEN, VLOER, contrast, TOEGESTANE_HEX } from './lib/merk.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
let gezakt = 0;
const toets = (naam, goed, uitleg = '') => {
  console.log(`  ${goed ? '✓' : '✗'} ${naam}${goed ? '' : `  — ${uitleg}`}`);
  if (!goed) gezakt++;
};

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
// Cyaan mag tekstkleur zijn op een donker vlak. Op deze pagina's is dat de merknaam in de
// topbalk en de datum-eyebrow in de hero — allebei op --dark. Alles daarbuiten is een fout,
// en die lijst staat hier zodat een nieuwe uitzondering een bewuste regel is.
const OP_DONKER = ['.tb-name span', '.tb-back', '.eyebrow'];

console.log('\n3. geen cyaan als tekstkleur op licht, in de gebouwde pagina');
{
  const css = readFileSync(path.join(ROOT, 'nieuws', 'index.html'), 'utf8')
    .match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
  toets('opmaak gevonden in de pagina', css.length > 500, `${css.length} tekens`);

  // Alleen de eigenschap `color` telt. Mijn eerste versie hier matchte ook
  // `border-color` en `text-decoration-color` — een lijn in cyaan is toegestaan, tekst niet,
  // en dat verschil is precies waar deze poort over gaat. De grens vóór het woord vangt dat.
  const CYAAN_TEKST = /(^|[;{\s])color:\s*var\(--cyan\)/;
  const regels = css.split('}').map(r => r.trim()).filter(Boolean);
  const overtreders = regels
    .filter(r => CYAAN_TEKST.test(r))
    .map(r => r.split('{')[0].trim())
    .filter(sel => !OP_DONKER.some(w => sel.includes(w)));

  toets('geen onbekende cyaan-tekstregel', overtreders.length === 0, overtreders.join(' · '));

  // Muted is óók geen tekstkleur — 4,2:1 op papier, 3,8:1 op cream, 4,0:1 op dark. Het blad
  // noemt hem "metadata" en geeft 3,8:1 als toegestaan op; regel 7 van zijn eigen keuring
  // zegt 4,5:1 zonder uitzondering. De toets, niet de toelichting. Als lijnkleur mag hij wel.
  const mutedTekst = regels
    .filter(r => /(^|[;{\s])color:\s*var\(--muted\)/.test(r))
    .map(r => r.split('{')[0].trim());
  toets('geen muted als tekstkleur', mutedTekst.length === 0, mutedTekst.join(' · '));
  toets('de oude bronlink-regel is weg', !/\.b-bron\{[^}]*color:\s*var\(--cyan\)/.test(css));
  toets('de oude datumregel is weg', !/\.b-datum\{[^}]*color:\s*var\(--cyan\)/.test(css));
}

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

console.log('\n' + '='.repeat(46));
console.log(gezakt === 0 ? 'ALLE TOETSEN GESLAAGD' : `${gezakt} TOETS(EN) GEZAKT`);
process.exit(gezakt === 0 ? 0 : 1);
