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

### Slot in twee toestanden

Het slot valt uiteen in twee toestanden, en dat is geen detail. "Aangeleverd" en "gevalideerd"
zijn verschillende beweringen, en ze mogen niet op hetzelfde moment vallen — anders claimt de
demonstratie dat de expert keek op de seconde dat de ondernemer aanleverde.

1. **Aangeleverd.** Blauwe vinkjes met bestandsnaam. Het dossier staat klaar voor de expert, en
   er staat expliciet dat er nog niets is gevalideerd zolang hij niet heeft gekeken. Een
   pulserende regel laat zien dat het in beoordeling is.
2. **Gevalideerd.** Na een korte tel arriveert de validatie van de expert: groene vinkjes met
   "Gevalideerd" onder de blauwe, en daaronder één blok met datum, tijdstempel en de naam en het
   vakgebied van de expert. Pas dan staat er dat hij alles heeft gevalideerd.

Het tijdstempel doet het bewijswerk: het laat zien dat er tijd tussen aanleveren en valideren
zat. In de demonstratie is die tijd samengeperst; in werkelijkheid duurt het uren.

Daarna nog steeds: geen overeenkomst, geen oordeel, geen routebesluit. De volgende stap ligt bij
de accountant.

De naam van de expert komt uit `EXPERT_NAME` en `EXPERT_DOMAIN`, zodat hij in deze poort niet
kan gaan driften. De oudere schermen noemen hem nog letterlijk; dat opruimen is apart werk.

## Sessiestaat en gebeurtenissen

- `poortUnlocked`;
- `poortDelivered` (lijst met afgeronde stappen);
- `poortLog` (de ontvouwde regels, append-only);
- `poortCodeError`;
- `poortAccountantConsent`;
- `poortValidatedAt` (moment van de expertvalidatie, leeg tot hij er is).

Nieuwe gebeurtenissen:

- `vervolgintake_code_accepted`;
- `vervolgintake_code_rejected`;
- `vervolgintake_document_delivered`;
- `vervolgintake_question_asked`;
- `vervolgintake_accountant_consent_given`;
- `vervolgintake_dossier_ready`;
- `vervolgintake_expert_validated`.

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
