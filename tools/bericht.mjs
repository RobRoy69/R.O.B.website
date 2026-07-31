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
import { SOORTEN } from './lib/reeks.mjs';

const ROOT    = path.resolve(import.meta.dirname, '..');
const CONCEPT = path.join(ROOT, 'nieuws', 'concept');
const PAPERDIR = path.join(ROOT, 'whitepapers');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// De slugs waar 'hoort_bij' naar mag wijzen: afgeleid uit de papers die er werkelijk staan.
// Een vaste lijst zou hier hetzelfde doen als "3 whitepapers" in de tekst deed — kloppen tot
// er een paper bijkomt.
const PAPERS = new Set(readdirSync(PAPERDIR)
  .filter(n => n.endsWith('.html') && n !== 'index.html')
  .map(n => n.replace(/\.html$/, '')));

// De uitleg van het formaat staat HIER, in de code, en wordt bij elke run naar
// nieuws/concept/_voorbeeld.md.txt geschreven. Reden: nieuws/concept/ staat in .gitignore,
// dus een uitleg die alleen daar leeft, reist niet mee en veroudert ongemerkt — precies wat
// er gebeurde toen dit script een kortere versie schreef dan het bestand dat er lag, en die
// kortere versie afbeelding, alt en video niet eens noemde.
const VOORBEELD = `titel: Zo ziet een bericht eruit
samenvatting: Een of twee zinnen. Die komen op de overzichtspagina, in de deel-knoppen en in de feed.
claims: claim:wp:051, claim:wp:053
datum: 2026-07-27
soort: uit-de-reeks
reeks: whitepaperreeks
volgnummer: 1
hoort_bij: de-beste-keuze-is
afbeelding: /media/nieuws/voorbeeld.jpg
alt: Beschrijf wat er op de afbeelding te zien is, minimaal tien tekens.
video: /media/nieuws/voorbeeld.mp4
---
Hier begint de tekst. Een lege regel maakt een nieuwe alinea.

KOPVELDEN

titel en samenvatting zijn verplicht. De rest mag weg.

claims mag leeg. Vul je hem, dan verschijnt onder het bericht "Waar dit op rust" met de
bewering en de datum -- en dan geldt de regel dat het bericht niet publiceerbaar is zolang
een van die beweringen dat niet is.

soort: ${SOORTEN.join(' | ')}. Weglaten betekent 'nieuws' -- een los bericht dat
nergens bij hoort. Vrije tekst wordt geweigerd: zodra er op soort gefilterd wordt, zijn
"correctie" en "Correctie" anders twee soorten.

reeks en volgnummer horen bij elkaar; je vult ze allebei of geen van beide. reeks is een
korte naam die alle delen delen, volgnummer is een geheel getal vanaf 1. Het TOTAAL vul je
nergens in -- dat wordt geteld uit de delen die werkelijk verschenen zijn. Een ingetypt
totaal is over drie berichten onjuist.

hoort_bij: de slug van het whitepaper waar dit bericht bij hoort, zonder .html. Nu geldig:
${[...PAPERS].sort().join(', ')}. Hoort het bericht bij geen enkel paper of bij
alle vier, laat het veld dan leeg -- een half kloppende verwijzing is erger dan geen.

afbeelding: een pad onder /media/nieuws/. ALT IS DAN VERPLICHT, minimaal tien tekens. Dat
is geen nette gewoonte maar een constraint in de database: een afbeelding zonder alt is
onbruikbaar voor wie hem niet ziet, en onleesbaar voor een machine.

video: of een zelf-gehoste .mp4 onder /media/nieuws/ (speelt op de pagina), of een
YouTube-URL. Die laatste wordt GEEN ingebedde speler maar een aanklikbare poster -- een
embed laadt code van derden op een site die verder geen enkele tracker heeft. Zet er een
afbeelding bij als poster, anders wordt de YouTube-thumbnail gebruikt. Staat er alleen een
video en toch een alt, dan wordt die alt het onderschrift eronder.

Sla op als <slug>.md -- de bestandsnaam wordt het webadres: /nieuws/<slug>/
Draai daarna: npm run bericht
`;

mkdirSync(CONCEPT, { recursive: true });
writeFileSync(path.join(CONCEPT, '_voorbeeld.md.txt'), VOORBEELD);

const bestanden = readdirSync(CONCEPT).filter(n => n.endsWith('.md'));
if (!bestanden.length) {
  console.log(`\nbericht: geen .md-bestanden in nieuws/concept/.\nSchrijf er een; de bestandsnaam wordt het webadres. Zie _voorbeeld.md.txt.\n`);
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

// Bestaande beweringen ophalen, zodat een tikfout in een verwijzing meteen opvalt in plaats
// van pas bij de build.
const bekend = new Set((await api('claims?select=ext_ref')).map(c => c.ext_ref));
const alBekend = await api('berichten?select=ext_ref,slug,review_status,reeks,volgnummer');
const bestaand = new Map(alBekend.map(b => [b.slug, b]));

// Bezette plaatsen in een reeks. Twee delen met hetzelfde nummer maakt vorige/volgende
// onbepaald; de build weigert dat, maar dan sta je al met een record in het register. Hier
// gevangen kost het een regel, daar kost het een reviewronde.
const bezet = new Map();
for (const b of alBekend) {
  if (b.reeks && Number.isInteger(b.volgnummer)) bezet.set(`${b.reeks}#${b.volgnummer}`, b.slug);
}

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

  // Media. Alt is verplicht zodra er een afbeelding is — de database weigert het anders,
  // maar hier meld ik het met een leesbare reden in plaats van een constraint-fout.
  if (kop.afbeelding && (!kop.alt || kop.alt.trim().length < 10)) {
    console.error(`  ✗ ${naam}: 'afbeelding' zonder bruikbare 'alt' (minimaal 10 tekens).`);
    console.error(`    Een afbeelding zonder alt is onbruikbaar voor wie hem niet ziet.`);
    overgeslagen++; continue;
  }

  // ── plaats in het geheel: soort, reeks, volgnummer, hoort_bij ──
  //
  // De database kent geen enum op 'soort' en geen sleutel op 'hoort_bij'; dat is hier de
  // poort. Fout gespeld is geen detail: zodra /nieuws/ op soort filtert, wordt een
  // afwijkende schrijfwijze een eigen categorie met één bericht erin.
  const soort = (kop.soort || 'nieuws').trim();
  if (!SOORTEN.includes(soort)) {
    console.error(`  ✗ ${naam}: onbekende soort "${soort}". Kies uit: ${SOORTEN.join(', ')}.`);
    overgeslagen++; continue;
  }

  const reeks = (kop.reeks || '').trim() || null;
  const nrRuw = (kop.volgnummer || '').trim();
  if (nrRuw && !/^[1-9]\d*$/.test(nrRuw)) {
    console.error(`  ✗ ${naam}: volgnummer "${nrRuw}" is geen geheel getal vanaf 1.`);
    overgeslagen++; continue;
  }
  const volgnummer = nrRuw ? Number(nrRuw) : null;

  // Half ingevuld is erger dan leeg: een deel zonder reeks staat nergens in, een reeks
  // zonder nummer heeft geen plaats erin.
  if (!!reeks !== !!volgnummer) {
    console.error(`  ✗ ${naam}: 'reeks' en 'volgnummer' horen bij elkaar — vul ze allebei of geen van beide.`);
    overgeslagen++; continue;
  }

  const bezetDoor = reeks ? bezet.get(`${reeks}#${volgnummer}`) : undefined;
  if (bezetDoor && bezetDoor !== slug) {
    console.error(`  ✗ ${naam}: deel ${volgnummer} van reeks "${reeks}" is al ${bezetDoor}.`);
    overgeslagen++; continue;
  }

  const hoortBij = (kop.hoort_bij || '').trim() || null;
  if (hoortBij && !PAPERS.has(hoortBij)) {
    console.error(`  ✗ ${naam}: hoort_bij "${hoortBij}" is geen bestaand whitepaper.`);
    console.error(`    Nu geldig: ${[...PAPERS].sort().join(', ')}`);
    overgeslagen++; continue;
  }

  const rij = {
    slug, titel: kop.titel, samenvatting: kop.samenvatting, tekst,
    afbeelding: kop.afbeelding || null,
    afbeelding_alt: kop.alt || null,
    video: kop.video || null,
    claim_refs: claims.join(','),
    soort, reeks, volgnummer, hoort_bij: hoortBij,
    gepubliceerd_op: kop.datum || new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };

  // Ook binnen deze run: twee conceptbestanden mogen niet allebei deel 4 claimen.
  if (reeks) bezet.set(`${reeks}#${volgnummer}`, slug);

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
