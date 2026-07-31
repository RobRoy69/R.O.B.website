// R.O.B. Concepting — de publieke vertaling van de registerstand.
//
// Drie woorden naar buiten: Bron bevestigd · Verloopt · Wacht.
// Dat is claim:agora:017 in de praktijk: de projectie bepaalt wat mag meedoen, de
// representatie bepaalt hoe het verschijnt — en de representatie voegt niets toe.
//
// "KLOPT" MOET ERGENS OP RUSTEN. Anders is het een lege geruststelling, precies de
// bewering-zonder-grond die deze site bestrijdt. De grond is de controledatum: de papers
// beloven "bronnen met een directe link zijn in juli 2026 bij de bron nagetrokken", en die
// datum staat sinds migratie 0015 per bron in het register. Geen datum betekent: nooit
// gecontroleerd, en dan staat er Wacht.
//
// LABEL WAT AFWIJKT, ZWIJG OVER DE STANDAARD. Bij 47 metingen "meting" zetten is ruis en
// verdrinkt het signaal. Een prognose, een uitspraak of een theoretische grondslag krijgt
// wél een woord — dat is het onderscheid dat week 3 van het publicatieplan draagt: Gartner
// voorspelt, Pew mat.

const MND = ['januari','februari','maart','april','mei','juni','juli','augustus',
             'september','oktober','november','december'];

const maandJaar = (d) => {
  if (!d) return '';
  const [j, m] = d.split('-').map(Number);
  return `${MND[m - 1]} ${j}`;
};

export function status(c, vandaag = new Date()) {
  // GEEN STATUS VOOR EEN GRONDSLAG. Eerste versie zette "Wacht" bij Polanyi 1966 — logisch
  // gevolg van "geen controledatum", en toch onjuist. Een status gaat over houdbaarheid: kan
  // deze bewering verlopen doordat de werkelijkheid of de bron verschuift? Bij een meting van
  // Pew wel. Bij een positie in de literatuur niet; die is geen momentopname en heeft geen
  // uitgeverspagina die kan wijzigen. Er "Wacht" bij zetten suggereert twijfel waar geen
  // twijfel is, en dat is even onzuiver als valse zekerheid de andere kant op.
  if (c.soort === 'grondslag') return null;

  if (c.in_herziening) {
    return { woord: 'Wacht', toon: 'wacht', uitleg: 'staat ter discussie' };
  }
  if (!c.nagetrokken_op) {
    return { woord: 'Wacht', toon: 'wacht', uitleg: 'nog niet bij de bron nagetrokken' };
  }
  if (c.herzien_na && new Date(c.herzien_na) < vandaag) {
    return { woord: 'Verloopt', toon: 'verloopt', uitleg: 'herziening nodig' };
  }
  return { woord: 'Bron bevestigd', toon: 'klopt', uitleg: `nagetrokken ${maandJaar(c.nagetrokken_op)}` };
}

// Alleen tonen wat niet vanzelf spreekt. 'meting' is de standaard en krijgt geen label.
const SOORT_LABEL = {
  prognose:   'prognose',
  bronversie: 'gebonden aan een bronversie',
  grondslag:  'theoretische grondslag',
};

export const soortLabel = (c) => SOORT_LABEL[c.soort] || '';

// Gedeelde stijl, zodat /vragen/ en /nieuws/ er niet uit elkaar gaan lopen.
export const STATUS_CSS = `
    .st{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:10.5px;
      letter-spacing:.08em;padding:1px 7px;margin-left:8px;white-space:nowrap;
      border:1px solid transparent}
    .st-klopt{color:#1a7f4b;border-color:rgba(26,127,75,.28)}
    .st-verloopt{color:#a86400;border-color:rgba(168,100,0,.32);background:rgba(217,136,0,.07)}
    .st-wacht{color:#a03a2a;border-color:rgba(160,58,42,.3);background:rgba(232,57,30,.05)}
    .st-soort{display:inline-block;font-size:11.5px;font-style:italic;color:#7a6e85;
      margin-left:8px}`;

export function statusHtml(c, esc) {
  const s = status(c);
  const soort = soortLabel(c);
  return (soort ? `<span class="st-soort">${esc(soort)}</span>` : '')
    + (s ? `<span class="st st-${s.toon}" title="${esc(s.uitleg)}">${s.woord}</span>` : '');
}
