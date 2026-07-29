import dns from 'node:dns/promises';
import net from 'node:net';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function privateIp(address) {
  if (address === '::1' || address === '::' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe8') || address.startsWith('fe9') || address.startsWith('fea') || address.startsWith('feb')) return true;
  if (net.isIP(address) !== 4) return false;
  const [a, b] = address.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function validatePublicUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('Vul een geldig webadres in.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Alleen een publieke http- of https-URL is toegestaan.');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Een afwijkende netwerkpoort is niet toegestaan.');
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => privateIp(address))) throw new Error('Dit adres is niet publiek bereikbaar.');
  return url;
}

async function fetchHtml(raw) {
  let url = await validatePublicUrl(raw);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': 'ROB-Kennisproef/1.0 (+https://rob-concepting.com/kennisproef/)', accept: 'text/html,application/xhtml+xml' } });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      if (redirect === MAX_REDIRECTS) throw new Error('De pagina verwijst te vaak door.');
      const location = res.headers.get('location');
      if (!location) throw new Error('De pagina geeft een onvolledige doorverwijzing.');
      url = await validatePublicUrl(new URL(location, url).href);
      continue;
    }
    if (!res.ok) throw new Error(`De pagina antwoordt met status ${res.status}.`);
    if (!(res.headers.get('content-type') || '').toLowerCase().includes('text/html')) throw new Error('De URL verwijst niet naar een HTML-pagina.');
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) throw new Error('De pagina is groter dan de veilige limiet van 1 MB.');
    const reader = res.body.getReader(); let size = 0; const chunks = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_BYTES) { await reader.cancel(); throw new Error('De pagina is groter dan de veilige limiet van 1 MB.'); } chunks.push(value); }
    const merged = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
    return { html: new TextDecoder().decode(merged), url: url.href };
  }
  throw new Error('De pagina kon niet worden opgehaald.');
}

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Gebruik POST.' });
  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'Ongeldige aanvraag.' }); }
  if (typeof body.url !== 'string' || body.url.length > 2048) return json(400, { error: 'Vul één geldig webadres in.' });
  try {
    const { html, url } = await fetchHtml(body.url);
    const { document } = parseHTML(html);
    document.location = new URL(url);
    // Readability mag de DOM opschonen. Tel zichtbare bronlinks daarom vóór de parse.
    const links = [...document.querySelectorAll('main a[href], article a[href]')]
      .filter(a => /^https?:/i.test(a.href || '')).length;
    const article = new Readability(document).parse();
    if (!article?.textContent || article.textContent.trim().length < 200) return json(422, { error: 'Op deze pagina is te weinig hoofdinhoud herkenbaar.' });
    const meta = (selector) => document.querySelector(selector)?.getAttribute('content')?.trim();
    const date = meta('meta[property="article:published_time"]') || meta('meta[name="date"]') || document.querySelector('time[datetime]')?.getAttribute('datetime');
    const author = article.byline || meta('meta[name="author"]');
    const boundaryWords = (article.textContent.match(/\b(niet|onzeker|beperking|voorbehoud|kan|mogelijk)\b/gi) || []).length;
    const findings = [
      { label: 'Vindbaarheid', explanation: article.title ? `De hoofdinhoud heeft een herkenbare titel: “${article.title.slice(0, 120)}”.` : 'Een eenduidige titel ontbreekt.' },
      { label: 'Afzender', explanation: author ? `De pagina noemt ${author.slice(0, 100)} als afzender.` : 'In de hoofdinhoud is geen duidelijke menselijke of organisatorische afzender gevonden.' },
      { label: 'Actualiteit', explanation: date ? `Er is een machineleesbare datum gevonden: ${date.slice(0, 32)}.` : 'Er is geen duidelijke machineleesbare publicatie- of controledatum gevonden.' },
      { label: 'Bronbaarheid', explanation: links ? `In de hoofdsectie zijn ${links} externe verwijzing${links === 1 ? '' : 'en'} gevonden; de kwaliteit daarvan is niet automatisch beoordeeld.` : 'In de hoofdsectie zijn geen externe bronverwijzingen gevonden.' },
      { label: 'Grenzen', explanation: boundaryWords ? `De tekst bevat ${boundaryWords} zichtbare signalen van onzekerheid of begrenzing.` : 'De tekst maakt onzekerheid of toepassingsgrenzen niet duidelijk zichtbaar.' },
    ];
    return json(200, { url, title: article.title, summary: 'Dit is een reproduceerbare inspectie van kennisgereedheid. De uitkomst zegt niet of de inhoud waar is.', findings });
  } catch (error) {
    return json(422, { error: error?.message || 'De kennisproef kon niet worden uitgevoerd.' });
  }
};

export const config = { path: '/api/kennisproef' };
