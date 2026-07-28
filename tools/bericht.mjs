// R.O.B. Concepting — schrijf een bericht, zet het in het register.
//
// Je schrijft in nieuws/concept/<slug>.md, dit script zet het in het register als
// needs-review. Daarna keur je het goed (npm run review) en publiceert de volgende build
// het. Drie stappen, elk met een eigen verantwoordelijkheid:
//
//   schrijven (jij, in een bestand)  ->  registreren (dit script)  ->  goedkeuren (jij)
//
// WAAROM NIET IN DE BROWSER. Schrijven naar het register vraagt de service-role-sleutel;
// die hoort niet in een pagina. En de preview-omgeving bleek op 2026-07-27 klikken te
// registreren die niemand gaf — een schrijfoppervlak dat dat doet, is het laatste wat je
// bij een reviewpoort wilt.
//
// WAAROM EEN BESTAND EN NIET EEN CLI-PROMPT. Je schrijft geen alinea's in een terminal.
// Het conceptbestand is je werkkopie; het register is de bron voor publicatie. Bewerk je
// het bestand opnieuw en draai je dit script, dan wordt het bericht bijgewerkt — zolang
// het nog niet is goedgekeurd.
//
// Draai: npm run bericht
// Nodig: SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in je omgeving.

import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT    = path.resolve(import.meta.dirname, '..');
const CONCEPT = path.join(ROOT, 'nieuws', 'concept');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!existsSync(CONCEPT)) {
  mkdirSync(CONCEPT, { recursive: true });
  writeFileSync(path.join(CONCEPT, 'voorbeeld.md.txt'),
`titel: Zo ziet een bericht eruit
samenvatting: Eén of twee zinnen die op de overzichtspagina en in de deel-knoppen komen.
claims: claim:wp:051, claim:wp:053
datum: 2026-07-27
---
Hier begint de tekst. Een lege regel maakt een nieuwe alinea.

De regels boven de streep zijn de kop. 'claims' mag leeg blijven; vul je hem wel, dan
verschijnt onder het bericht "Waar dit op rust" met de bewering en de datum erbij — en dan
geldt de regel dat het bericht niet publiceerbaar is zolang een van die beweringen dat niet
is.

Sla dit bestand op als <slug>.md — de bestandsnaam wordt het webadres:
/nieuws/<slug>/
`);
  console.log(`bericht: nieuws/concept/ aangemaakt met een voorbeeld.\nSchrijf een .md-bestand en draai dit script opnieuw.`);
  process.exit(0);
}

if (!url || !key) {
  console.error('\nbericht: SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY moeten in je omgeving staan.\n');
  console.error('  PowerShell:  $env:SUPABASE_URL="https://dgrrwlamisfgtlwuhpqu.supabase.co"');
  console.error('               $env:SUPABASE_SERVICE_ROLE_KEY="<sleutel uit Supabase>"\n');
  console.error('Plak de sleutel NIET in een bestand of in de chat — alleen in je eigen omgeving.\n');
  process.exit(1);
}

const api = async (pad, opties = {}) => {
  const res = await fetch(`${url}/rest/v1/${pad}`, {
    ...opties,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
               Prefer: 'return=representation', ...(opties.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
};

const bestanden = readdirSync(CONCEPT).filter(n => n.endsWith('.md'));
if (!bestanden.length) {
  console.log(`\nbericht: geen .md-bestanden in nieuws/concept/.\nSchrijf er een; de bestandsnaam wordt het webadres.\n`);
  process.exit(0);
}

// Bestaande beweringen ophalen, zodat een tikfout in een verwijzing meteen opvalt in plaats
// van pas bij de build.
const bekend = new Set((await api('claims?select=ext_ref')).map(c => c.ext_ref));
const bestaand = new Map((await api('berichten?select=ext_ref,slug,review_status')).map(b => [b.slug, b]));

let nieuw = 0, bijgewerkt = 0, overgeslagen = 0;

for (const naam of bestanden.sort()) {
  const slug = naam.replace(/\.md$/, '');
  const rauw = readFileSync(path.join(CONCEPT, naam), 'utf-8');
  const knip = rauw.indexOf('\n---');
  if (knip < 0) { console.error(`  ✗ ${naam}: geen '---' die kop en tekst scheidt`); overgeslagen++; continue; }

  const kop = Object.fromEntries(rauw.slice(0, knip).split('\n').filter(Boolean).map(r => {
    const i = r.indexOf(':');
    return [r.slice(0, i).trim().toLowerCase(), r.slice(i + 1).trim()];
  }));
  const tekst = rauw.slice(knip + 4).replace(/^\s*\n/, '').trimEnd();

  const mist = ['titel', 'samenvatting'].filter(k => !kop[k]);
  if (mist.length || !tekst) {
    console.error(`  ✗ ${naam}: ontbreekt ${[...mist, tekst ? null : 'tekst'].filter(Boolean).join(' en ')}`);
    overgeslagen++; continue;
  }

  const claims = (kop.claims || '').split(',').map(s => s.trim()).filter(Boolean);
  const onbekend = claims.filter(c => !bekend.has(c));
  if (onbekend.length) {
    console.error(`  ✗ ${naam}: onbekende bewering(en) ${onbekend.join(', ')}`);
    overgeslagen++; continue;
  }

  const al = bestaand.get(slug);
  if (al && al.review_status === 'approved') {
    console.warn(`  · ${naam}: staat al goedgekeurd in het register — niet overschreven.`);
    console.warn(`    Wil je het wijzigen, zet het dan eerst terug op needs-review.`);
    overgeslagen++; continue;
  }

  const rij = {
    slug, titel: kop.titel, samenvatting: kop.samenvatting, tekst,
    claim_refs: claims.join(','),
    gepubliceerd_op: kop.datum || new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };

  if (al) {
    await api(`berichten?slug=eq.${encodeURIComponent(slug)}`, { method: 'PATCH', body: JSON.stringify(rij) });
    console.log(`  ↻ ${naam}: bijgewerkt (wacht nog op goedkeuring)`);
    bijgewerkt++;
  } else {
    const volgnr = String((await api('berichten?select=ext_ref')).length + 1).padStart(3, '0');
    await api('berichten', { method: 'POST', body: JSON.stringify({ ...rij, ext_ref: `bericht:rob:${volgnr}` }) });
    console.log(`  + ${naam}: toegevoegd als bericht:rob:${volgnr} (needs-review)`);
    nieuw++;
  }
}

console.log(`\nnieuw: ${nieuw}  bijgewerkt: ${bijgewerkt}  overgeslagen: ${overgeslagen}`);
if (nieuw || bijgewerkt) console.log(`\nVolgende stap: npm run review — niets gaat live voor jij het hebt goedgekeurd.\n`);
