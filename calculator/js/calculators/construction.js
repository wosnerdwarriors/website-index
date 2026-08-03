import { addTotals, applyValeriaBonus, compactTotals, escapeHtml, formatDuration, formatNumber, stateInput, stateSelect, summaryCards, titleCaseKey, valeriaS1Field, validationMessages } from './utils.js?v=20260715-valeria-s1';

const YES_NO = [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }];
const DISCOUNTED_RESOURCES = ['meat', 'wood', 'coal', 'iron'];
const SVS_POINTS_PER_SPEEDUP_MINUTE = 30;

const FURNACE_FIRE_CRYSTAL_GROUPS = [
  [132, 0, 132, 0, 67000000, 67000000, 13000000, 3300000, 604800],
  [158, 0, 158, 0, 72000000, 72000000, 14000000, 3600000, 777600],
  [238, 0, 238, 0, 79000000, 79000000, 15000000, 3900000, 950400],
  [280, 0, 280, 0, 82000000, 82000000, 16000000, 4100000, 1036800],
  [335, 0, 335, 0, 84000000, 84000000, 16000000, 4200000, 1209600],
  [200, 10, 100, 20, 96000000, 96000000, 19000000, 4800000, 1296000],
  [240, 15, 120, 30, 100000000, 100000000, 21000000, 5400000, 1555200],
  [240, 20, 120, 40, 130000000, 130000000, 26000000, 6600000, 1728000],
  [280, 30, 280, 60, 140000000, 140000000, 29000000, 7200000, 1123200],
  [350, 70, 175, 140, 160000000, 160000000, 33000000, 8400000, 1728000]
];

const EMBASSY_FIRE_CRYSTAL_GROUPS = [
  [33, 0, 33, 0, 13000000, 13000000, 2700000, 679000, 399120], [39, 0, 39, 0, 14000000, 14000000, 2900000, 720000, 513180],
  [59, 0, 59, 0, 15000000, 15000000, 3100000, 790000, 627240], [70, 0, 70, 0, 16000000, 16000000, 3200000, 820000, 684240],
  [83, 0, 83, 0, 16000000, 16000000, 3300000, 840000, 798300], [50, 2, 25, 5, 19900000, 19900000, 3800000, 960000, 855360],
  [60, 3, 30, 7, 21000000, 21000000, 4300000, 1000000, 1026420], [60, 5, 30, 11, 26000000, 26000000, 5300000, 1300000, 1140480],
  [70, 7, 35, 15, 29000000, 29000000, 5800000, 1400000, 741300], [87, 17, 43, 35, 33000000, 33000000, 6700000, 1600000, 1140480]
];

const COMMAND_CENTER_FIRE_CRYSTAL_GROUPS = [
  [26, 0, 26, 0, 20000000, 20000000, 4000000, 1000000, 72570], [31, 0, 31, 0, 21000000, 21000000, 4300000, 1000000, 93300],
  [47, 0, 47, 0, 23000000, 23000000, 4700000, 1100000, 114000], [56, 0, 56, 0, 24000000, 24000000, 4900000, 1200000, 124380],
  [67, 0, 67, 0, 25000000, 25000000, 5000000, 1200000, 145860], [40, 2, 20, 4, 29000000, 29000000, 5800000, 1400000, 155520],
  [48, 3, 24, 6, 32000000, 32000000, 6500000, 1500000, 178200], [48, 4, 24, 8, 39000000, 39000000, 7900000, 1900000, 207360],
  [56, 6, 28, 12, 43000000, 43000000, 8700000, 2100000, 134760], [70, 14, 35, 28, 50000000, 50000000, 10000000, 2500000, 207360]
];

const INFIRMARY_FIRE_CRYSTAL_GROUPS = [
  [26, 0, 26, 0, 16000000, 16000000, 3300000, 840000, 84660], [31, 0, 31, 0, 18000000, 18000000, 3600000, 900000, 108840],
  [47, 0, 47, 0, 19000000, 19000000, 3900000, 990000, 133020], [56, 0, 56, 0, 20000000, 20000000, 4100000, 1000000, 145140],
  [67, 0, 67, 0, 21000000, 21000000, 4200000, 1000000, 169320], [40, 2, 20, 4, 24000000, 24000000, 4800000, 1200000, 181440],
  [48, 3, 24, 6, 27000000, 27000000, 5400000, 1300000, 217680], [48, 4, 24, 8, 33000000, 33000000, 6600000, 1600000, 217680],
  [56, 6, 28, 12, 36000000, 36000000, 7200000, 1800000, 157200], [70, 14, 35, 28, 42000000, 42000000, 8400000, 2100000, 241920]
];

const CAMP_FIRE_CRYSTAL_GROUPS = [
  [59, 0, 59, 0, 23000000, 23000000, 4700000, 1100000, 90720], [71, 0, 71, 0, 25000000, 25000000, 5000000, 1200000, 116640],
  [107, 0, 107, 0, 27000000, 27000000, 5500000, 1300000, 142560], [126, 0, 126, 0, 28000000, 28000000, 5700000, 1400000, 155520],
  [150, 0, 150, 0, 29000000, 29000000, 5900000, 1400000, 181440], [90, 4, 45, 9, 33000000, 33000000, 6700000, 1600000, 194400],
  [108, 6, 54, 13, 38000000, 38000000, 7600000, 1900000, 233280], [108, 9, 54, 19, 46000000, 46000000, 9300000, 2300000, 259200],
  [126, 13, 63, 27, 50000000, 50000000, 10000000, 2500000, 168480], [157, 31, 78, 63, 59000000, 59000000, 11000000, 2900000, 259200]
];

const FIRE_CRYSTAL_GROUPS_BY_BUILDING = {
  Furnace: FURNACE_FIRE_CRYSTAL_GROUPS,
  Embassy: EMBASSY_FIRE_CRYSTAL_GROUPS,
  'Command Center': COMMAND_CENTER_FIRE_CRYSTAL_GROUPS,
  Infirmary: INFIRMARY_FIRE_CRYSTAL_GROUPS,
  'Infantry Camp': CAMP_FIRE_CRYSTAL_GROUPS,
  'Lancer Camp': CAMP_FIRE_CRYSTAL_GROUPS,
  'Marksman Camp': CAMP_FIRE_CRYSTAL_GROUPS
};

function fireCrystalLevels(groups) {
  return groups.flatMap((cost, groupIndex) => {
    const currentLabel = groupIndex === 0 ? '30' : `FC${groupIndex}`;
    return Array.from({ length: 5 }, (_, stageIndex) => {
      const isCompletedTier = stageIndex === 4;
      return {
        level: 31 + (groupIndex * 5) + stageIndex,
        label: isCompletedTier ? `FC${groupIndex + 1}` : `${currentLabel}-${stageIndex + 1}`,
        meat: cost[4],
        wood: cost[5],
        coal: cost[6],
        iron: cost[7],
        fireCrystals: isCompletedTier ? cost[2] : cost[0],
        refinedFireCrystals: isCompletedTier ? cost[3] : cost[1],
        seconds: cost[8],
        prerequisites: {}
      };
    });
  });
}

function levelsForBuilding(building, levels) {
  const groups = FIRE_CRYSTAL_GROUPS_BY_BUILDING[building];
  return groups ? [...levels, ...fireCrystalLevels(groups)] : levels;
}

function levelOptions(levels) {
  return levels.filter((level) => level.level > 0).map((level) => ({
    value: level.level,
    label: level.label || String(level.level)
  }));
}

function asBoolean(value) {
  return value === true || value === 'true';
}

function asPercent(value) {
  return Number(value || 0) / 100;
}

export function defaultState(data) {
  const buildings = {};
  Object.entries(data.buildingLevels || {}).forEach(([name, levels]) => {
    levels = levelsForBuilding(name, levels);
    const first = levels.find((row) => row.level > 0)?.level ?? 1;
    buildings[name] = { current: first, desired: first };
  });
  const settings = data.settings || {};
  return {
    constructionSpeedPercent: Number(settings.constructionSpeed || 0) * 100,
    supremePresidency: Boolean(settings.supremePresidency),
    mercantilism: Boolean(settings.mercantilism),
    vicePresident: Boolean(settings.vicePresident),
    buildersAidePercent: Number(settings.buildersAide || 0) * 100,
    zinmanPercent: Number(settings.zinman || 0) * 100,
    doubleTime: Number(settings.doubleTime || 0) > 0,
    buildings
  };
}

export function clearState(data) {
  const state = defaultState(data);
  state.constructionSpeedPercent = 0;
  state.supremePresidency = false;
  state.mercantilism = false;
  state.vicePresident = false;
  state.buildersAidePercent = 0;
  state.zinmanPercent = 0;
  state.doubleTime = false;
  return state;
}

function prerequisitesFor(levels, current, desired) {
  const requirements = [];
  levels
    .filter((level) => level.level > current && level.level <= desired)
    .forEach((level) => Object.entries(level.prerequisites || {}).forEach(([building, requiredLevel]) => {
      requirements.push({ building, requiredLevel, level: level.level });
    }));
  return requirements;
}

export function calculate(data, state, shared = {}) {
  const totals = {};
  let rawSeconds = 0;
  const warnings = [];
  const rows = [];
  Object.entries(data.buildingLevels || {}).forEach(([building, levels]) => {
    levels = levelsForBuilding(building, levels);
    const config = state.buildings?.[building] || {};
    const min = levels.find((level) => level.level > 0)?.level ?? 1;
    const max = levels.at(-1)?.level ?? min;
    const current = Number(config.current ?? min);
    const desired = Number(config.desired ?? current);
    if (current < min || current > max || desired < min || desired > max) {
      warnings.push(`${building} must stay between levels ${min} and ${max}.`);
    }
    if (desired < current) warnings.push(`${building}: desired level cannot be below current level.`);
    const selected = levels.filter((level) => level.level > current && level.level <= desired);
    const rowTotals = {};
    let rowSeconds = 0;
    selected.forEach((level) => {
      addTotals(rowTotals, level);
      rowSeconds += Number(level.seconds || 0);
    });
    addTotals(totals, rowTotals);
    rawSeconds += rowSeconds;
    prerequisitesFor(levels, current, desired).forEach(({ building: prerequisite, requiredLevel, level }) => {
      const planned = Number(state.buildings?.[prerequisite]?.desired ?? 0);
      if (planned < requiredLevel) {
        warnings.push(`${building} level ${level} requires ${prerequisite} level ${requiredLevel}.`);
      }
    });
    rows.push({ building, current, desired, min, max, options: levelOptions(levels), levels: selected.length, seconds: rowSeconds, totals: compactTotals(rowTotals) });
  });
  const speedBonus = asPercent(state.constructionSpeedPercent)
    + (asBoolean(state.mercantilism) ? 0.1 : 0)
    + (asBoolean(state.vicePresident) ? (asBoolean(state.supremePresidency) ? 0.15 : 0.1) : 0)
    + asPercent(state.buildersAidePercent);
  // Keep older saved plans compatible with the former percentage input.
  const doubleTimeActive = state.doubleTime === undefined
    ? asPercent(state.doubleTimePercent) > 0
    : asBoolean(state.doubleTime);
  const doubleTimeReduction = doubleTimeActive ? Number(data.settings?.doubleTime || 0.2) : 0;
  const adjustedSeconds = (rawSeconds / Math.max(1, 1 + speedBonus)) * Math.max(0, 1 - doubleTimeReduction);
  const svsPoints = applyValeriaBonus((adjustedSeconds / 60) * SVS_POINTS_PER_SPEEDUP_MINUTE, shared.valeriaS1Percent);
  const zinmanMultiplier = Math.max(0, 1 - asPercent(state.zinmanPercent));
  DISCOUNTED_RESOURCES.forEach((resource) => {
    if (totals[resource]) totals[resource] *= zinmanMultiplier;
  });
  return { totals: compactTotals(totals), rawSeconds, adjustedSeconds, svsPoints, rows, warnings };
}

export function render(data, state, shared = {}) {
  const result = calculate(data, state, shared);
  const buildingRows = result.rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.building)}</td>
      <td>${stateSelect(`construction.buildings.${row.building}.current`, row.current, row.options, `${row.building} current level`)}</td>
      <td>${stateSelect(`construction.buildings.${row.building}.desired`, row.desired, row.options, `${row.building} desired level`)}</td>
      <td>${formatNumber(row.levels)}</td>
      <td>${formatDuration(row.seconds)}</td>
    </tr>
  `).join('');
  const resourceCards = Object.entries(result.totals).map(([key, value]) => ({ label: titleCaseKey(key), value: formatNumber(value) }));
  return `
    <div class="calc-grid two-column">
      <section class="calc-panel">
        <h2>Construction Planner</h2>
        <div class="input-grid">
          <div class="field"><label>Construction speed %</label>${stateInput('construction.constructionSpeedPercent', state.constructionSpeedPercent, { step: 0.1, max: 1000 })}</div>
          <div class="field"><label>Supreme Presidency</label>${stateSelect('construction.supremePresidency', String(asBoolean(state.supremePresidency)), YES_NO)}</div>
          <div class="field"><label>Mercantilism</label>${stateSelect('construction.mercantilism', String(asBoolean(state.mercantilism)), YES_NO)}</div>
          <div class="field"><label>Vice President</label>${stateSelect('construction.vicePresident', String(asBoolean(state.vicePresident)), YES_NO)}</div>
          <div class="field"><label>Builder's Aide %</label>${stateInput('construction.buildersAidePercent', state.buildersAidePercent, { step: 0.1, max: 100 })}</div>
          <div class="field"><label>Zinman's Resourceful %</label>${stateSelect('construction.zinmanPercent', state.zinmanPercent, [3, 6, 9, 12, 15].map((value) => ({ value, label: `${value}%` })))}</div>
          <div class="field"><label>Double Time</label>${stateSelect('construction.doubleTime', String(state.doubleTime === undefined ? asPercent(state.doubleTimePercent) > 0 : asBoolean(state.doubleTime)), YES_NO)}</div>
          ${valeriaS1Field(shared.valeriaS1Percent)}
        </div>
        ${validationMessages(result.warnings)}
        <div class="data-table-wrapper mt-4">
          <table class="data-table">
            <thead><tr><th>Building</th><th>Current</th><th>Desired</th><th>Levels</th><th>Raw Time</th></tr></thead>
            <tbody>${buildingRows}</tbody>
          </table>
        </div>
      </section>
      <aside class="calc-panel">
        <h3>Totals</h3>
        ${summaryCards([
          { label: 'Raw Time', value: formatDuration(result.rawSeconds) },
          { label: 'Adjusted Time', value: formatDuration(result.adjustedSeconds) },
          { label: 'SVS Points', value: formatNumber(result.svsPoints) }
        ])}
        <h3 class="mt-4">Resources</h3>
        ${summaryCards(resourceCards.length ? resourceCards : [{ label: 'Resources', value: 'No upgrades selected' }])}
      </aside>
    </div>
  `;
}
