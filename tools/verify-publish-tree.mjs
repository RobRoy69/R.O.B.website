// R.O.B. Concepting — poort op de publish-tree.
//
// Aanleiding: met publish="." wordt ALLES in deze map publiek geserveerd. Op
// 2026-07-25 belandden twee tijdelijke werkbestanden (api.json, site.json) in de
// root en stonden ze live. Geen poort ving dat; dit is die poort.
//
// Ontwerp: ALLOWLIST, niet blocklist. Een blocklist mist wat je niet voorzag; een
// allowlist dwingt een bewust besluit af bij elk nieuw bestand in de root.
//
// FAIL CLOSED (les 2026-07-18): kan de inventaris niet gelezen worden, of is hij
// leeg, dan stopt de poort — nooit "niets gevonden, dus goed".
//
// Sabotage-test: node tools/verify-publish-tree.mjs --saboteer
// Exit 0 = groen, exit 1 = rood.

import { readdirSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const saboteer = process.argv.includes('--saboteer');

// Wat in de root mag staan. Nieuw bestand? Dan hier bewust bijzetten.
const ROOT_TOEGESTAAN = new Set([
  'index.html', 'robots.txt', 'sitemap.xml', 'README.md',
  'og-image.png', 'og-image.svg',
  'netlify.toml', 'package.json', 'package-lock.json',
  'promptfoo.config.yaml', 'promptfoo.README.md',
  'media', 'netlify', 'tools', 'werk', 'whitepapers',
  '.gitignore', '.git', 'node_modules'
]);

// Extensies die nergens in de publish-tree horen, hoe diep ook.
const VERBODEN_EXT = ['.sql', '.log', '.env', '.bak', '.tmp', '.pem', '.key'];
const NEGEER_DIR   = new Set(['.git', 'node_modules']);

const fouten = [];

// ── sabotage: leg een bestand neer dat er niet hoort ──
const saboteurPad = path.join(ROOT, 'zzz-sabotage.json');
if (saboteer) {
  writeFileSync(saboteurPad, '{"dit":"hoort hier niet"}');
  console.log('SABOTAGE ACTIEF — zzz-sabotage.json in de root gelegd. Verwacht: ROOD.\n');
}

try {
  // ── 1. root-inventaris tegen de allowlist ──
  const inhoud = readdirSync(ROOT);
  if (!inhoud.length) {
    console.error('POORT ROOD: root-inventaris is leeg — dat kan niet kloppen. Fail closed.');
    process.exit(1);
  }
  for (const naam of inhoud) {
    if (!ROOT_TOEGESTAAN.has(naam)) {
      fouten.push(`onbekend in de root: ${naam} — zet hem bewust in ROOT_TOEGESTAAN of haal hem weg`);
    }
  }

  // ── 2. verboden extensies in de hele tree ──
  const loop = (dir, rel = '') => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (NEGEER_DIR.has(e.name)) continue;
      const p = path.join(dir, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { loop(p, r); continue; }
      const ext = path.extname(e.name).toLowerCase();
      if (VERBODEN_EXT.includes(ext)) {
        fouten.push(`verboden bestandstype in de publish-tree: ${r} (${ext})`);
      }
    }
  };
  loop(ROOT);
} catch (e) {
  console.error('POORT ROOD: inventaris kon niet gelezen worden —', e.message, '(fail closed)');
  if (saboteer && existsSync(saboteurPad)) unlinkSync(saboteurPad);
  process.exit(1);
}

if (saboteer && existsSync(saboteurPad)) unlinkSync(saboteurPad);

// ── uitkomst ──
if (fouten.length) {
  console.error(`POORT ROOD — ${fouten.length} bevinding(en):`);
  for (const f of fouten) console.error('  · ' + f);
  process.exit(saboteer ? 0 : 1);   // bij sabotage IS rood het gewenste resultaat
}

if (saboteer) {
  console.error('SABOTAGE MISLUKT: de poort bleef groen terwijl hij rood had moeten worden.');
  process.exit(1);
}
console.log('publish-tree groen — root schoon, geen verboden bestandstypen.');
