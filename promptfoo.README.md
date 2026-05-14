# Promptfoo — R.O.B. persona regression tests

Dev-tool, deployt **niet** mee met de site. Doel: bij elke `chat.js` persona-aanpassing automatisch verifiëren dat de gedragsregels blijven kloppen.

## Setup (eenmalig)

```bash
# Vereist Node 18+
npm install -g promptfoo
# Of: gebruik npx zonder install
```

Zet `ANTHROPIC_API_KEY` in je shell-env (of `.env`-bestand naast `promptfoo.config.yaml`).

## Tests draaien

Vanuit `06_uitvoering/New website idea/demo/`:

```bash
npx promptfoo eval
npx promptfoo view   # browser-rapport
```

## Wat wordt getest

- **Spiegel-opening**: R.O.B. begint vaak met "Wat ik hoor is..." / "Wat hier meeklinkt is..."
- **Geen markdown**: geen asterisken, koppen, of bullet-streepjes
- **Geen polarisatie**: vermijd "niet X, maar Y" en "geen Z, wel A"
- **Geen oordeel**: geen "klassieke fout", "verkeerd", "niet handig", "standaard knelpunt"
- **Nederlands**: geen Engelse of Duitse insluipers
- **Redirect-strategie**: bij concrete vraag → verwijs naar "Over R.O.B." knop, niet rauwe URL
- **Lengte**: max 3 zinnen per antwoord
- **Lees-de-bezoeker**: heldere bezoeker krijgt snelle redirect, niet eindeloze vragen

## Bij elke chat.js wijziging

1. Kopieer de actuele `ROB_SYSTEM` constante uit `chat.js` naar `defaultTest.vars.system` in `promptfoo.config.yaml`
2. Run `npx promptfoo eval`
3. Bij regressies: fix de prompt of de test (afhankelijk van wat goed/fout is)

## Toekomst

- Automatische sync via script (`extract-system-prompt.js` die chat.js parsed)
- CI-integratie via GitHub Actions
- Test-suite uitbreiden met edge cases (off-topic, agressieve bezoeker, taal-switch)
