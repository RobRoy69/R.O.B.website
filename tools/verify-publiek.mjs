// R.O.B. Concepting — poort op wat werkelijk gepubliceerd wordt.
//
// Vervangt verify-publish-tree.mjs. Dat toetste de PROJECTMAP tegen een met de hand
// onderhouden lijst van wat daar mocht staan. Twee bezwaren, beide gebleken:
//   · de lijst was een handmatige kopie van "wat hoort hier" — precies het anti-patroon
//     dat elders in dit project de drift veroorzaakt (stale index, stale sitemap,
//     gedupliceerde promptfoo-prompt);
//   · hij was opgebouwd uit de LOKALE map en brak de Netlify-build, omdat de
//     buildomgeving eigen mappen aanmaakt (.netlify, .cache). Twee deploys kwamen
//     daardoor niet door.
//
// Nu toetst deze poort de publieke map die build-publiek net heeft samengesteld. Hij
// controleert niet meer of iemand een lijst heeft bijgewerkt, maar of de werkelijkheid
// klopt: staat hier iets dat hier niet hoort, en staat alles hier dat er moet zijn.
//
// Sabotage-test: node tools/verify-publiek.mjs --saboteer
// Exit 0 = groen, exit 1 = rood.

import { readdirSync, existsSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const UIT  = path.join(ROOT, 'publiek');
const saboteer = process.argv.includes('--saboteer');

// Wat er onder GEEN VOORWAARDE in de publicatie mag staan.
const VERBODEN_EXT  = ['.sql', '.log', '.env', '.bak', '.tmp', '.pem', '.key', '.mjs', '.toml'];
const VERBODEN_NAAM = ['package.json', 'package-lock.json', 'promptfoo.config.yaml',
                       'promptfoo.readme.md', 'readme.md', 'netlify.toml',
                       'rob-canon-bundle.json'];

// Wat er WEL moet staan. Ontbreekt hier iets, dan is de publicatie stuk en mag hij niet
// live — beter een rode build dan een site zonder pagina's.
const MOET_BESTAAN = [
  'index.html',
  'robots.txt',
  'sitemap.xml',
  'vragen/index.html',
  'whitepapers/index.html',
  'whitepapers/de-mens-beslist.html',
  'whitepapers/de-klinkklare-onzin.html',
  'whitepapers/de-beste-keuze-is.html',
  'whitepapers/wie-heeft-de-sleutels.html',
];

// Interne projecties die juist NIET meer publiek mogen zijn. Dit was het lek.
const MAG_NIET_BESTAAN = [
  'whitepapers/_register.json',
  'whitepapers/_doors.json',
  'tools',
  'netlify',
];

const fouten = [];

if (!existsSync(UIT)) {
  console.error('POORT ROOD: publiek/ bestaat niet — draai eerst build-publiek. Fail closed.');
  process.exit(1);
}

// ── sabotage: leg een intern bestand in de publicatie ──
const saboteurPad = path.join(UIT, 'whitepapers', '_register.json');
if (saboteer) {
  writeFileSync(saboteurPad, '{"dit":"is interne registerkennis"}');
  console.log('SABOTAGE ACTIEF — _register.json in de publicatie gelegd. Verwacht: ROOD.\n');
}

try {
  // ── 1. loopt de hele publicatie langs op verboden inhoud ──
  let bestanden = 0;
  const loop = (dir, rel = '') => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { loop(path.join(dir, e.name), r); continue; }
      bestanden++;
      const naam = e.name.toLowerCase();
      const ext  = path.extname(naam);
      // path.extname('.env') geeft een lege string — daarom ook de naam zelf toetsen.
      if (VERBODEN_EXT.some(v => ext === v || naam === v || naam.startsWith(v + '.'))) {
        fouten.push(`verboden bestandstype in de publicatie: ${r}`);
      }
      if (VERBODEN_NAAM.includes(naam)) {
        fouten.push(`intern bestand in de publicatie: ${r}`);
      }
    }
  };
  loop(UIT);

  if (bestanden < 10) {
    console.error(`POORT ROOD: slechts ${bestanden} bestanden in de publicatie. Fail closed.`);
    if (saboteer && existsSync(saboteurPad)) unlinkSync(saboteurPad);
    process.exit(1);
  }

  // ── 2. moet bestaan ──
  for (const p of MOET_BESTAAN) {
    const vol = path.join(UIT, p);
    if (!existsSync(vol) || statSync(vol).size === 0) {
      fouten.push(`ontbreekt of is leeg in de publicatie: ${p}`);
    }
  }

  // ── 3. mag niet bestaan ──
  for (const p of MAG_NIET_BESTAAN) {
    if (existsSync(path.join(UIT, p))) {
      fouten.push(`hoort NIET publiek te zijn: ${p}`);
    }
  }
} catch (e) {
  console.error('POORT ROOD: publicatie kon niet gelezen worden —', e.message, '(fail closed)');
  if (saboteer && existsSync(saboteurPad)) unlinkSync(saboteurPad);
  process.exit(1);
}

if (saboteer && existsSync(saboteurPad)) unlinkSync(saboteurPad);

if (fouten.length) {
  console.error(`POORT ROOD — ${fouten.length} bevinding(en):`);
  for (const f of fouten) console.error('  · ' + f);
  process.exit(saboteer ? 0 : 1);   // bij sabotage IS rood het gewenste resultaat
}

if (saboteer) {
  console.error('SABOTAGE MISLUKT: de poort bleef groen terwijl hij rood had moeten worden.');
  process.exit(1);
}
console.log('publiek groen — alle verwachte pagina\'s aanwezig, geen interne bestanden, geen verboden types.');
