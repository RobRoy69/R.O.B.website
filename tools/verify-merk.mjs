import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'publiek');
const errors = [];

const approvedLogos = new Map([
  ['logo-rob-donker-transparant.png', [539, 458]],
  ['logo-rob-lengte-donker-transparant.png', [589, 117]],
  ['logo-rob-lengte-wit-transparant.png', [601, 118]],
  ['logo-rob-wit-transparant.png', [560, 464]],
]);

const pngDimensions = (file) => {
  const bytes = readFileSync(file);
  if (bytes.toString('ascii', 1, 4) !== 'PNG') return null;
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};

for (const [name, expected] of approvedLogos) {
  const file = path.join(PUBLIC, 'media', 'logo', name);
  if (!existsSync(file)) {
    errors.push(`goedgekeurd logo ontbreekt: media/logo/${name}`);
    continue;
  }
  const actual = pngDimensions(file);
  if (!actual || actual[0] !== expected[0] || actual[1] !== expected[1]) {
    errors.push(`logo heeft verkeerde afmetingen: ${name} (${actual?.join('×') || 'geen PNG'})`);
  }
}

const pdfBuilder = readFileSync(path.join(ROOT, 'tools', 'build-pdf.mjs'), 'utf8');
if (!/querySelectorAll\('img\.rob-lockup'\)[\s\S]*?logo-rob-lengte-wit-transparant\.png[\s\S]*?image\.decode\(\)/.test(pdfBuilder)) {
  errors.push('PDF-builder wisselt niet gecontroleerd naar het definitieve logo voor lichte ondergrond');
}

const htmlFiles = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.html')) htmlFiles.push(file);
  }
};

if (!existsSync(PUBLIC)) errors.push('publiek/ ontbreekt');
else walk(PUBLIC);

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const relative = path.relative(PUBLIC, file).replaceAll('\\', '/');
  if (!html.includes('/media/merk.css')) errors.push(`${relative}: gedeelde merklaag ontbreekt`);
  if (!/\/media\/logo\/logo-rob-(?:lengte-)?(?:donker|wit)-transparant\.png/.test(html)) {
    errors.push(`${relative}: goedgekeurd R.O.B.-lockup ontbreekt`);
  }
  for (const forbidden of ['#f4f2ed', '#f5f2eb', '#e9e5dc', '#00a7c7', '#e43d28', '#6b6478', '#5d6470']) {
    if (html.toLowerCase().includes(forbidden)) errors.push(`${relative}: verouderde kleur ${forbidden}`);
  }
  if (/font-style\s*:\s*italic/i.test(html)) errors.push(`${relative}: cursief is niet toegestaan`);
}

for (const relative of ['kennisgezagsscan/style.css', 'kennisproef/style.css']) {
  const css = readFileSync(path.join(PUBLIC, relative), 'utf8');
  if (/\bbox-shadow\s*:/i.test(css)) errors.push(`${relative}: schaduw is niet toegestaan`);
  if (/(?:linear|radial)-gradient\s*\(/i.test(css)) errors.push(`${relative}: gradient is niet toegestaan`);
  if (/font-weight\s*:\s*(?:[7-9]00|bold)\b/i.test(css)) errors.push(`${relative}: gewicht boven 600`);
}

const homepageSource = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const verkenningStart = homepageSource.indexOf('function buildVerkenningSVG()');
const verkenningEnd = homepageSource.indexOf('function downloadVerkenning()', verkenningStart);
const verkenningSvg = verkenningStart >= 0 && verkenningEnd > verkenningStart
  ? homepageSource.slice(verkenningStart, verkenningEnd)
  : '';
if (!verkenningSvg) {
  errors.push('downloadbare verkenning-SVG ontbreekt');
} else {
  if (!verkenningSvg.includes('logo-rob-lengte-wit-transparant.png')) {
    errors.push('verkenning-SVG gebruikt geen goedgekeurd lockup');
  }
  if (/(?:linear|radial)-gradient|<(?:linear|radial)Gradient/i.test(verkenningSvg)) {
    errors.push('verkenning-SVG bevat een gradient');
  }
  if (/font-weight=["'](?:[7-9]00|bold)["']/i.test(verkenningSvg)) {
    errors.push('verkenning-SVG gebruikt een gewicht boven 600');
  }
  if (/\brx=["'](?:[3-9]|[1-9]\d)/i.test(verkenningSvg)) {
    errors.push('verkenning-SVG gebruikt een radius boven 2px');
  }
}

if (errors.length) {
  console.error(`verify-merk: ROOD — ${errors.length} bevinding(en):`);
  for (const error of errors) console.error(`  · ${error}`);
  process.exit(1);
}

console.log(`verify-merk: groen — ${htmlFiles.length} pagina's gebruiken één merklaag en een goedgekeurd lockup.`);
