# Danny's uitnodiging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw Franks menselijke gespreksafronding en Danny's beveiligde uitnodiging voor de serieuze intake als één aantoonbare vervolgstap op de expertbeoordeling.

**Architecture:** De bestaande deterministische sessie en renderfuncties in `ervaring/ervaring.js` blijven leidend. Nieuwe toestanden zijn lokaal en append-only gelogd; `tools/verify-whoa-poc.mjs` bewaakt de gedragscontracten en de browserflow valideert de schermregie.

**Tech Stack:** Vanilla JavaScript, template strings, CSS, Node-contracttest en Netlify static build.

---

### Task 1: Leg de nieuwe contracten test-first vast

**Files:**
- Modify: `tools/verify-whoa-poc.mjs`

- [ ] Voeg een falende controle toe voor `frank_personal_contact_held` en `frank_full_intake_invited`, waarbij de uitnodiging aantoonbaar ná de gespreksafronding staat.
- [ ] Voeg een falende controle toe voor route `danny-uitnodiging` met `danny_invitation_opened` en `danny_full_intake_accepted`.
- [ ] Voeg een falende controle toe voor de gevraagde documenten en de afzonderlijke toestemmingen op Danny's uitnodiging.
- [ ] Voeg een falende controle toe voor `.danny-invitation` in de stylelaag.
- [ ] Run `node tools/verify-whoa-poc.mjs` en bevestig precies vier nieuwe bevindingen.

### Task 2: Laat Frank het gesprek menselijk afronden

**Files:**
- Modify: `ervaring/ervaring.js`

- [ ] Voeg `frankContactHeld` en `frankIntakeInvited` toe aan `newSession()`.
- [ ] Laat de bestaande `.frank-contact-decision`-sectie na `frankContactPrepared` een expliciete gespreksafronding tonen met knop, en registreer `frank_personal_contact_held`.
- [ ] Toon kort wat in het gesprek is besproken en dat er nog geen overeenkomst is.
- [ ] Laat de uitnodiging pas daarna verschijnen, registreer `frank_full_intake_invited` en open `danny-uitnodiging`.
- [ ] Laat het vierde punt in de Expert AI-stappenlijst meeschakelen.
- [ ] Wijzig de werkruimtekop naar `Beveiligde expertwerkruimte`.
- [ ] Run `node tools/verify-whoa-poc.mjs` en bevestig dat alleen de uitnodigingscontracten rood blijven.

### Task 3: Bouw Danny's beveiligde uitnodiging

**Files:**
- Modify: `ervaring/ervaring.js`
- Modify: `ervaring/ervaring.css`
- Modify: `ervaring/index.html`

- [ ] Voeg `danny-uitnodiging` toe aan `ROUTE`, de rolmapping en de renderers, zonder bestaande stappen te verwijderen.
- [ ] Voeg `dannyInvitationOpened` en `dannyIntakeAccepted` toe aan `newSession()`.
- [ ] Render eerst uitsluitend de beveiligde link met afzender en reden, en registreer `danny_invitation_opened` bij openen.
- [ ] Render daarna het afgesproken kader, de gevraagde documenten en de gevraagde toestemmingen als afzonderlijke blokken.
- [ ] Laat Danny expliciet instemmen, registreer `danny_full_intake_accepted` en meld uitsluitend dat de intake klaarstaat.
- [ ] Voeg responsive CSS toe en verhoog de assetversie in beide verwijzingen.
- [ ] Run `node tools/verify-whoa-poc.mjs`, `node --check ervaring/ervaring.js` en `git diff --check`.

### Task 4: Valideer en publiceer in de bestaande PR

**Files:**
- Test: volledige bestaande repository

- [ ] Run `node tools/verify-whoa-poc.mjs --saboteer` en bevestig dat de poort bijt.
- [ ] Run `npm run deploy` en vereis exitcode 0.
- [ ] Doorloop de route in de browser op desktop en 390 px.
- [ ] Controleer de volgorde correctie → persoonlijk contact → gesprek gevoerd → uitnodiging → beveiligde link → instemming.
- [ ] Commit uitsluitend de ervaring, POC-test en deze twee interne plannen.
- [ ] Push `agent/whoa-poc-v2-1` en wacht op de GitHub- en Netlify-controles van PR 23.
