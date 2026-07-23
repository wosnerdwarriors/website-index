import assert from "node:assert/strict";
import fs from "node:fs";
import { combinationCount, optimizeExhaustively } from "../optimizer-core.mjs";

const readJson = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));
const db = {
  heroesList: readJson("heroes_list.json"),
  heroMetadata: readJson("hero_metadata.json"),
  heroSkills: readJson("hero_skills.json"),
  starLevelStats: readJson("star_level_stats.json"),
  troopDamageStats: readJson("troop_damage_stats.json"),
  widgetMultipliers: readJson("widget_multipliers.json")
};
const ministerBuffs = {
  None: { lethality: 0, attack: 0, troops: 0 }
};
const defaultHero = { star_level: "0*", widget_level: 0, active_starter: false, unlocked: false };
const profile = {
  base_stats: {
    AllTroopsLethality: 15,
    AllTroopsAttack: 15,
    TrapLevelBuff: 0.25,
    InfantryLethality: 0,
    InfantryAttack: 0,
    LancerLethality: 0,
    LancerAttack: 0,
    MarksmanLethality: 0,
    MarksmanAttack: 0
  },
  gear_stats: {
    InfantryLethality: 0,
    InfantryAttack: 0,
    LancerLethality: 0,
    LancerAttack: 0,
    MarksmanLethality: 0,
    MarksmanAttack: 0
  },
  pets_active: true,
  cave_lion_atk: 0.1,
  snow_ape_capacity: 15000,
  sabre_tooth_lethality: 0.1,
  chameleon_buff: 0.1,
  base_squad_size: 230000,
  deploy_capacity_buff: "Nil",
  minister_buff: "None",
  rosarion_mode: "No",
  inf_tier: "FC10 T11",
  lan_tier: "FC10 T11",
  mar_tier: "FC10 T11",
  roster: Object.fromEntries(db.heroesList.map((hero) => [hero, { ...defaultHero }]))
};

assert.equal(combinationCount(0, 0), 1);
assert.equal(combinationCount(0, 4), 0);
assert.equal(combinationCount(12, 4), 1365);
assert.equal(combinationCount(49, 4), 270725);

const startersMap = {
  Infantry: ["Flint"],
  Lancer: ["Molly"],
  Marksman: ["Bahiti"]
};
for (const hero of Object.values(startersMap).flat()) {
  profile.roster[hero] = { ...defaultHero, unlocked: true, star_level: "5*", widget_level: 10 };
}
for (const hero of ["Jessie", "Jasser"]) {
  profile.roster[hero] = { ...defaultHero, unlocked: true, star_level: "5*" };
}

let finalProgress = null;
const result = optimizeExhaustively({
  profile,
  startersMap,
  joinerPool: ["Jessie", "Jasser"],
  slots: 2,
  db,
  ministerBuffs
}, (progress) => { finalProgress = progress; });
assert.equal(result.total, 3);
assert.equal(result.evaluated, 3);
assert.equal(finalProgress.evaluated, 3);
assert.ok(result.best);
assert.equal(result.best.starters.length, 3);
assert.equal(result.best.joiners.length, 2);
assert.ok(Number.isFinite(result.best.total_boost));
assert.ok(Math.abs(Object.values(result.best.optimal_ratios).reduce((sum, value) => sum + value, 0) - 1) < 1e-12);

assert.throws(() => optimizeExhaustively({
  profile,
  startersMap,
  joinerPool: [],
  slots: 4,
  db,
  ministerBuffs
}), /No valid optimizer combinations/);

console.log("Bear optimizer regression tests passed");
