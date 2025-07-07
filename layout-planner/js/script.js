// ===== DOM ELEMENTS =====
const canvas = document.getElementById('layoutCanvas');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const flagCounter = document.getElementById('flagCounter');
const cityCounter = document.getElementById('cityCounter');
const buildingCounter = document.getElementById('buildingCounter');
const nodeCounter = document.getElementById('nodeCounter');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const mapData = document.getElementById('mapData');
const copyMessage = document.getElementById('copyMessage');

// ===== GRID CONFIGURATION =====
const baseGridSize = 30;
let gridSize = baseGridSize;
let zoom = 1;
let panX = 0;
let panY = 0;
let canvasWidth, canvasHeight;

// Diamond grid dimensions
const gridCols = 20;
const gridRows = 20;

// ===== GAME STATE =====
const entities = [];
let selectedType = null;
let selectedEntity = null;
let cityCounterId = 1;
let bearTraps = [];
let isDragging = false;
let isPanning = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let hasUnsavedChanges = false;

// ===== CANVAS MANAGEMENT =====
// Initialize canvas size
function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Center the grid
    panX = canvasWidth / 2;
    panY = canvasHeight / 2;
    
    redraw();
}

// ===== COORDINATE CONVERSION =====
// Convert screen coordinates to diamond grid coordinates
function screenToDiamond(screenX, screenY) {
    const offsetX = (screenX - panX) / zoom;
    const offsetY = (screenY - panY) / zoom;
    
    // Convert to diamond grid system
    const diamondX = (offsetX + offsetY) / gridSize;
    const diamondY = (offsetY - offsetX) / gridSize;
    
    return {
        x: Math.floor(diamondX),
        y: Math.floor(diamondY)
    };
}

// Convert diamond grid coordinates to screen coordinates (center of diamond cell)
function diamondToScreen(gridX, gridY) {
    // Add 0.5 to center the objects within the diamond cells
    const centerX = gridX + 0.5;
    const centerY = gridY + 0.5;
    
    const offsetX = (centerX - centerY) * gridSize * 0.5;
    const offsetY = (centerX + centerY) * gridSize * 0.5;
    
    return {
        x: offsetX * zoom + panX,
        y: offsetY * zoom + panY
    };
}

// Convert diamond grid coordinates to screen coordinates (corner of diamond cell)
function diamondToScreenCorner(gridX, gridY) {
    const offsetX = (gridX - gridY) * gridSize * 0.5;
    const offsetY = (gridX + gridY) * gridSize * 0.5;
    
    return {
        x: offsetX * zoom + panX,
        y: offsetY * zoom + panY
    };
}

// ===== UI UPDATES =====
function updateCounters() {
    const flags = entities.filter(entity => entity.type === 'flag').length;
    const cities = entities.filter(entity => entity.type === 'city').length;
    const buildings = entities.filter(entity => entity.type === 'building').length;
    const nodes = entities.filter(entity => entity.type === 'node').length;

    flagCounter.textContent = flags;
    cityCounter.textContent = cities;
    buildingCounter.textContent = buildings;
    nodeCounter.textContent = nodes;
}

// ===== GRID RENDERING =====
function drawDiamondGrid() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    const currentGridSize = gridSize * zoom;
    
    // Draw diamond grid lines
    for (let x = -gridCols; x <= gridCols; x++) {
        for (let y = -gridRows; y <= gridRows; y++) {
            const screen = diamondToScreenCorner(x, y);
            const screen2 = diamondToScreenCorner(x + 1, y);
            const screen3 = diamondToScreenCorner(x, y + 1);
            
            if (screen.x > -100 && screen.x < canvasWidth + 100 && 
                screen.y > -100 && screen.y < canvasHeight + 100) {
                
                // Draw grid cell as diamond
                ctx.beginPath();
                ctx.moveTo(screen.x, screen.y);
                ctx.lineTo(screen2.x, screen2.y);
                ctx.lineTo(diamondToScreenCorner(x + 1, y + 1).x, diamondToScreenCorner(x + 1, y + 1).y);
                ctx.lineTo(screen3.x, screen3.y);
                ctx.closePath();
                ctx.stroke();
            }
        }
    }
    
    // Draw center marker
    ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.beginPath();
    ctx.arc(panX, panY, 8 * zoom, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
}

// ===== ENTITY RENDERING =====
function drawEntities() {
    // Draw flag areas first
    const flagAreas = new Set();
    entities.forEach(entity => {
        if (entity.type === 'flag') {
            markFlagArea(entity, flagAreas);
        }
    });
    drawFlagAreas(flagAreas);

    // Draw entities
    entities.forEach(entity => {
        drawEntity(entity);
        
        if (selectedEntity === entity) {
            drawSelectionHighlight(entity);
        }
    });
}

function drawEntity(entity) {
    ctx.save();
    
    const screen = diamondToScreen(entity.x, entity.y);
    const currentGridSize = gridSize * zoom;
    
    ctx.fillStyle = entity.color;
    
    // Draw entity based on its actual size (width x height)
    if (entity.width === 1 && entity.height === 1) {
        // Flag: 1x1 - single diamond cell
        const fillSize = currentGridSize * 0.9;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - fillSize * 0.5);
        ctx.lineTo(screen.x + fillSize * 0.5, screen.y);
        ctx.lineTo(screen.x, screen.y + fillSize * 0.5);
        ctx.lineTo(screen.x - fillSize * 0.5, screen.y);
        ctx.closePath();
        ctx.fill();
    } else {
        // City (2x2) or Bear Trap (3x3)
        // Calculate all corner points for the entire entity area
        const corners = [];
        
        // Get all grid cell corners that form the outer boundary
        for (let dx = 0; dx <= entity.width; dx++) {
            for (let dy = 0; dy <= entity.height; dy++) {
                const corner = diamondToScreenCorner(entity.x + dx, entity.y + dy);
                corners.push({ x: corner.x, y: corner.y, gridX: entity.x + dx, gridY: entity.y + dy });
            }
        }
        
        // Draw the filled area using the outer boundary
        const topLeft = diamondToScreenCorner(entity.x, entity.y);
        const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y);
        const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height);
        const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height);
        
        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(bottomLeft.x, bottomLeft.y);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw border around the entire entity
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = Math.max(1, 2 * zoom);
    
    if (entity.width === 1 && entity.height === 1) {
        // Single cell border
        const fillSize = currentGridSize * 0.9;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - fillSize * 0.5);
        ctx.lineTo(screen.x + fillSize * 0.5, screen.y);
        ctx.lineTo(screen.x, screen.y + fillSize * 0.5);
        ctx.lineTo(screen.x - fillSize * 0.5, screen.y);
        ctx.closePath();
        ctx.stroke();
    } else {
        // Multi-cell border - draw outline around entire entity using corner coordinates
        const topLeft = diamondToScreenCorner(entity.x, entity.y);
        const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y);
        const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height);
        const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height);
        
        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(bottomLeft.x, bottomLeft.y);
        ctx.closePath();
        ctx.stroke();
    }
    
    // Draw labels in center of entity
    const centerScreen = diamondToScreen(entity.x + entity.width/2 - 0.5, entity.y + entity.height/2 - 0.5);
    if (entity.type === 'city') {
        drawCityDetails(entity, centerScreen);
    } else if (entity.type === 'building') {
        drawBearTrapDetails(entity, centerScreen);
    } else if (entity.type === 'node') {
        drawNodeDetails(entity, centerScreen);
    } else if (entity.type === 'obstacle') {
        drawObstacleDetails(entity, centerScreen);
    }
    
    ctx.restore();
}

function drawCityDetails(city, screen) {
    ctx.fillStyle = 'black';
    
    // Scale font size, with minimum and maximum limits
    const currentGridSize = gridSize * zoom;
    const baseFontSize = Math.max(6, Math.min(16, currentGridSize * 0.25));
    ctx.font = `${baseFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Shift text upward to accommodate multiple bear trap times
    const baseOffset = -currentGridSize * 0.2;
    
    const label = city.name || `C${city.id}`;
    ctx.fillText(label, screen.x, screen.y + baseOffset);
    
    // Draw march times to bear traps
    const marchTimes = calculateMarchTimes(city);
    marchTimes.forEach((time, index) => {
        const yOffset = baseOffset + (index + 1) * currentGridSize * 0.25;
        ctx.fillText(`BT${index + 1}: ${time}s`, screen.x, screen.y + yOffset);
    });
}

function drawBearTrapDetails(trap, screen) {
    ctx.fillStyle = 'white';
    
    const currentGridSize = gridSize * zoom;
    const baseFontSize = Math.max(8, Math.min(20, currentGridSize * 0.3));
    ctx.font = `${baseFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const trapIndex = bearTraps.indexOf(trap) + 1;
    ctx.fillText(`BT${trapIndex}`, screen.x, screen.y);
}

function drawNodeDetails(node, screen) {
    ctx.fillStyle = 'white';
    
    const currentGridSize = gridSize * zoom;
    const baseFontSize = Math.max(6, Math.min(18, currentGridSize * 0.25));
    ctx.font = `${baseFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText('NODE', screen.x, screen.y);
}

function drawObstacleDetails(obstacle, screen) {
    ctx.fillStyle = 'white';
    
    // Scale font size with both grid size and zoom, with minimum and maximum limits  
    const currentGridSize = gridSize * zoom;
    const baseFontSize = Math.max(4, Math.min(12, currentGridSize * 0.2));
    ctx.font = `${baseFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
}

function drawSelectionHighlight(entity) {
    const currentGridSize = gridSize * zoom;
    
    ctx.save();
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = Math.max(2, 4 * zoom);
    ctx.setLineDash([5 * zoom, 5 * zoom]);
    
    if (entity.width === 1 && entity.height === 1) {
        // Single cell highlight
        const screen = diamondToScreen(entity.x, entity.y);
        const size = currentGridSize * 1.0;
        
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - size * 0.5);
        ctx.lineTo(screen.x + size * 0.5, screen.y);
        ctx.lineTo(screen.x, screen.y + size * 0.5);
        ctx.lineTo(screen.x - size * 0.5, screen.y);
        ctx.closePath();
        ctx.stroke();
    } else {
        // Multi-cell highlight - draw outline around entire entity using corner coordinates
        const topLeft = diamondToScreenCorner(entity.x, entity.y);
        const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y);
        const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height);
        const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height);
        
        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(bottomLeft.x, bottomLeft.y);
        ctx.closePath();
        ctx.stroke();
    }
    
    ctx.restore();
}
function calculateMarchTimes(city) {
    const times = [];
    bearTraps.forEach(trap => {
        const distance = Math.sqrt(
            Math.pow(trap.x - city.x, 2) +
            Math.pow(trap.y - city.y, 2)
        );
        const time = Math.round((distance / 10) * 32.5);
        times.push(time);
    });
    return times;
}

function markFlagArea(flagEntity, flagAreas) {
    const radiusSize = 3;
    const startX = flagEntity.x - radiusSize;
    const startY = flagEntity.y - radiusSize;
    const endX = flagEntity.x + radiusSize;
    const endY = flagEntity.y + radiusSize;

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            if (x >= -gridCols && x <= gridCols && y >= -gridRows && y <= gridRows) {
                flagAreas.add(`${x},${y}`);
            }
        }
    }
}

function drawFlagAreas(flagAreas) {
    ctx.save();
    ctx.fillStyle = 'rgba(173, 216, 230, 0.3)';
    
    flagAreas.forEach(coord => {
        const [x, y] = coord.split(',').map(Number);
        const screen = diamondToScreen(x, y);
        const currentGridSize = gridSize * zoom;
        const fillSize = currentGridSize * 0.9;
        
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - fillSize * 0.5);
        ctx.lineTo(screen.x + fillSize * 0.5, screen.y);
        ctx.lineTo(screen.x, screen.y + fillSize * 0.5);
        ctx.lineTo(screen.x - fillSize * 0.5, screen.y);
        ctx.closePath();
        ctx.fill();
    });
    
    ctx.restore();
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

// ===== ENTITY PLACEMENT =====
function addEntity(event) {
    if (!selectedType || selectedType === 'select') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const gridPos = screenToDiamond(mouseX, mouseY);
    const x = gridPos.x;
    const y = gridPos.y;

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
    } else if (selectedType === 'node') {
        color = 'darkgreen';
        width = 3;
        height = 3;
    } else if (selectedType === 'obstacle') {
        color = '#8B0000';
        width = 1;
        height = 1;
    }

    // Check for overlapping entities
    const overlapping = entities.some(entity => {
        return (
            x < entity.x + entity.width &&
            x + width > entity.x &&
            y < entity.y + entity.height &&
            y + height > entity.y
        );
    });

    // Additional check: prevent placing non-obstacle objects on obstacles
    if (selectedType !== 'obstacle') {
        const hasObstacleConflict = entities.some(entity => {
            if (entity.type !== 'obstacle') return false;
            return (
                x < entity.x + entity.width &&
                x + width > entity.x &&
                y < entity.y + entity.height &&
                y + height > entity.y
            );
        });
        
        if (hasObstacleConflict) {
            // Optional: Show visual feedback
            console.log('Cannot place object on obstacle area');
            return;
        }
    }

    if (!overlapping && x >= -gridCols && x + width <= gridCols && y >= -gridRows && y + height <= gridRows) {
        if (selectedType === 'city') {
            id = cityCounterId;
            cityCounterId++;
        }
        const newEntity = { x, y, width, height, color, type: selectedType, id };
        entities.push(newEntity);
        if (selectedType === 'building') {
            bearTraps.push(newEntity);
        }
        redraw();
        updateCounters();
        markUnsavedChanges();

        if (selectedType === 'city' || selectedType === 'building') {
            updateCityList();
        }
    }
}

function redraw() {
    drawDiamondGrid();
    drawEntities();
}

function selectEntity(event) {
    if (selectedType !== 'select') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const gridPos = screenToDiamond(mouseX, mouseY);

    selectedEntity = entities.find(entity => {
        return (
            gridPos.x >= entity.x &&
            gridPos.x < entity.x + entity.width &&
            gridPos.y >= entity.y &&
            gridPos.y < entity.y + entity.height
        );
    });

    redraw();
}

// ===== INPUT HANDLING =====
// Zoom and pan functionality
function handleWheel(event) {
    event.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * zoomFactor));
    
    // Zoom towards mouse position
    const dx = mouseX - panX;
    const dy = mouseY - panY;
    
    panX = mouseX - dx * (newZoom / zoom);
    panY = mouseY - dy * (newZoom / zoom);
    
    zoom = newZoom;
    gridSize = baseGridSize * zoom;
    
    redraw();
}

function handleMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    if (event.button === 1) { // Middle mouse button
        isPanning = true;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        event.preventDefault();
    } else if (event.button === 0) { // Left mouse button
        if (selectedType === 'select') {
            selectEntity(event);
            if (selectedEntity) {
                isDragging = true;
                const gridPos = screenToDiamond(mouseX, mouseY);
                dragOffsetX = gridPos.x - selectedEntity.x;
                dragOffsetY = gridPos.y - selectedEntity.y;
            }
        } else {
            addEntity(event);
        }
    }
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    if (isPanning) {
        panX += mouseX - lastMouseX;
        panY += mouseY - lastMouseY;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        redraw();
    } else if (isDragging && selectedEntity) {
        const gridPos = screenToDiamond(mouseX, mouseY);
        const newX = gridPos.x - dragOffsetX;
        const newY = gridPos.y - dragOffsetY;
        
        if (isPositionValid(newX, newY, selectedEntity)) {
            selectedEntity.x = newX;
            selectedEntity.y = newY;
            redraw();
            markUnsavedChanges();
        }
    }
}

function handleMouseUp(event) {
    if (event.button === 1) {
        isPanning = false;
    } else if (event.button === 0) {
        isDragging = false;
    }
}

function isPositionValid(newX, newY, entity) {
    if (newX < -gridCols || newX + entity.width > gridCols || 
        newY < -gridRows || newY + entity.height > gridRows) {
        return false;
    }
    
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

function handleKeyDown(event) {
    if (!selectedEntity) return;

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
        event.preventDefault();
    }    

    // City name editing
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
        redraw();
        updateCityList();
        markUnsavedChanges();
        return;
    }

    if (event.key === 'Delete') {
        deleteSelectedEntity();
    }

    // Movement with arrow keys
    let newX = selectedEntity.x;
    let newY = selectedEntity.y;
    
    if (event.key === 'ArrowUp') {
        newY -= 1;
    } else if (event.key === 'ArrowDown') {
        newY += 1;
    } else if (event.key === 'ArrowLeft') {
        newX -= 1;
    } else if (event.key === 'ArrowRight') {
        newX += 1;
    }
    
    if (isPositionValid(newX, newY, selectedEntity)) {
        selectedEntity.x = newX;
        selectedEntity.y = newY;
        redraw();
        markUnsavedChanges();
    }
}

function deleteSelectedEntity() {
    if (!selectedEntity) return;
    
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
        redraw();
        updateCounters();
        updateCityList();
        markUnsavedChanges();
    }
}

function updateCityList() {
    // Get march times for all cities
    entities.filter(e => e.type === 'city').forEach(city => { 
        city.marchTimes = calculateMarchTimes(city); 
    });
    
    const cityList = document.getElementById('cityList');
    const sortSelect = document.getElementById('citySort');
    if (!cityList || !sortSelect) return;

    const sortBy = sortSelect.value;
    enablePopulateSortOptions(sortBy);
    cityList.innerHTML = '';

    let cities = entities.filter(e => e.type === 'city');
    const btIndex = sortBy === 'bt1' ? 0 : sortBy === 'bt2' ? 1 : null;

    // Separate prioritized
    const prioritized = btIndex !== null
        ? cities.filter(c => c.priorities && c.priorities[`bt${btIndex+1}`])
        : [];
    const others = btIndex !== null
        ? cities.filter(c => !(c.priorities && c.priorities[`bt${btIndex+1}`]))
        : cities;

    // Comparator for sorting
    const comparator = (a, b) => {
        switch (sortBy) {
            case 'name':
                return (a.name || `City ${a.id}`)
                    .toLowerCase()
                    .localeCompare((b.name || `City ${b.id}`).toLowerCase());
            case 'bt1':
                return evaluateBTTime(a, 0) - evaluateBTTime(b, 0);
            case 'bt2':
                return evaluateBTTime(a, 1) - evaluateBTTime(b, 1);
            case 'both':
                return evaluateCombinedTime(a) - evaluateCombinedTime(b);
            default:
                return a.id - b.id;
        }
    };

    prioritized.sort(comparator);
    others.sort(comparator);

    // Render prioritized cities first, then others
    [...prioritized, ...others].forEach(city => {
        const li = document.createElement('li');
        li.className = 'flex items-center space-x-2 mb-2';

        // City name input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = city.name || `City ${city.id}`;
        input.placeholder = `City ${city.id}`;
        input.className = 'border p-1 rounded';
        input.style.width = '30ch';
        input.addEventListener('change', () => {
            city.name = input.value;
            redraw();
            markUnsavedChanges();
        });
        li.appendChild(input);

        // Create BT bubbles next to the city name
        city.marchTimes.forEach((time, i) => {
            const key = `bt${i+1}`;
            const isPriority = city.priorities && city.priorities[key];
            const bubble = document.createElement('span');
            bubble.textContent = `BT${i+1}: ${time}s`;
            bubble.className = `bt-bubble inline-block px-2 py-1 text-xs rounded cursor-pointer ${
                isPriority ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`;
            bubble.addEventListener('click', () => {
                city.priorities = city.priorities || {};
                city.priorities[key] = !city.priorities[key];
                if (city.priorities[key]) {
                    // Get best candidate for swap
                    const candidates = entities.filter(e => e.type === 'city' && !(e.priorities && e.priorities[key]));
                    if (candidates.length) {
                        let bestCity = candidates[0];
                        let bestTime;
                        if (sortBy === 'both') {
                            bestTime = evaluateCombinedTime(bestCity);
                        } else {
                            bestTime = evaluateBTTime(bestCity, i);
                        }
                        candidates.forEach(c => {
                            const t = sortBy === 'both' ? evaluateCombinedTime(c) : evaluateBTTime(c, i);
                            if (t < bestTime) {
                                bestTime = t;
                                bestCity = c;
                            }
                        });
                        // Swap coordinates
                        [city.x, bestCity.x] = [bestCity.x, city.x];
                        [city.y, bestCity.y] = [bestCity.y, city.y];
                    }
                }
                redraw();
                updateCityList();
                markUnsavedChanges();
            });
            li.appendChild(bubble);
        });

        cityList.appendChild(li);
    });
}

function renumberCities() {
    let newId = 1;
    entities
        .filter(entity => entity.type === 'city')
        .forEach(city => {
            city.id = newId;
            if (!city.name || city.name.startsWith('City ')) {
                city.name = `${newId}`;
            }
            newId++;
        });
    cityCounterId = newId;
}

// ===== DATA PERSISTENCE =====
// Compression and decompression functions
function compressMap(entities) {
    let bitString = "";

    entities.forEach(entity => {
        const type = entity.type === "flag" ? "000" :
                     entity.type === "city" ? "001" : 
                     entity.type === "building" ? "010" : 
                     entity.type === "node" ? "011" : "100"; // obstacle = "100"
        
        // Convert grid coordinates to positive values for storage
        const storageX = entity.x + gridCols;
        const storageY = entity.y + gridRows;
        
        const x = storageX.toString(2).padStart(10, "0");
        const y = storageY.toString(2).padStart(10, "0");

        bitString += type + x + y;

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

    // Auto-detect format: try to determine if this is legacy (22-bit) or new (23-bit) format
    const isLegacyFormat = detectLegacyFormat(binaryString);
    
    if (isLegacyFormat) {
        return decompressLegacy(binaryString);
    } else {
        return decompressNew(binaryString);
    }
}

function detectLegacyFormat(binaryString) {
    // Check if the data length is more consistent with 22-bit chunks vs 23-bit chunks
    const totalBits = binaryString.length;
    
    // Estimate how many entities we'd have with each format
    let entities22 = 0;
    let entities23 = 0;
    let i = 0;
    
    // Try parsing as 22-bit chunks (legacy format)
    while (i + 22 <= totalBits) {
        const typeBits = binaryString.slice(i, i + 2);
        i += 2;
        i += 20; // Skip x and y coordinates
        
        if (typeBits === "01") { // city in legacy format
            if (i + 8 > totalBits) break;
            const nameLengthBits = binaryString.slice(i, i + 8);
            i += 8;
            const nameLength = parseInt(nameLengthBits, 2);
            i += nameLength * 8;
        }
        entities22++;
    }
    
    // Reset and try parsing as 23-bit chunks (new format)
    i = 0;
    while (i + 23 <= totalBits) {
        const typeBits = binaryString.slice(i, i + 3);
        i += 3;
        i += 20;
        
        if (typeBits === "001") { // city in new format
            if (i + 8 > totalBits) break;
            const nameLengthBits = binaryString.slice(i, i + 8);
            i += 8;
            const nameLength = parseInt(nameLengthBits, 2);
            i += nameLength * 8;
        }
        entities23++;
    }
    
    // If we found more valid entities with 22-bit parsing, it's probably legacy
    return entities22 > entities23;
}

function decompressLegacy(binaryString) {
    const entities = [];
    let i = 0;

    while (i + 22 <= binaryString.length) {
        const typeBits = binaryString.slice(i, i + 2);
        i += 2;
        const xBits = binaryString.slice(i, i + 10);
        i += 10;
        const yBits = binaryString.slice(i, i + 10);
        i += 10;

        const type = typeBits === "00" ? "flag" :
                     typeBits === "01" ? "city" : 
                     typeBits === "10" ? "building" : "node";
        
        // Convert from old coordinate system (0-24) to new centered system (-12 to +12)
        const oldX = parseInt(xBits, 2);
        const oldY = parseInt(yBits, 2);
        const x = oldX - 12; // Center the old 0-24 range to -12 to +12
        const y = oldY - 12;

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
        } else if (type === "node") {
            entity.width = 3;
            entity.height = 3;
            entity.color = "darkgreen";
        }

        entities.push(entity);
    }

    return entities;
}

function decompressNew(binaryString) {
    const entities = [];
    let i = 0;

    while (i + 23 <= binaryString.length) {
        const typeBits = binaryString.slice(i, i + 3);
        i += 3;
        const xBits = binaryString.slice(i, i + 10);
        i += 10;
        const yBits = binaryString.slice(i, i + 10);
        i += 10;

        const type = typeBits === "000" ? "flag" :
                     typeBits === "001" ? "city" : 
                     typeBits === "010" ? "building" : 
                     typeBits === "011" ? "node" : "obstacle";
        
        // Convert back from storage coordinates
        const storageX = parseInt(xBits, 2);
        const storageY = parseInt(yBits, 2);
        const x = storageX - gridCols;
        const y = storageY - gridRows;

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
        } else if (type === "node") {
            entity.width = 3;
            entity.height = 3;
            entity.color = "darkgreen";
        } else if (type === "obstacle") {
            entity.width = 1;
            entity.height = 1;
            entity.color = "#8B0000";
        }

        entities.push(entity);
    }

    return entities;
}

function sanitizeMapName(name) {
    return name.replace(/[^a-zA-Z0-9 \-_]/g, '').substring(0, 30);
}

function compressMapWithName(entities, mapName) {
    let base64String = compressMap(entities);
    if (mapName && mapName.trim() !== '') {
        const sanitized = sanitizeMapName(mapName);
        base64String += "||" + sanitized;
    }
    return base64String;
}

function decompressMapWithName(combinedString) {
    let mapName = "";
    let base64String = combinedString;
    const marker = "||";
    if (combinedString.includes(marker)) {
        const parts = combinedString.split(marker);
        base64String = parts[0];
        mapName = parts[1];
        const mapNameInput = document.getElementById('mapNameInput');
        if (mapNameInput) {
            mapNameInput.value = mapName;
        }
    }
    return decompressMap(base64String);
}

function saveMap() {
    try {
        const mapName = document.getElementById('mapNameInput').value;
        const compressedMap = compressMapWithName(entities, mapName);
        mapData.value = compressedMap;
        
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('mapData', compressedMap);
        window.history.replaceState(null, '', newUrl);
        markChangesSaved();
    } catch (e) {
        console.error('Error saving map:', e);
    }
}

function shareMap() {
    try {
        const mapName = document.getElementById('mapNameInput').value;
        const compressedMap = compressMapWithName(entities, mapName);
        mapData.value = compressedMap;
        
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('mapData', compressedMap);
        window.history.replaceState(null, '', newUrl);

        navigator.clipboard.writeText(newUrl.toString())
            .then(() => {
                copyMessage.classList.remove('hidden');
                setTimeout(() => {
                    copyMessage.classList.add('hidden');
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
        markChangesSaved();
    } catch (e) {
        console.error('Error sharing map:', e);
    }
}

function loadMap() {
    try {
        const compressedMap = mapData.value;
        const loadedEntities = decompressMapWithName(compressedMap);
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

        redraw();
        updateCounters();
        updateCityList();
        markChangesSaved();
    } catch (e) {
        alert('Error loading the map. Please check the format.');
        console.error(e);
    }
}

function loadMapFromQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    const mapDataParam = urlParams.get('mapData');
    if (mapDataParam) {
        mapData.value = mapDataParam;
        loadMap();
    }
}

function downloadCanvasAsPNG() {
    const link = document.createElement('a');
    link.download = 'layout.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function markUnsavedChanges() {
    hasUnsavedChanges = true;
    updatePageTitle();
}

function markChangesSaved() {
    hasUnsavedChanges = false;
    updatePageTitle();
}

function updatePageTitle() {
    const baseTitle = 'Alliance Layout Planner';
    document.title = hasUnsavedChanges ? `${baseTitle} - Unsaved changes` : baseTitle;
}

// ===== CITY MANAGEMENT =====
// Populate sort selector dynamically
function enablePopulateSortOptions(selected) {
    const sortSelect = document.getElementById('citySort');
    if (!sortSelect) return;
    sortSelect.innerHTML = '';
    sortSelect.appendChild(new Option('ID', 'id'));
    sortSelect.appendChild(new Option('Name', 'name'));
    
    // Check presence of BT1/BT2
    const cities = entities.filter(e => e.type === 'city');
    const anyBT1 = cities.some(c => calculateMarchTimes(c).length >= 1);
    const anyBT2 = cities.some(c => calculateMarchTimes(c).length >= 2);
    
    if (anyBT1) sortSelect.appendChild(new Option('BT1-Time', 'bt1'));
    if (anyBT2) sortSelect.appendChild(new Option('BT2-Time', 'bt2'));
    if (anyBT1 && anyBT2) sortSelect.appendChild(new Option('Combined BT1+BT2', 'both'));
    
    if (selected && Array.from(sortSelect.options).some(o => o.value === selected)) {
        sortSelect.value = selected;
    } else {
        sortSelect.value = 'id';
    }
    sortSelect.onchange = updateCityList;
}

// Helper function to evaluate BT time for a city
function evaluateBTTime(city, btIndex) {
    const times = city.marchTimes || calculateMarchTimes(city);
    return times[btIndex] || Infinity;
}

// Helper function to evaluate combined BT1+BT2 time
function evaluateCombinedTime(city) {
    const times = city.marchTimes || calculateMarchTimes(city);
    const bt1 = times[0] || 0;
    const bt2 = times[1] || 0;
    return bt1 + bt2;
}

// ===== EVENT LISTENERS =====
// Event Listeners
window.addEventListener('resize', resizeCanvas);
window.addEventListener('DOMContentLoaded', () => {
    loadMapFromQuery();
    enablePopulateSortOptions('id');
    updateCityList();
});
window.addEventListener('keydown', handleKeyDown);

canvas.addEventListener('wheel', handleWheel);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

toolbar.addEventListener('click', (e) => {
    if (e.target.dataset.type) {
        selectedType = e.target.dataset.type;
        document.querySelectorAll('#toolbar button').forEach(button => 
            button.classList.remove('bg-yellow-500', 'bg-yellow-600'));
        e.target.classList.add('bg-yellow-500');
        e.target.classList.remove('bg-blue-500', 'bg-gray-500');
    }
});

document.getElementById('deleteButton').addEventListener('click', () => {
    if (selectedEntity) {
        deleteSelectedEntity();
    } else {
        alert('No entity selected to delete.');
    }
});

document.getElementById('downloadButton').addEventListener('click', downloadCanvasAsPNG);
document.getElementById('saveButton').addEventListener('click', saveMap);
document.getElementById('loadButton').addEventListener('click', loadMap);
document.getElementById('shareButton').addEventListener('click', shareMap);

// Map name validation
document.getElementById("mapNameInput").addEventListener("input", function() {
    const value = this.value;
    const disallowedRegex = /[^a-zA-Z0-9 \-_]/;
    const hintElement = document.getElementById("mapNameHint");
    if (disallowedRegex.test(value)) {
         hintElement.textContent = "Invalid characters detected! Only letters, numbers, spaces, hyphens, and underscores are allowed.";
         hintElement.style.display = "block";
    } else {
         hintElement.textContent = "";
         hintElement.style.display = "none";
    }
});

window.addEventListener('beforeunload', function(e) {
    if (hasUnsavedChanges) {
        const message = 'You have unsaved changes. Do you really want to leave?';
        e.preventDefault();
        return message;
    }
});

// ===== APPLICATION INITIALIZATION =====
// Initialize the application
resizeCanvas();
redraw();