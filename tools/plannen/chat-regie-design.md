# De regie-laag — laten zien hoe reëel de neutrale chat is

**Datum:** 2026-08-04 · **Status:** ter beoordeling op deploy-preview, niet gemerged

## De vraag

Rob: "het zou interessant zijn om ergens te kunnen laten zien hoe reëel deze chat is."
De doorloop is bewust deterministisch, maar de vraag "is dit echt of toneel?" komt
gegarandeerd — zeker van Danny, die zelf het vak beheerst.

## Wat er al bleek te liggen

1. `netlify/functions/poc-intake.js` bestaat: één begrensde live AI-beurt (claude-haiku,
   temperatuur 0.2, 8,5 s timeout), met een beslisgrens-filter (`FORBIDDEN_CONCLUSION`),
   ratelimiter, en een vaste terugval die zichzelf als `mode: 'fallback'` markeert.
2. `requestFirstReflection` in ervaring.js roept die functie aan en registreert
   `first_reflection_completed` met de modus.
3. **Maar de route is dode UI**: de verstuurknop van de gespreks-composer staat hardcoded op
   `disabled` en er is geen Enter-handler op `#neutral-chat-input`. Niemand kan hem bereiken.

De bouw maakt dus zichtbaar en bereikbaar wat er al ligt; er komt geen nieuwe serverfunctie bij.

## Ontwerp

**Eén toggle op het gespreksscherm: "Wat is hier echt?"** Verschijnt pas als het script klaar
is (of de eerste ordening af is) — niet tijdens de scène, wel bij de aftiteling. Openen toont:

1. **Een korte regie-uitleg** boven het logboek: het gesprek volgt een vast script zodat elke
   doorloop gelijk en controleerbaar is; de AI-rol is geen fantasie, want dezelfde begrensde
   AI draait ook live; en de uitnodiging om dat zelf te testen.
2. **Een herkomstregel onder elk bericht**: `Regie · vast script` · `Eigen bericht` ·
   `Live · zojuist begrensd gegenereerd` · `Terugval · vast antwoord, live was niet
   beschikbaar`. De terugval doet zich nooit voor als live — een bewering draagt haar status.
3. **Eén vrij bericht.** Met de regie open komt de composer één beurt vrij. Wat er ook wordt
   getypt, het antwoord komt live uit `poc-intake`, binnen dezelfde grenzen: geen route, geen
   advies, geen uitkomst. Daarna sluit de beurt (`freeProbeUsed`), ook als de call faalde —
   anders wordt het een gratis-proberen-tot-het-lukt-knop. De toets landt in het logboek en
   dus in de terugblik op het eindscherm.

## Grenzen

- Het script zelf blijft onaangeraakt; de vaste doorloop verandert niet.
- De vrije beurt verandert de route niet: de aanbeveling staat er al, dit is een toets erna.
- Serverside gelden de bestaande grenzen ongewijzigd (lengte 10–700, fictioneel, signalering,
  ratelimiet, verboden-conclusiefilter).
- Geen WHOA in de nieuwe teksten.

## Acceptatie

- Toggle onzichtbaar tijdens het script, zichtbaar erna.
- Herkomstregels kloppen per berichttype; terugval heet terugval.
- De vrije beurt is éénmalig per sessie en werkt met en zonder bereikbare API (terugvalpad).
- `verify-whoa-poc` groen, saboteur rood, `npm run deploy` exit 0.
- Beoordeling door Rob op de deploy-preview vóór merge.
