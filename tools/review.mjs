// R.O.B. Concepting — reviewveld: de wachtende beweringen beoordelen.
//
// AANLEIDING. Het register kende tot 2026-07-27 geen enkele beoordeling in gebruik: 71 van
// 71 claims stonden op approved, steevast goedgekeurd door de assistent in dezelfde
// beweging als het invoeren. De derive-regel zegt "niets is direct waarheid", maar de poort
// had nog nooit iets tegengehouden. Nu wachten er dertien, en dit is het gereedschap om ze
// te beoordelen.
//
// WAAROM EEN CLI EN GEEN WEBPAGINA. Goedkeuren vraagt schrijfrecht, en dat vraagt de
// service-role-sleutel. Die hoort niet in een browser, niet in een repo en niet in een
// publieke pagina. Hier komt hij uit de omgeving van je eigen machine en verlaat hij die
// niet.
//
// ELK BESLUIT WORDT GELOGD. Een goedkeuring zonder spoor is precies wat dit systeem
// afwijst, dus schrijft elke beslissing een regel in transformations (append-only, C1):
// van welke status naar welke, door wie, waarom. Bij afwijzen is een reden VERPLICHT en
// getypeerd (reden_categorie, migratie 0006) — patronen zijn niet te tellen over proza.
//
// Draai:  npm run review
// Nodig:  SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in je omgeving.

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('\nreview: SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY moeten in je omgeving staan.\n');
  console.error('  PowerShell:  $env:SUPABASE_URL="https://dgrrwlamisfgtlwuhpqu.supabase.co"');
  console.error('               $env:SUPABASE_SERVICE_ROLE_KEY="<sleutel uit Supabase>"\n');
  console.error('De sleutel staat in Supabase onder Project Settings > API Keys.');
  console.error('Plak hem NIET in een bestand of in de chat — alleen in je eigen omgeving.\n');
  process.exit(1);
}

const REDENEN = ['bron-onbetrouwbaar', 'bron-verlopen', 'onvoldoende-bewijs', 'buiten-scope',
                 'al-gedekt', 'oneens-met-oordeel', 'regel-te-grof', 'anders'];

const api = async (pad, opties = {}) => {
  const res = await fetch(`${url}/rest/v1/${pad}`, {
    ...opties,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
               Prefer: 'return=representation', ...(opties.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
};

const wachtend = await api('claims?select=id,ext_ref,text,source_ref,dated,dated_precisie,dated_soort,ring&review_status=eq.needs-review&order=ext_ref');

if (!wachtend.length) {
  console.log('\nGeen wachtende beweringen. Het register is bij.\n');
  process.exit(0);
}

// Bronomschrijvingen erbij, zodat je niet op een ref hoeft te beoordelen.
const refs = [...new Set(wachtend.map(c => (c.source_ref || '').split(',')[0]).filter(Boolean))];
const bronnen = new Map();
if (refs.length) {
  const lijst = await api(`sources?select=ref,description,dated&ref=in.(${refs.map(r => `"${r}"`).join(',')})`);
  for (const b of lijst) bronnen.set(b.ref, b);
}

const rl = createInterface({ input: stdin, output: stdout });
const streep = '─'.repeat(78);

console.log(`\n${streep}\nREVIEWVELD — ${wachtend.length} bewering(en) wachten op je oordeel`);
console.log(`${streep}`);
console.log('  j = goedkeuren   n = afwijzen   o = overslaan   s = stoppen\n');

let goed = 0, af = 0, over = 0;

for (const [i, c] of wachtend.entries()) {
  const bron = bronnen.get((c.source_ref || '').split(',')[0]);
  console.log(`${streep}\n[${i + 1}/${wachtend.length}]  ${c.ext_ref}`);
  console.log(`\n  ${c.text}\n`);
  console.log(`  bron    : ${bron ? bron.description.slice(0, 150) : c.source_ref || '(geen)'}`);
  console.log(`  datum   : ${c.dated} (${c.dated_precisie}precisie, ${c.dated_soort})`);
  console.log(`  ring    : ${c.ring}\n`);

  let keuze = '';
  while (!['j', 'n', 'o', 's'].includes(keuze)) {
    keuze = (await rl.question('  j/n/o/s > ')).trim().toLowerCase();
  }

  if (keuze === 's') { console.log('\nGestopt. De rest blijft wachten.\n'); break; }
  if (keuze === 'o') { over++; console.log('  → overgeslagen\n'); continue; }

  let reden = null, notitie = '';
  if (keuze === 'n') {
    // Reden is VERPLICHT bij afwijzen, en getypeerd. Zonder categorie is een afwijzing
    // niet te tellen en leer je niets van het patroon.
    console.log('\n  Waarom niet? ' + REDENEN.map((r, n) => `${n + 1}=${r}`).join('  '));
    while (!reden) {
      const a = (await rl.question('  reden 1-8 > ')).trim();
      reden = REDENEN[parseInt(a, 10) - 1] || null;
    }
    notitie = (await rl.question('  toelichting (optioneel) > ')).trim();
  } else {
    notitie = (await rl.question('  toelichting (optioneel) > ')).trim();
  }

  const nieuw = keuze === 'j' ? 'approved' : 'rejected';
  await api(`claims?id=eq.${c.id}`, { method: 'PATCH', body: JSON.stringify({ review_status: nieuw }) });
  await api('transformations', { method: 'POST', body: JSON.stringify({
    claim_id: c.id, from_status: 'needs-review', to_status: nieuw,
    kind: 'review', actor: 'human:rob',
    reden: reden, note: notitie || null,
  })});

  if (keuze === 'j') { goed++; console.log('  → goedgekeurd en gelogd\n'); }
  else { af++; console.log(`  → afgewezen (${reden}) en gelogd\n`); }
}

rl.close();

const rest = await api('claims?select=id&review_status=eq.needs-review');
console.log(`${streep}`);
console.log(`  goedgekeurd: ${goed}   afgewezen: ${af}   overgeslagen: ${over}`);
console.log(`  nog wachtend: ${rest.length}`);
console.log(`${streep}`);
if (goed) console.log('\nDraai `npm run build` of push, zodat de site de nieuwe stand oppikt.\n');
