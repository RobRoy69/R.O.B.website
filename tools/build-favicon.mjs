// R.O.B. Concepting — geeft iedere gebouwde HTML-pagina hetzelfde favicon.
// Draai na alle paginageneratoren, zodat ook nieuwe routes automatisch meedoen.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'publiek');
const FAVICON = '<link rel="icon" href="/favicon.svg" type="image/svg+xml">';
const ICON_LINK = /\s*<link\b[^>]*\brel=["'](?:shortcut\s+)?icon["'][^>]*>\s*/gi;

if (!existsSync(path.join(PUBLIC, 'favicon.svg'))) {
  console.error('build-favicon: ROOD — publiek/favicon.svg ontbreekt');
  process.exit(1);
}

const htmlFiles = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.html')) htmlFiles.push(file);
  }
};

walk(PUBLIC);

const errors = [];
let changed = 0;

for (const file of htmlFiles) {
  const original = readFileSync(file, 'utf8');
  if (!/<\/head>/i.test(original)) {
    errors.push(`${path.relative(PUBLIC, file)}: </head> ontbreekt`);
    continue;
  }

  const withoutIcons = original.replace(ICON_LINK, '\n');
  const html = withoutIcons.replace(/<\/head>/i, `  ${FAVICON}\n</head>`);
  if (html !== original) {
    writeFileSync(file, html, 'utf8');
    changed++;
  }
}

if (errors.length) {
  console.error(`build-favicon: ROOD — ${errors.length} bevinding(en):`);
  for (const error of errors) console.error(`  · ${error}`);
  process.exit(1);
}

console.log(`build-favicon: ${htmlFiles.length} pagina's gecontroleerd, ${changed} bijgewerkt.`);
