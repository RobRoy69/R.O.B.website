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
// WAAROM VIA HET DEVTOOLS-PROTOCOL EN NIET VIA --print-to-pdf. Die vlag deed hier niets:
// deze Chrome negeert --headless, start een volledige browser en schrijft geen bestand;
// Edge schreef evenmin iets. In plaats van tegen dat gedrag te vechten laat dit script de
// browser gewoon zélf printen — Chrome start met een debug-poort, en Page.printToPDF is
// exact wat "Opslaan als PDF" in het printvenster aanroept. Zelfde knop, zonder venster.
//
// Eigen profielmap en eigen poort, zodat een openstaande Chrome van de gebruiker er niet
// mee te maken krijgt. Ik heb eerder vandaag chrome.exe hardhandig afgesloten om een vastloper
// op te ruimen; dat was onnodig ingrijpend en hoeft met deze opzet niet meer.
//
// Draai: npm run pdf     (na build-publiek)

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, renameSync, rmSync } from 'node:fs';
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

// ── het DevTools-protocol, kaal ────────────────────────────────────────────────
// Node 24 heeft WebSocket ingebouwd, dus hier is geen enkele afhankelijkheid voor nodig.
const wacht = (ms) => new Promise(r => setTimeout(r, ms));

async function verbind(url) {
  const ws = new WebSocket(url);
  await new Promise((ok, fout) => { ws.onopen = ok; ws.onerror = () => fout(new Error('geen verbinding')); });
  let nr = 0;
  const open = new Map();
  ws.onmessage = (e) => {
    const b = JSON.parse(e.data);
    if (b.id && open.has(b.id)) {
      const { ok, fout } = open.get(b.id); open.delete(b.id);
      b.error ? fout(new Error(b.error.message)) : ok(b.result);
    }
  };
  return {
    // sessionId hoort NAAST params in het bericht, niet erin. Eerste versie stopte hem in
    // params en kreeg "'Page.enable' wasn't found": het commando ging naar de browser zelf,
    // en die kent geen Page-domein — dat hoort bij een tabblad.
    stuur: (methode, params = {}, sessionId) => new Promise((ok, fout) => {
      const id = ++nr;
      open.set(id, { ok, fout });
      ws.send(JSON.stringify({ id, method: methode, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => { if (open.has(id)) { open.delete(id); fout(new Error(`${methode}: tijd op`)); } }, 90000);
    }),
    sluit: () => ws.close(),
  };
}

await new Promise(r => server.listen(0, '127.0.0.1', r));
const poort = server.address().port;

const papers = readdirSync(path.join(UIT, 'whitepapers'))
  .filter(n => n.endsWith('.html') && n !== 'index.html').sort();

mkdirSync(DOEL, { recursive: true });
const werkmap = path.join(os.tmpdir(), `rob-pdf-${poort}`);
const debugPoort = 9333 + (poort % 200);

// EEN VASTE PROFIELMAP, HERGEBRUIKT. Eerste versie hing de profielmap aan de willekeurige
// poort, dus elke draai maakte een nieuwe — en de opruiming aan het eind liep vlak na
// browser.kill(), terwijl Chrome zijn bestanden nog vasthield. Zeven draaien lieten 208 MB
// achter in de tijdelijke map. Nu een naam die niet meebeweegt, plus een veegbeurt vooraf op
// wat vorige versies hebben laten liggen. Opruimen aan het begin is betrouwbaarder dan aan
// het eind: dan is er niets meer dat de bestanden vasthoudt.
const profiel = path.join(os.tmpdir(), 'rob-pdf-profiel');
let opgeruimd = 0;
for (const naam of readdirSync(os.tmpdir())) {
  if (!/^rob-pdf-\d+/.test(naam)) continue;
  try { rmSync(path.join(os.tmpdir(), naam), { recursive: true, force: true }); opgeruimd++; } catch {}
}
if (opgeruimd) console.log(`  ${opgeruimd} achtergebleven werkmap(pen) van eerdere draaien opgeruimd`);
let gelukt = 0;

// Chrome starten met een debug-poort. Eigen profiel, geen extensies, geen eerste-start-scherm.
const browser = spawn(CHROME, [
  `--remote-debugging-port=${debugPoort}`,
  `--user-data-dir=${profiel}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-background-networking', '--disable-sync', '--window-position=-32000,-32000',
  'about:blank',
], { stdio: 'ignore', detached: false });

// Wachten tot de debug-poort antwoordt. Pollen, niet gokken: een vaste pauze is te kort op
// een koude start en te lang op een warme.
let doel = null;
for (let i = 0; i < 60 && !doel; i++) {
  await wacht(500);
  try {
    const r = await fetch(`http://127.0.0.1:${debugPoort}/json/version`);
    if (r.ok) doel = (await r.json()).webSocketDebuggerUrl;
  } catch { /* nog niet op */ }
}
if (!doel) {
  console.error(`build-pdf: Chrome antwoordde niet op poort ${debugPoort}.`);
  browser.kill(); server.close(); process.exit(1);
}
console.log(`  browser gestart op debug-poort ${debugPoort}`);
const cdp = await verbind(doel);

for (const n of papers) {
  const naam = n.replace(/\.html$/, '');
  const tijdelijk = path.join(werkmap, `${naam}.pdf`);
  const eind = path.join(DOEL, `${naam}.pdf`);
  const oud = existsSync(eind) ? statSync(eind).size : 0;

  // Een eigen tabblad per paper, zodat een stukke render de volgende niet meebesmet.
  let data;
  try {
    const { targetId } = await cdp.stuur('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.stuur('Target.attachToTarget', { targetId, flatten: true });
    // Elk commando gaat naar dít tabblad, via de sessie-id. (Zonder sessionId praat je tegen
    // de browser zelf en doet Page.printToPDF niets.)
    const inTab = (m, p = {}) => cdp.stuur(m, p, sessionId);

    await inTab('Page.enable');
    await inTab('Page.navigate', { url: `http://127.0.0.1:${poort}/whitepapers/${n}` });

    // Wachten tot de webfonts er zijn. Zonder dit print Chrome de terugvallettertypes en
    // ziet de PDF er anders uit dan de pagina — het verschil dat niemand opmerkt tot het
    // stuk bij een lezer op tafel ligt.
    for (let i = 0; i < 40; i++) {
      await wacht(500);
      const r = await inTab('Runtime.evaluate', {
        expression: 'document.readyState === "complete" && document.fonts.status === "loaded"',
        returnByValue: true,
      });
      if (r?.result?.value) break;
    }
    await wacht(1200);

    ({ data } = await inTab('Page.printToPDF', {
      printBackground: true,
      preferCSSPageSize: false,
      paperWidth: 8.27, paperHeight: 11.69,          // A4 in inches
      marginTop: 0.4, marginBottom: 0.4, marginLeft: 0.4, marginRight: 0.4,
      displayHeaderFooter: false,
      transferMode: 'ReturnAsBase64',
    }));
    await cdp.stuur('Target.closeTarget', { targetId });
  } catch (e) {
    console.error(`  ${naam}: MISLUKT — ${e.message}`);
    continue;
  }

  if (!data) { console.error(`  ${naam}: MISLUKT — geen data terug`); continue; }
  mkdirSync(werkmap, { recursive: true });
  writeFileSync(tijdelijk, Buffer.from(data, 'base64'));
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

cdp.sluit();
browser.kill();
server.close();
// Alleen de PDF-werkmap weg; de profielmap blijft staan en wordt hergebruikt. Dat scheelt
// een koude Chrome-start bij de volgende draai, en de veegbeurt bovenaan houdt hem enkelvoudig.
try { rmSync(werkmap, { recursive: true, force: true }); } catch {}

console.log(`build-pdf: ${gelukt} van ${papers.length} PDF's opnieuw geprint.`);
if (gelukt !== papers.length) process.exit(1);
