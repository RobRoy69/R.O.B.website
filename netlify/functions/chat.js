// R.O.B. Concepting — chat proxy (v2 ESM, Vercel AI SDK)
// Env-vars: ANTHROPIC_API_KEY (verplicht), HELICONE_API_KEY (optioneel, observability),
//           RESEND_API_KEY (optioneel, mail-notify), NOTIFY_EMAIL, NOTIFY_FROM (optioneel).

import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { archiveChatSession } from './lib/archief.js';
import { ROB_SYSTEM } from './lib/systeemprompt.js';


// ── Canon-content-awareness (5D additieve laag, 2026-05-18) ──────────────────
// Laadt R.O.B.-canon bundle (propositie · aanbod · project) zodat chat content-vragen
// over SBH/B.R.A.I.N./20voor12/R.O.B. Werkbank etc. concreet kan beantwoorden.
// Voice/modus/verboden blijven in ROB_SYSTEM hierboven (authoritative).
// Bron: R.O.B. Concepting/rob-canon/. Bundle gegenereerd door build-bundle.js.
// Graceful fallback: bij load-fail blijft chat draaien op alleen ROB_SYSTEM.
let CANON_CONTEXT = '';
try {
  const bundlePath = fileURLToPath(new URL('./rob-canon-bundle.json', import.meta.url));
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf-8'));
  const sections = ['propositie', 'aanbod', 'project'];
  const blocks = sections
    .map(type => (bundle.notes_by_type[type] || [])
      .map(n => `## ${n.title}\n${n.content}`).join('\n\n'))
    .filter(Boolean)
    .join('\n\n---\n\n');
  if (blocks) {
    CANON_CONTEXT = `\n\n---\n\nCANON-CONTEXT (R.O.B. Concepting canon — kennis raadplegen, niet letterlijk inkopiëren):\n\n${blocks}`;
  }
  // CRITICAL_FACTS werd wél in de bundel gezet en NOOIT gelezen — 1.450 tekens harde
  // feitcorrecties die niets deden, terwijl dat bestand juist bestaat om feitfouten te
  // voorkomen. Vandaag gaf de agent een fout antwoord over Agora; dit is het bestand dat
  // dat had moeten vangen. Nu aangesloten, en bewust vóór de canon-context zodat een
  // correctie zwaarder weegt dan de lopende tekst.
  if (bundle.critical_facts) {
    CANON_CONTEXT = `\n\n---\n\nHARDE FEITEN (gaan vóór op alles hieronder; bij twijfel volg deze):\n\n${bundle.critical_facts}${CANON_CONTEXT}`;
  }
} catch (e) {
  console.error('[chat] rob-canon-bundle load failed, continuing zonder content-awareness:', e.message);
}

// ── Site-kennis: AFGELEID, niet geschreven ───────────────────────────────────
// De agent ontkende op 2026-07-26 het bestaan van /vragen/ terwijl die pagina live stond,
// en weigerde een datum te noemen die op zijn eigen site staat. Beide omdat zijn site-
// kennis met de hand werd bijgehouden. Dit blok komt uit build-site-kennis.mjs, dat bij
// elke build afleidt welke pagina's er werkelijk staan en welke vragen beantwoord zijn.
let SITE_KENNIS = '';
try {
  const pad = fileURLToPath(new URL('./site-kennis.json', import.meta.url));
  const k = JSON.parse(readFileSync(pad, 'utf-8'));
  // LET OP — in PROZA opstellen, zonder streepjes, sterretjes of inspringing.
  // Eerste versie gebruikte een opsomming met "- " en "·". De agent spiegelde die vorm en
  // antwoordde met markdown ("**/vragen/**"), terwijl ROB_SYSTEM markdown expliciet
  // verbiedt en promptfoo erop toetst. Bij gewone vragen gebeurde dat niet: het lek zat
  // alleen wanneer hij uit dit blok citeerde. Een contextblok leert niet alleen inhoud
  // maar ook vorm.
  const paginas = k.paginas
    .map(p => `Op ${p.url} staat "${p.titel}".${p.omschrijving ? ` ${p.omschrijving}` : ''}`)
    .join(' ');
  const vragen = k.vragen.map(v => {
    const grond = v.onderbouwing.map(o => `${o.bewering} (${o.datum})`).join(' ');
    const verder = v.uitgewerkt_in.map(u => `${u.titel} op ${u.pad}`).join(' en ');
    return `Vraag: ${v.vraag} Antwoord: ${v.antwoord} Dit rust op: ${grond}${verder ? ` Uitgewerkt in ${verder}.` : ''}`;
  }).join('\n\n');
  SITE_KENNIS = `\n\n---\n\nWAT ER OP DEZE SITE STAAT (afgeleid bij de laatste build; dit is de waarheid over de site, ook als je iets anders meent te weten). ${paginas}\n\nDeze vragen zijn op /vragen/ beantwoord, met waarop ze rusten en wanneer dat is vastgesteld. Je mag die datums noemen, ze staan publiek op de site.\n\n${vragen}\n\nOntken NOOIT het bestaan van een pagina die hierboven staat; weet je iets niet, zeg dan dat je het niet weet, niet dat het er niet is. Neem de opmaak van dit blok niet over: antwoord in gewone lopende zinnen, zonder opsommingstekens en zonder markdown.`;
} catch (e) {
  console.error('[chat] site-kennis load failed, chat draait door zonder site-inventaris:', e.message);
}

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

// ── Vertrouwelijk chat-archief (spoor 6 C2, fire-and-forget, faalt stil) ─────

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
  const userAgent = req.headers.get('user-agent') || '';
  const startedAt = Date.now();

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
      system: ROB_SYSTEM + CANON_CONTEXT + SITE_KENNIS,
      messages,
      maxOutputTokens: 400,
      onFinish: async ({ text }) => {
        if (!text) return;
        // AWAIT — niet fire-and-forget. Dit waren zwevende beloftes: onFinish keerde
        // meteen terug en de fetches liepen nog. In een streaming serverless functie mag
        // de instantie bevriezen zodra de stream sluit, en dan wordt zo'n belofte nooit
        // afgemaakt.
        //
        // Het ging twee maanden goed omdat de verbinding naar het oude Supabase-project
        // warm was. Bij de verhuizing naar agora-rob-register kwam er een DNS-lookup en
        // een nieuwe TLS-handshake bij, en toen viel het om: 0 rijen, en in het
        // Supabase-logboek GEEN ENKELE POST — het verzoek werd niet geweigerd, het werd
        // nooit verstuurd. Een latente fout, blootgelegd door de verhuizing, niet
        // veroorzaakt door de verhuizing.
        //
        // allSettled zodat een mislukte mail het archief niet meesleept, en andersom.
        const fullConvo = [...messages, { role: 'assistant', content: text }];
        const taken = [
          // Vertrouwelijk archief: ALTIJD inserten (per spec: agent leert breedst mogelijk)
          archiveChatSession({ messages, aiText: text, notify, startedAt, userAgent, origin })
            .catch(e => { console.error('archive error:', e.message); throw e; }),
        ];
        // Resend-mail naar Rob alleen bij notify=true (bezoeker stuurde door)
        if (notify) {
          taken.push(notifyRob(fullConvo).catch(e => { console.error('notify error:', e.message); throw e; }));
        }
        await Promise.allSettled(taken);
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
