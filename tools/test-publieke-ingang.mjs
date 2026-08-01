import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lees = (pad) => readFile(new URL(`../${pad}`, import.meta.url), 'utf8');

const homepage = await lees('index.html');
assert.match(homepage, /class="landing-scan-link" href="\/kennisgezagsscan\/"/);
assert.match(homepage, /Ontdek je zwakste schakel/);
assert.doesNotMatch(homepage, /E&eacute;n HTML-bestand|claude-haiku|Ongeveer 2200 regels/);

const papers = [
  ['whitepapers/de-beste-keuze-is.html', 'Toets je aanbeveelbaarheid'],
  ['whitepapers/de-klinkklare-onzin.html', 'Toets de stem van je AI'],
  ['whitepapers/de-mens-beslist.html', 'Toets wie werkelijk beslist'],
  ['whitepapers/wie-heeft-de-sleutels.html', 'Toets wie de sleutels heeft'],
];

for (const [pad, cta] of papers) {
  const html = await lees(pad);
  assert.match(html, /<section class="ingang" aria-labelledby="relevant">/);
  assert.match(html, /De kern in (?:&eacute;&eacute;n|één) zin:/);
  assert.match(html, new RegExp(cta));
  assert.match(html, /href="\/kennisgezagsscan\/"/);
}

const bewijsbouwer = await lees('tools/build-bewijs-pagina.mjs');
assert.match(bewijsbouwer, /geen oordeel over\s+waarheid/);
assert.doesNotMatch(bewijsbouwer, /is niet minder waar/);

const netlify = await lees('netlify.toml');
assert.match(netlify, /from = "\/scan\/"[\s\S]*?to = "\/kennisgezagsscan\/"[\s\S]*?status = 301/);

console.log('Publieke ingang: directe scanroute, vier begrijpelijke paperingangen en bewijsgrens kloppen.');
