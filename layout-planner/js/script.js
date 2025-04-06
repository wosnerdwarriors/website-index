const canvas = document.getElementById('layoutCanvas');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const flagCounter = document.getElementById('flagCounter');
const cityCounter = document.getElementById('cityCounter');
const buildingCounter = document.getElementById('buildingCounter');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const mapData = document.getElementById('mapData');

const gridSize = 40;
const canvasSize = 1000;
const gridCount = canvasSize / gridSize;

const entities = [];
let selectedType = null;
let selectedEntity = null;
let cityCounterId = 1;
let bearTraps = [];
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function updateCounters() {
    const flags = entities.filter(entity => entity.type === 'flag').length;
    const cities = entities.filter(entity => entity.type === 'city').length;
    const buildings = entities.filter(entity => entity.type === 'building').length;

    flagCounter.textContent = flags;
    cityCounter.textContent = cities;
    buildingCounter.textContent = buildings;
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ccc';
    for (let i = 0; i <= gridCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
    ctx.fillStyle = 'red';
    const centerX = Math.floor(gridCount / 2) * gridSize;
    const centerY = Math.floor(gridCount / 2) * gridSize;
    ctx.beginPath();
    ctx.arc(centerX + gridSize / 2, centerY + gridSize / 2, 5, 0, 2 * Math.PI);
    ctx.fill();
}

function drawEntities() {
    const flagAreas = new Set();
    entities.forEach(entity => {
        if (entity.type === 'flag') {
            markFlagArea(entity, flagAreas);
        }
    });
    drawFlagAreas(flagAreas);

    entities.forEach(entity => {
        ctx.fillStyle = entity.color;
        ctx.fillRect(entity.x * gridSize, entity.y * gridSize, entity.width * gridSize, entity.height * gridSize);
        if (entity.type === 'building') {
            drawBearTrapDetails(entity);
        } else {
            ctx.strokeStyle = 'black';
            ctx.strokeRect(entity.x * gridSize, entity.y * gridSize, entity.width * gridSize, entity.height * gridSize);
        }
        if (entity.type === 'city') {
            drawCityDetails(entity);
        }
        if (selectedEntity === entity) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 3;
            ctx.strokeRect(entity.x * gridSize, entity.y * gridSize, entity.width * gridSize, entity.height * gridSize);
            ctx.lineWidth = 1;
        }
    });
}

function drawCityDetails(city) {
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    const label = city.name || city.id;
    ctx.fillText(label, (city.x + 1) * gridSize, (city.y + 0.6) * gridSize);

    const marchTimes = calculateMarchTimes(city);
    marchTimes.forEach((time, index) => {
        ctx.fillText(`BT${index + 1}: ${time}s`, (city.x + 1) * gridSize, (city.y + 1.2 + 0.3 * index) * gridSize);
    });
}

function drawBearTrapDetails(trap) {
    ctx.fillStyle = 'black';
    ctx.fillRect(trap.x * gridSize, trap.y * gridSize, trap.width * gridSize, trap.height * gridSize);
    ctx.strokeRect(trap.x * gridSize + 1, trap.y * gridSize + 1, trap.width * gridSize - 2, trap.height * gridSize - 2);

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    const trapIndex = bearTraps.indexOf(trap) + 1;
    ctx.fillText(`BT${trapIndex}`, (trap.x + 1.5) * gridSize, (trap.y + 1.8) * gridSize);
}

function calculateMarchTimes(city) {
    const times = [];
    bearTraps.forEach(trap => {
        const distance = Math.sqrt(
            Math.pow((trap.x + 1.5) - (city.x + 1), 2) +
            Math.pow((trap.y + 1.5) - (city.y + 1), 2)
        );
        const time = Math.round((distance / 10) * 32,5);
        times.push(time);
    });
    return times;
}

function markFlagArea(flagEntity, flagAreas) {
    const radiusSize = 7;
    const startX = flagEntity.x - radiusSize;
    const startY = flagEntity.y - radiusSize;
    const endX = flagEntity.x + radiusSize;
    const endY = flagEntity.y + radiusSize;

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            if (x >= 0 && x < gridCount && y >= 0 && y < gridCount) {
                flagAreas.add(`${x},${y}`);
            }
        }
    }
}

function drawFlagAreas(flagAreas) {
    ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';
    flagAreas.forEach(coord => {
        const [x, y] = coord.split(',').map(Number);
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
    });
}

function getRandomColor() {
    let color;
    do {
        const r = Math.floor(Math.random() * 128 + 127);
        const g = Math.floor(Math.random() * 128 + 127);
        const b = Math.floor(Math.random() * 128 + 127); 
        color = `rgb(${r}, ${g}, ${b})`;
    } while (isColorTooDark(color));
    return color;
}

function isColorTooDark(color) {
    const rgb = color.match(/\d+/g).map(Number);
    const brightness = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
    return brightness < 128; 
}

function addEntity(event) {
    if (!selectedType || selectedType === 'select') return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / gridSize);
    const y = Math.floor((event.clientY - rect.top) / gridSize);

    let color, width, height, id = null;
    if (selectedType === 'flag') {
        color = 'gray';
        width = 1;
        height = 1;
    } else if (selectedType === 'city') {
        color = getRandomColor();
        width = 2;
        height = 2;
    } else if (selectedType === 'building') {
        if (bearTraps.length >= 2) {
            alert('You can only place up to 2 Bear Traps.');
            return;
        }
        color = 'black';
        width = 3;
        height = 3;
    }

    const overlapping = entities.some(entity => {
        return (
            x < entity.x + entity.width &&
            x + width > entity.x &&
            y < entity.y + entity.height &&
            y + height > entity.y
        );
    });

    if (!overlapping && x + width <= gridCount && y + height <= gridCount) {
        if (selectedType === 'city') {
            id = cityCounterId;
            cityCounterId++;
        }
        const newEntity = { x, y, width, height, color, type: selectedType, id };
        entities.push(newEntity);
        if (selectedType === 'building') {
            bearTraps.push(newEntity);
        }
        drawGrid();
        drawEntities();
        updateCounters();

        if (selectedType === 'city') {
            updateCityList();
        }
    }
}

function updateCityList() {
    const cityList = document.getElementById('cityList');
    if (!cityList) return;
    cityList.innerHTML = '';

    // List by ID
    const cities = entities
        .filter(entity => entity.type === 'city')
        .sort((a, b) => a.id - b.id);

    cities.forEach(city => {
        const li = document.createElement('li');
        const input = document.createElement('input');
        input.type = 'text';
        // Show custom name or ID
        input.value = city.name || `City ${city.id}`;
        input.placeholder = `City ${city.id}`;
        input.className = "border p-1 rounded w-full";

        // Update map on namechange
        input.addEventListener('change', () => {
            city.name = input.value;
            drawGrid();
            drawEntities();
        });
        
        li.appendChild(input);
        cityList.appendChild(li);
    });
}



function selectEntity(event) {
    if (selectedType !== 'select') return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / gridSize);
    const y = Math.floor((event.clientY - rect.top) / gridSize);

    selectedEntity = entities.find(entity => {
        return (
            x >= entity.x &&
            x < entity.x + entity.width &&
            y >= entity.y &&
            y < entity.y + entity.height
        );
    });

    drawGrid();
    drawEntities();
}

function handleDeleteOrMove(event) {
    if (!selectedEntity) return;

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
        event.preventDefault();
    }    

    // Editing mode of city name if a city is selected
    if (selectedEntity.type === 'city' &&
        !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(event.key)
    ) {
        if (event.key === 'Enter') {
            selectedEntity.isEditing = false;
        } else if (event.key === 'Backspace') {
            event.preventDefault();
            selectedEntity.name = selectedEntity.name ? selectedEntity.name.slice(0, -1) : '';
        } else if (event.key.length === 1) { 
            if (!selectedEntity.isEditing) {
                selectedEntity.name = '';
                selectedEntity.isEditing = true;
            }
            selectedEntity.name += event.key;
        }
        drawGrid();
        drawEntities();
        updateCityList();
        return;
    }


    if (event.key === 'Delete') {
        const index = entities.indexOf(selectedEntity);
        if (index !== -1) {
          if (selectedEntity.type === 'city') {
              entities.splice(index, 1);
              renumberCities();
          } else if (selectedEntity.type === 'building') {
              bearTraps = bearTraps.filter(trap => trap !== selectedEntity);
              entities.splice(index, 1);
          } else {
              entities.splice(index, 1);
          }
          selectedEntity = null;
          drawGrid();
          drawEntities();
          updateCounters();
      }
    }

    if (event.key === 'ArrowUp') {
        const newY = selectedEntity.y - 1;
        if (newY >= 0 && isPositionValid(selectedEntity.x, newY, selectedEntity)) {
            selectedEntity.y = newY;
        }
    } else if (event.key === 'ArrowDown') {
        const newY = selectedEntity.y + 1;
        if (newY + selectedEntity.height <= gridCount && isPositionValid(selectedEntity.x, newY, selectedEntity)) {
            selectedEntity.y = newY;
        }
    } else if (event.key === 'ArrowLeft') {
        const newX = selectedEntity.x - 1;
        if (newX >= 0 && isPositionValid(newX, selectedEntity.y, selectedEntity)) {
            selectedEntity.x = newX;
        }
    } else if (event.key === 'ArrowRight') {
        const newX = selectedEntity.x + 1;
        if (newX + selectedEntity.width <= gridCount && isPositionValid(newX, selectedEntity.y, selectedEntity)) {
            selectedEntity.x = newX;
        }
    }

    drawGrid();
    drawEntities();
}

function isPositionValid(newX, newY, entity) {
    for (let other of entities) {
        if (other !== entity) {
            if (
                newX < other.x + other.width &&
                newX + entity.width > other.x &&
                newY < other.y + other.height &&
                newY + entity.height > other.y
            ) {
                return false;
            }
        }
    }
    return true;
}

function renumberCities() {
  let newId = 1;
  entities
      .filter(entity => entity.type === 'city')
      .forEach(city => {
            city.id = newId;
            if (!city.name || city.name.startsWith('City ')) {
                city.name = `City ${newId}`;
            }
            newId++;
      });
  cityCounterId = newId;
}

function compressMap(entities) {
    let bitString = "";

    entities.forEach(entity => {
        const type = entity.type === "flag" ? "00" :
                     entity.type === "city" ? "01" : "10";
        const x = entity.x.toString(2).padStart(10, "0");
        const y = entity.y.toString(2).padStart(10, "0");

        if (entity.x < 0 || entity.x >= gridCount || entity.y < 0 || entity.y >= gridCount) {
            console.error(`Invalid entity position during compression: (${entity.x}, ${entity.y})`);
            return;
        }

        bitString += type + x + y;

        // Add custom name
        if (entity.type === "city") {
            const name = entity.name || `City ${entity.id}`;
            const nameLength = name.length;
            const nameLengthBin = nameLength.toString(2).padStart(8, "0");
            bitString += nameLengthBin;
            for (let i = 0; i < name.length; i++) {
                const charBin = name.charCodeAt(i).toString(2).padStart(8, "0");
                bitString += charBin;
            }
        }
    });

    if (bitString.length % 8 !== 0) {
        const padding = "0".repeat(8 - (bitString.length % 8));
        bitString += padding;
    }

    const binaryArray = bitString.match(/.{1,8}/g).map(byte => parseInt(byte, 2));
    return btoa(String.fromCharCode(...binaryArray));
}



function decompressMap(base64) {
    const binaryString = atob(base64)
      .split("")
      .map(char => char.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");

    const entities = [];
    let i = 0;

    while (i + 22 <= binaryString.length) { // Ensure full 22 bits
        const typeBits = binaryString.slice(i, i + 2);
        i += 2;
        const xBits = binaryString.slice(i, i + 10);
        i += 10;
        const yBits = binaryString.slice(i, i + 10);
        i += 10;

        const type = typeBits === "00" ? "flag" :
                     typeBits === "01" ? "city" : "building";
        const x = parseInt(xBits, 2);
        const y = parseInt(yBits, 2);

        if (x < 0 || x >= gridCount || y < 0 || y >= gridCount) {
            console.error(`Invalid position in decompressed map: (${x}, ${y})`);
            continue;
        }

        let entity = { x, y, type };

        if (type === "flag") {
            entity.width = 1;
            entity.height = 1;
            entity.color = "gray";
        } else if (type === "city") {
            entity.width = 2;
            entity.height = 2;
            entity.color = getRandomColor();

            if (i + 8 > binaryString.length) break;
            const nameLengthBits = binaryString.slice(i, i + 8);
            i += 8;
            const nameLength = parseInt(nameLengthBits, 2);

            let name = "";
            for (let j = 0; j < nameLength; j++) {
                if (i + 8 > binaryString.length) break;
                const charBits = binaryString.slice(i, i + 8);
                i += 8;
                name += String.fromCharCode(parseInt(charBits, 2));
            }
            entity.name = name;
        } else if (type === "building") {
            entity.width = 3;
            entity.height = 3;
            entity.color = "black";
        }

        entities.push(entity);
    }

    return entities;
}

function saveMap() {
    try {
        const compressedMap = compressMap(entities);
        mapData.value = compressedMap;

        window.location.hash = '!' + compressedMap;        

        navigator.clipboard.writeText(compressedMap).then(() => {
            copyMessage.style.display = 'inline';
            setTimeout(() => {
                copyMessage.style.display = 'none';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    } catch (e) {
        console.error('Error saving map:', e);
    }
}

function shareMap() {
    try {
        const compressedMap = compressMap(entities);
        mapData.value = compressedMap;

        window.location.hash = '!' + compressedMap;

        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                copyMessage.style.display = 'inline';
                setTimeout(() => {
                    copyMessage.style.display = 'none';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    } catch (e) {
        console.error('Error saving map:', e);
    }
}

function loadMap() {
    try {
        const compressedMap = mapData.value;
        const loadedEntities = decompressMap(compressedMap);
        entities.length = 0;
        bearTraps.length = 0;

        loadedEntities.forEach(entity => {
            entities.push(entity);
            if (entity.type === "building") {
                bearTraps.push(entity);
            }
        });

        let cityId = 1;
        entities.forEach(entity => {
            if (entity.type === "city") {
                entity.id = cityId;
                if (!entity.name) {
                    entity.name = `${cityId}`;
                }
                cityId++;
            }
        });

        cityCounterId = cityId;

        drawGrid();
        drawEntities();
        updateCounters();
        updateCityList();
    } catch (e) {
        alert('Error loading the map. Please check the format.');
        console.error(e);
        console.log("Binary String Length:", binaryString.length);
        console.log("BitString (last 24 bits):", binaryString.slice(-24));
    }
}

function loadMapFromHash() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#!')) {
        const compressedMap = hash.slice(2); // Remove the '#!'
        mapData.value = compressedMap;
        const loadedEntities = decompressMap(compressedMap);
        entities.length = 0;
        bearTraps.length = 0;

        loadedEntities.forEach(entity => {
            entities.push(entity);
            if (entity.type === "building") {
                bearTraps.push(entity);
            }
        });

        let cityId = 1;
        entities.forEach(entity => {
            if (entity.type === "city") {
                entity.id = cityId;
                if (!entity.name) {
                    entity.name = `City ${cityId}`;
                }
                cityId++;
            }
        });
        cityCounterId = cityId;

        drawGrid();
        drawEntities();
        updateCounters();
        updateCityList();
    }
}

window.addEventListener('load', loadMapFromHash);
window.addEventListener('hashchange', loadMapFromHash);


loadButton.addEventListener('click', loadMap);
saveButton.addEventListener('click', saveMap);
shareButton.addEventListener('click', shareMap);

toolbar.addEventListener('click', (e) => {
    if (e.target.dataset.type) {
        selectedType = e.target.dataset.type;
        document.querySelectorAll('#toolbar button').forEach(button => button.classList.remove('selected'));
        e.target.classList.add('selected');
    }
});

canvas.addEventListener('click', (event) => {
    if (selectedType === 'select') {
        selectEntity(event);
    } else {
        addEntity(event);
    }
});

window.addEventListener('keydown', handleDeleteOrMove);
drawGrid();

deleteButton.addEventListener('click', () => {

  if (selectedEntity) {
      const index = entities.indexOf(selectedEntity);
      if (index !== -1) {
          if (selectedEntity.type === 'building') {
              bearTraps = bearTraps.filter(trap => trap !== selectedEntity);
          }
          entities.splice(index, 1);
          selectedEntity = null;
          renumberCities();
          updateCounters();
          drawGrid();
          drawEntities();
      }
  } else {
      alert('No entity selected to delete.');
  }
});

const downloadButton = document.getElementById('downloadButton');
function downloadCanvasAsPNG() {
    const link = document.createElement('a');
    link.download = 'layout.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

downloadButton.addEventListener('click', downloadCanvasAsPNG);

canvas.addEventListener('mousedown', (event) => {
    if (selectedType === 'select' && selectedEntity) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = Math.floor((event.clientX - rect.left) / gridSize);
        const mouseY = Math.floor((event.clientY - rect.top) / gridSize);

        if (
            mouseX >= selectedEntity.x &&
            mouseX < selectedEntity.x + selectedEntity.width &&
            mouseY >= selectedEntity.y &&
            mouseY < selectedEntity.y + selectedEntity.height
        ) {
            isDragging = true;
            dragOffsetX = mouseX - selectedEntity.x;
            dragOffsetY = mouseY - selectedEntity.y;
        }
    }
});

canvas.addEventListener('mousemove', (event) => {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = Math.floor((event.clientX - rect.left) / gridSize);
    const mouseY = Math.floor((event.clientY - rect.top) / gridSize);
    
    const newX = mouseX - dragOffsetX;
    const newY = mouseY - dragOffsetY;
    
    if (
        newX >= 0 &&
        newX + selectedEntity.width <= gridCount &&
        newY >= 0 &&
        newY + selectedEntity.height <= gridCount &&
        isPositionValid(newX, newY, selectedEntity)
    ) {
        selectedEntity.x = newX;
        selectedEntity.y = newY;
        drawGrid();
        drawEntities();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
});