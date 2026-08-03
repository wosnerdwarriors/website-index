import { addTotals, applyValeriaBonus, compactTotals, escapeHtml, formatNumber, stateInput, summaryCards, titleCaseKey, valeriaS1Field, validationMessages } from './utils.js?v=20260715-valeria-s1';

const ESSENCE_STONE_SVS_POINTS = 4000;
const MITHRIL_SVS_POINTS = 144000;

function flattenedRows(data) {
  return (data.gearSets || []).flatMap((set) => (set.rows || []).map((row) => ({ ...row, set: set.name })));
}

export function defaultState(data) {
  return {
    rows: flattenedRows(data).map((row) => ({
      current: row.current ?? 0,
      desired: row.desired ?? row.current ?? 0,
      masteryCurrent: row.masteryCurrent ?? 0,
      masteryDesired: row.masteryDesired ?? row.masteryCurrent ?? 0,
      reforgeXp: row.reforgeXp ?? 0
    }))
  };
}

export function clearState(data) {
  return {
    rows: flattenedRows(data).map(() => ({
      current: 0,
      desired: 0,
      masteryCurrent: 0,
      masteryDesired: 0,
      reforgeXp: 0
    }))
  };
}

function rangeTotals(costs, current, desired) {
  return (costs || [])
    .filter((cost) => cost.level > current && cost.level <= desired)
    .reduce((totals, cost) => addTotals(totals, cost), {});
}

export function calculate(data, state = defaultState(data), shared = {}) {
  const totals = {};
  const warnings = [];
  const rows = flattenedRows(data).map((source, index) => {
    const saved = state.rows?.[index] || {};
    const current = Number(saved.current ?? source.current ?? 0);
    const desired = Number(saved.desired ?? current);
    const masteryCurrent = Number(saved.masteryCurrent ?? source.masteryCurrent ?? 0);
    const masteryDesired = Number(saved.masteryDesired ?? masteryCurrent);
    const reforgeXp = Number(saved.reforgeXp ?? source.reforgeXp ?? 0);
    if (current < 0 || current > 200 || desired < 0 || desired > 200) warnings.push(`${source.gear}: gear levels must stay between 0 and 200.`);
    if (masteryCurrent < 0 || masteryCurrent > 20 || masteryDesired < 0 || masteryDesired > 20) warnings.push(`${source.gear}: mastery levels must stay between 0 and 20.`);
    if (desired < current) warnings.push(`${source.gear}: desired gear level cannot be below current.`);
    if (masteryDesired < masteryCurrent) warnings.push(`${source.gear}: desired mastery cannot be below current.`);
    const gearCosts = rangeTotals(data.costs?.base, current, desired);
    const masteryCosts = rangeTotals(data.costs?.mastery, masteryCurrent, masteryDesired);
    if (gearCosts.xp) {
      gearCosts.heroGearXp = gearCosts.xp;
      delete gearCosts.xp;
    }
    const combined = {};
    addTotals(combined, gearCosts);
    addTotals(combined, masteryCosts);
    addTotals(totals, combined);
    const svsPoints = applyValeriaBonus(
      (Number(combined.essenceStones || 0) * ESSENCE_STONE_SVS_POINTS)
        + (Number(combined.mithril || 0) * MITHRIL_SVS_POINTS),
      shared.valeriaS1Percent
    );
    return { ...source, current, desired, masteryCurrent, masteryDesired, reforgeXp, totals: compactTotals(combined), svsPoints };
  });
  totals.reforgeXp = rows.reduce((sum, row) => sum + Math.max(0, row.reforgeXp), 0);
  totals.svsPoints = applyValeriaBonus(
    (Number(totals.essenceStones || 0) * ESSENCE_STONE_SVS_POINTS)
      + (Number(totals.mithril || 0) * MITHRIL_SVS_POINTS),
    shared.valeriaS1Percent
  );
  return { rows, totals: compactTotals(totals), warnings };
}

export function render(data, state, shared = {}) {
  const result = calculate(data, state, shared);
  const sections = (data.gearSets || []).map((set) => {
    const rows = result.rows.filter((row) => row.set === set.name).map((row) => `
      <tr>
        <td>${escapeHtml(row.gear)}</td>
        <td>${stateInput(`hero-gear.rows.${result.rows.indexOf(row)}.current`, row.current, { max: 200, ariaLabel: `${row.gear} current gear level` })}</td>
        <td>${stateInput(`hero-gear.rows.${result.rows.indexOf(row)}.desired`, row.desired, { max: 200, ariaLabel: `${row.gear} desired gear level` })}</td>
        <td>${formatNumber(row.totals.heroGearXp || 0)}</td>
        <td>${formatNumber(row.totals.mythicGear || 0)}</td>
        <td>${formatNumber(row.totals.mithril || 0)}</td>
        <td>${stateInput(`hero-gear.rows.${result.rows.indexOf(row)}.masteryCurrent`, row.masteryCurrent, { max: 20, ariaLabel: `${row.gear} current mastery level` })}</td>
        <td>${stateInput(`hero-gear.rows.${result.rows.indexOf(row)}.masteryDesired`, row.masteryDesired, { max: 20, ariaLabel: `${row.gear} desired mastery level` })}</td>
        <td>${formatNumber(row.totals.essenceStones || 0)}</td>
        <td>${formatNumber(row.svsPoints)}</td>
        <td>${stateInput(`hero-gear.rows.${result.rows.indexOf(row)}.reforgeXp`, row.reforgeXp, { ariaLabel: `${row.gear} reforge XP on hand` })}</td>
      </tr>
    `).join('');
    return `
      <h3 class="mt-4">${escapeHtml(set.name)}</h3>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>Gear</th><th>Current</th><th>Desired</th><th>Gear XP</th><th>Mythic Gear</th><th>Mithril</th><th>Mastery Current</th><th>Mastery Desired</th><th>Essence Stones</th><th>SVS Points</th><th>Reforge XP on Hand</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }).join('');
  const cards = Object.entries(result.totals).map(([key, value]) => ({
    label: key === 'svsPoints' ? 'SVS Points' : titleCaseKey(key),
    value: formatNumber(value)
  }));
  return `
    <div class="calc-grid two-column">
      <section class="calc-panel">
        <h2>Hero Gear Calculator</h2>
        <p class="text-sm text-gray-600 mb-3">Set current and target gear/mastery levels to price the upgrade. Reforge XP is tracked as inventory because there are no target-reforge inputs.</p>
        <div class="input-grid mb-3">${valeriaS1Field(shared.valeriaS1Percent)}</div>
        ${validationMessages(result.warnings)}
        ${sections}
      </section>
      <aside class="calc-panel">
        <h3>Totals</h3>
        ${summaryCards(cards.length ? cards : [{ label: 'Gear', value: 'No gear rows selected' }])}
        <h3 class="mt-4">Hidden Cost Tables</h3>
        ${summaryCards([
          { label: 'Gear Level Rows', value: formatNumber(data.costs?.base?.length || 0) },
          { label: 'Mastery Level Rows', value: formatNumber(data.costs?.mastery?.length || 0) },
          { label: 'Reforge Level Rows', value: formatNumber(data.costs?.reforge?.length || 0) }
        ])}
      </aside>
    </div>
  `;
}
