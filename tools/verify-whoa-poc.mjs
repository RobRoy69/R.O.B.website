// Poort voor de verborgen, publiek-veilige WHOA-POC.
// Draai: node tools/verify-whoa-poc.mjs [--saboteer]

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pocIntake, { _test } from '../netlify/functions/poc-intake.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const sabotage = process.argv.includes('--saboteer');
const errors = [];
const file = (relative) => path.join(ROOT, ...relative.split('/'));
const read = (relative) => readFileSync(file(relative), 'utf8');
const requireFile = (relative) => {
  if (!existsSync(file(relative))) errors.push(`ontbreekt: ${relative}`);
};

const requiredFiles = [
  'ervaring/index.html', 'ervaring/ervaring.css', 'ervaring/ervaring.js',
  'ervaring/whoa-demo-pack.json', 'netlify/functions/poc-intake.js'
];
requiredFiles.forEach(requireFile);

let demo;
try { demo = JSON.parse(read('ervaring/whoa-demo-pack.json')); }
catch (error) { errors.push(`whoa-demo-pack.json is ongeldig: ${error.message}`); }

if (demo) {
  if (sabotage) demo.meta.fictional = false;
  if (demo.meta?.fictional !== true || demo.meta?.publicSafe !== true) errors.push('fixture is niet fictief én publiek veilig gemarkeerd');
  if (!/^\d+\.\d+\.\d+$/.test(demo.meta?.version || '')) errors.push('fixture mist een semantische versie');
  if (!Array.isArray(demo.rules) || demo.rules.length < 3) errors.push('juridische regels missen of zijn onvolledig');
  if (!demo.rules?.every((rule) => rule.sourceUrl?.startsWith('https://www.rechtspraak.nl/') && rule.checkedAt && rule.allowedWording)) {
    errors.push('niet iedere procedurele regel heeft Rechtspraak-bron, controledatum en toegestane formulering');
  }
  const statuses = new Set(['aangeleverd', 'bron-bevestigd', 'expert-bevestigd', 'onzeker', 'ontbreekt', 'niet-vrijgegeven']);
  for (const [id, field] of Object.entries(demo.case?.fields || {})) {
    if (!statuses.has(field.status)) errors.push(`${id}: onbekende veldstatus ${field.status}`);
    if (!field.source || !Number.isInteger(field.version)) errors.push(`${id}: bron of versie ontbreekt`);
  }
  const raw = JSON.stringify(demo);
  if (/[a-z0-9._%+-]+@(gmail|hotmail|outlook|live|icloud|yahoo)\.[a-z.]+/i.test(raw)) errors.push('persoonlijk e-mailadres in publieke fixture');
  if (/\b(?:\+31|0031|06[- ]?\d{8})\b/.test(raw)) errors.push('telefoonnummer in publieke fixture');
}

const html = read('ervaring/index.html');
const js = read('ervaring/ervaring.js');
const home = read('index.html');
const fn = read('netlify/functions/poc-intake.js');
const toml = read('netlify.toml');
const robots = read('robots.txt');
const builder = read('tools/build-publiek.mjs');

if (!/<meta[^>]+name="robots"[^>]+noindex[^>]+nofollow/i.test(html)) errors.push('ervaringsapp mist noindex en nofollow');
if ((html.match(/<h1[\s>]/g) || []).length !== 1 || !js.includes("document.querySelector('#poc-shell-title')?.remove()")) {
  errors.push('statische shell moet precies één h1 dragen die vóór de dynamische projectiekop wordt verwijderd');
}
if (/<iframe\b/i.test(html + js)) errors.push('iframe aangetroffen in de ervaringsapp');
if (!home.includes("if (val === '/chat')")) errors.push('homepage onderschept niet uitsluitend exact /chat');
if (!home.includes("sessionStorage.setItem('robMaxPoc.v2'")) errors.push('homepage maakt geen lokale POC-sessie');
const interceptAt = home.indexOf("if (val === '/chat')");
const normalFetchAt = home.indexOf("fetch('/.netlify/functions/chat'", interceptAt);
if (interceptAt < 0 || normalFetchAt < interceptAt) errors.push('/chat wordt niet vóór de gewone chatfunctie onderschept');

for (const command of ['/zwaarweer', '/intake', '/delen', '/expert', '/whoa', '/leiding', '/bewijs', '/bouw']) {
  if (!js.includes(`command === '${command}'`)) errors.push(`commandoroute mist ${command}`);
}
if (!js.includes("location.replace('/#rob')")) errors.push('directe route zonder sessie keert niet terug naar het R.O.B.-contactpunt');
if (!js.includes("if (!state.consent || !state.accountantReviewed)")) errors.push('expertpoort controleert toestemming en accountantbeoordeling niet');
if (!js.includes("if (!state.routeDecision)")) errors.push('WHOA-werkruimte controleert het expertbesluit niet');

const earlyStart = js.indexOf('const renderChat =');
const earlyEnd = js.indexOf('const expertQuestions =');
const earlyScreens = js.slice(earlyStart, earlyEnd);
if (/WHOA-kandidaat|Voorbereidingsroute:\s*WHOA/.test(earlyScreens)) errors.push('WHOA wordt vóór de expertpoort als route onthuld');

for (const forbidden of ['archiveChatSession', 'sendMail', 'mailToRob', 'SUPABASE_', 'service_role', 'fetch(\'https://api.resend.com']) {
  if (fn.includes(forbidden)) errors.push(`POC-functie bevat verboden neveneffect: ${forbidden}`);
}
if (!fn.includes("path: '/api/poc-intake'")) errors.push('POC-functie mist het vaste API-pad');
if (!fn.includes("Cache-Control': 'no-store")) errors.push('POC-functie staat caching toe');
if (!fn.includes('FORBIDDEN_CONCLUSION')) errors.push('POC-functie bewaakt de beslisgrens niet');

if (!/from = "\/ervaring\/\*"[\s\S]*?to = "\/ervaring\/index\.html"[\s\S]*?status = 200/.test(toml)) errors.push('Netlify rewrite voor rolprojecties ontbreekt');
if (!/for = "\/ervaring\/\*"[\s\S]*?X-Robots-Tag = "noindex, nofollow, noarchive"/.test(toml)) errors.push('Netlify noindex-header ontbreekt');
if (!robots.includes('Disallow: /ervaring/')) errors.push('robots.txt sluit de ervaring niet uit');
if (!builder.includes("pad: 'ervaring'")) errors.push('publieke inclusielijst neemt de ervaringsapp niet op');

const previousKey = process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
const fallbackResponse = await pocIntake(new Request('https://rob-concepting.com/api/poc-intake', {
  method: 'POST',
  headers: { origin: 'https://rob-concepting.com', 'content-type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'poc-test-session-1234',
    message: 'Het bedrijf draait nog, maar de oude schulden halen ons in.',
    caseContext: { fictional: true, sector: 'horeca', stage: 'signalering' }
  })
}), { ip: 'verify-poc-fallback' });
if (previousKey) process.env.ANTHROPIC_API_KEY = previousKey;
if (fallbackResponse.status !== 200) errors.push(`fallback geeft HTTP ${fallbackResponse.status} in plaats van 200`);
else {
  const body = await fallbackResponse.json();
  if (body.mode !== 'fallback' || !Array.isArray(body.questions) || body.questions.length > 2) errors.push('fallbackcontract klopt niet');
  if (/\b(whoa|homologatie|faillissement|surseance)\b/i.test(JSON.stringify(body))) errors.push('fallback kiest of noemt een juridische route');
}

const invalidResponse = await pocIntake(new Request('https://rob-concepting.com/api/poc-intake', {
  method: 'POST',
  headers: { origin: 'https://rob-concepting.com', 'content-type': 'application/json' },
  body: JSON.stringify({ sessionId: 'te-kort', message: 'Help', caseContext: { fictional: false } })
}), { ip: 'verify-poc-invalid' });
if (invalidResponse.status !== 400) errors.push('ongeldig verzoek wordt niet met 400 geweigerd');

try {
  _test.parseModelJson('{"reflection":"WHOA is passend","questions":["Akkoord?"],"signals":[]}');
  errors.push('modelrespons kan vóór expertvalidatie toch een WHOA-conclusie geven');
} catch {}

if (errors.length) {
  console.error(`verify-whoa-poc: ROOD — ${errors.length} bevinding(en):`);
  errors.forEach((error) => console.error(`  · ${error}`));
  process.exit(sabotage ? 0 : 1);
}

if (sabotage) {
  console.error('verify-whoa-poc: sabotage mislukte — de poort bleef groen.');
  process.exit(1);
}

console.log('verify-whoa-poc: groen — route, privacygrenzen, fixture en veilige AI-fallback kloppen.');
