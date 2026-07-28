// R.O.B. Concepting — zet de entiteitsgraaf in elke gepubliceerde pagina.
//
// Werkt op de PUBLICATIE, niet op de bronbestanden. Reden: de bronpagina's zijn met de hand
// geschreven HTML en moeten leesbaar blijven; de graaf is afgeleid en hoort niet in vijf
// bestanden overgetypt te staan. Dat was juist het probleem — vijf losse Person-objecten
// voor dezelfde persoon, nul @id-verwijzingen.
//
// GEEN REGEX OVER JSON. De eerste versie verving de losse Person-objecten met een reguliere
// expressie over de HTML. Dat brak paper 04: daar stond het author-object op ÉÉN regel, dus
// liep het patroon door tot een latere sluitaccolade en slikte het de komma en twee velden
// op. Het blok werd ongeldig JSON — gevangen door de validatie, niet door mij.
// Ironisch, want het commentaar bij die regex beweerde juist voorzichtig te zijn.
//
// Nu worden de JSON-LD-blokken GEPARSEERD, in het object vervangen, en teruggeschreven.
// Een structuur bewerk je structureel.
//
// Draai: node tools/build-entiteiten.mjs   (na build-publiek, voor verify-publiek)

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { graaf, ID } from './lib/entiteiten.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const UIT  = path.join(ROOT, 'publiek');

const blok = '  <script type="application/ld+json">\n'
  + JSON.stringify(graaf(), null, 2).split('\n').map(l => '  ' + l).join('\n')
  + '\n  </script>\n';

// Vervang losse definities door een verwijzing naar de graaf. Recursief, want ze zitten
// genest in author, founder, publisher en worksFor.
const verwijs = (n) => {
  if (Array.isArray(n)) return n.map(verwijs);
  if (!n || typeof n !== 'object') return n;
  if (n['@type'] === 'Person' && n.name === 'Rob de Rooij') return { '@id': ID.persoon };
  if ((n['@type'] === 'Organization' || n['@type'] === 'ProfessionalService')
      && n.name === 'R.O.B. Concepting') return { '@id': ID.org };
  const uit = {};
  for (const [k, v] of Object.entries(n)) uit[k] = verwijs(v);
  return uit;
};

let geraakt = 0, vervangen = 0, stuk = 0;

const loop = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { loop(p); continue; }
    if (!e.name.endsWith('.html')) continue;

    let h = readFileSync(p, 'utf-8');
    if (h.includes(`"@id": "${ID.persoon}"`)) continue;   // al gedaan

    h = h.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (m, open, body, close) => {
      let obj;
      try { obj = JSON.parse(body); } catch { stuk++; return m; }   // onparseerbaar? niet aanraken
      const voor = JSON.stringify(obj);
      const na = verwijs(obj);
      if (JSON.stringify(na) !== voor) vervangen++;
      return open + '\n' + JSON.stringify(na, null, 2).split('\n').map(l => '  ' + l).join('\n') + '\n  ' + close;
    });

    const anker = h.indexOf('  <script type="application/ld+json">');
    h = anker >= 0 ? h.slice(0, anker) + blok + h.slice(anker)
                   : h.replace('</head>', blok + '</head>');

    writeFileSync(p, h);
    geraakt++;
  }
};
loop(UIT);

if (!geraakt) { console.error('build-entiteiten: geen enkele pagina geraakt. Fail closed.'); process.exit(1); }
if (stuk)     { console.error(`build-entiteiten: ${stuk} JSON-LD-blok(ken) waren al onparseerbaar. Fail closed.`); process.exit(1); }
console.log(`build-entiteiten: graaf in ${geraakt} pagina's, ${vervangen} losse definitie(s) vervangen door een verwijzing`);
