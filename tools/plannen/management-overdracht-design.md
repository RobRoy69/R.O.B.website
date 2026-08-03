# Max-OS managementoverdracht — ontwerp

## Doel

De eerste intake moet zichtbaar de aandacht van management vragen, voldoende contactinformatie bevatten voor menselijke opvolging en na toewijzing aan Frank aantonen wat Max-OS en Agora feitelijk vastleggen.

## Goedgekeurde flow

### 1. Nieuw signaal

- Het nieuwe signaal licht rustig op zolang `managementSignalOpened` niet waar is.
- De animatie stopt onmiddellijk en blijvend zodra management het signaal opent.
- De animatie respecteert `prefers-reduced-motion`.
- Urgentiekleur blijft een prioriteits- en onderzoeksrichting, geen uitkomst.

### 2. Contact opnemen

- De eerste intake krijgt na de vier inhoudelijke vragen een vijfde stap: contactvoorkeur.
- Danny kiest `telefoon`, `e-mail` of `beide`.
- Alleen de benodigde velden verschijnen en moeten syntactisch geldig zijn voordat de intake kan worden verzonden.
- De POC gebruikt herkenbaar fictieve gegevens en verstuurt niets extern.
- Danny geeft afzonderlijk toestemming om deze gegevens uitsluitend voor opvolging van deze intake te gebruiken.
- De managementsamenvatting toont contactmogelijkheid onder `Nog nodig`; documenten en menselijke beoordeling blijven afzonderlijk als ontbrekend zichtbaar.

### 3. Geleide overdracht naar Frank

- `Zet door naar Frank` opent eerst een zelfstandig tussenscherm; Franks telefoon opent niet automatisch.
- Het tussenscherm toont drie vastgelegde stappen:
  1. managementbesluit geregistreerd met actor, tijd en expertise;
  2. Agora-overdrachtslog gemaakt met herkomst, doel en beslisgrens;
  3. privacyveilige melding voor Frank gereedgemaakt.
- De overdracht bevat geen expertoordeel, routebesluit, documenttoegang of accountantstoestemming.
- Een expliciete knop opent daarna Franks bestaande mobiele melding.
- Terugkeren naar management blijft mogelijk zonder de toewijzing opnieuw uit te voeren.

## Sessiestaat

De bestaande `PocSession` krijgt alleen de minimaal benodigde velden:

- `contactPreference` via `maxIntakeAnswers.contact`;
- `contactPhone` en `contactEmail`;
- `contactConsent`;
- `managementTransferOpen`.

Er vindt geen serveropslag, e-mail, WhatsApp-bericht of productie-event plaats.

## Toegankelijkheid en mobiel

- Het actieve signaal blijft toetsenbordbedienbaar en krijgt geen flitsende animatie.
- Contactvelden hebben zichtbare labels, foutmeldingen en correcte invoertypen.
- Het tussenscherm is op desktop en 390 px volledig leesbaar.
- Statusveranderingen worden via een passende live-regio aangekondigd.

## Acceptatie

- Het signaal pulseert vóór openen en niet erna.
- Een intake zonder geldige gekozen contactmogelijkheid en toestemming kan niet worden verzonden.
- Management ziet hoe Danny bereikbaar is, maar contactgegevens worden niet op het publieke signaalkaartje getoond.
- Toewijzing opent het Agora-tussenscherm en pas de volgende menselijke actie opent Franks telefoon.
- De bestaande telefoonflow en alle privacygrenzen blijven werken.
