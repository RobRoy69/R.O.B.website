// R.O.B. Concepting — leidt de site-kennis van de chat-agent af uit de publicatie.
//
// AANLEIDING, gemeten op 2026-07-26. Gevraagd of er een vragenpagina op de site staat,
// antwoordde de live agent: "Nee, er staat geen FAQ-pagina op rob-concepting.com." Op dat
// moment stond /vragen/ een uur live. Hij stuurde bezoekers actief weg van een pagina die
// er wél was.
//
// De oorzaak was niet een verouderde cache maar een ONTWERP: de site-kennis van de agent
// stond met de hand geschreven in de canon-vault, en die vault wordt met de hand
// gegenereerd. De agent was dus precies accuraat tot de laatste keer dat iemand eraan
// dacht. Elk nieuw oppervlak opende een venster waarin hij met overtuiging ontkende dat
// het bestond. Whitepapers (een dag oud) kende hij, /vragen/ (een uur oud) niet.
//
// SCHEIDING VAN EIGENAARSCHAP. Vanaf nu twee soorten kennis, met verschillende herkomst:
//   · REDACTIONEEL — voice, propositie, aanbod, project. Met de hand geschreven in
//     rob-canon/, want dat is redactie. Blijft rob-canon-bundle.json.
//   · FEITELIJK — welke pagina's bestaan, welke vragen beantwoord zijn, waar dat op rust.
//     Afgeleid bij ELKE build uit de publicatie zelf. Dit bestand.
//
// Daarmee is een valse ontkenning structureel onmogelijk in plaats van tijdelijk
// gerepareerd: de agent weet dat /vragen/ bestaat omdat de build hem net heeft neergezet.
//
// Draai: node tools/build-site-kennis.mjs   (na build-publiek)

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { datumLabel } from './lib/datum.mjs';

const ROOT  = path.resolve(import.meta.dirname, '..');
const UIT   = path.join(ROOT, 'publiek');
const DOORS = path.join(ROOT, 'whitepapers', '_doors.json');
const OUT   = path.join(ROOT, 'netlify', 'functions', 'site-kennis.json');

if (!existsSync(UIT))   { console.error('build-site-kennis: publiek/ ontbreekt — draai eerst build-publiek.'); process.exit(1); }
if (!existsSync(DOORS)) { console.error('build-site-kennis: _doors.json ontbreekt — draai eerst build-doors.'); process.exit(1); }

// ── 1. welke pagina's staan er werkelijk in de publicatie ──
const paginas = [];
const loop = (dir, rel = '') => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { loop(path.join(dir, e.name), r); continue; }
    if (!e.name.endsWith('.html')) continue;
    const html = readFileSync(path.join(dir, e.name), 'utf-8');
    const titel = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const omschrijving = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    // index.html wordt op het web als map-URL geserveerd
    const url = '/' + r.replace(/(^|\/)index\.html$/, '$1');
    paginas.push({ url, titel: titel.trim(), omschrijving: omschrijving.trim() });
  }
};
loop(UIT);
paginas.sort((a, b) => a.url.localeCompare(b.url));

// ── 2. welke vragen zijn beantwoord, en waarop rusten ze ──
const doors = JSON.parse(readFileSync(DOORS, 'utf-8')).doors
  .filter(d => d.publication_status === 'publishable' && d.mode === 'public');

const vragen = doors.map(d => ({
  vraag: d.question,
  antwoord: d.antwoord,
  // Datums meegeven zodat de agent kan zeggen WANNEER iets is vastgesteld in plaats van
  // te moeten weigeren. Hij weigerde eerder een datum te noemen die op zijn eigen site stond.
  // Datum in MENSENTAAL, via dezelfde module als de pagina. Eerste versie gaf het rauwe
  // veld door en de agent antwoordde "2025-07-22" terwijl de site "22 juli 2025" toont.
  onderbouwing: d.bewijs.map(b => ({
    bewering: b.text,
    datum: datumLabel(b.dated, b.precisie, b.soort),
  })),
  uitgewerkt_in: (d.verder || []).map(([titel, pad]) => ({ titel, pad })),
}));

if (!paginas.length) { console.error('build-site-kennis: geen enkele pagina gevonden. Fail closed.'); process.exit(1); }
if (!vragen.length)  { console.error('build-site-kennis: geen enkele leverbare vraag gevonden. Fail closed.'); process.exit(1); }

writeFileSync(OUT, JSON.stringify({
  toelichting: 'AFGELEID bij elke build uit de publicatie. Niet met de hand bewerken — wijzigingen gaan verloren. Redactionele kennis staat in rob-canon-bundle.json.',
  gebouwd_op: new Date().toISOString(),
  paginas,
  vragen,
}, null, 2) + '\n');

console.log(`build-site-kennis: ${paginas.length} pagina's en ${vragen.length} beantwoorde vragen afgeleid naar netlify/functions/site-kennis.json`);
