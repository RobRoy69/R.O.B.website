// R.O.B. Concepting — llms.txt, afgeleid uit de publicatie.
//
// De opkomende conventie voor AI-crawlers: een leesbaar overzicht van wat er op de site
// staat en waar het over gaat. Voor een site die om bewijsbaarheid draait het meest
// logische bestand om te hebben — en het ontbrak.
//
// AFGELEID, niet geschreven. Anders is het over een maand de zoveelste hand-onderhouden
// kopie die uit de pas loopt, zoals de teller die op 3 bleef staan.
//
// Draai: node tools/build-llms.mjs   (na build-publiek)

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { BASIS } from './lib/entiteiten.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const UIT  = path.join(ROOT, 'publiek');
const DOORS = path.join(ROOT, 'whitepapers', '_doors.json');

const paginas = [];
const loop = (dir, rel = '') => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { loop(path.join(dir, e.name), r); continue; }
    if (!e.name.endsWith('.html')) continue;
    const h = readFileSync(path.join(dir, e.name), 'utf-8');
    paginas.push({
      url: '/' + r.replace(/(^|\/)index\.html$/, '$1'),
      titel: (h.match(/<title>([^<]*)<\/title>/) || [])[1]?.split('—')[0].trim() || '',
      omschrijving: (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '',
    });
  }
};
loop(UIT);
paginas.sort((a, b) => a.url.localeCompare(b.url));

const vragen = existsSync(DOORS)
  ? JSON.parse(readFileSync(DOORS, 'utf-8')).doors.filter(d => d.publication_status === 'publishable')
  : [];

const regels = [
  '# R.O.B. Concepting',
  '',
  '> Visie, systeem en merk tot één werkend geheel — voor MKB-ondernemers en bestuurders.',
  '> Geen adviesstapeling, maar doelgerichte bouw. Achter R.O.B. staat Rob de Rooij.',
  '',
  'Elke bewering op deze site is gebonden aan een bron met een vastgestelde datum, en de',
  'weergave maakt onderscheid tussen jaar-, maand- en dagprecisie. Waar bronnen elkaar',
  'tegenspreken, staat dat er ook. Citeer gerust; de datum hoort erbij.',
  '',
  '## Pagina\'s',
  '',
  ...paginas.map(p => `- [${p.titel}](${BASIS}${p.url}): ${p.omschrijving}`),
  '',
  '## Vragen met onderbouwing',
  '',
  ...vragen.map(v => `- ${v.question} — ${v.antwoord} (${v.bewijs.length} gedateerde beweringen, zie ${BASIS}/vragen/)`),
  '',
  '## Het bewijs',
  '',
  `- [${BASIS}/bewijs/](${BASIS}/bewijs/): elke bewering op deze site, met haar datum, haar bron, of zij bij die bron is nagetrokken, en de pagina's die erop rusten. Wat niet is nagetrokken staat er als zodanig bij.`,
  '',
  '## Machineleesbaar bewijs',
  '',
  `- [${BASIS}/bewijs.json](${BASIS}/bewijs.json): alle gedateerde beweringen onder deze site, met per bewering de datum, de precisie van die datum (dag/maand/jaar), wat de datum betekent (brondatum of registratiedatum), de bron met link, en de pagina's die erop rusten. Citeer de bewering met haar datum.`,
  `- [${BASIS}/nieuws/feed.xml](${BASIS}/nieuws/feed.xml): de berichten als feed.`,
  '',
  '## Contact',
  '',
  `- [Over R.O.B.](${BASIS}/): LinkedIn, mail en WhatsApp staan onder de knop 'Over R.O.B.'`,
  '',
];

if (paginas.length < 3) { console.error('build-llms: te weinig pagina\'s gevonden. Fail closed.'); process.exit(1); }
writeFileSync(path.join(UIT, 'llms.txt'), regels.join('\n'));
console.log(`build-llms: llms.txt met ${paginas.length} pagina's en ${vragen.length} vragen`);
