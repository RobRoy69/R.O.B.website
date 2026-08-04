// R.O.B. Concepting — leidt de testprompt af uit de échte systeemprompt.
//
// AANLEIDING. promptfoo.config.yaml droeg een met de hand overgetypte kopie van de
// systeemprompt: 15 regels tegen de 45 die live stonden, zonder het HARD KADER en zonder
// canon-context. De tests draaiden dus tegen een prompt die niet bestond. Gevolg: de
// zwaarste grendel van de site — project-vertrouwelijkheid over B.R.A.I.N., SBH, EssElOS,
// Merk Frank, 20voor12, Huk & Nuk, Aandehand en de Werkbank — werd door geen enkele toets
// geraakt. De config zei het zelf: "kopieer hier de actuele versie bij iteratie".
//
// Nu afgeleid. Overtypen kan niet meer, en verify-promptfoo.mjs maakt de build rood als
// iemand het toch probeert.
//
// Draai: node tools/build-promptfoo-prompt.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROB_SYSTEM } from '../netlify/functions/lib/systeemprompt.js';
import { buildCanonContext } from '../netlify/functions/lib/canon-context.js';

const ROOT   = path.resolve(import.meta.dirname, '..');
const BUNDLE = path.join(ROOT, 'netlify', 'functions', 'rob-canon-bundle.json');
const OUTDIR = path.join(ROOT, 'tools', 'generated');
const OUT    = path.join(OUTDIR, 'systeemprompt.txt');

// De canon-context meenemen zoals chat.js hem samenstelt. Zonder dat toetst promptfoo een
// agent die niets weet, terwijl juist de canon-kennis het lek-risico draagt: de agent WEET
// van SBH en 20voor12 en moet er toch over zwijgen. Een test zonder die kennis kan
// vertrouwelijkheid niet meten — hij zou slagen omdat er niets te lekken viel.
// Sinds 2026-08-04 via lib/canon-context.js, dezelfde functie die chat.js gebruikt. Daarvóór
// stond de sectielijst hier los overgetypt, en liep hij bij de eerste wijziging aan chat.js
// meteen uit de pas: 37.570 tekens canon in de test tegen 61.500 live. Dezelfde fout als de
// overgetypte prompt in de kop hierboven, één laag dieper.
let canon = '';
if (existsSync(BUNDLE)) {
  canon = buildCanonContext(JSON.parse(readFileSync(BUNDLE, 'utf-8')));
} else {
  console.error('build-promptfoo-prompt: rob-canon-bundle.json ontbreekt — de vertrouwelijkheidstests worden dan betekenisloos.');
  process.exit(1);
}

mkdirSync(OUTDIR, { recursive: true });
writeFileSync(OUT, ROB_SYSTEM + canon);

console.log(`build-promptfoo-prompt: ${(ROB_SYSTEM + canon).length} tekens naar tools/generated/systeemprompt.txt (prompt ${ROB_SYSTEM.length} + canon ${canon.length})`);
