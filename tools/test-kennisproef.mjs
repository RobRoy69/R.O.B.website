import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import kennisproef, { analyseHtml, isPrivateAddress } from '../netlify/functions/kennisproef.js';
import meetSignaal from '../netlify/functions/meet-signaal.js';

for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', 'fc00::1', '::ffff:8.8.8.8']) {
  assert.equal(isPrivateAddress(address), true, `${address} moet geblokkeerd zijn`);
}
for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) {
  assert.equal(isPrivateAddress(address), false, `${address} moet publiek zijn`);
}

const sterkePagina = `<!doctype html><html><head>
<title>Kennis organiseren voor betrouwbare AI</title>
<meta name="description" content="Een controleerbare uitleg over organisatiekennis.">
<meta name="author" content="Voorbeeldorganisatie">
<meta property="article:published_time" content="2026-07-30T10:00:00+02:00">
<link rel="canonical" href="https://example.com/kennis">
</head><body><main><article><h1>Kennis organiseren voor betrouwbare AI</h1><h2>De kern</h2>
<p>Een organisatie kan haar belangrijkste kennis beheren wanneer iedere bewering een eigenaar, bron en controledatum heeft. Dit is mogelijk als duidelijk is wie een bewering mag vaststellen en intrekken.</p>
<p>De aanpak heeft een zichtbare beperking: een bronverwijzing bewijst niet automatisch dat de inhoud waar is. Daarom kan een menselijke eigenaar het oordeel herzien wanneer nieuwe informatie beschikbaar wordt.</p>
<p>Deze extra alinea zorgt ervoor dat de hoofdinhoud lang genoeg is voor een betrouwbare extractie en beschrijft hoe een organisatie haar publieke kennis zichtbaar, herleidbaar en begrensd kan aanbieden.</p>
<p><a href="https://example.org/source-a">Bron A</a> en <a href="https://example.net/source-b">Bron B</a>.</p>
</article></main></body></html>`;
const sterk = analyseHtml(sterkePagina, 'https://example.com/kennis');
assert.equal(sterk.verdict.id, 'sterk');
assert.equal(sterk.findings.length, 5);
assert.equal(sterk.date, '2026-07-30');
assert.equal(sterk.author, 'Voorbeeldorganisatie');
assert.ok(sterk.candidateClaims.count >= 1);
assert.ok(sterk.candidateClaims.samples.length <= 2);
assert.ok(sterk.candidateClaims.samples.join(' ').split(/\s+/).length <= 20);

const browserCode = await readFile(new URL('../kennisproef/app.js', import.meta.url), 'utf8');
assert.ok(!browserCode.includes('innerHTML'), 'Externe paginadata mag niet als HTML worden ingevoegd');

const privateResponse = await kennisproef(new Request('https://rob-concepting.com/api/kennisproef', {
  method: 'POST', headers: { origin: 'https://rob-concepting.com', 'content-type': 'application/json' }, body: JSON.stringify({ url: 'http://127.0.0.1/admin' }),
}));
assert.equal(privateResponse.status, 400);

const wrongOrigin = await kennisproef(new Request('https://rob-concepting.com/api/kennisproef', {
  method: 'POST', headers: { origin: 'https://example.org', 'content-type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com/' }),
}));
assert.equal(wrongOrigin.status, 403);

const invalidSignal = await meetSignaal(new Request('https://rob-concepting.com/api/meet-signaal', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consent: true, event: 'knowledge_test_completed', gereedheid: 'zelf-verzonnen', url: 'https://example.com/' }),
}));
assert.equal(invalidSignal.status, 400);

console.log('Kennisproef: analyse, SSRF-grenzen, uitvoerveiligheid en meetcontract groen.');
