# R.O.B. Concepting — website

Productie-site voor **R.O.B. Concepting** (Rob de Rooij, Concepting Expert).
Live op [rob-concepting.com](https://rob-concepting.com).

---

## Architectuur

Vanilla HTML/CSS/JS, geen frameworks, geen build-step. Eén `index.html`, twee Netlify Functions, een MP4 en zes SVG-mockups.

```
/
├── index.html              # Landing + transitie + 6-pane interface (~2050 regels, geheel inline)
├── netlify.toml            # Build-config + security headers + cache-headers
├── og-image.svg            # Social preview (1200×630)
├── sitemap.xml             # SEO
├── robots.txt              # SEO
├── media/
│   └── concept-film.mp4    # Pitch-video (1080×1080, ~8 MB)
├── werk/                   # SVG-mockups voor tool-cards
│   ├── apps.svg
│   ├── dashboards.svg
│   ├── logo-branding.svg
│   ├── os.svg
│   ├── portals.svg
│   └── websites.svg
└── netlify/functions/
    ├── chat.js             # AI-chat proxy → Claude API (claude-haiku-4-5)
    └── whatsapp.js         # WhatsApp redirect (nummer in env-var, niet in HTML)
```

## Deploy

**Auto-deploy** via GitHub → Netlify. Elke push naar `main` triggert een build. SSL via Let's Encrypt, DNS via Netlify.

## Environment variables (Netlify → Site settings → Environment variables)

| Variabele | Vereist | Scope | Doel |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Ja | Functions | Authenticatie voor de chat |
| `WHATSAPP_NUMBER` | Optioneel | Functions | Formaat `31612345678` (zonder + of 00). Zonder geeft `/whatsapp` een 503. |
| `RESEND_API_KEY` | Optioneel | Functions | Mailnotificatie naar Rob bij chat ≥ 3 turns. Zonder = stilzwijgend uit. |
| `NOTIFY_EMAIL` | Optioneel | Functions | Default `robderooijbreda@gmail.com` |
| `NOTIFY_FROM` | Optioneel | Functions | Default `R.O.B. Concepting <onboarding@resend.dev>`. Pas aan na Resend-domein-verificatie. |

Alle keys "Mark as secret".

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

## Toolkit / dependencies

- **Geen** runtime dependencies of build-tools
- Functions gebruiken Node 20 (zie `netlify.toml`)
- Fonts via Google Fonts CDN (DM Sans + IBM Plex Mono)

## Toekomstige add-ons

- **Mail-alias forwarding** (`contact@rob-concepting.com` → Gmail) regelen bij domain-provider (ImprovMX of via Resend domain). Nu nog directe mailto naar Gmail met subject-prefix.
- **Domain-verified sender bij Resend** voor mail vanuit `rob-concepting.com` i.p.v. `onboarding@resend.dev`.
- **og-image.png** (verzeker max compatibility) — screenshot van `og-image.svg`, opslaan als PNG, og-meta omzetten.
