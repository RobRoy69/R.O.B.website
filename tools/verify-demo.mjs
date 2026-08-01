// Generieke poort voor merkconfiguraties op de gedeelde demo-engine.
// Draai: node tools/verify-demo.mjs <merk> [--saboteer]

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const brandId = process.argv.slice(2).find((argument) => !argument.startsWith('--')) || '';
const saboteer = process.argv.includes('--saboteer');
const errors = [];

if (!/^[a-z0-9-]+$/.test(brandId)) {
  console.error('verify-demo: ROOD - geef een veilige merk-id op, bijvoorbeeld "max"');
  process.exit(1);
}

const files = {
  engineJs: path.join(ROOT, 'demo', 'core', 'engine.js'),
  engineCss: path.join(ROOT, 'demo', 'core', 'engine.css'),
  html: path.join(ROOT, 'demo', brandId, 'index.html'),
  brand: path.join(ROOT, 'demo', brandId, 'config', 'brand.json'),
  walkthrough: path.join(ROOT, 'demo', brandId, 'config', 'walkthrough.json'),
  data: path.join(ROOT, 'demo', brandId, 'data', 'demo-case.json'),
};

for (const [label, file] of Object.entries(files)) {
  if (!existsSync(file)) errors.push(`${label} ontbreekt: ${path.relative(ROOT, file)}`);
}

if (errors.length) {
  console.error(`verify-demo: ROOD - ${errors.length} bevinding(en):`);
  for (const error of errors) console.error('  - ' + error);
  process.exit(1);
}

const engineJs = readFileSync(files.engineJs, 'utf8');
const engineCss = readFileSync(files.engineCss, 'utf8');
const html = readFileSync(files.html, 'utf8');
let brand;
let walkthrough;
let data;

try {
  brand = JSON.parse(readFileSync(files.brand, 'utf8'));
  walkthrough = JSON.parse(readFileSync(files.walkthrough, 'utf8'));
  data = JSON.parse(readFileSync(files.data, 'utf8'));
} catch (error) {
  errors.push(`JSON is ongeldig: ${error.message}`);
}

if (brand && walkthrough && data) {
  if (brand.id !== brandId) errors.push(`brand.id is "${brand.id}" in plaats van "${brandId}"`);
  if (data.meta?.type !== 'demonstratie' || data.meta?.fictional !== true) {
    errors.push('casus is niet expliciet als fictieve demonstratie gemarkeerd');
  }

  const required = ['max', 'zwaarweer', 'verwijzer', 'expert', 'bewijs', 'leiding', 'bouw'];
  const ids = walkthrough.chapters?.map((chapter) => chapter.id) || [];
  const testedIds = saboteer ? ids.filter((id) => id !== 'expert') : ids;
  for (const id of required) if (!testedIds.includes(id)) errors.push(`verplicht hoofdstuk ontbreekt: ${id}`);
  if (new Set(ids).size !== ids.length) errors.push('hoofdstuk-id komt meer dan eenmaal voor');

  const commands = walkthrough.chapters?.map((chapter) => chapter.command) || [];
  for (const id of required) if (!commands.includes(`/${id}`)) errors.push(`verplicht commando ontbreekt: /${id}`);

  for (const chapter of walkthrough.chapters || []) {
    if (!walkthrough.profiles?.[chapter.profile]) errors.push(`${chapter.id}: onbekend presentatieprofiel ${chapter.profile}`);
    if (!chapter.status) errors.push(`${chapter.id}: demostatus ontbreekt`);
    if (!Array.isArray(chapter.blocks) || chapter.blocks.length === 0) errors.push(`${chapter.id}: heeft geen blokken`);
  }

  const checkPaths = (value, location = 'walkthrough') => {
    if (Array.isArray(value)) return value.forEach((item, index) => checkPaths(item, `${location}[${index}]`));
    if (!value || typeof value !== 'object') return;
    for (const [key, nested] of Object.entries(value)) {
      if ((key === 'path' || key.endsWith('Path')) && typeof nested === 'string' && getPath(data, nested) === undefined) {
        errors.push(`${location}.${key}: datapad bestaat niet: ${nested}`);
      }
      checkPaths(nested, `${location}.${key}`);
    }
  };
  checkPaths(walkthrough.chapters);
}

function getPath(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object);
}

// Technische termen als Math.max, max-width en minmax zijn merkneutraal. Daarom toetsen
// we op een zichtbare merknaam of route, niet op de losse tekenreeks "max".
const forbiddenInEngine = [/\bMax\b/, /\/max\b/i, /r\.o\.b\./i, /rob-concepting/i, /finance\s*&\s*legal/i];
for (const pattern of forbiddenInEngine) {
  if (pattern.test(engineJs) || pattern.test(engineCss)) errors.push(`merknaam of klanttaal zit in de engine: ${pattern}`);
}

if (!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) errors.push('index.html mist noindex');
if (!/<meta[^>]+name=["']brand-scope["'][^>]+external-demo/i.test(html)) errors.push('index.html mist externe merkscope');
if (!html.includes('../core/engine.js') || !html.includes('../core/engine.css')) errors.push('merkroute gebruikt de gedeelde engine niet');
if (/<iframe\b/i.test(html + engineJs)) errors.push('iframe aangetroffen');
if (/(?:src|href)=["']https?:\/\//i.test(html)) errors.push('externe runtime-asset aangetroffen in index.html');
if (/supabase|anon[_-]?key|service[_-]?role/i.test(engineJs + html)) errors.push('database- of sleutelverwijzing in clientoppervlak');

if (errors.length) {
  console.error(`verify-demo: ROOD - ${errors.length} bevinding(en):`);
  for (const error of errors) console.error('  - ' + error);
  process.exit(1);
}

console.log(`verify-demo: groen - engine is merkloos en configuratie "${brandId}" is volledig.`);
