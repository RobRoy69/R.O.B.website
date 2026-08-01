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
  'kennisgezagsscan/index.html',
  'kennisgezagsscan/app.js',
  'kennisgezagsscan/scan-model.js',
  'kennisgezagsscan/vragen.json',
  'kennisproef/index.html',
  'kennisproef/app.js',
  'kennisproef/style.css',
  'demo/core/engine.css',
  'demo/core/engine.js',
  'demo/max/index.html',
  'demo/max/config/brand.json',
  'demo/max/config/walkthrough.json',
  'demo/max/data/demo-case.json',
  'media/merk.css',
  'media/homepage-merk.css',
  'media/logo/logo-rob-donker-transparant.png',
  'media/logo/logo-rob-lengte-donker-transparant.png',
  'media/logo/logo-rob-lengte-wit-transparant.png',
  'media/logo/logo-rob-wit-transparant.png',
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

  // ── 4b. "deze N stukken" en de plaats in de reeks ───────────────────────────
  // Onder de kaarten stond "Deze drie stukken vormen één betoog" terwijl er vier waren, met
  // een boog die er maar drie beschreef. En twee kaarten droegen nog "13 pagina's" en
  // "10 pagina's" waar de andere twee al "Eerste/Vierde in de reeks" zeiden — een
  // paginatelling die niemand kan narekenen en die bij elke tekstwijziging verschuift.
  //
  // Zelfde ziekte als de teller hierboven: een getal in proza dat ook te tellen valt. Nu
  // wordt het geteld. En de plaats in de reeks moet bij het kaartnummer horen, want een
  // kaart die "02" zegt en "Derde in de reeks" is erger dan geen aanduiding.
  // Twee lijsten, want "deze vier stukken" is een hoofdtelwoord en "Vierde in de reeks" een
  // rangtelwoord. Eerste versie vergeleek "vier" met de rangtelwoorden en meldde daardoor
  // "zegt vier stukken terwijl er 4 zijn" — een poort die rood ging op zijn eigen grammatica.
  const RANG   = ['', 'Eerste', 'Tweede', 'Derde', 'Vierde', 'Vijfde', 'Zesde', 'Zevende',
                  'Achtste', 'Negende', 'Tiende'];
  const AANTAL = ['', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven',
                  'acht', 'negen', 'tien'];
  const inProza = idx.match(/Deze (\w+) stukken/);
  if (!inProza) {
    fouten.push('whitepaper-index mist de regel "Deze N stukken" onder de kaarten');
  } else if (AANTAL.indexOf(inProza[1].toLowerCase()) !== papers) {
    fouten.push(`whitepaper-index zegt "Deze ${inProza[1]} stukken" terwijl er ${papers} zijn`);
  }

  // Per kaart: het nummer bovenaan en de plaats in de reeks onderaan moeten kloppen.
  for (const kaart of idx.match(/<a class="card"[\s\S]*?<\/a>/g) || []) {
    const nr = (kaart.match(/<span>(\d{2})<\/span>/) || [])[1];
    const rang = (kaart.match(/<span>(\w+) in de reeks<\/span>/) || [])[1];
    const titel = (kaart.match(/<h2>([^<]*)<\/h2>/) || [, '?'])[1];
    if (!nr) { fouten.push(`whitepaper-kaart "${titel}" heeft geen volgnummer`); continue; }
    if (!rang) {
      fouten.push(`whitepaper-kaart "${titel}" zegt niet de hoeveelste in de reeks hij is`);
    } else if (RANG[Number(nr)] !== rang) {
      fouten.push(`whitepaper-kaart ${nr} ("${titel}") zegt "${rang} in de reeks" — dat hoort "${RANG[Number(nr)]}" te zijn`);
    }
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
  //
  // OOK DE DOCUMENTATIE, sinds 2026-07-28. De poort keek alleen naar .js in
  // netlify/functions/. De README stond ondertussen in dezelfde publieke repo met het
  // privéadres als "default" van NOTIFY_EMAIL — een regel die niemand meer las omdat de code
  // al gerepareerd was. Een lek in een leesbaar bestand is geen kleiner lek.
  const PERSOONLIJK = /[a-z0-9._%+-]+@(gmail|hotmail|outlook|live|icloud|yahoo)\.[a-z.]+/i;
  const scan = (dir, mag) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { scan(p, mag); continue; }
      if (!mag(e.name)) continue;
      const treffer = readFileSync(p, 'utf-8').match(PERSOONLIJK);
      if (treffer) {
        fouten.push(`persoonlijk mailadres in de repo: ${path.relative(ROOT, p).split(path.sep).join('/')} bevat ${treffer[0]}`);
      }
    }
  };
  scan(path.resolve(ROOT, 'netlify', 'functions'), (n) => n.endsWith('.js'));
  scan(ROOT, (n) => n.endsWith('.md') || n === 'netlify.toml' || n === 'package.json');

  // ── 6b. beschrijft de README de repo die er werkelijk staat? ────────────────
  // De README beschreef tot 2026-07-28 de repo van vóór /vragen/, /nieuws/, /bewijs/ en
  // tools/ — zes mappen die er wel waren maar nergens genoemd werden. Geen lek, wel
  // misleidend voor wie er als eerste in kijkt. En het is exact hetzelfde patroon als de
  // andere zes: een met de hand onderhouden beschrijving van iets dat te bekijken valt.
  //
  // ALLEEN ÉÉN RICHTING: bestaat het, dan moet het genoemd worden. De andere kant — staat
  // er iets in de README dat niet bestaat — vraagt om het parseren van proza, en een poort
  // die op tekstherkenning leunt is precies wat deze week zes valse meldingen opleverde.
  const readmePad = path.join(ROOT, 'README.md');
  if (existsSync(readmePad)) {
    const readme = readFileSync(readmePad, 'utf-8');
    // Wat niet in de repo hoort of puur gereedschap is, hoeft niet beschreven te worden.
    const NEGEER = new Set(['node_modules', 'publiek', 'package-lock.json', '.gitignore',
                            '.netlify', '.cache', 'README.md']);
    for (const e of readdirSync(ROOT, { withFileTypes: true })) {
      if (e.name.startsWith('.') || NEGEER.has(e.name)) continue;
      // Op naam toetsen mét grens, zodat "werk" niet aanslaat op "netwerk".
      const grens = new RegExp(`(^|[^a-z0-9._/-])${e.name.replace(/[.]/g, '\.')}([^a-z0-9._-]|$)`, 'im');
      if (!grens.test(readme)) {
        fouten.push(`README beschrijft ${e.name}${e.isDirectory() ? '/' : ''} niet, terwijl het in de repo staat`);
      }
    }
  } else {
    fouten.push('README.md ontbreekt');
  }

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
        if (naam.endsWith('.html')) {
          // Een pagina die zichzelf op noindex zet, hoort juist NIET in de sitemap. Dat is
          // geen uitzondering op deze poort maar de andere kant ervan: de poort eist dat
          // publicatie en sitemap elkaar dekken, en noindex zegt "dit is geen publicatie om
          // te vinden". Afgeleid uit de pagina zelf, zodat er geen tweede lijst ontstaat.
          if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(readFileSync(vol, 'utf8'))) continue;
          const raw = naam === 'index.html' ? pre : `${pre}${naam}`;
          opSchijf.add(raw.startsWith('/whitepapers/') ? raw.replace(/\.html$/, '') : raw);
        }
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
