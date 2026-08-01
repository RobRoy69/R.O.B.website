// R.O.B. Concepting — de sessie van het beheerscherm.
//
// WAAROM DIT ER IS. Schrijven naar het register vraagt de service-role-sleutel. Die stond
// tot nu toe in Robs eigen omgeving, en dat werkt zolang Rob het zelf doet vanaf zijn eigen
// machine met een terminal. Het werkt niet zodra iemand anders publiceert, en het is niet
// over te dragen aan een klant: die sleutel geeft schrijfrechten op het hele register.
//
// Hier blijft de sleutel server-side. De browser krijgt hem nooit te zien; hij stuurt alleen
// een verzoek, en deze laag bepaalt of dat verzoek van Rob komt.
//
// WAAROM EEN WACHTWOORD EN GEEN MAGIC LINK. Een maillink hangt aan RESEND_API_KEY en aan een
// mailbox die op dat moment bereikbaar moet zijn. Voor één gebruiker is dat een extra
// afhankelijkheid zonder extra zekerheid. Eén sterk wachtwoord in een env-var, een
// ondertekend cookie, en een vertraging bij fout raden.
//
// WAAROM HET COOKIE ONDERTEKEND IS EN NIET OPGESLAGEN. Stateless, net als token.js: het
// cookie draagt zijn eigen vervaldatum plus een HMAC. Geen tabel, niets op te schonen, en
// niets dat kan blijven staan nadat het had moeten vervallen.

import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export const SESSIE_MS = 12 * 60 * 60 * 1000; // 12 uur — één werkdag, niet een week
export const COOKIE = 'rob_beheer';

/** Het wachtwoord dat toegang geeft. Zonder env-var is het scherm dicht, niet open. */
export function wachtwoordGezet() {
  const w = process.env.BEHEER_WACHTWOORD;
  return typeof w === 'string' && w.length >= 12;
}

/**
 * Waaróm het scherm dicht is. "Ontbreekt of is te kort" was één melding voor drie oorzaken,
 * en dan sta je te gissen tussen een verkeerde scope, een typefout in de naam en een te kort
 * wachtwoord. Dit onderscheidt ze zonder de waarde prijs te geven: aanwezigheid en de vraag
 * of hij lang genoeg is, meer niet.
 */
export function waaromDicht() {
  const w = process.env.BEHEER_WACHTWOORD;
  if (w === undefined) {
    return 'BEHEER_WACHTWOORD komt niet aan bij de functie. Controleer de naam en of de scope op Functions staat; na een wijziging is één nieuwe deploy nodig.';
  }
  if (typeof w !== 'string' || w.trim() === '') {
    return 'BEHEER_WACHTWOORD is er wel maar is leeg.';
  }
  if (w.length < 12) {
    return `BEHEER_WACHTWOORD is er wel maar telt ${w.length} tekens; er zijn er minstens twaalf nodig.`;
  }
  return '';
}

function sleutel() {
  const w = process.env.BEHEER_WACHTWOORD;
  if (!w) return null;
  // De cookiesleutel is afgeleid, niet het wachtwoord zelf. Eenrichtings: uit een cookie
  // valt het wachtwoord niet terug te rekenen.
  return createHash('sha256').update('rob-beheer-sessie:' + w).digest('hex');
}

/** Vergelijkt in constante tijd — anders lekt de responstijd hoeveel tekens kloppen. */
export function wachtwoordKlopt(ingevoerd) {
  const echt = process.env.BEHEER_WACHTWOORD;
  if (!echt) return false;
  const a = Buffer.from(String(ingevoerd ?? ''), 'utf-8');
  const b = Buffer.from(echt, 'utf-8');
  // Even lang maken vóór de vergelijking; timingSafeEqual eist gelijke lengte en zou anders
  // via de uitzondering alsnog de lengte verraden.
  const n = Math.max(a.length, b.length, 1);
  const pa = Buffer.alloc(n), pb = Buffer.alloc(n);
  a.copy(pa); b.copy(pb);
  return timingSafeEqual(pa, pb) && a.length === b.length;
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

export function maakSessie() {
  const key = sleutel();
  if (!key) return null;
  const body = b64url(JSON.stringify({ t: Date.now() }));
  return `${body}.${b64url(createHmac('sha256', key).update(body).digest())}`;
}

export function sessieGeldig(waarde) {
  const key = sleutel();
  if (!key) return false;
  const delen = String(waarde || '').split('.');
  if (delen.length !== 2 || !delen[0] || !delen[1]) return false;
  const verwacht = b64url(createHmac('sha256', key).update(delen[0]).digest());
  const a = Buffer.from(delen[1], 'utf-8'), b = Buffer.from(verwacht, 'utf-8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const { t } = JSON.parse(Buffer.from(delen[0], 'base64url').toString('utf-8'));
    return typeof t === 'number' && Date.now() - t < SESSIE_MS;
  } catch { return false; }
}

export const leesCookie = (kop, naam) =>
  String(kop || '').split(';').map(s => s.trim().split('='))
    .filter(([k]) => k === naam).map(([, v]) => v)[0] || '';

// Secure en HttpOnly: niet leesbaar voor script, niet over http. SameSite=Strict omdat dit
// scherm nooit vanaf een andere site benaderd hoeft te worden — dat sluit CSRF uit zonder
// een apart token.
export const zetCookie = (waarde, seconden) =>
  `${COOKIE}=${waarde}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconden}`;
