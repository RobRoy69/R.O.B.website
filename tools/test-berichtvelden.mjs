// R.O.B. Concepting — toetst de telling van de reeks.
//
// AANLEIDING. De vier berichtvelden landden vóór de berichten, en dat is de bedoeling: bij
// bericht vijf zou het invullen met terugwerkende kracht moeten. Maar daardoor is er ook
// nauwelijks data om de weergave op te betrappen — op het moment dat dit is geschreven staat
// er één bericht en dat zit in geen reeks. Een telling die pas bij deel drie voor het eerst
// echt draait, is tot die tijd een aanname.
//
// Daarom staat de rekenkant in lib/reeks.mjs en niet in de bouwstap: zo kan hij hier op
// verzonnen berichten worden losgelaten zonder database en zonder build.
//
// WAT HIER NIET WORDT GETEST: de opmaak. Dat de nav er goed uitziet, blijkt uit de pagina.
// Wat onbewezen was is de TELLING en de VOLGORDE — en dat is wat hier wordt afgevuurd.
//
// Draai: node tools/test-berichtvelden.mjs
// Exit 0 = groen, exit 1 = rood.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { reeksPositie, SOORTEN, SOORT_LABEL } from './lib/reeks.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

let gezakt = 0;
const toets = (naam, goed, uitleg = '') => {
  console.log(`  ${goed ? '✓' : '✗'} ${naam}${goed ? '' : `  — ${uitleg}`}`);
  if (!goed) gezakt++;
};
const b = (slug, reeks, volgnummer) => ({ slug, titel: slug, reeks, volgnummer });

console.log('\n1. één deel — de opener staat alleen');
{
  const { posities, fouten } = reeksPositie([b('deel-een', 'reeks', 1)]);
  const p = posities.get('deel-een');
  toets('geen bevindingen', fouten.length === 0, fouten.join('; '));
  toets('nummer 1', p?.nummer === 1, JSON.stringify(p));
  toets('totaal 1 — geteld, niet 18', p?.totaal === 1, JSON.stringify(p));
  toets('geen vorige en geen volgende', !p?.vorige && !p?.volgende, JSON.stringify(p));
}

console.log('\n2. drie delen — het middelste kijkt beide kanten op');
{
  const { posities, fouten } = reeksPositie([
    b('c', 'reeks', 3), b('a', 'reeks', 1), b('bb', 'reeks', 2),
  ]);
  const m = posities.get('bb');
  toets('geen bevindingen', fouten.length === 0, fouten.join('; '));
  toets('totaal telt alle drie', m?.totaal === 3, JSON.stringify(m));
  toets('vorige is deel 1', m?.vorige?.slug === 'a', JSON.stringify(m?.vorige));
  toets('volgende is deel 3', m?.volgende?.slug === 'c', JSON.stringify(m?.volgende));
  toets('invoervolgorde doet er niet toe', posities.get('a').volgende?.slug === 'bb');
  toets('het laatste deel heeft geen volgende', !posities.get('c').volgende);
}

console.log('\n3. een gat — deel 3 is ingetrokken, de reeks sluit zich');
{
  const { posities, fouten } = reeksPositie([
    b('a', 'reeks', 1), b('bb', 'reeks', 2), b('d', 'reeks', 4),
  ]);
  toets('een gat is GEEN bevinding', fouten.length === 0, fouten.join('; '));
  toets('deel 2 wijst door naar deel 4', posities.get('bb').volgende?.slug === 'd');
  toets('totaal is 3, niet 4', posities.get('d').totaal === 3, JSON.stringify(posities.get('d')));
  toets('het nummer blijft 4', posities.get('d').nummer === 4);
}

console.log('\n4. twee reeksen — ze tellen niet in elkaar door');
{
  const { posities } = reeksPositie([
    b('x1', 'een', 1), b('x2', 'een', 2), b('y1', 'ander', 1),
  ]);
  toets('reeks "een" telt 2', posities.get('x1').totaal === 2);
  toets('reeks "ander" telt 1', posities.get('y1').totaal === 1);
  toets('geen kruisverwijzing', !posities.get('y1').volgende && !posities.get('y1').vorige);
}

console.log('\n5. losse berichten — die staan nergens in');
{
  const { posities, fouten } = reeksPositie([
    { slug: 'los', titel: 'los', reeks: null, volgnummer: null },
  ]);
  toets('geen bevindingen', fouten.length === 0, fouten.join('; '));
  toets('krijgt geen plaats', !posities.has('los'));
}

// ── de sabotages: dit is waar de poort rood hoort te worden ──

console.log('\n6. sabotage — twee delen met hetzelfde nummer');
{
  const { fouten } = reeksPositie([b('a', 'reeks', 2), b('bb', 'reeks', 2)]);
  toets('ROOD', fouten.length > 0, 'dubbel volgnummer werd geslikt');
  toets('noemt beide berichten', fouten.some(f => f.includes('a') && f.includes('bb')), fouten.join('; '));
}

console.log('\n7. sabotage — half ingevulde reeksgegevens');
{
  const zonderNr = reeksPositie([b('a', 'reeks', null)]).fouten;
  const zonderReeks = reeksPositie([b('a', null, 3)]).fouten;
  toets('reeks zonder volgnummer is ROOD', zonderNr.length > 0, 'geslikt');
  toets('volgnummer zonder reeks is ROOD', zonderReeks.length > 0, 'geslikt');
}

console.log('\n8. sabotage — een volgnummer dat geen plaats is');
{
  const nul = reeksPositie([b('a', 'reeks', 0)]).fouten;
  const half = reeksPositie([b('a', 'reeks', 1.5)]).fouten;
  toets('0 is ROOD', nul.length > 0, 'nul werd een plaats');
  toets('1,5 is ROOD', half.length > 0, 'een half deel werd een plaats');
}

console.log('\n9. de soortenlijst en zijn labels lopen niet uiteen');
{
  const zonderLabel = SOORTEN.filter(s => !SOORT_LABEL[s]);
  const zonderSoort = Object.keys(SOORT_LABEL).filter(s => !SOORTEN.includes(s));
  toets('elke soort heeft een label', zonderLabel.length === 0, zonderLabel.join(', '));
  toets('elk label hoort bij een soort', zonderSoort.length === 0, zonderSoort.join(', '));
  toets('"nieuws" bestaat — bericht:rob:001 draagt hem', SOORTEN.includes('nieuws'));
}

// ── 10. de sync haalt op wat de bouwer leest ──
//
// AANLEIDING, 31 juli. De videopost stond live zónder video. sync-berichten haalde
// afbeelding, afbeelding_alt en video niet op uit het register; de bouwer las ze wel. Lokaal
// viel dat niet op omdat mijn projectie met de hand was samengesteld en de velden wél had.
// Elke build met echte sleutels gooide ze weg.
//
// Dat is een handmatig bijgehouden lijst die moet overeenkomen met een andere plek — precies
// het patroon dat hier alles kapotmaakt. Je kunt hem niet afschaffen (PostgREST wil een
// select), dus wordt hij hier vergeleken met wat de bouwer werkelijk aanraakt.
console.log('\n10. sync-berichten haalt elk veld op dat build-nieuws leest');
{
  const lees = (n) => readFileSync(path.join(ROOT, 'tools', n), 'utf-8');
  const select = (lees('sync-berichten.mjs').match(/select=([^&"']+)/) || [])[1] || '';
  const opgehaald = new Set(select.split(','));

  // Wat de bouwer van een bericht afleest. 'bewijs' hoort er niet bij: dat voegt build-nieuws
  // zelf toe uit de claimprojectie en staat niet in de berichtentabel.
  const gebruikt = [...new Set((lees('build-nieuws.mjs').match(/\bb\.[a-z_]+/g) || [])
    .map(s => s.slice(2)))].filter(v => v !== 'bewijs');

  const mist = gebruikt.filter(v => !opgehaald.has(v));
  toets(`${gebruikt.length} gelezen velden, alle opgehaald`, mist.length === 0,
        `niet in de select: ${mist.join(', ')}`);
  toets('de select is niet leeg', opgehaald.size > 5, select);
}

console.log('\n' + '='.repeat(46));
console.log(gezakt === 0 ? 'ALLE TOETSEN GESLAAGD' : `${gezakt} TOETS(EN) GEZAKT`);
process.exit(gezakt === 0 ? 0 : 1);
