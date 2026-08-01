# R.O.B. Concepting — website

Productie-site voor **R.O.B. Concepting** (Rob de Rooij, Concepting Expert).
Live op [rob-concepting.com](https://rob-concepting.com).

---

## Architectuur

Frontend is vanilla HTML/CSS/JS — geen framework, geen frontend-build. De Netlify Functions
gebruiken wél npm-deps (Vercel AI SDK), dus Netlify draait `npm install` bij elke build.

**Wat je hier bewerkt is niet wat er live staat.** De repo bevat de bron; `npm run bouw` stelt
daaruit `publiek/` samen en dát is de publicatiemap. Pagina's die uit het claim-register komen
(`/vragen/`, `/nieuws/`, `/bewijs/`) worden gegenereerd — die bewerk je in het register of in
de bouwer, nooit in de HTML.

Hoe er uit deze repo gepubliceerd wordt — toon, kleurschaal, wat wel en niet als beeld —
staat niet hier maar in **`CLAUDE.md`**. Dit bestand gaat over de machinerie; dat bestand
over wat de bezoeker ziet.

```
/                            ← bron
├── CLAUDE.md                # Werkregels voor publicatiemateriaal: toon, kleurschaal, bronnen
├── index.html               # Landing + transitie + 5-pane interface (geheel inline)
├── netlify.toml             # Roept npm run deploy aan + security- en cache-headers
├── package.json             # De bouwketen (bouw/deploy/pdf/rapport) + Function-deps
├── robots.txt               # SEO. sitemap.xml staat hier NIET: die wordt afgeleid
├── og-image.svg/.png        # Social preview (1200×630)
├── promptfoo.config.yaml    # Dev: persona-regressietests (deployt niet mee)
│
├── whitepapers/             # De vier papers, met de hand geschreven
│   ├── *.html               #   de papers zelf
│   ├── bestand/*.pdf        #   afgeleid — npm run pdf, nooit los bijwerken
│   └── _register.json       #   projectie uit het claim-register (niet publiek)
├── vragen/                  # AFGELEID uit de vragenpoorten — build-vragen.mjs
├── nieuws/                  # AFGELEID uit de berichtentabel — build-nieuws.mjs
│   └── concept/*.md         #   hier schrijf je een bericht, dan npm run bericht
├── kennisgezagsscan/        # JSON-gestuurde scan; vijf profielen, antwoorden blijven lokaal
├── kennisproef/             # Eén-URL kennisgereedheidstoets via veilige Function
├── demo/                    # Herbruikbare noindex demo-engine + losse merk/casuspakketten
├── beheer/                  # Berichten schrijven en vrijgeven zonder terminal
│                            #   noindex; al het gezag zit in netlify/functions/beheer.js
├── media/, werk/            # Video, portret, SVG-mockups, logo (media/ is geheel publiek)
├── merk/                    # Het merk-kit: stylesheet v2, publicatiecontract, logo-naslag
│                            #   NIET publiek — naslag/ bevat wat bewust niet geleverd wordt
│
├── tools/                   # De bouwketen: build-* maakt, verify-* bewaakt
│   ├── build-publiek.mjs    #   stelt publiek/ samen uit een INSLUITLIJST
│   ├── verify-publiek.mjs   #   tien controles op wat er werkelijk gepubliceerd wordt
│   ├── build-pdf.mjs        #   print de papers via het DevTools-protocol (lokaal)
│   ├── rapport.mjs          #   npm run rapport — de stand, structureel gemeten
│   └── lib/                 #   gedeeld: datum, entiteiten, status, nesting
│
├── netlify/functions/       # chat, contact, whatsapp, whitepaper(-confirm)
│   └── lib/                 #   mail, token, archief, papers, systeemprompt
│
└── publiek/                 ← AFGELEID, staat in .gitignore. Dit is wat Netlify uitserveert
```

### Twee regels die hieruit volgen

**Afgeleid nooit met de hand bijwerken.** `publiek/`, `sitemap.xml`, `llms.txt`, `bewijs.json`,
`/bewijs/`, `/vragen/`, `/nieuws/` en de PDF's worden gemaakt. Wie er een tweede exemplaar van
onderhoudt, onderhoudt een fout — dat is in juli 2026 zes keer gebeurd (publicatielijst,
whitepaperteller, "deze drie stukken", datumprecisie, sitemap, PDF's).

**Poorten falen dicht.** Elke `verify-*` stopt de build bij een bevinding en heeft een
sabotage-test (`--saboteer`) die bewijst dat hij rood kán worden. Een poort die nooit rood
wordt, meet niets.

## Deploy

**Auto-deploy** via GitHub → Netlify. Elke push naar `main` triggert een build. SSL via Let's Encrypt, DNS via Netlify.

## Environment variables (Netlify → Site settings → Environment variables)

| Variabele | Vereist | Scope | Doel |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Ja | Functions | Authenticatie voor de chat |
| `HELICONE_API_KEY` | Optioneel | Functions | LLM-observability via Helicone proxy. Zonder = directe call naar Anthropic. |
| `WHATSAPP_NUMBER` | Optioneel | Functions | Formaat `31612345678` (zonder + of 00). Zonder geeft `/whatsapp` een 503. |
| `RESEND_API_KEY` | Optioneel | Functions | Mailnotificatie naar Rob bij chat ≥ 3 turns. Zonder = stilzwijgend uit. |
| `NOTIFY_EMAIL` | Optioneel | Functions | Default `contact@rob-concepting.com` (zie `netlify/functions/lib/mail.js`) |
| `NOTIFY_FROM` | Optioneel | Functions | Default `R.O.B. Concepting <onboarding@resend.dev>`. Pas aan na Resend-domein-verificatie. |
| `AGORA_URL` | Ja | Build | Supabase-URL van het publieke Rob-register |
| `AGORA_PUBLISHABLE_KEY` | Ja | Build | Publishable key; alleen veilige views zijn leesbaar |
| `SUPABASE_URL` | Alleen meten | Functions | Server-side endpoint voor vrijwillige aggregaten |
| `SUPABASE_SERVICE_ROLE_KEY` | Ja | Functions | Secret; nooit naar de browser. Nodig voor `/beheer/` |
| `BEHEER_WACHTWOORD` | Voor `/beheer/` | Functions | Minimaal 12 tekens. Zonder deze var is het scherm dicht, niet open. Wijzigen verbreekt alle openstaande sessies. |
| `NETLIFY_BUILD_HOOK` | Voor `/beheer/` | Functions | Build hook-URL van deze site. Zonder deze var wordt een bericht wél vrijgegeven maar níét gepubliceerd — het scherm zegt dat er dan bij. |

Alle keys "Mark as secret".

## Function dependencies (npm)

Sinds de Vercel AI SDK migratie: Netlify installeert deps via `package.json` bij elke build.

```
"ai": "^4.3.0"           — streaming primitives, multi-provider
"@ai-sdk/anthropic": "^1.2.0" — Anthropic provider met baseURL-override voor Helicone
```

Lokale dev: `npm install` in deze map, dan `netlify dev` voor lokale Function-test.

## Promptfoo (dev, niet deployed)

`promptfoo.config.yaml` definieert 8 regressie-tests voor R.O.B.'s persona-prompt.
Run lokaal: `npx promptfoo eval`. Zie `promptfoo.README.md`.

## De interface (3 schermen)

1. **Landing** — drie-cirkel logo, "Systeem ontwerp voor MKB", play-knop
2. **Micro-transitie** — gears + sequentiële woorden "thinking · building · working" (~1,4 s)
3. **Hoofdinterface** — diamond-nav (links) + content-pane (rechts)

### De 5 panes

| Pane | Inhoud | Hash-link |
|---|---|---|
| **Over** | Identiteit + credentials-kaart (LinkedIn / mail / WhatsApp) | `#over` |
| **Visie** | 3-fase systeem (Visiedocument → Systeemontwerp → Merkbouw) | `#visie` |
| **Werk** | Concept-film (MP4) + systeem-portfolio (4 anoniem) | `#werk` |
| **Middel** | 6 tool-cards met SVG-mockup achtergronden | `#middel` |
| **R.O.B.** | AI-chat met persona | `#rob` |

Deep-links werken: `rob-concepting.com/#werk` opent direct de Werk-pane.

## R.O.B. AI-chat

- Model: `claude-haiku-4-5`
- Max 400 output-tokens, max 3 zinnen per antwoord
- System-prompt definieert tone, doel, redirect-strategie en grenzen (zie `chat.js`)
- History-cap: 12 berichten frontend, 20 server-side vangnet
- Input-cap: 1500 tekens per bericht
- Rate-limit: 12 calls per 60 sec per IP (best-effort, in-memory)
- CORS-whitelist: alleen `rob-concepting.com`, `www.`, `.netlify.app`
- Notificatie: na 3 user-turns → samenvatting via Resend naar Rob's mailbox (één mail per browsersessie)

## Workflow

```
06_uitvoering/New website idea/demo/         ← werkmap (editen hier)
        │
        │  Copy-Item (handmatige sync)
        ▼
Code bouw/R.O.B. Concepting/R.O.B. website/Index Netlify/   ← git-repo, productie
        │
        │  git push
        ▼
   GitHub → Netlify → rob-concepting.com
```

### Een whitepaper gewijzigd? Print de PDF opnieuw

De bouwketen op Netlify kan dit niet doen — daar staat geen Chrome. Het is dus een **lokale
stap**, en die vergeet je precies één keer te vaak: op 2026-07-28 bleken alle vier de PDF's
zeven tot tien commits achter te lopen. Wie de PDF van paper 01 aanvroeg, kreeg de
Semrush-toeschrijving toegestuurd die op de site al was gecorrigeerd.

```bash
npm run pdf        # bouwt de publicatie en print alle vier de papers opnieuw, ~2 min
npm run rapport    # bevestigt: geen PDF loopt achter op zijn pagina
```

`npm run rapport` meldt het per paper wanneer de pagina nieuwer is dan de PDF. Bewust geen
bouwpoort: die zou elke deploy blokkeren op iets dat de build zelf niet kan repareren.

**De PDF is een afgeleide van de pagina, geen tweede document.** Nooit los bijwerken.

### De bouwketen

Staat in `package.json`, niet in `netlify.toml` — dat bestand roept hem alleen aan. Eén
definitie, twee aanroepers:

| | |
|---|---|
| `npm run bouw` | de publicatie: register synchroniseren, pagina's bouwen, poorten, `publiek/` samenstellen |
| `npm run deploy` | `bouw` plus de agentkennis en de promptfoo-prompt. Dit draait Netlify |

Draai lokaal altijd `bouw` en niet losse stappen: `build-publiek` stelt `publiek/` opnieuw
samen, dus wie hem alleen draait houdt een halve publicatie over.

## Toolkit / dependencies

- **Geen** runtime dependencies of build-tools
- Functions gebruiken Node 20 (zie `netlify.toml`)
- Fonts via Google Fonts CDN (DM Sans + IBM Plex Mono)

## Toekomstige add-ons

- **Mail-alias forwarding** (`contact@rob-concepting.com` → Gmail) regelen bij domain-provider (ImprovMX of via Resend domain). Nu nog directe mailto naar Gmail met subject-prefix.
- **Domain-verified sender bij Resend** voor mail vanuit `rob-concepting.com` i.p.v. `onboarding@resend.dev`.
- **og-image.png** (verzeker max compatibility) — screenshot van `og-image.svg`, opslaan als PNG, og-meta omzetten.
