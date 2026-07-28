// R.O.B. Concepting — /bewijs.json: het gedateerde bewijs, machineleesbaar.
//
// WAAROM DIT BESTAAT. De site draagt 34 gedateerde beweringen met bron, en die zijn nu alleen
// als HTML te lezen. Een antwoordmachine die wil citeren, moet dan de pagina parseren en
// hopen dat hij de datum bij de juiste bewering vindt. Dit bestand geeft hetzelfde bewijs in
// één keer, expliciet, met per bewering de datum, de precisie, de soort datum, de bron en
// waar het op de site wordt gebruikt.
//
// Dat is de omkering uit het amendement bij paper 04, toegepast op de site zelf: niet
// optimaliseren voor citatie, maar het bewijs zo aanbieden dat citeren makkelijk en
// controleerbaar is.
//
// WAT ER WEL EN NIET IN GAAT — en dat is een besluit, geen bijvangst.
//
//   WEL: een stabiel id per bewering. Een citeerbaar bestand zonder verwijssleutel is half
//        werk: je kunt dan niet naar één bewering verwijzen. Dat id is geen geheim.
//   NIET: ringstatus, reviewtoestand, publication_status, wachtend_op_reviewpoort, de
//        interne bronomschrijving. Dat is registerkennis en geen uitgifte. Precies die
//        velden lekten tot 2026-07-26 mee in _doors.json, en dat was de reden om de
//        publicatie om te bouwen.
//
// Draai: node tools/build-bewijs.mjs   (na build-publiek, want het schrijft in de publicatie)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { datum, datumLabel } from './lib/datum.mjs';
import { status, soortLabel } from './lib/status.mjs';
import { BASIS } from './lib/entiteiten.mjs';

const ROOT  = path.resolve(import.meta.dirname, '..');
const DOORS = path.join(ROOT, 'whitepapers', '_doors.json');
const BER   = path.join(ROOT, 'nieuws', '_berichten.json');
const PROJ  = path.join(ROOT, 'whitepapers', '_register.json');
const UIT   = path.join(ROOT, 'publiek', 'bewijs.json');

if (!existsSync(DOORS)) { console.error('build-bewijs: _doors.json ontbreekt.'); process.exit(1); }
if (!existsSync(PROJ))  { console.error('build-bewijs: _register.json ontbreekt.'); process.exit(1); }
if (!existsSync(path.dirname(UIT))) { console.error('build-bewijs: publiek/ ontbreekt — draai eerst build-publiek.'); process.exit(1); }

const claims = new Map(JSON.parse(readFileSync(PROJ, 'utf8')).claims.map(c => [c.ext_ref, c]));
const vragen = JSON.parse(readFileSync(DOORS, 'utf8')).doors
  .filter(d => d.publication_status === 'publishable' && d.mode === 'public');
const berichten = existsSync(BER) ? (JSON.parse(readFileSync(BER, 'utf8')).berichten || []) : [];

// Waar wordt elke bewering gebruikt? Dat is de omgekeerde blik: niet "welk bewijs hoort bij
// deze pagina" maar "welke pagina's rusten op deze bewering". Precies de vraag die je moet
// kunnen stellen als een bron verandert.
const gebruik = new Map();
const noteer = (ref, url) => {
  if (!gebruik.has(ref)) gebruik.set(ref, new Set());
  gebruik.get(ref).add(url);
};
for (const v of vragen) for (const b of v.bewijs) noteer(b.ext_ref, `${BASIS}/vragen/#${v.id.split(':').pop()}`);
for (const b of berichten) {
  for (const r of (b.claim_refs || '').split(',').map(s => s.trim()).filter(Boolean)) {
    noteer(r, `${BASIS}/nieuws/${b.slug}/`);
  }
}

const beweringen = [...gebruik.keys()].sort().map(ref => {
  const c = claims.get(ref);
  if (!c) return null;
  return {
    id: ref,
    bewering: c.text,
    vastgesteld: {
      datum: c.dated,
      precisie: c.dated_precisie,          // dag | maand | jaar
      soort: c.dated_soort,                // brondatum | registratiedatum
      weergave: datumLabel(c.dated, c.dated_precisie, c.dated_soort),
    },
    soort: c.soort || null,
    stand: (() => { const s = status(c); return s ? { status: s.woord, waarom: s.uitleg } : null; })(),
    nagetrokken_op: c.nagetrokken_op || null,
    bron: { naam: c.bron_naam || null, url: c.bron_url || null },
    gebruikt_in: [...gebruik.get(ref)].sort(),
  };
}).filter(Boolean);

const uitgifte = {
  wat_dit_is:
    'Het gedateerde bewijs onder de publieke uitspraken op rob-concepting.com. Elke bewering '
    + 'staat hier met de datum waarop zij is vastgesteld, de precisie van die datum, wat de datum '
    + 'betekent, de bron en de pagina\'s die erop rusten.',
  hoe_te_citeren:
    'Citeer de bewering met haar datum en haar bron. De datum hoort erbij: een cijfer zonder datum '
    + 'is een bewering zonder houdbaarheid. Waar de precisie "maand" of "jaar" is, is de dag niet '
    + 'vastgesteld en hoort er geen dagdatum bij te worden gesuggereerd. Waar de soort '
    + '"registratiedatum" is, is dat het moment waarop het register de bron zag, niet het moment '
    + 'waarop het bewijs is vastgesteld.',
  wat_hier_niet_in_staat:
    'Interne registerkennis: reviewtoestand, ringstatus, publicatiestatus en de interne '
    + 'bronaantekeningen. Die zijn beheer, geen uitgifte. Wat hier staat, is wat is vrijgegeven.',
  velden: {
    'vastgesteld.precisie': 'dag | maand | jaar — hoe nauwkeurig de datum bekend is',
    'vastgesteld.soort': 'brondatum (wanneer het bewijs is vastgesteld) | registratiedatum (wanneer het register de bron zag)',
    'bron.url': 'null wanneer de bron een boek of niet-online werk is; de naam blijft dan wel herleidbaar',
    'gebruikt_in': 'de pagina\'s die op deze bewering rusten',
  },
  gebouwd_op: new Date().toISOString(),
  aantallen: {
    beweringen: beweringen.length,
    met_bronlink: beweringen.filter(b => b.bron.url).length,
    dagprecies: beweringen.filter(b => b.vastgesteld.precisie === 'dag').length,
    maandprecies: beweringen.filter(b => b.vastgesteld.precisie === 'maand').length,
    jaarprecies: beweringen.filter(b => b.vastgesteld.precisie === 'jaar').length,
  },
  beweringen,
  vragen: vragen.map(v => ({
    url: `${BASIS}/vragen/#${v.id.split(':').pop()}`,
    vraag: v.question,
    antwoord: v.antwoord,
    rust_op: v.bewijs.map(b => b.ext_ref),
    uitgewerkt_in: (v.verder || []).map(([titel, pad]) => ({ titel, url: `${BASIS}${pad}` })),
  })),
  berichten: berichten.map(b => ({
    url: `${BASIS}/nieuws/${b.slug}/`,
    titel: b.titel,
    samenvatting: b.samenvatting,
    gepubliceerd_op: b.gepubliceerd_op,
    rust_op: (b.claim_refs || '').split(',').map(s => s.trim()).filter(Boolean),
  })),
};

// Fail closed: een bewijsbestand zonder bewijs is misleidend.
if (beweringen.length < 10) {
  console.error(`build-bewijs: slechts ${beweringen.length} bewering(en). Fail closed.`);
  process.exit(1);
}

writeFileSync(UIT, JSON.stringify(uitgifte, null, 2) + '\n');
const a = uitgifte.aantallen;
console.log(`build-bewijs: ${a.beweringen} beweringen (${a.met_bronlink} met bronlink; `
  + `${a.dagprecies} dag / ${a.maandprecies} maand / ${a.jaarprecies} jaar) naar publiek/bewijs.json`);
