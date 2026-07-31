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
import { KLEUR, PAPIER, MAAT, GEMETEN, VLOER, contrast } from './lib/merk.mjs';

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

console.log('\n' + '='.repeat(46));
console.log(gezakt === 0 ? 'ALLE TOETSEN GESLAAGD' : `${gezakt} TOETS(EN) GEZAKT`);
process.exit(gezakt === 0 ? 0 : 1);
