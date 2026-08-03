# Max-poort vervolgintake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw de dynamische Max-poort waarin een eenmalige autorisatiecode een geleide, deterministische aanlevering opent met automatisch afvinkend documentpaneel.

**Architecture:** Eigen namespace `.max-poort` in `ervaring/ervaring.css`, eigen renderer in `ervaring/ervaring.js`. Geen hergebruik van de eerste-intakechat of `.ai-composer`. Toestanden lokaal en append-only gelogd; `tools/verify-whoa-poc.mjs` bewaakt de gedragscontracten.

**Tech Stack:** Vanilla JavaScript, template strings, CSS, Node-contracttest en Netlify static build.

---

### Task 1: Leg de contracten test-first vast

**Files:**
- Modify: `tools/verify-whoa-poc.mjs`

- [ ] Falende controle voor route `vervolgintake` met `vervolgintake_code_accepted` en `vervolgintake_dossier_ready`.
- [ ] Falende controle dat de gesloten poort ontvangst, eerste instructie en een vervaagde code in de ingang heeft.
- [ ] Falende controle dat geen stap ontvouwt zonder geldige code, en dat een tussenvraag de voortgang niet verschuift.
- [ ] Falende controle voor `.max-poort` in de stylelaag en de eigen namespace.
- [ ] Run `node tools/verify-whoa-poc.mjs` en bevestig precies vier nieuwe bevindingen.

### Task 2: Bouw de gesloten poort

**Files:**
- Modify: `ervaring/ervaring.js`

- [ ] Voeg `vervolgintake` toe aan `ROUTE`, rolmapping en renderers, ná `danny-uitnodiging`.
- [ ] Voeg `poortUnlocked`, `poortDelivered`, `poortLog` en `poortCodeError` toe aan `newSession()`.
- [ ] Render ontvangst plus eerste instructie, en de chatingang met de code vervaagd als voorgevulde waarde.
- [ ] Accepteer de juiste code, registreer `vervolgintake_code_accepted` en ontvouw de eerste stap.
- [ ] Weiger een verkeerde code vriendelijk en registreer `vervolgintake_code_rejected`.
- [ ] Open de poort vanuit de bevestigde uitnodiging met een expliciete knop.

### Task 3: Bouw de geleide aanlevering

**Files:**
- Modify: `ervaring/ervaring.js`

- [ ] Definieer de drie stappen met motivering van de volgorde en een gesimuleerde bestandsnaam.
- [ ] Laat elke stap een gesimuleerde upload opleveren, registreer `vervolgintake_document_delivered` en vink rechts automatisch af.
- [ ] Laat vrije tekst een vast antwoord geven op de huidige stap, registreer `vervolgintake_question_asked` en verschuif de voortgang niet.
- [ ] Sluit af met het dossier dat klaarstaat en registreer `vervolgintake_dossier_ready`.

### Task 4: Schermregie en publicatie

**Files:**
- Modify: `ervaring/ervaring.css`
- Modify: `ervaring/index.html`

- [ ] Bouw `.max-poort` als eigen laag: chatingang onderaan, ontvouwende stappen erboven, documentpaneel rechts dat pas na de poort verschijnt.
- [ ] Eén kolom op 390 px, documentpaneel dan boven de ingang.
- [ ] Verhoog de assetversie in beide verwijzingen.
- [ ] Run `node tools/verify-whoa-poc.mjs`, de sabotagevariant, `node --check ervaring/ervaring.js`, `npm run deploy` en `git diff --check`.
- [ ] Doorloop de poort in de browser op desktop en 390 px, meet contrast, en push naar PR 23.
