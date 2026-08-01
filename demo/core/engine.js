const app = document.querySelector('#demo-app');
const source = document.body.dataset;

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const getPath = (object, path) => String(path || '')
  .split('.')
  .filter(Boolean)
  .reduce((value, key) => value?.[key], object);

const loadJson = async (url) => {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error(`Configuratie niet beschikbaar: ${url}`);
  return response.json();
};

const setTokens = (tokens = {}) => {
  for (const [name, value] of Object.entries(tokens)) {
    if (/^#[0-9a-f]{6}$/i.test(value)) {
      document.documentElement.style.setProperty(`--brand-${name}`, value);
    }
  }
};

const listHtml = (values) => {
  if (!Array.isArray(values)) return `<p>${escapeHtml(values ?? 'Niet beschikbaar')}</p>`;
  return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
};

const valueHtml = (value) => Array.isArray(value) ? listHtml(value) : `<p>${escapeHtml(value ?? 'Niet beschikbaar')}</p>`;

const statusClass = (status = '') => {
  const normalized = String(status).toLowerCase();
  if (normalized.includes('klopt') || normalized.includes('aanwezig')) return 'ok';
  if (normalized.includes('wacht') || normalized.includes('ontbreekt')) return 'wait';
  return '';
};

const renderField = (field, data, className = 'field-card') => `
  <div class="${className}">
    <div class="field-label">${escapeHtml(field.label)}</div>
    <div class="field-value">${valueHtml(getPath(data, field.path))}</div>
  </div>`;

const renderBlock = (block, data, blockIndex) => {
  switch (block.type) {
    case 'state-grid':
      return `<section class="state-grid" aria-label="Drie toestanden">${block.items.map((item) => `
        <article class="state-card">
          <div class="state-label">${escapeHtml(item.label)}</div>
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.text)}</p>
        </article>`).join('')}</section>`;

    case 'steps':
      return `<section class="steps" aria-label="Route in stappen">${block.items.map((item) => `
        <article class="step-card">
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.textPath ? getPath(data, item.textPath) : item.text)}</p>
        </article>`).join('')}</section>`;

    case 'callout':
      return `<aside class="callout ${escapeHtml(block.tone || '')}"><p>${escapeHtml(block.text)}</p></aside>`;

    case 'data-list':
      return `<section class="data-list"><div class="block-label">${escapeHtml(block.title)}</div>${listHtml(getPath(data, block.path))}</section>`;

    case 'action':
      return `<section class="action-panel">
        <p class="action-note">${escapeHtml(block.note)}</p>
        <button class="action-button" type="button" data-next>${escapeHtml(getPath(data, block.labelPath))}</button>
      </section>`;

    case 'field-grid':
      return `<section class="field-grid">${block.fields.map((field) => renderField(field, data)).join('')}</section>`;

    case 'document-list': {
      const documents = getPath(data, block.path) || [];
      return `<section class="document-list">
        <div class="block-label">${escapeHtml(block.title)}</div>
        ${documents.map((document) => `<div class="document-row">
          <span>${escapeHtml(document.name)}</span>
          <span class="status-pill ${statusClass(document.status)}">${escapeHtml(document.status)}</span>
        </div>`).join('')}
      </section>`;
    }

    case 'tabs': {
      const tabsId = `tabs-${blockIndex}`;
      return `<section class="tabs-shell" data-tabs>
        <div class="tab-list" role="tablist" aria-label="Werkbank">
          ${block.items.map((item, index) => `<button
            class="tab-button"
            id="${tabsId}-tab-${index}"
            type="button"
            role="tab"
            aria-selected="${index === 0}"
            aria-controls="${tabsId}-panel-${index}"
            tabindex="${index === 0 ? 0 : -1}"
            data-tab="${index}"
          >${escapeHtml(item.label)}</button>`).join('')}
        </div>
        ${block.items.map((item, index) => `<div
          class="tab-panel"
          id="${tabsId}-panel-${index}"
          role="tabpanel"
          aria-labelledby="${tabsId}-tab-${index}"
          ${index === 0 ? '' : 'hidden'}
        >
          <h2>${escapeHtml(item.title)}</h2>
          <div class="tab-fields">${item.fields.map((field) => renderField(field, data, 'tab-field')).join('')}</div>
        </div>`).join('')}
      </section>`;
    }

    case 'status-flow': {
      const steps = getPath(data, block.path) || [];
      return `<section class="status-flow" aria-label="Status van professionele uitkomst">${steps.map((step) => `<div class="flow-step">${escapeHtml(step)}</div>`).join('')}</section>`;
    }

    case 'claims': {
      const claims = getPath(data, block.path) || [];
      return `<section class="claim-grid">${claims.map((claim) => `<article class="claim-card">
        <div class="claim-top">
          <p class="claim-statement">${escapeHtml(claim.statement)}</p>
          <span class="status-pill ${statusClass(claim.status)}">${escapeHtml(claim.status)}</span>
        </div>
        <dl class="claim-meta">
          <dt>Bron</dt><dd>${claim.sourceUrl ? `<a href="${escapeHtml(claim.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(claim.source)}</a>` : escapeHtml(claim.source)}</dd>
          <dt>Bronstatus</dt><dd>${escapeHtml(claim.sourceDate)}</dd>
          <dt>Eigenaar</dt><dd>${escapeHtml(claim.owner)}</dd>
          <dt>Herziening</dt><dd>${escapeHtml(claim.reviewAt)}</dd>
          <dt>Raakt</dt><dd>${escapeHtml(claim.surfaces.join(', '))}</dd>
        </dl>
      </article>`).join('')}</section>`;
    }

    case 'metrics': {
      const period = getPath(data, block.periodPath);
      return `<section>
        <p class="period-label">${escapeHtml(period)}</p>
        <div class="metrics-grid">${block.items.map((item) => `<article class="metric-card">
          <div class="metric-label">${escapeHtml(item.label)}</div>
          <strong class="metric-value">${escapeHtml(getPath(data, item.path))}</strong>
        </article>`).join('')}</div>
      </section>`;
    }

    case 'distribution': {
      const distribution = getPath(data, block.path) || {};
      const total = Object.values(distribution).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
      return `<section class="distribution">
        <div class="block-label">${escapeHtml(block.title)}</div>
        ${Object.entries(distribution).map(([key, value]) => `<div class="distribution-row">
          <span>${escapeHtml(block.labels?.[key] || key)}</span>
          <div class="distribution-track" aria-hidden="true"><div class="distribution-bar" style="width:${Math.round(Number(value) / total * 100)}%"></div></div>
          <strong>${escapeHtml(value)}</strong>
        </div>`).join('')}
      </section>`;
    }

    case 'comparison':
      return `<section class="comparison">
        <div class="comparison-head"><div>${escapeHtml(block.leftLabel)}</div><div>${escapeHtml(block.rightLabel)}</div></div>
        ${block.items.map((item) => `<div class="comparison-row"><div>${escapeHtml(item.left)}</div><div>${escapeHtml(item.right)}</div></div>`).join('')}
      </section>`;

    case 'timeline': {
      const timeline = getPath(data, block.path) || [];
      return `<section class="timeline">
        <div class="block-label">Werkbaar gedurende de uitvoering</div>
        <div class="timeline-grid">${timeline.map((item) => `<article class="timeline-item">
          <span class="timeline-month">Maand ${escapeHtml(item.month)}</span>
          <span>${escapeHtml(item.usable)}</span>
        </article>`).join('')}</div>
      </section>`;
    }

    case 'price': {
      const amount = Number(getPath(data, block.amountPath));
      const months = getPath(data, block.monthsPath);
      const formatted = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
      return `<section class="price-panel">
        <div>
          <div class="block-label">${escapeHtml(block.label)}</div>
          <p class="price-value">${escapeHtml(formatted)} per maand</p>
        </div>
        <p class="price-note">${escapeHtml(months)} maanden<br>${escapeHtml(block.note)}</p>
      </section>`;
    }

    default:
      return '';
  }
};

const initialize = async () => {
  try {
    const [brand, walkthrough, data] = await Promise.all([
      loadJson(source.brandConfig),
      loadJson(source.walkthroughConfig),
      loadJson(source.caseConfig)
    ]);

    setTokens(brand.tokens);
    document.documentElement.lang = walkthrough.meta.language || 'nl';

    const chapters = walkthrough.chapters;
    const byId = new Map(chapters.map((chapter, index) => [chapter.id, { chapter, index }]));
    const byCommand = new Map(chapters.map((chapter, index) => [chapter.command.toLowerCase(), { chapter, index }]));
    byCommand.set('/chat', { chapter: null, index: -1 });

    let currentIndex = -1;
    let message = '';

    const chapterFromHash = () => {
      const id = location.hash.replace(/^#/, '').toLowerCase();
      return id ? byId.get(id) : null;
    };

    const updateHash = (index) => {
      const target = chapters[index];
      if (!target) {
        history.replaceState(null, '', location.pathname + location.search);
        render(-1);
        return;
      }
      if (location.hash === `#${target.id}`) render(index);
      else location.hash = target.id;
    };

    const navigate = (index) => {
      message = '';
      updateHash(Math.max(-1, Math.min(chapters.length - 1, index)));
    };

    const renderNav = () => `<nav class="chapter-nav" aria-label="Demonstratiehoofdstukken"><div class="nav-inner">
      ${chapters.map((chapter, index) => `<button class="nav-button" type="button" data-index="${index}" ${index === currentIndex ? 'aria-current="step"' : ''}>${escapeHtml(chapter.navLabel)}</button>`).join('')}
    </div></nav>`;

    const renderWelcome = () => `<main class="demo-main" id="main-content" tabindex="-1"><section class="welcome">
      <div class="welcome-inner">
        <p class="eyebrow">${escapeHtml(brand.descriptor)}</p>
        <h1>${escapeHtml(walkthrough.meta.startPrompt)}</h1>
        <p class="welcome-copy">Een gecontroleerde walkthrough van publieke ingang naar professionele werkplaats - met een fictieve casus en zonder live klantdata.</p>
        <button class="primary-button" type="button" data-start>${escapeHtml(walkthrough.meta.startButton)}</button>
      </div>
    </section></main>`;

    const renderChapter = (chapter) => {
      const profile = walkthrough.profiles[chapter.profile];
      return `<main class="demo-main" id="main-content" tabindex="-1"><article class="chapter">
        <div class="profile-strip">
          <span class="profile-label">${escapeHtml(profile.label)}</span>
          <span class="profile-task">${escapeHtml(profile.task)}</span>
        </div>
        <header class="chapter-heading">
          <div>
            <p class="eyebrow">${escapeHtml(chapter.eyebrow)}</p>
            <h1>${escapeHtml(chapter.title)}</h1>
          </div>
          <p class="chapter-question"><strong>Leidende vraag</strong>${escapeHtml(chapter.question)}</p>
        </header>
        <div class="chapter-blocks">${chapter.blocks.map((block, index) => renderBlock(block, data, index)).join('')}</div>
      </article></main>`;
    };

    const renderCommandBar = () => `<footer class="command-bar"><form class="command-inner" data-command-form>
      <label class="command-label" for="command-input">Route</label>
      <input class="command-input" id="command-input" name="command" autocomplete="off" spellcheck="false" placeholder="${escapeHtml(chapters[0]?.command || '/start')}" aria-describedby="command-help command-message">
      <div class="chapter-controls">
        <button class="control-button" type="button" data-previous aria-label="Vorige stap" ${currentIndex <= -1 ? 'disabled' : ''}>←</button>
        <button class="control-button" type="button" data-next aria-label="Volgende stap" ${currentIndex >= chapters.length - 1 ? 'disabled' : ''}>→</button>
      </div>
      <span class="command-help" id="command-help">${escapeHtml(walkthrough.meta.help)}</span>
      ${message ? `<p class="command-message" id="command-message" role="status">${escapeHtml(message)}</p>` : '<span id="command-message"></span>'}
    </form></footer>`;

    const bindTabs = () => {
      for (const shell of app.querySelectorAll('[data-tabs]')) {
        const tabs = [...shell.querySelectorAll('[role="tab"]')];
        const panels = [...shell.querySelectorAll('[role="tabpanel"]')];
        const select = (index, focus = false) => {
          tabs.forEach((tab, tabIndex) => {
            const active = tabIndex === index;
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            panels[tabIndex].hidden = !active;
          });
          if (focus) tabs[index].focus();
        };
        tabs.forEach((tab, index) => {
          tab.addEventListener('click', () => select(index));
          tab.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault();
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            select((index + direction + tabs.length) % tabs.length, true);
          });
        });
      }
    };

    const bind = () => {
      app.querySelector('[data-start]')?.addEventListener('click', () => navigate(0));
      app.querySelectorAll('[data-index]').forEach((button) => button.addEventListener('click', () => navigate(Number(button.dataset.index))));
      app.querySelectorAll('[data-previous]').forEach((button) => button.addEventListener('click', () => navigate(currentIndex - 1)));
      app.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => navigate(currentIndex + 1)));
      app.querySelector('[data-command-form]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const command = new FormData(event.currentTarget).get('command')?.trim().toLowerCase();
        const target = byCommand.get(command);
        if (!target) {
          message = walkthrough.meta.unknownCommand;
          render(currentIndex, true);
          return;
        }
        navigate(target.index);
      });
      bindTabs();
    };

    const render = (index, focusCommand = false) => {
      currentIndex = index;
      const chapter = chapters[currentIndex];
      const profileClass = chapter ? `profile-${chapter.profile}` : 'profile-welcome';
      document.body.className = profileClass;
      app.innerHTML = `<div class="demo-shell">
        <div class="demo-alert">${escapeHtml(walkthrough.meta.demoStatus)}</div>
        <header class="demo-header"><div class="header-inner">
          <div class="brand-lockup"><span class="brand-name">${escapeHtml(brand.name)}</span><span class="brand-descriptor">${escapeHtml(brand.descriptor)}</span></div>
          <span class="chapter-status">${escapeHtml(chapter?.status || brand.makerLabel)}</span>
        </div></header>
        ${renderNav()}
        ${chapter ? renderChapter(chapter) : renderWelcome()}
        ${renderCommandBar()}
      </div>`;
      app.setAttribute('aria-busy', 'false');
      bind();
      if (focusCommand) app.querySelector('#command-input')?.focus();
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', () => {
      const target = chapterFromHash();
      message = '';
      render(target?.index ?? -1);
    });

    window.addEventListener('keydown', (event) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.getAttribute('role') === 'tab') return;
      if (event.key === 'ArrowLeft') navigate(currentIndex - 1);
      if (event.key === 'ArrowRight') navigate(currentIndex + 1);
    });

    const initial = chapterFromHash();
    render(initial?.index ?? -1);
  } catch (error) {
    app.setAttribute('aria-busy', 'false');
    app.innerHTML = `<main class="welcome"><div class="welcome-inner"><p class="eyebrow">Demonstratie niet geladen</p><h1>De lokale configuratie ontbreekt of is ongeldig.</h1><p class="welcome-copy">${escapeHtml(error.message)}</p></div></main>`;
  }
};

initialize();
