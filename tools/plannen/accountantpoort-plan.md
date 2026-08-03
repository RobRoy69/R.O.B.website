# Accountantpoort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw de accountantpoort als derde oppervlak van de keten — sober professioneel, volledig gesimuleerd, met de belangenverklaring als grendel voor de aanlevering.

**Architecture:** Eigen namespace `.ra-poort` in `ervaring/ervaring.css` en eigen renderer in `ervaring/ervaring.js`, naast (niet in plaats van) de v1-stap `accountant`. Casusgegevens komen uit `ervaring/whoa-demo-pack.json`; geen inhoud in code. `tools/verify-whoa-poc.mjs` bewaakt de grenzen.

**Tech Stack:** Vanilla JavaScript, template strings, CSS, Node-contracttest, Netlify static build.

---

### Task 1: Casusgegevens in de fixture

**Files:**
- Modify: `ervaring/whoa-demo-pack.json`

- [x] `case.accountant.identity` — naam, kantoor, plaats, functie, relatie sinds 2015.
- [x] `case.accountant.position` — eigen declaraties, oudste termijn, eerdere schriftelijke signalen, belangenverklaring.
- [x] `case.accountant.figures` — zes cijferregels die naar een formeel traject wijzen zonder het te noemen.
- [x] Versie naar 2.2.0, `checkedAt` bijwerken, `fictional` en `publicSafe` ongemoeid.

### Task 2: Contracten test-first rood

**Files:**
- Modify: `tools/verify-whoa-poc.mjs`

- [ ] Falende controle voor route `accountantpoort` met `accountant_portal_opened` en `accountant_supplement_submitted`.
- [ ] Falende controle dat de belangenverklaring de aanlevering grendelt.
- [ ] Falende controle dat de poort de vrijgegeven stukken én de grens van wat niet wordt gedeeld toont.
- [ ] Falende controle dat het woord WHOA en elk label voor de zwaarte van het dossier ontbreken.
- [ ] Falende controle voor `.ra-poort` in de stylelaag.
- [ ] Run `node tools/verify-whoa-poc.mjs` en bevestig precies vijf nieuwe bevindingen.

### Task 3: Entree, grondslag en grendel

**Files:**
- Modify: `ervaring/ervaring.js`

- [ ] `accountantpoort` toevoegen aan `ROUTE`, rolmapping en renderers, ná `vervolgintake`.
- [ ] `raOpened`, `raDisclosed`, `raDelivered`, `raSubmittedAt` in `newSession()`.
- [ ] Entree met wederzijdse identificatie en metarijen als formele kennisgeving.
- [ ] Grondslag: Danny's toestemming met moment, de drie vrijgegeven stukken, en expliciet wat niet wordt gedeeld.
- [ ] Belangenverklaring als grendel; registreer `accountant_interest_disclosed`.

### Task 4: Aanlevering en terugkoppeling

**Files:**
- Modify: `ervaring/ervaring.js`

- [ ] Vier stukken met status; elk levert bron en moment, registreer `accountant_document_supplied`.
- [ ] Zes cijferregels uit de fixture, leesbaar als wat hij direct bij de hand heeft.
- [ ] Het ontbrekende stuk blijft als ontbrekend zichtbaar.
- [ ] Afsluiten met voorbehoud en terugkoppelverzoek; registreer `accountant_supplement_submitted`.
- [ ] Ingang vanuit de vervolgintake zodra Frank heeft gevalideerd.

### Task 5: Schermregie en publicatie

**Files:**
- Modify: `ervaring/ervaring.css`
- Modify: `ervaring/index.html`

- [ ] `.ra-poort` als sobere laag: Arial, `#1F4E79`, gebroken wit, smalle kolom, 3 px radius, geen iconen.
- [ ] Eén kolom op 390 px; tabellen scrollen binnen hun eigen kader.
- [ ] Assetversie verhogen in beide verwijzingen.
- [ ] Run de poorten, de sabotagevariant, `node --check`, `npm run deploy` en `git diff --check`.
- [ ] Doorloop in de browser op desktop en 390 px, meet contrast, en push naar PR 23.
