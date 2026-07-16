(() => {
  'use strict';

  const SCENARIOS = {
    speed10: {
      title: 'March Speed 10% - No Pets - without Expedition',
      times: [
        [95, 89, 83, 78, 74, 71, 70, 70, 71, 74, 78, 83, 89, 95],
        [89, 82, 75, 70, 65, 62, 60, 60, 62, 65, 70, 75, 82, 89],
        [83, 75, 68, 62, 56, 52, 50, 50, 52, 56, 62, 68, 75, 83],
        [78, 70, 62, 54, 48, 43, 40, 40, 43, 48, 54, 62, 70, 78],
        [74, 65, 56, 48, 40, 34, 31, 31, 34, 40, 48, 56, 65, 74],
        [71, 62, 52, 43, 34, 26, 21, 21, 26, 34, 43, 52, 62, 71],
        [70, 60, 50, 40, 31, 21, 13, 13, 21, 31, 40, 50, 60, 70],
        [70, 60, 50, 40, 31, 21, 13, 13, 21, 31, 40, 50, 60, 70],
        [71, 62, 52, 43, 34, 26, 21, 21, 26, 34, 43, 52, 62, 71],
        [74, 65, 56, 48, 40, 34, 31, 31, 34, 40, 48, 56, 65, 74],
        [78, 70, 62, 54, 48, 43, 40, 40, 43, 48, 54, 62, 70, 78],
        [83, 75, 68, 62, 56, 52, 50, 50, 52, 56, 62, 68, 75, 83],
        [89, 82, 75, 70, 65, 62, 60, 60, 62, 65, 70, 75, 82, 89],
        [95, 89, 83, 78, 74, 71, 70, 70, 71, 74, 78, 83, 89, 95]
      ]
    },
    speed25: {
      title: 'March Speed 25% - No Pets',
      times: [
        [85, 79, 74, 69, 66, 63, 62, 62, 63, 66, 69, 74, 79, 85],
        [79, 73, 67, 62, 58, 55, 53, 53, 55, 58, 62, 67, 73, 79],
        [74, 67, 61, 55, 50, 47, 45, 45, 47, 50, 55, 61, 67, 74],
        [69, 62, 55, 48, 43, 39, 36, 36, 39, 43, 48, 55, 62, 69],
        [66, 58, 50, 43, 36, 31, 28, 28, 31, 36, 43, 50, 58, 66],
        [63, 55, 47, 39, 31, 24, 19, 19, 24, 31, 39, 47, 55, 63],
        [62, 53, 45, 36, 28, 19, 12, 12, 19, 28, 36, 45, 53, 62],
        [62, 53, 45, 36, 28, 19, 12, 12, 19, 28, 36, 45, 53, 62],
        [63, 55, 47, 39, 31, 24, 19, 19, 24, 31, 39, 47, 55, 63],
        [66, 58, 50, 43, 36, 31, 28, 28, 31, 36, 43, 50, 58, 66],
        [69, 62, 55, 48, 43, 39, 36, 36, 39, 43, 48, 55, 62, 69],
        [74, 67, 61, 55, 50, 47, 45, 45, 47, 50, 55, 61, 67, 74],
        [79, 73, 67, 62, 58, 55, 53, 53, 55, 58, 62, 67, 73, 79],
        [85, 79, 74, 69, 66, 63, 62, 62, 63, 66, 69, 74, 79, 85]
      ]
    },
    speed40: {
      title: 'March Speed 40% - Pets active - without Expedition',
      times: [
        [76, 71, 66, 62, 59, 57, 56, 56, 57, 59, 62, 66, 71, 76],
        [71, 65, 60, 56, 52, 50, 48, 48, 50, 52, 56, 60, 65, 71],
        [66, 60, 55, 50, 45, 42, 41, 41, 42, 45, 50, 55, 60, 66],
        [62, 56, 50, 44, 39, 35, 33, 33, 35, 39, 44, 50, 56, 62],
        [59, 52, 45, 39, 33, 28, 25, 25, 28, 33, 39, 45, 52, 59],
        [57, 50, 42, 35, 28, 22, 18, 18, 22, 28, 35, 42, 50, 57],
        [56, 48, 41, 33, 25, 18, 11, 11, 18, 25, 33, 41, 48, 56],
        [56, 48, 41, 33, 25, 18, 11, 11, 18, 25, 33, 41, 48, 56],
        [57, 50, 42, 35, 28, 22, 18, 18, 22, 28, 35, 42, 50, 57],
        [59, 52, 45, 39, 33, 28, 25, 25, 28, 33, 39, 45, 52, 59],
        [62, 56, 50, 44, 39, 35, 33, 33, 35, 39, 44, 50, 56, 62],
        [66, 60, 55, 50, 45, 42, 41, 41, 42, 45, 50, 55, 60, 66],
        [71, 65, 60, 56, 52, 50, 48, 48, 50, 52, 56, 60, 65, 71],
        [76, 71, 66, 62, 59, 57, 56, 56, 57, 59, 62, 66, 71, 76]
      ]
    },
    speed55: {
      title: 'March Speed 55% - Pets active',
      times: [
        [69, 65, 60, 57, 54, 52, 51, 51, 52, 54, 57, 60, 65, 69],
        [65, 60, 55, 51, 48, 45, 44, 44, 45, 48, 51, 55, 60, 65],
        [60, 55, 50, 45, 41, 39, 37, 37, 39, 41, 45, 50, 55, 60],
        [57, 51, 45, 40, 36, 32, 30, 30, 32, 36, 40, 45, 51, 57],
        [54, 48, 41, 36, 30, 26, 23, 23, 26, 30, 36, 41, 48, 54],
        [52, 45, 39, 32, 26, 20, 17, 17, 20, 26, 32, 39, 45, 52],
        [51, 44, 37, 30, 23, 17, 10, 10, 17, 23, 30, 37, 44, 51],
        [51, 44, 37, 30, 23, 17, 10, 10, 17, 23, 30, 37, 44, 51],
        [52, 45, 39, 32, 26, 20, 17, 17, 20, 26, 32, 39, 45, 52],
        [54, 48, 41, 36, 30, 26, 23, 23, 26, 30, 36, 41, 48, 54],
        [57, 51, 45, 40, 36, 32, 30, 30, 32, 36, 40, 45, 51, 57],
        [60, 55, 50, 45, 41, 39, 37, 37, 39, 41, 45, 50, 55, 60],
        [65, 60, 55, 51, 48, 45, 44, 44, 45, 48, 51, 55, 60, 65],
        [69, 65, 60, 57, 54, 52, 51, 51, 52, 54, 57, 60, 65, 69]
      ]
    }
  };

  const positions = Array.from({ length: 14 }, (_, index) => 586 + index * 2);
  const yPositions = positions.slice().reverse();
  const grid = document.getElementById('city-grid');
  const axisLayer = document.getElementById('axis-layer');
  const heading = document.getElementById('page-title');
  const selectedCoordinate = document.getElementById('selected-coordinate');
  const selectedTime = document.getElementById('selected-time');
  const fastestLabel = document.getElementById('fastest-label');
  const slowestLabel = document.getElementById('slowest-label');
  const scenarioButtons = Array.from(document.querySelectorAll('.scenario-button'));
  const cityElements = [];
  let activeScenarioKey = 'speed25';
  let selectedCity = null;

  const isReserved = (x, y) => x >= 594 && x <= 604 && y >= 594 && y <= 604;

  const addGroundGrid = () => {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 1024; index += 1) {
      const ground = document.createElement('span');
      ground.className = 'ground-cell';
      ground.style.gridColumn = String(index % 32 + 1);
      ground.style.gridRow = String(Math.floor(index / 32) + 1);
      ground.setAttribute('aria-hidden', 'true');
      fragment.appendChild(ground);
    }
    grid.appendChild(fragment);
  };

  const addAxisLabels = () => {
    const placeLabel = (text, u, v) => {
      const label = document.createElement('span');
      label.className = 'axis-label';
      label.textContent = text;
      label.style.left = `${50 + 50 * (u + v - 1)}%`;
      label.style.top = `${50 + 44.444 * (v - u)}%`;
      axisLayer.appendChild(label);
    };

    positions.forEach((value, index) => {
      const slot = (index + 1.5) / 16;
      const borderCenter = 0.5 / 16;
      const opposite = 1 - borderCenter;
      placeLabel(String(value), slot, borderCenter);
      placeLabel(String(yPositions[index]), opposite, slot);
      placeLabel(String(value), slot, opposite);
      placeLabel(String(yPositions[index]), borderCenter, slot);
    });
  };

  const addCities = () => {
    const fragment = document.createDocumentFragment();
    yPositions.forEach((y, rowIndex) => {
      positions.forEach((x, columnIndex) => {
        if (isReserved(x, y)) return;

        const city = document.createElement('button');
        const label = document.createElement('span');
        city.type = 'button';
        city.className = 'city';
        city.dataset.x = String(x);
        city.dataset.y = String(y);
        city.dataset.row = String(rowIndex);
        city.dataset.column = String(columnIndex);
        city.style.gridColumn = `${columnIndex * 2 + 3} / span 2`;
        city.style.gridRow = `${rowIndex * 2 + 3} / span 2`;
        city.setAttribute('role', 'gridcell');
        label.className = 'city-label';
        city.appendChild(label);
        city.addEventListener('click', () => selectCity(city));
        cityElements.push(city);
        fragment.appendChild(city);
      });
    });
    grid.appendChild(fragment);

    const reserved = document.createElement('div');
    reserved.className = 'reserved-zone';
    reserved.setAttribute('role', 'gridcell');
    reserved.setAttribute('aria-label', 'Castle area. Castle coordinates 597,597.');
    reserved.innerHTML = '<div class="castle-core"><span class="castle-label">Castle · 597,597</span></div>';
    grid.appendChild(reserved);
  };

  const scenarioRange = (scenario) => {
    const visibleTimes = cityElements.map((city) => {
      const row = Number(city.dataset.row);
      const column = Number(city.dataset.column);
      return scenario.times[row][column];
    });
    return {
      fastest: Math.min(...visibleTimes),
      slowest: Math.max(...visibleTimes)
    };
  };

  const cityColor = (seconds, fastest, slowest) => {
    const span = Math.max(1, slowest - fastest);
    const progress = (seconds - fastest) / span;
    const hue = 194 - progress * 148;
    const lightness = 43 + progress * 18;
    return `hsl(${hue} 82% ${lightness}%)`;
  };

  const updateSelectionPanel = () => {
    if (!selectedCity) {
      selectedCoordinate.textContent = 'None';
      selectedTime.textContent = 'Select any city to view its march time.';
      return;
    }

    const scenario = SCENARIOS[activeScenarioKey];
    const row = Number(selectedCity.dataset.row);
    const column = Number(selectedCity.dataset.column);
    const seconds = scenario.times[row][column];
    selectedCoordinate.textContent = `${selectedCity.dataset.x},${selectedCity.dataset.y}`;
    selectedTime.textContent = `${seconds}s to Castle · ${scenario.title}`;
  };

  function selectCity(city) {
    cityElements.forEach((item) => item.classList.toggle('is-selected', item === city));
    selectedCity = city;
    updateSelectionPanel();
  }

  const renderScenario = () => {
    const scenario = SCENARIOS[activeScenarioKey];
    const range = scenarioRange(scenario);
    heading.textContent = scenario.title;
    fastestLabel.textContent = `fastest · ${range.fastest}s`;
    slowestLabel.textContent = `slowest · ${range.slowest}s`;

    cityElements.forEach((city) => {
      const row = Number(city.dataset.row);
      const column = Number(city.dataset.column);
      const seconds = scenario.times[row][column];
      city.querySelector('.city-label').textContent = `${seconds}s`;
      city.style.setProperty('--city-color', cityColor(seconds, range.fastest, range.slowest));
      city.setAttribute('aria-label', `City ${city.dataset.x},${city.dataset.y}: ${seconds} seconds to the castle`);
    });

    scenarioButtons.forEach((button) => {
      const active = button.dataset.scenario === activeScenarioKey;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    updateSelectionPanel();
  };

  scenarioButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeScenarioKey = button.dataset.scenario;
      renderScenario();
    });
  });

  addGroundGrid();
  addCities();
  addAxisLabels();
  renderScenario();
})();
