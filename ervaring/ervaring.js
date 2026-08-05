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
    { id: 'vervolgintake', label: 'Vervolgintake', detail: 'geleid aanleveren' },
    { id: 'ondernemer', label: 'Ondernemer', detail: 'dossier vormen' },
    { id: 'toestemming', label: 'Toestemming', detail: 'gericht delen' },
    { id: 'frank-werkruimte', label: 'Expertwerkruimte', detail: 'dossier behandelen' },
    { id: 'accountantpoort', label: 'Accountantpoort', detail: 'gericht bevragen' },
    { id: 'accountant', label: 'Accountant', detail: 'onderbouwen' },
    { id: 'expert', label: 'Expertpoort', detail: 'menselijk besluit' },
    { id: 'whoa', label: 'Command Room', detail: 'WHOA voorbereiden' },
    { id: 'leiding', label: 'Regie', detail: 'bestuurbaar maken' },
    { id: 'bewijs', label: 'Agora', detail: 'herleiden' },
    { id: 'bouw', label: 'Bouw', detail: 'eigen maken' },
    { id: 'afronding', label: 'Afronding', detail: 'terugkijken' },
    { id: 'agora-uitleg', label: 'Agora KIS', detail: 'de motorkap open' },
    { id: 'geo-uitleg', label: 'Dynamic Knowledge', detail: 'vindbaar blijven' }
  ];


  /* Het eindscherm bouwt zijn terugblik uit het echte logboek. Deze tabel geeft een
     gebeurtenis een leesbare regel en hangt haar aan een van Agora's werkwoorden
     (ordenen, toetsen, vrijgeven, routeren, leren) uit het mastervoorstel. */
  const EVENT_LABELS = {
    case_route_started: ['De ondernemer vertelde het in eigen woorden', 'ordenen'],
    chat_demo_completed: ['De neutrale AI kwam tot de grens van wat hij kon', 'toetsen'],
    management_perspective_explained: ['De wissel naar de binnenkant van Max werd aangekondigd', 'routeren'],
    max_entry_opened: ['Max Finance & Legal werd bereikt', 'routeren'],
    max_intake_answer: ['Een antwoord werd door de ondernemer zelf bevestigd', 'ordenen'],
    max_intake_submitted: ['De eerste intake werd verstuurd', 'vrijgeven'],
    management_projection_auto_opened: ['Interne opvolging werd geopend', 'routeren'],
    management_projection_requested: ['Interne opvolging werd geopend', 'routeren'],
    management_signal_opened: ['Het signaal werd gelezen', 'ordenen'],
    management_signal_assigned: ['Een mens wees het toe aan een expert', 'routeren'],
    frank_notification_opened: ['De expert opende het signaal', 'routeren'],
    frank_review_accepted: ['De expert nam de ordening in behandeling', 'toetsen'],
    frank_correction_confirmed: ['De expert corrigeerde een AI-afleiding', 'toetsen'],
    frank_personal_contact_prepared: ['Persoonlijk contact werd voorbereid', 'routeren'],
    frank_personal_contact_held: ['Het gesprek werd aantoonbaar gehouden', 'toetsen'],
    frank_full_intake_invited: ['De uitnodiging voor de vervolgintake ging uit', 'routeren'],
    danny_invitation_opened: ['De ondernemer opende de uitnodiging zelf', 'vrijgeven'],
    danny_full_intake_accepted: ['De ondernemer stemde in met de vervolgintake', 'vrijgeven'],
    vervolgintake_code_rejected: ['Een onjuiste code werd geweigerd', 'toetsen'],
    vervolgintake_code_accepted: ['De eenmalige autorisatiecode opende de poort', 'vrijgeven'],
    vervolgintake_question_asked: ['De ondernemer vroeg iets tussendoor', 'ordenen'],
    vervolgintake_document_delivered: ['Een stuk werd aangeleverd met bron en moment', 'ordenen'],
    vervolgintake_accountant_consent_given: ['Toestemming voor de accountant, met naam en omvang', 'vrijgeven'],
    vervolgintake_dossier_ready: ['Het dossier stond klaar voor de expert', 'routeren'],
    vervolgintake_expert_validated: ['De expert valideerde de aanlevering zelf', 'toetsen'],
    frank_gaps_named: ['Het systeem benoemde wat ontbrak', 'toetsen'],
    frank_status_report_made: ['De stand werd opgemaakt, zonder oordeel', 'ordenen'],
    frank_accountant_link_prepared: ['De poort voor de accountant werd klaargezet', 'routeren'],
    frank_proposal_drafted: ['Een voorstel werd opgemaakt op wat er lag', 'ordenen'],
    accountant_portal_opened: ['De accountant kwam binnen op grond van toestemming', 'vrijgeven'],
    accountant_interest_disclosed: ['De accountant verklaarde zijn eigen belang', 'toetsen'],
    accountant_document_supplied: ['De accountant leverde een stuk aan', 'ordenen'],
    accountant_supplement_submitted: ['De aanvulling werd vastgelegd, met voorbehoud', 'toetsen']
  };

  const AGORA_VERBS = [
    ['ordenen', 'Ordenen', 'Uitspraken, stukken en antwoorden kregen een plek, een bron en een status.'],
    ['toetsen', 'Toetsen', 'Herkomst en status werden gecontroleerd, en een mens kon een AI-afleiding corrigeren.'],
    ['vrijgeven', 'Vrijgeven', 'Niets bewoog zonder dat de eigenaar van de informatie het zelf vrijgaf.'],
    ['routeren', 'Routeren', 'Kennis ging naar de plek waar iemand er iets mee kon, en niet verder.'],
    ['leren', 'Leren', 'Niet in deze demonstratie te zien. Leren gebeurt over dossiers heen, niet binnen één doorloop.']
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

  /* Franks identiteit staat op één plek. Canon: 20voor12/CLAUDE.md sectie 3.
     Voluit in identiteitsblokken en stempels, voornaam in gesprekstekst. */
  const EXPERT_NAME = 'Frank van Meenen';
  const EXPERT_FIRST = 'Frank';
  const EXPERT_ROLE = 'Herstructureringsspecialist';
  const EXPERT_DOMAIN = 'herstructurering';
  const EXPERT_SPECIALISME = 'Post-academische opleiding: Herstructureringsdeskundige';
  const EXPERT_BIO = 'Gespecialiseerd in herstructurering van bedrijven in financieel zwaar weer. Frank analyseert snel wat er speelt, begeleidt onderhandelingen met schuldeisers en stuurt op een werkbare uitkomst — voor bedrijven die willen doorgaan én voor trajecten waarbij gecontroleerde afwikkeling de beste weg is.';

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
    managementIntroSeen: false,
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
    poortUnlocked: false,
    poortDelivered: [],
    poortLog: [],
    poortCodeError: '',
    poortAccountantConsent: false,
    poortConsentAt: null,
    poortValidatedAt: null,
    frankLog: [],
    frankLinkPreparedAt: null,
    frankActions: [],
    frankError: '',
    raOpened: false,
    raDisclosed: false,
    raDelivered: [],
    raSubmittedAt: null,
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
      chat: 'bezoeker', max: 'ondernemer', 'max-intake': 'ondernemer', 'max-management': 'management', 'frank-signal': 'expert', 'frank-review': 'expert', 'danny-uitnodiging': 'ondernemer', vervolgintake: 'ondernemer', 'frank-werkruimte': 'expert', accountantpoort: 'accountant', ondernemer: 'ondernemer', toestemming: 'ondernemer',
      accountant: 'accountant', expert: 'expert', whoa: 'trajectteam',
      leiding: 'leiding', bewijs: 'governance', bouw: 'opdrachtgever', afronding: 'terugblik', 'agora-uitleg': 'uitleg', 'geo-uitleg': 'uitleg'
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

  /* De perspectiefwissel. Tot hier zat Danny in de stoel van de ondernemer; wat volgt is de
     binnenkant van Max, en die ziet een ondernemer nooit. Dat mag niet onaangekondigd
     gebeuren — vandaar dit tussenscherm, in de vormtaal van het overdrachtsscherm. */
  const renderManagementIntro = () => `<section class="management-transfer-screen" aria-labelledby="management-intro-title">
    <header class="management-header">
      <div class="management-brand"><strong>MAX<span>OS</span></strong><small>Achter de schermen</small></div>
      <div class="management-user"><span>Je kijkt mee als</span><strong>Directie</strong><i aria-hidden="true">DR</i></div>
    </header>
    <main class="management-transfer-main">
      <span>Perspectiefwissel</span>
      <h1 id="management-intro-title">Je wisselt nu van stoel.</h1>
      <p>Tot hier zat je in de stoel van de ondernemer. Wat je nu gaat zien, ziet die ondernemer nooit: de binnenkant van Max, waar zijn eerste intake zojuist is binnengekomen.</p>
      <div class="management-transfer-steps" role="list" aria-label="Wat er nu gebeurt">
        <article><i aria-hidden="true">1</i><div><strong>AI heeft het signaal geordend</strong><small>Urgentie en onderzoeksrichting staan klaar, met herkomst per gegeven.</small></div></article>
        <article><i aria-hidden="true">2</i><div><strong>Een mens bepaalt de opvolging</strong><small>Management beslist of en door wie deze intake wordt opgepakt.</small></div></article>
        <article><i aria-hidden="true">3</i><div><strong>De ondernemer merkt alleen het resultaat</strong><small>Eén rustige vervolgstap — niet de machinerie erachter.</small></div></article>
      </div>
      <div class="management-transfer-boundary"><span>Waarom je dit ziet</span><p>Dit is het deel dat vertrouwen moet verdienen: geen automatische route, maar een mens die beslist op geordende informatie.</p></div>
      <div class="management-transfer-actions"><button type="button" class="primary" id="open-management-inside">Kijk mee als management <span aria-hidden="true">→</span></button></div>
    </main>
  </section>`;

  const renderMaxManagement = () => {
    if (!state.managementIntroSeen) return renderManagementIntro();
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
                <div><span>Voorgestelde expertise</span><strong>${escapeHtml(EXPERT_NAME)} · ${escapeHtml(EXPERT_DOMAIN)}</strong><small>${assigned ? 'Door directie toegewezen' : 'AI-voorstel, nog niet toegewezen'}</small></div>
                ${assigned ? `<button type="button" id="show-management-transfer">Bekijk overdracht <span aria-hidden="true">→</span></button>` : `<button type="button" id="assign-management-signal">Zet door naar ${escapeHtml(EXPERT_FIRST)} <span aria-hidden="true">→</span></button>`}
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
        <h1 id="danny-invitation-title">Wat de vervolgintake van je vraagt.</h1>
        <p>Frank heeft je gesproken. Hieronder staat wat er nodig is en waarvoor je straks toestemming geeft. Je beslist zelf of je begint.</p>
        <article class="danny-invitation-agreed">
          <span>Afgesproken in het gesprek</span>
          <ul><li>Wat een hersteltraject van je vraagt aan tijd en medewerking.</li><li>Wat het kost en hoe Frank werkt.</li><li>Dat je zonder verplichting kunt stoppen zolang er niets is afgesproken.</li></ul>
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
            <ul><li>Max mag deze stukken gebruiken om je situatie te beoordelen.</li><li>Frank mag je accountant om aanvullende cijfers vragen.</li><li>Max legt vast welke stappen zijn gezet en waarop ze rusten.</li></ul>
            <small>Je geeft ze per onderdeel, en je kunt ze weer intrekken.</small>
          </article>
        </div>
        ${accepted ? `<section class="danny-invitation-decision" aria-label="Je beslissing"><span>Vastgelegd</span><div role="status"><h2>De vervolgintake staat voor je klaar.</h2><p>Frank ziet dat je wilt beginnen. Er is nog geen overeenkomst, nog geen toegang tot je stukken en nog geen keuze over een vervolgroute.</p></div><button type="button" id="open-vervolgintake">Open de vervolgintake <span aria-hidden="true">→</span></button><small>Je hebt daarvoor de autorisatiecode nodig die bij deze uitnodiging hoort. Hij staat voor je klaar.</small></section>`
          : `<section class="danny-invitation-decision" aria-label="Je beslissing"><span>Je beslissing</span><h2>Begin je aan de vervolgintake?</h2><p>Er is nog geen overeenkomst en er wordt nog niets van je opgevraagd. Instemmen betekent alleen dat de intake voor je wordt klaargezet.</p><button type="button" id="accept-danny-intake">Ja, zet de intake voor mij klaar <span aria-hidden="true">→</span></button><small>Er wordt in deze demonstratie niets verzonden of opgeslagen.</small></section>`}
        <p class="danny-invitation-boundary">Max legt vast wat is gevraagd en wat je antwoordt. Beoordelen en beslissen blijft mensenwerk.</p>
      </div>` : `<div class="danny-invitation-lock">
        <span>Beveiligde uitnodiging · ${escapeHtml(managementSignalTime())}</span>
        <h1 id="danny-invitation-title">${escapeHtml(EXPERT_FIRST)} heeft je een uitnodiging gestuurd.</h1>
        <p>Je hebt elkaar net gesproken. In deze uitnodiging staat wat de vervolgintake van je vraagt.</p>
        <article class="danny-invitation-sender">
          <span>Afzender</span>
          <strong>${escapeHtml(EXPERT_NAME)} · ${escapeHtml(EXPERT_ROLE)}</strong>
          <small>Max Finance &amp; Legal</small>
        </article>
        <button type="button" id="open-danny-invitation-link">Open de beveiligde uitnodiging</button>
        <p class="danny-invitation-boundary">De inhoud blijft afgeschermd totdat je hem zelf opent.</p>
      </div>`}
    </section>`;
  };

  const POORT_CODE = 'MAX-7F2K';

  const poortValidationStamp = () => {
    const value = state.poortValidatedAt ? new Date(state.poortValidatedAt) : null;
    if (!value || Number.isNaN(value.getTime())) return '';
    return `${value.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })} · ${value.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const accountantNameFrom = () => ({
    name: pack.case.accountant.identity.name,
    office: pack.case.accountant.identity.office,
    source: 'Opgegeven door de ondernemer bij het geven van de toestemming',
    at: state.poortConsentAt
  });

  const POORT_STEPS = [
    {
      id: 'cijfers',
      document: 'Actuele cijfers en liquiditeitsbeeld',
      order: 'Dit eerst, want zonder actueel beeld heeft de rest geen ijkpunt.',
      ask: 'Begin met de meest recente cijfers en je liquiditeitsbeeld.',
      file: 'liquiditeit-juli.xlsx',
      help: 'De laatste cijfers die je boekhouding kan uitdraaien, plus wat er de komende weken in en uit gaat. Actueel is hier belangrijker dan compleet.'
    },
    {
      id: 'schulden',
      document: 'Volledig schuldenoverzicht',
      order: 'Nu er een actueel beeld is, is er iets om de schulden tegen af te zetten.',
      ask: 'Lever daarna het volledige schuldenoverzicht aan.',
      file: 'schuldenoverzicht.pdf',
      help: 'Alles waar een schuld tegenover staat, ook de kleine en ook die met een lopende regeling. Volledig is hier belangrijker dan netjes.'
    },
    {
      id: 'crediteuren',
      document: 'Crediteuren, zekerheden en acute termijnen',
      order: 'Deze als laatste, want ze hangen aan de schulden uit de vorige stap.',
      ask: 'Tot slot de crediteuren, de gestelde zekerheden en de termijnen die het eerst aflopen.',
      file: 'crediteuren-termijnen.pdf',
      help: 'Wie wacht op geld, wat daarvoor als zekerheid is gegeven, en welke datum het eerst valt. Die laatste bepaalt de orde van werken.'
    }
  ];

  const poortCurrentStep = () => POORT_STEPS.find((step) => !(state.poortDelivered || []).includes(step.id));

  const poortAnswerFor = (question = '') => {
    const step = poortCurrentStep();
    if (!step) {
      return state.poortAccountantConsent
        ? 'Het dossier staat klaar voor Frank. Verder dan dit gaat deze aanlevering niet.'
        : 'De stukken zijn binnen. Er staat nog één keuze open: mag Frank je accountant om aanvullende cijfers vragen?';
    }
    if (/\b(niet|snap|begrijp|hoezo|waarom|onduidelijk|help|hoe)\b/i.test(question) || question.includes('?')) {
      return `${step.help} Ik wacht hier, je hoeft niet vooruit te lopen.`;
    }
    return `Ik houd het bij deze stap: ${step.ask.toLowerCase()} Zeg het als iets niet duidelijk is.`;
  };

  const poortLogLine = (role, text) => {
    state.poortLog = [...(state.poortLog || []), { role, text }].slice(-40);
  };

  const renderVervolgintakePoort = () => {
    const unlocked = state.poortUnlocked;
    const delivered = state.poortDelivered || [];
    const step = poortCurrentStep();
    const consentGiven = state.poortAccountantConsent;
    const done = !step && consentGiven;
    const validated = Boolean(state.poortValidatedAt);
    return `<section class="max-poort" aria-labelledby="max-poort-title">
      <header class="max-poort-header">
        <div class="max-wordmark" aria-label="Max Finance &amp; Legal, Bedrijfsherstel"><strong>Max Finance <span>&amp;</span> Legal</strong><small>Vervolgintake</small></div>
        <span class="max-poort-status"><i aria-hidden="true"></i>${unlocked ? (validated ? `Gevalideerd door ${escapeHtml(EXPERT_FIRST)}` : done ? 'Dossier aangeleverd' : `Stap ${Math.min(delivered.length + 1, POORT_STEPS.length + 1)} van ${POORT_STEPS.length + 1}`) : 'Poort gesloten'}</span>
      </header>
      <div class="max-poort-body${unlocked ? ' is-open' : ''}">
        <section class="max-poort-stream" aria-label="Geleide aanlevering">
          <div class="max-poort-log" role="log" aria-live="polite">
            <article class="max-poort-welcome">
              <span>Ontvangst</span>
              <h1 id="max-poort-title">Welkom bij de vervolgintake, Danny.</h1>
              <p>Je bent nu al een eind gekomen. Om het vervolgtraject correct en zonder veel tijdverlies in te zetten, neem ik alles stap voor stap met je door.</p>
            </article>
            <article class="max-poort-line ai">
              <span>Max AI</span>
              <p>Eerste stap: voer de autorisatiecode in die je samen met de uitnodiging hebt gekregen.${unlocked ? '' : ' Hij staat al voor je klaar in het veld hieronder.'}</p>
            </article>
            ${(state.poortLog || []).map((line) => `<article class="max-poort-line ${line.role === 'danny' ? 'danny' : 'ai'}"><span>${line.role === 'danny' ? 'Danny' : 'Max AI'}</span><p>${escapeHtml(line.text)}</p></article>`).join('')}
            ${unlocked && step ? `<article class="max-poort-step" aria-label="Huidige stap">
              <span>Stap ${delivered.length + 1} · ${escapeHtml(step.document)}</span>
              <h2>${escapeHtml(step.ask)}</h2>
              <p class="max-poort-order">${escapeHtml(step.order)}</p>
              <button type="button" id="poort-upload">Kies bestand <span aria-hidden="true">↑</span></button>
              <small>Gesimuleerde aanlevering. Er wordt geen bestand gelezen, verzonden of opgeslagen.</small>
            </article>` : ''}
            ${unlocked && !step && !consentGiven ? `<article class="max-poort-step consent" aria-label="Openstaande toestemming">
              <span>Laatste stap · toestemming</span>
              <h2>Mag Frank ${escapeHtml(pack.case.accountant.identity.name)} om aanvullende cijfers vragen?</h2>
              <p class="max-poort-order">Dat is je accountant bij ${escapeHtml(pack.case.accountant.identity.office)}. Hij levert de cijfers, maar trekt het hersteltraject niet. Met deze toestemming kan Frank hem gericht bevragen zonder dat jij ertussen hoeft te zitten.</p>
              <button type="button" id="poort-accountant-consent">Ja, Frank mag mijn accountant benaderen <span aria-hidden="true">→</span></button>
              <small>Alleen voor aanvullende cijfers bij deze aanlevering. Je kunt dit weer intrekken.</small>
            </article>` : ''}
            ${done && !validated ? `<article class="max-poort-done" role="status">
              <span>Aangeleverd</span>
              <h2>Het dossier staat klaar voor ${escapeHtml(EXPERT_FIRST)}.</h2>
              <p>Alles wat je hebt aangeleverd staat vast met moment en herkomst. ${escapeHtml(EXPERT_FIRST)} kijkt het na; zolang dat niet is gebeurd, is er niets gevalideerd.</p>
              <p class="max-poort-waiting" aria-live="polite"><i aria-hidden="true"></i>In beoordeling bij ${escapeHtml(EXPERT_FIRST)}</p>
            </article>` : ''}
            ${validated ? `<article class="max-poort-done is-validated" role="status">
              <span>Gevalideerd</span>
              <h2>${escapeHtml(EXPERT_NAME)} heeft alles gevalideerd wat je hebt aangeleverd.</h2>
              <p>Wat hij heeft gezien en op welk moment, staat vast. De volgende stap ligt bij je accountant, die de cijfers aanvult. Er is nog geen overeenkomst, geen oordeel en geen keuze over een vervolgroute.</p>
            </article>` : ''}
          </div>
          <form class="max-poort-entry" id="poort-form" autocomplete="off">
            <label for="poort-input">${unlocked ? 'Iets aangeven of vragen' : 'Autorisatiecode'}</label>
            <div class="max-poort-entry-row">
              <input id="poort-input" type="text" maxlength="120" spellcheck="false"
                ${unlocked ? 'placeholder="Bijvoorbeeld: ik begrijp dit ff niet"' : `value="${escapeHtml(POORT_CODE)}" class="is-prefilled"`}
                aria-describedby="poort-hint">
              <button type="submit">${unlocked ? 'Stuur' : 'Open de poort'}</button>
            </div>
            <p id="poort-hint" class="${state.poortCodeError ? 'is-error' : ''}" ${state.poortCodeError ? 'role="alert"' : ''}>${escapeHtml(state.poortCodeError || (unlocked ? 'Je kunt hier altijd iets tussendoor zeggen. De reeks blijft staan waar hij staat.' : 'De code staat vervaagd klaar. Eenmalig invoeren opent de geleide aanlevering.'))}</p>
          </form>
          ${demoNav()}
        </section>
        ${unlocked ? `<aside class="max-poort-documents" aria-label="Aangeleverde stukken">
          <span>Aanlevering</span>
          <h2>${delivered.length} van ${POORT_STEPS.length}</h2>
          <ul>${POORT_STEPS.map((item, index) => {
            const isDone = delivered.includes(item.id);
            const isCurrent = !isDone && step && step.id === item.id;
            const isValidated = isDone && validated;
            return `<li class="${isValidated ? 'done validated' : isDone ? 'done' : isCurrent ? 'current' : ''}"><i aria-hidden="true">${isDone ? '✓' : index + 1}</i><span>${escapeHtml(item.document)}</span><small>${isDone ? escapeHtml(item.file) : isCurrent ? 'Nu aan de orde' : 'Volgt'}</small>${isValidated ? '<b><i aria-hidden="true">✓</i>Gevalideerd</b>' : ''}</li>`;
          }).join('')}</ul>
          ${validated ? `<div class="max-poort-validation" role="status">
            <span>Gevalideerd door</span>
            <strong>${escapeHtml(EXPERT_NAME)} · ${escapeHtml(EXPERT_DOMAIN)}</strong>
            <small>${escapeHtml(poortValidationStamp())}</small>
          </div>` : ''}
          <div class="max-poort-consent-state ${consentGiven ? 'done' : ''}">
            <span>Toestemming accountant</span>
            <strong>${consentGiven ? 'Gegeven' : 'Nog open'}</strong>
            <small>${consentGiven ? 'Frank mag gericht aanvullende cijfers opvragen.' : 'Komt na de drie stukken aan de orde.'}</small>
          </div>
          <p class="max-poort-agora">Agora legt per stap vast wat is aangeleverd en waarop het rust. AI ordent, mensen beoordelen.</p>
        </aside>` : ''}
      </div>
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

  const frankLogLine = (role, text) => {
    state.frankLog = [...(state.frankLog || []), { role, text }].slice(-40);
  };

  /* Eén reeks, één kleur. Het verschil tussen afgeleid en prognose zit in de streep en
     in het label, niet in een tweede tint — anders lezen twee zekerheidsstaten als twee
     grootheden. Tabel eronder, zodat geen waarde alleen in de grafiek bestaat. */
  const renderLiquidityChart = () => {
    const data = pack.case.liquidity;
    const weeks = data.weeks;
    const left = 36; const right = 294; const top = 14; const bottom = 118;
    const min = -40; const max = 95;
    const x = (i) => left + (i / (weeks.length - 1)) * (right - left);
    const y = (v) => bottom - ((v - min) / (max - min)) * (bottom - top);
    const firstForecast = weeks.findIndex((w) => w.status === 'onzeker');
    const solid = weeks.slice(0, firstForecast).map((w, i) => `${x(i)},${y(w.value)}`).join(' ');
    const dashed = weeks.slice(firstForecast - 1).map((w, i) => `${x(i + firstForecast - 1)},${y(w.value)}`).join(' ');
    const crossing = weeks.findIndex((w) => w.value < 0);
    const nowIndex = firstForecast - 1;
    const ticks = [80, 40, 0, -40];
    return `<figure class="frank-chart">
      <figcaption>${escapeHtml(data.label)} <span>${escapeHtml(data.unit)}</span></figcaption>
      <svg viewBox="0 0 300 150" role="img" aria-label="Verloop van de beschikbare betaalruimte over dertien weken. De eerste zes weken zijn afgeleid uit aangeleverde stukken; daarna volgt een onzekere prognose die door nul zakt." preserveAspectRatio="xMidYMid meet">
        ${ticks.map((t) => `<line x1="${left}" y1="${y(t)}" x2="${right}" y2="${y(t)}" stroke="${t === 0 ? 'rgba(245,243,238,.28)' : 'rgba(245,243,238,.08)'}" stroke-width="1"></line>
          <text x="${left - 6}" y="${y(t) + 3}" text-anchor="end" font-size="11" fill="rgba(245,243,238,.62)">${t}</text>`).join('')}
        <line x1="${x(nowIndex)}" y1="${top}" x2="${x(nowIndex)}" y2="${bottom}" stroke="rgba(245,243,238,.2)" stroke-width="1"></line>
        <polyline points="${solid}" fill="none" stroke="#0fa8cb" stroke-width="2" stroke-linejoin="round"></polyline>
        <polyline points="${dashed}" fill="none" stroke="#0fa8cb" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"></polyline>
        ${weeks.map((w, i) => `<circle cx="${x(i)}" cy="${y(w.value)}" r="${i === nowIndex || i === crossing ? 4 : 2.5}" fill="${i >= firstForecast ? '#09192a' : '#0fa8cb'}" stroke="#0fa8cb" stroke-width="1.5"></circle>
          <circle cx="${x(i)}" cy="${y(w.value)}" r="12" fill="transparent"><title>${escapeHtml(w.label)}: ${w.value} (${escapeHtml(w.status)})</title></circle>`).join('')}
        <text x="${x(nowIndex) - 7}" y="${y(weeks[nowIndex].value) - 9}" text-anchor="end" font-size="11" fill="rgba(245,243,238,.86)">nu ${weeks[nowIndex].value}</text>
        <text x="${x(crossing) - 7}" y="${y(weeks[crossing].value) + 15}" text-anchor="end" font-size="11" fill="rgba(245,243,238,.86)">ruimte op</text>
        <text x="${left}" y="136" font-size="11" fill="rgba(245,243,238,.62)">afgeleid</text>
        <text x="${right}" y="136" text-anchor="end" font-size="11" fill="rgba(245,243,238,.62)">prognose · onzeker</text>
      </svg>
      <p class="frank-chart-note">${escapeHtml(data.note)}</p>
      <details class="frank-chart-table">
        <summary>Bekijk als tabel</summary>
        <table><thead><tr><th scope="col">Week</th><th scope="col">Ruimte</th><th scope="col">Status</th></tr></thead>
        <tbody>${weeks.map((w) => `<tr><th scope="row">${escapeHtml(w.label)}</th><td>${w.value}</td><td>${escapeHtml(w.status)}</td></tr>`).join('')}</tbody></table>
      </details>
    </figure>`;
  };

  const frankAnswerFor = (question = '') => {
    if (/ontbreek|mis|nodig|waarder/i.test(question)) {
      return `${pack.case.fields.ontbrekend.value} — status ${pack.case.fields.ontbrekend.status}. Zolang de waarderingsonderbouwing er niet is, kan geen vergelijking van waarden worden gemaakt.`;
    }
    if (/accountant|dulk|belang|vordering/i.test(question)) {
      return state.raSubmittedAt
        ? `${pack.case.accountant.identity.name} heeft aangevuld en zijn eigen positie erbij verklaard: ${pack.case.accountant.position.ownClaim.toLowerCase()}. Dat staat bij zijn cijfers.`
        : `${pack.case.accountant.identity.name} van ${pack.case.accountant.identity.office} is vrijgegeven door de ondernemer, maar heeft nog niet aangevuld.`;
    }
    if (/valid|gecontroleerd|status|stand/i.test(question)) {
      return state.poortValidatedAt
        ? `De drie stukken zijn door jou gevalideerd op ${raStamp(state.poortValidatedAt)}. De betaalruimte blijft een afleiding en dus onzeker.`
        : 'Er is nog niets gevalideerd. Zolang dat zo is, staat er in dit dossier niets vast.';
    }
    if (/route|whoa|besluit|kies/i.test(question)) {
      return 'Ik orden wat er ligt en benoem wat ontbreekt. De route kiezen is niet aan mij.';
    }
    return 'Ik houd het bij wat er ligt. Vraag me wat ontbreekt, wat de stand is, of wat de accountant heeft aangeleverd.';
  };

  const FRANK_ACTIONS = [
    { id: 'validate', label: 'Valideren', button: 'frank-validate' },
    { id: 'report', label: 'Rapportage', button: 'frank-report' },
    { id: 'gaps', label: 'Wat mis ik nog', button: 'frank-gaps' },
    { id: 'propose', label: 'Voorstel', button: 'frank-propose' }
  ];

  const renderFrankWerkruimte = () => {
    commandInput.placeholder = 'Deze werkruimte werkt met de knoppen';
    commandHelp.textContent = 'Frank bepaalt zelf wat hij opmaakt. De AI ordent; het besluit blijft bij hem.';
    const ra = pack.case.accountant;
    const named = accountantNameFrom();
    const validated = Boolean(state.poortValidatedAt);
    const linkSent = Boolean(state.frankLinkPreparedAt);
    const supplemented = Boolean(state.raSubmittedAt);
    const delivered = state.poortDelivered || [];
    return `<section class="frank-werk" aria-labelledby="frank-werk-title">
      <header class="frank-werk-header">
        <div class="max-wordmark" aria-label="Max Finance &amp; Legal"><strong>Max Finance <span>&amp;</span> Legal</strong><small>Expertwerkruimte</small></div>
        <span class="frank-werk-status"><i aria-hidden="true"></i>${supplemented ? 'Dossier aangevuld' : validated ? 'Aanlevering gevalideerd' : 'Aanlevering ontvangen'}</span>
      </header>
      <div class="frank-werk-body">
        <section class="frank-werk-chat" aria-label="Werkgesprek">
          <div class="frank-werk-log" role="log" aria-live="polite">
            <article class="frank-werk-open">
              <span>Dossier</span>
              <h1 id="frank-werk-title">${escapeHtml(pack.case.company)}</h1>
              <p>De ondernemer heeft aangeleverd. Je kunt valideren, de stand opmaken, benoemen wat ontbreekt, en de accountant gericht bevragen. Niets hiervan is een besluit.</p>
            </article>
            ${(state.frankLog || []).map((line) => `<article class="frank-werk-line ${line.role === 'frank' ? 'frank' : 'ai'}"><span>${line.role === 'frank' ? escapeHtml(EXPERT_FIRST) : 'Max AI'}</span><p>${escapeHtml(line.text)}</p></article>`).join('')}
          </div>
          <form class="frank-werk-entry" id="frank-form" autocomplete="off">
            <label for="frank-input">Iets vragen, of een commando</label>
            <div class="frank-werk-entry-row">
              <input id="frank-input" type="text" maxlength="140" spellcheck="false"
                placeholder="Bijvoorbeeld: wat ontbreekt er nog? — of /accountant" aria-describedby="frank-hint">
              <button type="submit">Stuur</button>
            </div>
            <p id="frank-hint">${escapeHtml(state.frankError || 'Vragen worden geordend, niet beoordeeld. Commando’s met een schuine streep brengen je naar een ander scherm.')}</p>
          </form>
          <div class="frank-werk-actions">
            <span class="frank-werk-actions-label">Beschikbare bewerkingen</span>
            <div class="frank-werk-buttons">
              <button type="button" id="frank-validate" ${validated ? 'disabled' : ''}>${validated ? 'Gevalideerd' : 'Valideren'}</button>
              <button type="button" id="frank-report">Rapportage</button>
              <button type="button" id="frank-gaps">Wat mis ik nog</button>
              <button type="button" id="frank-propose" ${supplemented ? '' : 'disabled'}>Voorstel</button>
            </div>
            <p class="frank-werk-gate">${supplemented
              ? 'Alle bewerkingen staan open; de accountant heeft aangevuld.'
              : 'Het voorstel blijft dicht: de accountant heeft nog niet aangevuld, en zonder zijn cijfers rust een voorstel op niets.'}</p>
            ${supplemented ? `<div class="frank-werk-next">
              <button type="button" data-command="/afronding">Afronding van de demonstratie <span aria-hidden="true">→</span></button>
              <small>Sluit de demonstratie af met een terugblik op wat er is vastgelegd.</small>
            </div>` : ''}
          </div>
          ${demoNav()}
        </section>
        <aside class="frank-werk-side" aria-label="Aanlevering en betrokkenen">
          <section class="frank-werk-panel">
            <span>Aanlevering van de ondernemer</span>
            <ul class="frank-werk-ticks">${POORT_STEPS.map((item) => {
              const done = delivered.includes(item.id);
              return `<li class="${done ? (validated ? 'done validated' : 'done') : ''}"><i aria-hidden="true">${done ? '✓' : '·'}</i><span>${escapeHtml(item.document)}</span><small>${done ? escapeHtml(item.file) : 'Nog niet aangeleverd'}</small>${done && validated ? '<b>Gevalideerd</b>' : ''}</li>`;
            }).join('')}</ul>
            ${validated ? `<p class="frank-werk-stamp">Gevalideerd op ${escapeHtml(raStamp(state.poortValidatedAt))} door ${escapeHtml(EXPERT_NAME)}.</p>` : '<p class="frank-werk-stamp is-open">Nog niets gevalideerd. Zolang dat zo is, staat er in het dossier niets vast.</p>'}
          </section>
          <section class="frank-werk-panel">
            <span>Accountant van de onderneming</span>
            <strong>${escapeHtml(named.name)}</strong>
            <p class="frank-werk-office">${escapeHtml(named.office)}</p>
            <p class="frank-werk-source">${escapeHtml(named.source)}${named.at ? ` op ${escapeHtml(raStamp(named.at))}` : ''}.</p>
            ${linkSent
              ? `<p class="frank-werk-link" role="status"><span>Link klaargezet</span>${escapeHtml(raStamp(state.frankLinkPreparedAt))} · code ${escapeHtml(POORT_CODE)}<br>In deze demonstratie is niets verzonden.</p>`
              : `<button type="button" id="frank-send-link">Link accountantportal klaarzetten <span aria-hidden="true">→</span></button>
                 <small>Zet de beveiligde poort voor hem klaar. Er wordt niets werkelijk verstuurd.</small>`}
          </section>
          ${supplemented ? `<section class="frank-werk-panel">
            <span>Aanvulling van de accountant</span>
            <ul class="frank-werk-supplied">${(state.raDelivered || []).map((name) => `<li>${escapeHtml(name)}</li>`).join('')}</ul>
            <dl class="frank-werk-figures">${ra.figures.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join('')}</dl>
            <p class="frank-werk-interest">${escapeHtml(ra.position.disclosure)}</p>
          </section>
          <section class="frank-werk-panel">
            <span>Financiële impressie</span>
            ${renderLiquidityChart()}
          </section>
          <section class="frank-werk-panel frank-werk-toets">
            <span>Toetsing op de route</span>
            <strong>Toetsbaar als WHOA-voorbereiding</strong>
            <p class="frank-werk-toets-caveat">Onder voorbehoud van waardering, klassenindeling en juridische toetsing. Dit is een toetsing, geen routebesluit — dat legt ${escapeHtml(EXPERT_FIRST)} apart vast.</p>
            <ul class="frank-werk-agora">
              <li><i aria-hidden="true">◎</i><span>Rust op drie stukken van de ondernemer</span><small>Gevalideerd door ${escapeHtml(EXPERT_NAME)} op ${escapeHtml(raStamp(state.poortValidatedAt))}</small></li>
              <li><i aria-hidden="true">◎</i><span>Rust op de aanvulling van de accountant</span><small>Aangeleverd op ${escapeHtml(raStamp(state.raSubmittedAt))}, met zijn eigen vordering erbij verklaard</small></li>
              <li><i aria-hidden="true">◎</i><span>Vrijwillig voorstel is niet gedragen</span><small>Bron: ${escapeHtml(pack.case.fields.blokkade.source)} · status ${escapeHtml(pack.case.fields.blokkade.status)}</small></li>
              <li class="is-missing"><i aria-hidden="true">◎</i><span>Waardevergelijking kan niet worden gemaakt</span><small>${escapeHtml(pack.case.fields.ontbrekend.value)} — status ${escapeHtml(pack.case.fields.ontbrekend.status)}</small></li>
            </ul>
            <p class="frank-werk-agora-note">Agora houdt per regel vast waar hij op rust en wanneer dat is vastgesteld. Wat ontbreekt blijft als ontbrekend staan; het verdwijnt niet uit het beeld omdat de conclusie er beter van wordt.</p>
          </section>` : ''}
        </aside>
      </div>
    </section>`;
  };

  /* Schermen zonder eigen invoerveld moeten wel een uitweg hebben, anders loopt de
     presentator vast. Deze balk zegt ook wat hij is: een demonstratiebediening. */
  const demoBar = (steps) => `<div class="poc-demobar" role="navigation" aria-label="Demonstratiebediening">
    <span>Gecontroleerde demonstratie</span>
    <div>${steps.map((step) => step.reset
      ? `<button type="button" id="demobar-reset">${escapeHtml(step.label)}</button>`
      : `<button type="button" data-command="${escapeHtml(step.command)}">${escapeHtml(step.label)}</button>`).join('')}</div>
  </div>`;

  /* Deze schermen plaatsen de bediening zelf, op een plek die past in hun eigen indeling:
     de accountantpoort en de afronding onderaan de pagina, de vervolgintake en de
     werkruimte onder hun invoerveld. Een commando intypen is op een telefoon geen
     zichtbare uitweg, dus ook die twee krijgen de balk. */
  const SCREENS_WITH_OWN_EXIT = ['vervolgintake', 'frank-werkruimte', 'accountantpoort', 'afronding', 'agora-uitleg', 'geo-uitleg'];

  const demoNav = () => {
    const order = ROUTE.filter((item) => state.unlocked.includes(item.id));
    const here = order.findIndex((item) => item.id === state.current);
    const previous = here > 0 ? order[here - 1] : null;
    const next = here >= 0 && here < order.length - 1 ? order[here + 1] : null;
    if (!previous && !next) return '';
    return `<div class="poc-demobar is-global" role="navigation" aria-label="Demonstratiebediening">
      <span>Gecontroleerde demonstratie</span>
      <div>
        ${previous ? `<button type="button" data-goto="${escapeHtml(previous.id)}">← ${escapeHtml(previous.label)}</button>` : ''}
        ${next ? `<button type="button" data-goto="${escapeHtml(next.id)}">${escapeHtml(next.label)} →</button>` : ''}
      </div>
    </div>`;
  };

  const renderAfronding = () => {
    commandInput.placeholder = 'Einde van de demonstratie';
    commandHelp.textContent = 'Deze terugblik is opgebouwd uit het logboek van deze doorloop.';
    const logged = (state.events || []).filter((event) => EVENT_LABELS[event.action]);
    const byVerb = (verb) => logged.filter((event) => EVENT_LABELS[event.action][1] === verb);
    const clock = (value) => {
      const moment = new Date(value);
      return Number.isNaN(moment.getTime()) ? '—' : moment.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    };
    return `<section class="slot" aria-labelledby="slot-title">
      <main class="slot-body">
        <p class="slot-eyebrow">Einde van de demonstratie</p>
        <h1 id="slot-title">Dank, Danny.</h1>
        <p class="slot-lead">Je hebt net in de stoel van de ondernemer gezeten. Dat was de bedoeling: jij weet als weinig anderen wat er in die stoel gebeurt. En je hebt nu ervaren wat het scheelt als de ondernemer niets van de techniek hoeft te begrijpen om toch veilig de volgende stap te zetten.</p>

        <section class="slot-block" aria-label="Wat deze doorloop heeft vastgelegd">
          <h2>Wat deze doorloop heeft vastgelegd</h2>
          <p class="slot-note">Onderstaande regels komen uit het logboek van jouw doorloop, niet uit een geschreven verhaal. Wat je niet hebt gedaan, staat er dus ook niet.</p>
          ${logged.length
            ? `<details class="slot-log-open">
                 <summary><strong>${logged.length} vastgelegde stappen</strong><span>casusversie ${escapeHtml(pack.meta.version)} · regel voor regel bekijken</span></summary>
                 <ol class="slot-log">${logged.map((event) => `<li><span class="slot-log-time">${escapeHtml(clock(event.at))}</span><span class="slot-log-text">${escapeHtml(EVENT_LABELS[event.action][0])}</span><span class="slot-log-verb">${escapeHtml(EVENT_LABELS[event.action][1])}</span></li>`).join('')}</ol>
               </details>`
            : '<p class="slot-empty">Er is in deze sessie nog niets vastgelegd.</p>'}
        </section>

        <section class="slot-block" aria-label="Wat Agora hierin deed">
          <h2>Wat Agora hierin deed</h2>
          <p class="slot-note">Agora doet vijf dingen. Vier ervan heb je net zien werken; per werkwoord staat hoe vaak het in jouw doorloop voorkwam.</p>
          <dl class="slot-verbs">${AGORA_VERBS.map(([id, label, text]) => {
            const count = id === 'leren' ? null : byVerb(id).length;
            return `<div class="${count === 0 ? 'is-unused' : ''}${id === 'leren' ? ' is-absent' : ''}">
              <dt>${escapeHtml(label)}${count === null ? '' : ` <span>${count}×</span>`}</dt>
              <dd>${escapeHtml(text)}</dd>
            </div>`;
          }).join('')}</dl>
          <p class="slot-boundary"><strong>En wat Agora niet deed:</strong> geen enkel besluit. De route is niet gekozen, de waarde is niet vergeleken en er is niets afgesproken. Dat bleef waar het hoort — bij de expert.</p>
        </section>

        <section class="slot-block" aria-label="Twee dingen die je zelf hebt gemerkt">
          <h2>Twee dingen die je zelf hebt gemerkt</h2>
          <ul class="slot-felt">
            <li><strong>Niemand vroeg je iets twee keer.</strong> Wat je bij Max had gezegd, stond er nog toen Frank je sprak, en het stond er nog in de vervolgintake.</li>
            <li><strong>Bij elk cijfer kon je aanwijzen waar het vandaan kwam.</strong> Ook bij de cijfers waar dat ongemakkelijk was — de accountant met een openstaande vordering, de betaalruimte die een afleiding is en geen meting.</li>
          </ul>
        </section>

        <section class="slot-block slot-outro" aria-label="Buiten de rol">
          <h2>Buiten de rol</h2>
          <p>Kompas Metaaltechniek bestaat niet, Gerard Dulk bestaat niet, en de bedragen zijn verzonnen. Wat er wel al werkt is de processor, oftewel de mechaniek die je net hebt gebruikt: één plek waar een uitspraak zijn bron, zijn status en zijn moment bij zich houdt, en poorten die pas opengaan als iemand ze zelf opent.</p>
          <p>Wat dat voor Max betekent, staat in het mastervoorstel. Wat het voor jouw eigen dossiers zou betekenen, weet jij beter dan ik.</p>
          <p class="slot-sign">Rob de Rooij · R.O.B. Concepting<br><span>Agora — samenwerkingsverband met Frank van Meenen</span></p>
        </section>

        <section class="slot-block slot-verder" aria-label="Verder lezen">
          <h2>Eén ding is nog niet gezegd</h2>
          <p>Alles wat je hier hebt aangeleverd kreeg een bron, een status en een moment. Dat is niet alleen netjes voor het dossier — het is de voorwaarde om straks door een AI-assistent geciteerd te worden in plaats van overgeslagen. <strong>Herleidbaarheid en vindbaarheid zijn hetzelfde werk.</strong> Wie zijn kennis niet kan aanwijzen, wordt niet genoemd.</p>
          <div class="slot-verder-knoppen">
            <button type="button" data-goto="agora-uitleg">Agora KIS — wat is het en wat betekent het voor Max? <span aria-hidden="true">→</span></button>
            <button type="button" data-goto="geo-uitleg">Dynamic Knowledge — de SEO/GEO van de toekomst <span aria-hidden="true">→</span></button>
          </div>
        </section>
        ${demoBar([
          { command: '/werkruimte', label: '← Expertwerkruimte' },
          { reset: true, label: 'Opnieuw beginnen' }
        ])}
      </main>
    </section>`;
  };

  /* Twee uitlegschermen na de afronding. De motorkap gaat open: wat het is en wat het
     doet, in gewone taal. De uitvoering blijft eronder — geen bouwstenen, geen schema's,
     geen leveranciers. Elk scherm eindigt met wat het bewust niet prijsgeeft. */
  const renderAgoraUitleg = () => {
    commandInput.placeholder = 'Uitleg';
    commandHelp.textContent = 'De motorkap staat open. De uitvoering blijft eronder.';
    return `<section class="uitleg" aria-labelledby="uitleg-agora-title">
      <main class="uitleg-body">
        <p class="uitleg-eyebrow">Agora KIS · de motorkap open</p>
        <h1 id="uitleg-agora-title">Wat je net hebt gebruikt, en waarom het zo is gebouwd.</h1>
        <p class="uitleg-lead">Agora is geen website en geen chatbot. Het is de laag tússen drie dingen: waar kennis vandaan komt, wie erover mag oordelen, en waar het gebruikt wordt. In het voorstel staat het als de processor onder Max-OS. Hieronder staat wat dat in de praktijk betekent.</p>

        <section class="uitleg-blok" aria-label="Twee wegen">
          <p class="uitleg-nr">01</p>
          <h2>Er lopen twee wegen, en die raken elkaar nooit</h2>
          <p>Over de ene weg komen vragen binnen en gaan antwoorden eruit — dat is de weg die je net hebt gelopen. Over de andere weg wordt de kennis zelf onderhouden: vastgesteld, herzien, van een datum voorzien. Wie een vraag stelt, kan de kennis niet veranderen. Wie de kennis onderhoudt, beantwoordt geen vragen.</p>
          <p class="uitleg-waarom"><strong>Waarom dat uitmaakt:</strong> een systeem waarin die twee door elkaar lopen, gaat op een gegeven moment zijn eigen antwoorden bevestigen. Dan lijkt het zeker en is het niets.</p>
        </section>

        <section class="uitleg-blok" aria-label="Poorten">
          <p class="uitleg-nr">02</p>
          <h2>Iedereen komt binnen door zijn eigen poort</h2>
          <p>Een ondernemer, zijn adviseur en een ander systeem leveren niet hetzelfde aan, en mogen niet hetzelfde zien. Daarom heeft elke ingang eigen regels. Je bent er net twee doorgegaan.</p>
          <ul class="uitleg-poorten">
            <li><span>De ondernemer</span><small>Vertelt het in eigen woorden, hoeft geen vaktaal te kennen. Dat was de vervolgintake.</small></li>
            <li><span>Zijn adviseur</span><small>Mag alleen met toestemming, en moet zeggen waar de stukken vandaan komen. Dat was de accountantpoort.</small></li>
            <li><span>Een ander systeem</span><small>Mag aanleveren, nooit meebeslissen. Een externe AI blijft bezoeker.</small></li>
          </ul>
        </section>

        <section class="uitleg-blok" aria-label="Vaste orde">
          <p class="uitleg-nr">03</p>
          <h2>Elke vraag gaat door dezelfde vaste orde</h2>
          <p>Altijd dezelfde stappen, altijd in dezelfde volgorde. Wordt er één overgeslagen, dan is het antwoord ongeldig — ook als het klopt. Drie van die stappen heb je zien werken:</p>
          <ul class="uitleg-stappen">
            <li><span>Wat wordt hier eigenlijk gevraagd?</span><small>Is het onduidelijk, dan vraagt het systeem terug in plaats van te gokken.</small></li>
            <li><span>Wie vraagt het, en wat mag die zien?</span><small>Wat niet is vrijgegeven, blijft buiten. Ook voor de accountant.</small></li>
            <li><span>Is alles wat verplicht is meegenomen?</span><small>Wat ontbreekt weegt even zwaar als wat er staat. Daarom bleef de waarderingsonderbouwing als ontbrekend staan.</small></li>
          </ul>
          <p class="uitleg-waarom"><strong>Wat hier niet staat:</strong> de volledige orde en de precieze criteria. Dat is de motor, niet de motorkap.</p>
        </section>

        <section class="uitleg-blok" aria-label="Wat het voor Max betekent">
          <p class="uitleg-nr">04</p>
          <h2>Wat dit voor Max oplevert</h2>
          <dl class="uitleg-waarde">
            <div><dt>Voor de expert</dt><dd>Je komt voorbereid aan tafel in plaats van uitvragend. Wat de klant al zei, staat er nog.</dd></div>
            <div><dt>Voor de klant en de verwijzer</dt><dd>Eén keer vertellen. Rust, en zicht op wat er met zijn stukken gebeurt.</dd></div>
            <div><dt>Voor de leiding</dt><dd>Zicht op wat is vrijgegeven, wat is beoordeeld en waar het op rust.</dd></div>
            <div><dt>Voor Max als onderneming</dt><dd>Methodiek die niet in één hoofd zit. Minder afhankelijk van sleutelfiguren, en dus overdraagbaar.</dd></div>
          </dl>
        </section>

        <p class="uitleg-grens"><strong>En de grens die overal geldt:</strong> Agora ordent, toetst, geeft vrij, routeert en leert — maar het <strong>beslist niets</strong>. Het oordeel blijft bij de expert. Dat is geen bescheidenheid, dat is de constructie.</p>

        <div class="uitleg-verder">
          <button type="button" class="is-voor" data-goto="geo-uitleg">Wat dit met vindbaarheid te maken heeft <span aria-hidden="true">→</span></button>
          <button type="button" data-goto="afronding"><span aria-hidden="true">←</span> Terug naar het eindscherm</button>
        </div>
      </main>
    </section>`;
  };

  const renderGeoUitleg = () => {
    commandInput.placeholder = 'Uitleg';
    commandHelp.textContent = 'Over wat er buiten de deur komt te staan, en wat nooit.';
    return `<section class="uitleg" aria-labelledby="uitleg-geo-title">
      <main class="uitleg-body">
        <p class="uitleg-eyebrow">Dynamic Knowledge · de SEO/GEO van de toekomst</p>
        <h1 id="uitleg-geo-title">Straks vraagt niemand het aan Google, maar aan een assistent.</h1>
        <p class="uitleg-lead">Die assistent leest wat hij online vindt en vertelt het door. Staat jouw kennis er niet netjes, dan vertelt hij die van iemand anders — of hij verzint iets in jouw naam. <strong>Wat je hiervoor nodig hebt, heb je net gebouwd:</strong> elk stuk dat je aanleverde kreeg een bron, een status en een moment. Dit gaat over wat dat straks waard is.</p>

        <section class="uitleg-blok" aria-label="Herkomst">
          <p class="uitleg-nr">01</p>
          <h2>Zonder herkomst word je niet geciteerd</h2>
          <p>Een assistent die jouw kennis doorvertelt, wil erbij zetten waar hij het vond. Kun je dat niet aanwijzen, dan laat hij je weg. Daarom krijgt elk stuk bij binnenkomst een bron en een moment — niet later, want dan is het gokken.</p>
          <p class="uitleg-waarom"><strong>En daarom achteraf niet meer lukt:</strong> wie pas bij publicatie gaat uitzoeken waar iets vandaan kwam, reconstrueert. Dat is geen bron, dat is een gok met een datum eraan.</p>
        </section>

        <section class="uitleg-blok" aria-label="Eén deur">
          <p class="uitleg-nr">02</p>
          <h2>Er is één deur naar buiten</h2>
          <p>Alles wat de buitenwereld bereikt, gaat door één deur. Geen achterdeur, geen uitzondering voor even. Wat niet door die deur komt, bestaat voor een zoekmachine niet — en dat is precies de bedoeling.</p>
          <div class="uitleg-deur">
            <div class="uitleg-deur-in">
              <span>Mag erdoor</span>
              <p>Kennis die af is, met bron en eigenaar, en met een datum tot wanneer hij geldt. Alleen om te lezen.</p>
            </div>
            <div class="uitleg-deur-uit">
              <span>Mag er nooit door</span>
              <p>Alles van een klant, alles wat bij één zaak hoort, en alles wat nog niet af is. Dat is het echte risico: per ongeluk een dossier online.</p>
            </div>
          </div>
        </section>

        <section class="uitleg-blok" aria-label="De etalage">
          <p class="uitleg-nr">03</p>
          <h2>Wat er buiten de deur komt te staan</h2>
          <p>Dat is de etalage. Die beslist niets — hij zorgt dat een machine je begrijpt.</p>
          <ul class="uitleg-etalage">
            <li><span>Labels die een machine leest</span><small>Bij elk stuk staat wát het is: een begrip, een regel, een voorbeeld. Als een prijskaartje dat een kassa kan lezen.</small></li>
            <li><span>Antwoorden die af zijn</span><small>Korte stukken die een vraag helemaal afmaken. Geschreven om geciteerd te worden, niet om hoog te eindigen in een lijstje.</small></li>
            <li><span>Eén vast adres per onderwerp</span><small>Zodat een machine steeds naar dezelfde plek wijst, en jij ziet wanneer er iets is veranderd.</small></li>
          </ul>
        </section>

        <section class="uitleg-blok" aria-label="Meten">
          <p class="uitleg-nr">04</p>
          <h2>En dan kijk je of het werkt</h2>
          <p>Zonder dit stuk is het een belofte zonder meetlat. Je wil weten wie je kennis doorvertelt, of ze je erbij noemen, en wat er misgaat.</p>
          <ul class="uitleg-etalage">
            <li><span>Wie citeert wat</span><small>Welk stuk wordt doorverteld, door welke machine, met of zonder jouw naam.</small></li>
            <li><span>Wat het oplevert</span><small>Per stuk kennis, niet per pagina. Zo weet je welk antwoord echt werk doet.</small></li>
            <li><span>Verkeerd doorverteld is een melding</span><small>Er gaat een signaal af. Het systeem past niets vanzelf aan; een mens besluit.</small></li>
          </ul>
          <p class="uitleg-waarom"><strong>Waarom stil bijwerken averechts werkt:</strong> een pagina waar de tekst verandert terwijl het adres hetzelfde blijft, leert een machine wantrouwen. Zichtbaar bijwerken levert vertrouwen op; onzichtbaar bijwerken kost het.</p>
        </section>

        <p class="uitleg-grens"><strong>In één zin:</strong> alleen afgeronde kennis gaat naar buiten, door één deur, met een datum en een bron erbij — en er wordt bijgehouden wie het doorvertelt. Het systeem <strong>beslist niets</strong> over wat er verandert.</p>

        <div class="uitleg-verder">
          <button type="button" class="is-voor" data-goto="afronding"><span aria-hidden="true">←</span> Terug naar het eindscherm</button>
          <button type="button" data-goto="agora-uitleg"><span aria-hidden="true">←</span> Agora KIS</button>
        </div>
      </main>
    </section>`;
  };

  const RA_SUPPLIABLE = ['Kolommenbalans', 'Dertienweeks liquiditeitsbeeld', 'Volledige crediteurenlijst'];

  const raStamp = (value) => {
    const moment = value ? new Date(value) : null;
    if (!moment || Number.isNaN(moment.getTime())) return 'zojuist';
    return `${moment.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })} · ${moment.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderAccountantPoort = () => {
    commandInput.placeholder = 'Deze poort werkt zonder commando';
    commandHelp.textContent = 'De accountant komt via zijn eigen beveiligde link binnen, niet via het scherm van de ondernemer.';
    const ra = pack.case.accountant;
    const id = ra.identity;
    const position = ra.position;
    const disclosed = state.raDisclosed;
    const supplied = state.raDelivered || [];
    const submitted = Boolean(state.raSubmittedAt);
    const outstanding = RA_SUPPLIABLE.filter((name) => !supplied.includes(name));
    return `<section class="ra-poort" aria-labelledby="ra-poort-title">
      <header class="ra-poort-topbar">
        <strong>Max Finance &amp; Legal</strong>
        <span>Aanvullende cijfers bij een lopend dossier</span>
      </header>
      <main class="ra-poort-body">
        <p class="ra-poort-eyebrow">Continuïteitsdossier · verzoek aan de accountant</p>
        <h1 id="ra-poort-title">Wat er van u wordt gevraagd</h1>
        <p class="ra-poort-lead">Uw cliënt heeft stukken aangeleverd en toestemming gegeven dat u om aanvullende cijfers wordt gevraagd. Hieronder staat waarop dat verzoek rust, wat u wel en niet te zien krijgt, en wat er van u wordt verwacht.</p>

        <div class="ra-poort-grid">
          <div class="ra-poort-col">
            <div class="ra-poort-id">
              <strong>${escapeHtml(EXPERT_NAME)}</strong>
              <span>${escapeHtml(EXPERT_ROLE)}</span>
              <em>${escapeHtml(EXPERT_SPECIALISME)}</em>
            </div>
            <p class="ra-poort-bio">${escapeHtml(EXPERT_BIO)}</p>
            <dl class="ra-poort-meta">
              <div><dt>Wat dit niet is</dt><dd>Geen opdracht aan u en geen beoordeling van uw eerdere werk. Geen verzoek om een verklaring of een oordeel over de continuïteitsveronderstelling.</dd></div>
              <div><dt>Datapositie</dt><dd>U ziet uitsluitend wat uw cliënt zelf heeft vrijgegeven. Wat hij niet vrijgaf, blijft ook voor u gesloten.</dd></div>
              <div><dt>Tijdsbesteding</dt><dd>Wat u al bij de hand hebt. Er wordt niets nieuws van u gevraagd.</dd></div>
              <div><dt>Waarop dit rust</dt><dd>Toestemming van uw cliënt, vastgelegd op ${escapeHtml(raStamp(state.poortConsentAt))}.</dd></div>
            </dl>
          </div>
          <div class="ra-poort-col ra-poort-you">
            <h2>Uw gegevens</h2>
            <dl class="ra-poort-you-list">
              <div><dt>Naam</dt><dd>${escapeHtml(id.name)}</dd></div>
              <div><dt>Kantoor</dt><dd>${escapeHtml(id.office)}, ${escapeHtml(id.city)}</dd></div>
              <div><dt>Functie</dt><dd>${escapeHtml(id.role)}</dd></div>
              <div><dt>Relatie</dt><dd>${escapeHtml(id.relation)}</dd></div>
            </dl>
            <p class="ra-poort-you-note">Deze gegevens komen uit de uitnodiging. In deze demonstratie wordt niets verzonden of opgeslagen.</p>
          </div>
        </div>

        <section class="ra-poort-basis" aria-label="Grondslag van het verzoek">
          <h2>Wat uw cliënt heeft vrijgegeven</h2>
          <ul class="ra-poort-released">${POORT_STEPS.map((item) => `<li><span>${escapeHtml(item.document)}</span><small>${escapeHtml(item.file)}</small></li>`).join('')}</ul>
          <p class="ra-poort-withheld">Wat u niet krijgt: het gespreksverslag met uw cliënt, zijn eerdere chatgeschiedenis, en de interne beoordeling. Die vallen buiten wat hij heeft vrijgegeven.</p>
        </section>

        <section class="ra-poort-disclosure${disclosed ? ' is-done' : ''}" aria-label="Uw positie in dit dossier">
          <h2>Uw positie in dit dossier</h2>
          <dl class="ra-poort-position">
            <div><dt>${escapeHtml(position.label)}</dt><dd>${escapeHtml(position.ownClaim)}. ${escapeHtml(position.oldest)}.</dd></div>
            <div><dt>Eerder gesignaleerd</dt><dd>${escapeHtml(position.raisedBefore)}.</dd></div>
          </dl>
          ${disclosed
            ? `<p class="ra-poort-disclosed" role="status"><span>Vastgelegd</span>${escapeHtml(position.disclosure)}</p>`
            : `<p class="ra-poort-disclosure-ask">${escapeHtml(position.disclosure)}</p>
               <button type="button" id="ra-disclose">Vastleggen en doorgaan naar de aanlevering</button>
               <small>Zolang dit niet is vastgelegd, kunt u niets aanleveren.</small>`}
        </section>

        ${disclosed ? `<section class="ra-poort-supply" aria-label="Aanlevering">
          <h2>Aanvullende stukken</h2>
          <table class="ra-poort-table">
            <thead><tr><th scope="col">Stuk</th><th scope="col">Status in het dossier</th><th scope="col">Aanlevering</th></tr></thead>
            <tbody>${ra.documents.map((doc) => {
              const done = supplied.includes(doc.name);
              const canSupply = RA_SUPPLIABLE.includes(doc.name);
              return `<tr class="${done ? 'is-supplied' : canSupply ? '' : 'is-unavailable'}">
                <th scope="row">${escapeHtml(doc.name)}</th>
                <td><span class="ra-status ra-status-${escapeHtml(doc.status.replace(/[^a-z-]/gi, ''))}">${escapeHtml(doc.status)}</span></td>
                <td>${done
                  ? `<span class="ra-supplied">Aangeleverd · ${escapeHtml(raStamp(state.raSubmittedAt || new Date().toISOString()))}</span>`
                  : canSupply
                    ? `<button type="button" class="ra-supply-btn" data-ra-supply="${escapeHtml(doc.name)}">Aanleveren</button>`
                    : `<span class="ra-unavailable">Heb ik niet</span>`}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
          <p class="ra-poort-cannot">Een onderbouwing van reorganisatie- en liquidatiewaarde heb ik niet. Die vraagt een waardering die ik niet heb uitgevoerd en die buiten mijn opdracht valt.</p>

          <h2>Wat ik direct bij de hand heb</h2>
          <dl class="ra-poort-figures">${ra.figures.map((row) => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`).join('')}</dl>

          ${outstanding.length === 0 && !submitted
            ? `<div class="ra-poort-submit">
                <h2>Voorbehoud</h2>
                <p>${escapeHtml(ra.observation)}</p>
                <button type="button" id="ra-submit">Aanlevering afronden</button>
                <small>Er wordt in deze demonstratie niets verzonden of opgeslagen.</small>
              </div>`
            : ''}
          ${submitted
            ? `<div class="ra-poort-done" role="status">
                <span>Afgerond · ${escapeHtml(raStamp(state.raSubmittedAt))}</span>
                <h2>Uw aanvulling staat vast.</h2>
                <p>${escapeHtml(ra.observation)}</p>
                <p>Wat u hebt aangeleverd is vastgelegd met bron en moment, samen met uw eigen positie. Het besluit over het vervolg ligt niet bij u en is nog niet genomen.</p>
                <p class="ra-poort-feedback">U hebt aangegeven over de uitkomst geïnformeerd te willen worden. De grond daarvoor is uw eigen openstaande vordering, en die staat er zo bij.</p>
              </div>`
            : ''}
        </section>` : ''}
        ${demoBar([{ command: '/werkruimte', label: '← Expertwerkruimte' }])}
      </main>
    </section>`;
  };

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
    vervolgintake: renderVervolgintakePoort,
    ondernemer: renderEntrepreneur,
    toestemming: renderConsent,
    'frank-werkruimte': renderFrankWerkruimte,
    accountantpoort: renderAccountantPoort,
    accountant: renderAccountant,
    expert: renderExpert,
    whoa: renderWhoA,
    leiding: renderLeadership,
    bewijs: renderProof,
    bouw: renderBuild,
    afronding: renderAfronding,
    'agora-uitleg': renderAgoraUitleg,
    'geo-uitleg': renderGeoUitleg
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
    const isPoort = state.current === 'vervolgintake';
    app.classList.toggle('max-poort-mode', isPoort);
    const isFrankWerk = state.current === 'frank-werkruimte';
    app.classList.toggle('frank-werk-mode', isFrankWerk);
    const isRaPoort = state.current === 'accountantpoort';
    app.classList.toggle('ra-poort-mode', isRaPoort);
    const isSlot = state.current === 'afronding';
    app.classList.toggle('slot-mode', isSlot);
    const isUitleg = state.current === 'agora-uitleg' || state.current === 'geo-uitleg';
    app.classList.toggle('uitleg-mode', isUitleg);
    if (isRaPoort && !state.raOpened) {
      state.raOpened = true;
      record('accountant_portal_opened', 'consent-based-access');
      saveSession();
    }
    document.title = isAiChat ? 'AI Chat' : isMaxEntry ? 'Max Finance & Legal — vertrouwelijke verkenning' : isMaxIntake ? 'Max Finance & Legal — eerste intake' : isMaxManagement ? 'Max-OS — Management AI' : isFrankSignal ? 'Max-OS — Frank ontvangt een signaal' : isFrankReview ? 'Max-OS — Expertbeoordeling' : isDannyInvitation ? 'Max Finance & Legal — uitnodiging voor de intake' : isPoort ? 'Max Finance & Legal — vervolgintake' : isFrankWerk ? 'Max-OS — expertwerkruimte' : isRaPoort ? 'Max Finance & Legal — aanvullende cijfers' : isSlot ? 'Einde van de demonstratie' : state.current === 'agora-uitleg' ? 'Agora KIS — wat het is en wat het doet' : state.current === 'geo-uitleg' ? 'Dynamic Knowledge — vindbaar blijven' : 'R.O.B. → Max-OS — gecontroleerde demonstratie';
    renderRoute();
    renderEvidence();
    setChrome();
    screen.innerHTML = (renderers[state.current] || renderChat)();
    /* Schermen met een eigen invoerveld of eigen balk regelen hun uitweg zelf; de rest
       krijgt hier een bediening, zodat de presentator nergens vastloopt. */
    if (!SCREENS_WITH_OWN_EXIT.includes(state.current)) {
      screen.insertAdjacentHTML('beforeend', demoNav());
    }
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
    if (command === '/afronding') {
      if (!state.raSubmittedAt) return fail('De afronding opent zodra de accountant heeft aangevuld.');
      unlockAndGo('afronding');
      return;
    }
    if (command === '/werkruimte') {
      if (!state.poortAccountantConsent) return fail('De werkruimte opent zodra de ondernemer de accountant heeft vrijgegeven.');
      unlockAndGo('frank-werkruimte');
      return;
    }
    if (command === '/accountant') {
      if (!state.frankLinkPreparedAt) return fail('De accountant heeft nog geen toegang; Frank moet de poort eerst klaarzetten.');
      unlockAndGo('accountantpoort');
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
    document.querySelector('#open-management-inside')?.addEventListener('click', () => {
      state.managementIntroSeen = true;
      record('management_perspective_explained', 'ondernemer-naar-management');
      saveSession();
      render();
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
      record('management_signal_assigned', 'frank-van-meenen-continuiteit');
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
    document.querySelector('#open-vervolgintake')?.addEventListener('click', () => {
      if (!state.dannyIntakeAccepted) return;
      unlockAndGo('vervolgintake');
    });
    document.querySelector('#poort-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const field = document.querySelector('#poort-input');
      const value = String(field?.value || '').trim();
      if (!value) return;
      if (!state.poortUnlocked) {
        if (value.toUpperCase() !== POORT_CODE) {
          state.poortCodeError = 'Die code herken ik niet. Neem hem over zoals hij in de uitnodiging staat, dan gaan we verder.';
          record('vervolgintake_code_rejected', 'retry-allowed');
          saveSession();
          render();
          return;
        }
        state.poortUnlocked = true;
        state.poortCodeError = '';
        poortLogLine('danny', value.toUpperCase());
        poortLogLine('ai', 'Dank je. De poort is open en je hoeft de code niet opnieuw in te voeren. Ik vraag de stukken in de orde waarin ze elkaar ondersteunen.');
        record('vervolgintake_code_accepted', 'single-use-authorisation');
        saveSession();
        render();
        return;
      }
      if (value.startsWith('/')) {
        const from = state.current;
        handleCommand(value);
        if (state.current === from) {
          poortLogLine('danny', value.slice(0, 120));
          poortLogLine('ai', 'Dat commando werkt hier niet, of de voorwaarde ervoor is nog niet vervuld. De aanlevering blijft staan waar hij staat.');
          saveSession();
          render();
        }
        return;
      }
      poortLogLine('danny', value.slice(0, 120));
      poortLogLine('ai', poortAnswerFor(value));
      record('vervolgintake_question_asked', 'progress-unchanged');
      saveSession();
      render();
    });
    document.querySelector('#poort-input')?.addEventListener('input', (event) => {
      event.target.classList.remove('is-prefilled');
    });
    document.querySelector('#demobar-reset')?.addEventListener('click', () => {
      resetButton?.click();
    });
    document.querySelectorAll('[data-goto]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.getAttribute('data-goto');
        if (target) go(target);
      });
    });
    document.querySelector('#frank-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const field = document.querySelector('#frank-input');
      const value = String(field?.value || '').trim();
      if (!value) return;
      state.frankError = '';
      if (value.startsWith('/')) {
        const from = state.current;
        handleCommand(value);
        if (state.current === from) {
          state.frankError = 'Dat commando werkt hier niet, of de voorwaarde ervoor is nog niet vervuld.';
          saveSession();
          render();
        }
        return;
      }
      frankLogLine('frank', value.slice(0, 140));
      frankLogLine('ai', frankAnswerFor(value));
      record('frank_question_asked', 'ordering-not-judging');
      saveSession();
      render();
    });
    const frankLog = document.querySelector('.frank-werk-log');
    if (frankLog) frankLog.scrollTop = frankLog.scrollHeight;
    document.querySelector('#frank-validate')?.addEventListener('click', () => {
      if (state.poortValidatedAt) return;
      if ((state.poortDelivered || []).length < POORT_STEPS.length) return;
      state.poortValidatedAt = new Date().toISOString();
      frankLogLine('frank', 'Ik heb de drie stukken doorgenomen.');
      frankLogLine('ai', `Vastgelegd: gevalideerd door ${EXPERT_NAME} op ${raStamp(state.poortValidatedAt)}. De ondernemer ziet dit terug in zijn eigen scherm.`);
      poortLogLine('ai', `${EXPERT_FIRST} heeft de aanlevering doorgenomen en alle drie de stukken gevalideerd. Wat hij heeft gezien en wanneer, staat vast.`);
      record('vervolgintake_expert_validated', 'expert-action-in-workspace');
      saveSession();
      render();
    });
    document.querySelector('#frank-report')?.addEventListener('click', () => {
      const validated = state.poortValidatedAt ? 'gevalideerd' : 'nog niet gevalideerd';
      const supplement = state.raSubmittedAt ? 'De accountant heeft aangevuld, onder vermelding van zijn eigen vordering.' : 'De accountant heeft nog niet aangevuld.';
      frankLogLine('frank', 'Maak de stand op.');
      frankLogLine('ai', `Drie stukken van de ondernemer, ${validated}. ${supplement} De betaalruimte is een systeemafleiding en blijft onzeker. Dit is een stand, geen oordeel.`);
      record('frank_status_report_made', 'status-not-conclusion');
      saveSession();
      render();
    });
    document.querySelector('#frank-gaps')?.addEventListener('click', () => {
      frankLogLine('frank', 'Wat mis ik nog?');
      frankLogLine('ai', `${pack.case.fields.ontbrekend.value} — dat is wat er niet is. Zolang de waarderingsonderbouwing ontbreekt, kan geen enkele vergelijking van waarden worden gemaakt.`);
      record('frank_gaps_named', 'missing-made-explicit');
      saveSession();
      render();
    });
    document.querySelector('#frank-propose')?.addEventListener('click', () => {
      if (!state.raSubmittedAt) return;
      frankLogLine('frank', 'Maak een voorstel op.');
      frankLogLine('ai', 'Opgemaakt op wat er ligt: de drie stukken van de ondernemer, de aanvulling van de accountant, en zijn verklaarde belang erbij. Wat het niet doet: een waardevergelijking maken en een route kiezen. Daarvoor ontbreekt de onderbouwing, en die keuze is niet van een systeem.');
      record('frank_proposal_drafted', 'rests-on-supplied-only');
      saveSession();
      render();
    });
    document.querySelector('#frank-send-link')?.addEventListener('click', () => {
      if (state.frankLinkPreparedAt) return;
      if (!state.poortAccountantConsent) return;
      state.frankLinkPreparedAt = new Date().toISOString();
      if (!state.unlocked.includes('accountantpoort')) state.unlocked.push('accountantpoort');
      frankLogLine('frank', `Zet de poort klaar voor ${accountantNameFrom().name}.`);
      frankLogLine('ai', 'Klaargezet met eenmalige code. Hij ziet alleen wat de ondernemer heeft vrijgegeven. In deze demonstratie wordt niets verzonden.');
      record('frank_accountant_link_prepared', 'consent-scoped-access');
      saveSession();
      render();
    });
    document.querySelector('#ra-disclose')?.addEventListener('click', () => {
      if (state.raDisclosed) return;
      state.raDisclosed = true;
      record('accountant_interest_disclosed', 'own-claim-declared');
      saveSession();
      render();
    });
    document.querySelectorAll('[data-ra-supply]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!state.raDisclosed) return;
        const name = button.getAttribute('data-ra-supply');
        if (!name || !RA_SUPPLIABLE.includes(name) || (state.raDelivered || []).includes(name)) return;
        state.raDelivered = [...(state.raDelivered || []), name];
        record('accountant_document_supplied', name);
        saveSession();
        render();
      });
    });
    document.querySelector('#ra-submit')?.addEventListener('click', () => {
      if (!state.raDisclosed || state.raSubmittedAt) return;
      if (RA_SUPPLIABLE.some((name) => !(state.raDelivered || []).includes(name))) return;
      state.raSubmittedAt = new Date().toISOString();
      record('accountant_supplement_submitted', 'no-route-decision');
      saveSession();
      render();
    });
    const poortLog = document.querySelector('.max-poort-log');
    if (poortLog && state.poortUnlocked) poortLog.scrollTop = poortLog.scrollHeight;
    document.querySelector('#poort-upload')?.addEventListener('click', () => {
      if (!state.poortUnlocked) return;
      const step = poortCurrentStep();
      if (!step) return;
      state.poortDelivered = [...(state.poortDelivered || []), step.id];
      poortLogLine('danny', `${step.file} aangeleverd`);
      const next = poortCurrentStep();
      poortLogLine('ai', next
        ? 'Ontvangen en vastgelegd. Ik zet de volgende stap klaar.'
        : 'Ontvangen. De drie stukken zijn binnen; daarmee is het beeld compleet genoeg om er een expert naar te laten kijken.');
      record('vervolgintake_document_delivered', step.id);
      saveSession();
      render();
    });
    document.querySelector('#poort-accountant-consent')?.addEventListener('click', () => {
      if (!state.poortUnlocked || poortCurrentStep() || state.poortAccountantConsent) return;
      state.poortAccountantConsent = true;
      state.poortConsentAt = new Date().toISOString();
      if (!state.unlocked.includes('frank-werkruimte')) state.unlocked.push('frank-werkruimte');
      poortLogLine('danny', `Ja, Frank mag ${pack.case.accountant.identity.name} benaderen.`);
      poortLogLine('ai', 'Vastgelegd, met wie het betreft en waarvoor. Frank bepaalt zelf wanneer hij hem bevraagt; jij ziet terug wat er is opgevraagd.');
      record('vervolgintake_accountant_consent_given', 'accountant-gate-opened');
      record('vervolgintake_dossier_ready', 'awaiting-accountant');
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
