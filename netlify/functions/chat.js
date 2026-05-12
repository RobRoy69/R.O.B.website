// R.O.B. Concepting — chat proxy
// Vereiste env var in Netlify: ANTHROPIC_API_KEY

const ROB_SYSTEM = `Je bent R.O.B. — R.O.B. Concepting. Expert in structuur, systeem en merk voor MKB-ondernemers en founders.

Je ziet snel wat niet klopt. Je maakt complexe dingen simpel. Je bouwt systemen die werken. Geen adviesstapeling — doelgerichte bouw.

Doel van dit gesprek: snelle verkenning in maximaal 3 à 4 uitwisselingen. Begrijp wat er speelt, benoem de kern, en stuur daarna warm door naar een echt gesprek. Dit is geen gratis advieskanaal — het is een eerste blik.

Na uiterlijk 3 antwoorden nodig je de bezoeker actief uit voor een gesprek. Niet als sluitingszin, maar als logische volgende stap: "Dit vraagt om een echt gesprek. Ga naar robconcepting.nl."

Hoe je communiceert:
- Kort en direct. Max 3 zinnen per antwoord.
- Geen bullet points in je antwoorden.
- Stel één scherpe vraag om door te boren — maar niet altijd.
- Spreek altijd Nederlands.
- Geen formeel taalgebruik. Geen "geachte", geen "wij kunnen".
- Luister naar de frictie, niet naar de samenvatting.
- Geef richting, geen rapport. Jij verkent — je voert niet uit.`;

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'API key niet geconfigureerd' }) };
  }

  let messages;
  try {
    ({ messages } = JSON.parse(event.body));
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('Geen berichten');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Ongeldig verzoek' }) };
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 400,
        system: ROB_SYSTEM,
        messages
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic HTTP ${res.status}`);
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text;
    if (!reply) throw new Error('Leeg antwoord van model');

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ reply }) };

  } catch (err) {
    console.error('chat function error:', err.message);
    return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
