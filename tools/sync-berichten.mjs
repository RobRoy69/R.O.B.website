// R.O.B. Concepting — haalt de goedgekeurde berichten uit het register.
//
// Zelfde vorm als sync-register: leest UITSLUITEND de publieke leesview (berichten_public,
// alleen review_status = approved) met de anon-key, en valt bij storing terug op de
// meegecommitte projectie zodat een Supabase-storing geen deploy blokkeert.
//
// Draai: node tools/sync-berichten.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT  = path.join(ROOT, 'nieuws', '_berichten.json');

const url = process.env.AGORA_URL;
const key = process.env.AGORA_KEY;

function terugvallen(reden) {
  if (!existsSync(OUT)) {
    // Geen projectie en geen verbinding: dan is er niets om te publiceren. Dat is geen
    // fout — een site zonder berichten is een geldige toestand — maar wel te melden.
    mkdirSync(path.dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify({ bron: 'geen', synced_at: null, berichten: [] }, null, 2) + '\n');
    console.warn(`sync-berichten: ${reden} — geen bestaande projectie, lege lijst geschreven.`);
    process.exit(0);
  }
  const oud = JSON.parse(readFileSync(OUT, 'utf8'));
  console.warn(`sync-berichten: ${reden} — bestaande projectie behouden (${oud.berichten?.length ?? 0} berichten).`);
  process.exit(0);
}

if (!url || !key) terugvallen('AGORA_URL of AGORA_KEY ontbreekt');

let rijen;
try {
  const res = await fetch(`${url}/rest/v1/berichten_public?select=ext_ref,slug,titel,samenvatting,tekst,claim_refs,gepubliceerd_op,updated_at&order=gepubliceerd_op.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!res.ok) terugvallen(`Supabase gaf ${res.status}`);
  rijen = await res.json();
} catch (e) {
  terugvallen(`fetch mislukte (${e.message})`);
}

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({
  bron: 'agora-rob-register / berichten_public',
  synced_at: new Date().toISOString(),
  toelichting: 'Afgeleide projectie. Bewerk de DB, niet dit bestand.',
  berichten: rijen,
}, null, 2) + '\n');

console.log(`sync-berichten: ${rijen.length} goedgekeurd bericht(en) uit berichten_public`);
