import * as construction from './calculators/construction.js?v=20260715-valeria-s1';
import * as chiefGearCharms from './calculators/chief-gear-charms.js?v=20260716-sticky-tables';
import * as heroes from './calculators/heroes.js?v=20260716-sticky-table';
import * as heroGear from './calculators/hero-gear.js?v=20260715-svs-valeria';
import * as pets from './calculators/pets.js?v=20260716-pet-caps';
import * as troops from './calculators/troops.js?v=20260715-multi-type-svs';
import * as dawnAcademy from './calculators/dawn-academy.js?v=20260716-valeria-s1';
import { hydrateCalculatorState, isStateObject } from './state.js?v=20260712-resource-balance';

const STORAGE_KEY = 'wosCalculatorState:v3';
const DATA_VERSION = '20260715-multi-type-svs';

// Hero Rally, Fire Crystal Refinement, and T12/Exalted are intentionally outside this calculator's scope. Do not re-add them as tabs.
const SECTIONS = [
  { id: 'construction', title: 'Construction', file: 'construction.json', module: construction },
  { id: 'chief-gear-charms', title: 'Chief Gear & Charms', file: 'chief-gear-charms.json', module: chiefGearCharms },
  { id: 'heroes', title: 'Heroes', file: 'heroes.json', module: heroes },
  { id: 'hero-gear', title: 'Hero Gear', file: 'hero-gear.json', module: heroGear },
  { id: 'pets', title: 'Pets', file: 'pets.json', module: pets },
  { id: 'troops', title: 'Troops', file: 'troops.json', module: troops },
  { id: 'dawn-academy', title: 'Experts', file: 'dawn-academy.json', module: dawnAcademy }
];

const RESOURCE_DEFINITIONS = [
  { key: 'meat', label: 'Meat' },
  { key: 'wood', label: 'Wood' },
  { key: 'coal', label: 'Coal' },
  { key: 'iron', label: 'Iron' },
  { key: 'fireCrystals', label: 'Fire Crystals', aliases: ['fire crystal spend'] },
  { key: 'refinedFireCrystals', label: 'Refined Fire Crystals' },
  { key: 'alloy', label: 'Alloy' },
  { key: 'polish', label: 'Polish' },
  { key: 'plans', label: 'Plans' },
  { key: 'amber', label: 'Amber' },
  { key: 'guides', label: 'Guides' },
  { key: 'designs', label: 'Designs' },
  { key: 'secrets', label: 'Secrets' },
  { key: 'steel', label: 'Steel' },
  { key: 'shards', label: 'Shards' },
  { key: 'rfc', label: 'RFC' },
  { key: 'food', label: 'Food' },
  { key: 'manuals', label: 'Manuals' },
  { key: 'potions', label: 'Potions' },
  { key: 'serum', label: 'Serum' },
  { key: 'affinity', label: 'Affinity' },
  { key: 'sigils', label: 'Sigils' },
  { key: 'books', label: 'Books' },
  { key: 'xp', label: 'XP' },
  { key: 'heroGearXp', label: 'Hero Gear XP' },
  { key: 'mythicGear', label: 'Mythic Gear' },
  { key: 'mithril', label: 'Mithril' },
  { key: 'essenceStones', label: 'Essence Stones' },
  { key: 'masteryMythicGear', label: 'Mastery Mythic Gear' },
  { key: 'generalShards', label: 'General Shards', aliases: ['general needed'] },
  { key: 'widgets', label: 'Widgets', aliases: ['widgets needed'] }
];

let activeSectionId = location.hash.replace('#', '') || SECTIONS[0].id;
let calculatorData = {};
let state = {};
let saveTimer = null;

const tabsEl = document.getElementById('calculator-tabs');
const contentEl = document.getElementById('calculator-content');
const statusPanelEl = document.getElementById('status-panel');
const saveStatusEl = document.getElementById('save-status');

async function loadJson(path) {
  const response = await fetch(`${path}?v=${DATA_VERSION}`);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json();
}

async function loadData() {
  const entries = await Promise.all(
    SECTIONS.map(async (section) => [section.id, await loadJson(`/calculator/data/${section.file}`)])
  );
  calculatorData = Object.fromEntries(entries);
}

function loadState() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    // A malformed browser cache should never stop the calculator from loading.
  }
  state = hydrateCalculatorState(saved, SECTIONS, calculatorData);
  setSaveStatus('Saved locally');
}

function loadImportedState(saved) {
  if (!isStateObject(saved)) throw new Error('Choose a calculator export JSON file.');
  state = hydrateCalculatorState(saved, SECTIONS, calculatorData);
}

function saveState() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaveStatus('Saved locally');
  } catch {
    setSaveStatus('Unable to save locally', 'error');
  }
}

function scheduleSaveState() {
  clearTimeout(saveTimer);
  setSaveStatus('Saving…', 'saving');
  saveTimer = setTimeout(saveState, 150);
}

function setSaveStatus(message, tone = 'saved') {
  saveStatusEl.textContent = message;
  saveStatusEl.dataset.tone = tone;
}

function renderTabs() {
  tabsEl.innerHTML = SECTIONS.map((section) => `
    <button id="calculator-tab-${section.id}" class="calculator-tab ${section.id === activeSectionId ? 'active' : ''}" data-tab="${section.id}" type="button" role="tab" tabindex="${section.id === activeSectionId ? '0' : '-1'}" aria-selected="${section.id === activeSectionId}" aria-controls="calculator-content">
      ${section.title}
    </button>
  `).join('');
}

function showStatus(message, tone = 'success') {
  statusPanelEl.className = `status-panel ${tone === 'error' ? 'error' : 'success'}`;
  statusPanelEl.textContent = message;
}

function normalizeSummaryLabel(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function resourceForSummary(label) {
  const normalized = normalizeSummaryLabel(label);
  const findMatch = (candidate) => RESOURCE_DEFINITIONS.find((resource) =>
    normalizeSummaryLabel(resource.label) === candidate
    || (resource.aliases || []).includes(candidate));
  return findMatch(normalized)
    || (normalized.startsWith('gear ') ? findMatch(normalized.slice(5)) : null)
    || (normalized.startsWith('charm ') ? findMatch(normalized.slice(6)) : null);
}

function parseFormattedNumber(value) {
  const parsed = Number(String(value || '').replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatInventoryNumber(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2
  }).format(value);
}

function renderResourceBalance() {
  contentEl.querySelector('.resource-balance-panel')?.remove();
  const requirements = new Map();
  contentEl.querySelectorAll('.summary-card').forEach((card) => {
    const resource = resourceForSummary(card.querySelector('.summary-label')?.textContent);
    const required = parseFormattedNumber(card.querySelector('.summary-value')?.textContent);
    if (!resource || !Number.isFinite(required) || required <= 0) return;
    requirements.set(resource.key, {
      ...resource,
      required: (requirements.get(resource.key)?.required || 0) + required
    });
  });
  if (!requirements.size) return;

  const rows = [...requirements.values()].map((resource) => {
    const onHand = Math.max(0, Number(state.inventory?.[resource.key] || 0));
    const remaining = Math.max(0, resource.required - onHand);
    return `
      <div class="resource-balance-row" data-resource-key="${resource.key}">
        <div class="resource-name">${resource.label}</div>
        <div><span class="resource-mobile-label">Required</span><strong>${formatInventoryNumber(resource.required)}</strong></div>
        <label><span class="resource-mobile-label">On hand</span><input type="number" min="0" step="any" value="${onHand}" aria-label="${resource.label} on hand" data-state-path="inventory.${resource.key}"></label>
        <div class="resource-remaining ${remaining === 0 ? 'covered' : ''}"><span class="resource-mobile-label">Still needed</span><strong>${formatInventoryNumber(remaining)}</strong></div>
      </div>
    `;
  }).join('');

  contentEl.insertAdjacentHTML('afterbegin', `
    <section class="calc-panel resource-balance-panel" aria-labelledby="resource-balance-heading">
      <div class="resource-balance-heading">
        <div>
          <p class="resource-kicker">Your inventory</p>
          <h2 id="resource-balance-heading">Resource balance</h2>
        </div>
        <p>Enter what you already have to see what is still needed for this plan.</p>
      </div>
      <div class="resource-balance-table">
        <div class="resource-balance-header" aria-hidden="true"><span>Resource</span><span>Required</span><span>On hand</span><span>Still needed</span></div>
        ${rows}
      </div>
    </section>
  `);
}

function renderActiveSection() {
  const section = SECTIONS.find((item) => item.id === activeSectionId) || SECTIONS[0];
  activeSectionId = section.id;
  contentEl.setAttribute('aria-labelledby', `calculator-tab-${section.id}`);
  const sectionData = calculatorData[section.id];
  const sectionState = state[section.id] || section.module.defaultState(sectionData);
  state[section.id] = sectionState;
  renderTabs();
  contentEl.innerHTML = section.module.render(sectionData, sectionState, { valeriaS1Percent: state.valeriaS1Percent });
  contentEl.querySelectorAll('.data-table-wrapper').forEach((wrapper, index) => {
    wrapper.tabIndex = 0;
    wrapper.setAttribute('aria-label', `Scrollable calculator table ${index + 1}`);
    if (wrapper.previousElementSibling?.classList.contains('table-scroll-hint')) return;
    const hint = document.createElement('p');
    hint.className = 'table-scroll-hint';
    hint.textContent = 'Swipe sideways to see every column.';
    wrapper.before(hint);
  });
  renderResourceBalance();
}

function setByPath(target, path, value) {
  const parts = path.split('.');
  let cursor = target;
  while (parts.length > 1) {
    const part = parts.shift();
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[0]] = value;
}

function parseInputValue(input) {
  if (input.type === 'number') {
    const number = Number(input.value);
    return Number.isFinite(number) ? number : 0;
  }
  if (input.type === 'checkbox') return input.checked;
  return input.value;
}

function exportState() {
  const payload = {
    exportedAt: new Date().toISOString(),
    state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wos-calculator-state.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importState(file) {
  if (!file) return;
  const text = await file.text();
  const payload = JSON.parse(text);
  loadImportedState(payload?.state ?? payload);
  saveState();
  renderActiveSection();
  showStatus('Calculator plan imported and saved in this browser.');
}

function attachEvents() {
  tabsEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    activeSectionId = button.dataset.tab;
    history.pushState(null, '', `#${activeSectionId}`);
    renderActiveSection();
  });

  tabsEl.addEventListener('keydown', (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    const tabs = [...tabsEl.querySelectorAll('[data-tab]')];
    const currentIndex = tabs.indexOf(event.target.closest('[data-tab]'));
    if (currentIndex < 0) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    activeSectionId = tabs[nextIndex].dataset.tab;
    history.pushState(null, '', `#${activeSectionId}`);
    renderActiveSection();
    tabsEl.querySelector(`[data-tab="${activeSectionId}"]`)?.focus();
  });

  window.addEventListener('hashchange', () => {
    const sectionId = location.hash.replace('#', '');
    if (!SECTIONS.some((section) => section.id === sectionId) || sectionId === activeSectionId) return;
    activeSectionId = sectionId;
    renderActiveSection();
  });

  const handleStateInput = (event) => {
    const input = event.target.closest('[data-state-path]');
    if (!input) return;
    setByPath(state, input.dataset.statePath, parseInputValue(input));
    if (event.type === 'input') scheduleSaveState();
    else saveState();
    const section = SECTIONS.find((item) => item.id === activeSectionId);
    if (section?.id === 'heroes' && typeof section.module.update === 'function') {
      const match = input.dataset.statePath.match(/^heroes\.items\.(\d+)\./);
      if (match) {
        section.module.update(calculatorData.heroes, state.heroes, contentEl, Number(match[1]), { valeriaS1Percent: state.valeriaS1Percent });
        renderResourceBalance();
        return;
      }
    }
    if (event.type === 'input') {
      // Do not replace an active text/number input: doing so resets its caret and
      // makes multi-digit values appear in reverse. The change event refreshes totals.
      return;
    }
    renderActiveSection();
  };

  contentEl.addEventListener('change', handleStateInput);
  contentEl.addEventListener('input', handleStateInput);

  document.getElementById('reset-state').addEventListener('click', () => {
    if (!window.confirm('Reset every calculator plan saved in this browser?')) return;
    clearTimeout(saveTimer);
    localStorage.removeItem(STORAGE_KEY);
    state = {};
    loadState();
    renderActiveSection();
    showStatus('Calculator plans were reset.');
  });

  document.getElementById('reset-section').addEventListener('click', () => {
    const section = SECTIONS.find((item) => item.id === activeSectionId);
    if (!section || !window.confirm(`Reset the ${section.title} calculator? Other calculator plans and inventory will be kept.`)) return;
    clearTimeout(saveTimer);
    state[section.id] = section.module.defaultState(calculatorData[section.id]);
    saveState();
    renderActiveSection();
    showStatus(`${section.title} was reset. Other calculator plans were kept.`);
  });

  document.getElementById('export-state').addEventListener('click', exportState);
  document.getElementById('import-state-button').addEventListener('click', () => {
    document.getElementById('import-state').click();
  });
  document.getElementById('import-state').addEventListener('change', (event) => {
    importState(event.target.files?.[0]).catch((error) => {
      showStatus(`Import failed: ${error.message}`, 'error');
    });
    event.target.value = '';
  });

  window.addEventListener('pagehide', () => {
    if (saveTimer !== null) saveState();
  });
}

async function main() {
  try {
    await loadData();
    loadState();
    attachEvents();
    renderActiveSection();
  } catch (error) {
    console.error(error);
    contentEl.innerHTML = `<div class="status-panel">Calculator failed to load: ${error.message}</div>`;
  }
}

main();
