export function isStateObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function hydrateCalculatorState(savedState, sections, calculatorData) {
  const saved = isStateObject(savedState) ? savedState : {};
  const hydrated = Object.fromEntries(sections.map((section) => [
    section.id,
    isStateObject(saved[section.id])
      ? saved[section.id]
      : section.module.defaultState(calculatorData[section.id])
  ]));
  hydrated.inventory = isStateObject(saved.inventory) ? saved.inventory : {};
  const valeriaPercent = Number(saved.valeriaS1Percent || 0);
  hydrated.valeriaS1Percent = valeriaPercent >= 0 && valeriaPercent <= 20 && valeriaPercent % 2 === 0
    ? valeriaPercent
    : 0;
  return hydrated;
}
