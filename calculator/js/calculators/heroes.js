import { applyValeriaBonus, escapeHtml, formatNumber, titleCaseKey, toNumber, valeriaS1Field } from './utils.js?v=20260715-valeria-s1';

const SHARD_SVS_POINTS = { rare: 350, epic: 1220, mythic: 3040 };
const WIDGET_SVS_POINTS = 8000;

function normalizeLevel(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

function buildStarOptions() {
  const options = ['Locked', 'Unlocked'];
  for (let star = 0; star < 5; star += 1) {
    for (let step = 1; step <= 5; step += 1) {
      options.push(`${star}.${step}`);
    }
    if (star < 4) {
      options.push(`${star + 1}`);
    }
  }
  options.push('5');
  return options;
}

function normalizeStarLevel(value) {
  const normalized = normalizeLevel(value);
  if (!normalized || normalized === '0') return 'Unlocked';
  return normalized;
}

function starMatrixKey(value) {
  return normalizeStarLevel(value);
}

function normalizeWidgetLevel(value, fallback = 0) {
  const normalized = normalizeLevel(value);
  return normalized === '' ? fallback : value;
}

function displayHeroGroup(value) {
  return normalizeLevel(value).replace(/^Getn\s*/i, 'Gen ').replace(/^Gen\s+/i, 'Gen ');
}

function heroRarity(hero) {
  const group = normalizeLevel(hero.group).trim().toLowerCase();
  return group === 'rare' || group === 'epic' ? group : 'mythic';
}

function selectInput(path, value, options, ariaLabel) {
  const normalizedOptions = options.map((option) => typeof option === 'object'
    ? { value: normalizeLevel(option.value), label: normalizeLevel(option.label) }
    : { value: normalizeLevel(option), label: normalizeLevel(option) });
  const optionValues = normalizedOptions.map((option) => option.value);
  const normalized = normalizeLevel(value);
  const selectedValue = optionValues.includes(normalized) ? normalized : optionValues[0] ?? '';
  return `
    <select aria-label="${escapeHtml(ariaLabel || path)}" data-state-path="${escapeHtml(path)}">
      ${normalizedOptions.map((option) => {
        const selected = option.value === selectedValue ? 'selected' : '';
        return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
      }).join('')}
    </select>
  `;
}

function numberInput(path, value, ariaLabel) {
  return `<input type="number" min="0" step="1" value="${escapeHtml(toNumber(value))}" aria-label="${escapeHtml(ariaLabel || path)}" data-state-path="${escapeHtml(path)}">`;
}

function hasWidgetControls(hero) {
  if (typeof hero.hasWidgets === 'boolean') return hero.hasWidgets;
  const group = normalizeLevel(hero.group).trim().toLowerCase();
  return group !== 'rare' && group !== 'epic';
}

function defaultItem(hero) {
  const currentStars = normalizeStarLevel(hero.currentStars);
  const defaultWidget = hasWidgetControls(hero) ? 0 : '';
  const currentWidget = hero.currentWidget ?? defaultWidget;
  return {
    currentStars,
    desiredStars: normalizeStarLevel(hero.desiredStars || currentStars),
    specificShards: toNumber(hero.specificShards),
    generalShards: toNumber(hero.generalShards),
    currentWidget,
    desiredWidget: hero.desiredWidget ?? currentWidget
  };
}

function itemState(data, state) {
  return (data.heroRows || []).map((hero, index) => {
    const merged = {
      ...defaultItem(hero),
      ...(state.items?.[index] || {})
    };
    merged.currentStars = normalizeStarLevel(merged.currentStars);
    merged.desiredStars = normalizeStarLevel(merged.desiredStars || merged.currentStars);
    if (hasWidgetControls(hero)) {
      merged.currentWidget = normalizeWidgetLevel(merged.currentWidget, 0);
      merged.desiredWidget = normalizeWidgetLevel(merged.desiredWidget, merged.currentWidget);
    } else {
      merged.currentWidget = '';
      merged.desiredWidget = '';
    }
    return merged;
  });
}

function lookupMatrix(matrix, current, desired) {
  const currentKey = normalizeLevel(current);
  const desiredKey = normalizeLevel(desired);
  if (!currentKey || !desiredKey || currentKey === desiredKey) return 0;
  return toNumber(matrix?.[currentKey]?.[desiredKey]);
}

function lookupStarMatrix(matrix, current, desired) {
  const currentKey = starMatrixKey(current);
  const desiredKey = starMatrixKey(desired);
  if (!currentKey || !desiredKey || currentKey === desiredKey) return 0;
  return toNumber(matrix?.[currentKey]?.[desiredKey]);
}

export function defaultState(data) {
  return {
    items: (data.heroRows || []).map(defaultItem),
    filters: { search: '', group: 'all', type: 'all', view: 'table' }
  };
}

export function calculate(data, state = {}, shared = {}) {
  const totals = {
    shardCost: 0,
    generalNeeded: 0,
    generalShortfall: 0,
    widgetsNeeded: 0,
    svsPoints: 0
  };
  const states = itemState(data, state);
  const rows = (data.heroRows || []).map((hero, index) => {
    const selected = states[index];
    const shardCost = lookupStarMatrix(data.starCosts?.matrix, selected.currentStars, selected.desiredStars);
    const specificApplied = Math.min(shardCost, toNumber(selected.specificShards));
    const generalNeeded = Math.max(0, shardCost - specificApplied);
    const generalShortfall = Math.max(0, generalNeeded - toNumber(selected.generalShards));
    const widgetsNeeded = hasWidgetControls(hero)
      ? lookupMatrix(data.widgetCosts?.matrix, selected.currentWidget, selected.desiredWidget)
      : 0;
    const svsPoints = applyValeriaBonus((shardCost * SHARD_SVS_POINTS[heroRarity(hero)]) + (widgetsNeeded * WIDGET_SVS_POINTS), shared.valeriaS1Percent);
    totals.shardCost += shardCost;
    totals.generalNeeded += generalNeeded;
    totals.generalShortfall += generalShortfall;
    totals.widgetsNeeded += widgetsNeeded;
    totals.svsPoints += svsPoints;
    return {
      ...hero,
      state: selected,
      shardCost,
      specificApplied,
      generalNeeded,
      generalShortfall,
      widgetsNeeded,
      svsPoints
    };
  });
  return { rows, totals };
}

function renderHeroRow(hero, index, starOptions, widgetOptions) {
  const widgetCells = hasWidgetControls(hero)
    ? `
      <td>${selectInput(`heroes.items.${index}.currentWidget`, hero.state.currentWidget, widgetOptions, `${hero.name} current widget`)}</td>
      <td>${selectInput(`heroes.items.${index}.desiredWidget`, hero.state.desiredWidget, widgetOptions, `${hero.name} desired widget`)}</td>
      <td data-hero-output="widgetsNeeded">${formatNumber(hero.widgetsNeeded)}</td>
    `
    : '<td class="muted-cell" colspan="3">No widget levels</td>';
  return `
    <tr data-hero-index="${index}">
      <td>${escapeHtml(displayHeroGroup(hero.group))}</td>
      <td>${escapeHtml(hero.type)}</td>
      <td><div class="hero-table-name"><span>${escapeHtml(hero.name)}</span></div></td>
      <td>${selectInput(`heroes.items.${index}.currentStars`, hero.state.currentStars, starOptions, `${hero.name} current stars`)}</td>
      <td>${selectInput(`heroes.items.${index}.desiredStars`, hero.state.desiredStars, starOptions, `${hero.name} desired stars`)}</td>
      <td>${numberInput(`heroes.items.${index}.specificShards`, hero.state.specificShards, `${hero.name} specific shards`)}</td>
      <td>${numberInput(`heroes.items.${index}.generalShards`, hero.state.generalShards, `${hero.name} general shards`)}</td>
      <td data-hero-output="shardCost">${formatNumber(hero.shardCost)}</td>
      <td data-hero-output="generalNeeded">${formatNumber(hero.generalNeeded)}</td>
      <td data-hero-output="generalShortfall">${formatNumber(hero.generalShortfall)}</td>
      ${widgetCells}
      <td data-hero-output="svsPoints">${formatNumber(hero.svsPoints)}</td>
    </tr>
  `;
}

function renderHeroCard(hero, index, starOptions, widgetOptions) {
  const widgetFields = hasWidgetControls(hero) ? `
    <label><span>Current widget</span>${selectInput(`heroes.items.${index}.currentWidget`, hero.state.currentWidget, widgetOptions, `${hero.name} current widget`)}</label>
    <label><span>Desired widget</span>${selectInput(`heroes.items.${index}.desiredWidget`, hero.state.desiredWidget, widgetOptions, `${hero.name} desired widget`)}</label>
  ` : '';
  return `
    <article class="hero-card" data-hero-index="${index}">
      <header>
        <div class="hero-card-identity"><div><h3>${escapeHtml(hero.name)}</h3><p>${escapeHtml(displayHeroGroup(hero.group))}</p></div></div>
        <span class="hero-type-badge">${escapeHtml(hero.type)}</span>
      </header>
      <div class="hero-card-inputs">
        <label><span>Current stars</span>${selectInput(`heroes.items.${index}.currentStars`, hero.state.currentStars, starOptions, `${hero.name} current stars`)}</label>
        <label><span>Desired stars</span>${selectInput(`heroes.items.${index}.desiredStars`, hero.state.desiredStars, starOptions, `${hero.name} desired stars`)}</label>
        <label><span>Specific shards</span>${numberInput(`heroes.items.${index}.specificShards`, hero.state.specificShards, `${hero.name} specific shards`)}</label>
        <label><span>General shards</span>${numberInput(`heroes.items.${index}.generalShards`, hero.state.generalShards, `${hero.name} general shards`)}</label>
        ${widgetFields}
      </div>
      <div class="hero-card-results">
        <div><span>Total shards</span><strong data-hero-output="shardCost">${formatNumber(hero.shardCost)}</strong></div>
        <div><span>General needed</span><strong data-hero-output="generalNeeded">${formatNumber(hero.generalNeeded)}</strong></div>
        <div><span>Shortfall</span><strong data-hero-output="generalShortfall">${formatNumber(hero.generalShortfall)}</strong></div>
        ${hasWidgetControls(hero) ? `<div><span>Widgets</span><strong data-hero-output="widgetsNeeded">${formatNumber(hero.widgetsNeeded)}</strong></div>` : ''}
        <div><span>SVS points</span><strong data-hero-output="svsPoints">${formatNumber(hero.svsPoints)}</strong></div>
      </div>
    </article>
  `;
}

function renderHeroTotals(totals) {
  return `<div class="summary-grid">${Object.entries(totals).map(([key, value]) => `
    <div class="summary-card">
      <div class="summary-label">${escapeHtml(key === 'svsPoints' ? 'SVS Points' : titleCaseKey(key))}</div>
      <div class="summary-value" data-hero-total="${escapeHtml(key)}">${formatNumber(value)}</div>
    </div>
  `).join('')}</div>`;
}

export function update(data, state, root, index, shared = {}) {
  const result = calculate(data, state, shared);
  const row = result.rows[index];
  const rowEl = root.querySelector(`[data-hero-index="${index}"]`);
  if (!row || !rowEl) return;
  ['shardCost', 'generalNeeded', 'generalShortfall', 'widgetsNeeded', 'svsPoints'].forEach((key) => {
    const cell = rowEl.querySelector(`[data-hero-output="${key}"]`);
    if (cell) cell.textContent = formatNumber(row[key]);
  });
  Object.entries(result.totals).forEach(([key, value]) => {
    const totalEl = root.querySelector(`[data-hero-total="${key}"]`);
    if (totalEl) totalEl.textContent = formatNumber(value);
  });
}

export function render(data, state = {}, shared = {}) {
  const result = calculate(data, state, shared);
  const starOptions = buildStarOptions();
  const widgetOptions = (data.widgetCosts?.levels || []).map((level) => level.level);
  const filters = {
    search: normalizeLevel(state.filters?.search).trim(),
    group: normalizeLevel(state.filters?.group || 'all'),
    type: normalizeLevel(state.filters?.type || 'all'),
    view: state.filters?.view === 'cards' ? 'cards' : 'table'
  };
  const query = filters.search.toLowerCase();
  const visibleRows = result.rows
    .map((hero, index) => ({ hero, index }))
    .filter(({ hero }) => (!query || hero.name.toLowerCase().includes(query))
      && (filters.group === 'all' || hero.group === filters.group)
      && (filters.type === 'all' || hero.type === filters.type));
  const groupOptions = [{ value: 'all', label: 'All groups' }, ...new Set(result.rows.map((hero) => hero.group))].map((option) =>
    typeof option === 'object' ? option : { value: option, label: displayHeroGroup(option) });
  const typeOptions = [{ value: 'all', label: 'All types' }, ...new Set(result.rows.map((hero) => hero.type))].map((option) =>
    typeof option === 'object' ? option : { value: option, label: option });
  const rows = visibleRows.map(({ hero, index }) => renderHeroRow(hero, index, starOptions, widgetOptions)).join('');
  const cards = visibleRows.map(({ hero, index }) => renderHeroCard(hero, index, starOptions, widgetOptions)).join('');
  const emptyState = '<div class="heroes-empty">No heroes match these filters.</div>';
  return `
    <div class="calc-grid two-column heroes-layout">
      <section class="calc-panel heroes-main-panel">
        <h2>Heroes</h2>
        <div class="heroes-toolbar">
          ${valeriaS1Field(shared.valeriaS1Percent)}
          <label class="heroes-search"><span>Search heroes</span><input type="search" value="${escapeHtml(filters.search)}" placeholder="Hero name" aria-label="Search heroes" data-state-path="heroes.filters.search"></label>
          <label><span>Group</span>${selectInput('heroes.filters.group', filters.group, groupOptions, 'Filter heroes by group')}</label>
          <label><span>Type</span>${selectInput('heroes.filters.type', filters.type, typeOptions, 'Filter heroes by type')}</label>
          <label><span>View</span>${selectInput('heroes.filters.view', filters.view, [{ value: 'table', label: 'Table view' }, { value: 'cards', label: 'Card view' }], 'Heroes view')}</label>
        </div>
        <div class="heroes-result-count">Showing ${visibleRows.length} of ${result.rows.length} heroes</div>
        ${filters.view === 'table' ? `
          <p class="table-scroll-hint">Swipe sideways to see every hero field.</p>
          <div class="data-table-wrapper sticky-table-wrapper">
            <table class="data-table heroes-table">
              <thead>
                <tr>
                  <th>Group</th><th>Type</th><th>Hero</th><th>Current Stars</th><th>Desired Stars</th><th>Specific Shards</th><th>General Shards</th><th>Total Shards</th><th>General Needed</th><th>General Shortfall</th><th>Current Widget</th><th>Desired Widget</th><th>Widgets</th><th>SVS Points</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        ` : `<div class="hero-card-grid">${cards}</div>`}
        ${visibleRows.length ? '' : emptyState}
      </section>
      <aside class="calc-panel heroes-totals-panel">
        <h3>Totals</h3>
        ${renderHeroTotals(result.totals)}
        <p class="text-sm text-gray-600 mt-3">Totals include all heroes. SVS points use the shard rate for each hero's rarity plus 8,000 points per widget.</p>
      </aside>
    </div>
  `;
}
