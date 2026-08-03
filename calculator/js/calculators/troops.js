import { addTotals, applyValeriaBonus, compactTotals, escapeHtml, formatDuration, formatNumber, stateInput, stateSelect, summaryCards, valeriaS1Field, validationMessages } from './utils.js?v=20260715-valeria-s1';

const YES_NO = [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }];
const asBoolean = (value) => value === true || value === 'true';

function trainingBonus(state) {
  return Number(state.trainingSpeedPercent || 0) / 100
    + (asBoolean(state.mobilize) ? 0.3 : 0)
    + (asBoolean(state.ministerOfEducation) ? (asBoolean(state.supremePresidency) ? 0.75 : 0.5) : 0)
    + (asBoolean(state.vicePresident) ? (asBoolean(state.supremePresidency) ? 0.15 : 0.1) : 0);
}

function resourceTotals(row, multiplier) {
  return compactTotals(addTotals({}, { meat: row?.meat, wood: row?.wood, coal: row?.coal, iron: row?.iron }, multiplier));
}

function defaultItem(data, type, quantity) {
  const settings = data.settings || {};
  return {
    tier: settings.highestTier || data.troopCosts?.[type]?.at(-1)?.tier || 1,
    baseTier: settings.baseTier || 1,
    quantity
  };
}

export function defaultState(data) {
  const settings = data.settings || {};
  const quantity = Number(settings.trainingCapacity || 0);
  return {
    mode: 'train',
    items: Object.fromEntries(Object.keys(data.troopCosts || {}).map((type) => [type, defaultItem(data, type, quantity)])),
    trainingSpeedPercent: Number(settings.trainingSpeed || 0) * 100,
    mobilize: Boolean(settings.mobilize),
    supremePresidency: Boolean(settings.supremePresidency),
    ministerOfEducation: Boolean(settings.ministerOfEducation),
    vicePresident: Boolean(settings.vicePresident),
    trainingCapacityBuff: Boolean(settings.trainingCapacityBuff),
    baseTrainingCapacity: quantity
  };
}

export function clearState(data) {
  const state = defaultState(data);
  state.mode = 'train';
  state.trainingSpeedPercent = 0;
  state.mobilize = false;
  state.supremePresidency = false;
  state.ministerOfEducation = false;
  state.vicePresident = false;
  state.trainingCapacityBuff = false;
  state.baseTrainingCapacity = 0;
  state.items = Object.fromEntries(Object.keys(data.troopCosts || {}).map((type) => {
    const firstTier = data.troopCosts[type]?.[0]?.tier ?? 1;
    const firstBaseTier = data.upgradePlans?.[type]?.entries?.[0]?.baseTier ?? firstTier;
    return [type, { tier: firstTier, baseTier: firstBaseTier, quantity: 0 }];
  }));
  return state;
}

function itemStates(data, state) {
  const types = Object.keys(data.troopCosts || {});
  // Old saved plans represented one selected type. Keep that row until the user
  // edits it, while allowing new per-type rows to be added immediately.
  const selectedType = Object.hasOwn(state, 'type')
    ? (data.troopCosts?.[state.type] ? state.type : types[0])
    : null;
  return Object.fromEntries(types.map((type) => [type, {
    ...defaultItem(data, type, 0),
    ...(type === selectedType ? { tier: state.tier, baseTier: state.baseTier, quantity: state.quantity } : {}),
    ...(state.items?.[type] || {})
  }]));
}

function sourceSpeedBonus(data) {
  const settings = data.settings || {};
  return Number(settings.trainingSpeed || 0)
    + (settings.mobilize ? 0.3 : 0)
    + (settings.ministerOfEducation ? (settings.supremePresidency ? 0.75 : 0.5) : 0)
    + (settings.vicePresident ? (settings.supremePresidency ? 0.15 : 0.1) : 0);
}

export function calculate(data, state, shared = {}) {
  const mode = state.mode === 'upgrade' ? 'upgrade' : 'train';
  const items = itemStates(data, state);
  const warnings = [];
  const totals = {};
  const speedBonus = trainingBonus(state);
  const capacity = (Math.max(0, Number(state.baseTrainingCapacity || 0)) + (asBoolean(state.ministerOfEducation) ? 200 : 0))
    * (asBoolean(state.trainingCapacityBuff) ? 3 : 1);
  let rawSeconds = 0;
  let baseSvsPoints = 0;

  const rows = Object.keys(data.troopCosts || {}).map((type) => {
    const config = items[type];
    const costs = data.troopCosts[type] || [];
    const quantity = Math.max(0, Number(config.quantity || 0));
    if (!Number.isInteger(quantity)) warnings.push(`${type}: troop quantity must be a whole number.`);

    if (mode === 'upgrade') {
      const plan = data.upgradePlans?.[type];
      const entry = plan?.entries?.find((item) => Number(item.baseTier) === Number(config.baseTier));
      const targetRow = costs.find((item) => Number(item.tier) === Number(plan?.targetTier));
      const sourceRow = costs.find((item) => Number(item.tier) === Number(config.baseTier));
      if (!entry) {
        if (quantity > 0) warnings.push(`No upgrade plan is available for ${type} tier ${config.baseTier}.`);
        return { type, config, quantity, targetTier: plan?.targetTier, totals: {}, rawSeconds: 0, baseSvsPoints: 0 };
      }
      const multiplier = quantity / Math.max(1, Number(entry.quantity || 1));
      const rowTotals = resourceTotals(entry, multiplier);
      const rowSeconds = Number(entry.adjustedSeconds || 0) * (1 + sourceSpeedBonus(data)) * multiplier;
      const rowPoints = Math.max(0, Number(targetRow?.points || 0) - Number(sourceRow?.points || 0)) * quantity;
      addTotals(totals, rowTotals);
      rawSeconds += rowSeconds;
      baseSvsPoints += rowPoints;
      return { type, config, quantity, targetTier: plan.targetTier, totals: rowTotals, rawSeconds: rowSeconds, baseSvsPoints: rowPoints };
    }

    const troop = costs.find((item) => Number(item.tier) === Number(config.tier)) || costs[0];
    if (!troop && quantity > 0) warnings.push(`No ${type} troop tier ${config.tier} exists in the calculator data.`);
    const rowTotals = resourceTotals(troop, quantity);
    const rowSeconds = Number(troop?.baseSeconds || 0) * quantity;
    const rowPoints = Number(troop?.points || 0) * quantity;
    addTotals(totals, rowTotals);
    rawSeconds += rowSeconds;
    baseSvsPoints += rowPoints;
    return { type, config, quantity, troop, totals: rowTotals, rawSeconds: rowSeconds, baseSvsPoints: rowPoints };
  });

  const points = applyValeriaBonus(baseSvsPoints, shared.valeriaS1Percent);
  const legacyRow = Object.hasOwn(state, 'type') ? rows.find((row) => row.type === state.type) : undefined;
  return {
    mode, rows, totals: compactTotals(totals), baseSvsPoints, svsPoints: points, points,
    rawSeconds, adjustedSeconds: rawSeconds / Math.max(1, 1 + speedBonus), capacity, warnings,
    type: legacyRow?.type, row: legacyRow?.troop, quantity: legacyRow?.quantity, targetTier: legacyRow?.targetTier
  };
}

export function render(data, state, shared = {}) {
  const result = calculate(data, state, shared);
  const troopRows = result.rows.map((row) => {
    const typeLabel = row.type.charAt(0).toUpperCase() + row.type.slice(1);
    const tierControl = result.mode === 'upgrade'
      ? stateSelect(`troops.items.${row.type}.baseTier`, row.config.baseTier, (data.upgradePlans?.[row.type]?.entries || []).map((entry) => ({ value: entry.baseTier, label: `Tier ${entry.baseTier}` })), `${typeLabel} upgrade from tier`)
      : stateSelect(`troops.items.${row.type}.tier`, row.config.tier, (data.troopCosts?.[row.type] || []).map((item) => ({ value: item.tier, label: `Tier ${item.tier}` })), `${typeLabel} tier`);
    const perTroopPoints = row.quantity ? row.baseSvsPoints / row.quantity : (result.mode === 'train' ? row.troop?.points || 0 : 0);
    const perTroopSeconds = row.quantity ? row.rawSeconds / row.quantity : (result.mode === 'train' ? row.troop?.baseSeconds || 0 : 0);
    return `<tr>
      <td>${escapeHtml(typeLabel)}</td>
      <td>${tierControl}${result.mode === 'upgrade' ? `<small class="muted-cell"> → Tier ${escapeHtml(row.targetTier || '—')}</small>` : ''}</td>
      <td>${stateInput(`troops.items.${row.type}.quantity`, row.config.quantity, { min: 0, step: 1, ariaLabel: `${typeLabel} quantity` })}</td>
      <td>${formatNumber(perTroopPoints)}</td><td>${formatNumber(perTroopSeconds)}</td>
      <td>${formatNumber(row.quantity ? (row.totals.meat || 0) / row.quantity : 0)}</td>
      <td>${formatNumber(row.quantity ? (row.totals.wood || 0) / row.quantity : 0)}</td>
      <td>${formatNumber(row.quantity ? (row.totals.coal || 0) / row.quantity : 0)}</td>
      <td>${formatNumber(row.quantity ? (row.totals.iron || 0) / row.quantity : 0)}</td>
    </tr>`;
  }).join('');
  const resourceCards = Object.entries(result.totals).map(([key, value]) => ({ label: key, value: formatNumber(value) }));

  return `
    <div class="calc-grid two-column">
      <section class="calc-panel">
        <h2>Troop Training</h2>
        <div class="input-grid">
          <div class="field"><label>Mode</label>${stateSelect('troops.mode', result.mode, [{ value: 'train', label: 'Train new troops' }, { value: 'upgrade', label: 'Upgrade existing troops' }])}</div>
          <div class="field"><label>Training capacity</label>${stateInput('troops.baseTrainingCapacity', state.baseTrainingCapacity, { min: 0, step: 1 })}</div>
          <div class="field"><label>Capacity buff</label>${stateSelect('troops.trainingCapacityBuff', String(asBoolean(state.trainingCapacityBuff)), YES_NO)}</div>
          <div class="field"><label>Effective capacity</label><input value="${formatNumber(result.capacity)}" disabled></div>
          <div class="field"><label>Training speed %</label>${stateInput('troops.trainingSpeedPercent', state.trainingSpeedPercent, { step: 0.1, max: 1000 })}</div>
          <div class="field"><label>Mobilize</label>${stateSelect('troops.mobilize', String(asBoolean(state.mobilize)), YES_NO)}</div>
          <div class="field"><label>Supreme Presidency</label>${stateSelect('troops.supremePresidency', String(asBoolean(state.supremePresidency)), YES_NO)}</div>
          <div class="field"><label>Minister of Education</label>${stateSelect('troops.ministerOfEducation', String(asBoolean(state.ministerOfEducation)), YES_NO)}</div>
          <div class="field"><label>Vice President</label>${stateSelect('troops.vicePresident', String(asBoolean(state.vicePresident)), YES_NO)}</div>
          ${valeriaS1Field(shared.valeriaS1Percent)}
        </div>
        ${validationMessages(result.warnings)}
        <h3 class="mt-4">Troops</h3>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead><tr><th>Type</th><th>${result.mode === 'upgrade' ? 'Upgrade' : 'Tier'}</th><th>Quantity</th><th>SVS / Troop</th><th>Seconds</th><th>Meat</th><th>Wood</th><th>Coal</th><th>Iron</th></tr></thead>
            <tbody>${troopRows}</tbody>
          </table>
        </div>
      </section>
      <aside class="calc-panel">
        <h3>Totals</h3>
        ${summaryCards([
          { label: 'SVS Points', value: formatNumber(result.svsPoints) },
          { label: 'Raw Time', value: formatDuration(result.rawSeconds) },
          { label: 'Adjusted Time', value: formatDuration(result.adjustedSeconds) },
          ...resourceCards
        ])}
      </aside>
    </div>
  `;
}
