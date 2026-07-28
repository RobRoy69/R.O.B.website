// R.O.B. Concepting — wie R.O.B. is, machineleesbaar. ENIGE BRON.
//
// AANLEIDING, gemeten 2026-07-27. In de live publicatie stonden VIJF losse Person-objecten
// voor dezelfde persoon — op de homepage en in elk whitepaper — en NUL @id-verwijzingen.
// Voor een machine zijn dat vijf mogelijke mensen. Precies het tegenovergestelde van wat
// het amendement bij paper 04 als sterkste betrouwbaarheidssignaal aanwijst: consistentie
// over bronnen.
//
// Dit is eis 1 uit dat paper, machineleesbaar gemaakt: de kennis is expliciet vastgesteld,
// en verschijnt dus overal in dezelfde versie. Niet vijf keer overgetypt maar één keer
// gedefinieerd en overal naartoe verwezen.
//
// Wordt door build-entiteiten.mjs in ELKE gepubliceerde pagina gezet. Verandert er iets aan
// de entiteit, dan verandert het overal — of nergens, en dan is de build rood.

export const BASIS = 'https://rob-concepting.com';

export const ID = {
  persoon: `${BASIS}/#rob`,
  org:     `${BASIS}/#organisatie`,
  site:    `${BASIS}/#website`,
};

// sameAs is het sterkste disambiguatie-signaal dat er is: het laat een machine vaststellen
// dat deze Rob de Rooij dezelfde is als die daar. Nu staat er één profiel. Elk extra
// GEVERIFIEERD profiel maakt de entiteit steviger — maar alleen profielen die echt van Rob
// zijn en waar de link terugwijst. Een verzonnen of onbevestigd profiel verzwakt juist.
// Alle drie geverifieerd op 2026-07-27: de URL's resolven (LinkedIn geeft 999, dat is hun
// bot-afweer en geen fout).
//
// LET OP — sameAs is het sterkst wanneer de verwijzing WEDERKERIG is: het profiel linkt
// terug naar het domein. GitHub doet dat op dit moment niet; een link naar
// rob-concepting.com in dat profiel maakt het signaal aantoonbaar sterker.
export const SAME_AS = [
  'https://www.linkedin.com/in/rob-concepting/',
  'https://www.youtube.com/@R-O-B-concepting',
  'https://github.com/RobRoy69',
];

export function graaf() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': ID.persoon,
        name: 'Rob de Rooij',
        url: `${BASIS}/`,
        jobTitle: 'Concepting Expert',
        description: 'Bouwt voor MKB-ondernemers en bestuurders visie, systeem en merk tot één werkend geheel. Geen adviesstapeling, maar doelgerichte bouw.',
        knowsAbout: [
          'Business Concepting', 'Systeemontwerp', 'Merkbouw',
          'AI-integratie', 'Kennisgezag', 'Generative Engine Optimization',
        ],
        sameAs: SAME_AS,
        worksFor: { '@id': ID.org },
      },
      {
        '@type': 'ProfessionalService',
        '@id': ID.org,
        name: 'R.O.B. Concepting',
        alternateName: 'R.O.B.',
        url: `${BASIS}/`,
        logo: `${BASIS}/og-image.png`,
        image: `${BASIS}/og-image.png`,
        description: 'Visie, systeem en merk tot één werkend geheel — voor MKB-ondernemers en bestuurders.',
        inLanguage: 'nl-NL',
        areaServed: { '@type': 'Country', name: 'Nederland' },
        founder: { '@id': ID.persoon },
        sameAs: SAME_AS,
      },
      {
        '@type': 'WebSite',
        '@id': ID.site,
        url: `${BASIS}/`,
        name: 'R.O.B. Concepting',
        inLanguage: 'nl-NL',
        publisher: { '@id': ID.org },
      },
    ],
  };
}

// Verwijzingen om in paginaspecifieke schema's te gebruiken, in plaats van het object
// opnieuw uit te schrijven.
export const verwijzing = {
  auteur:    { '@id': ID.persoon },
  uitgever:  { '@id': ID.org },
  website:   { '@id': ID.site },
};
