// R.O.B. Concepting — poort: de agent moet zijn eigen site kennen.
//
// AANLEIDING. Op 2026-07-26 ontkende de live agent dat /vragen/ bestond, één uur na
// livegang: "Nee, er staat geen FAQ-pagina op rob-concepting.com." Geen enkele poort ving
// dat, want geen enkele poort keek naar de agent. De site-poorten toetsten alleen de
// statische pagina's.
//
// Deze poort sluit dat gat: elke pagina die de build publiceert MOET in de kennis van de
// agent voorkomen. Publiceer je iets nieuws zonder dat de agent het weet, dan gaat de build
// rood — in plaats van dat een bezoeker het ontdekt.
//
// Sabotage-test: node tools/verify-agent-kennis.mjs --saboteer
// Exit 0 = groen, exit 1 = rood.

import { readFileSync, readdirSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const ROOT    = path.resolve(import.meta.dirname, '..');
const UIT     = path.join(ROOT, 'publiek');
const KENNIS  = path.join(ROOT, 'netlify', 'functions', 'site-kennis.json');
const saboteer = process.argv.includes('--saboteer');

const fouten = [];

if (!existsSync(KENNIS)) {
  console.error('POORT ROOD: site-kennis.json ontbreekt — draai build-site-kennis. Fail closed.');
  process.exit(1);
}
if (!existsSync(UIT)) {
  console.error('POORT ROOD: publiek/ ontbreekt — draai build-publiek. Fail closed.');
  process.exit(1);
}

// ── sabotage: publiceer een pagina die de agent niet kent ──
const saboteurPad = path.join(UIT, 'geheime-pagina.html');
if (saboteer) {
  writeFileSync(saboteurPad, '<html><head><title>Pagina die de agent niet kent</title></head><body>x</body></html>');
  console.log('SABOTAGE ACTIEF — pagina gepubliceerd die niet in de agent-kennis staat. Verwacht: ROOD.\n');
}

try {
  const kennis = JSON.parse(readFileSync(KENNIS, 'utf-8'));
  const bekend = new Set((kennis.paginas || []).map(p => p.url));

  // Alle werkelijk gepubliceerde HTML-pagina's ophalen.
  const gepubliceerd = [];
  const loop = (dir, rel = '') => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { loop(path.join(dir, e.name), r); continue; }
      if (!e.name.endsWith('.html')) continue;
      const raw = '/' + r.replace(/(^|\/)index\.html$/, '$1');
      gepubliceerd.push(raw.startsWith('/whitepapers/') ? raw.replace(/\.html$/, '') : raw);
    }
  };
  loop(UIT);

  if (!gepubliceerd.length) {
    console.error('POORT ROOD: geen enkele gepubliceerde pagina gevonden. Fail closed.');
    if (saboteer && existsSync(saboteurPad)) unlinkSync(saboteurPad);
    process.exit(1);
  }

  // 1. Kent de agent elke gepubliceerde pagina?
  for (const url of gepubliceerd) {
    if (!bekend.has(url)) {
      fouten.push(`de agent kent /${url.replace(/^\//, '')} niet — gepubliceerd maar niet in site-kennis.json`);
    }
  }

  // 2. Andersom: kent de agent pagina's die niet meer bestaan? Dan verwijst hij bezoekers
  //    naar een 404, wat net zo schadelijk is als ontkennen dat iets bestaat.
  const echt = new Set(gepubliceerd);
  for (const url of bekend) {
    if (!echt.has(url)) {
      fouten.push(`de agent kent ${url} maar die pagina wordt niet gepubliceerd — hij zou naar een 404 verwijzen`);
    }
  }

  // 3. De kennis moet vers zijn: gegenereerd in deze build, niet meegecommit van gisteren.
  const leeftijdMin = (Date.now() - new Date(kennis.gebouwd_op).getTime()) / 60000;
  if (!(leeftijdMin < 60)) {
    fouten.push(`site-kennis.json is ${Math.round(leeftijdMin)} minuten oud — niet in deze build gegenereerd`);
  }
} catch (e) {
  console.error('POORT ROOD: kennis kon niet gelezen worden —', e.message, '(fail closed)');
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
console.log('agent-kennis groen — de agent kent elke gepubliceerde pagina, en geen enkele die niet bestaat.');
