// R.O.B. Concepting — sitemap.xml, afgeleid uit wat er werkelijk gepubliceerd is.
//
// AANLEIDING, 2026-07-28. De sitemap stond met de hand in de repo. Hij telde acht pagina's
// terwijl er negen gepubliceerd werden: het nieuwsbericht van vandaag stond er niet in, en
// /bewijs/ ook niet. Niemand had iets fout gedaan — er was alleen een tweede lijst die
// iemand had moeten bijwerken, en dat is dezelfde fout als de publicatielijst, de
// whitepaperteller, "deze drie stukken" en de datumprecisie.
//
// De regel die daaruit volgt en die nu overal geldt: WIE EEN LIJST BIJHOUDT DIE OOK GETELD
// KAN WORDEN, HOUDT EEN FOUT BIJ. De sitemap loopt daarom over de publicatiemap. Wat daar
// staat, staat erin; wat daar weg is, verdwijnt eruit. Vergeten kan niet meer.
//
// LASTMOD IS ECHT. Voor berichten en whitepapers wordt de datum uit het register gehaald —
// een verzonnen wijzigingsdatum is een leugen tegen een crawler, en die rekent erop.
//
// Draai: node tools/build-sitemap.mjs   (na build-bewijs-pagina, als publiek/ compleet is)

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { BASIS } from './lib/entiteiten.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const UIT  = path.join(ROOT, 'publiek');
const BER  = path.join(ROOT, 'nieuws', '_berichten.json');

if (!existsSync(UIT)) {
  console.error('build-sitemap: publiek/ ontbreekt — draai eerst build-publiek.');
  process.exit(1);
}

// Alle HTML in de publicatie, als URL's. index.html wordt een map-URL, want dat is wat de
// bezoeker en de crawler zien.
const paginas = [];
const loop = (map, prefix) => {
  for (const naam of readdirSync(map).sort()) {
    const vol = path.join(map, naam);
    if (statSync(vol).isDirectory()) { loop(vol, `${prefix}${naam}/`); continue; }
    if (!naam.endsWith('.html')) continue;
    // Een pagina die zichzelf op noindex zet, hoort niet in de sitemap. Afgeleid uit de
    // pagina zelf en niet uit een lijst hier: anders moet iemand twee plekken gelijk houden.
    if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(readFileSync(vol, 'utf8'))) continue;
    const raw = naam === 'index.html' ? prefix : `${prefix}${naam}`;
    paginas.push(raw.startsWith('/whitepapers/') ? raw.replace(/\.html$/, '') : raw);
  }
};
loop(UIT, '/');

// Publicatiedata uit het register, voor de berichten.
const datumVan = new Map();
if (existsSync(BER)) {
  for (const b of (JSON.parse(readFileSync(BER, 'utf8')).berichten || [])) {
    datumVan.set(`/nieuws/${b.slug}/`, (b.gepubliceerd_op || '').slice(0, 10));
  }
}

// Prioriteit volgt de rol van de pagina, niet een gevoel. De voordeur en de reeks dragen het
// meeste; het bewijs en de vragen zijn het citeerbare oppervlak; losse berichten schuiven
// vanzelf naar achter naarmate er meer komen.
const gewicht = (u) => {
  if (u === '/') return '1.0';
  if (u === '/whitepapers/' || u === '/vragen/') return '0.9';
  if (u === '/bewijs/' || u === '/nieuws/') return '0.8';
  if (u.startsWith('/whitepapers/')) return '0.8';
  return '0.6';
};

const vandaag = new Date().toISOString().slice(0, 10);

const regels = paginas.map(u => {
  const lastmod = datumVan.get(u) || vandaag;
  return `  <url>\n    <loc>${BASIS}${u}</loc>\n`
       + `    <lastmod>${lastmod}</lastmod>\n`
       + `    <priority>${gewicht(u)}</priority>\n  </url>`;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Afgeleid uit de publicatiemap door tools/build-sitemap.mjs. Niet met de hand bijwerken:
     wat hier staat, is wat er staat. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${regels}
</urlset>
`;

writeFileSync(path.join(UIT, 'sitemap.xml'), xml);
console.log(`build-sitemap: ${paginas.length} pagina's naar publiek/sitemap.xml`);
