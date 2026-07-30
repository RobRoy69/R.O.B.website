const geldigGetal = (waarde) => Number.isInteger(waarde) && waarde >= 0 && waarde <= 2;

export function valideerContract(contract) {
  if (!contract || !Array.isArray(contract.sleutels) || !Array.isArray(contract.vragen) || !Array.isArray(contract.profielen)) {
    throw new Error('Het scancontract is onvolledig.');
  }
  if (contract.sleutels.length !== 4 || contract.vragen.length < 12 || contract.vragen.length > 16 || contract.profielen.length !== 5) {
    throw new Error('Het scancontract heeft een onverwachte omvang.');
  }
  const sleutelIds = new Set(contract.sleutels.map((sleutel) => sleutel.id));
  if (sleutelIds.size !== contract.sleutels.length || contract.vragen.some((vraag) => !sleutelIds.has(vraag.sleutel))) {
    throw new Error('Een vraag verwijst naar een onbekende sleutel.');
  }
  return true;
}

export function berekenScan(contract, antwoorden) {
  valideerContract(contract);
  if (!antwoorden || typeof antwoorden !== 'object') throw new Error('Antwoorden ontbreken.');

  const scores = Object.fromEntries(contract.sleutels.map((sleutel) => [sleutel.id, 0]));
  const aantallen = Object.fromEntries(contract.sleutels.map((sleutel) => [sleutel.id, 0]));

  for (const vraag of contract.vragen) {
    const waarde = antwoorden[vraag.id];
    if (!geldigGetal(waarde)) throw new Error(`Vraag ${vraag.id} heeft geen geldig antwoord.`);
    scores[vraag.sleutel] += waarde;
    aantallen[vraag.sleutel] += 1;
  }

  const sleutels = contract.sleutels.map((sleutel, volgorde) => {
    const maximum = aantallen[sleutel.id] * 2;
    const score = scores[sleutel.id];
    return { ...sleutel, score, maximum, percentage: Math.round((score / maximum) * 100), volgorde };
  });
  const totaal = sleutels.reduce((som, sleutel) => som + sleutel.score, 0);
  const maximum = sleutels.reduce((som, sleutel) => som + sleutel.maximum, 0);
  const percentage = Math.round((totaal / maximum) * 100);
  const profiel = contract.profielen.find((item) => percentage >= item.vanaf && percentage <= item.tot);
  const zwaksteSleutel = [...sleutels].sort((a, b) => a.percentage - b.percentage || a.volgorde - b.volgorde)[0];

  if (!profiel) throw new Error('Voor deze score ontbreekt een uitkomstprofiel.');
  return { versie: contract.versie, totaal, maximum, percentage, profiel, sleutels, zwaksteSleutel };
}
