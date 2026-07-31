const $ = (selector) => document.querySelector(selector);
let lastResult = null;
let measured = false;

function addMeta(term, value) {
  if (!value) return;
  const row = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = term;
  dd.textContent = value;
  row.append(dt, dd);
  $('#page-meta').append(row);
}

function renderResult(result) {
  lastResult = result;
  measured = false;
  $('#uitkomst').hidden = false;
  $('#verdict-label').textContent = result.verdict.label;
  $('#verdict-summary').textContent = result.verdict.summary;
  const mark = $('#verdict-mark');
  mark.className = `verdict-mark ${result.verdict.id}`;
  mark.textContent = result.verdict.id;
  $('#page-title').textContent = result.title;
  $('#page-meta').replaceChildren();
  addMeta('Afzender', result.author || 'niet herkend');
  addMeta('Datum', result.date || 'niet herkend');
  addMeta('Omvang', `${result.wordCount} woorden`);
  $('#page-link').href = result.url;

  $('#findings').replaceChildren(...result.findings.map((finding) => {
    const article = document.createElement('article');
    article.className = 'finding';
    const head = document.createElement('div');
    head.className = 'finding-head';
    const label = document.createElement('span');
    label.textContent = finding.label;
    const status = document.createElement('span');
    status.className = `finding-status ${finding.status}`;
    status.textContent = finding.status;
    const explanation = document.createElement('p');
    explanation.textContent = finding.explanation;
    head.append(label, status);
    article.append(head, explanation);
    return article;
  }));

  const candidates = result.candidateClaims;
  $('#candidates').hidden = !candidates?.count;
  if (candidates?.count) {
    $('#candidate-summary').textContent = `${candidates.count} mogelijke bewering${candidates.count === 1 ? '' : 'en'} herkend. Hieronder staan maximaal twee korte herkenningsfragmenten.`;
    $('#candidate-list').replaceChildren(...candidates.samples.map((sample) => {
      const item = document.createElement('li');
      item.textContent = `“${sample}”`;
      return item;
    }));
  }
  $('#meet-toestemming').checked = false;
  $('#meet-status').textContent = '';
  $('#uitkomst').focus();
}

async function runTest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = $('#url');
  const button = form.querySelector('button[type="submit"]');
  const status = $('#form-status');
  if (!input.value.trim() || !input.validity.valid) {
    status.textContent = 'Vul een volledig webadres in, inclusief https://';
    input.focus();
    return;
  }
  button.disabled = true;
  button.textContent = 'Pagina wordt geïnspecteerd…';
  status.textContent = 'De pagina wordt tijdelijk en veilig opgehaald.';
  $('#uitkomst').hidden = true;
  try {
    const response = await fetch('/api/kennisproef', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: input.value.trim() }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'De kennisproef kon niet worden uitgevoerd.');
    status.textContent = '';
    renderResult(body);
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = 'Voer de proef uit';
  }
}

async function measureWithConsent() {
  if (!$('#meet-toestemming').checked || !lastResult || measured) return;
  const status = $('#meet-status');
  status.textContent = 'Anonieme status wordt gedeeld…';
  try {
    const response = await fetch('/api/meet-signaal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ consent: true, event: 'knowledge_test_completed', gereedheid: lastResult.verdict.id }),
    });
    if (!response.ok) throw new Error();
    measured = true;
    status.textContent = 'Dank. Alleen de gereedheidsstatus is gedeeld.';
  } catch {
    $('#meet-toestemming').checked = false;
    status.textContent = 'Delen lukte niet. De Kennisproef blijft gewoon bruikbaar.';
  }
}

$('#proef').addEventListener('submit', runTest);
$('#meet-toestemming').addEventListener('change', measureWithConsent);
$('#opnieuw').addEventListener('click', () => {
  lastResult = null;
  measured = false;
  $('#uitkomst').hidden = true;
  $('#form-status').textContent = '';
  $('#url').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
