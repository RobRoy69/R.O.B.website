// R.O.B. Concepting — whitepaper-aanvraag, stap 1 van 2 (double opt-in).
//
// Deze functie verstuurt NIET de whitepaper. Ze stuurt een bevestigingsmail met
// een ondertekende link. Pas als de aanvrager die link opent, levert
// whitepaper-confirm.js de PDF en krijgt Rob de lead.
//
// Waarom: zo is het e-mailadres aantoonbaar van de aanvrager, blijven bounces op
// verzonnen adressen uit (afzenderreputatie), en filtert de klik op werkelijke
// belangstelling — wie niet één keer klikt, was geen lead.
//
// Env-vars: RESEND_API_KEY (verplicht), NOTIFY_FROM, NOTIFY_EMAIL, WHITEPAPER_SECRET (optioneel).

import {
  SITE, getPaper, corsFor, json, mailFrom, sendMail, escapeHtml,
  makeRateLimiter, clientIp
} from './lib/papers.js';
import { signToken } from './lib/token.js';

const rateLimit = makeRateLimiter({ windowMs: 60_000, max: 3 });

export default async (req) => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsFor(origin) });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  const rl = rateLimit(clientIp(req));
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
  let name, email, paper;
  try {
    const parsed = await req.json();

    // Honeypot — stille 200 voor bots
    if (parsed._honey) return json({ ok: true }, 200, origin);

    name  = String(parsed.name  || '').trim().slice(0, 100);
    email = String(parsed.email || '').trim().slice(0, 200);

    if (!name || !email) {
      return json({ error: 'Vul je naam en e-mailadres in.' }, 400, origin);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Dat e-mailadres lijkt niet te kloppen.' }, 400, origin);
    }
    paper = getPaper(parsed.paper);
    if (!paper) {
      return json({ error: 'Onbekende whitepaper.' }, 400, origin);
    }
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400, origin);
  }

  // ── Bevestigingslink ──
  const token = signToken({ email, name, slug: paper.slug });
  if (!token) {
    console.error('[whitepaper] geen tokensleutel beschikbaar');
    return json({ error: 'De mailservice is even niet beschikbaar. Probeer het later opnieuw.' }, 503, origin);
  }
  const confirmUrl = `${SITE}/whitepapers/bevestig?t=${encodeURIComponent(token)}`;
  const firstName  = name.split(/\s+/)[0];

  const text = `Hallo ${firstName},

Je vroeg de whitepaper "${paper.title}" aan.

Eén klik nog, dan is hij onderweg:
${confirmUrl}

Zo weet ik zeker dat dit e-mailadres van jou is. De link werkt zeven dagen.

Heb je deze aanvraag niet gedaan? Dan hoef je niets te doen — zonder klik gebeurt er niets en bewaar ik je gegevens niet.

Met vriendelijke groet,
Rob de Rooij
R.O.B. Concepting
${SITE}`;

  const html = `<!DOCTYPE html><html lang="nl"><body style="margin:0;padding:0;background:#e8e4dc;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#001a4d;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#0e1525;padding:26px 28px;">
      <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#0fa8cb;margin-bottom:10px;">R.O.B. Concepting</div>
      <div style="font-size:20px;color:#ffffff;line-height:1.3;">Nog één klik</div>
    </div>
    <div style="background:#f4f2ed;padding:30px 28px;border:1px solid rgba(0,26,77,.12);border-top:0;">
      <p style="margin:0 0 18px;font-size:16px;line-height:1.65;">Hallo ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.65;">Je vroeg <strong>${escapeHtml(paper.title)}</strong> aan. Bevestig even dat dit e-mailadres van jou is, dan stuur ik de PDF direct toe.</p>
      <p style="margin:0 0 24px;">
        <a href="${confirmUrl}" style="display:inline-block;background:#0fa8cb;color:#0e1525;text-decoration:none;padding:13px 24px;font-size:14px;font-weight:600;letter-spacing:.03em;">Ja, stuur mij de whitepaper &rarr;</a>
      </p>
      <p style="margin:0 0 24px;font-size:13.5px;line-height:1.6;color:#6b6478;">De link werkt zeven dagen. Werkt de knop niet? Kopieer dan deze regel naar je browser:<br>
        <span style="word-break:break-all;color:#6b6478;">${confirmUrl}</span>
      </p>
      <p style="margin:22px 0 0;padding-top:18px;border-top:1px solid rgba(0,26,77,.08);font-size:12.5px;line-height:1.6;color:#6b6478;">
        Heb je deze aanvraag niet gedaan? Dan hoef je niets te doen — zonder klik gebeurt er niets en bewaar ik je gegevens niet.<br><br>
        R.O.B. Concepting &middot; <a href="${SITE}" style="color:#6b6478;">rob-concepting.com</a>
      </p>
    </div>
  </div>
</body></html>`;

  try {
    await sendMail(resendKey, {
      from: mailFrom(),
      to: [email],
      subject: `Bevestig je aanvraag: ${paper.title}`,
      text,
      html
    });
  } catch (err) {
    console.error('[whitepaper] bevestigingsmail mislukt:', err.message);
    return json({ error: 'De mail kon niet verstuurd worden. Probeer het zo nog eens.' }, 502, origin);
  }

  // Bewust géén lead-notificatie naar Rob: die volgt pas na bevestiging.
  return json({ ok: true, pending: true }, 200, origin);
};
