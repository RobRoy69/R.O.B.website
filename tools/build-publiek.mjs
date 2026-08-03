// R.O.B. Concepting — stelt de publieke map samen.
//
// AANLEIDING. De site stond op publish = "." — alles in deze map werd publiek
// geserveerd. Dat was de wortel van drie dingen tegelijk:
//   · api.json en site.json stonden op 2026-07-25 live (tijdelijke werkbestanden);
//   · whitepapers/_register.json en _doors.json waren opvraagbaar, inclusief interne
//     velden (ext_ref, ringstatus, wachtend_op_reviewpoort);
//   · de canon-vault kon niet in de repo, want dan stond de interne kennis online.
//
// HET VERSCHIL MET DE VORIGE POORT. verify-publish-tree hield een lijst bij van wat NIET
// publiek mocht zijn — een met de hand onderhouden kopie van "wat hoort hier". Vergat je
// daar iets, dan lekte het STIL. Deze bouwstap draait het om: hier staat wat WEL publiek
// is, en alles daarbuiten komt er simpelweg niet in.
//
// Dat is de goede kant van fail-closed. Vergeet ik hier een pagina, dan is die pagina weg
// — zichtbaar, meteen, en te repareren. Vergat ik daar een bestand, dan stond het online
// zonder dat iemand het zag. Een fout die je ziet is oneindig veel beter dan een fout die
// je niet ziet.
//
// Draai: node tools/build-publiek.mjs   (na de generatoren, voor verify-publiek)

import { readdirSync, statSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const UIT  = path.join(ROOT, 'publiek');

// Wat publiek is. Elk item is een bewust besluit.
//   bestand  — één bestand, moet bestaan (anders rood)
//   map      — hele map, met optionele filter op bestandsnaam
const PUBLIEK = [
  { soort: 'bestand', pad: 'index.html' },
  { soort: 'bestand', pad: 'robots.txt' },
  { soort: 'bestand', pad: 'favicon.svg' },
  // sitemap.xml staat hier BEWUST NIET: build-sitemap.mjs schrijft hem rechtstreeks in de
  // publicatie, afgeleid uit wat er werkelijk staat. Tot 2026-07-28 lag er ook een
  // handgeschreven exemplaar in de repo dat hier werd gekopieerd en daarna weer overschreven
  // — onzichtbaar dood gewicht dat als bron las. Weg.
  { soort: 'bestand', pad: 'og-image.png' },
  { soort: 'bestand', pad: 'og-image.svg' },

  { soort: 'map', pad: 'media' },
  { soort: 'map', pad: 'werk' },
  { soort: 'map', pad: 'vragen' },
  { soort: 'map', pad: 'kennisgezagsscan' },
  { soort: 'map', pad: 'kennisproef' },

  // Verborgen, noindex demonstratieroute. De map bevat uitsluitend de openbare fictieve
  // fixture en clientcode; geen productie-intakes of private 20voor12-canon.
  { soort: 'map', pad: 'ervaring' },

  // Het beheerscherm. Publiek bereikbaar maar niet indexeerbaar: al het gezag zit in de
  // functie erachter, niet in deze pagina. Zonder sessie toont hij een wachtwoordveld en
  // verder niets — er staat geen sleutel en geen registerinhoud in.
  { soort: 'map', pad: 'beheer' },

  // whitepapers: de pagina's en de PDF's wél, de registerprojecties NIET.
  // _register.json en _doors.json zijn build-INPUT. Ze bevatten ext_ref, ringstatus en
  // wachtend_op_reviewpoort — interne registerkennis, geen uitgifte. Een bewust,
  // schoongemaakt bewijsbestand komt er later naast; dat is iets anders dan dit lek.
  { soort: 'map', pad: 'whitepapers', filter: (naam) => !naam.startsWith('_') },

  // nieuws: de pagina's en de feed wél; de projectie (_berichten.json) en de
  // conceptbestanden NIET. Een concept is werk in bewerking en hoort niet op het web.
  { soort: 'map', pad: 'nieuws', filter: (naam) => !naam.startsWith('_') && naam !== 'concept' },
];

// Wat er NOOIT in mag, ook niet als het per ongeluk in een meegekopieerde map zit.
// Tweede net onder het eerste: de inclusielijst is de bescherming, dit vangt een fout
// binnen een map die als geheel wél publiek is.
const NOOIT = ['.env', '.sql', '.log', '.bak', '.tmp', '.pem', '.key'];

const fouten = [];
let bestanden = 0;
let bytes = 0;

const verboden = (naam) => {
  const n = naam.toLowerCase();
  const ext = path.extname(n);
  // path.extname('.env') geeft een lege string — daarom ook op de naam zelf toetsen.
  return NOOIT.find(v => ext === v || n === v || n.startsWith(v + '.'));
};

const kopieer = (van, naar, filter) => {
  // De DOELMAP zelf aanmaken, niet zijn ouder. Eerste versie deed dirname(naar) en
  // maakte dus publiek/ in plaats van publiek/media/ — waarna copyFileSync ENOENT gaf op
  // de bestemming. Ik las die ENOENT eerst als een OneDrive-cloudbestand aan de bronkant;
  // dat was fout, en het tegenbewijs stond er al (cp kon het bestand gewoon lezen).
  mkdirSync(naar, { recursive: true });
  for (const e of readdirSync(van, { withFileTypes: true })) {
    if (filter && !filter(e.name)) continue;
    const bron = path.join(van, e.name);
    const doel = path.join(naar, e.name);
    if (e.isDirectory()) { mkdirSync(doel, { recursive: true }); kopieer(bron, doel, filter); continue; }
    const raak = verboden(e.name);
    if (raak) { fouten.push(`verboden bestandstype zou publiek worden: ${e.name} (${raak})`); continue; }
    copyFileSync(bron, doel);
    bestanden++;
    bytes += statSync(bron).size;
  }
};

// ── schoon beginnen: nooit een oude publicatie laten staan ──
if (existsSync(UIT)) rmSync(UIT, { recursive: true, force: true });
mkdirSync(UIT, { recursive: true });

for (const item of PUBLIEK) {
  const bron = path.join(ROOT, item.pad);
  if (!existsSync(bron)) {
    fouten.push(`ontbreekt: ${item.pad} — staat op de publieke lijst maar bestaat niet`);
    continue;
  }
  if (item.soort === 'bestand') {
    const raak = verboden(path.basename(item.pad));
    if (raak) { fouten.push(`verboden bestandstype op de publieke lijst: ${item.pad}`); continue; }
    copyFileSync(bron, path.join(UIT, item.pad));
    bestanden++;
    bytes += statSync(bron).size;
  } else {
    kopieer(bron, path.join(UIT, item.pad), item.filter);
  }
}

if (fouten.length) {
  console.error(`build-publiek: ROOD — ${fouten.length} bevinding(en):`);
  for (const f of fouten) console.error('  · ' + f);
  process.exit(1);
}

// Fail closed: een lege of absurd kleine publicatie is geen publicatie.
if (bestanden < 10) {
  console.error(`build-publiek: ROOD — slechts ${bestanden} bestanden samengesteld. Dat kan niet kloppen.`);
  process.exit(1);
}

console.log(`build-publiek: ${bestanden} bestanden (${(bytes / 1048576).toFixed(1)} MB) samengesteld in publiek/`);
