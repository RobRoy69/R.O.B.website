# Frank expertbeoordeling — ontwerp

## Doel

De demo maakt drie overgangen logisch en mensgestuurd: de algemene AI vraagt toestemming vóór zij passende expertise zoekt, Max opent na de eerste intake automatisch de interne opvolging en Frank krijgt na aanname een volwaardig expertscherm waarin AI ordent maar hij beslist.

## Goedgekeurde flow

1. Na de probleemsamenvatting vraagt de AI: `Zal ik passende expertise zoeken die dit financieel en juridisch in samenhang kan bekijken?`
2. Danny's gesimuleerde instemming verschijnt vóór de zichtbare zoekactie. Zonder dit antwoord wordt geen aanbeveling opgebouwd.
3. Na geldige contactgegevens en aparte toestemming toont Max kort dat de intake is ontvangen. Daarna opent automatisch het managementscherm; een directe knop blijft als toegankelijke fallback zichtbaar.
4. Frank opent de privacyveilige melding, neemt de beoordeling aan en verlaat daarna de telefoonprojectie.
5. Het expertscherm toont afzonderlijk:
   - door Danny bevestigde feiten;
   - AI-afleidingen die Frank nog moet toetsen;
   - ontbrekende informatie;
   - contactgegevens die uitsluitend voor intake-opvolging zijn vrijgegeven;
   - Agora-herkomst en beslisgrenzen.
6. Frank kan één AI-afleiding nuanceren en kiest vervolgens `Eerst persoonlijk contact plannen`.
7. De uitkomst is een voorbereid contactmoment, geen overeenkomst, documenttoegang, routebesluit of juridisch oordeel.

## Schermregie

Het expertscherm is een zelfstandige desktopwerkruimte met één duidelijke mobiele kolom. Links staat de casus en herkomst, centraal de AI-geordende beoordeling en rechts de menselijke acties. De primaire kleur geeft de eerstvolgende actie aan; rood blijft uitsluitend urgentie en cyaan blijft herkomst of systeemstatus.

## Sessiestaat en gebeurtenissen

De bestaande lokale `PocSession` krijgt alleen:

- `frankCorrectionConfirmed`;
- `frankContactPrepared`.

Nieuwe gebeurtenissen zijn append-only:

- `search_permission_confirmed`;
- `management_projection_auto_opened`;
- `frank_ai_inference_corrected`;
- `frank_personal_contact_prepared`.

De POC verstuurt geen e-mail, WhatsApp, afspraak of dossierlink.

## Acceptatie

- De zoekanimatie verschijnt aantoonbaar pas na de instemmingszin van Danny.
- De intake gaat zonder tweede demonstratieklik door naar management.
- Frank komt na `Neem beoordeling aan` in de volledige expertwerkruimte.
- Een AI-afleiding blijft corrigeerbaar en wordt niet als expertoordeel getoond.
- Persoonlijk contact wordt voorbereid zonder overeenkomst of route te suggereren.
- WHOA komt in deze schermen nergens voor.
- Desktop en 390 px blijven leesbaar en toetsenbordbedienbaar.
