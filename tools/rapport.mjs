// R.O.B. Concepting — de stand van de site, structureel gemeten.
//
// AANLEIDING. Op 2026-07-27 en -28 gaf ik Rob vier keer een verkeerd getal, elke keer om
// dezelfde reden: ik telde met een tekstzoekopdracht in plaats van in de structuur.
//   · "ring" gevonden in het woord "bewering"
//   · "ervaring" aangezien voor de systeemterm ring
//   · de toegestane categorie-typering aangezien voor een lek
//   · "3 bronnen zonder link" terwijl het er 2 waren, omdat de telling ook op een CSS-regel sloeg
//
// De POORTEN toetsen inmiddels structureel. De RAPPORTAGE deed dat niet, en dat is net zo
// erg: een verkeerd getal in een gesprek is een bewering zonder grond, precies wat deze site
// bestrijdt. Dit bestand is de reparatie. Wie de stand wil weten, draait dit en leest af.
//
// Alles hier komt uit geparseerde structuur: JSON uit de projecties en het bewijsbestand,
// DOM-achtige telling op attributen in de HTML. Geen substring-zoekopdrachten op inhoud.
//
// Draai: npm run rapport

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const UIT  = path.join(ROOT, 'publiek');

const lees = (p) => readFileSync(p, 'utf-8');
const jsonOf = (p, val = null) => existsSync(p) ? JSON.parse(lees(p)) : val;
const rel = (p) => path.relative(UIT, p).split(path.sep).join('/');

if (!existsSync(UIT)) {
  console.error('rapport: publiek/ ontbreekt — draai eerst de bouwketen.');
  process.exit(1);
}

// ── pagina's ──
const paginas = [];
(function loop(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { loop(p); continue; }
    if (!e.name.endsWith('.html')) continue;
    const h = lees(p);

    // JSON-LD: parsen, niet zoeken. Een blok telt pas als het geldig is.
    const blokken = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    let geldig = 0, graaf = false;
    for (const b of blokken) {
      try { const o = JSON.parse(b[1]); geldig++; if (o['@graph']) graaf = true; } catch { /* ongeldig */ }
    }

    // Koppen als niveaureeks, zodat "slaat een niveau over" te berekenen is.
    const niveaus = [...h.matchAll(/<h([1-4])[\s>]/g)].map(m => Number(m[1]));
    let sprong = null;
    for (let i = 1; i < niveaus.length; i++) {
      if (niveaus[i] - niveaus[i - 1] > 1) { sprong = `h${niveaus[i - 1]}→h${niveaus[i]}`; break; }
    }

    // Bronvermeldingen: tellen op de KLASSE als attribuutwaarde, niet op de tekst. Dit was
    // de fout: 'v-bron-los' zat ook in de stijlregel bovenaan het bestand.
    const tel = (klasse) => (h.match(new RegExp(`class="${klasse}"`, 'g')) || []).length;

    paginas.push({
      url: '/' + rel(p).replace(/(^|\/)index\.html$/, '$1'),
      h1: niveaus.filter(n => n === 1).length,
      kopsprong: sprong,
      ld: `${geldig}/${blokken.length}`,
      ldOk: geldig === blokken.length && blokken.length > 0,
      graaf,
      bronLink: tel('v-bron') + tel('b-bron'),
      bronLos: tel('v-bron v-bron-los') + tel('b-bron b-bron-los'),
    });
  }
})(UIT);
paginas.sort((a, b) => a.url.localeCompare(b.url));

const bewijs = jsonOf(path.join(UIT, 'bewijs.json'));
const doors  = jsonOf(path.join(ROOT, 'whitepapers', '_doors.json'));
const proj   = jsonOf(path.join(ROOT, 'whitepapers', '_register.json'));
const ber    = jsonOf(path.join(ROOT, 'nieuws', '_berichten.json'), { berichten: [] });

const streep = '─'.repeat(74);
const ja = (b) => b ? '✓' : '✗';

console.log(`\n${streep}\nSTAND VAN DE SITE — structureel gemeten, ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n${streep}`);

console.log('\nPAGINA\'S');
console.log('  ' + 'url'.padEnd(36) + 'h1  JSON-LD  graaf  bronlink');
for (const p of paginas) {
  console.log('  ' + p.url.padEnd(36)
    + String(p.h1).padEnd(4)
    + p.ld.padEnd(9)
    + ja(p.graaf).padEnd(7)
    + (p.bronLink ? `${p.bronLink} link / ${p.bronLos} zonder` : '—')
    + (p.kopsprong ? `   LET OP: ${p.kopsprong}` : '')
    + (p.h1 !== 1 ? '   LET OP: niet één h1' : '')
    + (!p.ldOk ? '   LET OP: ongeldige JSON-LD' : ''));
}

if (bewijs) {
  const a = bewijs.aantallen;
  console.log('\nBEWIJS');
  console.log(`  ${a.beweringen} beweringen · ${a.met_bronlink} met bronlink · ${a.beweringen - a.met_bronlink} zonder`);
  console.log(`  precisie: ${a.dagprecies} dag · ${a.maandprecies} maand · ${a.jaarprecies} jaar`);

  // De stand per bewering. "Wacht" is hier geen bijvangst maar de nuttigste regel van het
  // hele rapport: dat zijn de beweringen die publiek staan zonder dat iemand ze bij de bron
  // heeft gecontroleerd. Ze bij naam noemen, want een aantal zonder namen doet niets.
  const st = (w) => bewijs.beweringen.filter(x => x.stand?.status === w);
  const grondslag = bewijs.beweringen.filter(x => !x.stand);
  console.log(`  stand: ${st('Klopt').length} klopt · ${st('Verloopt').length} verloopt · `
    + `${st('Wacht').length} wacht · ${grondslag.length} grondslag (geen houdbaarheid)`);
  for (const w of ['Verloopt', 'Wacht']) {
    if (st(w).length) {
      console.log(`  ${w.toLowerCase()}: ` + st(w).map(x => `${x.bron.naam || x.id}`).join(', '));
    }
  }
  const reg = bewijs.beweringen.filter(b => b.vastgesteld.soort !== 'brondatum').length;
  console.log(`  ${reg} bewering(en) op een registratiedatum in plaats van een brondatum`);
  const zonder = bewijs.beweringen.filter(b => !b.bron.url).map(b => b.bron.naam);
  if (zonder.length) console.log(`  zonder link: ${zonder.join(', ')}`);
  const meer = bewijs.beweringen.filter(b => b.gebruikt_in.length > 1).length;
  console.log(`  ${meer} bewering(en) gebruikt op meer dan één pagina`);
}

if (doors) {
  const pub = doors.doors.filter(d => d.publication_status === 'publishable');
  const wacht = doors.doors.length - pub.length;
  console.log('\nVRAGEN');
  console.log(`  ${pub.length} leverbaar${wacht ? ` · ${wacht} niet leverbaar` : ''}`);
  const zonderBewijs = pub.filter(d => !d.bewijs?.length);
  if (zonderBewijs.length) console.log(`  LET OP: ${zonderBewijs.length} vraag/vragen zonder onderbouwing`);
}

console.log('\nBERICHTEN');
console.log(`  ${ber.berichten.length} gepubliceerd`);
const zonderClaims = ber.berichten.filter(b => !(b.claim_refs || '').trim()).length;
if (zonderClaims) console.log(`  ${zonderClaims} zonder gebonden onderbouwing`);

if (proj) {
  console.log('\nREGISTER (projectie)');
  const c = proj.claims;
  const perSoort = c.reduce((a, x) => (a[x.dated_soort] = (a[x.dated_soort] || 0) + 1, a), {});
  console.log(`  ${c.length} leverbare beweringen · ${c.filter(x => x.bron_url).length} met bron-URL`);
  console.log(`  ${Object.entries(perSoort).map(([k, v]) => `${v} ${k}`).join(' · ')}`);
  console.log(`  gesynchroniseerd: ${proj.synced_at}`);
}

console.log(`\n${streep}`);
const problemen = paginas.filter(p => p.h1 !== 1 || p.kopsprong || !p.ldOk || !p.graaf).length;
console.log(problemen ? `  ${problemen} pagina('s) met een aandachtspunt — zie LET OP hierboven`
                      : '  Geen aandachtspunten. Elke pagina: één h1, geldige JSON-LD, entiteitsgraaf.');
console.log(`${streep}\n`);
