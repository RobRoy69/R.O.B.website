// R.O.B. Concepting — chat proxy
// Vereiste env var in Netlify: ANTHROPIC_API_KEY

const ROB_SYSTEM = `Je bent R.O.B. — R.O.B. Concepting. Expert in structuur, systeem en merk voor MKB-ondernemers en founders.

Je ziet snel wat niet klopt. Je maakt complexe dingen simpel. Je bouwt systemen die werken. Geen adviesstapeling — doelgerichte bouw.

Context van deze tijd: veel ondernemers en founders voelen de druk van een versnellende wereld. AI verandert het werk, beslissingen stapelen, structuur loopt achter. R.O.B. helpt hen niet door mee te rennen, maar door visie en systeem te bouwen dat de versnelling aankan. Concepting wordt waardevoller naarmate alles sneller verandert — niet minder. Je benoemt dit alleen als het relevant is voor wat de bezoeker inbrengt; je drukt het niet op.

Doel van dit gesprek: snelle verkenning in maximaal 3 à 4 uitwisselingen. Begrijp wat er speelt, benoem de kern, en stuur daarna warm door naar een echt gesprek. Dit is geen gratis advieskanaal — het is een eerste blik.

De bezoeker is al op de website rob-concepting.com — verwijs daar dus niet naar terug. Na uiterlijk 3 antwoorden nodig je de bezoeker actief uit voor een echt gesprek. Niet als sluitingszin, maar als logische volgende stap: "Dit vraagt om een echt gesprek. Mail naar contact@rob-concepting.com met een korte schets — dan reageert Rob persoonlijk."

Hoe je communiceert:
- Kort en direct. Max 3 zinnen per antwoord.
- Geen bullet points in je antwoorden.
- Stel één scherpe vraag om door te boren — maar niet altijd.
- Spreek altijd Nederlands. Geen Duitse of Engelse woorden inschuiven (geen "glaubwürdigkeit", "credibility", "honestly" — kies altijd het Nederlandse equivalent).
- Geen formeel taalgebruik. Geen "geachte", geen "wij kunnen".
- Luister naar de frictie, niet naar de samenvatting.
- Geef richting, geen rapport. Jij verkent — je voert niet uit.
- Geen AI-buzzwords. "Versnelling" en "druk" mag, "AI-transformatie" niet.
- Geen markdown-opmaak. Geen asterisken voor nadruk (geen **vet** of *cursief*), geen koppen, geen lijsten met streepjes. Pure leesbare tekst — de chat rendert het letterlijk.`;

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// Stuurt een samenvatting van het gesprek naar Rob's mailbox via Resend.
// Faalt stil als Resend niet is geconfigureerd of de mail mislukt — chat blijft werken.
async function notifyRob(conversation) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const toEmail   = process.env.NOTIFY_EMAIL || 'robderooijbreda@gmail.com';
  const fromEmail = process.env.NOTIFY_FROM  || 'R.O.B. Concepting <onboarding@resend.dev>';

  const turns = conversation.filter(m => m.role === 'user').length;
  const timestamp = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short'
  });

  const body = conversation.map(m => {
    const who = m.role === 'user' ? 'BEZOEKER' : 'R.O.B.';
    return `${who}:\n${m.content}\n`;
  }).join('\n');

  const text = `Een bezoeker had een verkenning met R.O.B.\n\nTijd: ${timestamp}\nUitwisselingen: ${turns}\n\n— GESPREK —\n\n${body}\n— EINDE —\n\nBron: rob-concepting.com`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `R.O.B. — verkenning ingekomen (${turns} turns)`,
        text
      })
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error('Resend non-OK:', res.status, err.slice(0, 200));
    }
  } catch (e) {
    console.error('Notify failed:', e.message);
  }
}

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

  const MAX_HISTORY = 20;        // max user+assistant berichten naar Anthropic
  const MAX_INPUT_CHARS = 1500;  // per individueel bericht

  let messages, notify = false;
  try {
    const parsed = JSON.parse(event.body);
    messages = parsed.messages;
    notify = parsed.notify === true;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('Geen berichten');
    // Trim invoer-lengte als vangnet
    messages = messages.map(m => ({
      ...m,
      content: typeof m.content === 'string' ? m.content.slice(0, MAX_INPUT_CHARS) : m.content
    }));
    // Cap history-lengte (laatste N berichten, eerste moet user zijn voor Anthropic)
    if (messages.length > MAX_HISTORY) {
      messages = messages.slice(-MAX_HISTORY);
      while (messages.length && messages[0].role !== 'user') messages.shift();
    }
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
        model: 'claude-haiku-4-5',
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

    // Stuur samenvatting per mail als de frontend daarom vraagt (één keer per sessie, drempel = 3 turns)
    if (notify) {
      const fullConvo = [...messages, { role: 'assistant', content: reply }];
      await notifyRob(fullConvo);
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ reply }) };

  } catch (err) {
    console.error('chat function error:', err.message);
    return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
