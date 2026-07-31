// R.O.B. Concepting — de positie van een bericht in zijn reeks.
//
// HET GETAL WORDT GETELD, NIET INGEVULD. De mockup voor /nieuws/ vroeg om "deel 03 van 18",
// naast een plan voor 36 posts. Welk getal het ook wordt: een totaal dat iemand intypt, is
// over drie berichten onjuist — net als "3 whitepapers" en "deze drie stukken", die deze
// maand allebei stil verkeerd stonden. Daarom staat hier geen totaal in de data en telt
// deze module het uit de berichten die werkelijk publiceerbaar zijn.
//
// Gevolg dat je moet willen: het totaal groeit mee met wat er verschenen is. Daarom heet
// het in de tekst ook "van de N verschenen delen" en niet "van de N delen" — het eerste is
// waar, het tweede zou een belofte zijn over berichten die nog niet bestaan.
//
// Trek je een bewering in waar een bericht op rust, dan valt dat bericht uit de publicatie
// (zie build-nieuws) en dus ook uit deze telling. De reeks sluit zich dan weer: er ontstaat
// geen gat in vorige/volgende. Dat is bedoeld — een leesroute mag niet naar een pagina
// wijzen die er niet is.

// De soorten die een bericht kan hebben. Vrije tekst zou hier drift geven zodra er
// gefilterd wordt: "correctie" en "Correctie" zijn dan twee soorten.
//
// 'nieuws' is de standaard en de ruimste categorie — een los bericht dat nergens bij hoort.
// De database heeft hem als default en bericht:rob:001 draagt hem; daarom staat hij hier
// vooraan en niet als synoniem van iets anders.
export const SOORTEN = ['nieuws', 'uit-de-reeks', 'dossier', 'correctie', 'whitepaper'];

export const SOORT_LABEL = {
  'nieuws':       'Bericht',
  'uit-de-reeks': 'Uit de reeks',
  'dossier':      'Dossier',
  'correctie':    'Correctie',
  'whitepaper':   'Whitepaper',
};

/**
 * Berekent per bericht zijn plaats in de reeks.
 *
 * @param {Array<{ext_ref?:string, slug:string, titel?:string, reeks?:string|null, volgnummer?:number|null}>} berichten
 *        de berichten die werkelijk gepubliceerd worden — niet alles wat in het register staat.
 * @returns {{posities: Map<string, {nummer:number, totaal:number, vorige:object|null, volgende:object|null}>, fouten: string[]}}
 *        posities is gesleuteld op slug. fouten is leeg als de reeksen kloppen.
 */
export function reeksPositie(berichten) {
  const fouten = [];
  const posities = new Map();

  // Half ingevulde reeksgegevens zijn geen detail: een bericht met een volgnummer maar
  // zonder reeks kan nergens in staan, en een bericht met een reeks maar zonder nummer
  // heeft geen plaats. Allebei zijn ze aan de schrijfkant al geweigerd; deze poort staat er
  // omdat de build de database niet op haar woord hoeft te geloven.
  for (const b of berichten) {
    const heeftReeks = !!(b.reeks && String(b.reeks).trim());
    const heeftNr    = Number.isInteger(b.volgnummer) && b.volgnummer > 0;
    if (heeftReeks && !heeftNr) fouten.push(`${b.slug}: staat in reeks "${b.reeks}" maar heeft geen volgnummer`);
    if (heeftNr && !heeftReeks) fouten.push(`${b.slug}: heeft volgnummer ${b.volgnummer} maar staat in geen reeks`);
  }

  const perReeks = new Map();
  for (const b of berichten) {
    if (!b.reeks || !Number.isInteger(b.volgnummer) || b.volgnummer <= 0) continue;
    const naam = String(b.reeks).trim();
    if (!perReeks.has(naam)) perReeks.set(naam, []);
    perReeks.get(naam).push(b);
  }

  for (const [naam, leden] of perReeks) {
    leden.sort((a, b) => a.volgnummer - b.volgnummer);

    // Twee delen met hetzelfde nummer maakt "vorige" en "volgende" onbepaald. Rood, want
    // de bezoeker zou dan afhankelijk van de sorteervolgorde ergens anders uitkomen.
    const gezien = new Map();
    for (const b of leden) {
      if (gezien.has(b.volgnummer)) {
        fouten.push(`reeks "${naam}": ${gezien.get(b.volgnummer)} en ${b.slug} hebben allebei volgnummer ${b.volgnummer}`);
      }
      gezien.set(b.volgnummer, b.slug);
    }

    // Een gat in de nummering is GEEN fout. Deel 3 kan zijn ingetrokken doordat een
    // bewering eronder wegviel; de reeks moet dan gewoon van 2 naar 4 lopen in plaats van
    // de bezoeker naar een verdwenen pagina te sturen.
    leden.forEach((b, i) => {
      posities.set(b.slug, {
        nummer:   b.volgnummer,
        totaal:   leden.length,
        vorige:   i > 0 ? leden[i - 1] : null,
        volgende: i < leden.length - 1 ? leden[i + 1] : null,
      });
    });
  }

  return { posities, fouten };
}
