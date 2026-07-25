// R.O.B. Concepting — sync: agora-rob-register -> lokale projectie
//
// Volgt D-SUPABASE-002 uit het Agora-register: DB = bron, projectie = afgeleide.
// Leest UITSLUITEND claims_public (approved + ring open/showcase) met de publishable
// key. Geen service-role, geen secrets in de repo.
//
// Fallback-gedrag (bewust): faalt de fetch, dan blijft de bestaande projectie staan en
// eindigt het script met code 0. Een storing bij Supabase mag een no-tracking-site niet
// beletten te deployen. Ontbreekt de projectie helemaal, dan faalt het wel — dan is er
// niets om op terug te vallen.
//
// Env: AGORA_URL + AGORA_KEY. Draai: node tools/sync-register.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT  = path.join(ROOT, 'whitepapers', '_register.json');

const url = process.env.AGORA_URL;
const key = process.env.AGORA_KEY;

function bestaandeProjectie() {
  if (!existsSync(OUT)) return null;
  try { return JSON.parse(readFileSync(OUT, 'utf8')); } catch { return null; }
}

function terugvallen(reden) {
  const oud = bestaandeProjectie();
  if (!oud) {
    console.error(`sync-register: ${reden} EN er is geen bestaande projectie om op terug te vallen.`);
    process.exit(1);
  }
  console.warn(`sync-register: ${reden} — bestaande projectie behouden (${oud.claims?.length ?? 0} claims, gesynct ${oud.synced_at}).`);
  process.exit(0);
}

if (!url || !key) terugvallen('AGORA_URL of AGORA_KEY ontbreekt');

let rijen;
try {
  const res = await fetch(`${url}/rest/v1/claims_public?select=ext_ref,text,ring,dated&order=ext_ref`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!res.ok) terugvallen(`Supabase gaf ${res.status}`);
  rijen = await res.json();
} catch (e) {
  terugvallen(`fetch mislukte (${e.message})`);
}

// Alleen de whitepaper-laag; de Agora-eigen claims horen niet op deze site.
const wp = rijen.filter(r => (r.ext_ref || '').startsWith('claim:wp:'));

if (!wp.length) terugvallen('claims_public leverde geen enkele claim:wp:-claim');

const projectie = {
  bron: 'agora-rob-register / claims_public',
  synced_at: new Date().toISOString(),
  toelichting: 'Afgeleide projectie. Bewerk de DB, niet dit bestand.',
  claims: wp.map(r => ({ ext_ref: r.ext_ref, text: r.text, dated: r.dated, ring: r.ring }))
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(projectie, null, 2) + '\n');
console.log(`sync-register: ${wp.length} whitepaper-claims uit claims_public geprojecteerd naar whitepapers/_register.json`);
