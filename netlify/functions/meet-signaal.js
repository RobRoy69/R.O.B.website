function env(name) {
  return globalThis.Netlify?.env?.get(name) || process.env[name];
}

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

const PROFIELEN = new Set(['onbeheerd', 'reactief', 'in-opbouw', 'beheerst', 'aantoonbaar']);
const SLEUTELS = new Set(['aanbeveelbaarheid', 'stem', 'beslisrecht', 'kennisgezag']);

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Gebruik POST.' });
  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'Ongeldige aanvraag.' }); }
  if (body?.consent !== true || body?.event !== 'scan_completed' || !PROFIELEN.has(body?.profiel) || !SLEUTELS.has(body?.zwaksteSleutel)) {
    return json(400, { error: 'Expliciete toestemming en een geldige geaggregeerde uitkomst zijn vereist.' });
  }
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json(503, { error: 'Meten is tijdelijk niet beschikbaar.' });
  const response = await fetch(`${url}/rest/v1/events`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({ event_name: 'scan_completed', ring: 'private', object_ref: `scan:v2:${body.profiel}:${body.zwaksteSleutel}` })
  });
  if (!response.ok) return json(502, { error: 'Het signaal kon niet worden opgeslagen.' });
  return json(202, { accepted: true });
};

export const config = { path: '/api/meet-signaal' };
