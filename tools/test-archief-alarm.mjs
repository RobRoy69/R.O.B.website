// R.O.B. Concepting — vuurt het archief-alarm echt af.
//
// AANLEIDING. Op 2026-07-26 bleek het chat-archief twee maanden op timing te hebben
// gedreven zonder dat iets dat meldde. Er kwam een meting op. Maar een alarm dat nooit is
// afgegaan is zélf een aanname — dezelfde soort aanname als het probleem dat het moet
// vangen. Deze test gaat er één keer echt op staan.
//
// Wat hier NIET wordt getest: of Resend de mail ook aflevert. Dat vraagt de productie-
// sleutel en zou Rob een echte mail sturen. Het transport is al bewezen door de
// notificatiemails die langs dezelfde weg zijn aangekomen; wat onbewezen was, is de
// DETECTIE en de ROUTERING — en dat is precies wat hier wel wordt afgevuurd.
//
// Draai: node tools/test-archief-alarm.mjs

import { archiveChatSession, _resetStoringsdrempel } from '../netlify/functions/lib/archief.js';

const echteFetch = globalThis.fetch;
let uitgaandeMail = null;
let uitgaandeInsert = null;

// Onderschep alles wat naar buiten gaat. Geen enkel verzoek verlaat deze test.
globalThis.fetch = async (url, opties = {}) => {
  const u = String(url);
  if (u.includes('api.resend.com')) {
    uitgaandeMail = JSON.parse(opties.body);
    return { ok: true, status: 200, text: async () => '' };
  }
  uitgaandeInsert = { url: u, body: JSON.parse(opties.body) };
  if (u.includes('onbereikbaar.invalid')) throw new Error('getaddrinfo ENOTFOUND');
  if (u.includes('weigert.test'))         return { ok: false, status: 401, text: async () => '{"message":"Invalid API key"}' };
  return { ok: true, status: 201, text: async () => '' };
};

// Een gesprek met herkenbare bezoekersinhoud, zodat lekken meteen opvalt.
const GEHEIM = 'MIJN-VERTROUWELIJKE-BEZOEKERSTEKST';
const gesprek = {
  messages: [{ role: 'user', content: GEHEIM }],
  aiText: 'Antwoord van R.O.B. met ' + GEHEIM,
  notify: false,
  startedAt: Date.now() - 1200,
  userAgent: 'Mozilla/5.0 testbrowser',
  origin: 'https://rob-concepting.com',
};

const logs = [];
const echteLog = console.log, echteErr = console.error;
const vang = () => { console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' ')); };
const herstel = () => { console.log = echteLog; console.error = echteErr; };

let gezakt = 0;
const toets = (naam, voorwaarde, detail = '') => {
  echteLog(`  ${voorwaarde ? '✓' : '✗'} ${naam}${voorwaarde ? '' : `  ← ${detail}`}`);
  if (!voorwaarde) gezakt++;
};

const draai = async (naam, env, verwachtInMelding) => {
  _resetStoringsdrempel();
  logs.length = 0; uitgaandeMail = null; uitgaandeInsert = null;
  Object.assign(process.env, env);
  vang();
  await archiveChatSession(gesprek);
  herstel();

  echteLog(`\n${naam}`);
  const melding = logs.find(l => l.includes('[archief] MISLUKT')) || '';
  toets('alarm afgegaan', !!melding, `logs: ${JSON.stringify(logs)}`);
  toets(`reden klopt (${verwachtInMelding})`, melding.includes(verwachtInMelding), melding);
  toets('mail verstuurd', !!uitgaandeMail, 'geen uitgaand Resend-verzoek');
  if (uitgaandeMail) {
    const heleMail = JSON.stringify(uitgaandeMail);
    toets('GEEN bezoekersinhoud in de mail', !heleMail.includes(GEHEIM), 'GESPREK LEKT NAAR DE MAIL');
    toets('onderwerp herkenbaar', /archief slaat niet op/.test(uitgaandeMail.subject), uitgaandeMail.subject);
    toets('reden staat in de mail', uitgaandeMail.text.includes(verwachtInMelding), 'reden ontbreekt');
  }
};

echteLog('ARCHIEF-ALARM — de faalpaden echt afvuren\n' + '='.repeat(46));

process.env.RESEND_API_KEY = 'test-sleutel-niet-echt';

await draai('1. configuratie ontbreekt (was een STILLE return)',
  { SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' }, 'configuratie ontbreekt');

await draai('2. Supabase weigert (autorisatie)',
  { SUPABASE_URL: 'https://weigert.test', SUPABASE_SERVICE_ROLE_KEY: 'x' }, 'Supabase gaf 401');

await draai('3. verzoek gooit (het geval van 2026-07-26)',
  { SUPABASE_URL: 'https://onbereikbaar.invalid', SUPABASE_SERVICE_ROLE_KEY: 'x' }, 'verzoek mislukte');

// 4. succespad
_resetStoringsdrempel();
logs.length = 0; uitgaandeMail = null; uitgaandeInsert = null;
Object.assign(process.env, { SUPABASE_URL: 'https://werkt.test', SUPABASE_SERVICE_ROLE_KEY: 'x' });
vang(); await archiveChatSession(gesprek); herstel();
echteLog('\n4. succespad');
toets('positief spoor gelogd', logs.some(l => l.includes('[archief] opgeslagen')), JSON.stringify(logs));
toets('geen alarm', !logs.some(l => l.includes('MISLUKT')), 'vals alarm');
toets('geen mail', !uitgaandeMail, 'mail bij succes');
toets('gesprek gaat WEL naar het archief', JSON.stringify(uitgaandeInsert.body).includes(GEHEIM), 'insert mist inhoud');
toets('user-agent gehasht, niet rauw', !JSON.stringify(uitgaandeInsert.body).includes('Mozilla'), 'rauwe UA opgeslagen');

// 5. drempel
logs.length = 0; uitgaandeMail = null;
Object.assign(process.env, { SUPABASE_URL: 'https://onbereikbaar.invalid' });
vang(); await archiveChatSession(gesprek); const eerste = uitgaandeMail;
uitgaandeMail = null; await archiveChatSession(gesprek); herstel();
echteLog('\n5. drempel tegen mailstroom');
toets('eerste storing mailt', !!eerste, 'geen eerste mail');
toets('tweede storing binnen 30 min mailt NIET', !uitgaandeMail, 'mailstroom bij aanhoudende storing');

globalThis.fetch = echteFetch;
echteLog('\n' + '='.repeat(46));
echteLog(gezakt === 0 ? 'ALLE TOETSEN GESLAAGD' : `${gezakt} TOETS(EN) GEZAKT`);
process.exit(gezakt === 0 ? 0 : 1);
