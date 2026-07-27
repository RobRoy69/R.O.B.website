// R.O.B. Concepting — whitepapers: enige bron van waarheid.
// Gedeeld door whitepaper.js (aanvraag) en whitepaper-confirm.js (bevestiging).
// Staat in lib/ zodat Netlify het niet als eigen Function deployt.
//
// NIEUWE WHITEPAPER TOEVOEGEN: hier een entry bij, PDF in whitepapers/bestand/,
// HTML-pagina in whitepapers/, kaart in whitepapers/index.html, regel in sitemap.xml.

// Afzender, ontvanger en verzending staan in lib/mail.js — een plek, niet vier.
// Hier doorgegeven zodat bestaande imports uit dit bestand blijven werken.
export { mailFrom, mailToRob, sendMail } from './mail.js';

export const SITE = 'https://rob-concepting.com';

export const PAPERS = {
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
  },
  'wie-heeft-de-sleutels': {
    title: 'Wie heeft de sleutels? — Gezag over eigen kennis in het AI-tijdperk',
    file:  'wie-heeft-de-sleutels.pdf',
    page:  '/whitepapers/wie-heeft-de-sleutels.html'
  }
};

export function getPaper(slug) {
  const key = String(slug || '').trim();
  return Object.prototype.hasOwnProperty.call(PAPERS, key) ? { slug: key, ...PAPERS[key] } : null;
}

// ── Origins ───────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://rob-concepting.com',
  'https://www.rob-concepting.com',
  'https://rob-concepting.netlify.app'
]);

export function corsFor(origin) {
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : SITE;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

export function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsFor(origin) }
  });
}

// ── Resend ────────────────────────────────────────────────────────────────────

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ── Rate-limit (in-memory, per Function-instance) ─────────────────────────────
export function makeRateLimiter({ windowMs = 60_000, max = 3 } = {}) {
  const buckets = new Map();
  return function check(ip) {
    if (!ip) return { ok: true };
    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }
    bucket.count++;
    if (bucket.count > max) {
      return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
    }
    if (buckets.size > 1000) {
      for (const [k, v] of buckets) {
        if (v.resetAt < now) buckets.delete(k);
        if (buckets.size <= 800) break;
      }
    }
    return { ok: true };
  };
}

export function clientIp(req) {
  return req.headers.get('x-nf-client-connection-ip')
      || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
}
