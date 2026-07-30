import contract from '../../kennisgezagsscan/vragen.json' with { type: 'json' };
import { berekenScan } from '../../kennisgezagsscan/scan-model.js';
import { mailFrom, sendMail } from './lib/mail.js';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;
const rateBuckets = new Map();

function env(name) {
  return globalThis.Netlify?.env?.get(name) || process.env[name];
}

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders }
  });
}

function geldigeOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === 'rob-concepting.com' || host === 'www.rob-concepting.com' || host === 'rob-concepting.netlify.app' || host.endsWith('--rob-concepting.netlify.app') || host === 'localhost';
  } catch { return false; }
}

function binnenLimiet(ip) {
  if (!ip) return true;
  const nu = Date.now();
  const bestaand = rateBuckets.get(ip);
  const bucket = !bestaand || bestaand.resetAt <= nu ? { count: 0, resetAt: nu + RATE_LIMIT_WINDOW_MS } : bestaand;
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return bucket.count <= RATE_LIMIT_MAX;
}

function emailTekst(name, resultaat) {
  const regels = resultaat.sleutels.map((sleutel) => `- ${sleutel.label}: ${sleutel.percentage}%`).join('\n');
  return `Beste ${name},

Dit is je uitslag van de R.O.B. Kennisgezagsscan.

PROFIEL: ${resultaat.profiel.label.toUpperCase()} — ${resultaat.percentage}%
${resultaat.profiel.uitleg}

DE VIER SLEUTELS
${regels}

BEGIN HIER: ${resultaat.zwaksteSleutel.label.toUpperCase()}
${resultaat.zwaksteSleutel.advies}

Passende verdieping:
https://rob-concepting.com${resultaat.zwaksteSleutel.verdieping}

Deze e-mail is een eenmalige verzending op jouw verzoek. Je antwoorden zijn niet opgeslagen en je bent niet ingeschreven voor een nieuwsbrief.

R.O.B. Concepting
https://rob-concepting.com/kennisgezagsscan/`;
}

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Gebruik POST.' });
  if (!geldigeOrigin(request)) return json(403, { error: 'Deze aanvraag is niet toegestaan.' });
  const ip = request.headers.get('x-nf-client-connection-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (!binnenLimiet(ip)) return json(429, { error: 'Te veel aanvragen in korte tijd. Probeer over een minuut opnieuw.' }, { 'retry-after': '60' });

  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'Ongeldige aanvraag.' }); }
  if (body?.company) return json(200, { ok: true });

  const name = String(body?.name || '').trim().slice(0, 100);
  const email = String(body?.email || '').trim().slice(0, 200);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Vul een geldige naam en een geldig e-mailadres in.' });

  let resultaat;
  try { resultaat = berekenScan(contract, body?.antwoorden); }
  catch { return json(400, { error: 'De scanantwoorden zijn onvolledig of ongeldig.' }); }

  const resendKey = env('RESEND_API_KEY');
  if (!resendKey) return json(503, { error: 'E-mail is tijdelijk niet beschikbaar. Bewaar de uitslag als PDF.' });
  try {
    await sendMail(resendKey, {
      from: mailFrom(),
      to: [email],
      subject: `Je Kennisgezagsscan — ${resultaat.profiel.label}`,
      text: emailTekst(name, resultaat)
    });
    return json(200, { ok: true });
  } catch (error) {
    console.error('scan-result:', error.message);
    return json(502, { error: 'De uitslag kon niet worden verstuurd. Bewaar haar als PDF of probeer later opnieuw.' });
  }
};

export const config = { path: '/api/scan-result' };
