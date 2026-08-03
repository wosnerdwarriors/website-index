import { addTotals, applyValeriaBonus, compactTotals, escapeHtml, formatNumber, stateSelect, summaryCards, titleCaseKey, valeriaS1Field, validationMessages } from './utils.js?v=20260715-valeria-s1';

const SVS_POINTS_PER_PET_POINT = 50;
const ADVANCEMENT_COST_KEYS = ['food', 'manuals', 'potions', 'serum'];

function petItems(data) {
  const levels = data.petLevels || {};
  return (data.items || []).filter((item) => (
    Array.isArray(levels[item.name])
    && levels[item.name].length
  ));
}

function availableLevels(name, data) {
  const levels = data.petLevels?.[name] || [];
  const lastCostIndex = levels.findLastIndex((level) => (
    ADVANCEMENT_COST_KEYS.some((key) => Number(level[key]) > 0)
  ));
  return lastCostIndex < 0 ? [] : levels.slice(0, lastCostIndex + 1);
}

function rangeFor(name, data) {
  const levels = availableLevels(name, data);
  return { min: 0, max: levels.at(-1)?.level ?? 0 };
}

export function defaultState(data) {
  return {
    items: petItems(data).map((item) => {
      const { min, max } = rangeFor(item.name, data);
      const current = Number(item.current);
      const initial = Number.isFinite(current) ? Math.min(max, Math.max(min, current)) : min;
      return { current: initial, desired: initial };
    })
  };
}

export function clearState(data) {
  return {
    items: petItems(data).map(() => ({ current: 0, desired: 0 }))
  };
}

export function calculate(data, state, shared = {}) {
  const totals = {};
  const warnings = [];
  const rows = petItems(data).map((item, index) => {
    const range = rangeFor(item.name, data);
    const saved = state.items?.[index] || {};
    const current = Number(saved.current ?? range.min);
    const desired = Number(saved.desired ?? current);
    if (current < range.min || current > range.max || desired < range.min || desired > range.max) {
      warnings.push(`${item.name} must stay between ${range.min} and ${range.max}.`);
    }
    if (desired < current) warnings.push(`${item.name}: desired level cannot be below current level.`);
    const rowTotals = {};
    availableLevels(item.name, data)
      .filter((level) => level.level > current && level.level <= desired)
      .forEach((level) => addTotals(rowTotals, level));
    addTotals(totals, rowTotals);
    const compactRowTotals = compactTotals(rowTotals);
    const svsPoints = applyValeriaBonus((compactRowTotals.points || 0) * SVS_POINTS_PER_PET_POINT, shared.valeriaS1Percent);
    return { name: item.name, current, desired, range, totals: compactRowTotals, svsPoints };
  });
  const compact = compactTotals(totals);
  compact.svsPoints = applyValeriaBonus((compact.points || 0) * SVS_POINTS_PER_PET_POINT, shared.valeriaS1Percent);
  return { totals: compact, rows, warnings };
}

export function render(data, state, shared = {}) {
  const result = calculate(data, state, shared);
  const totalCards = Object.entries(result.totals).map(([key, value]) => ({ label: key === 'svsPoints' ? 'SVS Points' : titleCaseKey(key), value: formatNumber(value) }));
  const rows = result.rows.map((row, index) => `
    <tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${stateSelect(`pets.items.${index}.current`, row.current, availableLevels(row.name, data).map((level) => ({ value: level.level, label: `Level ${level.level}` })), `${row.name} current level`)}</td>
      <td>${stateSelect(`pets.items.${index}.desired`, row.desired, availableLevels(row.name, data).map((level) => ({ value: level.level, label: `Level ${level.level}` })), `${row.name} desired level`)}</td>
      <td>${formatNumber(row.totals.food || 0)}</td>
      <td>${formatNumber(row.totals.manuals || 0)}</td>
      <td>${formatNumber(row.totals.potions || 0)}</td>
      <td>${formatNumber(row.totals.serum || 0)}</td>
      <td>${formatNumber(row.totals.points || 0)}</td>
      <td>${formatNumber(row.svsPoints)}</td>
    </tr>
  `).join('');
  return `
    <div class="calc-grid two-column">
      <section class="calc-panel">
        <h2>Pet Advancement</h2>
        <p class="text-sm text-gray-600 mb-3">Costs are summed across each selected pet-level range.</p>
        <div class="input-grid mb-3">${valeriaS1Field(shared.valeriaS1Percent)}</div>
        ${validationMessages(result.warnings)}
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead><tr><th>Pet</th><th>Current</th><th>Desired</th><th>Food</th><th>Manuals</th><th>Potions</th><th>Serum</th><th>Pet Points</th><th>SVS Points</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
      <aside class="calc-panel">
        <h3>Totals</h3>
        ${summaryCards(totalCards.length ? totalCards : [{ label: 'Items', value: 'No pet upgrades selected' }])}
      </aside>
    </div>
  `;
}
