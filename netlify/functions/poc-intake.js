// Eén begrensde AI-beurt voor de publieke, fictieve WHOA-POC.
// Bewust géén import uit chat.js: deze functie archiveert niet, mailt niet en schrijft nergens.

import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const ALLOWED_ORIGINS = new Set([
  'https://rob-concepting.com',
  'https://www.rob-concepting.com',
  'https://rob-concepting.netlify.app'
]);
const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_CALLS = 8;
const FORBIDDEN_CONCLUSION = /\b(whoa|homologatie|faillissement|surseance|juridisch advies|passende route)\b/i;

const fallback = () => ({
  reflection: 'Je bedrijf lijkt operationeel nog te draaien, terwijl oudere verplichtingen de betaalruimte steeds verder beperken.',
  questions: [
    'Welke betaling of termijn maakt de komende weken het meest kritiek?',
    'Welke actuele stukken laten zien wat de onderneming vóór historische schulden verdient?'
  ],
  signals: ['beperkte betaalruimte', 'historische schuldenlast', 'operationele kern nog te onderzoeken'],
  mode: 'fallback'
});

const env = (name) => {
  if (typeof Netlify !== 'undefined' && Netlify.env?.get) return Netlify.env.get(name);
  return process.env[name];
};

const corsFor = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://rob-concepting.com',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin'
});

const json = (body, status, origin) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...corsFor(origin)
  }
});

const rateLimit = (ip) => {
  if (!ip) return true;
  const now = Date.now();
  const current = buckets.get(ip);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  bucket.count += 1;
  buckets.set(ip, bucket);
  if (buckets.size > 500) {
    for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
  }
  return bucket.count <= MAX_CALLS;
};

const parseModelJson = (text) => {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);
  if (typeof parsed.reflection !== 'string' || !Array.isArray(parsed.questions) || !Array.isArray(parsed.signals)) {
    throw new Error('Onvolledige modelrespons');
  }
  const candidate = {
    reflection: parsed.reflection.trim().slice(0, 360),
    questions: parsed.questions.filter((item) => typeof item === 'string').slice(0, 2).map((item) => item.trim().slice(0, 180)),
    signals: parsed.signals.filter((item) => typeof item === 'string').slice(0, 4).map((item) => item.trim().slice(0, 100)),
    mode: 'live'
  };
  const allText = [candidate.reflection, ...candidate.questions, ...candidate.signals].join(' ');
  if (!candidate.reflection || candidate.questions.length === 0 || FORBIDDEN_CONCLUSION.test(allText)) {
    throw new Error('Model overschreed de beslisgrens');
  }
  return candidate;
};

export default async (req, context) => {
  const origin = req.headers.get('origin') || '';
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: corsFor(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || '';
  if (!rateLimit(ip)) return json({ error: 'Te veel pogingen. Probeer het over een minuut opnieuw.' }, 429, origin);

  let message;
  try {
    const body = await req.json();
    message = typeof body.message === 'string' ? body.message.trim().slice(0, 700) : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    const fictional = body.caseContext?.fictional === true;
    const stage = body.caseContext?.stage;
    if (message.length < 10 || message.length > 700 || !/^[a-z0-9-]{8,80}$/i.test(sessionId) || !fictional || stage !== 'signalering') {
      return json({ error: 'Ongeldig demonstratieverzoek' }, 400, origin);
    }
  } catch {
    return json({ error: 'Ongeldig demonstratieverzoek' }, 400, origin);
  }

  const apiKey = env('ANTHROPIC_API_KEY');
  if (!apiKey) return json(fallback(), 200, origin);

  try {
    const anthropic = createAnthropic({ apiKey });
    const result = await generateText({
      model: anthropic('claude-haiku-4-5'),
      system: `Je bent de eerste, neutrale ingang van een FICTIEVE demonstratie voor een Nederlandse ondernemer in zwaar weer.
Je taak is alleen spiegelen, ordenen en maximaal twee korte vervolgvragen stellen.
Je stelt geen diagnose. Je kiest of noemt geen juridische, insolventie- of herstructureringsroute. Je geeft geen advies, kans, termijn, percentage of uitkomst.
Schrijf warm en sober in gewone Nederlandse taal. Geen markdown, emoji of uitroepteken.
Retourneer uitsluitend geldige JSON met deze vorm:
{"reflection":"één korte reflectie","questions":["vraag 1","vraag 2"],"signals":["kandidaatsignaal"]}`,
      prompt: `Fictieve sector: metaalbewerking. Fase: eerste signalering. Uitspraak ondernemer: ${message}`,
      maxOutputTokens: 240,
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(8500)
    });
    return json(parseModelJson(result.text), 200, origin);
  } catch (error) {
    console.error('[poc-intake] veilige terugval:', error.message);
    return json(fallback(), 200, origin);
  }
};

export const config = {
  path: '/api/poc-intake'
};

export const _test = { fallback, parseModelJson, rateLimit };
