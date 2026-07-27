// R.O.B. Concepting — vertrouwelijk chat-archief en de meting erop.
//
// Uit chat.js gehaald op 2026-07-26. Reden: de faalpaden waren niet te testen. chat.js
// importeert de AI-SDK, en die staat niet in elke omgeving klaar, dus elke test van het
// archief sleepte de hele streaming-laag mee. Een alarm dat je niet kunt afvuren is zelf
// een aanname — precies wat dit bestand moet wegnemen. Hier alleen node:crypto en fetch.
//
// ARCHIEF: agora-rob-register, tabel rob_chat_sessions. Verhuisd uit 20voor12-pilot
// (D-SCHEIDING-001, zie infra/rob-chat/migrations/0002). RLS staat alleen service_role toe;
// dat weegt hier zwaarder dan op de oude plek, want de anon-key van dit project staat in de
// publieke site. Geverifieerd op prod: anon select 0 rijen, anon insert 42501.

import { createHash } from 'node:crypto';
import { mailFrom, mailToRob } from './mail.js';

// ── Meting ───────────────────────────────────────────────────────────────────
// Het archief dreef twee maanden op timing zonder dat iets dat zei: de insert was een
// zwevende belofte die de instantie-bevriezing kon verliezen. Dat het 30 keer lukte, was
// geluk. Ontdekt doordat er expliciet naar gekeken werd, niet doordat er iets meldde.
//
// ONTWERPREGEL: de meting leeft NIET in wat hij meet. Ligt Supabase eruit, dan kun je dat
// niet in Supabase schrijven. Daarom mail via Resend — ander kanaal, andere leverancier.
//
// PRIVACY: de melding bevat GEEN bezoekersinhoud. Alleen dat het misging, wanneer en
// waarom. Een storing is geen reden om alsnog een gesprek te versturen. Er is een test die
// hierop staat (tools/test-archief-alarm.mjs) en die de uitgaande mail onderschept.
let laatsteStoringsmail = 0;
const STORING_INTERVAL_MS = 30 * 60 * 1000;

// Alleen voor tests: de drempel is per instantie en zou een testreeks blokkeren.
export function _resetStoringsdrempel() { laatsteStoringsmail = 0; }

export async function meldArchiefStoring(reden) {
  console.error(`[archief] MISLUKT — ${reden}`);

  const nu = Date.now();
  if (nu - laatsteStoringsmail < STORING_INTERVAL_MS) return;
  laatsteStoringsmail = nu;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) { console.error('[archief] geen RESEND_API_KEY — storing blijft onopgemerkt'); return; }

  const toEmail   = mailToRob();
  const fromEmail = mailFrom();
  const tijd = new Date().toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short'
  });

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail, to: [toEmail],
        subject: 'R.O.B. — chat-archief slaat niet op',
        text: `Een gesprek op rob-concepting.com is NIET gearchiveerd.\n\n`
            + `Tijd: ${tijd}\nReden: ${reden}\n\n`
            + `Het gesprek zelf staat niet in deze mail: een storingsmelding is geen reden om `
            + `bezoekersinhoud te versturen. Het gesprek is verloren, niet verplaatst.\n\n`
            + `Deze melding komt maximaal eens per 30 minuten per serverinstantie.\n\n`
            + `Waar te kijken: Supabase-project agora-rob-register, tabel rob_chat_sessions, `
            + `en de omgevingsvariabelen SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in Netlify.`
      })
    });
  } catch (e) {
    // Laatste vangnet: als ook de melding faalt, is er niets meer dat het kan zeggen.
    console.error('[archief] storingsmail zelf mislukt:', e.message);
  }
}

// ── Archivering ──────────────────────────────────────────────────────────────
export async function archiveChatSession({ messages, aiText, notify, startedAt, userAgent, origin }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Was een stille return. Ontbrekende configuratie is geen "graceful fallback" maar een
  // storing: er wordt niets bewaard terwijl de site doet alsof er niets aan de hand is.
  // Precies dit pad zou de oorzaak van 2026-07-26 verzwegen hebben.
  if (!url || !key) {
    const ontbreekt = [!url && 'SUPABASE_URL', !key && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean).join(' en ');
    await meldArchiefStoring(`configuratie ontbreekt (${ontbreekt} niet gezet)`);
    return;
  }

  const conversation = [...messages, { role: 'assistant', content: aiText }];
  const turnCount = messages.filter(m => m.role === 'user').length;
  const uaHash = userAgent
    ? createHash('sha256').update(userAgent).digest('hex').slice(0, 16)
    : null;
  const row = {
    call_at: new Date(startedAt).toISOString(),
    turn_count: turnCount,
    notify_sent: !!notify,
    conversation,
    ai_response: aiText,
    source_url: origin || null,
    user_agent_hash: uaHash,
    duration_ms: Date.now() - startedAt
  };

  try {
    const res = await fetch(`${url}/rest/v1/rob_chat_sessions`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      await meldArchiefStoring(`Supabase gaf ${res.status} — ${err.slice(0, 200)}`);
      return;
    }
    // Positief spoor. Zonder dit is "het werkt" alleen af te leiden uit de afwezigheid van
    // een fout, en afwezigheid van een fout was op 2026-07-26 precies het probleem.
    console.log('[archief] opgeslagen');
  } catch (e) {
    await meldArchiefStoring(`verzoek mislukte — ${e.message}`);
  }
}
