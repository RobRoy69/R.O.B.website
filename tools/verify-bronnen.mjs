// R.O.B. Concepting — publicatiepoort voor de whitepaper-bronnen.
//
// Agora-canon: "een poort zonder sabotage-test bestaat niet". Deze poort kan rood
// worden en dat is aantoonbaar — draai `node tools/verify-bronnen.mjs --saboteer`.
//
// Wat de poort toetst:
//   1. De projectie bestaat en is niet leeg.
//   2. Elke geprojecteerde claim draagt een datum (gedateerd bewijs is de belofte).
//   3. Elke claim die een pagina via {{claim:wp:NNN}} inzet, is ook leverbaar.
//      Een pagina mag nooit een claim tonen die het register niet vrijgeeft.
//   4. De projectie is niet ouder dan MAX_LEEFTIJD_DAGEN.
//
// Exit 0 = groen, exit 1 = rood (Netlify stopt de deploy).

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROJ = path.join(ROOT, 'whitepapers', '_register.json');
const MAX_LEEFTIJD_DAGEN = 90;
const saboteer = process.argv.includes('--saboteer');

const fouten = [];
const meld = (m) => fouten.push(m);

// ── 1. projectie aanwezig ──
if (!existsSync(PROJ)) {
  console.error('POORT ROOD: whitepapers/_register.json ontbreekt. Draai eerst sync-register.');
  process.exit(1);
}
let proj;
try {
  proj = JSON.parse(readFileSync(PROJ, 'utf8'));
} catch (e) {
  console.error('POORT ROOD: projectie is geen geldige JSON —', e.message);
  process.exit(1);
}

let claims = Array.isArray(proj.claims) ? proj.claims : [];
if (saboteer) {
  // Sabotage: haal één claim weg en ontdateer een andere. De poort MOET rood worden.
  claims = claims.slice(1).map((c, i) => (i === 0 ? { ...c, dated: null } : c));
  console.log('SABOTAGE ACTIEF — één claim verwijderd, één ontdateerd. Verwacht: ROOD.\n');
}

if (!claims.length) meld('projectie bevat geen claims');

// ── 2. elke claim gedateerd ──
for (const c of claims) {
  if (!c.dated) meld(`claim zonder datum: ${c.ext_ref} ("gedateerd bewijs" is de belofte)`);
}

// ── 3. elke ingezette claim is leverbaar ──
const leverbaar = new Set(claims.map(c => c.ext_ref));
const dir = path.join(ROOT, 'whitepapers');
for (const f of readdirSync(dir).filter(f => f.endsWith('.html'))) {
  const html = readFileSync(path.join(dir, f), 'utf8');
  for (const m of html.matchAll(/\{\{(claim:wp:[0-9]+)\}\}/g)) {
    if (!leverbaar.has(m[1])) {
      meld(`${f} zet ${m[1]} in, maar die is niet leverbaar (approved + ring open/showcase?)`);
    }
  }
}

// ── 4. projectie niet verouderd ──
if (proj.synced_at) {
  const dagen = (Date.now() - Date.parse(proj.synced_at)) / 86_400_000;
  if (dagen > MAX_LEEFTIJD_DAGEN) {
    meld(`projectie is ${Math.round(dagen)} dagen oud (max ${MAX_LEEFTIJD_DAGEN}) — draai sync-register`);
  }
}

// ── uitkomst ──
if (fouten.length) {
  console.error('POORT ROOD — ' + fouten.length + ' bevinding(en):');
  for (const f of fouten) console.error('  · ' + f);
  process.exit(saboteer ? 0 : 1);   // bij sabotage is rood het gewenste resultaat
}

if (saboteer) {
  console.error('SABOTAGE MISLUKT: de poort bleef groen terwijl hij rood had moeten worden.');
  process.exit(1);
}
console.log(`poort groen — ${claims.length} claims leverbaar en gedateerd; projectie van ${proj.synced_at}`);
