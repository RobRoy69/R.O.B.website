# Max-OS Managementoverdracht Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maak het nieuwe managementsignaal opvallend tot opening, verzamel een expliciet vrijgegeven contactmogelijkheid en toon vóór Franks telefoon een traceerbare Agora-overdracht.

**Architecture:** De bestaande sessiestaat, renderfuncties en eventbindingen in `ervaring/ervaring.js` blijven leidend. Nieuwe UI blijft deterministisch en lokaal; `tools/verify-whoa-poc.mjs` bewaakt de contracten en de bestaande browserflow levert de visuele acceptatie.

**Tech Stack:** Vanilla JavaScript, HTML-template strings, CSS, Node-contracttest, Netlify static build.

---

### Task 1: Leg de drie gedragscontracten test-first vast

**Files:**
- Modify: `tools/verify-whoa-poc.mjs`

- [ ] **Step 1: Write the failing contract checks**

Voeg afzonderlijke fouten toe wanneer deze contracten ontbreken:

```js
if (!js.includes("management-signal ${opened ? 'selected' : 'unread'}") || !css.includes('@keyframes management-signal-attention')) {
  errors.push('het nieuwe managementsignaal vraagt niet zichtbaar aandacht tot opening');
}
if (!js.includes("id: 'contact'") || !js.includes('contact-consent') || !js.includes('contactPhone') || !js.includes('contactEmail')) {
  errors.push('de eerste intake verzamelt geen expliciet vrijgegeven contactmogelijkheid');
}
if (!js.includes('management-transfer-screen') || !js.includes('Agora maakt overdrachtslog') || !js.includes('Open Franks mobiele melding')) {
  errors.push('de geleide Agora-overdracht naar Frank ontbreekt');
}
```

- [ ] **Step 2: Verify RED**

Run: `node tools/verify-whoa-poc.mjs`

Expected: drie nieuwe bevindingen en exitcode 1.

### Task 2: Bouw contactvoorkeur en expliciete toestemming

**Files:**
- Modify: `ervaring/ervaring.js`
- Modify: `ervaring/ervaring.css`

- [ ] **Step 1: Extend the session state**

Voeg aan `newSession()` toe:

```js
contactPhone: '',
contactEmail: '',
contactConsent: false,
contactError: '',
managementTransferOpen: false,
```

- [ ] **Step 2: Add the fifth intake question**

Voeg `contact` toe aan `MAX_INTAKE_QUESTIONS` met opties `telefoon`, `email` en `beide`. Toon in het overzicht een vijfde rij `Contactvoorkeur`.

- [ ] **Step 3: Render the contact form after all five questions**

Toon alleen de velden die bij de keuze horen, met echte labels, `type="tel"`, `type="email"`, een toestemmingscheckbox en de knop `Bevestig contact en verstuur intake`.

- [ ] **Step 4: Validate before submission**

De submit-handler accepteert telefoon wanneer minimaal zeven cijfers aanwezig zijn en e-mail wanneer `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` slaagt. Bij ontbrekende toestemming of een ongeldig vereist veld wordt `contactError` gezet en opnieuw gerenderd; anders worden contactgegevens en toestemming in de sessie vastgelegd en wordt de bestaande managementprojectie vrijgegeven.

- [ ] **Step 5: Verify GREEN for the contact contract**

Run: `node tools/verify-whoa-poc.mjs`

Expected: alleen de signaal- en overdrachtsbevinding blijven rood.

### Task 3: Bouw het ongelezen signaal en de geleide overdracht

**Files:**
- Modify: `ervaring/ervaring.js`
- Modify: `ervaring/ervaring.css`

- [ ] **Step 1: Mark and animate only the unread signal**

Gebruik `unread` vóór opening en `selected` na opening. Animeer uitsluitend rand, schaduw en een minimale verticale beweging; schakel de animatie uit binnen `prefers-reduced-motion: reduce`.

- [ ] **Step 2: Show contact separately in management detail**

Voeg naast `Hulpvraag` en `Nog nodig` een blok `Contact opnemen` toe met het vrijgegeven kanaal en de fictieve contactgegevens. Toon deze gegevens nooit op het inboxkaartje.

- [ ] **Step 3: Replace the inline handoff with a transfer screen**

Na `Zet door naar Frank` worden `managementSignalAssigned` en `managementTransferOpen` waar. `renderMaxManagement()` toont dan een zelfstandig `management-transfer-screen` met:

```text
Managementbesluit geregistreerd
Agora maakt overdrachtslog
Privacyveilige melding gereed
```

De schermgrens noemt expliciet: geen expertoordeel, geen routebesluit, geen documenttoegang en geen accountantstoestemming.

- [ ] **Step 4: Add explicit navigation**

`Open Franks mobiele melding` opent de bestaande Frankprojectie. `Terug naar management` sluit alleen het tussenscherm. Na terugkeer toont de toegewezen managementactie een knop om de overdracht opnieuw te bekijken zonder een tweede toewijzing te registreren.

- [ ] **Step 5: Verify GREEN**

Run: `node tools/verify-whoa-poc.mjs`

Expected: `verify-whoa-poc: groen`.

### Task 4: Cache, volledige build en visuele acceptatie

**Files:**
- Modify: `ervaring/index.html`

- [ ] **Step 1: Bump the experience asset version**

Wijzig beide querystrings naar `v=20260803-9`.

- [ ] **Step 2: Run syntax and full validation**

Run:

```powershell
node --check ervaring/ervaring.js
git diff --check
npm run deploy
```

Expected: alle commando's eindigen met exitcode 0.

- [ ] **Step 3: Verify the rendered journey**

Doorloop `/chat` tot management en controleer:

- signaal pulseert vóór openen en niet erna;
- telefoon/e-mail/beide tonen de juiste velden en blokkeren verzending zonder toestemming;
- management toont de gekozen contactmogelijkheid;
- toewijzing opent het Agora-tussenscherm;
- terugkeren en vervolgens Franks telefoon openen werkt;
- desktop 1366 px en mobiel 390 px hebben geen horizontale uitloop;
- browserconsole bevat geen waarschuwingen of fouten.

- [ ] **Step 4: Commit and update the existing PR**

Stage uitsluitend de specificatie, dit plan, de ervaringbestanden en de POC-test. Commit met `Bouw geleide managementoverdracht naar Frank`, push `agent/whoa-poc-v2-1` en wacht op alle controles van PR 23.
