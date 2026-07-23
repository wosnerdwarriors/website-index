const CLASSES = [
  { name: "Infantry", prefix: "Inf", damageKey: "InfDamage", fallbackDamage: 0.125 },
  { name: "Lancer", prefix: "Lan", damageKey: "LanDamage", fallbackDamage: 0.375 },
  { name: "Marksman", prefix: "Mar", damageKey: "MarDamage", fallbackDamage: 0.5 }
];

const STAT_SUFFIXES = [
  "Lethality (adds)",
  "Attack (adds)",
  "Damage taken up",
  "Defense down",
  "DamageUp (adds)",
  "Damage (multiplies)",
  "NormalDamage (Reina S1)",
  "SkillDamage (adds Reina S1; x Wu Ming S3)",
  "SkillDamage (Wu Ming S3)"
];

const STAT_NAMES = CLASSES.flatMap(({ prefix }) => STAT_SUFFIXES.map((suffix) => `${prefix}${suffix}`));

function choose(n, k) {
  if (k < 0 || n < k) return 0;
  const count = Math.min(k, n - k);
  let result = 1;
  for (let index = 1; index <= count; index += 1) {
    result = (result * (n - count + index)) / index;
  }
  return result;
}

export function combinationCount(poolSize, slots) {
  if (slots === 0) return 1;
  if (poolSize === 0) return 0;
  return choose(poolSize + slots - 1, slots);
}

function* combinationsWithReplacement(pool, slots, start = 0, combination = []) {
  if (combination.length === slots) {
    yield [...combination];
    return;
  }
  for (let index = start; index < pool.length; index += 1) {
    combination.push(pool[index]);
    yield* combinationsWithReplacement(pool, slots, index, combination);
    combination.pop();
  }
}

function getMetaName(name, metadata) {
  if (!name) return name;
  const normalized = name.trim().toLowerCase();
  const synonyms = {
    "seo-yoon": "Seo-Yoon",
    seoyoon: "Seo-Yoon",
    ling: "Ling",
    "ling xue": "Ling",
    lingxue: "Ling",
    "wallis bokan": "Wallis Bokan",
    "lumak bokan": "Wallis Bokan",
    lumakbokan: "Wallis Bokan",
    wallisbokan: "Wallis Bokan"
  };
  if (synonyms[normalized]) return synonyms[normalized];
  return Object.keys(metadata).find((key) => key.toLowerCase() === normalized) || name;
}

function getSkillName(name, skills) {
  if (!name) return name;
  const normalized = name.trim().toLowerCase();
  const synonyms = {
    "seo-yoon": "Seo-yoon",
    seoyoon: "Seo-yoon",
    ling: "Ling Xue",
    "ling xue": "Ling Xue",
    lingxue: "Ling Xue",
    "wallis bokan": "Lumak Bokan",
    "lumak bokan": "Lumak Bokan",
    lumakbokan: "Lumak Bokan",
    wallisbokan: "Lumak Bokan"
  };
  if (synonyms[normalized]) return synonyms[normalized];
  return Object.keys(skills).find((key) => key.toLowerCase() === normalized) || name;
}

function skillData(heroName, db) {
  return db.heroSkills[getSkillName(heroName, db.heroSkills)] || { stacks: 0, caller: {}, joiner: {} };
}

function skillVector(source, prefix = "") {
  return STAT_NAMES.map((name) => Number(source?.[`${prefix}${name}`]) || 0);
}

function addVector(target, source, multiplier = 1) {
  for (let index = 0; index < target.length; index += 1) target[index] += source[index] * multiplier;
}

function skillLevel(starLevel) {
  const parsed = Number.parseInt(String(starLevel || "0*")[0], 10);
  return Number.isFinite(parsed) ? Math.min(parsed + 1, 5) : 1;
}

function widgetMultiplier(level) {
  if (level < 2) return 0;
  if (level < 4) return 0.05;
  if (level < 6) return 0.075;
  if (level < 8) return 0.1;
  if (level < 10) return 0.125;
  return 0.15;
}

function generationWidgetMultiplier(generation, multipliers) {
  const key = String(Number.parseFloat(generation));
  return Number(multipliers[key]) || 0;
}

function heroCombatStats(heroName, className, profile, db, ministerBuffs) {
  const roster = profile.roster || {};
  const base = profile.base_stats || {};
  const gear = profile.gear_stats || {};
  const minister = ministerBuffs[profile.minister_buff || "None"] || {};
  let lethality = (Number(base[`${className}Lethality`]) || 0)
    + (Number(base.AllTroopsLethality) || 0)
    + (Number(gear[`${className}Lethality`]) || 0)
    + (Number(minister.lethality) || 0);
  let attack = (Number(base[`${className}Attack`]) || 0)
    + (Number(base.AllTroopsAttack) || 0)
    + (Number(base.TrapLevelBuff) || 0)
    + (Number(gear[`${className}Attack`]) || 0)
    + (Number(minister.attack) || 0);

  if (heroName && roster[heroName]) {
    const info = roster[heroName];
    const metaName = getMetaName(heroName, db.heroMetadata);
    const meta = db.heroMetadata[metaName] || {};
    const starStats = db.starLevelStats[metaName] || {};
    let starKey = String(info.star_level || "0*").trim();
    if (!(starKey in starStats) && !starKey.endsWith("*")) starKey += "*";
    lethality += (Number(info.widget_level) || 0) * generationWidgetMultiplier(meta.gen || 1, db.widgetMultipliers);
    attack += (Number(starStats[starKey]) || 0) / 100;
  }

  if (profile.pets_active) {
    const chameleon = Number(profile.chameleon_buff) || 0;
    lethality = lethality * (1 + chameleon) + (Number(profile.sabre_tooth_lethality) || 0);
    attack = attack * (1 + chameleon) + (Number(profile.cave_lion_atk) || 0);
  }
  return { lethality, attack };
}

function prepareStarterRecords(profile, startersMap, db, ministerBuffs) {
  const roster = profile.roster || {};
  const lists = CLASSES.map(({ name }) => startersMap[name]?.length ? startersMap[name] : [null]);
  const records = [];
  const rosarionMode = profile.rosarion_mode || "No";

  for (const infantry of lists[0]) {
    for (const lancer of lists[1]) {
      for (const marksman of lists[2]) {
        const starters = [infantry, lancer, marksman];
        const caller = new Array(STAT_NAMES.length).fill(0);
        const conflictingJoiners = [];
        let widgetLethality = 0;
        let widgetAttack = 0;

        for (const hero of starters) {
          if (!hero) continue;
          const info = roster[hero] || {};
          const data = skillData(hero, db);
          addVector(caller, skillVector(data.caller?.[String(skillLevel(info.star_level))]));
          if (data.stacks !== 1) conflictingJoiners.push(hero);
          if (rosarionMode !== "Yes") {
            const meta = db.heroMetadata[getMetaName(hero, db.heroMetadata)] || {};
            const multiplier = widgetMultiplier(Number(info.widget_level) || 0);
            widgetLethality += (Number(meta.rally_widget_lethality) || 0) * multiplier;
            widgetAttack += (Number(meta.rally_widget_attack) || 0) * multiplier;
          }
        }

        const powers = CLASSES.map(({ name }, index) => {
          const combat = heroCombatStats(starters[index], name, profile, db, ministerBuffs);
          return (1 + combat.lethality) * (1 + combat.attack);
        });
        records.push({ starters, caller, conflictingJoiners, powers, widgetLethality, widgetAttack });
      }
    }
  }
  return records;
}

function prepareJoinerCombination(joiners, db, vectorCache) {
  const vector = new Array(STAT_NAMES.length).fill(0);
  const nonStacking = new Set();
  for (const hero of joiners) {
    const data = skillData(hero, db);
    if (data.stacks !== 1) {
      if (nonStacking.has(hero)) continue;
      nonStacking.add(hero);
    }
    addVector(vector, vectorCache.get(hero));
  }
  return { vector, nonStacking };
}

function evaluate(record, joinerData, classDamage, marFcSkill, squadSize) {
  const combined = record.caller.slice();
  addVector(combined, joinerData.vector);
  for (const hero of record.conflictingJoiners) {
    if (joinerData.nonStacking.has(hero)) addVector(combined, joinerData.vectorCache.get(hero), -1);
  }

  const thd = CLASSES.map((unused, classIndex) => {
    const offset = classIndex * STAT_SUFFIXES.length;
    const lethality = 1 + combined[offset];
    const attack = 1 + combined[offset + 1];
    const taken = 1 + combined[offset + 2];
    const defense = 1 + combined[offset + 3];
    const damageUp = 1 + combined[offset + 4];
    const damageMult = 1 + combined[offset + 5];
    const normalDamage = 1 + combined[offset + 6];
    const skillDamage = 1 + combined[offset + 7] + (classIndex === 2 ? marFcSkill : 0);
    const skillProbability = 1 + combined[offset + 8];
    const product = lethality * attack * taken * defense * damageUp * damageMult;
    return product * (normalDamage + (skillDamage - 1) * skillProbability) * record.powers[classIndex] * classDamage[classIndex];
  });
  const sumThd2 = thd.reduce((sum, value) => sum + value * value, 0);
  const totalBoost = Math.sqrt(sumThd2 * squadSize) * (1 + record.widgetLethality) * (1 + record.widgetAttack);
  return { thd, sumThd2, totalBoost };
}

export function optimizeExhaustively({ profile, startersMap, joinerPool, slots, db, ministerBuffs }, onProgress = () => {}) {
  const starterRecords = prepareStarterRecords(profile, startersMap, db, ministerBuffs);
  const joinerCombinations = combinationCount(joinerPool.length, slots);
  const total = starterRecords.length * joinerCombinations;
  if (!total) throw new Error("No valid optimizer combinations are available.");

  const vectorCache = new Map(joinerPool.map((hero) => [hero, skillVector(skillData(hero, db).joiner, "S1_")]));
  const tierNames = [profile.inf_tier || "FC10 T11", profile.lan_tier || "FC10 T11", profile.mar_tier || "FC10 T11"];
  const classDamage = CLASSES.map(({ damageKey, fallbackDamage }, index) =>
    Number(db.troopDamageStats[tierNames[index]]?.[damageKey]) || fallbackDamage);
  const marFcSkill = Number(db.troopDamageStats[tierNames[2]]?.MarFcSkill) || 0;
  const ministerTroops = Number(ministerBuffs[profile.minister_buff || "None"]?.troops) || 0;
  const deployMultiplier = profile.deploy_capacity_buff === "20%" ? 1.2 : profile.deploy_capacity_buff === "10%" ? 1.1 : 1;
  const squadSize = Math.round(((Number(profile.base_squad_size) || 230000)
    + (profile.pets_active ? Number(profile.snow_ape_capacity) || 0 : 0)
    + ministerTroops) * deployMultiplier);

  let evaluated = 0;
  let joinerIndex = 0;
  let bestScore = -1;
  let bestOrdinal = Number.POSITIVE_INFINITY;
  let best = null;

  for (const joiners of combinationsWithReplacement(joinerPool, slots)) {
    const joinerData = prepareJoinerCombination(joiners, db, vectorCache);
    joinerData.vectorCache = vectorCache;
    for (let starterIndex = 0; starterIndex < starterRecords.length; starterIndex += 1) {
      const record = starterRecords[starterIndex];
      const result = evaluate(record, joinerData, classDamage, marFcSkill, squadSize);
      const ordinal = starterIndex * joinerCombinations + joinerIndex;
      if (result.totalBoost > bestScore || (result.totalBoost === bestScore && ordinal < bestOrdinal)) {
        bestScore = result.totalBoost;
        bestOrdinal = ordinal;
        const ratios = result.sumThd2 > 0
          ? result.thd.map((value) => (value * value) / result.sumThd2)
          : [1 / 3, 1 / 3, 1 / 3];
        best = {
          starters: [...record.starters],
          joiners: [...joiners],
          total_boost: result.totalBoost,
          optimal_ratios: { Infantry: ratios[0], Lancer: ratios[1], Marksman: ratios[2] },
          troop_counts: { Infantry: ratios[0] * squadSize, Lancer: ratios[1] * squadSize, Marksman: ratios[2] * squadSize }
        };
      }
      evaluated += 1;
      if (evaluated % 262144 === 0) onProgress({ evaluated, total });
    }
    joinerIndex += 1;
  }
  onProgress({ evaluated, total });
  return { best, evaluated, total };
}
