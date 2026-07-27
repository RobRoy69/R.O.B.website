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

const ROOT   = path.resolve(import.meta.dirname, '..');
const BUNDLE = path.join(ROOT, 'netlify', 'functions', 'rob-canon-bundle.json');
const OUTDIR = path.join(ROOT, 'tools', 'generated');
const OUT    = path.join(OUTDIR, 'systeemprompt.txt');

// De canon-context meenemen zoals chat.js hem samenstelt. Zonder dat toetst promptfoo een
// agent die niets weet, terwijl juist de canon-kennis het lek-risico draagt: de agent WEET
// van SBH en 20voor12 en moet er toch over zwijgen. Een test zonder die kennis kan
// vertrouwelijkheid niet meten — hij zou slagen omdat er niets te lekken viel.
let canon = '';
if (existsSync(BUNDLE)) {
  const b = JSON.parse(readFileSync(BUNDLE, 'utf-8'));
  const blocks = ['propositie', 'aanbod', 'project']
    .map(t => (b.notes_by_type[t] || []).map(n => `## ${n.title}\n${n.content}`).join('\n\n'))
    .filter(Boolean).join('\n\n---\n\n');
  if (blocks) canon = `\n\n---\n\nCANON-CONTEXT (R.O.B. Concepting canon — kennis raadplegen, niet letterlijk inkopiëren):\n\n${blocks}`;
  if (b.critical_facts) canon = `\n\n---\n\nHARDE FEITEN (gaan vóór op alles hieronder; bij twijfel volg deze):\n\n${b.critical_facts}${canon}`;
} else {
  console.error('build-promptfoo-prompt: rob-canon-bundle.json ontbreekt — de vertrouwelijkheidstests worden dan betekenisloos.');
  process.exit(1);
}

mkdirSync(OUTDIR, { recursive: true });
writeFileSync(OUT, ROB_SYSTEM + canon);

console.log(`build-promptfoo-prompt: ${(ROB_SYSTEM + canon).length} tekens naar tools/generated/systeemprompt.txt (prompt ${ROB_SYSTEM.length} + canon ${canon.length})`);
