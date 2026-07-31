function env(name) {
  return globalThis.Netlify?.env?.get(name);
}

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

const PROFIELEN = new Set(['onbeheerd', 'reactief', 'in-opbouw', 'beheerst', 'aantoonbaar']);
const SLEUTELS = new Set(['aanbeveelbaarheid', 'stem', 'beslisrecht', 'kennisgezag']);
const GEREEDHEID = new Set(['beperkt', 'gedeeltelijk', 'sterk']);

export default async (request, context = {}) => {
  if (request.method !== 'POST') return json(405, { error: 'Gebruik POST.' });
  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'Ongeldige aanvraag.' }); }
  if (body?.consent !== true) return json(400, { error: 'Expliciete toestemming is vereist.' });
  let objectRef;
  if (body.event === 'scan_completed' && PROFIELEN.has(body.profiel) && SLEUTELS.has(body.zwaksteSleutel)) {
    objectRef = `scan:v2:${body.profiel}:${body.zwaksteSleutel}`;
  } else if (body.event === 'knowledge_test_completed' && GEREEDHEID.has(body.gereedheid)) {
    objectRef = `knowledge-test:v1:${body.gereedheid}`;
  } else {
    return json(400, { error: 'Een geldige geaggregeerde uitkomst is vereist.' });
  }
  const ip = context.ip || request.headers.get('x-nf-client-connection-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (ip) {
    const buckets = globalThis.__robMeetRates || (globalThis.__robMeetRates = new Map());
    const now = Date.now();
    const current = buckets.get(ip);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + 600_000 } : current;
    bucket.count += 1;
    buckets.set(ip, bucket);
    if (bucket.count > 20) return json(429, { error: 'Te veel signalen in korte tijd.' });
  }
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json(503, { error: 'Meten is tijdelijk niet beschikbaar.' });
  const response = await fetch(`${url}/rest/v1/events`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({ event_name: body.event, ring: 'private', object_ref: objectRef })
  });
  if (!response.ok) return json(502, { error: 'Het signaal kon niet worden opgeslagen.' });
  return json(202, { accepted: true });
};

export const config = { path: '/api/meet-signaal' };
