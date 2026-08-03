(() => {
  'use strict';

  const STORAGE_KEY = 'robMaxPoc.v2';
  const PACK_URL = '/ervaring/whoa-demo-pack.json';
  const API_URL = '/api/poc-intake';
  const ROUTE = [
    { id: 'chat', label: 'Neutrale chat', detail: 'herkennen' },
    { id: 'max', label: 'Max', detail: 'veilig landen' },
    { id: 'max-intake', label: 'Eerste intake', detail: 'rust en houvast' },
    { id: 'max-management', label: 'Management', detail: 'signaleren en toewijzen' },
    { id: 'frank-signal', label: 'Frank', detail: 'veilig ontvangen' },
    { id: 'frank-review', label: 'Expertbeoordeling', detail: 'menselijk toetsen' },
    { id: 'danny-uitnodiging', label: 'Uitnodiging', detail: 'beveiligd openen' },
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
  let chatDemoRunning = false;
  let managementTransitionTimer = null;

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
    chatDemoComplete: false,
    chatDemoStep: 0,
    maxIntakeStep: 0,
    maxIntakeAnswers: {},
    maxIntakeSubmitted: false,
    contactPhone: '',
    contactEmail: '',
    contactConsent: false,
    contactError: '',
    managementSignalCreatedAt: null,
    managementSignalOpened: false,
    managementSignalExpanded: false,
    managementSignalAssigned: false,
    managementTransferOpen: false,
    managementAiOpen: false,
    managementAiMessages: [],
    frankNotificationOpened: false,
    frankReviewAccepted: false,
    frankCorrectionConfirmed: false,
    frankContactPrepared: false,
    frankContactHeld: false,
    frankIntakeInvited: false,
    dannyInvitationOpened: false,
    dannyIntakeAccepted: false,
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

  const scrollExperienceToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.querySelector('#poc-main')?.scrollTo?.({ top: 0, left: 0, behavior: 'instant' });
  };

  const go = (id, { replace = false } = {}) => {
    if (!ROUTE.some((item) => item.id === id) || !state.unlocked.includes(id)) return false;
    state.current = id;
    state.role = ({
      chat: 'bezoeker', max: 'ondernemer', 'max-intake': 'ondernemer', 'max-management': 'management', 'frank-signal': 'expert', 'frank-review': 'expert', 'danny-uitnodiging': 'ondernemer', ondernemer: 'ondernemer', toestemming: 'ondernemer',
      accountant: 'accountant', expert: 'expert', whoa: 'trajectteam',
      leiding: 'leiding', bewijs: 'governance', bouw: 'opdrachtgever'
    })[id];
    record('projection_opened', id);
    saveSession();
    setPath(id, replace);
    render();
    scrollExperienceToTop();
    document.querySelector('#poc-main')?.focus({ preventScroll: true });
    return true;
  };

  const unlockAndGo = (id) => {
    unlock(id);
    return go(id);
  };

  const renderManagementFromTop = () => {
    saveSession();
    render();
    scrollExperienceToTop();
  };

  const scheduleManagementProjection = () => {
    if (managementTransitionTimer) window.clearTimeout(managementTransitionTimer);
    managementTransitionTimer = window.setTimeout(() => {
      managementTransitionTimer = null;
      if (state.current !== 'max-intake' || !state.maxIntakeSubmitted) return;
      record('management_projection_auto_opened', 'post-intake-transition');
      unlockAndGo('max-management');
    }, 1800);
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

  const searchExperience = (query = '', complete = false) => `
    <article class="ai-search-experience ${complete ? 'is-complete' : ''}" aria-label="AI zoekt passende expertise">
      <div class="ai-search-heading"><span class="ai-search-symbol" aria-hidden="true"></span><span>Passende expertise zoeken</span></div>
      <div class="ai-search-query"><span>Zoekvraag</span><p data-search-query>${escapeHtml(query)}</p></div>
      <ol class="ai-search-steps">
        <li class="${complete ? 'done' : ''}" data-search-step="0">Situatie vertalen naar benodigde expertise</li>
        <li class="${complete ? 'done' : ''}" data-search-step="1">Financiële en juridische begeleiding vergelijken</li>
        <li class="${complete ? 'done' : ''}" data-search-step="2">Passende specialist gevonden</li>
      </ol>
    </article>`;

  const renderChatMessages = () => state.messages.map((message) => {
    if (message.role === 'search') return searchExperience(message.query, true);
    return `<div class="chat-line ${message.role === 'user' ? 'user' : ''}">
      <span class="chat-who">${message.role === 'user' ? 'Danny' : 'AI'}</span>
      <div class="chat-text">${escapeHtml(message.content)}</div>
    </div>`;
  }).join('');

  const CHAT_DEMO = [
    {
      role: 'assistant',
      content: 'Dat klinkt zwaar. Ik denk graag met je mee. Kun je aangeven wat de kern van de problemen is?'
    },
    {
      role: 'user',
      content: 'Ik heb schulden en ik krijg ze gewoon niet meer betaald. Elke dag komt er iets nieuws bij en ik weet niet meer waar ik moet beginnen.'
    },
    {
      role: 'assistant',
      content: 'Dat is veel om tegelijk te dragen. Lukt het bedrijf zelf nog wel om klanten te bedienen en omzet te maken?'
    },
    {
      role: 'user',
      content: 'Ja, we hebben genoeg werk. Maar alles wat binnenkomt verdwijnt meteen en de achterstanden worden alleen maar groter.'
    },
    {
      role: 'assistant',
      content: 'Heb je je accountant al om hulp gevraagd?'
    },
    {
      role: 'user',
      content: 'Ja. Hij wil de cijfers nog wel aanleveren, maar zegt dat hij dit traject niet kan trekken. Er staan ook facturen bij hem open. Hij waarschuwt voor faillissement en mogelijke aansprakelijkheid. Sindsdien raak ik helemaal in paniek.'
    },
    {
      role: 'assistant',
      content: 'Je hebt dus wel om hulp gevraagd, maar nog niemand gevonden die het geheel met je kan overzien en de volgende stap organiseert. Het bedrijf draait nog, terwijl de schulden alle betaalruimte wegnemen en de waarschuwingen de druk verder verhogen. Ik kan niet beoordelen welke oplossing juridisch en financieel haalbaar is. Daarvoor moeten de cijfers, schulden, risico’s en alternatieven samen worden onderzocht.'
    },
    {
      role: 'assistant',
      content: 'Zal ik passende expertise zoeken die dit financieel en juridisch in samenhang kan bekijken?'
    },
    {
      role: 'user',
      content: 'Ja graag. Kijk wie mij hiermee kan helpen.',
      event: 'search-permission'
    },
    {
      role: 'search',
      query: 'specialist voor een bedrijf dat nog draait, schulden niet kan betalen en geen crisisbegeleiding krijgt van de accountant'
    },
    {
      role: 'assistant',
      content: 'Max Finance & Legal is gespecialiseerd in ondernemingen in zwaar weer. Zij kunnen de onderneming, schuldenpositie en haalbare oplossingen onderzoeken. Pas daarna kan een expert bepalen welke route passend is.'
    }
  ];

  const maxRecommendation = () => `
    <article class="max-recommendation" id="max-recommendation">
      <div class="max-recommendation-mark" aria-hidden="true">M</div>
      <div>
        <span class="max-recommendation-label">Aanbevolen vervolgstap</span>
        <h2>Max Finance &amp; Legal</h2>
        <p>Experthuis voor ondernemingen in zwaar weer.</p>
        <ul>
          <li>Het bedrijf heeft nog werk en omzet</li>
          <li>De schulden drukken de betaalruimte</li>
          <li>De accountant levert cijfers, maar trekt het hersteltraject niet</li>
          <li>De passende route moet nog worden vastgesteld</li>
        </ul>
        <div class="max-recommendation-actions">
          <button type="button" id="open-max-landing">Laat Max meekijken <span aria-hidden="true">→</span></button>
          <a href="https://www.maxfinancelegal.nl/" target="_blank" rel="noopener noreferrer">Bekijk website <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </article>`;

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

    return `<section class="ai-chat-conversation" aria-label="Gesprek over de onderneming">
      <div class="ai-conversation-shell">
        <div class="ai-conversation-head"><span class="ai-status-dot" aria-hidden="true"></span><span>AI Chat</span></div>
        <div class="ai-conversation-log" id="neutral-chat-log" role="log" aria-live="off">
          ${renderChatMessages()}
          ${state.chatDemoComplete ? maxRecommendation() : ''}
        </div>
        <p class="sr-only" id="chat-announcer" aria-live="polite"></p>
        <form class="ai-composer ai-conversation-composer" id="neutral-chat-form" autocomplete="off">
          <label class="sr-only" for="neutral-chat-input">Bericht aan AI</label>
          <textarea id="neutral-chat-input" rows="2" maxlength="700" placeholder="${state.chatDemoComplete ? 'Dit gesprek is afgerond' : 'Danny antwoordt…'}" ${state.chatDemoComplete ? 'disabled' : ''}></textarea>
          <div class="ai-composer-tools">
            <div class="ai-composer-left"><button class="ai-tool-button" type="button" aria-label="Bijlage toevoegen" disabled>+</button><span class="ai-mode">Chat</span></div>
            <button class="ai-send-button" type="submit" aria-label="Verstuur bericht" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/></svg>
            </button>
          </div>
        </form>
        <p class="ai-chat-note">Gesimuleerde demonstratie. Een specialist stelt de passende route vast.</p>
      </div>
    </section>`;
  };

  const renderFieldRows = (ids) => ids.map((id) => {
    const field = pack.case.fields[id];
    return `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(field.value)}</td><td><span class="status-pill ${statusClass(field.status)}">${escapeHtml(statusLabel(field.status))}</span></td></tr>`;
  }).join('');

  const renderMaxLanding = () => `
    <section class="max-entry-screen" aria-labelledby="max-entry-title">
      <header class="max-entry-header">
        <div class="max-wordmark" aria-label="Max Finance & Legal, Bedrijfsherstel">
          <strong>Max Finance <span>&amp;</span> Legal</strong>
          <small>Bedrijfsherstel</small>
        </div>
        <span class="max-entry-security"><i aria-hidden="true"></i>Nog niets gedeeld</span>
      </header>
      <main class="max-entry-main">
        <div class="max-entry-copy">
          <span class="max-entry-eyebrow">Vertrouwelijke verkenning</span>
          <h1 id="max-entry-title">U hoeft dit niet alleen uit te zoeken.</h1>
          <p>De AI heeft Danny’s verhaal geordend, maar niets doorgestuurd. Hieronder staat wat zij heeft herkend. Danny bepaalt zelf wat Max straks mag ontvangen.</p>
        </div>
        <div class="max-entry-grid">
          <article class="max-signal-panel">
            <span>Herkend in het gesprek</span>
            <ul>
              <li>Het bedrijf bedient nog klanten en maakt omzet</li>
              <li>De schulden nemen de beschikbare betaalruimte weg</li>
              <li>De accountant levert cijfers, maar trekt het hersteltraject niet</li>
            </ul>
            <p>Herkomst: uitspraken van Danny in deze demonstratiesessie.</p>
          </article>
          <article class="max-open-panel">
            <span>Nog niet vastgesteld</span>
            <ul>
              <li>Of de onderneming voldoende levensvatbaar is</li>
              <li>Welke financiële en juridische opties haalbaar zijn</li>
              <li>Welke route uiteindelijk passend is</li>
            </ul>
          </article>
        </div>
        <div class="max-entry-actions">
          <button type="button" id="open-max-intake">Start eerste intake <span aria-hidden="true">→</span></button>
          <a href="https://www.maxfinancelegal.nl/" target="_blank" rel="noopener noreferrer">Eerst naar de officiële website <span aria-hidden="true">↗</span></a>
          <p>De intake blijft in deze demonstratiesessie totdat Danny haar zelf afrondt.</p>
        </div>
      </main>
    </section>`;

  const MAX_INTAKE_QUESTIONS = [
    {
      id: 'samenvatting',
      prompt: 'Mag ik de drie signalen uit je vorige gesprek gebruiken als begin van deze eerste intake?',
      options: [
        ['ja', 'Ja, gebruik de samenvatting'],
        ['nee', 'Nee, begin opnieuw']
      ],
      response: (value) => value === 'ja'
        ? 'Dank je. Ik neem alleen die drie signalen mee. Ze blijven herkenbaar als jouw informatie.'
        : 'Prima. Dan beginnen we hier opnieuw en neem ik niets uit het vorige gesprek over.'
    },
    {
      id: 'urgent',
      prompt: 'Wat geeft vandaag de meeste druk?',
      options: [
        ['belasting', 'Belastingdienst of deurwaarder'],
        ['leveranciers', 'Leveranciers stoppen of dreigen'],
        ['vastelasten', 'Salarissen, huur of andere vaste lasten'],
        ['onbekend', 'Ik weet niet wat eerst moet']
      ],
      response: () => 'Duidelijk. We beginnen alleen daar. De rest hoeft nu nog niet tegelijk.'
    },
    {
      id: 'operatie',
      prompt: 'Wat lukt binnen het bedrijf op dit moment nog wel?',
      options: [
        ['draait', 'Klanten bedienen en omzet maken'],
        ['werk-geen-geld', 'Er is werk, maar geen betaalruimte'],
        ['valt-stil', 'Ook de dagelijkse operatie valt stil'],
        ['onbekend', 'Dat kan ik niet goed overzien']
      ],
      response: () => 'Goed dat je dit aangeeft. Dit is een signaal, nog geen oordeel over de levensvatbaarheid.'
    },
    {
      id: 'hulp',
      prompt: 'Wat zou je op dit moment het meeste helpen?',
      options: [
        ['rust', 'Eerst overzicht en rust'],
        ['regie', 'Iemand die het geheel regisseert'],
        ['haalbaarheid', 'Beoordelen wat nog haalbaar is'],
        ['onbekend', 'Ik weet het nog niet']
      ],
      response: () => 'Dat is voldoende voor een eerste beoordeling. Je hoeft nu nog geen documenten aan te leveren.'
    },
    {
      id: 'contact',
      prompt: 'Hoe mag Max contact met je opnemen over deze eerste intake?',
      options: [
        ['telefoon', 'Per telefoon'],
        ['email', 'Per e-mail'],
        ['beide', 'Per telefoon en e-mail']
      ],
      response: () => 'Duidelijk. Je vult alleen de gekozen contactmogelijkheid in en geeft daarvoor apart toestemming.'
    }
  ];

  const maxIntakeAnswerLabel = (question, value) => question.options.find(([id]) => id === value)?.[1] || value;

  const contactNeedsPhone = (preference = '') => preference === 'telefoon' || preference === 'beide';
  const contactNeedsEmail = (preference = '') => preference === 'email' || preference === 'beide';
  const contactSummary = () => {
    const parts = [];
    if (state.contactPhone) parts.push(state.contactPhone);
    if (state.contactEmail) parts.push(state.contactEmail);
    return parts.join(' · ');
  };

  const renderMaxIntakeTranscript = () => {
    const answers = state.maxIntakeAnswers || {};
    const parts = [`<div class="max-ai-line"><span>Max AI</span><p>Goed dat je er bent, Danny. We doen dit stap voor stap. Je hoeft nu nog niets te bewijzen of compleet te maken.</p></div>`];
    for (let index = 0; index < Math.min(state.maxIntakeStep || 0, MAX_INTAKE_QUESTIONS.length); index += 1) {
      const question = MAX_INTAKE_QUESTIONS[index];
      const value = answers[question.id];
      if (!value) continue;
      parts.push(`<div class="max-ai-line"><span>Max AI</span><p>${escapeHtml(question.prompt)}</p></div>`);
      parts.push(`<div class="max-ai-line user"><span>Danny</span><p>${escapeHtml(maxIntakeAnswerLabel(question, value))}</p></div>`);
      parts.push(`<div class="max-ai-line"><span>Max AI</span><p>${escapeHtml(question.response(value))}</p></div>`);
    }
    return parts.join('');
  };

  const renderMaxIntake = () => {
    const answers = state.maxIntakeAnswers || {};
    const step = Math.min(state.maxIntakeStep || 0, MAX_INTAKE_QUESTIONS.length);
    const currentQuestion = MAX_INTAKE_QUESTIONS[step];
    const summaryUsed = answers.samenvatting === 'ja';
    const summarySkipped = answers.samenvatting === 'nee';
    const overviewRows = [
      ['Eerdere chatsignalen', summaryUsed ? 'Door Danny vrijgegeven' : summarySkipped ? 'Niet overgenomen' : 'AI-herkend · nog bevestigen', summaryUsed ? 'confirmed' : summarySkipped ? 'withheld' : 'candidate'],
      ['Druk van vandaag', answers.urgent ? maxIntakeAnswerLabel(MAX_INTAKE_QUESTIONS[1], answers.urgent) : 'Nog onbekend', answers.urgent ? 'confirmed' : 'unknown'],
      ['Wat nog functioneert', answers.operatie ? maxIntakeAnswerLabel(MAX_INTAKE_QUESTIONS[2], answers.operatie) : 'Nog onbekend', answers.operatie ? 'confirmed' : 'unknown'],
      ['Gewenste hulp', answers.hulp ? maxIntakeAnswerLabel(MAX_INTAKE_QUESTIONS[3], answers.hulp) : 'Nog onbekend', answers.hulp ? 'confirmed' : 'unknown'],
      ['Contactvoorkeur', answers.contact ? (contactSummary() || maxIntakeAnswerLabel(MAX_INTAKE_QUESTIONS[4], answers.contact)) : 'Nog onbekend', answers.contact ? 'confirmed' : 'unknown']
    ];
    return `<section class="max-intake-screen" aria-labelledby="max-intake-title">
      <header class="max-entry-header">
        <div class="max-wordmark" aria-label="Max Finance & Legal, Bedrijfsherstel"><strong>Max Finance <span>&amp;</span> Legal</strong><small>Bedrijfsherstel</small></div>
        <span class="max-entry-security"><i aria-hidden="true"></i>${state.maxIntakeSubmitted ? 'Eerste intake ontvangen' : 'Nog niet verzonden'}</span>
      </header>
      <main class="max-intake-layout">
        <aside class="max-intake-overview" aria-label="Door Danny opgebouwd overzicht">
          <div class="max-intake-progress"><span>Eerste intake</span><strong>${step} van ${MAX_INTAKE_QUESTIONS.length}</strong><i style="--progress:${step / MAX_INTAKE_QUESTIONS.length * 100}%"></i></div>
          <h1 id="max-intake-title">Jouw overzicht</h1>
          <p>Alleen bevestigde antwoorden worden onderdeel van deze eerste intake.</p>
          <div class="max-overview-list">${overviewRows.map(([label, value, status]) => `<article class="${status}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${status === 'confirmed' ? 'Door Danny bevestigd' : status === 'candidate' ? 'Door AI herkend' : status === 'withheld' ? 'Niet vrijgegeven' : 'Geen gegeven'}</small></article>`).join('')}</div>
          <button class="agora-trace" type="button" id="show-intake-lineage"><span aria-hidden="true">◎</span> Toon herkomst en status</button>
        </aside>
        <section class="max-intake-ai" aria-label="Kalmerende AI-intake">
          <div class="max-ai-log" role="log" aria-live="polite">
            ${renderMaxIntakeTranscript()}
            ${state.maxIntakeSubmitted ? `<div class="max-ai-line receipt"><span>Max AI</span><p>Je eerste intake is ontvangen. Interne opvolging wordt geopend zodat Max kan bepalen wie dit menselijk beoordeelt.</p><button type="button" id="open-max-management">Open interne opvolging direct <span aria-hidden="true">→</span></button></div>` : ''}
          </div>
          ${!state.maxIntakeSubmitted && currentQuestion ? `<div class="max-ai-question">
            <span>Max AI vraagt</span><h2>${escapeHtml(currentQuestion.prompt)}</h2>
            <div class="max-intake-options">${currentQuestion.options.map(([value, label]) => `<button type="button" data-intake-answer="${escapeHtml(value)}">${escapeHtml(label)}</button>`).join('')}</div>
            <p>Je kunt altijd stoppen. Er wordt nog niets naar een expert gestuurd.</p>
          </div>` : ''}
          ${!state.maxIntakeSubmitted && !currentQuestion ? `<form class="max-intake-ready max-contact-form" id="max-contact-form" novalidate>
            <span>Contact en toestemming</span><h2>Hoe kan Max je veilig bereiken?</h2><p>Vul alleen in wat je zojuist hebt gekozen. Deze fictieve demonstratie verstuurt niets extern.</p>
            <div class="max-contact-fields">
              ${contactNeedsPhone(answers.contact) ? `<label for="contact-phone">Telefoonnummer</label><input id="contact-phone" name="phone" type="tel" autocomplete="tel" value="${escapeHtml(state.contactPhone)}" placeholder="Bijvoorbeeld 06 12 34 56 78">` : ''}
              ${contactNeedsEmail(answers.contact) ? `<label for="contact-email">E-mailadres</label><input id="contact-email" name="email" type="email" autocomplete="email" value="${escapeHtml(state.contactEmail)}" placeholder="Bijvoorbeeld danny@voorbeeld.nl">` : ''}
            </div>
            <label class="max-contact-consent" for="contact-consent"><input id="contact-consent" type="checkbox" ${state.contactConsent ? 'checked' : ''}><span>Max mag deze contactgegevens uitsluitend gebruiken voor opvolging van deze eerste intake.</span></label>
            ${state.contactError ? `<p class="max-contact-error" role="alert">${escapeHtml(state.contactError)}</p>` : ''}
            <button type="submit" id="submit-max-intake">Bevestig contact en verstuur intake <span aria-hidden="true">→</span></button>
          </form>` : ''}
        </section>
      </main>
      <dialog class="lineage-dialog" id="intake-lineage"><button type="button" id="close-intake-lineage" aria-label="Sluit herkomst">×</button><span>Agora · herkomstlaag</span><h2>Waarom dit overzicht aantoonbaar blijft</h2><ul><li>Een antwoord wordt pas bevestigd nadat Danny zelf kiest.</li><li>AI-herkenning blijft afzonderlijk gemarkeerd.</li><li>Iedere wijziging bewaart actor, moment en vorige status.</li><li>Deze eerste intake bevat nog geen expertbesluit.</li></ul></dialog>
    </section>`;
  };

  const managementSignalTime = () => {
    const value = state.managementSignalCreatedAt ? new Date(state.managementSignalCreatedAt) : null;
    if (!value || Number.isNaN(value.getTime())) return 'zojuist';
    return value.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  const managementSignalDate = () => {
    const value = state.managementSignalCreatedAt ? new Date(state.managementSignalCreatedAt) : new Date();
    return value.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const managementAiAnswer = (prompt = '') => {
    const normalized = prompt.toLowerCase();
    if (normalized.includes('ontbreekt')) return 'Voor een menselijke beoordeling ontbreken nog actuele cijfers, een schuldenoverzicht en controle op de directe tijdsdruk.';
    if (normalized.includes('frank')) return 'Frank wordt voorgesteld vanwege bedrijfsherstel. Dat is een AI-voorstel; management bepaalt de toewijzing en Frank beoordeelt de inhoud opnieuw.';
    if (normalized.includes('aandacht') || normalized.includes('samen')) return 'De directe betaaldruk vraagt aandacht. Dat klanten en omzet nog bestaan is alleen een aanwijzing om verder te onderzoeken, geen oordeel over levensvatbaarheid.';
    if (normalized.includes('status') || normalized.includes('agora') || normalized.includes('bron')) return 'Agora houdt bevestigde uitspraken, AI-afleidingen, ontbrekende gegevens en menselijke besluiten afzonderlijk zichtbaar.';
    return 'Ik kan deze intake ordenen en ontbrekende informatie aanwijzen. Een expert bepaalt pas na controle wat haalbaar en passend is.';
  };

  const renderManagementAi = () => {
    if (!state.managementAiOpen) return '';
    const messages = state.managementAiMessages || [];
    return `<aside class="management-ai-panel" aria-label="Management AI-chat">
      <header><div><span>Contextassistent</span><h2>Management AI</h2></div><button type="button" id="close-management-ai" aria-label="Sluit Management AI">×</button></header>
      <div class="management-ai-log" role="log" aria-live="polite">
        <div class="management-ai-message assistant"><span>AI</span><p>Ik kan het signaal toelichten en ontbrekende informatie aanwijzen. Ik neem geen expertbesluit.</p></div>
        ${messages.map((message) => `<div class="management-ai-message ${message.role}"><span>${message.role === 'user' ? 'Management' : 'AI'}</span><p>${escapeHtml(message.content)}</p></div>`).join('')}
      </div>
      <div class="management-ai-actions" aria-label="Snelle managementvragen">
        <button type="button" data-management-ai-prompt="Vat samen wat nu aandacht vraagt">Wat vraagt nu aandacht?</button>
        <button type="button" data-management-ai-prompt="Welke informatie ontbreekt nog?">Wat ontbreekt nog?</button>
        <button type="button" data-management-ai-prompt="Waarom wordt Frank voorgesteld?">Waarom Frank?</button>
      </div>
      <form class="management-ai-form" id="management-ai-form">
        <label class="sr-only" for="management-ai-input">Vraag over dit signaal</label>
        <input id="management-ai-input" maxlength="240" placeholder="Vraag iets over dit signaal">
        <button type="submit" aria-label="Verstuur vraag">→</button>
      </form>
    </aside>`;
  };

  const renderManagementTransfer = () => `<section class="management-transfer-screen" aria-labelledby="management-transfer-title">
    <header class="management-header">
      <div class="management-brand"><strong>MAX<span>OS</span></strong><small>Gecontroleerde overdracht</small></div>
      <div class="management-user"><span>Besluit door</span><strong>Directie</strong><i aria-hidden="true">DR</i></div>
    </header>
    <main class="management-transfer-main">
      <span>Menselijke toewijzing · ${escapeHtml(managementSignalTime())}</span>
      <h1 id="management-transfer-title">Frank ontvangt een taak, geen conclusie.</h1>
      <p>Max-OS voert het managementbesluit uit. Agora bewaart wie wat heeft toegewezen, waarop dat rust en waar het menselijke oordeel nog moet beginnen.</p>
      <div class="management-transfer-steps" role="status" aria-label="Toewijzing aan Frank vastgelegd">
        <article><i aria-hidden="true">1</i><div><strong>Managementbesluit geregistreerd</strong><small>Actor, tijdstip en gekozen expertise zijn vastgelegd.</small></div></article>
        <article><i aria-hidden="true">2</i><div><strong>Agora maakt overdrachtslog</strong><small>Herkomst, doel en beslisgrens blijven afzonderlijk zichtbaar.</small></div></article>
        <article><i aria-hidden="true">3</i><div><strong>Privacyveilige melding gereed</strong><small>Frank ziet op zijn vergrendelscherm nog geen naam of dossierinhoud.</small></div></article>
      </div>
      <div class="management-transfer-boundary"><span>Overdrachtsgrens</span><p>Geen expertoordeel · geen routebesluit · geen documenttoegang · geen accountantstoestemming.</p></div>
      <div class="management-transfer-actions"><button type="button" class="primary" id="open-frank-signal">Open Franks mobiele melding <span aria-hidden="true">→</span></button><button type="button" id="close-management-transfer">Terug naar management</button></div>
    </main>
  </section>`;

  const renderMaxManagement = () => {
    if (state.managementTransferOpen) return renderManagementTransfer();
    const answers = state.maxIntakeAnswers || {};
    const urgent = answers.urgent ? maxIntakeAnswerLabel(MAX_INTAKE_QUESTIONS[1], answers.urgent) : 'Nog niet bevestigd';
    const operation = answers.operatie ? maxIntakeAnswerLabel(MAX_INTAKE_QUESTIONS[2], answers.operatie) : 'Nog niet bevestigd';
    const help = answers.hulp ? maxIntakeAnswerLabel(MAX_INTAKE_QUESTIONS[3], answers.hulp) : 'Nog niet bevestigd';
    const contact = contactSummary() || 'Geen contactmogelijkheid bevestigd';
    const opened = state.managementSignalOpened;
    const expanded = state.managementSignalExpanded;
    const assigned = state.managementSignalAssigned;
    return `<section class="management-screen" aria-labelledby="management-title">
      <header class="management-header">
        <div class="management-brand"><strong>MAX<span>OS</span></strong><small>Management AI</small></div>
        <div class="management-user"><span>Werkruimte</span><strong>Directie</strong><i aria-hidden="true">DR</i></div>
      </header>
      <div class="management-shell">
        <nav class="management-nav" aria-label="Managementonderdelen">
          <button type="button" class="active" aria-label="Signalen"><span aria-hidden="true">◇</span><small>1</small></button>
          <button type="button" aria-label="Dossiers" disabled><span aria-hidden="true">▤</span></button>
          <button type="button" aria-label="Experts" disabled><span aria-hidden="true">◎</span></button>
        </nav>
        <main class="management-main">
          <header class="management-titlebar"><div><span>Vandaag · ${escapeHtml(managementSignalTime())}</span><h1 id="management-title">Signalen die aandacht vragen</h1><p>AI ordent. Management bepaalt of en door wie een intake wordt opgevolgd.</p></div><div class="management-count"><strong>1</strong><span>${opened ? 'gelezen' : 'nieuw'}</span></div></header>
          <div class="management-grid ${expanded ? 'is-open' : ''}">
            <section class="signal-inbox" aria-label="Nieuwe signalen">
              <button type="button" class="management-signal ${opened ? 'read' : 'unread'} ${expanded ? 'selected' : ''}" id="open-management-signal" aria-expanded="${expanded}">
                <span class="signal-pulse" aria-hidden="true"></span>
                <span class="signal-copy"><small>Eerste intake · Danny</small><strong>Betaaldruk terwijl de operatie nog draait</strong><span>Ontvangen ${escapeHtml(managementSignalTime())}</span></span>
                <span class="signal-tags"><i class="urgent">Tijdskritiek · hoog</i><i class="potential">Potentie · onderzoeken</i></span>
                <span class="signal-arrow" aria-hidden="true">→</span>
              </button>
              <p class="signal-boundary">De kleur geeft prioriteit en onderzoeksrichting aan. Niet de uitkomst.</p>
            </section>
            ${expanded ? `<section class="signal-detail" aria-label="Geopend intakesignaal">
              <header><div><span>AI-intakesamenvatting</span><h2>Danny vraagt om regie voordat de situatie verder escaleert.</h2></div><button type="button" id="close-management-signal" aria-label="Sluit signaal">×</button></header>
              <div class="signal-assessment">
                <article class="urgent"><span>Tijdskritiek</span><strong>Hoog</strong><p>${escapeHtml(urgent)}</p><small>Door Danny bevestigd</small></article>
                <article class="potential"><span>Continuïteitspotentieel</span><strong>Te onderzoeken</strong><p>${escapeHtml(operation)}</p><small>AI-signaal · geen expertoordeel</small></article>
              </div>
              <div class="signal-columns">
                <article><span>Hulpvraag</span><p>${escapeHtml(help)}</p><small>Door Danny bevestigd</small></article>
                <article><span>Contact opnemen</span><p>${escapeHtml(contact)}</p><small>Door Danny vrijgegeven voor intake-opvolging</small></article>
                <article><span>Nog nodig</span><p>Actuele cijfers, schuldenoverzicht en menselijke beoordeling.</p><small>Ontbreekt</small></article>
              </div>
              <button type="button" class="management-lineage" id="show-management-lineage"><span aria-hidden="true">◎</span> Waarom geeft Agora dit signaal zo weer?</button>
              <footer class="management-actions">
                <div><span>Voorgestelde expertise</span><strong>Frank · bedrijfsherstel</strong><small>${assigned ? 'Door directie toegewezen' : 'AI-voorstel, nog niet toegewezen'}</small></div>
                ${assigned ? `<button type="button" id="show-management-transfer">Bekijk overdracht <span aria-hidden="true">→</span></button>` : `<button type="button" id="assign-management-signal">Zet door naar Frank <span aria-hidden="true">→</span></button>`}
              </footer>
            </section>` : `<section class="signal-zero"><span aria-hidden="true">◇</span><h2>Open het nieuwe signaal</h2><p>Bekijk wat AI heeft herkend, wat Danny heeft bevestigd en wat nog door een mens moet worden beoordeeld.</p></section>`}
          </div>
        </main>
      </div>
      <button type="button" class="management-ai-launch" id="open-management-ai" aria-expanded="${Boolean(state.managementAiOpen)}"><span aria-hidden="true">✦</span><span><small>Beschikbaar in dit scherm</small><strong>Vraag Management AI</strong></span></button>
      ${renderManagementAi()}
      <dialog class="lineage-dialog management-lineage-dialog" id="management-lineage"><button type="button" id="close-management-lineage" aria-label="Sluit Agora-uitleg">×</button><span>Agora · signaallogica</span><h2>Urgentie is geen levensvatbaarheid</h2><ul><li><strong>Tijdskritiek · hoog</strong> rust op Danny’s bevestigde druk van vandaag.</li><li><strong>Potentie · onderzoeken</strong> rust op zijn verklaring dat klanten en omzet nog bestaan.</li><li>AI koppelt deze signalen, maar mag geen haalbaarheid of route vaststellen.</li><li>De toewijzing aan Frank wordt als afzonderlijk menselijk besluit vastgelegd.</li></ul></dialog>
    </section>`;
  };

  const renderFrankSignal = () => {
    const opened = state.frankNotificationOpened;
    const accepted = state.frankReviewAccepted;
    return `<section class="frank-signal-screen" aria-labelledby="frank-signal-title">
      <div class="frank-signal-stage">
        <aside class="frank-handoff-context">
          <span>Overdracht · menselijke poort</span>
          <h1 id="frank-signal-title">De juiste expert krijgt alleen wat hij nu nodig heeft.</h1>
          <p>De melding toont urgentie, geen dossierinhoud. Pas na veilig openen ziet Frank de bevestigde signalen en het managementbesluit.</p>
          <ol><li class="done">Management heeft toegewezen</li><li class="${opened ? 'done' : 'current'}">Frank opent beveiligd</li><li class="${accepted ? 'done' : opened ? 'current' : ''}">Frank neemt beoordeling aan</li></ol>
          <button type="button" class="frank-agora-button" id="show-frank-lineage">Bekijk de overdracht in Agora</button>
        </aside>
        <div class="frank-phone-frame">
          <div class="frank-phone-context"><span>Mobiele melding op Franks telefoon</span><small>Beveiligde expertomgeving</small></div>
          <span class="frank-phone-side-controls" aria-hidden="true"><i></i><i></i><i></i></span>
          <div class="frank-phone ${opened ? 'is-open' : ''}">
          ${opened ? `<div class="frank-expert-app">
            <header><div class="frank-expert-brand"><strong>MAX<span>OS</span></strong><small>Expert</small></div><div class="frank-expert-user"><span>Frank</span><i aria-hidden="true">F</i></div></header>
            <main>
              <span class="frank-eyebrow">Nieuwe beoordeling · ${escapeHtml(managementSignalTime())}</span>
              <h2>Een eerste intake vraagt jouw expertise.</h2>
              <p class="frank-intro">Management vraagt je om de situatie opnieuw en zelfstandig te beoordelen.</p>
              <div class="frank-signal-facts">
                <article class="urgent"><span>Prioriteit</span><strong>Vandaag beoordelen</strong><small>Tijdskritiek signaal</small></article>
                <article><span>Voorgesteld domein</span><strong>Bedrijfsherstel</strong><small>Managementtoewijzing</small></article>
                <article class="boundary"><span>Beslisgrens</span><strong>Nog geen expertoordeel</strong><small>Route en haalbaarheid zijn open</small></article>
              </div>
              <button type="button" class="frank-source-link" id="show-frank-lineage-mobile">Waarom ontvang ik dit signaal?</button>
              ${accepted ? `<div class="frank-accepted" role="status"><span>Beoordeling aangenomen</span><h3>Het signaal staat in Franks werkvoorraad.</h3><p>De volgende stap is het volledige expertscherm met controlepunten en ontbrekende informatie.</p></div>` : `<div class="frank-review-actions"><button type="button" class="primary" id="accept-frank-review">Neem beoordeling aan</button><button type="button" id="decline-frank-review">Nu niet beschikbaar</button></div>`}
            </main>
          </div>` : `<div class="frank-lock-screen">
            <header><span>${escapeHtml(managementSignalTime())}</span><span aria-label="Beveiligde verbinding">●●●</span></header>
            <div class="frank-lock-time"><strong>${escapeHtml(managementSignalTime())}</strong><span>${escapeHtml(managementSignalDate())}</span></div>
            <article class="frank-notification">
              <header><strong>MAX OS</strong><span>nu</span></header>
              <h2>Nieuwe intake vraagt beoordeling</h2>
              <p>Tijdskritiek signaal. De inhoud blijft afgeschermd totdat je de beveiligde werkruimte opent.</p>
              <button type="button" id="open-frank-notification">Open beveiligde melding</button>
            </article>
            <p class="frank-lock-boundary">Geen naam, dossiergegeven of mogelijke route zichtbaar op het vergrendelscherm.</p>
          </div>`}
          <span class="frank-phone-home" aria-hidden="true"></span>
          </div>
        </div>
      </div>
      <dialog class="lineage-dialog frank-lineage-dialog" id="frank-lineage"><button type="button" id="close-frank-lineage" aria-label="Sluit Agora-overdracht">×</button><span>Agora · overdrachtslog</span><h2>Frank ontvangt een besluit, geen conclusie</h2><ul><li>Danny heeft de eerste intake zelf verzonden.</li><li>Management heeft Frank als beoordelaar toegewezen.</li><li>Urgentie en onderzoekspotentieel blijven afzonderlijke signalen.</li><li>Frank stelt haalbaarheid en route pas na eigen controle vast.</li></ul></dialog>
    </section>`;
  };

  const renderFrankReview = () => {
    const answers = state.maxIntakeAnswers || {};
    const corrected = state.frankCorrectionConfirmed;
    const contactPrepared = state.frankContactPrepared;
    const contactHeld = state.frankContactHeld;
    const intakeInvited = state.frankIntakeInvited;
    const urgent = answers.urgent ? maxIntakeAnswerLabel(MAX_INTAKE_QUESTIONS[1], answers.urgent) : 'Nog niet bevestigd';
    const operation = answers.operatie ? maxIntakeAnswerLabel(MAX_INTAKE_QUESTIONS[2], answers.operatie) : 'Nog niet bevestigd';
    const help = answers.hulp ? maxIntakeAnswerLabel(MAX_INTAKE_QUESTIONS[3], answers.hulp) : 'Nog niet bevestigd';
    return `<section class="frank-review-workspace" aria-labelledby="frank-review-title">
      <header class="frank-review-header">
        <div><strong>MAX<span>OS</span></strong><small>Beveiligde expertwerkruimte</small></div>
        <div><span>Beoordelaar</span><strong>Frank</strong><i aria-hidden="true">F</i></div>
      </header>
      <div class="frank-review-layout">
        <aside class="frank-case-rail" aria-label="Casus en herkomst">
          <span>Nieuwe casus · ${escapeHtml(managementSignalTime())}</span>
          <h2>Danny</h2>
          <p>Betaaldruk terwijl de onderneming nog klanten bedient.</p>
          <dl>
            <div><dt>Prioriteit</dt><dd>Vandaag beoordelen</dd></div>
            <div><dt>Hulpvraag</dt><dd>${escapeHtml(help)}</dd></div>
            <div><dt>Contact</dt><dd>${escapeHtml(contactSummary() || 'Niet vrijgegeven')}</dd></div>
          </dl>
          <button type="button" id="show-frank-review-lineage">Bekijk Agora-herkomst</button>
          <p class="frank-review-boundary">Geen routebesluit · geen overeenkomst · geen documenttoegang.</p>
        </aside>
        <main class="frank-review-main">
          <span>Menselijke beoordeling</span>
          <h1 id="frank-review-title">Eerst vaststellen wat we werkelijk weten.</h1>
          <p>AI heeft de intake geordend. Frank bepaalt welke signalen bruikbaar zijn, wat moet worden gecorrigeerd en welke informatie eerst nodig is.</p>
          <div class="frank-review-groups">
            <article class="confirmed">
              <span>Door Danny bevestigd</span>
              <h2>Feiten uit de eerste intake</h2>
              <ul><li>${escapeHtml(urgent)}</li><li>${escapeHtml(operation)}</li><li>De accountant levert cijfers, maar trekt het hersteltraject niet.</li></ul>
            </article>
            <article class="inference">
              <span>AI-afleiding · te toetsen</span>
              <h2>${corrected ? 'Door Frank genuanceerd' : 'Mogelijk continuïteitspotentieel'}</h2>
              <p>${corrected ? 'Dat de operatie draait is een relevant signaal, maar nog geen bewijs van levensvatbaarheid.' : 'De bestaande klanten en omzet kunnen wijzen op een bruikbare kern. Alleen een expert kan dit na cijfers en context beoordelen.'}</p>
              ${corrected ? '<small>Menselijke correctie vastgelegd in Agora.</small>' : '<button type="button" id="correct-frank-inference">Nuanceer deze AI-afleiding</button>'}
            </article>
            <article class="missing">
              <span>Nog aan te leveren</span>
              <h2>Benodigd vóór inhoudelijke routekeuze</h2>
              <ul><li>Actuele cijfers en liquiditeitsbeeld</li><li>Volledig schuldenoverzicht</li><li>Crediteuren, zekerheden en acute termijnen</li></ul>
            </article>
          </div>
          <section class="frank-contact-decision" aria-label="Menselijke vervolgstap">
            <span>Eerstvolgende menselijke stap</span>
            ${intakeInvited ? `<div role="status"><h2>De uitnodiging staat bij Danny.</h2><p>Hij opent hem zelf achter een beveiligde link. Documenten en toestemmingen worden daar gevraagd, niet hier vastgelegd.</p><button type="button" id="open-danny-invitation">Bekijk Danny’s uitnodiging <span aria-hidden="true">→</span></button></div>`
              : contactHeld ? `<div><h2>Het gesprek is gevoerd.</h2><ul><li>Verwachtingen over wat een hersteltraject van Danny vraagt.</li><li>Kosten en werkwijze.</li><li>Welke stukken hij daarvoor moet aanleveren.</li></ul><p>Er is nog geen overeenkomst. Danny beslist zelf of hij de vervolgintake start.</p><button type="button" id="send-intake-invitation">Verstuur uitnodiging voor de vervolgintake <span aria-hidden="true">→</span></button><small>De uitnodiging opent Danny’s eigen scherm in deze demonstratie. Er gaat niets werkelijk de deur uit.</small></div>`
              : contactPrepared ? `<div><h2>Persoonlijk contact is voorbereid.</h2><p>Frank neemt via de vrijgegeven contactmogelijkheid rechtstreeks contact op. Overeenkomst, volledige toestemming en documenttoegang worden pas in dat gesprek besproken.</p><button type="button" id="confirm-contact-held">Gesprek gevoerd, verwachtingen en kosten besproken</button><small>Zonder dit gesprek volgt geen uitnodiging.</small></div>`
              : `<div><h2>Eerst Danny spreken, daarna pas een volledig traject openen.</h2><p>Dit contactmoment dient om verwachtingen, kosten, toestemming en de vervolgintake uit te leggen.</p><button type="button" id="prepare-personal-contact" ${corrected ? '' : 'disabled'}>Eerst persoonlijk contact plannen <span aria-hidden="true">→</span></button><small>${corrected ? 'Nog geen bericht of afspraak wordt werkelijk verzonden.' : 'Nuanceer eerst de AI-afleiding.'}</small></div>`}
          </section>
        </main>
        <aside class="frank-review-ai" aria-label="Expert AI">
          <span>Expert AI</span>
          <h2>Voorbereid, niet vastgesteld.</h2>
          <p>Ik heb bevestigde informatie, afleidingen en ontbrekende gegevens gescheiden. Ik mag geen haalbaarheid, juridische route of overeenkomst vaststellen.</p>
          <ol><li class="done">Intake geordend</li><li class="${corrected ? 'done' : 'current'}">Menselijke nuance</li><li class="${contactHeld ? 'done' : corrected ? 'current' : ''}">Persoonlijk contact</li><li class="${intakeInvited ? 'done' : contactHeld ? 'current' : ''}">Volledige toestemming en intake</li></ol>
        </aside>
      </div>
      <dialog class="lineage-dialog" id="frank-review-lineage"><button type="button" id="close-frank-review-lineage" aria-label="Sluit Agora-herkomst">×</button><span>Agora · expertlog</span><h2>Voorstel en oordeel blijven gescheiden</h2><ul><li>Danny bevestigde de zichtbare intakegegevens.</li><li>Management wees Frank toe als beoordelaar.</li><li>AI markeerde continuïteit uitsluitend als te onderzoeken afleiding.</li><li>Franks nuance en vervolgbeslissing worden afzonderlijk vastgelegd.</li></ul></dialog>
    </section>`;
  };

  const renderDannyInvitation = () => {
    const opened = state.dannyInvitationOpened;
    const accepted = state.dannyIntakeAccepted;
    return `<section class="danny-invitation" aria-labelledby="danny-invitation-title">
      <header class="danny-invitation-header">
        <div><strong>MAX</strong><small>Finance &amp; Legal</small></div>
        <div><span>Voor</span><strong>Danny</strong></div>
      </header>
      ${opened ? `<div class="danny-invitation-open">
        <span>Uitnodiging · geopend ${escapeHtml(managementSignalTime())}</span>
        <h1 id="danny-invitation-title">Wat de vervolgintake van u vraagt.</h1>
        <p>Frank heeft u gesproken. Hieronder staat wat er nodig is en waarvoor u straks toestemming geeft. U beslist zelf of u begint.</p>
        <article class="danny-invitation-agreed">
          <span>Afgesproken in het gesprek</span>
          <ul><li>Wat een hersteltraject van u vraagt aan tijd en medewerking.</li><li>Wat het kost en hoe Frank werkt.</li><li>Dat u zonder verplichting kunt stoppen zolang er niets is afgesproken.</li></ul>
        </article>
        <div class="danny-invitation-groups">
          <article class="documents">
            <span>Straks nodig</span>
            <h2>Gevraagde documenten</h2>
            <ul><li>Actuele cijfers en liquiditeitsbeeld</li><li>Volledig schuldenoverzicht</li><li>Crediteuren, zekerheden en acute termijnen</li></ul>
            <small>Nog niets aangeleverd. Aanleveren gebeurt pas in de intake zelf.</small>
          </article>
          <article class="consents">
            <span>Straks te geven</span>
            <h2>Gevraagde toestemmingen</h2>
            <ul><li>Max mag deze stukken gebruiken om uw situatie te beoordelen.</li><li>Frank mag uw accountant om aanvullende cijfers vragen.</li><li>Max legt vast welke stappen zijn gezet en waarop ze rusten.</li></ul>
            <small>U geeft ze per onderdeel, en u kunt ze weer intrekken.</small>
          </article>
        </div>
        ${accepted ? `<section class="danny-invitation-decision" aria-label="Uw beslissing"><span>Vastgelegd</span><div role="status"><h2>De vervolgintake staat voor u klaar.</h2><p>Frank ziet dat u wilt beginnen. Er is nog geen overeenkomst, nog geen toegang tot uw stukken en nog geen keuze over een vervolgroute.</p></div></section>`
          : `<section class="danny-invitation-decision" aria-label="Uw beslissing"><span>Uw beslissing</span><h2>Begint u aan de vervolgintake?</h2><p>Er is nog geen overeenkomst en er wordt nog niets van u opgevraagd. Instemmen betekent alleen dat de intake voor u wordt klaargezet.</p><button type="button" id="accept-danny-intake">Ja, zet de intake voor mij klaar <span aria-hidden="true">→</span></button><small>Er wordt in deze demonstratie niets verzonden of opgeslagen.</small></section>`}
        <p class="danny-invitation-boundary">Max legt vast wat is gevraagd en wat u antwoordt. Beoordelen en beslissen blijft mensenwerk.</p>
      </div>` : `<div class="danny-invitation-lock">
        <span>Beveiligde uitnodiging · ${escapeHtml(managementSignalTime())}</span>
        <h1 id="danny-invitation-title">Frank heeft u een uitnodiging gestuurd.</h1>
        <p>U hebt elkaar net gesproken. In deze uitnodiging staat wat de vervolgintake van u vraagt.</p>
        <article class="danny-invitation-sender">
          <span>Afzender</span>
          <strong>Frank · bedrijfsherstel</strong>
          <small>Max Finance &amp; Legal</small>
        </article>
        <button type="button" id="open-danny-invitation-link">Open de beveiligde uitnodiging</button>
        <p class="danny-invitation-boundary">De inhoud blijft afgeschermd totdat u hem zelf opent.</p>
      </div>`}
    </section>`;
  };

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
    max: renderMaxLanding,
    'max-intake': renderMaxIntake,
    'max-management': renderMaxManagement,
    'frank-signal': renderFrankSignal,
    'frank-review': renderFrankReview,
    'danny-uitnodiging': renderDannyInvitation,
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
    const isAiChat = state.current === 'chat';
    app.classList.toggle('ai-chat-start', isAiChat);
    const isMaxEntry = state.current === 'max';
    app.classList.toggle('max-entry-mode', isMaxEntry);
    const isMaxIntake = state.current === 'max-intake';
    app.classList.toggle('max-intake-mode', isMaxIntake);
    const isMaxManagement = state.current === 'max-management';
    app.classList.toggle('max-management-mode', isMaxManagement);
    const isFrankSignal = state.current === 'frank-signal';
    app.classList.toggle('frank-signal-mode', isFrankSignal);
    const isFrankReview = state.current === 'frank-review';
    app.classList.toggle('frank-review-mode', isFrankReview);
    const isDannyInvitation = state.current === 'danny-uitnodiging';
    app.classList.toggle('danny-invitation-mode', isDannyInvitation);
    document.title = isAiChat ? 'AI Chat' : isMaxEntry ? 'Max Finance & Legal — vertrouwelijke verkenning' : isMaxIntake ? 'Max Finance & Legal — eerste intake' : isMaxManagement ? 'Max-OS — Management AI' : isFrankSignal ? 'Max-OS — Frank ontvangt een signaal' : isFrankReview ? 'Max-OS — Expertbeoordeling' : isDannyInvitation ? 'Max Finance & Legal — uitnodiging voor de intake' : 'R.O.B. → Max-OS — gecontroleerde demonstratie';
    renderRoute();
    renderEvidence();
    setChrome();
    screen.innerHTML = (renderers[state.current] || renderChat)();
    bindScreenActions();
  };

  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  const typeInto = async (element, text, millisecondsPerCharacter) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      element.textContent = text;
      return;
    }
    for (const character of text) {
      element.textContent += character;
      await wait(millisecondsPerCharacter);
    }
  };

  const typeIntoComposer = async (element, text) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      element.value = text;
      return;
    }
    for (const character of text) {
      element.value += character;
      await wait(36);
    }
  };

  const appendChatMessage = async (message) => {
    const log = document.querySelector('#neutral-chat-log');
    if (!log) return;
    const line = document.createElement('div');
    line.className = `chat-line ${message.role === 'user' ? 'user' : ''}`;
    const who = document.createElement('span');
    who.className = 'chat-who';
    who.textContent = message.role === 'user' ? 'Danny' : 'AI';
    const text = document.createElement('div');
    text.className = `chat-text ${message.role === 'assistant' ? 'is-typing' : ''}`;
    line.append(who, text);
    log.append(line);
    line.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (message.role === 'user') text.textContent = message.content;
    else await typeInto(text, message.content, 43);
    text.classList.remove('is-typing');
    state.messages.push(message);
    saveSession();
    const announcer = document.querySelector('#chat-announcer');
    if (announcer) announcer.textContent = `${who.textContent}: ${message.content}`;
  };

  const appendSearchExperience = async (message) => {
    const log = document.querySelector('#neutral-chat-log');
    if (!log) return;
    log.insertAdjacentHTML('beforeend', searchExperience('', false));
    const experience = log.querySelector('.ai-search-experience:not(.is-complete)');
    const query = experience?.querySelector('[data-search-query]');
    experience?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (query) await typeInto(query, message.query, 32);
    for (let index = 0; index < 3; index += 1) {
      const step = experience?.querySelector(`[data-search-step="${index}"]`);
      step?.classList.add('active');
      await wait(1150);
      step?.classList.remove('active');
      step?.classList.add('done');
    }
    experience?.classList.add('is-complete');
    state.messages.push(message);
    saveSession();
    const announcer = document.querySelector('#chat-announcer');
    if (announcer) announcer.textContent = 'Passende specialist gevonden.';
  };

  const openMaxLanding = () => {
    record('max_recommendation_accepted', 'controlled-entry');
    unlockAndGo('max');
  };

  const runChatDemo = async () => {
    if (chatDemoRunning || state.chatDemoComplete || state.current !== 'chat') return;
    chatDemoRunning = true;
    const firstScriptIndex = Number.isInteger(state.chatDemoStep)
      ? Math.max(0, state.chatDemoStep)
      : Math.max(0, state.messages.length - 1);
    const input = document.querySelector('#neutral-chat-input');
    try {
      for (let index = firstScriptIndex; index < CHAT_DEMO.length; index += 1) {
        const message = CHAT_DEMO[index];
        await wait(message.role === 'assistant' ? 1300 : 1500);
        if (message.role === 'search') {
          await appendSearchExperience(message);
          state.chatDemoStep = index + 1;
          saveSession();
          continue;
        }
        if (message.role === 'user' && input) {
          input.value = '';
          await typeIntoComposer(input, message.content);
          await wait(550);
          input.value = '';
        }
        await appendChatMessage(message);
        if (message.event === 'search-permission') {
          record('search_permission_confirmed', 'danny-simulated-consent');
        }
        state.chatDemoStep = index + 1;
        saveSession();
      }
      await wait(1200);
      state.chatDemoComplete = true;
      state.intakeReady = true;
      state.aiMode = 'scripted-preview';
      record('max_recommendation_shown', 'maxfinancelegal.nl');
      saveSession();
      const log = document.querySelector('#neutral-chat-log');
      log?.insertAdjacentHTML('beforeend', maxRecommendation());
      const maxButton = document.querySelector('#open-max-landing');
      if (maxButton) maxButton.onclick = openMaxLanding;
      document.querySelector('#max-recommendation')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (input) input.placeholder = 'Dit gesprek is afgerond';
    } finally {
      chatDemoRunning = false;
    }
  };

  const isDistressOpening = (message) => /\b(probleem|problemen|schuld|schulden|betalen|zwaar\s*weer|loopt?\s+vast|gaat\s+niet)\b/i.test(message);

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
    const maxButton = document.querySelector('#open-max-landing');
    if (maxButton) maxButton.onclick = openMaxLanding;
    document.querySelector('#open-max-intake')?.addEventListener('click', () => {
      record('max_intake_opened', 'first-intake');
      unlockAndGo('max-intake');
    });
    document.querySelectorAll('[data-intake-answer]').forEach((button) => button.addEventListener('click', () => {
      const question = MAX_INTAKE_QUESTIONS[state.maxIntakeStep || 0];
      if (!question || state.maxIntakeSubmitted) return;
      button.disabled = true;
      state.maxIntakeAnswers = { ...(state.maxIntakeAnswers || {}), [question.id]: button.dataset.intakeAnswer };
      state.maxIntakeStep = (state.maxIntakeStep || 0) + 1;
      record('max_intake_answer_confirmed', question.id);
      saveSession();
      setTimeout(render, 280);
    }));
    document.querySelector('#max-contact-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      if ((state.maxIntakeStep || 0) < MAX_INTAKE_QUESTIONS.length) return;
      const preference = state.maxIntakeAnswers?.contact || '';
      const phone = document.querySelector('#contact-phone')?.value.trim() || '';
      const email = document.querySelector('#contact-email')?.value.trim() || '';
      const consent = Boolean(document.querySelector('#contact-consent')?.checked);
      state.contactPhone = phone;
      state.contactEmail = email;
      state.contactConsent = consent;
      const phoneValid = !contactNeedsPhone(preference) || phone.replace(/\D/g, '').length >= 7;
      const emailValid = !contactNeedsEmail(preference) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!phoneValid) state.contactError = 'Vul een geldig telefoonnummer in.';
      else if (!emailValid) state.contactError = 'Vul een geldig e-mailadres in.';
      else if (!consent) state.contactError = 'Geef eerst toestemming om deze contactgegevens voor opvolging te gebruiken.';
      else state.contactError = '';
      if (state.contactError) {
        saveSession();
        render();
        return;
      }
      state.maxIntakeSubmitted = true;
      state.managementSignalCreatedAt = new Date().toISOString();
      record('contact_details_confirmed', preference);
      record('max_intake_submitted', 'management-review-pending');
      saveSession();
      render();
      scheduleManagementProjection();
    });
    document.querySelector('#open-max-management')?.addEventListener('click', () => {
      if (!state.maxIntakeSubmitted) return;
      if (managementTransitionTimer) window.clearTimeout(managementTransitionTimer);
      managementTransitionTimer = null;
      record('management_projection_requested', 'presenter-transition');
      unlockAndGo('max-management');
    });
    document.querySelector('#open-management-signal')?.addEventListener('click', () => {
      state.managementSignalOpened = true;
      state.managementSignalExpanded = true;
      record('management_signal_opened', 'first-intake');
      saveSession();
      render();
    });
    document.querySelector('#close-management-signal')?.addEventListener('click', () => {
      state.managementSignalExpanded = false;
      saveSession();
      render();
    });
    document.querySelector('#assign-management-signal')?.addEventListener('click', () => {
      if (!state.managementSignalOpened || state.managementSignalAssigned) return;
      state.managementSignalAssigned = true;
      state.managementTransferOpen = true;
      record('management_signal_assigned', 'frank-bedrijfsherstel');
      record('management_transfer_opened', 'agora-handoff');
      renderManagementFromTop();
    });
    document.querySelector('#show-management-transfer')?.addEventListener('click', () => {
      if (!state.managementSignalAssigned) return;
      state.managementTransferOpen = true;
      record('management_transfer_reopened', 'agora-handoff');
      renderManagementFromTop();
    });
    document.querySelector('#close-management-transfer')?.addEventListener('click', () => {
      state.managementTransferOpen = false;
      renderManagementFromTop();
    });
    document.querySelector('#open-frank-signal')?.addEventListener('click', () => {
      if (!state.managementSignalAssigned) return;
      state.managementTransferOpen = false;
      record('frank_signal_projection_opened', 'privacy-safe-notification');
      unlockAndGo('frank-signal');
    });
    document.querySelector('#open-frank-notification')?.addEventListener('click', () => {
      state.frankNotificationOpened = true;
      record('frank_signal_opened', 'secure-expert-context');
      saveSession();
      render();
    });
    document.querySelector('#accept-frank-review')?.addEventListener('click', () => {
      if (!state.frankNotificationOpened || state.frankReviewAccepted) return;
      state.frankReviewAccepted = true;
      record('frank_review_accepted', 'human-assessment-pending');
      unlockAndGo('frank-review');
    });
    document.querySelector('#decline-frank-review')?.addEventListener('click', () => {
      record('frank_review_declined', 'reassign-required');
      state.frankNotificationOpened = false;
      saveSession();
      go('max-management');
    });
    const frankLineageDialog = document.querySelector('#frank-lineage');
    document.querySelector('#show-frank-lineage')?.addEventListener('click', () => frankLineageDialog?.showModal());
    document.querySelector('#show-frank-lineage-mobile')?.addEventListener('click', () => frankLineageDialog?.showModal());
    document.querySelector('#close-frank-lineage')?.addEventListener('click', () => frankLineageDialog?.close());
    document.querySelector('#correct-frank-inference')?.addEventListener('click', () => {
      if (!state.frankReviewAccepted || state.frankCorrectionConfirmed) return;
      state.frankCorrectionConfirmed = true;
      record('frank_ai_inference_corrected', 'human-correction');
      saveSession();
      render();
    });
    document.querySelector('#prepare-personal-contact')?.addEventListener('click', () => {
      if (!state.frankCorrectionConfirmed || state.frankContactPrepared) return;
      state.frankContactPrepared = true;
      record('frank_personal_contact_prepared', 'agreement-pending');
      saveSession();
      render();
    });
    document.querySelector('#confirm-contact-held')?.addEventListener('click', () => {
      if (!state.frankContactPrepared || state.frankContactHeld) return;
      state.frankContactHeld = true;
      record('frank_personal_contact_held', 'expectations-and-costs-discussed');
      saveSession();
      render();
    });
    document.querySelector('#send-intake-invitation')?.addEventListener('click', () => {
      if (!state.frankContactHeld || state.frankIntakeInvited) return;
      state.frankIntakeInvited = true;
      record('frank_full_intake_invited', 'no-agreement-yet');
      saveSession();
      unlockAndGo('danny-uitnodiging');
    });
    document.querySelector('#open-danny-invitation')?.addEventListener('click', () => {
      if (!state.frankIntakeInvited) return;
      unlockAndGo('danny-uitnodiging');
    });
    document.querySelector('#open-danny-invitation-link')?.addEventListener('click', () => {
      if (state.dannyInvitationOpened) return;
      state.dannyInvitationOpened = true;
      record('danny_invitation_opened', 'secure-link-opened-by-owner');
      saveSession();
      render();
    });
    document.querySelector('#accept-danny-intake')?.addEventListener('click', () => {
      if (!state.dannyInvitationOpened || state.dannyIntakeAccepted) return;
      state.dannyIntakeAccepted = true;
      record('danny_full_intake_accepted', 'intake-prepared-only');
      saveSession();
      render();
    });
    const frankReviewLineageDialog = document.querySelector('#frank-review-lineage');
    document.querySelector('#show-frank-review-lineage')?.addEventListener('click', () => frankReviewLineageDialog?.showModal());
    document.querySelector('#close-frank-review-lineage')?.addEventListener('click', () => frankReviewLineageDialog?.close());
    document.querySelector('#open-management-ai')?.addEventListener('click', () => {
      state.managementAiOpen = !state.managementAiOpen;
      saveSession();
      render();
    });
    document.querySelector('#close-management-ai')?.addEventListener('click', () => {
      state.managementAiOpen = false;
      saveSession();
      render();
    });
    const askManagementAi = (prompt) => {
      const question = String(prompt || '').trim().slice(0, 240);
      if (!question) return;
      state.managementAiMessages = [
        ...(state.managementAiMessages || []),
        { role: 'user', content: question },
        { role: 'assistant', content: managementAiAnswer(question) }
      ].slice(-8);
      record('management_ai_question', 'context-only');
      saveSession();
      render();
    };
    document.querySelectorAll('[data-management-ai-prompt]').forEach((button) => button.addEventListener('click', () => askManagementAi(button.dataset.managementAiPrompt)));
    document.querySelector('#management-ai-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      askManagementAi(document.querySelector('#management-ai-input')?.value);
    });
    const lineageDialog = document.querySelector('#intake-lineage');
    document.querySelector('#show-intake-lineage')?.addEventListener('click', () => lineageDialog?.showModal());
    document.querySelector('#close-intake-lineage')?.addEventListener('click', () => lineageDialog?.close());
    const managementLineageDialog = document.querySelector('#management-lineage');
    document.querySelector('#show-management-lineage')?.addEventListener('click', () => managementLineageDialog?.showModal());
    document.querySelector('#close-management-lineage')?.addEventListener('click', () => managementLineageDialog?.close());

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
      if (!isDistressOpening(message)) {
        aiStartInput.setAttribute('aria-invalid', 'true');
        aiStartInput.placeholder = 'Vertel in je eigen woorden wat er met je bedrijf speelt';
        setTimeout(() => aiStartInput.removeAttribute('aria-invalid'), 1400);
        return;
      }
      state.caseStarted = true;
      state.messages = [{ role: 'user', content: message }];
      state.openingSent = true;
      state.chatDemoStep = 0;
      state.chatDemoComplete = false;
      record('case_route_started', 'natuurlijke-ai-ingang');
      saveSession();
      render();
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

    if (state.current === 'chat' && state.caseStarted && !state.chatDemoComplete) {
      setTimeout(runChatDemo, 250);
    }
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
