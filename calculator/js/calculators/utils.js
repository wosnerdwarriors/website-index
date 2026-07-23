export const RESOURCE_KEYS = [
  'meat',
  'wood',
  'coal',
  'iron',
  'fireCrystals',
  'refinedFireCrystals',
  'alloy',
  'polish',
  'plans',
  'amber',
  'guides',
  'designs',
  'secrets',
  'steel',
  'shards',
  'rfc',
  'svsPoints',
  'power',
  'minutes',
  'food',
  'manuals',
  'potions',
  'serum',
  'points',
  'affinity',
  'sigils',
  'books',
  'xp',
  'heroGearXp',
  'mythicGear',
  'mithril',
  'essenceStones',
  'masteryMythicGear'
];

export const VALERIA_S1_OPTIONS = Array.from({ length: 11 }, (_, level) => ({
  value: level * 2,
  label: level === 0 ? 'Level 0 (0%)' : `Level ${level} (${level * 2}%)`
}));

export function applyValeriaBonus(points, percent = 0) {
  return toNumber(points) * (1 + Math.max(0, Math.min(20, toNumber(percent))) / 100);
}

export function valeriaS1Field(percent = 0) {
  return `<div class="field"><label>Valeria S1</label>${stateSelect('valeriaS1Percent', percent, VALERIA_S1_OPTIONS, 'Valeria S1 level')}</div>`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(String(value).replaceAll(',', ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatNumber(value) {
  const number = toNumber(value, NaN);
  if (!Number.isFinite(number)) return escapeHtml(value);
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Number.isInteger(number) ? 0 : 2
  }).format(number);
}

export function formatDuration(seconds) {
  let remaining = Math.max(0, Math.round(toNumber(seconds)));
  const days = Math.floor(remaining / 86400);
  remaining %= 86400;
  const hours = Math.floor(remaining / 3600);
  remaining %= 3600;
  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function addTotals(target, source, multiplier = 1) {
  RESOURCE_KEYS.forEach((key) => {
    const value = toNumber(source?.[key]);
    if (value) target[key] = (target[key] || 0) + value * multiplier;
  });
  return target;
}

export function compactTotals(totals) {
  return Object.fromEntries(
    Object.entries(totals)
      .filter(([, value]) => Math.abs(toNumber(value)) > 0.00001)
      .map(([key, value]) => [key, Math.round(value * 10000) / 10000])
  );
}

export function titleCaseKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function summaryCards(items) {
  return `<div class="summary-grid">${items.map((item) => `
    <div class="summary-card">
      <div class="summary-label">${escapeHtml(item.label)}</div>
      <div class="summary-value">${item.htmlValue ?? escapeHtml(item.value)}</div>
    </div>
  `).join('')}</div>`;
}

export function stateInput(path, value, options = {}) {
  const type = options.type || 'number';
  const min = options.min ?? 0;
  const max = options.max;
  const step = options.step ?? 1;
  const ariaLabel = options.ariaLabel || path
    .replace(/\.(current|desired)$/i, ' $1')
    .replace(/[.-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const maxAttribute = max === undefined ? '' : ` max="${escapeHtml(max)}"`;
  return `<input type="${escapeHtml(type)}" min="${escapeHtml(min)}"${maxAttribute} step="${escapeHtml(step)}" value="${escapeHtml(value ?? '')}" aria-label="${escapeHtml(ariaLabel)}" data-state-path="${escapeHtml(path)}">`;
}

export function stateSelect(path, value, options, ariaLabel) {
  ariaLabel ||= path.replace(/[.-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  return `<select aria-label="${escapeHtml(ariaLabel)}" data-state-path="${escapeHtml(path)}">${options.map((option) => {
    const normalized = typeof option === 'object' ? option.value : option;
    const label = typeof option === 'object' ? option.label : option;
    return `<option value="${escapeHtml(normalized)}" ${String(normalized) === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('')}</select>`;
}

export function validationMessages(messages = []) {
  const unique = [...new Set(messages.filter(Boolean))];
  if (!unique.length) return '';
  return `<div class="validation-panel" role="alert"><strong>Check this plan:</strong><ul>${unique.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}</ul></div>`;
}

export function currentDesiredRows(items, statePath, stateItems, columns) {
  return items.map((item, index) => {
    const saved = stateItems?.[index] || {};
    const current = saved.current ?? item.current ?? 0;
    const desired = saved.desired ?? item.desired ?? current;
    const detailCells = columns.map((column) => `<td>${formatNumber(item[column.key] ?? 0)}</td>`).join('');
    return `
      <tr>
        <td>${escapeHtml(item.name || item.label || `Item ${index + 1}`)}</td>
        <td>${stateInput(`${statePath}.${index}.current`, current)}</td>
        <td>${stateInput(`${statePath}.${index}.desired`, desired)}</td>
        ${detailCells}
      </tr>
    `;
  }).join('');
}
