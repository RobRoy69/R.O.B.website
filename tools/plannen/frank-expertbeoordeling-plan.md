# Frank Expertbeoordeling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw expliciete zoektoestemming, automatische managementoverdracht en Franks mensgestuurde expertwerkruimte als één aantoonbare demo-flow.

**Architecture:** De bestaande deterministische sessie en renderfuncties in `ervaring/ervaring.js` blijven leidend. Nieuwe toestanden zijn lokaal en append-only gelogd; `tools/verify-whoa-poc.mjs` bewaakt de gedragscontracten en de browserflow valideert de schermregie.

**Tech Stack:** Vanilla JavaScript, template strings, CSS, Node-contracttest en Netlify static build.

---

### Task 1: Leg de drie nieuwe contracten test-first vast

**Files:**
- Modify: `tools/verify-whoa-poc.mjs`

- [ ] Voeg een falende controle toe voor de toestemmingstekst en `search_permission_confirmed` vóór de `role: 'search'`-stap.
- [ ] Voeg een falende controle toe voor `management_projection_auto_opened` en de automatische overgang na intakeverzending.
- [ ] Voeg een falende controle toe voor route `frank-review`, de drie informatiecategorieën, AI-correctie en persoonlijk contact.
- [ ] Run `node tools/verify-whoa-poc.mjs` en bevestig precies drie nieuwe bevindingen.

### Task 2: Maak zoeken aantoonbaar toegestaan

**Files:**
- Modify: `ervaring/ervaring.js`

- [ ] Voeg vóór de zoekstap een AI-vraag en Danny's gesimuleerde instemming toe aan `CHAT_DEMO`.
- [ ] Registreer `search_permission_confirmed` wanneer de instemmingsregel verschijnt.
- [ ] Laat de zoekanimatie en aanbeveling verder ongewijzigd.
- [ ] Run `node tools/verify-whoa-poc.mjs` en bevestig dat alleen de andere twee contracten rood blijven.

### Task 3: Start management automatisch na contacttoestemming

**Files:**
- Modify: `ervaring/ervaring.js`

- [ ] Wijzig de ontvangsttekst naar een korte, zichtbare overgang met fallbackknop.
- [ ] Plan na succesvolle submit eenmaal een overgang naar `max-management` wanneer de gebruiker nog op `max-intake` staat.
- [ ] Registreer `management_projection_auto_opened` en voorkom dubbele navigatie na handmatig doorklikken.
- [ ] Run de POC-contracttest en bevestig dat alleen het expertcontract rood blijft.

### Task 4: Bouw Franks expertwerkruimte

**Files:**
- Modify: `ervaring/ervaring.js`
- Modify: `ervaring/ervaring.css`
- Modify: `ervaring/index.html`

- [ ] Voeg `frank-review` aan route, rolmapping en renderer toe.
- [ ] Laat `Neem beoordeling aan` `frank-review` vrijgeven en openen.
- [ ] Render bevestigde feiten, AI-afleidingen, ontbrekende gegevens, contact en Agora-herkomst als afzonderlijke blokken.
- [ ] Voeg een expliciete correctieactie toe die `frank_ai_inference_corrected` registreert.
- [ ] Maak persoonlijk contact pas beschikbaar na correctie en registreer `frank_personal_contact_prepared`.
- [ ] Toon daarna uitsluitend dat persoonlijk contact is voorbereid; noem geen overeenkomst of route als vastgesteld.
- [ ] Voeg responsive CSS toe en verhoog de assetversie.
- [ ] Run `node tools/verify-whoa-poc.mjs`, `node --check ervaring/ervaring.js` en `git diff --check`.

### Task 5: Valideer en publiceer in de bestaande PR

**Files:**
- Test: volledige bestaande repository

- [ ] Run `npm run deploy` en vereis exitcode 0.
- [ ] Doorloop de route in de browser op desktop en 390 px.
- [ ] Controleer de volgorde toestemming → zoeken → intake → automatisch management → Frank → expertwerkruimte → persoonlijk contact.
- [ ] Commit uitsluitend de ervaring, POC-test en deze twee interne plannen.
- [ ] Push `agent/whoa-poc-v2-1` en wacht op de GitHub- en Netlify-controles van PR 23.
