// R.O.B. Concepting — whitepaper lead-capture (v2 ESM, Resend)
// Bezoeker laat naam + e-mail achter -> krijgt de PDF-link gemaild, Rob krijgt de lead.
// Env-vars: RESEND_API_KEY (verplicht), NOTIFY_EMAIL, NOTIFY_FROM (optioneel).

const SITE = 'https://rob-concepting.com';

// ── Papers-allowlist ──────────────────────────────────────────────────────────
// Alleen slugs die hier staan zijn geldig. Voorkomt dat iemand een willekeurig
// pad of externe URL door de mail laat versturen.
const PAPERS = {
  'de-beste-keuze-is': {
    title: 'De beste keuze is… — AI en de veranderende klantreis',
    file:  'de-beste-keuze-is.pdf',
    page:  '/whitepapers/de-beste-keuze-is.html'
  },
  'de-klinkklare-onzin': {
    title: 'De klinkklare (on-)zin van je AI-agent — Wat zegt jouw merk eigenlijk?',
    file:  'de-klinkklare-onzin.pdf',
    page:  '/whitepapers/de-klinkklare-onzin.html'
  },
  'de-mens-beslist': {
    title: 'De mens beslist (of niet meer?) — Waarom goedkeuren geen beslissen is',
    file:  'de-mens-beslist.pdf',
    page:  '/whitepapers/de-mens-beslist.html'
  }
};

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

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsFor(origin) }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function sendMail(key, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${err.slice(0, 200)}`);
  }
  return res;
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

  const ip = req.headers.get('x-nf-client-connection-ip')
          || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const rl = rateLimitCheck(ip);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: `Te veel aanvragen kort na elkaar. Probeer het over ${rl.retryAfter || 60} seconden opnieuw.` }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter || 60), ...corsFor(origin) }}
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return json({ error: 'De mailservice is even niet beschikbaar. Probeer het later opnieuw.' }, 503, origin);
  }

  // ── Parse + validatie ──
  let name, email, slug;
  try {
    const parsed = await req.json();

    // Honeypot — stille 200 voor bots
    if (parsed._honey) return json({ ok: true }, 200, origin);

    name  = String(parsed.name  || '').trim().slice(0, 100);
    email = String(parsed.email || '').trim().slice(0, 200);
    slug  = String(parsed.paper || '').trim().slice(0, 80);

    if (!name || !email) {
      return json({ error: 'Vul je naam en e-mailadres in.' }, 400, origin);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Dat e-mailadres lijkt niet te kloppen.' }, 400, origin);
    }
    if (!Object.prototype.hasOwnProperty.call(PAPERS, slug)) {
      return json({ error: 'Onbekende whitepaper.' }, 400, origin);
    }
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400, origin);
  }

  const paper    = PAPERS[slug];
  const pdfUrl   = `${SITE}/whitepapers/bestand/${paper.file}`;
  const pageUrl  = `${SITE}${paper.page}`;
  const fromEmail = process.env.NOTIFY_FROM  || 'R.O.B. Concepting <contact@rob-concepting.com>';
  const toRob     = process.env.NOTIFY_EMAIL || 'robderooijbreda@gmail.com';

  const firstName = name.split(/\s+/)[0];
  const timestamp = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short'
  });

  // ── 1. Mail naar de bezoeker (met de download) ──
  const visitorText = `Hallo ${firstName},

Hier is de whitepaper waar je om vroeg:

${paper.title}

Downloaden (PDF):
${pdfUrl}

Online lezen kan ook:
${pageUrl}

Ik hoor het graag als er iets in blijft haken — een reactie op deze mail komt gewoon bij me aan.

Met vriendelijke groet,
Rob de Rooij
R.O.B. Concepting
${SITE}`;

  const visitorHtml = `<!DOCTYPE html><html lang="nl"><body style="margin:0;padding:0;background:#e8e4dc;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#001a4d;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#0e1525;padding:26px 28px;">
      <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#0fa8cb;margin-bottom:10px;">R.O.B. Concepting</div>
      <div style="font-size:21px;color:#ffffff;line-height:1.3;">${escapeHtml(paper.title)}</div>
    </div>
    <div style="background:#f4f2ed;padding:30px 28px;border:1px solid rgba(0,26,77,.12);border-top:0;">
      <p style="margin:0 0 18px;font-size:16px;line-height:1.65;">Hallo ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.65;">Hier is de whitepaper waar je om vroeg. Veel leesplezier.</p>
      <p style="margin:0 0 24px;">
        <a href="${pdfUrl}" style="display:inline-block;background:#0fa8cb;color:#0e1525;text-decoration:none;padding:13px 24px;font-size:14px;font-weight:600;letter-spacing:.03em;">Download de PDF &rarr;</a>
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b6478;">
        Liever online lezen? Dat kan <a href="${pageUrl}" style="color:#0fa8cb;">op de site</a>.
      </p>
      <p style="margin:0 0 6px;font-size:16px;line-height:1.65;">Ik hoor het graag als er iets in blijft haken — een reactie op deze mail komt gewoon bij me aan.</p>
      <p style="margin:22px 0 0;font-size:16px;line-height:1.65;">Met vriendelijke groet,<br>Rob de Rooij</p>
      <p style="margin:22px 0 0;padding-top:18px;border-top:1px solid rgba(0,26,77,.08);font-size:12px;color:#6b6478;">
        R.O.B. Concepting &middot; <a href="${SITE}" style="color:#6b6478;">rob-concepting.com</a><br>
        Je gegevens gebruik ik alleen om je deze whitepaper te sturen. Geen nieuwsbrief, geen doorverkoop.
      </p>
    </div>
  </div>
</body></html>`;

  try {
    await sendMail(resendKey, {
      from: fromEmail,
      to: [email],
      subject: `Je whitepaper: ${paper.title}`,
      text: visitorText,
      html: visitorHtml,
      reply_to: toRob
    });
  } catch (err) {
    console.error('whitepaper visitor-mail error:', err.message);
    return json({ error: 'De mail kon niet verstuurd worden. Probeer het zo nog eens.' }, 502, origin);
  }

  // ── 2. Notificatie naar Rob (fire-and-forget: faalt stil) ──
  const leadText = `Nieuwe whitepaper-aanvraag via ${SITE}

Naam: ${name}
E-mail: ${email}
Whitepaper: ${paper.title}
Tijd: ${timestamp}

De PDF is automatisch naar deze persoon gestuurd.`;

  sendMail(resendKey, {
    from: fromEmail,
    to: [toRob],
    subject: `Whitepaper-aanvraag — ${name}`,
    text: leadText,
    reply_to: email
  }).catch(e => console.error('whitepaper lead-notify error:', e.message));

  return json({ ok: true }, 200, origin);
};
