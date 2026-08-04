// R.O.B. Concepting — hoe de canon-bundle tot context wordt gemaakt. ENIGE BRON.
//
// AANLEIDING (2026-08-04). De lijst met type-mappen die in de prompt gaat, stond op twee
// plekken: in chat.js en in tools/build-promptfoo-prompt.mjs. Toen `voice` en `method` aan
// chat.js werden toegevoegd, bleef de testbouwer op de oude drie staan — 37.570 tekens canon
// in de test tegen 61.500 live. De tests toetsten dus weer een prompt die niet bestond.
//
// Dat is precies de fout die deze twee bestanden in hun eigen kop beschrijven: de overgetypte
// promptfoo-prompt zonder HARD KADER. Twee keer eerder gebeurd, nu een derde keer, en steeds
// omdat één gegeven op twee plekken stond. Vandaar dit bestand: chat.js en de testbouwer
// importeren dezelfde functie, dus ze kunnen niet meer uit elkaar lopen.
//
// Geen afhankelijkheden — chat.js importeert de AI-SDK en die staat niet in elke omgeving
// klaar, dus dit blijft puur.

// Welke type-mappen in de prompt komen. `brandstyle` en `marktcontext` blijven eruit: een
// bezoeker heeft geen hexwaarden of marktintel nodig. `casuspatroon` is voor Rob's leerproces.
export const CANON_SECTIONS = ['voice', 'propositie', 'aanbod', 'method', 'project'];

// De kop boven de canon. Vier van de acht voice-notes zeggen hetzelfde als ROB_SYSTEM, want
// die regels staan daar authoritative. Zolang beide bestaan moet het model weten wie de baas
// is — en dat hoort in de prompt te staan, niet in een comment dat het model nooit ziet.
const KOP =
  'CANON-CONTEXT (R.O.B. Concepting canon — kennis raadplegen, niet letterlijk inkopiëren). ' +
  'Waar deze notes iets zeggen over toon, modus of verboden formuleringen, herhalen ze het ' +
  'HARD KADER en de instructies hierboven; bij verschil geldt altijd wat hierboven staat:';

/**
 * Stelt de context samen die achter ROB_SYSTEM wordt geplakt.
 * Harde feiten komen bovenaan, zodat een correctie zwaarder weegt dan de lopende tekst.
 * @param {object} bundle - geparste rob-canon-bundle.json
 * @returns {string} lege string als er niets bruikbaars in de bundle zit
 */
export function buildCanonContext(bundle) {
  if (!bundle || !bundle.notes_by_type) return '';

  const blocks = CANON_SECTIONS
    .map(type => (bundle.notes_by_type[type] || [])
      .map(n => `## ${n.title}\n${n.content}`).join('\n\n'))
    .filter(Boolean)
    .join('\n\n---\n\n');

  let context = blocks ? `\n\n---\n\n${KOP}\n\n${blocks}` : '';

  if (bundle.critical_facts) {
    context = `\n\n---\n\nHARDE FEITEN (gaan vóór op alles hieronder; bij twijfel volg deze):\n\n${bundle.critical_facts}${context}`;
  }

  return context;
}
