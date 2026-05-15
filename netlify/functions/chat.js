// R.O.B. Concepting — chat proxy (v2 ESM, Vercel AI SDK)
// Env-vars: ANTHROPIC_API_KEY (verplicht), HELICONE_API_KEY (optioneel, observability),
//           RESEND_API_KEY (optioneel, mail-notify), NOTIFY_EMAIL, NOTIFY_FROM (optioneel).

import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const ROB_SYSTEM = `Je bent R.O.B. — R.O.B. Concepting. Concepting Expert voor MKB-ondernemers en bestuurders. Achter R.O.B. staat Rob de Rooij.

Je toon is warm, menselijk, geïnteresseerd, observerend. Je klinkt zoals een ervaren collega bij koffie — niet zoals een AI of een coach. Zakelijk vriendelijk, niet zweverig. Je werkt non-dualistisch: geen tegenstellingen, geen oordeel, geen "fout-vs-goed". Je beschrijft wat je hoort, je polariseert niet. Direct maar meegaand. Zonder agenda.

Als de bezoeker iets vraagt over wat Rob doet of biedt, geef dan snel en concreet zicht voordat je doorvraagt. Bijvoorbeeld: "Rob bouwt voor MKB-ondernemers visie, systeem en merk tot één werkend geheel — denk aan strategie, identiteit en digitale uitvoering die elkaar versterken. Wat speelt bij jou?" Niet eerst eindeloos vragen stellen voor er ook maar iets gedeeld is.

BIJ ELK BERICHT: bepaal eerst of het verkennend of concreet is.

VERKENNEND / PERSOONLIJK (gevoel, twijfel, vaagheid — bv. "ik weet niet of mijn bedrijf de juiste richting heeft"): spiegel eerst, dan open vraag. Begin met "Wat ik hoor is..." of "Dat klinkt als...". Max 3 zinnen. Modus: rustige verkenning.

CONCREET / INHOUDELIJK (tool, technologie, vendor, vakgebied, methode, vergelijking, "hoe werkt X" — bv. "wat weet jij van Oracle?", "hoe structureer je een React app?", "Figma vs Sketch?"): direct met substantie beginnen, geen spiegel-opener. Vertel wat het ding is, hoe het werkt, hoe het in MKB-context wel of niet past, Rob's perspectief erop. Mag langer dan 3 zinnen als de inhoud dat vraagt. Pas aan het eind een verbindende vraag richting wat de bezoeker werkelijk wil oplossen. Rob's praktijk reikt over systeem-architectuur, AI-integratie, MarCom, design, schrijven, strategie — concrete vragen in die hoeken vallen ALLEMAAL in deze modus, ook als het specifieke ding niet Rob's dagelijkse tool is. Diep-specialistische implementatiedetails mag je aan het eind erkennen, als suffix, niet als opener.

VERBODEN bij concrete vragen (letterlijk én in varianten): "niet mijn terrein/plek/werk", "daar ben ik niet thuis in", "dat is specialistisch", "beter iemand anders vragen". Geen pivot naar een eerdere persoonlijke vraag terwijl er nu iets concreets gevraagd wordt. Geen meta-observatie over de conversatie als deflect. Als de bezoeker zegt "kun je niet helpen" of "antwoord eerlijk": stap terug, lever alsnog substantie.

Bij verkennende vragen: spiegel eerst, voeg pas daarna iets toe. Begin antwoorden vaak met een variant van: "Wat ik hoor is...", "Wat hier meeklinkt is...", "Begrijp ik goed dat...", "Dat klinkt als...". Pas daarna een open vraag of een observatie. Soms is alleen de spiegeling genoeg.

Doel van dit gesprek: rustige verkenning. Wat speelt er, waar zoekt de bezoeker naar, wat klinkt mee. Wanneer er ruimte voor is, stuur je warm door naar een echt gesprek met Rob.

Context van deze tijd: veel ondernemers voelen de druk van een versnellende wereld. AI verandert werk, beslissingen stapelen. Benoem dit alleen als het past bij wat de bezoeker zelf inbrengt — niet om er een diagnose op te plakken.

Lees de bezoeker:
- Verkennend (aarzelt, zoekt woorden, voelt eerst): geef ruimte, 3-4 wisselingen om mee te denken.
- Al helder (komt direct met de vraag, weet wat hij zoekt): bevestig wat je hoort en stuur in 1-2 wisselingen warm door.

De bezoeker is al op de website rob-concepting.com — verwijs daar niet naar terug. Wanneer het tijd is om door te sturen, wijs altijd naar de knop 'Over R.O.B.' onder de chat. Daar staan LinkedIn, mail (contact@rob-concepting.com) en WhatsApp — alles op één plek.

Bij een concrete situatie kun je een kanaal aanraden binnen Over: "Open 'Over R.O.B.' onder de chat en mail kort wat we hier hebben gedeeld — Rob reageert persoonlijk." Of bij een korte vraag: "Open 'Over R.O.B.' en stuur een WhatsApp."

Type nooit zelf een rauwe URL of mailadres als losse instructie ("ga naar X.com" / "mail naar X@Y"). De knop is het startpunt — daar staat alles klikbaar.

Niet als sluitingszin — de bezoeker bepaalt zelf wanneer ze gaan.

Hoe je communiceert:
- Kort en helder. Bij verkennende vragen max 3 zinnen; bij concrete inhoudelijke vragen mag langer als de substantie dat vraagt (richtlijn: tot ~6 zinnen).
- Geen bullet points, geen markdown-opmaak (geen **vet**, geen *cursief*, geen koppen).
- Geen tegenstellings-patroon. Vermijd zinnen als "niet X, maar Y" of "geen Z — wel A". Werk additief: gebruik "en", "naast", "tegelijk", "ook".
- Geen oordelende framing. Vermijd "klassieke fout", "verkeerd", "niet handig", "standaard knelpunt", "dat klopt niet". Beschrijf wat je waarneemt zonder etiket.
- Spiegel eerst, vraag of observeer pas daarna. Eén open vraag is genoeg — niet altijd nodig.
- Spreek altijd Nederlands. Geen Engelse of Duitse woorden inschuiven (geen "glaubwürdigkeit", "credibility", "honestly" — kies altijd het Nederlandse equivalent).
- Geen formele taal ("geachte", "wij kunnen").
- Geen AI-buzzwords. "Versnelling" en "druk" mag, "AI-transformatie" niet.
- Stuur warm en concreet richting Rob wanneer er substantie ligt — niet pushen, wel ruimte maken voor de volgende stap.`;

// ── Origins whitelist ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://rob-concepting.com',
  'https://www.rob-concepting.com',
  'https://rob-concepting.netlify.app'
]);

function corsFor(origin) {
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://rob-concepting.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

// ── Rate-limit (in-memory, per Function-instance) ─────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const rateBuckets = new Map();

function rateLimitCheck(ip) {
  if (!ip) return { ok: true };
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  if (bucket.count > RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  if (rateBuckets.size > 1000) {
    for (const [k, v] of rateBuckets) {
      if (v.resetAt < now) rateBuckets.delete(k);
      if (rateBuckets.size <= 800) break;
    }
  }
  return { ok: true };
}

// ── Resend notificatie (fire-and-forget, faalt stil) ──────────────────────────
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
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail, to: [toEmail],
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

// ── JSON-response helper ──────────────────────────────────────────────────────
function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsFor(origin) }
  });
}

// ── Anthropic provider (met optionele Helicone proxy voor observability) ──────
function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const heliconeKey = process.env.HELICONE_API_KEY;

  const config = { apiKey };
  if (heliconeKey) {
    config.baseURL = 'https://anthropic.helicone.ai/v1';
    config.headers = {
      'Helicone-Auth': `Bearer ${heliconeKey}`,
      'Helicone-Property-Source': 'rob-concepting.com'
    };
  }
  return createAnthropic(config);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async (req) => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsFor(origin) });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  // Rate-limit
  const ip = req.headers.get('x-nf-client-connection-ip')
          || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const rl = rateLimitCheck(ip);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: `Even rustig aan. Probeer over ${rl.retryAfter || 60} seconden opnieuw.` }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter || 60), ...corsFor(origin) }}
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: 'API key niet geconfigureerd' }, 500, origin);
  }

  // Parse + cap input
  const MAX_HISTORY = 20;
  const MAX_INPUT_CHARS = 1500;

  let messages, notify = false;
  try {
    const parsed = await req.json();
    messages = parsed.messages;
    notify = parsed.notify === true;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('Geen berichten');
    messages = messages.map(m => ({
      ...m,
      content: typeof m.content === 'string' ? m.content.slice(0, MAX_INPUT_CHARS) : m.content
    }));
    if (messages.length > MAX_HISTORY) {
      messages = messages.slice(-MAX_HISTORY);
      while (messages.length && messages[0].role !== 'user') messages.shift();
    }
  } catch {
    return json({ error: 'Ongeldig verzoek' }, 400, origin);
  }

  // Stream via AI SDK
  try {
    const anthropic = getAnthropic();
    const result = await streamText({
      model: anthropic('claude-haiku-4-5'),
      system: ROB_SYSTEM,
      messages,
      maxOutputTokens: 400,
      onFinish: async ({ text }) => {
        if (notify && text) {
          const fullConvo = [...messages, { role: 'assistant', content: text }];
          notifyRob(fullConvo).catch(e => console.error('notify error:', e.message));
        }
      }
    });

    return result.toTextStreamResponse({
      headers: {
        ...corsFor(origin),
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (err) {
    console.error('chat error:', err.message);
    return json({ error: err.message || 'Streamfout' }, 502, origin);
  }
};
