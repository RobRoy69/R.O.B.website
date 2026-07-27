// R.O.B. Concepting — wie mail verstuurt en wie hem ontvangt. ENIGE BRON.
//
// AANLEIDING, 2026-07-27. Rob vroeg waar de lead-mail heen ging. Antwoord: naar
// een privé Gmail-adres — niet omdat dat ergens was ingesteld, maar omdat het als TERUGVAL
// in de broncode stond. NOTIFY_EMAIL was nooit gezet, dus die terugval was in de praktijk
// de instelling. Dat adres staat hier bewust niet meer: deze repo is publiek.
//
// Twee bezwaren:
//   · dezelfde regel stond op VIER plekken (chat.js, contact.js, lib/archief.js,
//     lib/papers.js). Een adreswijziging vroeg vier bewerkingen — precies de
//     hand-onderhouden kopie die in dit project overal de drift veroorzaakt;
//   · de repo is publiek, dus een privé-adres stond openbaar leesbaar in de bron.
//
// Nu één plek, en de terugval is het zakelijke adres. Zet NOTIFY_EMAIL om het te
// overschrijven; doe je dat niet, dan is de uitkomst nog steeds juist.

// Zakelijk adres als terugval. Bewust geen privé-adres: dit bestand staat in een
// publieke repo, en wat hier staat is openbaar leesbaar.
const STANDAARD_ONTVANGER = 'contact@rob-concepting.com';
const STANDAARD_AFZENDER  = 'R.O.B. Concepting <contact@rob-concepting.com>';

export function mailFrom() {
  return process.env.NOTIFY_FROM || STANDAARD_AFZENDER;
}

export function mailToRob() {
  return process.env.NOTIFY_EMAIL || STANDAARD_ONTVANGER;
}

export async function sendMail(key, payload) {
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
