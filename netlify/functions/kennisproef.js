import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TOTAL_TIMEOUT_MS = 12_000;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 8;

class KennisproefError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function createBlockedAddresses() {
  const blocked = new net.BlockList();
  for (const [address, prefix] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
    ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
    ['224.0.0.0', 4], ['240.0.0.0', 4],
  ]) blocked.addSubnet(address, prefix, 'ipv4');
  for (const [address, prefix] of [
    ['::', 128], ['::1', 128], ['64:ff9b:1::', 48],
    ['100::', 64], ['2001::', 23], ['2001:db8::', 32], ['fc00::', 7],
    ['fe80::', 10], ['ff00::', 8],
  ]) blocked.addSubnet(address, prefix, 'ipv6');
  return blocked;
}

export function isPrivateAddress(address) {
  if (String(address).toLowerCase().startsWith('::ffff:')) return true;
  const family = net.isIP(address);
  if (!family) return true;
  return createBlockedAddresses().check(address, family === 4 ? 'ipv4' : 'ipv6');
}

function parsePublicUrl(raw) {
  let url;
  try { url = new URL(String(raw || '').trim()); }
  catch { throw new KennisproefError('Vul een geldig webadres in.', 400); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new KennisproefError('Alleen een publieke http- of https-URL zonder inloggegevens is toegestaan.', 400);
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.lan')) {
    throw new KennisproefError('Dit adres is niet publiek bereikbaar.', 400);
  }
  const verwachtePoort = url.protocol === 'https:' ? '443' : '80';
  if (url.port && url.port !== verwachtePoort) throw new KennisproefError('Een afwijkende netwerkpoort is niet toegestaan.', 400);
  url.hash = '';
  return url;
}

async function resolvePublicAddress(url) {
  if (net.isIP(url.hostname)) {
    if (isPrivateAddress(url.hostname)) throw new KennisproefError('Dit adres is niet publiek bereikbaar.', 400);
    return { address: url.hostname, family: net.isIP(url.hostname) };
  }
  let addresses;
  try { addresses = await dns.lookup(url.hostname, { all: true, verbatim: true }); }
  catch { throw new KennisproefError('De domeinnaam kon niet worden gevonden.'); }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new KennisproefError('Dit adres is niet publiek bereikbaar.', 400);
  }
  return addresses[0];
}

function requestHtml(url, resolved, timeoutMs) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request(url, {
      method: 'GET',
      servername: url.hostname,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-encoding': 'identity',
        'user-agent': 'ROB-Kennisproef/1.0 (+https://rob-concepting.com/kennisproef/)',
      },
      lookup(_hostname, options, callback) {
        if (options?.all) callback(null, [resolved]);
        else callback(null, resolved.address, resolved.family);
      },
      timeout: timeoutMs,
    }, (response) => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.resume();
        resolve({ redirect: response.headers.location });
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        reject(new KennisproefError(`De pagina antwoordt met status ${status}.`));
        return;
      }
      const contentType = String(response.headers['content-type'] || '').toLowerCase();
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        response.resume();
        reject(new KennisproefError('De URL verwijst niet naar een HTML-pagina.'));
        return;
      }
      const encoding = String(response.headers['content-encoding'] || 'identity').toLowerCase();
      if (encoding !== 'identity') {
        response.resume();
        reject(new KennisproefError('De server leverde een onverwacht gecomprimeerd antwoord.'));
        return;
      }
      const declared = Number(response.headers['content-length'] || 0);
      if (declared > MAX_BYTES) {
        response.resume();
        reject(new KennisproefError('De pagina is groter dan de veilige limiet van 1 MB.', 413));
        return;
      }
      let size = 0;
      const chunks = [];
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BYTES) response.destroy(new KennisproefError('De pagina is groter dan de veilige limiet van 1 MB.', 413));
        else chunks.push(chunk);
      });
      response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new KennisproefError('De pagina reageert niet binnen de veilige tijdslimiet.', 504)));
    request.on('error', (error) => reject(error instanceof KennisproefError ? error : new KennisproefError('De pagina kon niet veilig worden opgehaald.')));
    request.end();
  });
}

async function fetchHtml(raw) {
  let url = parsePublicUrl(raw);
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const remaining = deadline - Date.now();
    if (remaining < 500) throw new KennisproefError('De pagina reageert niet binnen de veilige tijdslimiet.', 504);
    const resolved = await resolvePublicAddress(url);
    const result = await requestHtml(url, resolved, remaining);
    if (!result.redirect) return { html: result.html, url: url.href };
    if (redirect === MAX_REDIRECTS) throw new KennisproefError('De pagina verwijst te vaak door.');
    try { url = parsePublicUrl(new URL(result.redirect, url).href); }
    catch (error) { throw error instanceof KennisproefError ? error : new KennisproefError('De pagina geeft een onveilige doorverwijzing.'); }
  }
  throw new KennisproefError('De pagina kon niet worden opgehaald.');
}

function woorden(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9à-ÿ\s]/gi, ' ').split(/\s+/).filter((woord) => woord.length > 2);
}

function titelOvereenkomst(a, b) {
  const links = new Set(woorden(a));
  const rechts = new Set(woorden(b));
  if (!links.size || !rechts.size) return null;
  const overlap = [...links].filter((woord) => rechts.has(woord)).length;
  return overlap / Math.min(links.size, rechts.size);
}

function statusVoor(punten, maximum = 2) {
  if (punten >= maximum) return 'sterk';
  if (punten > 0) return 'gedeeltelijk';
  return 'ontbreekt';
}

function kandidaatBeweringen(text) {
  const kandidaten = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)
    .map((zin) => zin.trim())
    .filter((zin) => zin.length >= 60 && zin.length <= 280 && !zin.endsWith('?') && /\b(is|zijn|heeft|hebben|kan|kunnen|wordt|worden|blijkt|toont|bedraagt|stijgt|daalt)\b/i.test(zin))
  return {
    count: kandidaten.length,
    samples: kandidaten.slice(0, 2).map((zin) => {
      const fragment = zin.split(/\s+/).slice(0, 10).join(' ');
      return `${fragment}${zin.split(/\s+/).length > 10 ? '…' : ''}`;
    }),
  };
}

export function analyseHtml(html, finalUrl) {
  const { document } = parseHTML(html);
  document.location = new URL(finalUrl);
  const meta = (selector) => document.querySelector(selector)?.getAttribute('content')?.trim() || '';
  const pageTitle = document.querySelector('title')?.textContent?.trim() || '';
  const h1 = document.querySelector('h1')?.textContent?.trim() || '';
  const description = meta('meta[name="description"]') || meta('meta[property="og:description"]');
  const canonicalRaw = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  let canonical = '';
  try { canonical = canonicalRaw ? new URL(canonicalRaw, finalUrl).href : ''; } catch { canonical = ''; }
  const links = [...document.querySelectorAll('main a[href], article a[href]')]
    .map((link) => { try { return new URL(link.getAttribute('href'), finalUrl); } catch { return null; } })
    .filter((url) => url && ['http:', 'https:'].includes(url.protocol) && url.hostname !== new URL(finalUrl).hostname);
  const rawDate = meta('meta[property="article:published_time"]') || meta('meta[property="article:modified_time"]') || meta('meta[name="date"]') || document.querySelector('time[datetime]')?.getAttribute('datetime') || '';
  const parsedDate = rawDate && Number.isFinite(Date.parse(rawDate)) ? new Date(rawDate).toISOString().slice(0, 10) : '';
  const metaAuthor = meta('meta[name="author"]') || meta('meta[property="article:author"]');
  const article = new Readability(document).parse();
  if (!article?.textContent || article.textContent.trim().length < 200) throw new KennisproefError('Op deze pagina is te weinig hoofdinhoud herkenbaar.');
  const text = article.textContent.trim();
  const author = String(article.byline || metaAuthor || '').trim().slice(0, 120);
  const articleDocument = parseHTML(article.content || '').document;
  const headingCount = articleDocument.querySelectorAll('h2,h3').length;
  const boundaryCount = (text.match(/\b(onzeker(?:heid)?|beperking(?:en)?|grenzen?|voorbehoud|mogelijk|waarschijnlijk|indicatie)\b|niet automatisch|hangt af|onder voorwaarden/gi) || []).length;
  const alignment = titelOvereenkomst(pageTitle || article.title, h1 || article.title);

  const hasTitle = Boolean(article.title || pageTitle);
  const vindPunten = Number(hasTitle) + Number(Boolean(description));
  const bronPunten = links.length >= 2 ? 2 : links.length === 1 ? 1 : 0;
  const actualiteitPunten = parsedDate ? 2 : 0;
  const citeerPunten = Number(Boolean(author)) + Number(Boolean(canonical || headingCount));
  const grensPunten = Number(boundaryCount > 0) + Number(alignment !== null && alignment >= 0.5);
  const findings = [
    { id: 'vindbaarheid', label: 'Vindbaarheid', status: statusVoor(vindPunten), explanation: hasTitle && description ? 'Titel en samenvatting zijn machineleesbaar aanwezig.' : hasTitle ? 'Een herkenbare titel is aanwezig, maar een machineleesbare samenvatting ontbreekt.' : description ? 'Een machineleesbare samenvatting is aanwezig, maar een herkenbare titel ontbreekt.' : 'Een herkenbare titel en machineleesbare samenvatting ontbreken.' },
    { id: 'bronbaarheid', label: 'Bronbaarheid', status: statusVoor(bronPunten), explanation: links.length ? `${links.length} externe bronverwijzing${links.length === 1 ? '' : 'en'} gevonden. De kwaliteit en juistheid daarvan zijn niet automatisch beoordeeld.` : 'In de hoofdinhoud zijn geen externe bronverwijzingen gevonden.' },
    { id: 'actualiteit', label: 'Actualiteit', status: statusVoor(actualiteitPunten), explanation: parsedDate ? `Een machineleesbare datum is gevonden: ${parsedDate}.` : 'Een geldige machineleesbare publicatie- of controledatum ontbreekt.' },
    { id: 'citeerbaarheid', label: 'Citeerbaarheid', status: statusVoor(citeerPunten), explanation: author ? `De hoofdinhoud noemt ${author} als afzender${canonical ? ' en bevat een canonieke URL' : ''}.` : `Een duidelijke afzender ontbreekt${canonical ? ', maar een canonieke URL is aanwezig' : ''}.` },
    { id: 'grenzen', label: 'Consistentie en grenzen', status: statusVoor(grensPunten), explanation: `${alignment !== null && alignment >= 0.5 ? 'Paginatitel en hoofdheading sluiten op elkaar aan.' : 'Paginatitel en hoofdheading zijn niet duidelijk gelijkgericht.'} ${boundaryCount ? 'Begrenzende of nuancerende taal is zichtbaar.' : 'Zichtbare onzekerheid of toepassingsgrenzen ontbreken.'}` },
  ];
  const punten = vindPunten + bronPunten + actualiteitPunten + citeerPunten + grensPunten;
  const verdict = punten >= 8
    ? { id: 'sterk', label: 'Sterk kennisgereed', summary: 'De pagina biedt meerdere concrete aanknopingspunten voor herleidbaar gebruik door mens en systeem.' }
    : punten >= 4
      ? { id: 'gedeeltelijk', label: 'Gedeeltelijk kennisgereed', summary: 'De basis is herkenbaar, maar enkele ontbrekende signalen beperken verantwoord hergebruik.' }
      : { id: 'beperkt', label: 'Beperkt kennisgereed', summary: 'De pagina geeft een systeem te weinig houvast voor herleidbaar en begrensd hergebruik.' };

  return {
    version: '1.0',
    url: finalUrl,
    title: String(article.title || pageTitle || 'Pagina').slice(0, 160),
    author: author || null,
    date: parsedDate || null,
    wordCount: woorden(text).length,
    verdict,
    findings,
    candidateClaims: kandidaatBeweringen(text),
    disclaimer: 'Deze inspectie beoordeelt zichtbare kennisgereedheid, niet de waarheid van de inhoud.',
  };
}

function allowedOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === 'rob-concepting.com' || host === 'www.rob-concepting.com' || host === 'rob-concepting.netlify.app' || host.endsWith('--rob-concepting.netlify.app') || host === 'localhost';
  } catch { return false; }
}

function withinRateLimit(ip) {
  if (!ip) return true;
  const buckets = globalThis.__robKennisproefRates || (globalThis.__robKennisproefRates = new Map());
  const now = Date.now();
  const current = buckets.get(ip);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + RATE_WINDOW_MS } : current;
  bucket.count += 1;
  buckets.set(ip, bucket);
  if (buckets.size > 1000) for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
  return bucket.count <= RATE_MAX;
}

export default async (request, context = {}) => {
  if (request.method !== 'POST') return json(405, { error: 'Gebruik POST.' });
  if (!allowedOrigin(request)) return json(403, { error: 'Deze aanvraag is niet toegestaan.' });
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > 4096) return json(413, { error: 'De aanvraag is te groot.' });
  const ip = context.ip || request.headers.get('x-nf-client-connection-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (!withinRateLimit(ip)) return json(429, { error: 'Te veel proeven in korte tijd. Probeer later opnieuw.' });
  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'Ongeldige aanvraag.' }); }
  if (typeof body?.url !== 'string' || !body.url.trim() || body.url.length > 2048) return json(400, { error: 'Vul één geldig webadres in.' });
  try {
    const { html, url } = await fetchHtml(body.url);
    return json(200, analyseHtml(html, url));
  } catch (error) {
    return json(error instanceof KennisproefError ? error.status : 422, { error: error?.message || 'De kennisproef kon niet worden uitgevoerd.' });
  }
};

export const config = { path: '/api/kennisproef' };
