// R.O.B. Concepting — klopt de belofte "een directe link betekent nagetrokken"?
//
// DE BELOFTE. Elk paper zegt onder zijn bronnenlijst dat bronnen met een directe link bij de
// bron zijn nagetrokken. Dat is geen sfeerzin: het is de enige reden dat "Klopt" op /bewijs/
// iets betekent. Zonder die belofte is de status een geruststelling zonder grond.
//
// AANLEIDING, 2026-07-28. Ik heb de controledatum in het register eerst afgeleid uit de
// links in de papers, en daarna met de hand bijgewerkt toen G2 en Forrester hun link kregen.
// Twee lijsten dus, die iemand gelijk moet houden — en dat is deze week vijf keer misgegaan
// op precies dat patroon. Deze poort haalt de hand ertussenuit.
//
// TWEE RICHTINGEN, want beide kanten liegen anders:
//   · een bron met een link in het paper maar zonder controledatum in het register: het paper
//     belooft iets dat het register niet waarmaakt;
//   · een bron met een controledatum maar zonder link in enig paper: het register claimt een
//     controle die de lezer nergens kan navolgen.
//
// Draai: node tools/verify-nagetrokken.mjs
// Sabotage-test: node tools/verify-nagetrokken.mjs --saboteer

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAPERS = path.join(ROOT, 'whitepapers');
const PROJ = path.join(PAPERS, '_register.json');
const saboteer = process.argv.includes('--saboteer');

if (!existsSync(PROJ)) {
  console.error('verify-nagetrokken: _register.json ontbreekt — draai eerst sync-register.');
  process.exit(1);
}

// Alle URL's die als link in een bronnensectie staan. Alleen dáár: een link in de lopende
// tekst is een verwijzing, geen bronverantwoording, en draagt de belofte niet.
const gelinkt = new Set();
for (const n of readdirSync(PAPERS).filter(x => x.endsWith('.html') && x !== 'index.html')) {
  const html = readFileSync(path.join(PAPERS, n), 'utf8');
  for (const sec of html.match(/<section class="bronnen">[\s\S]*?<\/section>/g) || []) {
    for (const m of sec.matchAll(/href="(https?:\/\/[^"]+)"/g)) gelinkt.add(m[1]);
  }
}

if (saboteer) {
  const eerste = [...gelinkt][0];
  gelinkt.delete(eerste);
  console.log(`SABOTAGE ACTIEF — link ${eerste} weggedacht. Verwacht: ROOD.\n`);
}

const claims = JSON.parse(readFileSync(PROJ, 'utf8')).claims;

// Per bron-URL: is er een controledatum, en staat er een link?
const perUrl = new Map();
for (const c of claims) {
  if (!c.bron_url) continue;
  if (!perUrl.has(c.bron_url)) {
    perUrl.set(c.bron_url, { naam: c.bron_naam, nagetrokken: c.nagetrokken_op, refs: [] });
  }
  perUrl.get(c.bron_url).refs.push(c.ext_ref);
}

const fouten = [];
for (const [url, b] of perUrl) {
  const heeftLink = gelinkt.has(url);
  if (heeftLink && !b.nagetrokken) {
    fouten.push(`${b.naam}: staat als directe link in een paper, maar heeft geen controledatum `
      + `in het register — het paper belooft meer dan het register waarmaakt (${b.refs.join(', ')})`);
  }
  if (!heeftLink && b.nagetrokken) {
    fouten.push(`${b.naam}: heeft een controledatum (${b.nagetrokken}) maar staat in geen enkel `
      + `paper als directe link — de lezer kan die controle nergens navolgen (${b.refs.join(', ')})`);
  }
}

if (fouten.length) {
  console.error(`POORT ROOD — ${fouten.length} bevinding(en) op de belofte "een link betekent nagetrokken":`);
  for (const f of fouten) console.error('  · ' + f);
  process.exit(1);
}

const metDatum = [...perUrl.values()].filter(b => b.nagetrokken).length;
console.log(`nagetrokken groen — ${gelinkt.size} directe bronlinks in de papers, `
  + `${metDatum} bronnen met een controledatum, en die twee dekken elkaar.`);
