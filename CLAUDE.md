# Werkregels voor deze repo

`README.md` beschrijft hoe de site in elkaar zit. Dit bestand beschrijft hoe eruit
gepubliceerd wordt. Wie hier iets maakt dat een bezoeker ziet — een pagina, een bericht, een
video, een carrousel, een paper — houdt zich aan wat hieronder staat.

---

## Regel: publicatiemateriaal is levendig en menselijk, en blijft corporate

Vastgesteld door Rob op 2026-07-31. Geldt op **elk vlak**: site, `/nieuws/`, whitepapers,
LinkedIn, video, scan, mail.

Materiaal mag warmer, levendiger en menselijker dan het nu is. Het mag **niet** losser worden
in toon of slordiger in vorm. De site bepleit herleidbaarheid; hij mag daar niet stijf van
worden, maar hij mag er ook niet los van raken.

Praktisch betekent dat drie dingen.

**Een mens is zichtbaar.** Rob's naam, Rob's stem, Rob's gezicht. Niet "wij bij R.O.B.
Concepting". Waar een keuze is tussen een instituut en een persoon, wint de persoon — dat is
ook wat het onderzoek hieronder zegt, maar het is vooral wat deze onderneming ís.

**Warmte zit in de uitvoering, niet in de taal.** Geen uitroeptekens, geen "spannend", geen
sales-energie. De levendigheid komt uit ruimte, ritme, beeld, kleur en een herkenbare
menselijke observatie — niet uit bijvoeglijke naamwoorden. De taal-wet blijft onverkort:
geen systeemtaal naar bezoekers, en geen woord meer dan nodig.

**Corporate karakter is de bodem, niet het plafond.** Strak raster, rechte hoeken, mono voor
labels, DM Sans voor tekst. Daarbinnen mag het ademen. Wie twijfelt of iets te los wordt:
zou dit stuk naast een cijfer met een controledatum kunnen staan zonder dat het gek oogt? Zo
niet, dan is het te los.

### Wat dit uitsluit

- Stockbeeld van juichende teams, handdrukken, abstracte netwerk-illustraties.
- AI-beeld dat als AI-beeld leest. Dit is een site over gezag over kennis; herkenbaar
  gegenereerd beeld ondergraaft precies dat.
- Emoji in lopende tekst op de site. In een LinkedIn-caption is het Rob's keuze.
- Kleur die niet in de schaal hieronder staat.

---

## De kleurschaal

| Token | Hex | Waarvoor |
|---|---|---|
| `--screen` | `#0e1525` | donkere vlakken: hero, topbar, video-omlijsting |
| `--dark` | `#0d0d1a` | primaire donkere ondergrond |
| `--purple` | `#001a4d` | tekst en lijnen op licht (navy, ondanks de naam) |
| `--cyan` | `#0fa8cb` | het accent: links, labels, actieve staat |
| `--red` | `#e8391e` | het spaarzame accent: één streep, één punt, nooit een vlak |
| `--cream` | `#e8e4dc` | paginagrond |
| `--paper` | `#f4f1ec` | kaarten en panelen; geldig document |
| `--paper-aging` | `#d5cfc6` | verlopend document |
| `--paper-old` | `#b9b2a8` | achtergebleven document |
| `--muted` | `#7a6e85` | bijschrift, metadata |

**Rood is een zeldzaam accent.** Eén element per scherm, hooguit. Het is de enige kleur die
alarm kan betekenen; wie hem als decoratie gebruikt, kan hem later niet meer als signaal
gebruiken.

**Warmte haal je uit de schaal zelf**, niet uit een nieuwe kleur: meer `--cream` en
`--paper`, minder wit; grotere regelafstand; ruimte om een kop. De schaal is al warm — cream
en paper zijn geen wit, en dat is met opzet.

### Eén publieke bron voor de schaal

`media/merk.css` is de gedeelde publieke merklaag. Pagina-eigen CSS regelt alleen layout en
functionaliteit. Wie een kleur of logo-uitvoering nodig heeft, gebruikt die laag en de
goedgekeurde bestanden in `media/logo/`; er komt geen nieuwe lokale kleurschaal naast.

---

## Regel: klantmateriaal in de besloten demozone valt buiten de merkkeuring

Vastgesteld 2026-08-05, bij het plaatsen van de drie masterpresentaties. Onder
`ervaring/presentaties/` staat materiaal dat R.O.B. *voor een klant* heeft gemaakt en in de
besloten, geïndexeerde-noch-gearchiveerde demozone toont: presentaties in de vormtaal van de
klant of van het gepresenteerde systeem, niet in die van R.O.B. Daar horen geen R.O.B.-lockup,
geen merklaag en geen afsluiter — dat zou het klantmerk overschrijven met het eigen merk,
precies wat een concepting-bureau niet doet.

De keuringen (`verify-merk` en `test-merk`) slaan die ene map daarom over, met verwijzing naar
deze regel. De grens is de map, niet het bestandstype: al het overige onder `ervaring/` —
de demonstratie zelf — blijft gewoon binnen de keuring. Wat hier landt is altijd noindex en
bereikbaar via het eindscherm van de demonstratie, nooit via de site zelf.

---

## Wat het onderzoek zegt (2026-07-31)

Nagetrokken op de datum hierboven. De hardheid verschilt per bron en dat staat erbij — een
regel over herleidbaarheid die zelf op marketingblogs leunt, is zijn eigen tegenvoorbeeld.

**Vastgesteld, primaire bron.** Het Edelman–LinkedIn *B2B Thought Leadership Impact Report*
(2025, zevende editie, bijna 2.000 professionals) meet twee dingen die hier direct gelden.
Ten eerste vertrouwen beslissers inhoudelijk werk meer dan marketingmateriaal of
productbladen. Ten tweede bestaat de koopgroep grotendeels uit **verborgen kopers** — finance,
legal, compliance, inkoop — die niet in beeld zijn maar wel meebeslissen; 63 procent van hen
besteedt meer dan een uur per week aan zulk werk, en 81 procent zegt dat goed werk hun een
vraagstuk laat zien dat ze zelf nog niet hadden benoemd.

Wat daaruit volgt voor dit materiaal: **elke post moet op zichzelf te begrijpen zijn door
iemand die je niet kent en die je niet zocht.** Dat is precies wat het publicatieplan al
voorschrijft ("wie niets doorklikt, heeft toch iets gekregen") — het onderzoek geeft de reden
erbij.

**Richtinggevend, secundaire bronnen.** Uit de vakpers en bureau-onderzoek van 2026 komt
consistent terug dat oorspronkelijk eigen onderzoek het best presteert, dat AI-antwoorden
citaten toekennen aan werk met eigen waarneming erin, en dat op LinkedIn een persoonlijk
profiel meer bereik heeft dan een bedrijfspagina. Dat sluit aan bij wat hier al staat, maar
het zijn geen metingen die ik heb kunnen natrekken.

**Niet overgenomen.** Ik ben cijfers tegengekomen over kleur en vertrouwen — "42 procent meer
vertrouwd bij deep teal met koper", "90 procent van het oordeel valt in 90 seconden op kleur
alleen". Beide staan op bureau-blogs zonder verwijzing naar een meting. Ze klinken bruikbaar
en ze zijn precies het soort bewering waar de whitepapers over gaan. **Ze zijn hier niet
gebruikt en horen niet in het register** tenzij iemand de primaire bron vindt.

---

## Toepassing per vlak

**Het ritme geldt overal.** Vastgesteld door Rob op 2026-07-31: elke pagina opent donker,
leest licht en sluit donker. Dat is `.afsluiter` in `media/merk.css` — één definitie, altijd
een `<div>` en nooit een `<section>`, want een `<footer>` binnen een sectie-element verliest
zijn `contentinfo`-landmark. Een eerdere versie van deze tabel zei dat de whitepapers
"blijven zoals ze zijn"; dat is achterhaald.

De homepage doet niet mee: die is geen schuivend document maar een applicatie met vijf panelen
en zeven donkere vlakken. Een afsluiter onderaan zou daar niets afsluiten.

| Vlak | Wat "levendiger en menselijker" hier betekent |
|---|---|
| `/nieuws/` | Beeld of video bij een bericht is de regel, niet de uitzondering. Ondertiteling altijd — er wordt zonder geluid gekeken. |
| Whitepapers | Lange lijn, geen opsmuk — maar wél het ritme: donker openen, licht lezen, donker sluiten. |
| LinkedIn | Rob's persoonlijke profiel, niet de bedrijfspagina. Link in de eerste reactie, naar de eigen site. |
| Video | Verticaal waar het voor de feed is; ondertiteld; een menselijke opening in plaats van een titelkaart. |
| Scan en mail | Directe aanspreekvorm, korte zinnen, geen systeemtaal. |

---

## En de regel onder alle regels

Wat hier gemaakt wordt, moet kunnen wat de papers bepleiten. Een bewering krijgt een bron en
een datum, een correctie wordt zichtbaar gemaakt in plaats van weggepoetst, en een getal dat
te tellen valt wordt geteld en niet ingetypt. Materiaal dat dat niet doet, is geen
publicatiemateriaal van dit huis — hoe goed het er ook uitziet.
