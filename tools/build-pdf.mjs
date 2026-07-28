// R.O.B. Concepting — de whitepaper-PDF's, geprint uit de pagina zelf.
//
// AANLEIDING, 2026-07-28. De vier PDF's waren met de hand uit de browser geprint en stonden
// daarmee buiten elke poort. Ze liepen zeven tot negen commits achter. Het ergste geval: de
// PDF van paper 01 dateert van 24 juli, de vijf feitcorrecties gingen op 25 juli de HTML in.
// Wie die PDF aanvroeg, kreeg de gecorrigeerde fouten alsnog toegestuurd — op een site die om
// natrekbaarheid draait, en zonder dat iets het opmerkte.
//
// Dit script doet wat er met de hand gebeurde: het print de gepubliceerde pagina met Chrome.
// Zelfde bron, zelfde opmaak, nu herhaalbaar.
//
// WAAROM NIET IN DE NETLIFY-BUILD. Daar staat geen Chrome. Dit is dus een lokale stap
// (npm run pdf) en geen bouwstap — en juist daarom meldt npm run rapport het wanneer een
// paper nieuwer is dan zijn PDF. Een handmatige stap zonder meting vergeet je precies één
// keer te vaak.
//
// WAAROM UIT publiek/ EN NIET VAN DE LIVE SITE. De PDF hoort te tonen wat er straks staat,
// niet wat er nu staat. Anders print je de vorige deploy.
//
// Draai: npm run pdf     (na build-publiek)

import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(import.meta.dirname, '..');
const UIT  = path.join(ROOT, 'publiek');
const DOEL = path.join(ROOT, 'whitepapers', 'bestand');

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(p => existsSync(p));

if (!CHROME) { console.error('build-pdf: geen Chrome of Edge gevonden.'); process.exit(1); }
if (!existsSync(UIT)) { console.error('build-pdf: publiek/ ontbreekt — draai eerst build-publiek.'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const vol = path.join(UIT, p);
  if (!vol.startsWith(UIT) || !existsSync(vol) || statSync(vol).isDirectory()) {
    res.writeHead(404); res.end('niet gevonden'); return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(vol)] || 'application/octet-stream' });
  res.end(readFileSync(vol));
});

const draai = (cmd, args, ms) => new Promise((klaar) => {
  const kind = spawn(cmd, args, { stdio: 'ignore' });
  const klok = setTimeout(() => { kind.kill('SIGKILL'); klaar({ ok: false, fout: 'tijd op' }); }, ms);
  kind.on('error', (e) => { clearTimeout(klok); klaar({ ok: false, fout: e.message }); });
  kind.on('exit', () => { clearTimeout(klok); klaar({ ok: true }); });
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const poort = server.address().port;

const papers = readdirSync(path.join(UIT, 'whitepapers'))
  .filter(n => n.endsWith('.html') && n !== 'index.html').sort();

mkdirSync(DOEL, { recursive: true });
const werkmap = path.join(os.tmpdir(), `rob-pdf-${poort}`);
let gelukt = 0;

for (const n of papers) {
  const naam = n.replace(/\.html$/, '');
  const tijdelijk = path.join(werkmap, `${naam}.pdf`);
  const eind = path.join(DOEL, `${naam}.pdf`);
  const oud = existsSync(eind) ? statSync(eind).size : 0;

  // ASYNC, NIET spawnSync. Eerste versie gebruikte spawnSync en hing: die blokkeert de
  // Node-thread, dus de HTTP-server hierboven — in ditzelfde proces — kon Chrome's verzoek
  // niet beantwoorden. Chrome stond te wachten op een server die niet mocht praten.
  const r = await draai(CHROME, [
    '--headless', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
    `--user-data-dir=${werkmap}-profiel`,
    // Wachten tot de webfonts geladen zijn; zonder deze pauze print Chrome de
    // terugvallettertypes en ziet de PDF er anders uit dan de pagina.
    '--virtual-time-budget=12000',
    `--print-to-pdf=${tijdelijk}`,
    `http://127.0.0.1:${poort}/whitepapers/${n}`,
  ], 120000);

  if (!r.ok || !existsSync(tijdelijk)) {
    console.error(`  ${naam}: MISLUKT — ${r.fout || 'geen bestand geschreven'}`);
    continue;
  }
  const nieuw = statSync(tijdelijk).size;
  // Fail closed op onzin: een PDF van een paar kilobyte is een lege of stukke render, en die
  // mag de goede niet overschrijven.
  if (nieuw < 40000) {
    console.error(`  ${naam}: MISLUKT — ${(nieuw/1024).toFixed(0)} kB is te klein, niet vervangen`);
    continue;
  }
  renameSync(tijdelijk, eind);
  const delta = oud ? ` (was ${(oud/1024).toFixed(0)} kB)` : ' (nieuw)';
  console.log(`  ${naam}: ${(nieuw/1024).toFixed(0)} kB${delta}`);
  gelukt++;
}

server.close();
try { rmSync(werkmap, { recursive: true, force: true }); } catch {}
try { rmSync(`${werkmap}-profiel`, { recursive: true, force: true }); } catch {}

console.log(`build-pdf: ${gelukt} van ${papers.length} PDF's opnieuw geprint.`);
if (gelukt !== papers.length) process.exit(1);
