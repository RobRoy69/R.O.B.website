// R.O.B. Concepting — het merk, één keer vastgelegd.
//
// BRON: "R.O.B. Concepting — Stylesheet v2" (31 juli 2026), het leidende blad uit het
// merk-kit in merk/. De norm staat daar ook in tekstvorm: merk/PUBLICATIECONTRACT.md.
// Dit bestand is de machineleesbare kant ervan.
//
// De kleurwaarden zijn ongewijzigd ten opzichte van het eerste blad van dezelfde dag; v2
// hernoemt alleen de papiertreden tot volwaardige tokens en scherpt de letters en de ruimte
// aan. Bij tegenspraak met een werkcontract of extern onderzoek geldt de stylesheet.
//
// WAAROM DIT BESTAAT. De kleurschaal stond op drie plekken apart gedefinieerd — index.html,
// build-nieuws.mjs en kennisgezagsscan — en liep al uiteen: muted was #7a6e85 op de ene plek
// en #6b6478 op de andere, en het lichte vlak #f4f2ed in plaats van #f4f1ec. Dat is dezelfde
// fout als een handmatig bijgehouden publicatielijst, alleen dan in hex. Wie hier een kleur
// nodig heeft, haalt hem hier.
//
// Het blad zegt: "Wat hier niet staat, verzin je niet — dan is er een afspraak nodig."

// ── 01 Kleur: negen tokens, twee accenten ──
export const KLEUR = {
  cream:    '#e8e4dc',              // paginabasis licht
  navy:     '#001a4d',              // koppen en kerntekst
  dark:     '#0d0d1a',              // donkere secties, video-ondergrond
  screen:   '#0e1525',              // alternatief donker oppervlak
  muted:    '#7a6e85',              // metadata, NOOIT lopende tekst
  hairline: 'rgba(0,26,77,0.12)',   // randen en scheidingen
  surface:  'rgba(255,255,255,0.4)',// kaart op cream
  cyan:     '#0fa8cb',              // systeem-accent: tags, fasen, status
  red:      '#e8391e',              // claim-accent: Weerlegd, de beslissing
};

// De drie papiertreden. Levendigheid komt hieruit — uit het palet zelf — en niet uit nieuwe
// kleuren. Vlak op vlak, gescheiden door hairline, niet door kleurverschil.
export const PAPIER = {
  geldig:          '#f4f1ec',
  verlopend:       '#d5cfc6',
  achtergebleven:  '#b9b2a8',
};

// ── 04 Maat en ruimte: één radius, één padding, vaste breedtes ──
export const MAAT = {
  radius:       '2px',   // voor ALLES. Geen schaal, geen pillen.
  cardPadding:  '22px',  // vast, ook bij kleine kaarten
  border:       '1px',
  accentrand:   '2px',
  maxDocument:  '880px',
  maxWebsite:   '1200px',
  maxRegel:     '66ch',
  raakvlak:     '44px',
};

export const FONT = {
  sans: `'DM Sans', system-ui, -apple-system, sans-serif`,
  mono: `'IBM Plex Mono', 'Courier New', monospace`,
};

// Eén tracking-waarde voor mono, en geen andere. v2 zegt het bij 'meta' met zoveel woorden:
// "de enige tracking-waarde". De opmaak had er vijf (.12em .14em .16em .18em .22em) — dat
// leest als vijf verschillende labelsoorten waar er één is.
export const TRACKING = '0.14em';

// Op donker is de tekstkleur cream of papier, niet wit. Wit staat niet in de negen tokens,
// en de contrasttabel meet dan ook papier-op-dark (17,1:1) en niet wit-op-dark. Het scheelt
// weinig op het scherm en alles in navolgbaarheid: één palet, geen uitzondering.
export const TEKST_OP_DONKER = PAPIER.geldig;

// ── De keuringslijst uit v2 ──
// Tien regels, elk met de toets erbij. Vier ervan zijn op een webpagina machinaal te
// controleren en staan in test-merk.mjs; de zes andere gaan over bewegend beeld en foto en
// horen in de werkbank.
export const KEURING_WEB = [
  'Elke hex komt uit de negen tokens',
  'Geen linear-gradient of radial-gradient',
  'Geen font-style italic',
  'Geen font-weight boven 600',
];

// De negen tokens, plat, voor de hex-controle. Doorzichtige varianten van navy en cyaan
// gelden als dezelfde kleur — een lijn op 12 procent is geen tiende kleur.
export const TOEGESTANE_HEX = [
  KLEUR.cream, KLEUR.navy, KLEUR.dark, KLEUR.screen, KLEUR.muted,
  PAPIER.geldig, PAPIER.verlopend, PAPIER.achtergebleven, KLEUR.cyan, KLEUR.red,
].map(h => h.toLowerCase());

// ── 02 Contrast: gemeten, niet geschat ──
//
// De vloeren komen uit WCAG 2.1 AA. Het blad noemt ook de BBC-ondertitelrichtlijn van 5:1;
// die geldt voor tekst in beeld, niet voor een webpagina, en staat hier daarom als aparte
// waarde in plaats van als algemene vloer.
export const VLOER = { tekst: 4.5, grootTekst: 3.0, ondertitel: 5.0 };

const kanaal = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

export function luminantie(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c) : h.match(/.{2}/g);
  const [r, g, b] = v.map(x => kanaal(parseInt(x, 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrastverhouding tussen twee ondoorzichtige kleuren. Afgerond op één decimaal. */
export function contrast(voor, achter) {
  const a = luminantie(voor), b = luminantie(achter);
  const [licht, donker] = a > b ? [a, b] : [b, a];
  return Math.round(((licht + 0.05) / (donker + 0.05)) * 10) / 10;
}

// Wat het blad als gemeten opgeeft. De toets rekent dit na — een tabel die niemand narekent
// is een bewering zonder bron, en dat is precies wat deze site niet doet.
export const GEMETEN = [
  { voor: PAPIER.geldig, achter: KLEUR.dark,   verwacht: 17.1, oordeel: 'toegestaan' },
  { voor: KLEUR.navy,    achter: PAPIER.geldig, verwacht: 14.9, oordeel: 'toegestaan' },
  { voor: KLEUR.navy,    achter: KLEUR.cream,   verwacht: 13.2, oordeel: 'toegestaan' },
  { voor: KLEUR.navy,    achter: PAPIER.achtergebleven, verwacht: 8.0, oordeel: 'toegestaan' },
  { voor: KLEUR.cyan,    achter: KLEUR.dark,    verwacht: 6.9, oordeel: 'accent en labels' },
  { voor: KLEUR.muted,   achter: KLEUR.cream,   verwacht: 3.8, oordeel: 'alleen metadata' },
  { voor: KLEUR.cyan,    achter: KLEUR.cream,   verwacht: 2.2, oordeel: 'nooit voor tekst' },
];

// ── De twee regels die het vaakst worden overtreden ──
//
// 1. CYAAN IS GEEN TEKSTKLEUR OP LICHT. Op cream haalt hij 2,2:1. Hij mag als label op
//    donker (6,9:1), als rand, als vlak. Een link op cream wordt navy met een onderlijn.
// 2. MUTED IS ALLEEN METADATA. 3,8:1 op cream haalt de vloer voor lopende tekst niet. Een
//    onderbouwing is geen metadata: die is de inhoud, en die staat in navy.
export const TEKST_OP_LICHT = KLEUR.navy;

// ── En de regel die het blad met zichzelf in tegenspraak brengt ──
//
// Het blad noemt muted "metadata, nooit lopende tekst" en geeft 3,8:1 op cream op als
// toegestaan voor metadata. Maar regel 7 van zijn EIGEN keuringslijst luidt: "Contrast van
// tekst op ondergrond boven 4,5:1", zonder uitzondering voor metadata. WCAG kent die
// uitzondering ook niet — de grens ligt bij tekstgrootte (24px, of 18,66px vet), niet bij de
// rol van de tekst. Muted haalt het nergens: 4,2:1 op papier, 3,8:1 op cream, 4,0:1 op dark.
//
// De strengere regel wint, want die staat als TOETS in het blad en de andere als toelichting.
// Gevolg: op deze site is muted geen tekstkleur. De hiërarchie in labels komt uit wat het
// blad er zelf voor geeft — mono, 11px, 0,14em, uppercase — en niet uit een lichtere kleur.
// "Nadruk komt uit gewicht" geldt dan ook de andere kant op.
//
// Dit is de plek waar dat besluit staat. Wil iemand muted terug als tekstkleur, dan is dat
// een wijziging aan het blad en niet aan deze regel.
export const MUTED_IS_GEEN_TEKSTKLEUR = true;
export const METADATA_OP_LICHT = KLEUR.navy;
