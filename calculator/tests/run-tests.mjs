import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import * as construction from '../js/calculators/construction.js';
import * as chiefGearCharms from '../js/calculators/chief-gear-charms.js';
import * as dawnAcademy from '../js/calculators/dawn-academy.js';
import * as heroGear from '../js/calculators/hero-gear.js';
import * as heroes from '../js/calculators/heroes.js';
import * as pets from '../js/calculators/pets.js';
import * as troops from '../js/calculators/troops.js';
import { hydrateCalculatorState, isStateObject } from '../js/state.js';

async function readJson(path) {
  return JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(Number(actual) - Number(expected)) < 0.0001, `${message}: expected ${expected}, got ${actual}`);
}

const cases = await readJson('./test-cases.json');
const constructionData = await readJson('../data/construction.json');
const chiefGearCharmsData = await readJson('../data/chief-gear-charms.json');
const dawnData = await readJson('../data/dawn-academy.json');
const heroGearData = await readJson('../data/hero-gear.json');
const heroesData = await readJson('../data/heroes.json');
const petsData = await readJson('../data/pets.json');
const troopsData = await readJson('../data/troops.json');
const calculatorSections = [
  { id: 'construction', module: construction },
  { id: 'troops', module: troops }
];

{
  const hydrated = hydrateCalculatorState({ troops: { mode: 'upgrade', quantity: 4321 } }, calculatorSections, {
    construction: constructionData,
    troops: troopsData
  });
  assert.equal(hydrated.troops.mode, 'upgrade', 'Imported section state is kept');
  assert.equal(hydrated.troops.quantity, 4321, 'Imported values are kept');
  assert.deepEqual(hydrated.construction, construction.defaultState(constructionData), 'Missing imported sections receive defaults');
  assert.deepEqual(hydrated.inventory, {}, 'Missing inventory receives an empty default');
  assert.equal(hydrated.valeriaS1Percent, 0, 'Missing Valeria S1 level defaults to zero');
  assert.ok(!isStateObject([]), 'Arrays are not accepted as calculator state');
  assert.ok(!isStateObject(null), 'Null is not accepted as calculator state');
}

{
  const hydrated = hydrateCalculatorState({ inventory: { wood: 12345 } }, calculatorSections, {
    construction: constructionData,
    troops: troopsData
  });
  assert.equal(hydrated.inventory.wood, 12345, 'Imported inventory is preserved');
}

{
  const hydrated = hydrateCalculatorState({ valeriaS1Percent: 12 }, calculatorSections, {
    construction: constructionData,
    troops: troopsData
  });
  assert.equal(hydrated.valeriaS1Percent, 12, 'Valeria S1 level is shared across calculator tabs');
}

{
  const state = construction.defaultState(constructionData);
  state.constructionSpeedPercent = 0;
  state.mercantilism = false;
  state.vicePresident = false;
  state.buildersAidePercent = 0;
  state.zinmanPercent = 0;
  state.doubleTime = false;
  Object.keys(state.buildings).forEach((name) => {
    state.buildings[name] = { current: 1, desired: 1 };
  });
  const testCase = cases.construction;
  state.buildings[testCase.building] = {
    current: testCase.current,
    desired: testCase.desired
  };
  const result = construction.calculate(constructionData, state);
  assert.equal(result.totals.wood, testCase.expected.wood);
  assert.equal(result.rawSeconds, testCase.expected.rawSeconds);
  assert.equal(result.adjustedSeconds, testCase.expected.adjustedSeconds);
}

{
  const state = construction.defaultState(constructionData);
  Object.keys(state.buildings).forEach((name) => {
    state.buildings[name] = { current: 1, desired: 1 };
  });
  state.buildings.Furnace = { current: 1, desired: 3 };
  const result = construction.calculate(constructionData, state);
  assertClose(result.adjustedSeconds, 25.5319148936, 'Construction bonus formula');
  assertClose(result.totals.wood, 837.25, 'Zinman resource reduction');
  const constructionHtml = construction.render(constructionData, state);
  assert.match(constructionHtml, /<select aria-label="Furnace desired level"/, 'Building levels use native dropdowns');
  assert.match(constructionHtml, /<option value="31"[^>]*>30-1<\/option>/, 'Furnace dropdown starts Fire Crystal substages after level 30');
  assert.match(constructionHtml, /<option value="80"[^>]*>FC10<\/option>/, 'Furnace dropdown includes FC10');
  assert.match(constructionHtml, /data-state-path="construction\.zinmanPercent"/, 'Zinman uses a percentage dropdown');
  assert.match(constructionHtml, /<option value="15"[^>]*>15%<\/option>/, 'Zinman dropdown includes 15%');
  assert.match(constructionHtml, /data-state-path="construction\.doubleTime"/, 'Double Time uses a boolean dropdown');
  assert.match(constructionHtml, /SVS Points/, 'Construction totals show SVS points');
  assert.doesNotMatch(constructionHtml, /Data Version|Last Updated/, 'Construction totals omit data metadata');
}

{
  const state = chiefGearCharms.defaultState(chiefGearCharmsData);
  Object.keys(state.gear).forEach((piece) => {
    state.gear[piece] = { current: 1, desired: 1 };
  });
  state.gear.Hat = { current: 1, desired: 2 };
  const result = chiefGearCharms.calculate(chiefGearCharmsData, state);
  assert.equal(result.gearTotals.alloy, cases.chiefGear.expected.alloy);
  assert.equal(result.gearTotals.polish, cases.chiefGear.expected.polish);
  assert.equal(result.gearTotals.svsPoints, cases.chiefGear.expected.svsPoints);
  const html = chiefGearCharms.render(chiefGearCharmsData, state);
  assert.match(html, /<select aria-label="Hat gear desired level"/, 'Chief gear levels use native dropdowns');
  assert.match(html, /<option value="25"[^>]*>Mythic T2 \(1-Star\)<\/option>/, 'Chief gear labels omit internal numeric IDs');
  assert.doesNotMatch(html, />25 — Mythic T2/, 'Chief gear dropdown does not prefix labels with IDs');
  assert.match(html, /<th>Type<\/th>/, 'Charm table labels troop type instead of slot');
  assert.match(html, /lancer-1/, 'Hat charms use lancer troop-type labels');
  assert.match(html, /<select aria-label="lancer-1 charm desired level"/, 'Charm levels use native dropdowns');
  assert.equal((html.match(/sticky-table-wrapper/g) || []).length, 2, 'Chief gear and charm tables use bounded sticky-header wrappers');
}

{
  const state = dawnAcademy.defaultState(dawnData);
  Object.keys(state.experts).forEach((name) => {
    state.experts[name] = { current: 0, desired: 0 };
  });
  const testCase = cases.dawnAcademy;
  state.experts[testCase.expert] = {
    current: testCase.current,
    desired: testCase.desired
  };
  const result = dawnAcademy.calculate(dawnData, state);
  assert.equal(result.totals.affinity, testCase.expected.affinity);
  assertClose(result.totals.books, testCase.expected.books, 'Dawn Academy books');
  assertClose(result.totals.xp, testCase.expected.xp, 'Dawn Academy XP');
  const expectedExpertSvsPoints = (result.totals.books * 24 * 60 * 30)
    + (result.totals.sigils || 0) * 6000
    + (result.totals.xp || 0) * 60;
  assertClose(result.svsPoints, expectedExpertSvsPoints, 'Experts SVS points use learning time, sigils, and books');
  assertClose(dawnAcademy.calculate(dawnData, state, { valeriaS1Percent: 20 }).svsPoints, expectedExpertSvsPoints * 1.2, 'Valeria boosts Experts SVS points');
  const html = dawnAcademy.render(dawnData, state);
  assert.match(html, /<h2>Experts<\/h2>/, 'Dawn Academy panel is renamed Experts');
  assert.match(html, /aria-label="Valeria S1 level"/, 'Experts exposes the shared Valeria S1 control');
}

{
  const state = pets.defaultState(petsData);
  const testCase = cases.pets;
  const index = state.items.findIndex((_, itemIndex) => pets.calculate(petsData, state).rows[itemIndex]?.name === testCase.pet);
  assert.notEqual(index, -1, 'Pet test case exists');
  state.items[index] = { current: 0, desired: 100.1 };
  const result = pets.calculate(petsData, state);
  assert.equal(result.rows[index].totals.food, testCase.expected.food);
  assert.equal(result.rows[index].totals.manuals, testCase.expected.manuals);
  assert.equal(result.rows[index].totals.potions, testCase.expected.potions);
  assert.equal(result.rows[index].totals.serum, testCase.expected.serum);
  assert.equal(result.rows[index].svsPoints, (result.rows[index].totals.points || 0) * 50, 'Pet points convert to SVS points');
  const valeriaResult = pets.calculate(petsData, state, { valeriaS1Percent: 20 });
  assertClose(valeriaResult.rows[index].svsPoints, result.rows[index].svsPoints * 1.2, 'Valeria boosts pet SVS points');
}

{
  const state = pets.defaultState(petsData);
  const index = pets.calculate(petsData, state).rows.findIndex((row) => row.name === 'Frostscale Chameleon');
  state.items[index] = { current: 50, desired: 50.1 };
  const result = pets.calculate(petsData, state).rows[index];
  assert.equal(result.totals.manuals, 220);
  assert.equal(result.totals.potions, 50);
  assert.equal(result.totals.serum, 10);
}

{
  const result = troops.calculate(troopsData, cases.troops.state);
  assert.equal(result.totals.meat, cases.troops.expected.meat);
  assert.equal(result.totals.wood, cases.troops.expected.wood);
  assert.equal(result.points, cases.troops.expected.points);
  assert.equal(result.rawSeconds, cases.troops.expected.rawSeconds);
}

{
  const state = troops.defaultState(troopsData);
  Object.values(state.items).forEach((item) => { item.quantity = 0; });
  state.items.infantry = { tier: 10, baseTier: 9, quantity: 100 };
  state.items.lancer = { tier: 9, baseTier: 8, quantity: 200 };
  state.items.marksman = { tier: 8, baseTier: 7, quantity: 300 };
  const result = troops.calculate(troopsData, state);
  assert.equal(result.rows.length, 3, 'All three troop types are calculated together');
  assert.equal(result.baseSvsPoints, (60 * 100) + (45 * 200) + (35 * 300));
  assert.equal(troops.calculate(troopsData, state, { valeriaS1Percent: 10 }).svsPoints, result.baseSvsPoints * 1.1, 'Valeria boosts troop SVS points');
  const html = troops.render(troopsData, state);
  assert.match(html, /data-state-path="troops\.baseTrainingCapacity"/, 'Training capacity is editable');
  assert.match(html, /aria-label="Infantry quantity"/, 'Infantry has its own quantity');
  assert.match(html, /aria-label="Lancer quantity"/, 'Lancer has its own quantity');
  assert.match(html, /aria-label="Marksman quantity"/, 'Marksman has its own quantity');
}

{
  const state = { ...cases.troops.state, items: { lancer: { tier: 10, baseTier: 9, quantity: 500 } } };
  const result = troops.calculate(troopsData, state);
  assert.equal(result.rows.find((row) => row.type === state.type).quantity, state.quantity, 'Legacy selected troop plan is preserved');
  assert.equal(result.rows.find((row) => row.type === 'lancer').quantity, 500, 'A legacy plan accepts additional troop types');
}

{
  const state = troops.defaultState(troopsData);
  Object.values(state.items).forEach((item) => { item.quantity = 0; });
  state.items.infantry.tier = 10;
  state.items.infantry.quantity = 1000;
  const result = troops.calculate(troopsData, state);
  assertClose(result.adjustedSeconds, 54285.71428571429, 'Troop speed formula');
  assert.equal(result.totals.points, undefined, 'Points are not duplicated in resources');
}

{
  const state = troops.defaultState(troopsData);
  state.mode = 'upgrade';
  Object.values(state.items).forEach((item) => { item.quantity = 0; });
  state.items.infantry.baseTier = 10;
  state.items.infantry.quantity = 10164;
  const result = troops.calculate(troopsData, state);
  assert.equal(result.rows.find((row) => row.type === 'infantry').targetTier, 11);
  assert.equal(result.totals.meat, 42505848);
  assertClose(result.adjustedSeconds, 101640, 'Troop upgrade time');
}

{
  const result = heroGear.calculate(heroGearData);
  assert.equal(heroGearData.gearSets.length, cases.heroGear.expected.gearSets);
  assert.equal(result.totals.heroGearXp, cases.heroGear.expected.heroGearXp);
  assert.equal(result.totals.essenceStones, cases.heroGear.expected.essenceStones);
  assert.equal(result.totals.reforgeXp, 879840);
  const expectedSvsPoints = (result.totals.essenceStones * 4000) + (result.totals.mithril * 144000);
  assert.equal(result.totals.svsPoints, expectedSvsPoints, 'Hero gear SVS points use Essence Stone and Mithril rates');
  assert.equal(heroGear.calculate(heroGearData, undefined, { valeriaS1Percent: 20 }).totals.svsPoints, expectedSvsPoints * 1.2, 'Valeria boosts hero gear SVS points');
  const html = heroGear.render(heroGearData, heroGear.defaultState(heroGearData));
  assert.match(html, /<th>SVS Points<\/th>/, 'Hero gear rows show SVS points');
  assert.match(html, /aria-label="Valeria S1 level"/, 'Hero gear includes the shared Valeria control');
}

{
  const result = heroes.calculate(heroesData, heroes.defaultState(heroesData));
  assert.equal(heroesData.heroRows.length, cases.heroes.expected.heroRows);
  assert.equal(result.totals.shardCost, cases.heroes.expected.shardCost);
  assert.equal(result.totals.generalNeeded, cases.heroes.expected.generalNeeded);
  assert.equal(result.totals.widgetsNeeded, cases.heroes.expected.widgetsNeeded);
  assert.ok(result.totals.svsPoints > 0, 'Hero totals include SVS points');
  const hervor = result.rows.find((row) => row.name === 'Hervor');
  assert.equal(hervor.shardCost, 300);
  assert.equal(hervor.widgetsNeeded, 90);
  const zinmanState = heroes.defaultState(heroesData);
  const zinmanIndex = heroesData.heroRows.findIndex((row) => row.name === 'Zinman');
  assert.notEqual(zinmanIndex, -1, 'Zinman test case exists');
  zinmanState.items[zinmanIndex].currentStars = 'Unlocked';
  zinmanState.items[zinmanIndex].desiredStars = '0.5';
  const zinmanResult = heroes.calculate(heroesData, zinmanState);
  assert.equal(zinmanResult.rows[zinmanIndex].shardCost, 8);
  assert.equal(zinmanResult.rows[zinmanIndex].svsPoints, 8 * 3040);
  zinmanState.items[zinmanIndex].currentStars = 'Locked';
  zinmanState.items[zinmanIndex].desiredStars = '0.1';
  const lockedResult = heroes.calculate(heroesData, zinmanState);
  assert.equal(lockedResult.rows[zinmanIndex].shardCost, 11);
  const giselaState = heroes.defaultState(heroesData);
  const giselaIndex = heroesData.heroRows.findIndex((row) => row.name === 'Gisela');
  assert.notEqual(giselaIndex, -1, 'Gisela test case exists');
  giselaState.items[giselaIndex].currentWidget = 0;
  giselaState.items[giselaIndex].desiredWidget = 1;
  const giselaResult = heroes.calculate(heroesData, giselaState);
  assert.equal(giselaResult.rows[giselaIndex].widgetsNeeded, 5);
  assert.equal(giselaResult.rows[giselaIndex].svsPoints, 5 * 8000);
  const oldSavedState = heroes.defaultState(heroesData);
  oldSavedState.items[giselaIndex].currentWidget = '';
  oldSavedState.items[giselaIndex].desiredWidget = 1;
  const oldSavedResult = heroes.calculate(heroesData, oldSavedState);
  assert.equal(oldSavedResult.rows[giselaIndex].widgetsNeeded, 5);
  const smith = giselaResult.rows.find((row) => row.name === 'Smith');
  assert.equal(smith.widgetsNeeded, 0);

  const filteredState = heroes.defaultState(heroesData);
  filteredState.filters.search = 'Hervor';
  const filteredHtml = heroes.render(heroesData, filteredState);
  const hervorIndex = heroesData.heroRows.findIndex((hero) => hero.name === 'Hervor');
  assert.match(filteredHtml, /Showing 1 of 62 heroes/, 'Hero search filters the visible rows');
  assert.match(filteredHtml, new RegExp(`data-hero-index="${hervorIndex}"`), 'Filtered hero retains its original state index');
  assert.match(filteredHtml, /data-table-wrapper sticky-table-wrapper/, 'Heroes table view uses a bounded sticky-header wrapper');

  filteredState.filters.view = 'cards';
  const cardHtml = heroes.render(heroesData, filteredState);
  assert.match(cardHtml, /class="hero-card"/, 'Heroes support card view');
  assert.match(cardHtml, /aria-label="Hervor current stars"/, 'Hero card controls remain accessible');
  assert.match(cardHtml, /SVS points/, 'Hero cards show SVS points');
}

{
  const state = construction.defaultState(constructionData);
  Object.keys(state.buildings).forEach((name) => { state.buildings[name] = { current: 1, desired: 1 }; });
  state.buildings.Furnace = { current: 1, desired: 3 };
  assert.ok(construction.calculate(constructionData, state).warnings.some((warning) => warning.includes('requires')), 'Construction prerequisites are reported');
  state.buildings.Furnace = { current: 3, desired: 1 };
  assert.ok(construction.calculate(constructionData, state).warnings.some((warning) => warning.includes('cannot be below current')), 'Construction reversed ranges are rejected');
}

{
  const state = construction.defaultState(constructionData);
  Object.keys(state.buildings).forEach((name) => { state.buildings[name] = { current: 1, desired: 1 }; });
  state.constructionSpeedPercent = 0;
  state.buildersAidePercent = 0;
  state.doubleTime = false;
  state.zinmanPercent = 0;
  state.buildings.Furnace = { current: 30, desired: 35 };
  const result = construction.calculate(constructionData, state);
  assert.equal(result.totals.fireCrystals, 660, 'Furnace 30 to FC1 includes all five substages');
  assert.equal(result.rawSeconds, 35 * 86400, 'Furnace 30 to FC1 includes five seven-day substages');
}

{
  const state = construction.defaultState(constructionData);
  const rows = construction.calculate(constructionData, state).rows;
  const caps = Object.fromEntries(rows.map((row) => [row.building, row.max]));
  ['Furnace', 'Embassy', 'Command Center', 'Infirmary', 'Infantry Camp', 'Lancer Camp', 'Marksman Camp']
    .forEach((building) => assert.equal(caps[building], 80, `${building} reaches FC10`));
  assert.equal(caps.Barricade, 10, 'Barricade stops at level 10');
  assert.equal(caps.Shelter, 10, 'Shelter stops at level 10');
  ['Coal Mine', "Hunter's Hut", 'Iron Mine', 'Research Center', 'Sawmill']
    .forEach((building) => assert.equal(caps[building], 30, `${building} stops at level 30`));

  Object.keys(state.buildings).forEach((name) => { state.buildings[name] = { current: 1, desired: 1 }; });
  state.constructionSpeedPercent = 0;
  state.buildersAidePercent = 0;
  state.doubleTime = false;
  state.zinmanPercent = 0;
  state.buildings['Infantry Camp'] = { current: 30, desired: 35 };
  const campResult = construction.calculate(constructionData, state);
  assert.equal(campResult.totals.fireCrystals, 295, 'Infantry Camp 30 to FC1 includes all five substages');
  assert.equal(campResult.rawSeconds, 5 * 90720, 'Infantry Camp FC1 uses its building-specific time');
}

{
  const state = pets.defaultState(petsData);
  const result = pets.calculate(petsData, state);
  assert.equal(result.rows.length, Object.keys(petsData.petLevels).length, 'Helper rows are not treated as available pets');
  assert.equal(result.rows.length, 14, 'Only the verified released pet roster is exported');
  const expectedMaxLevels = {
    'Cave Hyena': 50.1,
    'Arctic Wolf': 60.1,
    'Musk Ox': 60.1,
    'Giant Tapir': 70.1,
    'Titan Roc': 70.1,
    'Giant Elk': 80.1,
    'Snow Leopard': 80.1,
    'Cave Lion': 100.1,
    'Snow Ape': 100.1,
    'Iron Rhino': 100.1,
    'Sabertooth Tiger': 100.1,
    'Mammoth': 100.1,
    'Frost Gorilla': 100.1,
    'Frostscale Chameleon': 100.1
  };
  result.rows.forEach((row) => {
    assert.equal(row.range.max, expectedMaxLevels[row.name], `${row.name} max level follows its available advancement costs`);
  });
  assert.match(pets.render(petsData, state), /<select aria-label="Cave Hyena desired level"/, 'Pet levels use native dropdowns');
  assert.doesNotMatch(pets.render(petsData, state), /Cave Hyena desired level[^<]*(?:<option[^>]*>Level (?:60|70|80|90|100))/s, 'Cave Hyena dropdown stops at its max level');
}

{
  const state = troops.defaultState(troopsData);
  Object.values(state.items).forEach((item) => { item.quantity = 0; });
  for (const type of Object.keys(troopsData.troopCosts)) {
    const tiers = troopsData.troopCosts[type].map((row) => Number(row.tier));
    state.items[type].quantity = 1000;
    state.items[type].tier = Math.max(...tiers);
    assert.ok(troops.calculate(troopsData, state).adjustedSeconds > 0, `${type} highest tier has adjusted training time`);
    state.items[type].quantity = 0;
  }
}

{
  const state = heroGear.defaultState(heroGearData);
  assert.match(heroGear.render(heroGearData, state), /data-state-path="hero-gear\.rows\.0\.desired"/, 'Hero Gear controls target the active section state');
  assert.equal(heroGearData.costs.mastery.length, 21, 'Hero Gear mastery extraction excludes reforge rows');
  assert.equal(heroGearData.costs.reforge.length, 101, 'Hero Gear reforge lookup is preserved');
  state.rows[0] = { ...state.rows[0], current: 139, desired: 159, masteryCurrent: 15, masteryDesired: 16 };
  const firstUpgrade = heroGear.calculate(heroGearData, state).rows[0];
  assert.equal(firstUpgrade.totals.heroGearXp, 93100);
  assert.equal(firstUpgrade.totals.essenceStones, 160);
  assert.equal(firstUpgrade.totals.mythicGear, 11);
  state.rows[0].desired = 100;
  assert.ok(heroGear.calculate(heroGearData, state).warnings.some((warning) => warning.includes('cannot be below current')), 'Hero Gear reversed ranges are rejected');
}

console.log('Calculator regression tests passed');
