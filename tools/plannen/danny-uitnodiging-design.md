# Danny's uitnodiging voor de vervolgintake — ontwerp

## Doel

Franks expertbeoordeling eindigt nu bij een voorbereid contactmoment. De demo moet daarna
aantonen dat het persoonlijke gesprek werkelijk vooraf gaat aan het traject: Frank rondt het
gesprek zelf af, verstuurt daarna pas een uitnodiging, en Danny opent die uitnodiging achter
een beveiligde link. Danny ziet daar wat er van hem gevraagd wordt en wat het uitdrukkelijk
nog niet is.

## Goedgekeurde flow

1. Frank heeft persoonlijk contact voorbereid (bestaande stap, ongewijzigd).
2. Frank bevestigt zelf dat het gesprek is gevoerd en dat verwachtingen en kosten zijn
   besproken. Zonder die bevestiging is er geen uitnodiging.
3. Pas daarna kan Frank de uitnodiging voor de vervolgintake versturen. De uitnodiging
   opent Danny's perspectief; er wordt niets werkelijk verzonden.
4. Danny ziet eerst uitsluitend de beveiligde link met de afzender en de reden. De inhoud
   blijft afgeschermd tot hij hem zelf opent — dezelfde grens als Franks vergrendelscherm.
5. Na openen ziet Danny drie dingen afzonderlijk:
   - wat in het gesprek met Frank is afgesproken;
   - welke documenten straks gevraagd worden — actuele cijfers en liquiditeit, volledig
     schuldenoverzicht, crediteuren met zekerheden en termijnen;
   - welke toestemmingen straks gevraagd worden, en waarvoor die wél en niet gelden.
6. Danny stemt expliciet in met het starten van de vervolgintake.
7. De uitkomst is uitsluitend dat de intake klaarstaat. Geen overeenkomst, geen
   documenttoegang, geen routebesluit, geen juridisch oordeel.

## Schermregie

Franks kant blijft binnen de bestaande `.frank-contact-decision`-sectie; de gespreksafronding
en de uitnodiging zijn twee opeenvolgende toestanden in dat blok, geen nieuw scherm. De
header van de werkruimte gaat van `Expertwerkruimte` naar `Beveiligde expertwerkruimte`,
consistent met `Open beveiligde melding` op de meldingsstap.

Danny's uitnodiging is een zelfstandig scherm met één leeslijn: afzender en reden bovenaan,
daarna het afgesproken kader, dan de gevraagde documenten en toestemmingen naast elkaar op
desktop en onder elkaar op 390 px. De primaire kleur markeert uitsluitend de eerstvolgende
actie. Cyaan blijft herkomst en systeemstatus. Rood komt op dit scherm niet voor — er is hier
geen urgentie te melden, alleen een kader.

## Sessiestaat en gebeurtenissen

De bestaande lokale `PocSession` krijgt vier velden:

- `frankContactHeld`;
- `frankIntakeInvited`;
- `dannyInvitationOpened`;
- `dannyIntakeAccepted`.

Nieuwe gebeurtenissen zijn append-only:

- `frank_personal_contact_held`;
- `frank_full_intake_invited`;
- `danny_invitation_opened`;
- `danny_full_intake_accepted`.

De POC verstuurt geen e-mail, WhatsApp, afspraak, link of dossiertoegang, en schrijft niets
naar Supabase of het R.O.B.-chatarchief.

## Grenzen

- WHOA komt in beide schermen nergens voor, ook niet als kandidaat of overweging.
- De uitnodiging noemt geen overeenkomst, geen documenttoegang en geen route als vastgesteld.
- De documenten worden aangekondigd, niet opgevraagd. Er is in deze ronde geen upload.
- De bestaande v1-schermen `ondernemer` en `toestemming` blijven ongewijzigd in de route
  staan. Of de volledige intake die stappen later vervangt, is een openstaande beslissing en
  wordt hier niet vooruitgenomen.

## Acceptatie

- De uitnodiging is aantoonbaar niet beschikbaar voordat Frank het gesprek heeft afgerond.
- Danny ziet de inhoud van de uitnodiging pas nadat hij de beveiligde link zelf heeft geopend.
- Gevraagde documenten en gevraagde toestemmingen staan als afzonderlijke blokken, niet
  vermengd.
- Na Danny's instemming meldt het scherm uitsluitend dat de intake klaarstaat.
- Desktop en 390 px blijven leesbaar en volledig toetsenbordbedienbaar.
