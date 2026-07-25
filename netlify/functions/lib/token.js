// R.O.B. Concepting — bevestigingstokens voor de whitepaper-download (double opt-in).
//
// Stateless en zelf-verifiërend: het token draagt zijn eigen payload plus een
// HMAC-SHA256-signatuur. Geen database nodig, niets op te schonen.
//
// Sleutel: env-var WHITEPAPER_SECRET als die is gezet, anders afgeleid uit
// RESEND_API_KEY (die is hoog-entropisch en server-only). De afleiding is
// eenrichtings — uit de tokensleutel valt de API-key niet te herleiden.
// Gevolg van de fallback: bij het roteren van RESEND_API_KEY vervallen
// openstaande links. Acceptabel, want ze verlopen toch binnen 7 dagen.

import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dagen

function secret() {
  const explicit = process.env.WHITEPAPER_SECRET;
  if (explicit && explicit.length >= 16) return explicit;
  const resend = process.env.RESEND_API_KEY;
  if (!resend) return null;
  return createHash('sha256').update('rob-whitepaper-token:' + resend).digest('hex');
}

const b64url   = buf => Buffer.from(buf).toString('base64url');
const unb64url = s   => Buffer.from(String(s), 'base64url');

/** Maakt een ondertekend token voor (e-mail, naam, paper-slug). */
export function signToken({ email, name, slug }) {
  const key = secret();
  if (!key) return null;
  const body = b64url(JSON.stringify({ e: email, n: name, s: slug, t: Date.now() }));
  const sig  = b64url(createHmac('sha256', key).update(body).digest());
  return `${body}.${sig}`;
}

/**
 * Controleert een token.
 * @returns {{ok:true, email, name, slug}} bij een geldig token
 *          {{ok:false, reason:'invalid'|'expired'|'no_secret'}} anders
 */
export function verifyToken(token) {
  const key = secret();
  if (!key) return { ok: false, reason: 'no_secret' };

  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'invalid' };
  const [body, sig] = parts;

  const expected = b64url(createHmac('sha256', key).update(body).digest());
  const a = Buffer.from(sig, 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'invalid' };

  let payload;
  try {
    payload = JSON.parse(unb64url(body).toString('utf-8'));
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (!payload || typeof payload.t !== 'number' || !payload.e || !payload.s) {
    return { ok: false, reason: 'invalid' };
  }
  if (Date.now() - payload.t > MAX_AGE_MS) return { ok: false, reason: 'expired' };

  return { ok: true, email: payload.e, name: payload.n || '', slug: payload.s };
}
