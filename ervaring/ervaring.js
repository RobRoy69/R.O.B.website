(() => {
  'use strict';

  const STORAGE_KEY = 'robMaxPoc.v2';
  const PACK_URL = '/ervaring/whoa-demo-pack.json';
  const API_URL = '/api/poc-intake';
  const ROUTE = [
    { id: 'chat', label: 'Neutrale chat', detail: 'herkennen' },
    { id: 'ondernemer', label: 'Ondernemer', detail: 'dossier vormen' },
    { id: 'toestemming', label: 'Toestemming', detail: 'gericht delen' },
    { id: 'accountant', label: 'Accountant', detail: 'onderbouwen' },
    { id: 'expert', label: 'Expertpoort', detail: 'menselijk besluit' },
    { id: 'whoa', label: 'Command Room', detail: 'WHOA voorbereiden' },
    { id: 'leiding', label: 'Regie', detail: 'bestuurbaar maken' },
    { id: 'bewijs', label: 'Agora', detail: 'herleiden' },
    { id: 'bouw', label: 'Bouw', detail: 'eigen maken' }
  ];

  const app = document.querySelector('#poc-app');
  const screen = document.querySelector('#poc-screen');
  const routeList = document.querySelector('#poc-route');
  const evidenceList = document.querySelector('#evidence-list');
  const evidenceCount = document.querySelector('#evidence-count');
  const modeLabel = document.querySelector('#poc-mode');
  const caseLabel = document.querySelector('#poc-case');
  const commandForm = document.querySelector('#command-form');
  const commandInput = document.querySelector('#command-input');
  const commandHelp = document.querySelector('#command-help');
  const resetButton = document.querySelector('#poc-reset');

  let pack;
  let state;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const statusLabel = (status = '') => ({
    'aangeleverd': 'Aangeleverd',
    'bron-bevestigd': 'Bron bevestigd',
    'expert-bevestigd': 'Expert bevestigd',
    'onzeker': 'Onzeker',
    'ontbreekt': 'Ontbreekt',
    'niet-vrijgegeven': 'Niet vrijgegeven'
  })[status] || status;

  const statusClass = (status = '') => {
    if (status === 'bron-bevestigd' || status === 'expert-bevestigd') return 'confirmed';
    if (status === 'onzeker') return 'uncertain';
    if (status === 'ontbreekt') return 'missing';
    return '';
  };

  const newSession = () => ({
    version: 2,
    active: true,
    sessionId: crypto.randomUUID ? crypto.randomUUID() : `poc-${Date.now()}`,
    startedAt: new Date().toISOString(),
    current: 'chat',
    unlocked: ['chat'],
    role: 'bezoeker',
    caseStarted: false,
    openingSent: false,
    intakeReady: false,
    aiMode: null,
    messages: [
      { role: 'assistant', content: 'Dit is een neutrale ingang. Er is nog geen dossier en er is nog geen route gekozen.' }
    ],
    revealCount: 0,
    consent: false,
    accountantReviewed: false,
    correctionConfirmed: false,
    routeDecision: null,
    whoaPhase: 'voorbereiding-akkoord',
    events: []
  });

  const loadSession = () => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (parsed?.active && parsed.version === 2) return parsed;
    } catch {}
    return null;
  };

  const saveSession = () => {
    state.events = state.events.slice(-80);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const record = (action, detail = '') => {
    state.events.push({
      at: new Date().toISOString(),
      perspective: state.current,
      action,
      detail,
      caseVersion: pack.meta.version,
      demo: true
    });
  };

  const currentPathScreen = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    return parts[0] === 'ervaring' && parts[1] ? parts[1].toLowerCase() : 'chat';
  };

  const setPath = (id, replace = false) => {
    const url = `/ervaring/${id}/`;
    if (location.pathname === url) return;
    history[replace ? 'replaceState' : 'pushState']({ poc: true, screen: id }, '', url);
  };

  const unlock = (id) => {
    if (!state.unlocked.includes(id)) state.unlocked.push(id);
  };

  const routeIndex = (id) => ROUTE.findIndex((item) => item.id === id);

  const go = (id, { replace = false } = {}) => {
    if (!ROUTE.some((item) => item.id === id) || !state.unlocked.includes(id)) return false;
    state.current = id;
    state.role = ({
      chat: 'bezoeker', ondernemer: 'ondernemer', toestemming: 'ondernemer',
      accountant: 'accountant', expert: 'expert', whoa: 'trajectteam',
      leiding: 'leiding', bewijs: 'governance', bouw: 'opdrachtgever'
    })[id];
    record('projection_opened', id);
    saveSession();
    setPath(id, replace);
    render();
    document.querySelector('#poc-main')?.focus({ preventScroll: true });
    return true;
  };

  const unlockAndGo = (id) => {
    unlock(id);
    return go(id);
  };

  const fieldIdsVisible = () => {
    const ids = [];
    for (let i = 0; i < state.revealCount; i += 1) {
      ids.push(...(pack.case.revealLayers[i]?.fields || []));
    }
    if (state.accountantReviewed) ids.push('vrijwillig_voorstel', 'blokkade', 'ontbrekend');
    if (state.correctionConfirmed) ids.push('financiering');
    if (state.routeDecision) ids.push('route');
    return [...new Set(ids)];
  };

  const renderRoute = () => {
    const current = routeIndex(state.current);
    routeList.innerHTML = ROUTE.map((item, index) => {
      const unlocked = state.unlocked.includes(item.id);
      const className = index === current ? 'active' : index < current && unlocked ? 'done' : '';
      return `<li class="${className}" aria-current="${index === current ? 'step' : 'false'}">
        <strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(unlocked ? item.detail : 'gesloten')}</span>
      </li>`;
    }).join('');
  };

  const renderEvidence = () => {
    const fields = fieldIdsVisible().map((id) => pack.case.fields[id]).filter(Boolean);
    evidenceCount.textContent = `${fields.length} ${fields.length === 1 ? 'veld' : 'velden'}`;
    evidenceList.innerHTML = fields.length ? fields.map((field) => `
      <article class="evidence-item">
        <strong>${escapeHtml(field.label)}</strong>
        <span>${escapeHtml(statusLabel(field.status))} · ${escapeHtml(field.source)} · v${escapeHtml(field.version)}</span>
      </article>`).join('') : '<p class="inline-status">Nog geen dossiergegevens vrijgegeven.</p>';
  };

  const setChrome = () => {
    const item = ROUTE.find((entry) => entry.id === state.current);
    modeLabel.textContent = item ? `${item.label} · ${state.role}` : 'Verborgen route';
    caseLabel.textContent = state.caseStarted ? pack.meta.id : 'Nog geen dossier';
  };

  const pageHead = (eyebrow, title, lede, boundary = '') => `
    <header class="screen-head">
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">${escapeHtml(lede)}</p>
      ${boundary ? `<p class="boundary-note">${escapeHtml(boundary)}</p>` : ''}
    </header>`;

  const renderChatMessages = () => state.messages.map((message) => `
    <div class="chat-line ${message.role === 'user' ? 'user' : ''}">
      <span class="chat-who">${message.role === 'user' ? 'Ondernemer' : 'AI-ingang'}</span>
      <div class="chat-text">${escapeHtml(message.content)}</div>
    </div>`).join('');

  const renderChat = () => {
    const started = state.caseStarted;
    const ready = state.intakeReady;
    commandInput.placeholder = started ? (ready ? 'Typ /intake' : 'Beschrijf wat er speelt') : 'Typ /zwaarweer';
    commandHelp.textContent = started
      ? ready ? 'De eerste ordening is klaar. Open nu met /intake het dossier.' : 'Typ de openingszin in het gesprek; de eerste reactie wordt begrensd gegenereerd.'
      : 'Alleen /zwaarweer opent binnen deze sessie de fictieve continuïteitsroute.';

    if (!started) {
      return `<section class="ai-chat-home" aria-labelledby="ai-start-title">
        <div class="ai-chat-center">
          <div class="ai-chat-greeting">
            <span class="ai-home-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" role="img"><path d="M16 3v7M16 22v7M3 16h7M22 16h7M6.8 6.8l5 5M20.2 20.2l5 5M25.2 6.8l-5 5M11.8 20.2l-5 5"/></svg>
            </span>
            <h1 id="ai-start-title">Wat kan ik voor je doen Danny?</h1>
          </div>
          <form class="ai-composer" id="ai-start-form" autocomplete="off">
            <label class="sr-only" for="ai-start-input">Bericht aan AI</label>
            <textarea id="ai-start-input" rows="3" maxlength="700" placeholder="Waar wil je mee beginnen?"></textarea>
            <div class="ai-composer-tools">
              <div class="ai-composer-left">
                <button class="ai-tool-button" type="button" aria-label="Bijlage toevoegen" disabled>+</button>
                <span class="ai-mode">Chat</span>
              </div>
              <button class="ai-send-button" type="submit" aria-label="Verstuur bericht">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/></svg>
              </button>
            </div>
          </form>
          <p class="ai-chat-note">AI kan fouten maken. Controleer belangrijke informatie.</p>
        </div>
      </section>`;
    }

    return `<section class="screen neutral-shell">
      ${pageHead(
        started ? 'Er wordt geluisterd' : 'Nog geen route gekozen',
        started ? 'Eerst begrijpen wat er werkelijk speelt.' : 'Een gesprek vóór een systeem.',
        started ? 'Max-OS verzamelt alleen wat nodig is om de situatie veilig te ordenen.' : 'De omgeving kent nog geen bedrijf, probleem of oplossing.',
        'De AI mag signalen herkennen en vragen stellen. Zij stelt geen diagnose en kiest geen juridische route.'
      )}
      <div class="chat-window">
        <div class="chat-log" id="neutral-chat-log" role="log" aria-live="polite">${renderChatMessages()}</div>
        ${started && !ready ? `<form class="chat-entry" id="neutral-chat-form">
          <input id="neutral-chat-input" maxlength="700" aria-label="Vertel wat er speelt" placeholder="${escapeHtml(pack.case.opening)}">
          <button type="submit">Orden</button>
        </form>` : ''}
      </div>
      ${ready ? `<div class="action-row"><button class="primary-button" type="button" data-command="/intake">Open het gevormde dossier</button></div>
        <p class="inline-status">Reactiemodus: ${escapeHtml(state.aiMode === 'live' ? 'gecontroleerd AI-antwoord' : 'vaste veilige terugval')}</p>` : ''}
    </section>`;
  };

  const renderFieldRows = (ids) => ids.map((id) => {
    const field = pack.case.fields[id];
    return `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(field.value)}</td><td><span class="status-pill ${statusClass(field.status)}">${escapeHtml(statusLabel(field.status))}</span></td></tr>`;
  }).join('');

  const renderEntrepreneur = () => {
    const visibleLayers = pack.case.revealLayers.slice(0, state.revealCount);
    const ids = visibleLayers.flatMap((layer) => layer.fields);
    const nextLayer = pack.case.revealLayers[state.revealCount];
    commandInput.placeholder = nextLayer ? 'Open de volgende informatielaag' : 'Typ /delen';
    commandHelp.textContent = nextLayer ? 'De fictieve casus wordt bewust laag voor laag zichtbaar.' : 'Het dossier is nog van de ondernemer. /delen opent eerst de toestemmingspoort.';
    return `<section class="screen">
      ${pageHead('Ondernemersingang · signalering', 'Van noodkreet naar een controleerbaar eerste dossier.', pack.case.situation, 'Aannemelijk is nog niet vastgesteld. Iedere afleiding houdt haar eigen status en herkomst.')}
      ${visibleLayers.length ? `<div class="panel-grid">${visibleLayers.map((layer) => `<article class="panel reveal-card"><div class="section-label">Laag ${pack.case.revealLayers.indexOf(layer) + 1}</div><h2>${escapeHtml(layer.title)}</h2><p>${escapeHtml(layer.summary)}</p></article>`).join('')}</div>
        <table class="field-table" aria-label="Gevormd dossier"><tbody>${renderFieldRows(ids)}</tbody></table>` : '<p class="inline-status">Nog geen casuslaag geopend.</p>'}
      <div class="action-row">
        ${nextLayer ? `<button class="primary-button" type="button" id="reveal-next">Open volgende laag</button>` : `<button class="primary-button" type="button" data-command="/delen">Bepaal wat wordt gedeeld</button>`}
      </div>
    </section>`;
  };

  const renderConsent = () => {
    commandInput.placeholder = state.consent ? 'Toestemming vastgelegd' : 'Rond eerst de zichtbare toestemming af';
    commandHelp.textContent = state.consent ? 'De accountantprojectie is beschikbaar.' : 'Zonder alle drie de keuzes wordt geen ander perspectief geopend.';
    return `<section class="screen">
      ${pageHead('Toestemmingspoort', 'Niet alles wat bekend is, hoeft gedeeld te worden.', 'De ondernemer ziet de inhoud en het doel van de overdracht voordat een andere rol toegang krijgt.', 'Dit legt alleen toestemming binnen de fictieve demonstratie vast. Er wordt niets verzonden of extern opgeslagen.')}
      <form id="consent-form" class="consent-list">
        <label><input type="checkbox" name="facts" ${state.consent ? 'checked disabled' : ''}><span>De zichtbare feiten, documenten en ontbrekende informatie mogen met de accountant worden gedeeld.</span></label>
        <label><input type="checkbox" name="purpose" ${state.consent ? 'checked disabled' : ''}><span>De accountant mag uitsluitend continuïteit, volledigheid en overdraagbaarheid beoordelen.</span></label>
        <label><input type="checkbox" name="understood" ${state.consent ? 'checked disabled' : ''}><span>Ik begrijp dat dit geen werkelijk bericht of juridisch advies is.</span></label>
        ${state.consent ? '' : '<div class="action-row"><button class="primary-button" type="submit">Toestemming vastleggen</button></div>'}
      </form>
      ${state.consent ? '<div class="action-row"><button class="primary-button" type="button" id="open-accountant">Open het accountantperspectief</button><button class="secondary-button" type="button" id="revoke-consent">Trek toestemming in</button></div>' : ''}
    </section>`;
  };

  const renderAccountant = () => {
    commandInput.placeholder = state.accountantReviewed ? 'Typ /expert' : 'Beoordeel de overdracht';
    commandHelp.textContent = state.accountantReviewed ? 'De accountant heeft aangevuld; de expertpoort kan open.' : 'De accountant voegt context toe maar herschrijft de ondernemer niet.';
    const docs = pack.case.accountant.documents.map((doc) => `<tr><th>${escapeHtml(doc.name)}</th><td>Accountantdossier</td><td><span class="status-pill ${statusClass(doc.status)}">${escapeHtml(statusLabel(doc.status))}</span></td></tr>`).join('');
    return `<section class="screen">
      ${pageHead('Accountantperspectief · vooronderzoek', 'Hetzelfde dossier, een andere verantwoordelijkheid.', pack.case.accountant.observation, 'De oorspronkelijke ondernemersverklaringen blijven ongewijzigd. De accountant voegt een afzonderlijke professionele laag toe.')}
      <table class="field-table" aria-label="Accountantdossier"><tbody>${docs}</tbody></table>
      <div class="panel-grid" style="margin-top:14px">
        <article class="panel"><div class="section-label">Professionele observatie</div><h2>Continuïteit vraagt onderbouwing</h2><p>${escapeHtml(pack.case.accountant.observation)}</p></article>
        <article class="panel"><div class="section-label">Nog geen routebesluit</div><h2>Vier alternatieven blijven open</h2><p>Vrijwillig akkoord, een gerechtelijke herstructureringsroute, ordelijke afbouw of faillissement worden pas bij de expertpoort tegen elkaar gelegd.</p></article>
      </div>
      <div class="action-row">
        ${state.accountantReviewed ? '<button class="primary-button" type="button" data-command="/expert">Leg voor aan de expert</button>' : '<button class="primary-button" type="button" id="accountant-review">Bevestig continuïteitszorg en open punten</button>'}
      </div>
    </section>`;
  };

  const expertQuestions = [
    ['viable', 'Is er voldoende aanwijzing voor een levensvatbare kern?', ['Ja, onder voorbehoud', 'Nee', 'Onvoldoende informatie']],
    ['finance', 'Is nieuwe financiering noodzakelijk én aannemelijk beschikbaar?', ['Niet als voorwaarde vastgesteld', 'Ja', 'Onvoldoende informatie']],
    ['voluntary', 'Is volledige vrijwillige overeenstemming nog reëel?', ['Nee, niet op de huidige basis', 'Ja', 'Onvoldoende informatie']],
    ['blockade', 'Is de blokkade voldoende onderzocht?', ['Ja, als werkhypothese', 'Nee', 'Onvoldoende informatie']],
    ['route', 'Welke voorbereidingsroute is passend genoeg om te openen?', ['WHOA-kandidaat', 'Regulier akkoord', 'Afbouw of faillissement']]
  ];

  const renderExpert = () => {
    commandInput.placeholder = state.routeDecision ? 'Typ /whoa' : 'Rond het expertbesluit af';
    commandHelp.textContent = state.routeDecision ? 'De WHOA-werkruimte is nu beschikbaar.' : 'De route blijft gesloten totdat de correctie en vijf afwegingen zijn vastgelegd.';
    return `<section class="screen">
      ${pageHead('Expertpoort · routebesluit', 'Hier eindigt de afleiding en begint het professionele oordeel.', 'De expert toetst levensvatbaarheid, financiering, vrijwillige medewerking, blokkade en alternatieve routes.', 'Max-OS bereidt voor. De expert corrigeert, bekrachtigt of wijst af.')}
      <form id="expert-form" class="decision-list">
        <article class="decision-card correction">
          <div><div class="section-label">AI-afleiding · corrigeren</div><h2>${escapeHtml(pack.case.expert.aiInference)}</h2><p>${escapeHtml(pack.case.expert.correction)}</p></div>
          <label><input type="checkbox" name="correction" ${state.correctionConfirmed ? 'checked disabled' : ''}> Expertcorrectie vastleggen</label>
        </article>
        ${expertQuestions.map(([name, question, options]) => `<article class="decision-card">
          <div><div class="section-label">Beslismoment</div><h2>${escapeHtml(question)}</h2></div>
          <div class="decision-options">${options.map((option, index) => `<label><input type="radio" name="${name}" value="${escapeHtml(option)}" ${state.routeDecision && index === 0 ? 'checked disabled' : ''}> ${escapeHtml(option)}</label>`).join('')}</div>
        </article>`).join('')}
        ${state.routeDecision ? '' : '<div class="action-row"><button class="primary-button" type="submit">Leg het expertbesluit vast</button></div>'}
      </form>
      ${state.routeDecision ? `<aside class="route-verdict"><div class="section-label">Menselijk vastgesteld</div><h2>Voorbereidingsroute: WHOA-kandidaat</h2><p>${escapeHtml(pack.case.expert.decision)} Dit is geen garantie op akkoord of homologatie.</p></aside>
        <div class="action-row"><button class="primary-button" type="button" data-command="/whoa">Open WHOA Command Room</button></div>` : ''}
    </section>`;
  };

  const renderWhoA = () => {
    const phases = pack.case.whoa.phases;
    const phase = phases.find((item) => item.id === state.whoaPhase) || phases[0];
    const activeIndex = phases.indexOf(phase);
    commandInput.placeholder = 'Typ /leiding voor het bestuurlijke perspectief';
    commandHelp.textContent = 'De faseknoppen tonen dezelfde casus door de tijd; ze voorspellen geen uitkomst.';
    return `<section class="screen">
      ${pageHead('WHOA Command Room · voorbereiding', 'Eén dossier. Eén volgende beslissing.', pack.case.whoa.procedure, 'De werkruimte ondersteunt het traject. Advocaat, eventuele herstructureringsdeskundige of observator en rechtbank behouden hun wettelijke rol.')}
      <div class="phase-track" role="tablist" aria-label="WHOA-fasen">${phases.map((item, index) => `<button class="phase-button ${item.id === phase.id ? 'active' : index < activeIndex ? 'done' : ''}" type="button" data-phase="${escapeHtml(item.id)}"><span>Fase ${index + 1}</span>${escapeHtml(item.label)}</button>`).join('')}</div>
      <div class="command-room">
        <article class="phase-card"><div class="section-label">Huidige fase · ${escapeHtml(phase.owner)}</div><h2>${escapeHtml(phase.label)}</h2><ul>${phase.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>
        <article class="phase-card"><div class="section-label">Waarde · synthetische werkhypothese</div><h2>Reorganisatie versus liquidatie</h2><p>${escapeHtml(pack.case.whoa.values.reorganization)}</p><p>${escapeHtml(pack.case.whoa.values.liquidation)}</p><p class="boundary-note">Deze waarden zijn demonstratiedata en nog geen deskundigenwaardering.</p></article>
        <article class="phase-card"><div class="section-label">Voorlopige klassen</div><h2>Rechten eerst, stemming daarna</h2><div class="classes">${pack.case.whoa.classes.map((item) => `<div class="class-row"><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item.amount)}</strong><span>${escapeHtml(item.status)}</span></div>`).join('')}</div></article>
        <article class="phase-card"><div class="section-label">Procedurele regel</div><h2>Twee derde gaat over waarde</h2><p>De instemming wordt per klasse beoordeeld op vertegenwoordigde schuldenwaarde, niet op het aantal schuldeisers. De uitkomst in deze fictieve casus staat niet vooraf vast.</p></article>
      </div>
      <div class="action-row"><button class="primary-button" type="button" data-command="/leiding">Bekijk bestuurlijke regie</button></div>
    </section>`;
  };

  const renderLeadership = () => {
    commandInput.placeholder = 'Typ /bewijs';
    commandHelp.textContent = 'Open de gezagslaag om te zien waarop conclusies en correcties rusten.';
    const phaseIndex = Math.max(0, pack.case.whoa.phases.findIndex((p) => p.id === state.whoaPhase));
    const phase = pack.case.whoa.phases[phaseIndex];
    const nextPhase = pack.case.whoa.phases[phaseIndex + 1];
    const nextDecision = nextPhase
      ? `${nextPhase.label} professioneel voorbereiden en vrijgeven`
      : 'Uitvoering bewaken en het traject gecontroleerd afsluiten';
    const cards = [
      ['Huidige fase', phase?.label || 'Voorbereiding'],
      ['Volgende beslissing', nextDecision],
      ['Verantwoordelijke', phase?.owner || 'Behandelend expert samen met advocaat'],
      ['Kritiek ontbrekend', nextPhase ? nextPhase.items[0] : 'Afsluitbesluit en uitvoeringsbewijs'],
      ['AI bereidde voor', 'Signalen, open punten en voorlopige structuur'],
      ['Mens stelde vast', 'WHOA-kandidaat als voorbereidingsroute']
    ];
    return `<section class="screen">
      ${pageHead('Bestuurs- en regieperspectief', 'Geen dashboard vol activiteit. Alleen wat nu bestuurbaar moet zijn.', 'Dezelfde casus wordt teruggebracht tot fase, beslissing, eigenaar, onzekerheid en eerstvolgende poort.', 'Het betaalde experttraject begint na toestemming en routebesluit, vóór de inhoudelijke WHOA-uitvoering.')}
      <div class="panel-grid">${cards.map(([label, value]) => `<article class="panel"><div class="section-label">${escapeHtml(label)}</div><h2>${escapeHtml(value)}</h2></article>`).join('')}</div>
      <div class="action-row"><button class="primary-button" type="button" data-command="/bewijs">Toon waarop dit rust</button></div>
    </section>`;
  };

  const renderProof = () => {
    commandInput.placeholder = 'Typ /bouw';
    commandHelp.textContent = 'De laatste projectie maakt zichtbaar wat al werkt en wat nog gebouwd moet worden.';
    const visible = fieldIdsVisible().map((id) => pack.case.fields[id]).filter(Boolean);
    return `<section class="screen">
      ${pageHead('Agora · gezagslaag', 'Een antwoord mag ook wachten.', 'Iedere uitspraak behoudt bron, actor, versie, status en de beslissing die ervan afhankelijk is.', 'Bron bevestigd betekent dat de bron de uitspraak draagt. Het is geen algemeen waarheidsoordeel.')}
      <div class="flow">${['Input', 'Structureren', 'Toetsen', 'Begrenzen', 'Vrijgeven', 'Gebruiken', 'Leren'].map((item, index) => `<div class="flow-step"><span>0${index + 1}</span><strong>${item}</strong></div>`).join('')}</div>
      <div class="proof-grid" style="margin-top:20px">${visible.map((field) => `<article class="proof-card"><span class="status-pill ${statusClass(field.status)}">${escapeHtml(statusLabel(field.status))}</span><h2>${escapeHtml(field.label)}</h2><p>${escapeHtml(field.value)}</p><ul><li>Herkomst: ${escapeHtml(field.source)}</li><li>Versie: ${escapeHtml(field.version)}</li></ul></article>`).join('')}</div>
      <div class="proof-grid" style="margin-top:14px">${pack.rules.map((rule) => `<article class="proof-card"><span class="status-pill confirmed">Bron bevestigd</span><h2>${escapeHtml(rule.statement)}</h2><p>${escapeHtml(rule.allowedWording)}</p><ul><li>${escapeHtml(rule.source)}</li><li>Gecontroleerd ${escapeHtml(rule.checkedAt)}</li></ul></article>`).join('')}</div>
      <div class="action-row"><button class="primary-button" type="button" data-command="/bouw">Maak de productgrens zichtbaar</button></div>
    </section>`;
  };

  const renderBuild = () => {
    commandInput.placeholder = 'Einde van de hoofdroute';
    commandHelp.textContent = 'Stop en wis verwijdert alleen deze browsersessie.';
    const existing = ['Intake- en accountantschatpatronen', 'Professionele signalering', 'Dossierlagen met bron en zekerheid', 'Append-only expert-governancelog'];
    const poc = ['Verborgen commandoroute', 'Fictieve WHOA-casus', 'Rolprojecties en toestemming', 'Deterministisch traject met één AI-moment'];
    return `<section class="screen">
      ${pageHead('Bouw- en investeringsperspectief', 'De samenhang is zichtbaar. Nu moet zij eigen worden.', 'De POC bewijst de vorm en de grenzen; de implementatie maakt de route veilig bruikbaar met echte rollen, bronnen en dossiers.', 'De publieke demonstratie schrijft niets naar 20voor12 Supabase en doet geen toezegging over een juridisch resultaat.')}
      <div class="build-grid">
        <article class="proof-card"><div class="section-label">Reeds werkend fundament</div><h2>20voor12 en Agora</h2><ul>${existing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>
        <article class="proof-card"><div class="section-label">Representatieve POC</div><h2>Vandaag zichtbaar</h2><ul>${poc.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>
        <article class="proof-card" style="grid-column:1/-1"><div class="section-label">Zes leverblokken</div><h2>Iedere maand een bruikbaar deel</h2><ul>${pack.implementation.deliveries.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>
      </div>
      <div class="price-panel"><div><div class="section-label">Eerste gecontroleerde werkfase</div><div class="price">€${new Intl.NumberFormat('nl-NL').format(pack.implementation.monthlyInvestment)} per maand</div></div><p>${escapeHtml(pack.implementation.months)} maanden<br>Iedere maand een bruikbaar deel.</p></div>
    </section>`;
  };

  const renderers = {
    chat: renderChat,
    ondernemer: renderEntrepreneur,
    toestemming: renderConsent,
    accountant: renderAccountant,
    expert: renderExpert,
    whoa: renderWhoA,
    leiding: renderLeadership,
    bewijs: renderProof,
    bouw: renderBuild
  };

  const render = () => {
    document.querySelector('#poc-shell-title')?.remove();
    const isAiStart = state.current === 'chat' && !state.caseStarted;
    app.classList.toggle('ai-chat-start', isAiStart);
    document.title = isAiStart ? 'AI Chat' : 'R.O.B. → Max-OS — gecontroleerde demonstratie';
    renderRoute();
    renderEvidence();
    setChrome();
    screen.innerHTML = (renderers[state.current] || renderChat)();
    bindScreenActions();
  };

  const safeFallback = () => ({
    reflection: 'Je bedrijf lijkt operationeel nog te draaien, terwijl oudere verplichtingen de betaalruimte steeds verder beperken.',
    questions: ['Welke betaling of termijn maakt de komende weken het meest kritiek?', 'Welke actuele stukken laten zien wat de onderneming vóór historische schulden verdient?'],
    signals: ['beperkte betaalruimte', 'historische schuldenlast', 'operationele kern nog te onderzoeken'],
    mode: 'fallback'
  });

  const requestFirstReflection = async (message, button) => {
    button.disabled = true;
    button.textContent = 'Ordenen…';
    state.messages.push({ role: 'user', content: message });
    state.openingSent = true;
    render();
    let result = safeFallback();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          message,
          caseContext: { fictional: true, sector: pack.case.sector, stage: 'signalering' }
        })
      });
      if (response.ok) {
        const candidate = await response.json();
        if (candidate && typeof candidate.reflection === 'string' && Array.isArray(candidate.questions)) result = candidate;
      }
    } catch {}
    const questions = result.questions.slice(0, 2).join(' ');
    state.messages.push({ role: 'assistant', content: `${result.reflection} ${questions}`.trim() });
    state.intakeReady = true;
    state.aiMode = result.mode === 'live' ? 'live' : 'fallback';
    record('first_reflection_completed', state.aiMode);
    saveSession();
    render();
  };

  const handleCommand = (raw) => {
    const command = raw.trim().toLowerCase();
    if (!command) return;
    const fail = (message) => {
      commandHelp.textContent = message;
      commandInput.setAttribute('aria-invalid', 'true');
      setTimeout(() => commandInput.removeAttribute('aria-invalid'), 1200);
    };

    if (command === '/zwaarweer') {
      if (state.current !== 'chat' || state.caseStarted) return fail('Deze route is al gestart of hier niet beschikbaar.');
      state.caseStarted = true;
      state.messages.push({ role: 'assistant', content: 'Wat maakt dat het nu niet meer gaat? Vertel het zoals je het zelf zou zeggen.' });
      record('case_route_started', 'continuiteit-zonder-routebesluit');
      saveSession();
      render();
      return;
    }
    if (command === '/intake') {
      if (!state.intakeReady) return fail('De eerste ordening moet eerst worden afgerond.');
      unlockAndGo('ondernemer');
      return;
    }
    if (command === '/delen') {
      if (state.current !== 'ondernemer' || state.revealCount < pack.case.revealLayers.length) return fail('Open eerst alle casuslagen.');
      unlockAndGo('toestemming');
      return;
    }
    if (command === '/expert') {
      if (!state.consent || !state.accountantReviewed) return fail('Toestemming en accountantbeoordeling ontbreken.');
      unlockAndGo('expert');
      return;
    }
    if (command === '/whoa') {
      if (!state.routeDecision) return fail('Alleen een vastgelegd expertbesluit opent deze werkruimte.');
      unlockAndGo('whoa');
      return;
    }
    if (command === '/leiding') {
      if (!state.routeDecision || !state.unlocked.includes('whoa')) return fail('Open eerst de WHOA-werkruimte.');
      unlockAndGo('leiding');
      return;
    }
    if (command === '/bewijs') {
      if (!state.unlocked.includes('leiding')) return fail('Open eerst het regieperspectief.');
      unlockAndGo('bewijs');
      return;
    }
    if (command === '/bouw') {
      if (!state.unlocked.includes('bewijs')) return fail('Open eerst de gezagslaag.');
      unlockAndGo('bouw');
      return;
    }
    fail('Dit commando is in deze projectie niet beschikbaar.');
  };

  function bindScreenActions() {
    document.querySelectorAll('[data-command]').forEach((button) => button.addEventListener('click', () => handleCommand(button.dataset.command)));

    const aiStartForm = document.querySelector('#ai-start-form');
    const aiStartInput = document.querySelector('#ai-start-input');
    aiStartInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        aiStartForm?.requestSubmit();
      }
    });
    aiStartForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const message = aiStartInput.value.trim().slice(0, 700);
      if (!message) return;
      if (message.toLowerCase() === '/zwaarweer') {
        handleCommand(message);
        return;
      }
      state.caseStarted = true;
      state.messages = [];
      record('case_route_started', 'natuurlijke-ai-ingang');
      saveSession();
      requestFirstReflection(message, event.submitter);
    });

    document.querySelector('#neutral-chat-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.querySelector('#neutral-chat-input');
      const message = input.value.trim().slice(0, 700);
      if (!message || state.intakeReady || state.openingSent) return;
      requestFirstReflection(message, event.submitter);
    });

    document.querySelector('#reveal-next')?.addEventListener('click', () => {
      if (state.revealCount >= pack.case.revealLayers.length) return;
      const layer = pack.case.revealLayers[state.revealCount];
      state.revealCount += 1;
      record('case_layer_revealed', layer.id);
      saveSession();
      render();
    });

    document.querySelector('#consent-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      if (!form.get('facts') || !form.get('purpose') || !form.get('understood')) {
        commandHelp.textContent = 'Alle drie de toestemmingskeuzes moeten zichtbaar zijn vastgelegd.';
        return;
      }
      state.consent = true;
      record('consent_granted', 'accountant-scope');
      saveSession();
      render();
    });

    document.querySelector('#open-accountant')?.addEventListener('click', () => unlockAndGo('accountant'));
    document.querySelector('#revoke-consent')?.addEventListener('click', () => {
      state.consent = false;
      state.accountantReviewed = false;
      state.unlocked = state.unlocked.filter((id) => routeIndex(id) <= routeIndex('toestemming'));
      record('consent_revoked', 'accountant-scope');
      saveSession();
      render();
    });

    document.querySelector('#accountant-review')?.addEventListener('click', () => {
      state.accountantReviewed = true;
      record('accountant_observation_added', 'continuiteit-en-open-punten');
      saveSession();
      render();
    });

    document.querySelector('#expert-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const complete = expertQuestions.every(([name]) => form.get(name));
      if (!form.get('correction') || !complete) {
        commandHelp.textContent = 'Leg de expertcorrectie en alle vijf afwegingen vast.';
        return;
      }
      state.correctionConfirmed = true;
      state.routeDecision = 'whoa-candidate';
      record('expert_correction', pack.case.expert.correction);
      record('route_decision', 'whoa-candidate');
      saveSession();
      render();
    });

    document.querySelectorAll('[data-phase]').forEach((button) => button.addEventListener('click', () => {
      state.whoaPhase = button.dataset.phase;
      record('whoa_phase_viewed', state.whoaPhase);
      saveSession();
      render();
    }));
  }

  commandForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = commandInput.value;
    commandInput.value = '';
    handleCommand(value);
  });

  resetButton.addEventListener('click', () => {
    if (!window.confirm('Deze fictieve demonstratiesessie stoppen en lokaal wissen?')) return;
    sessionStorage.removeItem(STORAGE_KEY);
    location.replace('/#rob');
  });

  window.addEventListener('popstate', () => {
    const requested = currentPathScreen();
    if (state.unlocked.includes(requested)) {
      state.current = requested;
      saveSession();
      render();
    } else {
      setPath(state.current, true);
    }
  });

  const initialize = async () => {
    try {
      const response = await fetch(PACK_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('Demonstratiepakket niet beschikbaar');
      pack = await response.json();
      if (pack.meta?.fictional !== true || pack.meta?.publicSafe !== true) throw new Error('Demonstratiepakket is niet publiek vrijgegeven');
    } catch (error) {
      app.innerHTML = `<main class="error-screen"><h1>Deze demonstratie kan niet veilig worden geopend.</h1><p>${escapeHtml(error.message)}</p><p><a href="/">Terug naar R.O.B. Concepting</a></p></main>`;
      return;
    }

    state = loadSession();
    if (!state) {
      location.replace('/#rob');
      return;
    }

    const requested = currentPathScreen();
    if (!ROUTE.some((item) => item.id === requested) || !state.unlocked.includes(requested)) {
      setPath(state.current || 'chat', true);
    } else {
      state.current = requested;
    }
    record('experience_loaded', state.current);
    saveSession();
    render();
  };

  initialize();
})();
