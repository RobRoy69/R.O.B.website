// R.O.B. Concepting — pakt de gebundelde masterpresentaties uit tot gewone statische mappen.
//
// AANLEIDING (2026-08-05). De aangeleverde presentaties zijn "bundled pages": één HTML met
// een loader die resources uit een gecomprimeerd manifest als blob-URL's mint en React zo
// nodig van unpkg haalt. De site-CSP staat terecht geen unpkg en geen blob-scripts toe, dus
// op productie startte de slideshow nooit en zag de kijker de kale inhoud gestapeld.
//
// Twee CSP's stapelen kan alleen strenger maken, nooit ruimer. Dus niet de CSP oprekken maar
// de bundel uitpakken: elk resource wordt een echt bestand op eigen origin, en de unpkg-
// verwijzingen in de runtime wijzen naar de React-kopieën die al ín het manifest zitten.
// Daarna is alles 'self' en doet de bestaande CSP gewoon zijn werk.
//
// Bron: de drie *.html-bundels naast dit scriptdoel. Draai na elke nieuwe aanlevering:
//   node tools/unpack-presentaties.mjs
// Uitvoer: ervaring/presentaties/<naam>/index.html + assets/. De bundel zelf blijft als
// bronbestand in _bron/ staan zodat een nieuwe aanlevering vergelijkbaar blijft.

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'ervaring', 'presentaties');
const BRON = path.join(DIR, '_bron');

const PRESENTATIES = [
  ['agora-kis', 'Agora KIS — kennis die zich kan verantwoorden'],
  ['dynamic-knowledge', 'Dynamic Knowledge — vindbaar voor mens en machine'],
  ['max-site', 'Max Finance &amp; Legal — de website'],
];

const EXT = { 'text/javascript': 'js', 'application/javascript': 'js', 'text/css': 'css', 'font/woff2': 'woff2', 'image/svg+xml': 'svg', 'image/png': 'png' };

const blok = (html, naam) => {
  const m = html.match(new RegExp(`<script type="__bundler/${naam}">([\\s\\S]*?)</script>`));
  return m ? JSON.parse(m[1]) : null;
};

mkdirSync(BRON, { recursive: true });

for (const [naam, titel] of PRESENTATIES) {
  const bronPad = existsSync(path.join(BRON, `${naam}.html`))
    ? path.join(BRON, `${naam}.html`)
    : path.join(DIR, `${naam}.html`);
  const html = readFileSync(bronPad, 'utf8');
  const manifest = blok(html, 'manifest');
  let template = blok(html, 'template');
  if (!manifest || !template) throw new Error(`${naam}: geen bundelblokken gevonden`);

  const uit = path.join(DIR, naam);
  mkdirSync(path.join(uit, 'assets'), { recursive: true });

  // Resources uitpakken. React krijgt een herkenbare naam; de rest zijn korte uuid-namen.
  const naamVoor = {};
  for (const [uuid, res] of Object.entries(manifest)) {
    let inhoud = Buffer.from(res.data, 'base64');
    if (res.compressed) inhoud = gunzipSync(inhoud);
    const tekst = /javascript|css|svg/.test(res.mime) ? inhoud.toString('utf8') : null;
    const basis = tekst && /@license React[\s\S]{0,60}react-dom/.test(tekst) ? 'react-dom.production.min'
      : tekst && /@license React/.test(tekst) ? 'react.production.min'
      : uuid.slice(0, 8);
    const bestand = `${basis}.${EXT[res.mime] || 'bin'}`;
    naamVoor[uuid] = `./assets/${bestand}`;
    if (tekst !== null) {
      // De dc-runtime haalt React van unpkg als de globals ontbreken. Zelfde bestanden
      // staan hiernaast; de CSP staat alleen eigen origin toe.
      const herschreven = tekst
        .replace(/https:\/\/unpkg\.com\/react-dom@[\d.]+\/umd\/react-dom\.production\.min\.js/g, './assets/react-dom.production.min.js')
        .replace(/https:\/\/unpkg\.com\/react@[\d.]+\/umd\/react\.production\.min\.js/g, './assets/react.production.min.js');
      writeFileSync(path.join(uit, 'assets', bestand), herschreven);
    } else {
      writeFileSync(path.join(uit, 'assets', bestand), inhoud);
    }
  }

  // Template wordt de echte pagina: uuid-verwijzingen naar bestandspaden, en de kop die de
  // bundelwrapper droeg (titel + noindex) verhuist mee.
  for (const [uuid, pad] of Object.entries(naamVoor)) template = template.replaceAll(uuid, pad);
  template = template.replace(/<head>/i,
    `<head>\n<title>${titel}</title>\n<meta name="robots" content="noindex, nofollow, noarchive">`);
  writeFileSync(path.join(uit, 'index.html'), template);

  // De bundel wordt bron, geen publicatie.
  if (bronPad === path.join(DIR, `${naam}.html`)) renameSync(bronPad, path.join(BRON, `${naam}.html`));
  console.log(`${naam}: ${Object.keys(manifest).length} resources → ${path.relative(ROOT, uit)}`);
}
