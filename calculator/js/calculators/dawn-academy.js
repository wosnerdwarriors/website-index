import { addTotals, applyValeriaBonus, compactTotals, escapeHtml, formatNumber, stateInput, summaryCards, titleCaseKey, valeriaS1Field, validationMessages } from './utils.js?v=20260715-valeria-s1';

const MINUTES_PER_DAY = 24 * 60;
const SVS_POINTS_PER_LEARNING_MINUTE = 30;
const SVS_POINTS_PER_EXPERT_SIGIL = 6000;
const SVS_POINTS_PER_BOOK = 60;

export function defaultState(data) {
  const experts = {};
  Object.keys(data.experts || {}).forEach((name) => {
    experts[name] = { current: 0, desired: 1 };
  });
  return { experts };
}

export function calculate(data, state, shared = {}) {
  const totals = {};
  const rows = [];
  const warnings = [];
  Object.entries(data.experts || {}).forEach(([name, levels]) => {
    const selectedState = state.experts?.[name] || {};
    const current = Number(selectedState.current || 0);
    const desired = Number(selectedState.desired || current);
    const max = levels.at(-1)?.level ?? 0;
    if (current < 0 || current > max || desired < 0 || desired > max) warnings.push(`${name} must stay between 0 and ${max}.`);
    if (desired < current) warnings.push(`${name}: desired level cannot be below current level.`);
    const selected = levels.filter((row) => row.level > current && row.level <= desired);
    const rowTotals = {};
    selected.forEach((row) => addTotals(rowTotals, row));
    addTotals(totals, rowTotals);
    rows.push({ name, current, desired, max, levels: selected.length, totals: compactTotals(rowTotals) });
  });
  const compact = compactTotals(totals);
  const learningMinutes = Number(compact.books || 0) * MINUTES_PER_DAY;
  const baseSvsPoints = (learningMinutes * SVS_POINTS_PER_LEARNING_MINUTE)
    + (Number(compact.sigils || 0) * SVS_POINTS_PER_EXPERT_SIGIL)
    + (Number(compact.xp || 0) * SVS_POINTS_PER_BOOK);
  const svsPoints = applyValeriaBonus(baseSvsPoints, shared.valeriaS1Percent);
  return { totals: compact, rows, learningMinutes, baseSvsPoints, svsPoints, warnings };
}

export function render(data, state, shared = {}) {
  const result = calculate(data, state, shared);
  const rows = result.rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${stateInput(`dawn-academy.experts.${row.name}.current`, row.current, { max: row.max })}</td>
      <td>${stateInput(`dawn-academy.experts.${row.name}.desired`, row.desired, { max: row.max })}</td>
      <td>${formatNumber(row.levels)}</td>
      <td>${formatNumber(row.totals.affinity || 0)}</td>
      <td>${formatNumber(row.totals.sigils || 0)}</td>
      <td>${formatNumber(row.totals.books || 0)}</td>
      <td>${formatNumber(row.totals.xp || 0)}</td>
    </tr>
  `).join('');
  const totalCards = Object.entries(result.totals).map(([key, value]) => ({
    label: titleCaseKey(key),
    value: formatNumber(value)
  }));
  totalCards.unshift({ label: 'SVS Points', value: formatNumber(result.svsPoints) });
  return `
    <div class="calc-grid two-column">
      <section class="calc-panel">
        <h2>Experts</h2>
        <div class="input-grid mb-3">${valeriaS1Field(shared.valeriaS1Percent)}</div>
        ${validationMessages(result.warnings)}
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead><tr><th>Expert</th><th>Current Level</th><th>Desired Level</th><th>Levels</th><th>Affinity</th><th>Sigils</th><th>Books</th><th>XP</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
      <aside class="calc-panel">
        <h3>Totals</h3>
        ${summaryCards(totalCards.length ? totalCards : [{ label: 'Cost', value: 'No upgrade selected' }])}
      </aside>
    </div>
  `;
}
