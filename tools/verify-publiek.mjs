// R.O.B. Concepting — poort op wat werkelijk gepubliceerd wordt.
//
// Vervangt verify-publish-tree.mjs. Dat toetste de PROJECTMAP tegen een met de hand
// onderhouden lijst van wat daar mocht staan. Twee bezwaren, beide gebleken:
//   · de lijst was een handmatige kopie van "wat hoort hier" — precies het anti-patroon
//     dat elders in dit project de drift veroorzaakt (stale index, stale sitemap,
//     gedupliceerde promptfoo-prompt);
//   · hij was opgebouwd uit de LOKALE map en brak de Netlify-build, omdat de
//     buildomgeving eigen mappen aanmaakt (.netlify, .cache). Twee deploys kwamen
//     daardoor niet door.
//
// Nu toetst deze poort de publieke map die build-publiek net heeft samengesteld. Hij
// controleert niet meer of iemand een lijst heeft bijgewerkt, maar of de werkelijkheid
// klopt: staat hier iets dat hier niet hoort, en staat alles hier dat er moet zijn.
//
// Sabotage-test: node tools/verify-publiek.mjs --saboteer
// Exit 0 = groen, exit 1 = rood.

import { readdirSync, readFileSync, existsSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import path from 'node:path';
import { nestingFouten } from './lib/nesting.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const UIT  = path.join(ROOT, 'publiek');
const saboteer = process.argv.includes('--saboteer');

// Wat er onder GEEN VOORWAARDE in de publicatie mag staan.
const VERBODEN_EXT  = ['.sql', '.log', '.env', '.bak', '.tmp', '.pem', '.key', '.mjs', '.toml'];
const VERBODEN_NAAM = ['package.json', 'package-lock.json', 'promptfoo.config.yaml',
                       'promptfoo.readme.md', 'readme.md', 'netlify.toml',
                       'rob-canon-bundle.json'];

// Wat er WEL moet staan. Ontbreekt hier iets, dan is de publicatie stuk en mag hij niet
// live — beter een rode build dan een site zonder pagina's.
const MOET_BESTAAN = [
  'index.html',
  'robots.txt',
  'sitemap.xml',
  'vragen/index.html',
  'bewijs/index.html',
  'nieuws/index.html',
  'nieuws/feed.xml',
  'whitepapers/index.html',
  'whitepapers/de-mens-beslist.html',
  'whitepapers/de-klinkklare-onzin.html',
  'whitepapers/de-beste-keuze-is.html',
  'whitepapers/wie-heeft-de-sleutels.html',
];

// Interne projecties die juist NIET meer publiek mogen zijn. Dit was het lek.
const MAG_NIET_BESTAAN = [
  'whitepapers/_register.json',
  'whitepapers/_doors.json',
  'tools',
  'netlify',
];

const fouten = [];

if (!existsSync(UIT)) {
  console.error('POORT ROOD: publiek/ bestaat niet — draai eerst build-publiek. Fail closed.');
  process.exit(1);
}

// ── sabotage: leg een intern bestand in de publicatie ──
const saboteurPad = path.join(UIT, 'whitepapers', '_register.json');
if (saboteer) {
  writeFileSync(saboteurPad, '{"dit":"is interne registerkennis"}');
  console.log('SABOTAGE ACTIEF — _register.json in de publicatie gelegd. Verwacht: ROOD.\n');
}

try {
  // ── 1. loopt de hele publicatie langs op verboden inhoud ──
  let bestanden = 0;
  const loop = (dir, rel = '') => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { loop(path.join(dir, e.name), r); continue; }
      bestanden++;
      const naam = e.name.toLowerCase();
      const ext  = path.extname(naam);
      // path.extname('.env') geeft een lege string — daarom ook de naam zelf toetsen.
      if (VERBODEN_EXT.some(v => ext === v || naam === v || naam.startsWith(v + '.'))) {
        fouten.push(`verboden bestandstype in de publicatie: ${r}`);
      }
      if (VERBODEN_NAAM.includes(naam)) {
        fouten.push(`intern bestand in de publicatie: ${r}`);
      }
    }
  };
  loop(UIT);

  if (bestanden < 10) {
    console.error(`POORT ROOD: slechts ${bestanden} bestanden in de publicatie. Fail closed.`);
    if (saboteer && existsSync(saboteurPad)) unlinkSync(saboteurPad);
    process.exit(1);
  }

  // ── 2. moet bestaan ──
  for (const p of MOET_BESTAAN) {
    const vol = path.join(UIT, p);
    if (!existsSync(vol) || statSync(vol).size === 0) {
      fouten.push(`ontbreekt of is leeg in de publicatie: ${p}`);
    }
  }

  // ── 3. mag niet bestaan ──
  for (const p of MAG_NIET_BESTAAN) {
    if (existsSync(path.join(UIT, p))) {
      fouten.push(`hoort NIET publiek te zijn: ${p}`);
    }
  }

  // ── 4. tellen wat geteld wordt ──────────────────────────────────────────────
  // Op 2026-07-27 stond op de whitepaper-index "3 whitepapers" terwijl er vier waren:
  // de kaart en de ItemList waren bijgewerkt, de teller niet. Weer een met de hand
  // onderhouden kopie van iets dat te tellen valt. Deze poort telt het gewoon.
  const idx = readFileSync(path.join(UIT, 'whitepapers', 'index.html'), 'utf-8');
  const kaarten = (idx.match(/class="card"/g) || []).length;
  const geteld  = (idx.match(/<span>(\d+) whitepapers?<\/span>/) || [])[1];
  const papers  = readdirSync(path.join(UIT, 'whitepapers'))
    .filter(n => n.endsWith('.html') && n !== 'index.html').length;

  if (kaarten !== papers) {
    fouten.push(`whitepaper-index toont ${kaarten} kaart(en) terwijl er ${papers} paper-pagina's zijn gepubliceerd`);
  }
  if (geteld === undefined) {
    fouten.push('whitepaper-index heeft geen leesbare teller ("N whitepapers")');
  } else if (Number(geteld) !== papers) {
    fouten.push(`whitepaper-index zegt "${geteld} whitepapers" terwijl er ${papers} zijn`);
  }

  // ── 5. beloofde PDF's moeten bestaan ────────────────────────────────────────
  // De whitepaper-index belooft "de opgemaakte versie stuur ik je als PDF toe". Paper 04
  // ging op 2026-07-27 live ZONDER PDF en zonder downloadsectie: een bezoeker vond die
  // belofte daar niet terug. Stil, want niets controleerde het. Nu wel.
  for (const n of readdirSync(path.join(UIT, 'whitepapers')).filter(x => x.endsWith('.html') && x !== 'index.html')) {
    const paper = readFileSync(path.join(UIT, 'whitepapers', n), 'utf-8');
    if (!paper.includes('class="dl"')) {
      fouten.push(`${n} heeft geen downloadsectie terwijl de index een PDF belooft`);
      continue;
    }
    const pdf = path.join(UIT, 'whitepapers', 'bestand', n.replace(/\.html$/, '.pdf'));
    if (!existsSync(pdf) || statSync(pdf).size < 20000) {
      fouten.push(`${n} biedt een PDF aan die ontbreekt of verdacht klein is`);
    }
    // De slug in het aanvraagformulier bepaalt WELKE pdf de bezoeker krijgt. Op
    // 2026-07-27 stond in paper 04 de slug van paper 03, omdat de downloadsectie
    // letterlijk was overgenomen inclusief het script. Wie "Wie heeft de sleutels?"
    // aanvroeg, kreeg "De mens beslist" toegestuurd — het verkeerde antwoord met de
    // goede handtekening, precies wat dat paper beschrijft. Niets ving dat; Rob
    // ontdekte het doordat hij de mail opende.
    const eigen = n.replace(/\.html$/, '');
    const slug = (paper.match(/paper:\s*'([a-z0-9-]+)'/) || [])[1];
    if (slug !== eigen) {
      fouten.push(`${n} vraagt de PDF aan onder slug "${slug || '(geen)'}" — dat levert het verkeerde bestand`);
    }
  }

  // ── 6. geen persoonlijk adres in de functiebron ─────────────────────────────
  // De ontvanger van leads, contactaanvragen en storingsmeldingen stond als terugval
  // hardgecodeerd in vier functiebestanden, in een PUBLIEKE repo — en NOTIFY_EMAIL was
  // nooit gezet, dus die terugval wás de instelling. Nu een plek (lib/mail.js) met een
  // zakelijk adres. Deze poort voorkomt dat er weer een persoonlijk adres in sluipt.
  const fnDir = path.resolve(ROOT, 'netlify', 'functions');
  const scanFns = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { scanFns(p); continue; }
      if (!e.name.endsWith('.js')) continue;
      const src = readFileSync(p, 'utf-8');
      const treffer = src.match(/[a-z0-9._%+-]+@(gmail|hotmail|outlook|live|icloud|yahoo)\.[a-z.]+/i);
      if (treffer) fouten.push(`persoonlijk mailadres in de bron: netlify/functions/${e.name} bevat ${treffer[0]}`);
    }
  };
  scanFns(fnDir);

  // ── 7. entiteitsgraaf en llms.txt ───────────────────────────────────────────
  // Voor 2026-07-27 stonden er VIJF losse Person-objecten voor dezelfde persoon en NUL
  // @id-verwijzingen: voor een machine vijf mogelijke mensen. Deze poort bewaakt dat de
  // graaf overal staat en dat de JSON-LD geldig blijft — de eerste versie van
  // build-entiteiten brak een blok met een te gulzige regex, en dat mag niet live komen.
  if (!existsSync(path.join(UIT, 'llms.txt'))) {
    fouten.push('llms.txt ontbreekt in de publicatie');
  }
  const scanLd = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { scanLd(p); continue; }
      if (!e.name.endsWith('.html')) continue;
      const h = readFileSync(p, 'utf-8');
      const blokken = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      const rel = path.relative(UIT, p).split(path.sep).join('/');
      if (!blokken.length) { fouten.push(`${rel} heeft geen structured data`); continue; }
      for (const [i, b] of blokken.entries()) {
        try { JSON.parse(b[1]); }
        catch { fouten.push(`${rel}: JSON-LD-blok ${i + 1} is ongeldig`); }
      }
      if (!h.includes('"@graph"')) fouten.push(`${rel} mist de entiteitsgraaf`);
    }
  };
  scanLd(UIT);

  // ── 8. koppenstructuur ──────────────────────────────────────────────────────
  // De homepage had ZES h1-koppen (een sr-only plus vijf pane-titels) en de whitepapers
  // sprongen van h1 naar h3 naar h2. Een pagina heeft één hoofdkop, en niveaus slaan niet
  // over: dat is hoe een schermlezer en een crawler de structuur lezen.
  const scanKop = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { scanKop(p); continue; }
      if (!e.name.endsWith('.html')) continue;
      const h = readFileSync(p, 'utf-8');
      const rel = path.relative(UIT, p).split(path.sep).join('/');
      const h1 = (h.match(/<h1[\s>]/g) || []).length;
      if (h1 !== 1) fouten.push(`${rel} heeft ${h1} h1-kop(pen) — er hoort er precies één te zijn`);
      const niveaus = [...h.matchAll(/<h([1-4])[\s>]/g)].map(m => Number(m[1]));
      for (let i = 1; i < niveaus.length; i++) {
        if (niveaus[i] - niveaus[i - 1] > 1) {
          fouten.push(`${rel} slaat een kopniveau over: h${niveaus[i - 1]} direct gevolgd door h${niveaus[i]}`);
          break;
        }
      }
    }
  };
  scanKop(UIT);

  // ── 8b. dekt de sitemap precies de publicatie? ────────────────────────────────
  // De sitemap stond tot vandaag met de hand in de repo en miste al een bericht. Nu wordt
  // hij afgeleid — en deze poort bewaakt dat de afleiding klopt. Beide richtingen: een
  // pagina die ontbreekt wordt niet gevonden, een URL die niet bestaat is een 404 in de
  // sitemap en dat kost vertrouwen bij precies de partij die je wilt overtuigen.
  const smPad = path.join(UIT, 'sitemap.xml');
  if (existsSync(smPad)) {
    const inSitemap = new Set([...readFileSync(smPad, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map(m => m[1].replace('https://rob-concepting.com', '')));
    const opSchijf = new Set();
    const wandel = (map, pre) => {
      for (const naam of readdirSync(map)) {
        const vol = path.join(map, naam);
        if (statSync(vol).isDirectory()) { wandel(vol, `${pre}${naam}/`); continue; }
        if (naam.endsWith('.html')) opSchijf.add(naam === 'index.html' ? pre : `${pre}${naam}`);
      }
    };
    wandel(UIT, '/');
    for (const u of opSchijf) if (!inSitemap.has(u)) fouten.push(`sitemap: ${u} is gepubliceerd maar staat er niet in`);
    for (const u of inSitemap) if (!opSchijf.has(u)) fouten.push(`sitemap: ${u} staat erin maar bestaat niet`);
  } else {
    fouten.push('sitemap.xml ontbreekt in de publicatie');
  }

  // ── 9. het bewijs-endpoint ──────────────────────────────────────────────────
  // /bewijs.json geeft het gedateerde bewijs machineleesbaar uit. Het mag GEEN
  // registerkennis dragen: reviewtoestand, ringstatus, publicatiestatus. Precies die velden
  // lekten tot 2026-07-26 mee in _doors.json.
  //
  // Op SLEUTELS toetsen, niet op tekst. Een tekstscan op "ring" sloeg vandaag aan op het
  // woord "bewering" — de derde valse melding van dat soort in een dag. Een structuur toets
  // je structureel.
  const bewijsPad = path.join(UIT, 'bewijs.json');
  if (!existsSync(bewijsPad)) {
    fouten.push('bewijs.json ontbreekt in de publicatie');
  } else {
    const VERBODEN_SLEUTEL = new Set(['ring', 'review_status', 'publication_status',
      'copy_review_status', 'quality_signals', 'source_ref', 'verdict', 'mode',
      'wachtend_op_reviewpoort']);
    try {
      const bewijs = JSON.parse(readFileSync(bewijsPad, 'utf-8'));
      const zoek = (n) => {
        if (Array.isArray(n)) { n.forEach(zoek); return; }
        if (!n || typeof n !== 'object') return;
        for (const [k, v] of Object.entries(n)) {
          if (VERBODEN_SLEUTEL.has(k)) fouten.push(`bewijs.json draagt interne sleutel "${k}"`);
          zoek(v);
        }
      };
      zoek(bewijs);
      if (!Array.isArray(bewijs.beweringen) || bewijs.beweringen.length < 10) {
        fouten.push('bewijs.json draagt te weinig beweringen om een bewijsbestand te zijn');
      }
      for (const b of bewijs.beweringen || []) {
        if (!b.vastgesteld?.datum || !b.vastgesteld?.precisie || !b.vastgesteld?.soort) {
          fouten.push(`bewijs.json: ${b.id || '(zonder id)'} mist datum, precisie of soort`);
          break;
        }
      }
    } catch (e) {
      fouten.push(`bewijs.json is geen geldige JSON (${e.message})`);
    }
  }

  // ── 10. nesting ────────────────────────────────────────────────────────────
  // Zie tools/lib/nesting.mjs voor waarom dit een scanner is en geen telling.
  const scanVorm = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { scanVorm(p); continue; }
      if (!e.name.endsWith('.html')) continue;
      const r = path.relative(UIT, p).split(path.sep).join('/');
      for (const fout of nestingFouten(readFileSync(p, 'utf-8'))) {
        fouten.push(`${r}: ${fout}`);
      }
    }
  };
  scanVorm(UIT);
} catch (e) {
  console.error('POORT ROOD: publicatie kon niet gelezen worden —', e.message, '(fail closed)');
  if (saboteer && existsSync(saboteurPad)) unlinkSync(saboteurPad);
  process.exit(1);
}

if (saboteer && existsSync(saboteurPad)) unlinkSync(saboteurPad);

if (fouten.length) {
  console.error(`POORT ROOD — ${fouten.length} bevinding(en):`);
  for (const f of fouten) console.error('  · ' + f);
  process.exit(saboteer ? 0 : 1);   // bij sabotage IS rood het gewenste resultaat
}

if (saboteer) {
  console.error('SABOTAGE MISLUKT: de poort bleef groen terwijl hij rood had moeten worden.');
  process.exit(1);
}
console.log('publiek groen — alle verwachte pagina\'s aanwezig, geen interne bestanden, geen verboden types.');
