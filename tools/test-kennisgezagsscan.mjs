import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { berekenScan, valideerContract } from '../kennisgezagsscan/scan-model.js';
import scanResult from '../netlify/functions/scan-result.js';
import meetSignaal from '../netlify/functions/meet-signaal.js';

const contract = JSON.parse(await readFile(new URL('../kennisgezagsscan/vragen.json', import.meta.url), 'utf8'));
valideerContract(contract);

const antwoordenMet = (waarde) => Object.fromEntries(contract.vragen.map((vraag) => [vraag.id, waarde]));

const onbeheerd = berekenScan(contract, antwoordenMet(0));
assert.equal(onbeheerd.percentage, 0);
assert.equal(onbeheerd.profiel.id, 'onbeheerd');
assert.equal(onbeheerd.zwaksteSleutel.id, 'aanbeveelbaarheid', 'gelijke scores volgen de contractvolgorde');

const aantoonbaar = berekenScan(contract, antwoordenMet(2));
assert.equal(aantoonbaar.percentage, 100);
assert.equal(aantoonbaar.profiel.id, 'aantoonbaar');

const midden = berekenScan(contract, antwoordenMet(1));
assert.equal(midden.percentage, 50);
assert.equal(midden.profiel.id, 'in-opbouw');

const zwakkeStem = antwoordenMet(2);
for (const vraag of contract.vragen.filter((vraag) => vraag.sleutel === 'stem')) zwakkeStem[vraag.id] = 0;
const uitslag = berekenScan(contract, zwakkeStem);
assert.equal(uitslag.zwaksteSleutel.id, 'stem');
assert.equal(uitslag.sleutels.find((sleutel) => sleutel.id === 'stem').percentage, 0);

assert.throws(() => berekenScan(contract, { ...antwoordenMet(1), [contract.vragen[0].id]: 3 }), /geen geldig antwoord/);
assert.throws(() => berekenScan(contract, {}), /geen geldig antwoord/);

const verkeerdeOrigin = await scanResult(new Request('https://rob-concepting.com/api/scan-result', {
  method: 'POST', headers: { origin: 'https://example.org', 'content-type': 'application/json' }, body: '{}'
}));
assert.equal(verkeerdeOrigin.status, 403);

const ongeldigeMail = await scanResult(new Request('https://rob-concepting.com/api/scan-result', {
  method: 'POST', headers: { origin: 'https://rob-concepting.com', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Test', email: 'ongeldig', antwoorden: {} })
}));
assert.equal(ongeldigeMail.status, 400);

const onveiligSignaal = await meetSignaal(new Request('https://rob-concepting.com/api/meet-signaal', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consent: true, event: 'scan_completed', profiel: 'zelf-verzonnen', zwaksteSleutel: 'stem', object_ref: 'vrije-invoer' })
}));
assert.equal(onveiligSignaal.status, 400);

console.log('Kennisgezagsscan: contract, berekening en servergrenzen groen.');
