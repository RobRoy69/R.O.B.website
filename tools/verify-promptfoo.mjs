// R.O.B. Concepting — poort op de testopstelling van de agent.
//
// WAAROM DIT EEN APARTE POORT IS, EN promptfoo ZELF NIET IN DE BUILD DRAAIT.
// Ik stelde eerder voor promptfoo in de buildketen te zetten. Dat was verkeerd, en dit is
// de correctie: promptfoo doet echte modelaanroepen, en modeluitvoer varieert. Een
// stijlregel als "max 3 zinnen" of "begint met een spiegel-opener" is niet deterministisch.
// Zo'n toets in de deploy-keten levert rode builds op die niets met de wijziging te maken
// hebben — en een poort die af en toe onterecht rood wordt, leer je wegklikken. Dan is hij
// erger dan geen poort. Het kost bovendien modelaanroepen bij elke deploy.
//
// Deze poort toetst daarom alleen wat DETERMINISTISCH is: dat de testopstelling tegen de
// echte prompt draait. Of het GEDRAG klopt, meet promptfoo — bewust apart, met de hand of
// op een schema (npm run test:agent).
//
// Sabotage-test: node tools/verify-promptfoo.mjs --saboteer
// Exit 0 = groen, exit 1 = rood.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROB_SYSTEM } from '../netlify/functions/lib/systeemprompt.js';

const ROOT   = path.resolve(import.meta.dirname, '..');
const CONFIG = path.join(ROOT, 'promptfoo.config.yaml');
const PROMPT = path.join(ROOT, 'tools', 'generated', 'systeemprompt.txt');
const saboteer = process.argv.includes('--saboteer');

const fouten = [];

// De grendels die in de live prompt MOETEN staan. Verdwijnt er een, dan is de belofte aan
// bezoekers stilzwijgend versoepeld — precies het soort wijziging dat niemand opmerkt.
const GRENDELS = [
  'HARD KADER',
  'B.R.A.I.N.', 'SBH', 'EssElOS', 'Merk Frank', '20voor12', 'Huk & Nuk', 'Aandehand',
  'R.O.B. Werkbank',
  'Chat-sessies zijn vertrouwelijk',
  'Geen bullet points',
];

// De onderwerpen die in de vertrouwelijkheidstests bevraagd MOETEN worden. Zonder deze
// eis kan iemand de tests uitkleden zonder dat het opvalt.
const VEREISTE_TESTS = ['SBH', '20voor12', 'B.R.A.I.N.'];

// De sabotage overschrijft de testprompt, dus die moet ONVOORWAARDELIJK terug — ook als de
// poort er tussenin uitklapt. Eerste versie liet de huls staan: een test die het systeem
// kapot achterlaat is zelf een storing.
let origineel = null;
const herstelPrompt = () => {
  if (origineel !== null) { writeFileSync(PROMPT, origineel); origineel = null; }
};
if (saboteer) {
  origineel = existsSync(PROMPT) ? readFileSync(PROMPT, 'utf-8') : '';
  process.on('exit', herstelPrompt);
  writeFileSync(PROMPT, 'Je bent een chatbot. Wees behulpzaam.');
  console.log('SABOTAGE ACTIEF — testprompt vervangen door een lege huls. Verwacht: ROOD.\n');
}

try {
  if (!existsSync(CONFIG)) { console.error('POORT ROOD: promptfoo.config.yaml ontbreekt.'); process.exit(1); }
  if (!existsSync(PROMPT)) { console.error('POORT ROOD: tools/generated/systeemprompt.txt ontbreekt — draai build-promptfoo-prompt.'); process.exit(1); }

  const config = readFileSync(CONFIG, 'utf-8');
  const prompt = readFileSync(PROMPT, 'utf-8');

  // 1. De config mag de prompt NIET zelf dragen. Dit was de kern van het probleem.
  if (/^\s+system:\s*\|/m.test(config)) {
    fouten.push('promptfoo.config.yaml draagt een INLINE systeemprompt — dat is de hand-onderhouden kopie die uit de pas liep. Verwijs naar file://tools/generated/systeemprompt.txt.');
  }
  if (!config.includes('tools/generated/systeemprompt.txt')) {
    fouten.push('promptfoo.config.yaml verwijst niet naar de afgeleide prompt.');
  }

  // 2. De afgeleide prompt moet de echte zijn.
  if (!prompt.startsWith(ROB_SYSTEM)) {
    fouten.push('de afgeleide testprompt begint niet met de live ROB_SYSTEM — hij is verouderd of met de hand bewerkt.');
  }

  // 3. Elke grendel moet in de live prompt staan.
  for (const g of GRENDELS) {
    if (!ROB_SYSTEM.includes(g)) fouten.push(`grendel weg uit de systeemprompt: "${g}"`);
  }

  // 4. De vertrouwelijkheidstests moeten bestaan en de merken bevragen.
  if (!/vertrouwelijkheid|HARD KADER/i.test(config)) {
    fouten.push('promptfoo.config.yaml heeft geen enkele test op project-vertrouwelijkheid.');
  }
  for (const t of VEREISTE_TESTS) {
    if (!config.includes(t)) fouten.push(`geen test die naar ${t} vraagt — de zwaarste grendel blijft daar ongetoetst.`);
  }
} catch (e) {
  console.error('POORT ROOD: kon niet lezen —', e.message, '(fail closed)');
  process.exit(1);
}



if (fouten.length) {
  console.error(`POORT ROOD — ${fouten.length} bevinding(en):`);
  for (const f of fouten) console.error('  · ' + f);
  process.exit(saboteer ? 0 : 1);
}

if (saboteer) {
  console.error('SABOTAGE MISLUKT: de poort bleef groen terwijl hij rood had moeten worden.');
  process.exit(1);
}
console.log('promptfoo groen — tests draaien tegen de echte prompt, alle grendels aanwezig, vertrouwelijkheid wordt bevraagd.');
