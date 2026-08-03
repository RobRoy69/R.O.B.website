# Accountantpoort — ontwerp

## Doel

Danny gaf toestemming dat Frank zijn accountant om aanvullende cijfers mag vragen. Deze poort
laat zien wat daarachter zit: de accountant wordt **gericht** bevraagd, ziet precies wat Danny
heeft vrijgegeven en niets meer, en levert aan onder vermelding van zijn eigen positie.

Dit is het derde oppervlak van dezelfde keten, na Danny's uitnodiging en de vervolgintake.

## Sobere professionele taal — bewust een andere deur

De 20voor12-conventie voor instrumenten gericht op beroepsbeoefenaren (`20voor12/CLAUDE.md`
sectie 3 en `_docs/feedback_visuele_taal_professionals.md`) schrijft voor: Arial, donkerblauw
`#1F4E79`, gebroken wit, smalle kolom, hoogstens 3 px radius, geen iconen, eyebrow in kapitalen
boven een nuchtere kop, geen hero. Rob noemde dat "zacht dwingend": marketinguitstraling wekt
bij accountants juist scepsis.

Diezelfde conventie zegt expliciet: **niet harmoniseren.** De ondernemersdeur mag warm zijn, de
professionele deur sober. Dat verschil is architectuur, geen slordigheid.

Daarom breekt deze poort visueel met Danny's donkere Max-schermen. Het contrast is zelf het
argument: één systeem, twee deuren, twee registers. De kleuren komen dus niet uit de negen
R.O.B.-tokens — net als het goud van Max, want `/ervaring/` simuleert systemen van andere
partijen en niet het merk R.O.B. zelf.

## Wat er niet mag staan

Twee dingen moeten volledig uit de context blijken en mogen nergens benoemd worden.

**De route.** Alles wijst naar een formeel traject — een betalingsregeling die al één keer
opnieuw is vastgesteld, kredietruimte die is teruggebracht, een betaaltermijn die van 30 naar
74 dagen liep terwijl de omzet stabiel bleef, en een ontbrekende waarderingsonderbouwing
waarzonder reorganisatie- en liquidatiewaarde niet vergeleken kunnen worden. Het woord zelf komt
er niet in voor; `verify-whoa-poc` blokkeert dat ook.

**Dat dit een moeizaam dossier is.** Blijkt uit gedateerde feiten, niet uit een label: de
accountant heeft zelf drie declaraties openstaan waarvan de oudste vijf maanden, hij heeft
continuïteit twee keer eerder schriftelijk aan de orde gesteld, en hij kan de
continuïteitsveronderstelling niet meer zonder onderbouwde scenariovergelijking laten staan.
Woorden als "hoofdpijndossier", "moeizaam" of "al jaren" staan er niet.

## Flow

Volledig gesimuleerd en deterministisch. Geen invoer die iets doet, geen AI-aanroep.

1. **Entree — wederzijdse identificatie.** Links wie het vraagt: Frank van Meenen, zijn rol, en
   metarijen in de vorm van een formele kennisgeving — *Wat dit niet is · Datapositie ·
   Tijdsbesteding · Waarop dit rust*. Rechts wie antwoordt: Gerard Dulk AA, kantoor, en sinds
   wanneer hij deze onderneming doet.
2. **Grondslag.** Danny's toestemming met moment, en precies de drie stukken die hij vrijgaf.
   Daaronder expliciet wat de accountant **niet** krijgt.
3. **Belangenverklaring.** Voordat hij iets aanlevert, legt hij zijn eigen positie vast: hij is
   zelf schuldeiser. Dit is een grendel, geen vinkje — zonder verklaring gaat de aanlevering
   niet open.
4. **Aanlevering.** De vier stukken uit de fixture met hun status, plus zes cijferregels die hij
   direct bij de hand heeft. Elk stuk krijgt bron en moment.
5. **Voorbehoud en terugkoppeling.** Zijn observatie over de continuïteitsveronderstelling, en
   het verzoek om over de uitkomst geïnformeerd te worden — waarvan de grond zijn eigen
   vordering is.

## Grenzen

- Geen routebesluit, geen oordeel over levensvatbaarheid, geen juridische conclusie.
- De accountant beoordeelt continuïteit, volledigheid en overdraagbaarheid; hij beslist niets.
- Zijn belang moet zichtbaar zijn, juist omdat het zijn beeld kan kleuren.
- Niets wordt verzonden of opgeslagen; alle gegevens zijn synthetisch.

## Sessiestaat en gebeurtenissen

- `raOpened`, `raDisclosed`, `raDelivered` (lijst), `raSubmittedAt`.

Nieuwe gebeurtenissen: `accountant_portal_opened`, `accountant_interest_disclosed`,
`accountant_document_supplied`, `accountant_supplement_submitted`.

## Acceptatie

- Zonder belangenverklaring is er niets aan te leveren.
- De accountant ziet de drie vrijgegeven stukken en de expliciete grens van wat hij niet krijgt.
- Elk aangeleverd stuk draagt bron en status; de ontbrekende blijft als ontbrekend zichtbaar.
- Nergens het woord WHOA, nergens een label voor de zwaarte van het dossier.
- Desktop en 390 px leesbaar en toetsenbordbedienbaar, contrast overal ten minste 4,5:1.
