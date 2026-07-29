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

// Alle URL's die de lezer ergens als bronlink kan volgen.
//
// NIET ALLEEN DE PAPERS. Eerste versie keek uitsluitend in de bronnensecties van de
// whitepapers, en verklaarde daarmee achttien bronnen achter /vragen/ onvindbaar terwijl ze
// daar bij elke bewering als link staan. De poort mat de vindplaats die ik toevallig had
// bedacht, niet de vindbaarheid die hij moest bewaken.
//
// Wél alleen BRONCONTEXT, op de klasse en niet op de tekst: een link in een lopende alinea
// is een verwijzing, geen bronverantwoording, en draagt de belofte niet.
const gelinkt = new Set();
const oogst = (html, patronen) => {
  for (const p of patronen) for (const m of html.matchAll(p)) gelinkt.add(m[1]);
};

for (const n of readdirSync(PAPERS).filter(x => x.endsWith('.html') && x !== 'index.html')) {
  const html = readFileSync(path.join(PAPERS, n), 'utf8');
  for (const sec of html.match(/<section class="bronnen">[\s\S]*?<\/section>/g) || []) {
    oogst(sec, [/href="(https?:\/\/[^"]+)"/g]);
  }
}

// /vragen/ en /nieuws/ tonen de bron bij elke bewering, met class v-bron respectievelijk
// b-bron. Die klasse is de bronmarkering; op de klasse toetsen en niet op de tekst is de les
// van de zes valse meldingen van deze week.
for (const p of [path.join(ROOT, 'vragen', 'index.html'),
                 ...(existsSync(path.join(ROOT, 'nieuws'))
                     ? readdirSync(path.join(ROOT, 'nieuws'), { withFileTypes: true })
                         .filter(e => e.isDirectory() && e.name !== 'concept')
                         .map(e => path.join(ROOT, 'nieuws', e.name, 'index.html'))
                     : []),
                 path.join(ROOT, 'nieuws', 'index.html')]) {
  if (!existsSync(p)) continue;
  oogst(readFileSync(p, 'utf8'), [
    /<a class="v-bron"[^>]*href="(https?:\/\/[^"]+)"/g,
    /<a class="b-bron"[^>]*href="(https?:\/\/[^"]+)"/g,
  ]);
}

if (saboteer) {
  const eerste = [...gelinkt][0];
  gelinkt.delete(eerste);
  console.log(`SABOTAGE ACTIEF — link ${eerste} weggedacht. Verwacht: ROOD.\n`);
}

const claims = JSON.parse(readFileSync(PROJ, 'utf8')).claims;

// WELKE BEWERINGEN STAAN ER DAADWERKELIJK OP EEN PAGINA?
//
// Van de 54 leverbare beweringen worden er 36 getoond; de rest staat goedgekeurd in het
// register zonder dat een pagina ze gebruikt. Dat onderscheid is wezenlijk voor deze poort:
// de belofte "je kunt dit navolgen" wordt gedaan aan een LEZER, en een bewering die nergens
// verschijnt heeft geen lezer. Haar op vindbaarheid afrekenen is een fout melden die niemand
// kan tegenkomen — en een poort die dat doet, leer je negeren.
//
// De eerste richting (link zonder controledatum) geldt wél voor alles: staat er een link,
// dan is er per definitie een pagina waar hij op staat.
const gerenderd = new Set();
const doorsPad = path.join(PAPERS, '_doors.json');
if (existsSync(doorsPad)) {
  for (const d of JSON.parse(readFileSync(doorsPad, 'utf8')).doors) {
    if (d.publication_status !== 'publishable') continue;
    for (const b of d.bewijs || []) gerenderd.add(b.ext_ref);
  }
}
const berPad = path.join(ROOT, 'nieuws', '_berichten.json');
if (existsSync(berPad)) {
  for (const b of JSON.parse(readFileSync(berPad, 'utf8')).berichten || []) {
    for (const r of (b.claim_refs || '').split(',').map(s => s.trim()).filter(Boolean)) gerenderd.add(r);
  }
}

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

// ── NATREKKEN VOOR GEBRUIK, NIET ERNA ──────────────────────────────────────────
//
// Deze poort komt uit de zitting van 2026-07-28. Vijf bronnen uit het werkblad zijn toen bij
// de uitgever nagetrokken, en dat leverde bij VIER van de vijf iets op dat al gepubliceerd
// stond:
//   · ISG stond gedateerd op 15 september; het rapport draagt alleen "September 2025".
//   · ISG's rangorde was afgekapt: inkoop staat zevende, niet vierde.
//   · Yelp zou "meer dan driekwart" bezoekers hebben verloren; zijn eigen jaarverslag zegt
//     2 tot 7 procent — een orde van grootte.
//   · Danfoss' "ruim veertig uur naar minuten" staat in geen enkele primaire bron.
//
// Vier fouten in vijf bronnen die al in een gepubliceerd paper stonden. Het werkblad stelde
// voor om elke claim VOOR gebruik na te trekken in plaats van erna; dat cijfer maakt er een
// regel van, en deze poort maakt de regel afdwingbaar.
//
// DE REGEL: staat een bewering op een pagina, dan moet iemand haar bij de bron hebben gezien.
// Geen controledatum en toch gepubliceerd is niet toegestaan — dan is de datum eronder een
// vorm zonder inhoud.
//
// Dit is strenger dan de statuslogica op /bewijs/, en dat is opzet. Daar mag "Wacht" bestaan
// voor beweringen die in het register wachten. Hier gaat het om wat de bezoeker te zien
// krijgt, en daar is Wacht geen toestand maar een verzuim.
// BOEKEN VALLEN HIERBUITEN, en dat is geen uitzondering maar de grens van wat deze poort kan
// weten. Eerste versie sloeg aan op Polanyi en Nonaka: die hebben geen URL, want het zijn
// boeken uit 1966 en 1995. "Bij de uitgever natrekken" bestaat daar niet — er is geen pagina
// om te openen. De toets geldt dus voor bronnen MET een vindplaats online; voor de andere is
// de eis een herleidbare naam, en die staat er.
//
// Geen achterdeur: een bron zonder URL levert op /vragen/ ook geen klikbare link op. Wie de
// URL weglaat om deze poort te ontwijken, kost zichzelf de link die de lezer zoekt.
const boeken = [];
for (const c of claims) {
  if (!gerenderd.has(c.ext_ref)) continue;
  if (c.nagetrokken_op) continue;
  if (!c.bron_url) { boeken.push(c.bron_naam || c.ext_ref); continue; }
  fouten.push(`${c.ext_ref} staat op een pagina maar is niet bij de bron nagetrokken `
    + `(${c.bron_naam}) — natrekken, of de bewering van de pagina halen`);
}

for (const [url, b] of perUrl) {
  const heeftLink = gelinkt.has(url);
  if (heeftLink && !b.nagetrokken) {
    fouten.push(`${b.naam}: staat als bronlink op een pagina, maar heeft geen controledatum `
      + `in het register — de pagina belooft meer dan het register waarmaakt (${b.refs.join(', ')})`);
  }
  // Alleen afrekenen op vindbaarheid wanneer de bewering ergens staat. Zie de toelichting
  // hierboven: een bewering zonder lezer doet geen belofte.
  if (!heeftLink && b.nagetrokken && b.refs.some(r => gerenderd.has(r))) {
    fouten.push(`${b.naam}: heeft een controledatum (${b.nagetrokken}) maar staat op geen enkele `
      + `pagina als bronlink — de lezer kan die controle nergens navolgen (${b.refs.join(', ')})`);
  }
}

if (fouten.length) {
  console.error(`POORT ROOD — ${fouten.length} bevinding(en) op de belofte "een link betekent nagetrokken":`);
  for (const f of fouten) console.error('  · ' + f);
  process.exit(1);
}

const metDatum = [...perUrl.values()].filter(b => b.nagetrokken).length;
const ongebruikt = [...perUrl.values()].filter(b => b.nagetrokken && !b.refs.some(r => gerenderd.has(r))).length;
console.log(`nagetrokken groen — ${gelinkt.size} bronlinks op de gepubliceerde pagina's, `
  + `${metDatum} bronnen met een controledatum, en die twee dekken elkaar.`);
console.log(`  ${gerenderd.size} beweringen staan op een pagina, alle met een vindplaats online `
  + `bij de bron nagetrokken.`);
// Geen stille versmalling: wie buiten de toets viel, staat er bij naam bij.
if (boeken.length) {
  console.log(`  (buiten deze toets, want geen vindplaats online: ${boeken.join(', ')} — `
    + `boeken, herleidbaar op naam.)`);
}
// Geen stille versmalling: wat buiten de toets viel, staat er expliciet bij.
if (ongebruikt) {
  console.log(`  (${ongebruikt} nagetrokken bron(nen) buiten beschouwing gelaten: hun beweringen `
    + `staan nog op geen enkele pagina.)`);
}
