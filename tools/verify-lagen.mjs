// R.O.B. Concepting — poort op de laag-dekking van de projectie.
//
// Aanleiding (2026-07-26): sync-register filterde op alleen 'claim:wp:'. Toen de
// propositie-laag erbij kwam, kwamen die claims nooit in de projectie — en de deuren
// meldden dat als "wachtend op reviewpoort" terwijl ze al goedgekeurd waren. Een
// VERKEERDE DIAGNOSE: de melding wees naar Rob's poort terwijl de fout in de sync zat.
// Erger dan een gemiste claim, want het stuurt de mens de verkeerde kant op.
//
// Deze poort toetst wat geen enkele andere toetste: komt elke laag die het register
// publiek levert ook daadwerkelijk in de projectie terecht, of valt er stil iets weg?
//
// FAIL CLOSED: is het register onbereikbaar, dan slaat de poort over (exit 0) — de
// sync heeft dan al teruggevallen en de bestaande projectie is nog geldig. Kan de
// projectie niet gelezen worden, dan is dat wél rood.
//
// Sabotage-test: node tools/verify-lagen.mjs --saboteer
// Exit 0 = groen, exit 1 = rood.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROJ = path.join(ROOT, 'whitepapers', '_register.json');
const saboteer = process.argv.includes('--saboteer');

// Lagen die op DIT oppervlak horen. Moet gelijk zijn aan LAGEN in sync-register.mjs.
const VERWACHT = ['claim:wp:', 'claim:prop:'];
// Lagen die hier bewust NIET horen — verschijnen ze wel, dan is dat ook fout.
const VERBODEN = ['claim:agora:', 'claim:amend:'];

if (!existsSync(PROJ)) {
  console.error('POORT ROOD: whitepapers/_register.json ontbreekt.');
  process.exit(1);
}

let proj;
try {
  proj = JSON.parse(readFileSync(PROJ, 'utf8'));
} catch (e) {
  console.error('POORT ROOD: projectie onleesbaar —', e.message);
  process.exit(1);
}

let inProjectie = (proj.claims || []).map(c => c.ext_ref);
if (saboteer) {
  inProjectie = inProjectie.filter(r => !r.startsWith('claim:prop:'));
  console.log('SABOTAGE ACTIEF — propositie-laag uit de projectie verwijderd. Verwacht: ROOD.\n');
}

// ── register bevragen: welke lagen levert het publiek? ──
const url = process.env.AGORA_URL, key = process.env.AGORA_KEY;
if (!url || !key) {
  console.log('verify-lagen: geen AGORA_URL/AGORA_KEY — overgeslagen (sync viel al terug op de bestaande projectie).');
  process.exit(0);
}

let uitRegister;
try {
  const res = await fetch(`${url}/rest/v1/claims_public?select=ext_ref`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!res.ok) {
    console.log(`verify-lagen: register gaf ${res.status} — overgeslagen (projectie blijft geldig).`);
    process.exit(0);
  }
  uitRegister = (await res.json()).map(r => r.ext_ref);
} catch (e) {
  console.log(`verify-lagen: register onbereikbaar (${e.message}) — overgeslagen.`);
  process.exit(0);
}

const fouten = [];
const tel = (lijst, prefix) => lijst.filter(r => (r || '').startsWith(prefix)).length;

// ── 1. elke verwachte laag: leverbaar in het register én aanwezig in de projectie ──
for (const laag of VERWACHT) {
  const reg = tel(uitRegister, laag);
  const prj = tel(inProjectie, laag);
  if (reg === 0) {
    console.log(`  · ${laag} — 0 leverbaar in het register (niets goedgekeurd); niets te projecteren.`);
    continue;
  }
  if (prj === 0) {
    fouten.push(`${laag} — ${reg} claims leverbaar in het register, maar 0 in de projectie. De sync laat deze laag vallen; een deur die hierop leunt meldt straks onterecht "wachtend op review".`);
  } else if (prj !== reg) {
    fouten.push(`${laag} — register levert ${reg}, projectie heeft ${prj}. Er valt stil iets weg.`);
  } else {
    console.log(`  ✓ ${laag} — ${reg} leverbaar, ${prj} geprojecteerd`);
  }
}

// ── 2. geen laag die hier niet hoort ──
for (const laag of VERBODEN) {
  const prj = tel(inProjectie, laag);
  if (prj > 0) fouten.push(`${laag} — ${prj} claims in de projectie, maar deze laag hoort niet op dit oppervlak`);
}

// ── uitkomst ──
// LET OP: hier géén process.exit(). Na een fetch crasht dat op Windows met een
// libuv-assertie (UV_HANDLE_CLOSING) en levert exit 127 in plaats van de bedoelde
// code — waardoor de sabotage-test onbetrouwbaar wordt. exitCode zetten en het proces
// natuurlijk laten eindigen doet hetzelfde zonder die race.
if (fouten.length) {
  console.error(`\nPOORT ROOD — ${fouten.length} bevinding(en):`);
  for (const f of fouten) console.error('  · ' + f);
  process.exitCode = saboteer ? 0 : 1;
} else if (saboteer) {
  console.error('SABOTAGE MISLUKT: de poort bleef groen terwijl hij rood had moeten worden.');
  process.exitCode = 1;
} else {
  console.log('lagen groen — elke leverbare laag komt volledig in de projectie, geen vreemde lagen.');
}
