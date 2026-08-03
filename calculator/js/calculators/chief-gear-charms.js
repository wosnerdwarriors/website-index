import { addTotals, applyValeriaBonus, compactTotals, escapeHtml, formatNumber, stateSelect, summaryCards, titleCaseKey, valeriaS1Field, validationMessages } from './utils.js?v=20260715-valeria-s1';

const TROOP_TYPE_BY_PIECE = {
  Hat: 'lancer',
  Watch: 'lancer',
  Coat: 'infantry',
  Pants: 'infantry',
  Ring: 'marksman',
  Cudgel: 'marksman'
};

export function defaultState(data) {
  const gear = {};
  (data.gearPieces || []).forEach((piece) => {
    gear[piece] = { current: 1, desired: Math.min(2, data.gearLevels?.at(-1)?.id || 1) };
  });
  const charms = {};
  (data.gearPieces || []).forEach((piece) => {
    charms[piece] = {};
    (data.charmSlots || []).forEach((slot) => {
      charms[piece][slot] = { current: 0, desired: 0 };
    });
  });
  return { gear, charms };
}

export function clearState(data) {
  const state = defaultState(data);
  Object.keys(state.gear).forEach((piece) => {
    state.gear[piece].desired = state.gear[piece].current;
  });
  return state;
}

function sumRange(levels, current, desired, idKey) {
  const totals = {};
  levels
    .filter((level) => Number(level[idKey]) > Number(current) && Number(level[idKey]) <= Number(desired))
    .forEach((level) => addTotals(totals, level));
  return compactTotals(totals);
}

export function calculate(data, state, shared = {}) {
  const gearTotals = {};
  const charmTotals = {};
  const warnings = [];
  const gearMax = Number(data.gearLevels?.at(-1)?.id || 1);
  const charmMax = Number(data.charmLevels?.at(-1)?.level || 0);
  const gearRows = (data.gearPieces || []).map((piece) => {
    const item = state.gear?.[piece] || {};
    if (Number(item.current) < 1 || Number(item.current) > gearMax || Number(item.desired) < 1 || Number(item.desired) > gearMax) warnings.push(`${piece} gear must stay between 1 and ${gearMax}.`);
    if (Number(item.desired) < Number(item.current)) warnings.push(`${piece} gear: desired level cannot be below current level.`);
    const totals = sumRange(data.gearLevels || [], item.current || 0, item.desired || 0, 'id');
    addTotals(gearTotals, totals);
    return { piece, current: item.current || 0, desired: item.desired || 0, totals };
  });
  const charmRows = [];
  (data.gearPieces || []).forEach((piece) => {
    (data.charmSlots || []).forEach((slot, slotIndex) => {
      const item = state.charms?.[piece]?.[slot] || {};
      if (Number(item.current) < 0 || Number(item.current) > charmMax || Number(item.desired) < 0 || Number(item.desired) > charmMax) warnings.push(`${piece} ${slot} charm must stay between 0 and ${charmMax}.`);
      if (Number(item.desired) < Number(item.current)) warnings.push(`${piece} ${slot} charm: desired level cannot be below current level.`);
      const totals = sumRange(data.charmLevels || [], item.current || 0, item.desired || 0, 'level');
      addTotals(charmTotals, totals);
      const troopType = TROOP_TYPE_BY_PIECE[piece] || piece;
      charmRows.push({ piece, slot, type: `${troopType}-${slotIndex + 1}`, current: item.current || 0, desired: item.desired || 0, totals });
    });
  });
  const compactGearTotals = compactTotals(gearTotals);
  const compactCharmTotals = compactTotals(charmTotals);
  if (compactGearTotals.svsPoints) compactGearTotals.svsPoints = applyValeriaBonus(compactGearTotals.svsPoints, shared.valeriaS1Percent);
  if (compactCharmTotals.svsPoints) compactCharmTotals.svsPoints = applyValeriaBonus(compactCharmTotals.svsPoints, shared.valeriaS1Percent);
  return {
    gearTotals: compactGearTotals,
    charmTotals: compactCharmTotals,
    gearRows,
    charmRows,
    gearMax,
    charmMax,
    warnings
  };
}

export function render(data, state, shared = {}) {
  const result = calculate(data, state, shared);
  const gearOptions = (data.gearLevels || []).map((level) => ({ value: level.id, label: level.name }));
  const charmOptions = [{ value: 0, label: 'Level 0' }, ...(data.charmLevels || []).map((level) => ({ value: level.level, label: `Level ${level.level}` }))];
  const gearRows = result.gearRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.piece)}</td>
      <td>${stateSelect(`chief-gear-charms.gear.${row.piece}.current`, row.current, gearOptions, `${row.piece} gear current level`)}</td>
      <td>${stateSelect(`chief-gear-charms.gear.${row.piece}.desired`, row.desired, gearOptions, `${row.piece} gear desired level`)}</td>
      <td>${formatNumber(row.totals.alloy || 0)}</td>
      <td>${formatNumber(row.totals.polish || 0)}</td>
      <td>${formatNumber(row.totals.plans || 0)}</td>
      <td>${formatNumber(row.totals.amber || 0)}</td>
    </tr>
  `).join('');
  const charmRows = result.charmRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.piece)}</td>
      <td>${escapeHtml(row.type)}</td>
      <td>${stateSelect(`chief-gear-charms.charms.${row.piece}.${row.slot}.current`, row.current, charmOptions, `${row.type} charm current level`)}</td>
      <td>${stateSelect(`chief-gear-charms.charms.${row.piece}.${row.slot}.desired`, row.desired, charmOptions, `${row.type} charm desired level`)}</td>
      <td>${formatNumber(row.totals.guides || 0)}</td>
      <td>${formatNumber(row.totals.designs || 0)}</td>
      <td>${formatNumber(row.totals.secrets || 0)}</td>
    </tr>
  `).join('');
  const cards = [
    ...Object.entries(result.gearTotals).map(([key, value]) => ({ label: `Gear ${key === 'svsPoints' ? 'SVS Points' : titleCaseKey(key)}`, value: formatNumber(value) })),
    ...Object.entries(result.charmTotals).map(([key, value]) => ({ label: `Charm ${key === 'svsPoints' ? 'SVS Points' : titleCaseKey(key)}`, value: formatNumber(value) }))
  ];
  return `
    <div class="calc-grid two-column">
      <section class="calc-panel">
        <h2>Chief Gear & Charms</h2>
        <div class="input-grid">${valeriaS1Field(shared.valeriaS1Percent)}</div>
        ${validationMessages(result.warnings)}
        <h3>Chief Gear</h3>
        <div class="data-table-wrapper sticky-table-wrapper">
          <table class="data-table chief-gear-table">
            <thead><tr><th>Piece</th><th>Current</th><th>Desired</th><th>Alloy</th><th>Polish</th><th>Plans</th><th>Amber</th></tr></thead>
            <tbody>${gearRows}</tbody>
          </table>
        </div>
        <h3 class="mt-4">Charms</h3>
        <div class="data-table-wrapper sticky-table-wrapper">
          <table class="data-table">
            <thead><tr><th>Piece</th><th>Type</th><th>Current</th><th>Desired</th><th>Guides</th><th>Designs</th><th>Secrets</th></tr></thead>
            <tbody>${charmRows}</tbody>
          </table>
        </div>
      </section>
      <aside class="calc-panel">
        <h3>Totals</h3>
        ${summaryCards(cards.length ? cards : [{ label: 'Cost', value: 'No upgrades selected' }])}
      </aside>
    </div>
  `;
}
