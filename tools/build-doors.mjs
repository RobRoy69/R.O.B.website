// R.O.B. Concepting — bouwt de vragenpoorten (doors) uit het register.
//
// Een door is de uitgifte-eenheid: een vraag + de claims waarop het antwoord rust
// + de bronnen daaronder. Conform door.schema.json uit agora-os-tool-2.0.
//
// Kernregel: publication_status wordt AFGELEID, niet beweerd. Een deur is nooit
// publiceerbaarder dan zijn zwakste claim. Staat een gebonden claim niet op
// approved+open/showcase, dan is de deur draft — ongeacht wat hier staat.
//
// Draai: node tools/build-doors.mjs   (leest whitepapers/_register.json)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROJ = path.join(ROOT, 'whitepapers', '_register.json');
const OUT  = path.join(ROOT, 'whitepapers', '_doors.json');

if (!existsSync(PROJ)) {
  console.error('build-doors: whitepapers/_register.json ontbreekt — draai eerst sync-register.');
  process.exit(1);
}
const leverbaar = new Set(JSON.parse(readFileSync(PROJ, 'utf8')).claims.map(c => c.ext_ref));

// Per deur: alle claims die het antwoord DRAGEN. Wat nog niet leverbaar is,
// zakt automatisch naar 'kandidaat' en telt niet mee voor publicatie.
const DEUREN = [
  {
    id: 'door:rob:001',
    title: 'Gevonden worden in een antwoordeconomie',
    question: 'Word ik nog gevonden nu AI de antwoorden geeft?',
    snippet: 'Het aandeel zoekopdrachten dat op een website eindigt daalt aantoonbaar. De vraag verschuift van gevonden worden naar genoemd worden.',
    antwoord: 'Steeds vaker niet. Zoekmachines geven het antwoord zelf, en de bezoeker klikt niet meer door. Dat betekent niet dat je onzichtbaar wordt, maar wel dat zichtbaarheid en bezoek loskoppelen: je kunt genoemd worden zonder dat iemand je site opent. De vraag verschuift daarmee van "word ik gevonden" naar "word ik genoemd, en op grond waarvan".',
    verder: [['De beste keuze is…', '/whitepapers/de-beste-keuze-is.html']],
    wil: ['claim:wp:001','claim:wp:002','claim:wp:003','claim:wp:004','claim:wp:017','claim:wp:030']
  },
  {
    id: 'door:rob:002',
    title: 'Waarop een opdrachtgever kiest',
    question: 'Waarop word ik straks gekozen, als iedereen alles kan nazoeken?',
    snippet: 'De machine maakt de eerste selectie, de mens valideert die met groeiende argwaan. Wat telt is bevestigbaar bewijs, niet zichtbaarheid.',
    antwoord: 'Op wat een ander over je kan bevestigen. Een AI-systeem stelt de eerste selectie samen; daarna kijkt een mens ernaar, en die wordt juist kritischer naarmate hij meer AI gebruikt. Wat dan telt is niet hoe goed je jezelf beschrijft, maar of het klopt wat je beweert en of het ergens anders terug te vinden is.',
    verder: [['De beste keuze is…', '/whitepapers/de-beste-keuze-is.html']],
    wil: ['claim:wp:021','claim:wp:022','claim:wp:031','claim:prop:007','claim:prop:008']
  },
  {
    id: 'door:rob:003',
    title: 'Waarde die in hoofden zit',
    question: 'Wat gebeurt er met mijn bedrijf als de kennis in hoofden zit?',
    snippet: 'Kennis die nergens is vastgelegd verdwijnt met de persoon en is onzichtbaar voor systemen. Dat maakt een bedrijf twee keer kwetsbaar.',
    antwoord: 'Dan is die waarde er wel, maar is ze fragiel op twee manieren. Ze kan vertrekken met de persoon — en dat speelt in Nederland breed, met een vergrijzende ondernemersgroep en opvolging die vaak niet geregeld is. En ze is onzichtbaar voor elk systeem dat alleen kan lezen wat is vastgelegd. Vastleggen lost beide tegelijk op: het maakt de kennis overdraagbaar én beoordeelbaar.',
    verder: [['De beste keuze is…', '/whitepapers/de-beste-keuze-is.html']],
    wil: ['claim:wp:006','claim:wp:012','claim:wp:013','claim:wp:016','claim:wp:025','claim:prop:009','claim:prop:010']
  },
  {
    id: 'door:rob:004',
    title: 'Een stem die namens je spreekt',
    question: 'Mag ik een AI-agent namens mijn bedrijf laten spreken?',
    snippet: 'Je kunt de taak delegeren, niet de verantwoordelijkheid. Een agent zonder ontworpen grenzen is een aansprakelijkheid.',
    antwoord: 'Ja, maar dan spreekt hij ook namens je — met alles wat daarbij hoort. Een rechter oordeelde dat een bedrijf aansprakelijk is voor wat zijn chatbot belooft. Je kunt de taak dus delegeren, de verantwoordelijkheid niet. Wat het verschil maakt is niet de techniek maar het ontwerp: waarop hij zijn antwoorden baseert, wat hij weigert, en wat hij over zichzelf zegt.',
    verder: [['De klinkklare (on-)zin van je AI-agent', '/whitepapers/de-klinkklare-onzin.html']],
    wil: ['claim:wp:007','claim:wp:008','claim:wp:019','claim:wp:028','claim:wp:034']
  },
  {
    id: 'door:rob:005',
    title: 'Goedkeuren is niet beslissen',
    question: 'Beslist de mens nog, als het systeem het voorstel doet?',
    snippet: 'Naarmate een systeem vaker gelijk heeft, stopt de mens met controleren. Een echte beslissing vraagt om afwijsbaarheid, bevraagbaarheid en consequentie.',
    antwoord: 'Vaak minder dan het papierwerk suggereert. Naarmate een systeem vaker gelijk heeft, stopt een mens met echt kijken — en uitleg erbij maakt hem volgzamer in plaats van scherper. Goedkeuren is dan geen beslissen. Een echte beslissing vraagt drie dingen: de ruimte om af te wijzen, genoeg toegang om te weten waarop, en gevolgen die de beslisser zelf draagt.',
    verder: [['De mens beslist (of niet meer?)', '/whitepapers/de-mens-beslist.html']],
    wil: ['claim:wp:009','claim:wp:010','claim:wp:018','claim:wp:026','claim:wp:027','claim:wp:032']
  },
  {
    id: 'door:rob:006',
    title: 'De achterstand die er niet is',
    question: 'Loopt het Nederlandse MKB achter met AI?',
    snippet: 'Op basisniveau loopt Nederland voor op het EU-gemiddelde. De achterstand zit niet in adoptie maar in strategie: het ontbreken van visie.',
    antwoord: 'Nee — en dat is een aanname die vaak onbesproken meegaat. Op basisniveau digitalisering staat Nederland bóven het EU-gemiddelde, en ook de AI-adoptie ligt hoger. Waar het wel schuurt: het gebruik blijft gefragmenteerd en op efficiëntie gericht, en wat ontbreekt is visie en strategie. De achterstand zit dus niet in techniek maar in richting.',
    verder: [],
    wil: ['claim:prop:002','claim:prop:003','claim:prop:004','claim:prop:005','claim:prop:006']
  }
];

const claimById = new Map(JSON.parse(readFileSync(PROJ, 'utf8')).claims.map(c => [c.ext_ref, c]));

const doors = DEUREN.map(d => {
  const gebonden  = d.wil.filter(c => leverbaar.has(c));
  const kandidaat = d.wil.filter(c => !leverbaar.has(c));
  return {
    id: d.id,
    title: d.title,
    mode: 'public',
    question: d.question,
    antwoord: d.antwoord,
    verder: d.verder,
    // Tekst en datum van elke gebonden bewering, zodat de vragenpagina het bewijs
    // kan tonen zonder de DB opnieuw te bevragen.
    bewijs: gebonden.map(r => ({ ext_ref: r, text: claimById.get(r)?.text, dated: claimById.get(r)?.dated, precisie: claimById.get(r)?.dated_precisie, soort: claimById.get(r)?.dated_soort,
      bron_url: claimById.get(r)?.bron_url, bron_naam: claimById.get(r)?.bron_naam,
      soort: claimById.get(r)?.soort, herzien_na: claimById.get(r)?.herzien_na,
      in_herziening: claimById.get(r)?.in_herziening,
      nagetrokken_op: claimById.get(r)?.nagetrokken_op })),
    claim_refs: gebonden,
    source_refs: [],                       // afgeleid uit de claims bij projectie
    publication_status: gebonden.length ? 'publishable' : 'draft',
    ring: 'open',
    publication_scope: 'public',
    citation_policy: 'snippet',
    copy_review_status: 'needs-review',
    snippet: d.snippet,
    quality_signals: {
      claims_gebonden: gebonden.length,
      claims_kandidaat: kandidaat.length,
      wachtend_op_reviewpoort: kandidaat
    }
  };
});

writeFileSync(OUT, JSON.stringify({
  bron: 'afgeleid uit whitepapers/_register.json (agora-rob-register)',
  gebouwd_op: new Date().toISOString(),
  toelichting: 'publication_status is afgeleid uit de claimstatus, niet beweerd. Bewerk de DB, niet dit bestand.',
  doors
}, null, 2) + '\n');

const pub = doors.filter(d => d.publication_status === 'publishable').length;
console.log(`build-doors: ${doors.length} deuren — ${pub} publishable, ${doors.length - pub} draft`);
for (const d of doors) {
  console.log(`  ${d.publication_status === 'publishable' ? '✓' : '·'} ${d.id}  ${d.quality_signals.claims_gebonden} gebonden / ${d.quality_signals.claims_kandidaat} wachtend  — ${d.question}`);
}
