// R.O.B. Concepting — contact form proxy (v2 ESM, Resend)
// Env-vars: RESEND_API_KEY (verplicht), NOTIFY_EMAIL, NOTIFY_FROM (optioneel).

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
const RATE_LIMIT_MAX = 3;
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

// ── JSON helper ───────────────────────────────────────────────────────────────
function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsFor(origin) }
  });
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
      JSON.stringify({ error: `Te veel berichten in korte tijd. Probeer over ${rl.retryAfter || 60} seconden opnieuw.` }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter || 60), ...corsFor(origin) }}
    );
  }

  // Check RESEND_API_KEY (graceful degradation)
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return json({ error: 'Mailservice nog niet beschikbaar. Gebruik LinkedIn of WhatsApp, of probeer later opnieuw.' }, 503, origin);
  }

  // Parse + validate
  const MAX_NAME = 100;
  const MAX_EMAIL = 200;
  const MAX_PHONE = 40;
  const MAX_MESSAGE = 2000;

  let name, email, phone, message;
  try {
    const parsed = await req.json();
    name = String(parsed.name || '').trim().slice(0, MAX_NAME);
    email = String(parsed.email || '').trim().slice(0, MAX_EMAIL);
    phone = String(parsed.phone || '').trim().slice(0, MAX_PHONE);
    message = String(parsed.message || '').trim().slice(0, MAX_MESSAGE);

    // Honeypot — silent 200 voor bots
    if (parsed._honey) {
      return json({ ok: true }, 200, origin);
    }
    if (!name || !email || !message) {
      return json({ error: 'Naam, e-mail en bericht zijn vereist.' }, 400, origin);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'E-mailadres lijkt niet correct.' }, 400, origin);
    }
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400, origin);
  }

  // Compose mail
  const toEmail   = process.env.NOTIFY_EMAIL || 'robderooijbreda@gmail.com';
  const fromEmail = process.env.NOTIFY_FROM  || 'R.O.B. Concepting <onboarding@resend.dev>';

  const timestamp = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short'
  });
  const text = `Nieuw bericht via rob-concepting.com (contactformulier)

Naam: ${name}
E-mail: ${email}
Telefoon: ${phone || '(niet opgegeven)'}
Tijd: ${timestamp}

— BERICHT —

${message}

— EINDE —

Bron: rob-concepting.com contactformulier`;

  try {
    const body = {
      from: fromEmail,
      to: [toEmail],
      subject: `Bericht via rob-concepting.com — ${name}`,
      text
    };
    if (email) body.reply_to = email;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error('Resend non-OK:', res.status, err.slice(0, 200));
      return json({ error: 'Bericht kon niet verzonden worden. Probeer LinkedIn of WhatsApp.' }, 502, origin);
    }
    return json({ ok: true }, 200, origin);
  } catch (err) {
    console.error('contact error:', err.message);
    return json({ error: 'Bericht kon niet verzonden worden. Probeer LinkedIn of WhatsApp.' }, 502, origin);
  }
};
