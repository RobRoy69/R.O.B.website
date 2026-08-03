# Max-poort — vervolgintake — ontwerp

## Doel

Danny's uitnodiging eindigt bij een vervolgintake die klaarstaat. Deze poort laat zien wat
daarachter zit: AI leidt de aanlevering in de juiste vorm en de juiste volgorde, en Agora legt
op de achtergrond vast wat is aangeleverd. De indruk die telt is vereenvoudiging — voor de
ondernemer die niet weet waar te beginnen, en voor de expert die anders zelf moet uitvragen.

Dit is een **eigen dynamische Max-poort**, geen variant op de eerste-intakechat. Eigen
namespace `.max-poort`, eigen schermregie.

## Goedgekeurde flow

### Gesloten

- De poort staat niet leeg: er is een ontvangst en één eerste instructie zichtbaar.
- De autorisatiecode staat vervaagd klaar in de chatingang. Danny hoeft hem niet te zoeken.
- Er is nog geen documentpaneel. Dat verschijnt pas na de poort.
- Een verkeerde code laat hem vriendelijk opnieuw proberen. Geen blokkade, geen dreiging.

### Open

- De instructies ontvouwen zich bóven de chatingang, één stap tegelijk.
- Rechts naast de chat verschijnt het documentpaneel met de drie gevraagde stukken. Het vinkt
  automatisch af zodra een stap klaar is.
- De volgorde is inhoudelijk gemotiveerd en wordt ook zo uitgelegd:
  1. actuele cijfers en liquiditeitsbeeld — zonder actueel beeld heeft de rest geen ijkpunt;
  2. volledig schuldenoverzicht — nu is er iets om het tegen af te zetten;
  3. crediteuren, zekerheden en acute termijnen — die hangen aan de schulden uit stap 2.
- Per stap een gesimuleerde upload met bestandsnaam en status. Er wordt niets werkelijk
  verzonden of opgeslagen.
- De chatingang blijft staan. Danny kan er tussendoor iets in zeggen — "Ik begrijp dit ff
  niet" — en krijgt antwoord op de stap waar hij staat. De reeks valt daar niet van om en
  begint niet opnieuw.
- Alle antwoorden zijn vast en deterministisch. Geen AI-aanroep.

### Slot

Als de drie stukken er zijn: het dossier staat klaar voor Frank. Agora heeft vastgelegd wat is
aangeleverd en waarop het rust. Geen overeenkomst, geen oordeel, geen route.

## Sessiestaat en gebeurtenissen

- `poortUnlocked`;
- `poortDelivered` (lijst met afgeronde stappen);
- `poortLog` (de ontvouwde regels, append-only);
- `poortCodeError`.

Nieuwe gebeurtenissen:

- `vervolgintake_code_accepted`;
- `vervolgintake_code_rejected`;
- `vervolgintake_document_delivered`;
- `vervolgintake_question_asked`;
- `vervolgintake_dossier_ready`.

## Grenzen

- WHOA komt nergens voor.
- Geen werkelijke upload, verzending of opslag; geen Supabase, geen chatarchief.
- De poort levert een aangeleverd dossier op, geen beoordeling en geen overeenkomst.
- De code is herkenbaar fictief.

## Acceptatie

- De gesloten poort toont ontvangst plus eerste instructie, met de code vervaagd in de ingang.
- Zonder geldige code ontvouwt geen enkele stap.
- Het documentpaneel verschijnt pas na de poort en vinkt automatisch af.
- Een tussenvraag geeft antwoord op de huidige stap en verschuift de voortgang niet.
- Het slot noemt uitsluitend dat het dossier klaarstaat.
- Desktop en 390 px blijven leesbaar en toetsenbordbedienbaar.
