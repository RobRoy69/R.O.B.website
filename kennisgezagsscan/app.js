import { berekenScan, valideerContract } from './scan-model.js';

const $ = (selector) => document.querySelector(selector);
const state = { contract: null, stap: 0, antwoorden: {}, resultaat: null, gemeten: false };

async function laadContract() {
  const response = await fetch('./vragen.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('De vragen konden niet worden geladen.');
  const contract = await response.json();
  valideerContract(contract);
  return contract;
}

function vragenVoorStap() {
  const sleutel = state.contract.sleutels[state.stap];
  return state.contract.vragen.filter((vraag) => vraag.sleutel === sleutel.id);
}

function aantalBeantwoord() {
  return Object.keys(state.antwoorden).length;
}

function updateVoortgang() {
  const aantal = aantalBeantwoord();
  $('#stap-label').textContent = `Sleutel ${state.stap + 1} van ${state.contract.sleutels.length}`;
  $('#voortgang-label').textContent = `${aantal} van ${state.contract.vragen.length} beantwoord`;
  $('.progress').setAttribute('aria-valuenow', String(aantal));
  $('#progress-bar').style.width = `${(aantal / state.contract.vragen.length) * 100}%`;
}

function renderStap() {
  const sleutel = state.contract.sleutels[state.stap];
  const vragen = vragenVoorStap();
  $('#sleutel-vraag').textContent = sleutel.vraag;
  $('#stap-titel').textContent = sleutel.label;
  $('#sleutel-uitleg').textContent = sleutel.uitleg;
  $('#vragen').replaceChildren(...vragen.map((vraag, index) => {
    const veld = document.createElement('fieldset');
    veld.className = 'question';
    const legend = document.createElement('legend');
    legend.textContent = `${state.stap * vragen.length + index + 1}. ${vraag.tekst}`;
    const opties = document.createElement('div');
    opties.className = 'options';
    opties.append(...state.contract.schaal.map((keuze) => {
      const label = document.createElement('label');
      label.className = 'option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = vraag.id;
      input.value = String(keuze.waarde);
      input.checked = state.antwoorden[vraag.id] === keuze.waarde;
      input.addEventListener('change', () => {
        state.antwoorden[vraag.id] = keuze.waarde;
        $('#form-error').hidden = true;
        updateVoortgang();
      });
      const tekst = document.createElement('span');
      tekst.innerHTML = `<strong>${keuze.label}</strong><small>${keuze.uitleg}</small>`;
      label.append(input, tekst);
      return label;
    }));
    veld.append(legend, opties);
    return veld;
  }));
  $('#vorige').disabled = state.stap === 0;
  $('#volgende').textContent = state.stap === state.contract.sleutels.length - 1 ? 'Toon mijn uitkomst' : 'Volgende sleutel';
  updateVoortgang();
  $('#stap-titel').focus?.();
}

function stapCompleet() {
  return vragenVoorStap().every((vraag) => Number.isInteger(state.antwoorden[vraag.id]));
}

function toonResultaat() {
  state.resultaat = berekenScan(state.contract, state.antwoorden);
  const resultaat = state.resultaat;
  $('#scan-shell').hidden = true;
  $('#resultaat').hidden = false;
  $('#profiel-label').textContent = `Profiel: ${resultaat.profiel.label}`;
  $('#profiel-uitleg').textContent = resultaat.profiel.uitleg;
  $('#totaalscore').textContent = `${resultaat.percentage}%`;
  $('#zwakste-label').textContent = `${resultaat.zwaksteSleutel.label}: ${resultaat.zwaksteSleutel.vraag}`;
  $('#hoofdadvies').textContent = resultaat.zwaksteSleutel.advies;
  $('#verdieping').href = resultaat.zwaksteSleutel.verdieping;
  $('#verdieping').textContent = `Verdiep je in ${resultaat.zwaksteSleutel.label}`;
  $('#sleutel-scores').replaceChildren(...resultaat.sleutels.map((sleutel) => {
    const kaart = document.createElement('article');
    kaart.className = 'key-score';
    kaart.innerHTML = `<header><span>${sleutel.label}</span><span>${sleutel.percentage}%</span></header><div class="bar" aria-label="${sleutel.label}: ${sleutel.percentage} procent"><span style="width:${sleutel.percentage}%"></span></div>`;
    return kaart;
  }));
  $('#resultaat').focus();
}

async function verstuurUitslag(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const knop = form.querySelector('button[type="submit"]');
  const status = $('#email-status');
  const data = new FormData(form);
  knop.disabled = true;
  status.textContent = 'Uitslag wordt verstuurd…';
  try {
    const response = await fetch('/api/scan-result', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: data.get('name'), email: data.get('email'), company: data.get('company'), antwoorden: state.antwoorden })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Versturen is tijdelijk niet beschikbaar.');
    status.textContent = 'Je uitslag is verstuurd. Er volgt geen nieuwsbrief.';
    form.reset();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    knop.disabled = false;
  }
}

async function meetVrijwillig() {
  if (!$('#meet-toestemming').checked || state.gemeten || !state.resultaat) return;
  const status = $('#meet-status');
  status.textContent = 'Anonieme uitkomst wordt gedeeld…';
  try {
    const response = await fetch('/api/meet-signaal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ consent: true, event: 'scan_completed', profiel: state.resultaat.profiel.id, zwaksteSleutel: state.resultaat.zwaksteSleutel.id })
    });
    if (!response.ok) throw new Error();
    state.gemeten = true;
    status.textContent = 'Dank. Alleen het profiel en de zwakste sleutel zijn gedeeld.';
  } catch {
    status.textContent = 'Delen lukte niet. Je scan blijft gewoon bruikbaar.';
    $('#meet-toestemming').checked = false;
  }
}

function opnieuw() {
  state.stap = 0; state.antwoorden = {}; state.resultaat = null; state.gemeten = false;
  $('#resultaat').hidden = true; $('#scan-shell').hidden = false; $('#meet-toestemming').checked = false;
  $('#meet-status').textContent = ''; $('#email-status').textContent = '';
  renderStap(); $('#scan-shell').scrollIntoView();
}

try {
  state.contract = await laadContract();
  $('#start').addEventListener('click', () => { $('#intro').hidden = true; $('#scan-shell').hidden = false; renderStap(); $('#scan-shell').scrollIntoView(); });
  $('#vorige').addEventListener('click', () => { if (state.stap > 0) { state.stap -= 1; renderStap(); } });
  $('#volgende').addEventListener('click', () => {
    if (!stapCompleet()) { $('#form-error').hidden = false; vragenVoorStap().map((vraag) => document.querySelector(`[name="${vraag.id}"]`)).find((input) => !Number.isInteger(state.antwoorden[input.name]))?.focus(); return; }
    if (state.stap < state.contract.sleutels.length - 1) { state.stap += 1; renderStap(); } else { toonResultaat(); }
  });
  $('#print').addEventListener('click', () => window.print());
  $('#email-form').addEventListener('submit', verstuurUitslag);
  $('#meet-toestemming').addEventListener('change', meetVrijwillig);
  $('#opnieuw').addEventListener('click', opnieuw);
} catch (error) {
  $('#start').disabled = true;
  $('#start').textContent = 'Scan tijdelijk niet beschikbaar';
  console.error(error);
}
