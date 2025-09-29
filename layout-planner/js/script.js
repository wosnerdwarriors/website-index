// ===== DOM ELEMENTS =====
const canvas = document.getElementById('layoutCanvas');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const flagCounter = document.getElementById('flagCounter');
const cityCounter = document.getElementById('cityCounter');
const buildingCounter = document.getElementById('buildingCounter');
const hqCounter = document.getElementById('hqCounter');
const nodeCounter = document.getElementById('nodeCounter');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const mapData = document.getElementById('mapData');
const copyMessage = document.getElementById('copyMessage');
const shortUrlButton = document.getElementById('shortUrlButton');
const copyShortUrlButton = document.getElementById('copyShortUrlButton');
const shortUrlContainer = document.getElementById('shortUrlContainer');
const shortUrlOutput = document.getElementById('shortUrlOutput');
const shortUrlError = document.getElementById('shortUrlError');
const deleteButton = document.getElementById('deleteButton');
const clearButton = document.getElementById('clearButton');

// ===== GRID CONFIGURATION =====
const baseGridSize = 30;
let gridSize = baseGridSize;
let zoom = 1;
let panX = 0;
let panY = 0;
let canvasWidth, canvasHeight;

// Diamond grid dimensions
const gridCols = 30;
const gridRows = 30;

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
let ghostPreview = null;
let territoryPreview = null;
let cityLabelMode = "march";  // "march", "coords", "none"
let waveMode = false;
let coordAnchor = { x: 600, y: 600 };


// ==== WAVE COLORS ====
const wavePalette = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#f59e0b', // amber-500
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#84cc16', // lime-500
  '#2dd4bf'  // teal-400
];

// ===== TOUCH/MOBILE SUPPORT =====
let touchStartDistance = 0;
let initialZoom = 1;
let touchStartX = 0;
let touchStartY = 0;
let touchStartPanX = 0;
let touchStartPanY = 0;
let isTouching = false;
let touchStartTime = 0;

// ===== CANVAS MANAGEMENT =====
// Initialize canvas size
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    if (typeof window.__didInitialCenter === 'undefined') {
        panX = canvasWidth / 2;
        panY = canvasHeight / 2;
        window.__didInitialCenter = true;
    }
    
    redraw();
    updateZoomDisplay();
}

// ===== COORDINATE CONVERSION =====
// Convert screen coordinates to diamond grid coordinates
function screenToDiamond(screenX, screenY) {
    const currentGridSize = baseGridSize * zoom;
    const offsetX = screenX - panX;
    const offsetY = screenY - panY;

    // Convert to diamond grid system
    const diamondX = (offsetX + offsetY) / currentGridSize;
    const diamondY = (offsetY - offsetX) / currentGridSize;
    
    return {
        x: Math.floor(diamondX),
        y: Math.floor(diamondY)
    };
}

// Convert diamond grid coordinates to screen coordinates (center of diamond cell)
function diamondToScreen(gridX, gridY, pX, pY, z) {
    const currentGridSize = baseGridSize * z;
    // Add 0.5 to center the objects within the diamond cells
    const centerX = gridX + 0.5;
    const centerY = gridY + 0.5;
    
    const offsetX = (centerX - centerY) * currentGridSize * 0.5;
    const offsetY = (centerX + centerY) * currentGridSize * 0.5;
    
    return {
        x: offsetX + pX,
        y: offsetY + pY
    };
}

// Convert diamond grid coordinates to screen coordinates (corner of diamond cell)
function diamondToScreenCorner(gridX, gridY, pX, pY, z) {
    const currentGridSize = baseGridSize * z;
    const offsetX = (gridX - gridY) * currentGridSize * 0.5;
    const offsetY = (gridX + gridY) * currentGridSize * 0.5;
    
    return {
        x: offsetX + pX,
        y: offsetY + pY
    };
}

// ===== UI UPDATES =====
function updateCounters() {
    const flags = entities.filter(entity => entity.type === 'flag').length;
    const cities = entities.filter(entity => entity.type === 'city').length;
    const buildings = entities.filter(entity => entity.type === 'building').length;
    const hqs = entities.filter(entity => entity.type === 'hq').length;
    const nodes = entities.filter(entity => entity.type === 'node').length;

    // Update desktop counters
    flagCounter.textContent = flags;
    cityCounter.textContent = cities;
    buildingCounter.textContent = buildings;
    hqCounter.textContent = hqs;
    nodeCounter.textContent = nodes;

    // Update mobile counters
    document.getElementById('mobileFlagCounter').textContent = flags;
    document.getElementById('mobileCityCounter').textContent = cities;
    document.getElementById('mobileBuildingCounter').textContent = buildings;
    document.getElementById('mobileHqCounter').textContent = hqs;
    document.getElementById('mobileNodeCounter').textContent = nodes;
}

// ===== GRID RENDERING =====
function drawDiamondGrid(context, pX, pY, z) {
    const w = context.canvas.width;
    const h = context.canvas.height;
    context.clearRect(0, 0, w, h);
    
    // Create gradient background
    const gradient = context.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
    
    context.save();
    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    context.lineWidth = 1;
    
    // Draw diamond grid lines
    for (let x = -gridCols; x <= gridCols; x++) {
        for (let y = -gridRows; y <= gridRows; y++) {
            const screen = diamondToScreenCorner(x, y, pX, pY, z);
            const screen2 = diamondToScreenCorner(x + 1, y, pX, pY, z);
            const screen3 = diamondToScreenCorner(x, y + 1, pX, pY, z);
            
            if (screen.x > -100 && screen.x < w + 100 && 
                screen.y > -100 && screen.y < h + 100) {
                
                // Draw grid cell as diamond
                context.beginPath();
                context.moveTo(screen.x, screen.y);
                context.lineTo(screen2.x, screen2.y);
                context.lineTo(diamondToScreenCorner(x + 1, y + 1, pX, pY, z).x, diamondToScreenCorner(x + 1, y + 1, pX, pY, z).y);
                context.lineTo(screen3.x, screen3.y);
                context.closePath();
                context.stroke();
            }
        }
    }
    
    // Draw center marker
    context.fillStyle = 'rgba(255, 100, 100, 0.8)';
    context.beginPath();
    context.arc(pX, pY, 8 * z, 0, 2 * Math.PI);
    context.fill();
    context.restore();
}

// ===== ENTITY RENDERING =====
function drawEntities(context, pX, pY, z) {
    // Draw flag areas first
    const flagAreas = new Set();
    const hqAreas = new Set();
    entities.forEach(entity => {
        if (entity.type === 'flag') {
            markFlagArea(entity, flagAreas, 3);
        } else if (entity.type === 'hq') {
            markFlagArea(entity, hqAreas, 6);
        }
    });
     // Make existing areas slightly more transparent to let the preview stand out
    drawFlagAreas(context, pX, pY, z, flagAreas);
    drawFlagAreas(context, pX, pY, z, hqAreas);

    // Draw the territory preview for the building being placed
    drawTerritoryPreview(context, pX, pY, z, territoryPreview);

    // Combine flag areas and HQ areas for city positioning check
    const allProtectedAreas = new Set([...flagAreas, ...hqAreas]);

    // Draw entities
    entities.forEach(entity => {
        drawEntity(context, pX, pY, z, entity, allProtectedAreas);
        
        if (selectedEntity === entity) {
            drawSelectionHighlight(context, pX, pY, z, entity);
        }
    });
    
    // Draw ghost preview if applicable
    if (ghostPreview) {
        drawGhostEntity(context, pX, pY, z, ghostPreview);
    }
}

function drawEntity(context, pX, pY, z, entity, protectedAreas) {
    context.save();
    
    const screen = diamondToScreen(entity.x, entity.y, pX, pY, z);
    const currentGridSize = baseGridSize * z;
    
    context.fillStyle = (waveMode && entity.type === 'city')
    ? getWaveColorForCity(entity)
    : entity.color;
    
    // Draw entity based on its actual size (width x height)
    if (entity.width === 1 && entity.height === 1) {
        // Flag: 1x1 - single diamond cell
        const fillSize = currentGridSize * 0.9;
        context.beginPath();
        context.moveTo(screen.x, screen.y - fillSize * 0.5);
        context.lineTo(screen.x + fillSize * 0.5, screen.y);
        context.lineTo(screen.x, screen.y + fillSize * 0.5);
        context.lineTo(screen.x - fillSize * 0.5, screen.y);
        context.closePath();
        context.fill();
    } else {
        // City (2x2) or Bear Trap (3x3)
        // Calculate all corner points for the entire entity area
        const corners = [];
        
        // Get all grid cell corners that form the outer boundary
        for (let dx = 0; dx <= entity.width; dx++) {
            for (let dy = 0; dy <= entity.height; dy++) {
                const corner = diamondToScreenCorner(entity.x + dx, entity.y + dy, pX, pY, z);
                corners.push({ x: corner.x, y: corner.y, gridX: entity.x + dx, gridY: entity.y + dy });
            }
        }
        
        // Draw the filled area using the outer boundary
        const topLeft = diamondToScreenCorner(entity.x, entity.y, pX, pY, z);
        const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, pX, pY, z);
        const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, pX, pY, z);
        const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, pX, pY, z);
        
        context.beginPath();
        context.moveTo(topLeft.x, topLeft.y);
        context.lineTo(topRight.x, topRight.y);
        context.lineTo(bottomRight.x, bottomRight.y);
        context.lineTo(bottomLeft.x, bottomLeft.y);
        context.closePath();
        context.fill();
    }
    
    // Draw border around the entire entity

    // For cities outside protected areas, use red border; otherwise use black
    if (entity.type === 'city' && !isCityInProtectedArea(entity, protectedAreas)) {
        context.strokeStyle = 'rgba(255, 0, 0, 1.0)';
        context.lineWidth = Math.max(2, 4 * z);
    } else {
        context.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        context.lineWidth = Math.max(1, 2 * z);
    }
    
    if (entity.width === 1 && entity.height === 1) {
        // Single cell border
        const fillSize = currentGridSize * 0.9;
        context.beginPath();
        context.moveTo(screen.x, screen.y - fillSize * 0.5);
        context.lineTo(screen.x + fillSize * 0.5, screen.y);
        context.lineTo(screen.x, screen.y + fillSize * 0.5);
        context.lineTo(screen.x - fillSize * 0.5, screen.y);
        context.closePath();
        context.stroke();
    } else {
        // Multi-cell border - draw outline around entire entity using corner coordinates
        const topLeft = diamondToScreenCorner(entity.x, entity.y, pX, pY, z);
        const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, pX, pY, z);
        const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, pX, pY, z);
        const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, pX, pY, z);
        
        context.beginPath();
        context.moveTo(topLeft.x, topLeft.y);
        context.lineTo(topRight.x, topRight.y);
        context.lineTo(bottomRight.x, bottomRight.y);
        context.lineTo(bottomLeft.x, bottomLeft.y);
        context.closePath();
        context.stroke();
    }
    
    // Draw labels in center of entity
    const centerScreen = diamondToScreen(entity.x + entity.width/2 - 0.5, entity.y + entity.height/2 - 0.5, pX, pY, z);
    if (entity.type === 'city') {
        drawCityDetails(context, z, entity, centerScreen);
    } else if (entity.type === 'building') {
        drawBearTrapDetails(context, z, entity, centerScreen);
    } else if (entity.type === 'hq') {
        drawHQDetails(context, z, entity, centerScreen);
    } else if (entity.type === 'node') {
        drawNodeDetails(context, z, entity, centerScreen);
    } else if (entity.type === 'obstacle') {
        drawObstacleDetails(context, z, entity, centerScreen);
    }
    
    context.restore();
}

function drawGhostEntity(context, pX, pY, z, entity) {
    context.save();
    
    const screen = diamondToScreen(entity.x, entity.y, pX, pY, z);
    const currentGridSize = baseGridSize * z;
    
    // Helper function to draw the entity path
    const drawEntityPath = () => {
        if (entity.width === 1 && entity.height === 1) {
            // Single cell path
            const fillSize = currentGridSize * 0.9;
            context.beginPath();
            context.moveTo(screen.x, screen.y - fillSize * 0.5);
            context.lineTo(screen.x + fillSize * 0.5, screen.y);
            context.lineTo(screen.x, screen.y + fillSize * 0.5);
            context.lineTo(screen.x - fillSize * 0.5, screen.y);
            context.closePath();
        } else {
            // Multi-cell path
            const topLeft = diamondToScreenCorner(entity.x, entity.y, pX, pY, z);
            const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, pX, pY, z);
            const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, pX, pY, z);
            const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, pX, pY, z);
            
            context.beginPath();
            context.moveTo(topLeft.x, topLeft.y);
            context.lineTo(topRight.x, topRight.y);
            context.lineTo(bottomRight.x, bottomRight.y);
            context.lineTo(bottomLeft.x, bottomLeft.y);
            context.closePath();
        }
    };
    
    // Fill the ghost entity
    context.globalAlpha = 0.5;
    context.fillStyle = '#888888';
    drawEntityPath();
    context.fill();
    
    // Draw dashed border for ghost
    context.globalAlpha = 0.8;
    context.strokeStyle = '#666666';
    context.lineWidth = Math.max(1, 2 * z);
    context.setLineDash([3 * z, 3 * z]);
    drawEntityPath();
    context.stroke();
    
    context.restore();
}

function drawCityDetails(context, z, city, screen) {
    context.fillStyle = 'black';
    
    // Scale font size, with minimum and maximum limits
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(6, Math.min(16, currentGridSize * 0.25));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Shift text upward to accommodate multiple bear trap times
    const baseOffset = -currentGridSize * 0.2;
    
    const label = city.name || `City ${city.id}`;
    context.fillText(label, screen.x, screen.y + baseOffset);
    
    // Draw march times only if enabled
    if (cityLabelMode === 'march') {
        const marchTimes = calculateMarchTimes(city);
        marchTimes.forEach((time, index) => {
            const yOffset = baseOffset + (index + 1) * currentGridSize * 0.25;
            context.fillText(`BT${index + 1}: ${time}s`, screen.x, screen.y + yOffset);
        });
    }

    // ---- Show city coordinates relative to anchor ----  
    if (cityLabelMode === 'coords') {
        const c = coordForCity(city);
        const fs = Math.max(6, Math.min(14, baseGridSize * z * 0.22));
        context.font = `${fs}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillStyle = 'black';
        context.fillText(`${c.x}:${c.y}`, screen.x, screen.y + fs*0.8);
    }

}

function drawBearTrapDetails(context, z, trap, screen) {
    context.fillStyle = 'white';
    
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(8, Math.min(20, currentGridSize * 0.3));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    const trapIndex = bearTraps.indexOf(trap) + 1;
    context.fillText(`BT${trapIndex}`, screen.x, screen.y);
}

function drawHQDetails(context, z, hq, screen) {
    context.fillStyle = 'white';
    
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(8, Math.min(20, currentGridSize * 0.3));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    context.fillText('HQ', screen.x, screen.y);
}

function drawNodeDetails(context, z, node, screen) {
    context.fillStyle = 'white';
    
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(6, Math.min(18, currentGridSize * 0.25));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    context.fillText('NODE', screen.x, screen.y);
}

function drawObstacleDetails(context, z, obstacle, screen) {
    context.fillStyle = 'white';
    
    // Scale font size with both grid size and zoom, with minimum and maximum limits  
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(4, Math.min(12, currentGridSize * 0.2));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
}

function drawSelectionHighlight(context, pX, pY, z, entity) {
    const currentGridSize = baseGridSize * z;
    
    context.save();
    context.strokeStyle = '#ffff00';
    context.lineWidth = Math.max(2, 4 * z);
    context.setLineDash([5 * z, 5 * z]);
    
    if (entity.width === 1 && entity.height === 1) {
        // Single cell highlight
        const screen = diamondToScreen(entity.x, entity.y, pX, pY, z);
        const size = currentGridSize * 1.0;
        
        context.beginPath();
        context.moveTo(screen.x, screen.y - size * 0.5);
        context.lineTo(screen.x + size * 0.5, screen.y);
        context.lineTo(screen.x, screen.y + size * 0.5);
        context.lineTo(screen.x - size * 0.5, screen.y);
        context.closePath();
        context.stroke();
    } else {
        // Multi-cell highlight - draw outline around entire entity using corner coordinates
        const topLeft = diamondToScreenCorner(entity.x, entity.y, pX, pY, z);
        const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, pX, pY, z);
        const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, pX, pY, z);
        const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, pX, pY, z);
        
        context.beginPath();
        context.moveTo(topLeft.x, topLeft.y);
        context.lineTo(topRight.x, topRight.y);
        context.lineTo(bottomRight.x, bottomRight.y);
        context.lineTo(bottomLeft.x, bottomLeft.y);
        context.closePath();
        context.stroke();
    }
    
    context.restore();
}

function calculateMarchTimes(city) {
    const times = [];
    bearTraps.forEach(trap => {
        // Calculate center points of both entities
        const cityCenterX = city.x + city.width / 2 - 0.5;
        const cityCenterY = city.y + city.height / 2 - 0.5;
        const trapCenterX = trap.x + trap.width / 2 - 0.5;
        const trapCenterY = trap.y + trap.height / 2 - 0.5;
        
        const distance = Math.sqrt(
            Math.pow(trapCenterX - cityCenterX, 2) +
            Math.pow(trapCenterY - cityCenterY, 2)
        );
        const time = Math.round((distance / 10) * 32.5);
        times.push(time);
    });
    return times;
}

function markFlagArea(entity, areas, radiusSize = 3) {
    let centerX, centerY;
    
    if (entity.width === 1 && entity.height === 1) {
        // For flags (1x1), use the entity position directly
        centerX = entity.x;
        centerY = entity.y;
    } else {
        // For multi-cell entities (HQs), use the center of the entity
        // For a 3x3 entity at (0,0): center should be at (1,1)
        centerX = entity.x + Math.floor(entity.width / 2);
        centerY = entity.y + Math.floor(entity.height / 2);
    }
    
    // For HQs, we want the specified radius OUTSIDE the building
    let effectiveRadius = radiusSize;
    if (entity.type === 'hq') {
        effectiveRadius = radiusSize + Math.floor(entity.width / 2);
    }
    
    // Mark all fields within the effective radius
    for (let x = centerX - effectiveRadius; x <= centerX + effectiveRadius; x++) {
        for (let y = centerY - effectiveRadius; y <= centerY + effectiveRadius; y++) {
            if (x >= -gridCols && x <= gridCols && y >= -gridRows && y <= gridRows) {
                areas.add(`${x},${y}`);
            }
        }
    }
}

// Helper function to check if a city is within any flag's or HQ's area
function isCityInProtectedArea(cityEntity, protectedAreas) {
    // For a 2x2 city, check all 4 grid cells that the city occupies
    for (let dx = 0; dx < cityEntity.width; dx++) {
        for (let dy = 0; dy < cityEntity.height; dy++) {
            const gridX = cityEntity.x + dx;
            const gridY = cityEntity.y + dy;
            
            // If any cell of the city is NOT in a protected area (flag or HQ), the city is not well positioned
            if (!protectedAreas.has(`${gridX},${gridY}`)) {
                return false;
            }
        }
    }
    
    // All cells of the city are within protected areas
    return true;
}

function drawFlagAreas(context, pX, pY, z, areas, color = 'rgba(173, 216, 230, 0.3)') {
    context.save();
    context.fillStyle = color;
    
    areas.forEach(coord => {
        const [x, y] = coord.split(',').map(Number);
        const screen = diamondToScreen(x, y, pX, pY, z);
        const currentGridSize = baseGridSize * z;
        const fillSize = currentGridSize * 0.9;
        
        context.beginPath();
        context.moveTo(screen.x, screen.y - fillSize * 0.5);
        context.lineTo(screen.x + fillSize * 0.5, screen.y);
        context.lineTo(screen.x, screen.y + fillSize * 0.5);
        context.lineTo(screen.x - fillSize * 0.5, screen.y);
        context.closePath();
        context.fill();
    });
    
    context.restore();
}

function drawTerritoryPreview(context, pX, pY, z, areas) {
    if (!areas) return;
    // Use a distinct color for the preview
    drawFlagAreas(context, pX, pY, z, areas, 'rgba(96, 194, 226, 0.3)');
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

function getWaveRing(city) {
  if (!bearTraps.length) return null;

  // City-Center
  const cx = city.x + city.width  / 2 - 0.5;
  const cy = city.y + city.height / 2 - 0.5;

  let best = Infinity;

  for (const t of bearTraps) {
    // Trap-Center + "Halfheight/width" in cells
    const tx = t.x + t.width  / 2 - 0.5;
    const ty = t.y + t.height / 2 - 0.5;
    const rx = (t.width  - 1) / 2;
    const ry = (t.height - 1) / 2;

    // (Trap-Center - City-Center) - (Halfheight/width)
    const dxOut = Math.max(Math.abs(cx - tx) - rx, 0);
    const dyOut = Math.max(Math.abs(cy - ty) - ry, 0);

    // All neighbors – including diagonals – are considered part of the same wave
    // => Chebyshev-Distance to rectangle
    const ring = Math.max(Math.ceil(dxOut), Math.ceil(dyOut)) + 1;

    if (ring < best) best = ring;
  }
  return best; // 1 = next to bt, 2 = next row, etc.
}

function getWaveColorForCity(city) {
    const ring = getWaveRing(city);
    if (ring == null) return city.color;
    return wavePalette[ring % wavePalette.length];
}

function clamp1200(n){ return Math.max(0, Math.min(1199, n|0)); }

function parseCoordInput(s){
    if (!s) return null;
    const m = String(s).trim().match(/^(\d{1,4})\s*[:;,]\s*(\d{1,4})$/);
    if (!m) return null;
    return { x: clamp1200(+m[1]), y: clamp1200(+m[2]) };
}
function setCoordAnchor(x, y){
    coordAnchor = { x: clamp1200(x), y: clamp1200(y) };
    redraw();
}

// middle of the grid in diamond coords
function anchorGridCell() {
    return { x: 0, y: 0 };
}

// city x/y coords in 0..1199, relative to anchor
function coordForCity(city) {
    const tipX = city.x + city.width - 1;
    const tipY = city.y + city.height - 1;
    const mid = anchorGridCell();
    const dx = tipX - mid.x;
    const dy = tipY - mid.y;

    return {
        x: clamp1200(coordAnchor.x - dy),
        y: clamp1200(coordAnchor.y - dx)
    };
}

function drawAnchorSymbol(context, pX, pY, z) {
    if (cityLabelMode !== 'coords') return;

    const midCell   = anchorGridCell();
    const midCenter = diamondToScreen(midCell.x, midCell.y, pX, pY, z);
    const s  = baseGridSize * z * 0.9;
    const fs = Math.max(14, baseGridSize * z * 0.7);

    context.save();

    context.font = `${fs}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'rgba(255,255,255,0.4)';
    context.fillText("⚓", midCenter.x, midCenter.y);
    context.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    context.lineWidth = Math.max(1, 2 * z);
    context.beginPath();
    context.moveTo(midCenter.x,           midCenter.y - s * 0.5);
    context.lineTo(midCenter.x + s * 0.5, midCenter.y);
    context.lineTo(midCenter.x,           midCenter.y + s * 0.5);
    context.lineTo(midCenter.x - s * 0.5, midCenter.y);
    context.closePath();
    context.stroke();

    context.restore();
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
    } else if (selectedType === 'hq') {
        color = 'darkgoldenrod';
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

    const newEntityTemplate = { x, y, width, height, type: selectedType };
    if (isPositionValid(x, y, newEntityTemplate)) {
        if (selectedType === 'city') {
            id = cityCounterId;
            cityCounterId++;
        }
        const newEntity = { ...newEntityTemplate, color, id };

        if (selectedType === 'city' && !newEntity.name) {
            newEntity.name = `City ${id}`;
        }

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
    drawDiamondGrid(ctx, panX, panY, zoom);
    drawEntities(ctx, panX, panY, zoom);
    drawAnchorSymbol(ctx, panX, panY, zoom);
}

function selectEntity(event) {
    if (selectedType !== 'select') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const gridPos = screenToDiamond(mouseX, mouseY);

    const clickedEntity = entities.find(entity => {
        return (
            gridPos.x >= entity.x &&
            gridPos.x < entity.x + entity.width &&
            gridPos.y >= entity.y &&
            gridPos.y < entity.y + entity.height
        );
    });

    if (clickedEntity) {
        selectedEntity = clickedEntity;
    } else {
        selectedEntity = null;
    }

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
    updateZoomDisplay();
}

// Unified zoom controls
function zoomIn() {
    const newZoom = Math.min(3, zoom * 1.2);
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const dx = centerX - panX;
    const dy = centerY - panY;
    
    panX = centerX - dx * (newZoom / zoom);
    panY = centerY - dy * (newZoom / zoom);
    
    zoom = newZoom;
    gridSize = baseGridSize * zoom;
    redraw();
    updateZoomDisplay();
}

function zoomOut() {
    const newZoom = Math.max(0.1, zoom * 0.8);
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const dx = centerX - panX;
    const dy = centerY - panY;
    
    panX = centerX - dx * (newZoom / zoom);
    panY = centerY - dy * (newZoom / zoom);
    
    zoom = newZoom;
    gridSize = baseGridSize * zoom;
    redraw();
    updateZoomDisplay();
}

function resetZoom() {
    zoom = 1;
    gridSize = baseGridSize;
    redraw();
    updateZoomDisplay();
}

function centerMap() {
    panX = canvasWidth / 2;
    panY = canvasHeight / 2;
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
        } else if (selectedType === 'move') {
            isPanning = true;
            lastMouseX = mouseX;
            lastMouseY = mouseY;
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
    } else {
        updateGhostPreview(mouseX, mouseY);
    }
}

function handleMouseUp(event) {
    if (event.button === 1) {
        isPanning = false;
    } else if (event.button === 0) {
        isDragging = false;
        if (selectedType === 'move') {
            isPanning = false;
        }
    }
}

// Update this function to handle both desktop and mobile toolbars
function handleToolbarClick(e) {
    if (e.target.dataset.type) {
        selectedType = e.target.dataset.type;
        selectedEntity = null; // Deselect any entity when changing tools
        
        // Remove highlighting from all buttons in both toolbars
        document.querySelectorAll('#toolbar-controls button, #toolbar-buildings button, #mobile-toolbar-buildings button').forEach(button => {
            button.classList.remove('bg-yellow-500', 'bg-yellow-600');
            
            // Restore original colors for non-selected buttons
            if (button.dataset.type === e.target.dataset.type) {
                button.classList.add('bg-yellow-500');
            } else {
                if (button.dataset.type === 'flag') button.classList.add('bg-blue-500');
                if (button.dataset.type === 'city') button.classList.add('bg-blue-500');
                if (button.dataset.type === 'building') button.classList.add('bg-blue-500');
                if (button.dataset.type === 'node') button.classList.add('bg-blue-500');
                if (button.dataset.type === 'hq') button.classList.add('bg-blue-500');
                if (button.dataset.type === 'obstacle') button.classList.add('bg-blue-500');
            }
        });
        
        if ((selectedType === 'select' || selectedType === 'move') && ghostPreview) {
            ghostPreview = null;
        }
        redraw(); // Redraw to remove selection highlight
        
        // Update cursor style
        if (selectedType === 'move') {
            canvas.style.cursor = 'move';
        } else if (selectedType === 'select') {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }
}

// ===== SET/RENDER GUI BUTTONS =====
function setCityLabelMode(mode) {
    // mode: "march", "coords", "none"
	cityLabelMode = mode
    const p1 = document.querySelector('[citySettingsButtons="1"]');
    const m1 = document.querySelector('[citySettingsButtons="m1"]');
    const p3 = document.querySelector('[citySettingsButtons="3"]');
    const m3 = document.querySelector('[citySettingsButtons="m3"]');
    const anchorInputContainer = document.getElementById('anchorInputContainer');

    // Reset all
    [p1, m1, p3, m3].forEach(b => {
        if (b) b.classList.remove('bg-yellow-500', 'bg-indigo-600', 'text-white');
    });

    if (mode === "march") {
        [p1, m1].forEach(b => b?.classList.add('bg-yellow-500', 'text-white'));
    }
    if (mode === "coords") {
        [p3, m3].forEach(b => b?.classList.add('bg-indigo-600', 'text-white'));
    }

    if (anchorInputContainer) {
        anchorInputContainer.classList.toggle('hidden', mode !== "coords");
    }

    redraw();
}

function setWaveMode(_waveMode) {
    waveMode = _waveMode
    
    const d2 = document.querySelector('[citySettingsButtons="2"]');
    const m2 = document.querySelector('[citySettingsButtons="m2"]');
    [d2, m2].forEach(b => {
        if (!b) return;
        b.classList.toggle('bg-yellow-500', waveMode);
        b.classList.toggle('text-white', waveMode);
    });
    redraw();
}

function setAnchorInput(anchor) {
    if (anchor) {
        setCoordAnchor(anchor.x, anchor.y)
        const anchorInput = document.getElementById('anchorInput');
        if (anchorInput) anchorInput.value = anchor.x + ':' + anchor.y; 
    } 
}

// initialize text field with default
setAnchorInput(coordAnchor);


// ===== EVENT LISTENERS =====
window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', handleKeyDown);

canvas.addEventListener('wheel', handleWheel);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mouseleave', () => {
    // Clear ghost preview when mouse leaves canvas
    if (ghostPreview) {
        ghostPreview = null;
        territoryPreview = null;
        redraw();
    }
});

window.addEventListener('DOMContentLoaded', () => {
    loadMapFromQuery();
    enablePopulateSortOptions('id');
    updateCityList();
    updateZoomDisplay();
    
    // Set up toolbar click handlers
    document.querySelectorAll('#toolbar-controls button, #toolbar-buildings button').forEach(button => {
        button.addEventListener('click', handleToolbarClick);
    });

    // Set up mobile toolbar click handlers
    document.querySelectorAll('#mobile-toolbar-buildings button').forEach(button => {
        button.addEventListener('click', handleToolbarClick);
    });

    // Add zoom control event listeners
    document.getElementById('zoomInBtn')?.addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn')?.addEventListener('click', zoomOut);
    document.getElementById('resetZoomBtn')?.addEventListener('click', resetZoom);
    document.getElementById('centerBtn')?.addEventListener('click', centerMap);
    
    // Sync map data between desktop and mobile textareas
    const mapDataInput = document.getElementById('mapData');
    const mobileMapData = document.getElementById('mobileMapData');
    if (mapDataInput && mobileMapData) {
        mapDataInput.addEventListener('input', () => {
            mobileMapData.value = mapDataInput.value;
        });
        mobileMapData.addEventListener('input', () => {
            mapDataInput.value = mobileMapData.value;
        });
    }

    // Event Listener for actions
    document.getElementById('shareButton')?.addEventListener('click', shareMap);
    document.getElementById('mobileShareButton')?.addEventListener('click', shareMap);
    document.getElementById('setAnchorBtn')?.addEventListener('click', handleSetAnchor);
    document.getElementById('saveAsCSVButton')?.addEventListener('click', () => exportPlayerNamesCSV({ onlyNamed: false }));

    // QOL - Set anchor on Enter key in input field
    document.getElementById('anchorInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
            e.preventDefault();
            handleSetAnchor();
        }
    });
    
    // Copy short url (desktop)
    document.getElementById('copyShortUrlButton')?.addEventListener('click', () => {
        const out = document.getElementById('shortUrlOutput');
        if (out && out.value) {
            navigator.clipboard?.writeText(out.value).then(() => {
                const msg = document.getElementById('copyMessage');
                if (msg) { msg.classList.remove('hidden'); setTimeout(()=>msg.classList.add('hidden'),2000); }
            }).catch(()=>{ /* ignore */ });
        }
    });
    
    // Copy short url (mobile) - if mobile elements exist
    document.getElementById('mobileCopyShortUrlButton')?.addEventListener('click', () => {
        const out = document.getElementById('mobileShortUrlOutput');
        if (out && out.value) {
            navigator.clipboard?.writeText(out.value).then(() => {
                const msg = document.getElementById('mobileCopyMessage') || document.getElementById('copyMessage');
                if (msg) { msg.classList.remove('hidden'); setTimeout(()=>msg.classList.add('hidden'),2000); }
            }).catch(()=>{ /* ignore */ });
        }
    });
    
    // Add action button event listeners for both desktop and mobile
    ['', 'mobile'].forEach(prefix => {
        const p = prefix ? prefix + '-' : '';
        document.getElementById(`${prefix}loadButton`)?.addEventListener('click', () => {
            const dataInput = document.getElementById(`${prefix}mapData`);
            if (dataInput && dataInput.value) {
                loadMap();
            } else {
                const altDataInput = document.getElementById(dataInput.id === 'mapData' ? 'mobileMapData' : 'mapData');
                if (altDataInput && altDataInput.value) {
                    loadMap();
                } else {
                    alert('Please enter map data first.');
                }
            }
        });
        
        document.getElementById(`${prefix}saveButton`)?.addEventListener('click', saveMap);
        document.getElementById(`${prefix}shareButton`)?.addEventListener('click', shareMap);
        document.getElementById(`${prefix}downloadButton`)?.addEventListener('click', downloadCanvasAsPNG);
    });
    
    deleteButton.addEventListener('click', () => {
        if (selectedEntity) {
            deleteSelectedEntity();
        } else {
            alert('No entity selected to delete.');
        }
    });
    
    // Clear the entire map
    clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire map? This cannot be undone.')) {
            entities.length = 0;
            bearTraps.length = 0;
            cityCounterId = 1;
            selectedEntity = null;
            
            redraw();
            updateCounters();
            updateCityList();
            markUnsavedChanges();
        }
    });

    function handleSetAnchor() {
        const input = document.getElementById('anchorInput');
        if (!input) return;
        const val = input.value;
        const pt = parseCoordInput(val);
        if (pt) {
            setCoordAnchor(pt.x, pt.y);
        } else {
            alert('Invalid format or out of bounds 0..1199');
        }
        }

    const csvInput = document.getElementById('playersCsvInput');
    if (csvInput){
        csvInput.addEventListener('change', async (e)=>{
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            importPlayerNamesCSV(text);
            csvInput.value = '';
        });
    }
    
    // Add handlers for city settings buttons (P1 = clock toggle)
    document.querySelectorAll('[citySettingsButtons]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = btn.getAttribute('citySettingsButtons') || '';

            // P1: Toggle Marchtimes
            if (key.endsWith('1')) {
                setCityLabelMode(cityLabelMode === "march" ? "none" : "march");
            }

            // P2: Wavemode
            if (key.endsWith('2')) {
                setWaveMode(!waveMode);
            }

            // P3: Show Coords
            if (key.endsWith('3')) {
                setCityLabelMode(cityLabelMode === "coords" ? "none" : "coords");
            }

            // P4: Load CSV
            if (key.endsWith('4')) {
                document.getElementById('playersCsvInput')?.click();
            }
        });
    });
});

function preventActionOnEmptyMap(actionText) {
    if (entities.length === 0) {
        alert(`The map is empty. Add some buildings before ${actionText}.`);
        return true; // Action should be prevented
    }
    return false;
}

// Update saveMap function to sync both textareas
function saveMap() {
    if (preventActionOnEmptyMap("generating the code")) return;

    try {
        const mapName = document.getElementById('mapNameInput').value;
        const compressedMap = compressMapWithName(entities, mapName);
        const mapDataInput = document.getElementById('mapData');
        const mobileMapData = document.getElementById('mobileMapData');
        
        if (mapDataInput) mapDataInput.value = compressedMap;
        if (mobileMapData) mobileMapData.value = compressedMap;
        
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('mapData', compressedMap);
        window.history.replaceState(null, '', newUrl);
        markChangesSaved();
    } catch (e) {
        console.error('Error saving map:', e);
    }
}

// Update shareMap function to support mobile copy message
function shareMap() {
    if (preventActionOnEmptyMap("sharing")) return;
    try {
        const mapName = document.getElementById('mapNameInput').value;
        const compressedMap = compressMapWithName(entities, mapName);
        const mapDataInput = document.getElementById('mapData');
        const mobileMapData = document.getElementById('mobileMapData');
        
        if (mapDataInput) mapDataInput.value = compressedMap;
        if (mobileMapData) mobileMapData.value = compressedMap;
        
        const longUrl = getShareableUrl(entities, mapName);
        window.history.replaceState(null, '', longUrl);

        navigator.clipboard.writeText(longUrl)
            .then(() => {
                const copyMessage = document.getElementById('copyMessage');
                const mobileCopyMessage = document.getElementById('mobileCopyMessage');
                
                [copyMessage, mobileCopyMessage].forEach(msg => {
                    if (msg) {
                        msg.classList.remove('hidden');
                        setTimeout(() => msg.classList.add('hidden'), 2000);
                    }
                });
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
        markChangesSaved();
    } catch (e) {
        console.error('Error sharing map:', e);
    }
}

// Short URL feature: encapsulated in async IIFE to avoid race conditions and keep config/vars scoped
    const SHORT_URL_GENERATING_TEXT = 'Generating...';

    (async () => {
    	const shortUrlButton = document.getElementById('shortUrlButton');
    	const mobileShortUrlButton = document.getElementById('mobileShortUrlButton');
    	const copyShortUrlButton = document.getElementById('copyShortUrlButton');
    	const mobileCopyShortUrlButton = document.getElementById('mobileCopyShortUrlButton');
    	const shortUrlContainer = document.getElementById('shortUrlContainer');
    	const mobileShortUrlContainer = document.getElementById('mobileShortUrlContainer');
    	const shortUrlOutput = document.getElementById('shortUrlOutput');
    	const mobileShortUrlOutput = document.getElementById('mobileShortUrlOutput');
    	const shortUrlError = document.getElementById('shortUrlError');
    	const mobileShortUrlError = document.getElementById('mobileShortUrlError');

    	// simple default shortener endpoint (returns plain text)
    	const config = {
    		tinyurlApi: 'https://tinyurl.com/api-create.php',
    		tinyurlManual: 'https://tinyurl.com/app/'
    	};

    	async function doShorten(longUrl) {
    		// show both containers (desktop + mobile) and reset fields
    		if (shortUrlContainer) shortUrlContainer.classList.remove('hidden');
    		if (mobileShortUrlContainer) mobileShortUrlContainer.classList.remove('hidden');
    		if (shortUrlOutput) shortUrlOutput.value = SHORT_URL_GENERATING_TEXT;
    		if (mobileShortUrlOutput) mobileShortUrlOutput.value = SHORT_URL_GENERATING_TEXT;
    		if (shortUrlError) shortUrlError.textContent = '';
    		if (mobileShortUrlError) mobileShortUrlError.textContent = '';

    		// disable while working
    		if (shortUrlButton) shortUrlButton.disabled = true;
    		if (mobileShortUrlButton) mobileShortUrlButton.disabled = true;

    		try {
    			const controller = new AbortController();
    			const timeout = setTimeout(() => controller.abort(), 10000);
    			const resp = await fetch(`${config.tinyurlApi}?url=${encodeURIComponent(longUrl)}`, { signal: controller.signal });
    			clearTimeout(timeout);
    			if (!resp.ok) throw new Error(`Shortener API error ${resp.status}`);
    			let text = await resp.text();

    			// some endpoints might return JSON - try parse
    			try {
    				const j = JSON.parse(text);
    				if (j && (j.shortUrl || j.result || (j.data && j.data.tiny_url))) {
    					text = j.shortUrl || j.result || j.data.tiny_url;
    				}
    			} catch (_) {}

    			// set both outputs
    			if (shortUrlOutput) shortUrlOutput.value = text;
    			if (mobileShortUrlOutput) mobileShortUrlOutput.value = text;
    			markChangesSaved();
    		} catch (err) {
    			console.warn('Short URL failed, falling back to long URL', err);
    			const longFallback = longUrl;
    			if (shortUrlOutput) shortUrlOutput.value = longFallback;
    			if (mobileShortUrlOutput) mobileShortUrlOutput.value = longFallback;

    			// show manual fallback links
    			if (shortUrlError) {
    				shortUrlError.textContent = 'Shortening failed. ';
    				const a = document.createElement('a');
    				a.href = `${config.tinyurlManual}?url=${encodeURIComponent(longFallback)}`;
    				a.target = '_blank';
    				a.rel = 'noopener noreferrer';
    				a.textContent = 'Try manually';
    				a.className = 'underline text-blue-600';
    				shortUrlError.appendChild(a);
    			}
    			if (mobileShortUrlError) {
    				mobileShortUrlError.textContent = 'Shortening failed. ';
    				const a = document.createElement('a');
    				a.href = `${config.tinyurlManual}?url=${encodeURIComponent(longFallback)}`;
    				a.target = '_blank';
    				a.rel = 'noopener noreferrer';
    				a.textContent = 'Try manually';
    				a.className = 'underline text-blue-600';
    				mobileShortUrlError.appendChild(a);
    			}
    		} finally {
    			if (shortUrlButton) shortUrlButton.disabled = false;
    			if (mobileShortUrlButton) mobileShortUrlButton.disabled = false;
    		}
    	}

    	// helper: show copy success for desktop + mobile
    	function showCopySuccess() {
    		// visual feedback on output field
    		if (shortUrlOutput) {
    			shortUrlOutput.classList.add('bg-green-100');
    			setTimeout(() => shortUrlOutput.classList.remove('bg-green-100'), 1000);
    		}
    		// show copy message(s)
    		const desktopMsg = document.getElementById('copyMessage');
    		const mobileMsg = document.getElementById('mobileCopyMessage');
    		[desktopMsg, mobileMsg].forEach(msg => {
    			if (msg) {
    				msg.classList.remove('hidden');
    				setTimeout(() => msg.classList.add('hidden'), 2000);
    			}
    		});
    	}

    	// robust copy helper with execCommand fallback
    	async function tryCopyText(text) {
    		if (!text) return false;
    		// try Clipboard API
    		if (navigator.clipboard && navigator.clipboard.writeText) {
    			try {
    				await navigator.clipboard.writeText(text);
    				return true;
    			} catch (e) {
    				// continue to fallback
    			}
    		}
    		// fallback: textarea + execCommand
    		try {
    			const ta = document.createElement('textarea');
    			ta.value = text;
    			ta.style.position = 'fixed';
    			ta.style.left = '-9999px';
    			document.body.appendChild(ta);
    			ta.select();
    			const ok = document.execCommand('copy');
    			document.body.removeChild(ta);
    			return !!ok;
    		} catch (e) {
    			return false;
    		}
    	}

    	// bind desktop shortener button (unchanged)
    	if (shortUrlButton) {
    		shortUrlButton.addEventListener('click', async () => {
                if (preventActionOnEmptyMap("generating a short URL")) return;
    			const mapName = document.getElementById('mapNameInput')?.value || '';
    			const compressed = compressMapWithName(entities, mapName);
    			if (document.getElementById('mapData')) document.getElementById('mapData').value = compressed;
    			const longUrl = getShareableUrl(entities, mapName);
    			await doShorten(longUrl);
    		});
    	}

    	// bind mobile shortener button (unchanged)
    	if (mobileShortUrlButton) {
    		mobileShortUrlButton.addEventListener('click', async () => {
                if (preventActionOnEmptyMap("generating a short URL")) return;
    			const mapName = document.getElementById('mapNameInput')?.value || '';
    			const compressed = compressMapWithName(entities, mapName);
    			if (document.getElementById('mobileMapData')) document.getElementById('mobileMapData').value = compressed;
    			const longUrl = getShareableUrl(entities, mapName);
    			await doShorten(longUrl);
    		});
    	}

    	if (copyShortUrlButton && shortUrlOutput) {
    		copyShortUrlButton.addEventListener('click', async () => {
    			const text = shortUrlOutput.value || '';
    			const ok = await tryCopyText(text);
    			if (ok) {
    				showCopySuccess();
    				if (shortUrlError) shortUrlError.textContent = '';
    			} else {
    				if (shortUrlError) shortUrlError.textContent = 'Could not copy URL.';
    			}
    		});
    	}

    	if (mobileCopyShortUrlButton && mobileShortUrlOutput) {
    		mobileCopyShortUrlButton.addEventListener('click', async () => {
    			const text = mobileShortUrlOutput.value || '';
    			const ok = await tryCopyText(text);
    			if (ok) {
    				const msg = document.getElementById('mobileCopyMessage') || document.getElementById('copyMessage');
    				if (msg) { msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 2000); }
    				if (mobileShortUrlError) mobileShortUrlError.textContent = '';
    			} else {
    				if (mobileShortUrlError) mobileShortUrlError.textContent = 'Could not copy URL.';
    			}
    		});
    	}
    })();

// ===== MOBILE/TOUCH CONTROLS =====
function updateZoomDisplay() {
    const zoomLevel = document.getElementById('zoomLevel');
    const zoomPercentage = Math.round(zoom * 100) + '%';
    
    if (zoomLevel) {
        zoomLevel.textContent = zoomPercentage;
    }
}

function handleTouchStart(event) {
    event.preventDefault();
    isTouching = true;
    touchStartTime = Date.now();
    
    const touches = event.touches;
    
    if (touches.length === 1) {
        // Single touch
        const rect = canvas.getBoundingClientRect();
        touchStartX = touches[0].clientX - rect.left;
        touchStartY = touches[0].clientY - rect.top;
        touchStartPanX = panX;
        touchStartPanY = panY;
        
        if (selectedType === 'select') {
            selectEntity({ clientX: touches[0].clientX, clientY: touches[0].clientY });
            if (selectedEntity) {
                isDragging = true;
                const gridPos = screenToDiamond(touchStartX, touchStartY);
                dragOffsetX = gridPos.x - selectedEntity.x;
                dragOffsetY = gridPos.y - selectedEntity.y;
            }
        } else if (selectedType === 'move') {
            isPanning = true;
        }
    } else if (touches.length === 2) {
        // Two finger touch for pinch zoom
        const touch1 = touches[0];
        const touch2 = touches[1];
        touchStartDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        initialZoom = zoom;
        
        // Center point between fingers
        const rect = canvas.getBoundingClientRect();
        touchStartX = ((touch1.clientX + touch2.clientX) / 2) - rect.left;
        touchStartY = ((touch1.clientY + touch2.clientY) / 2) - rect.top;
    }
}

function handleTouchMove(event) {
    event.preventDefault();
    const touches = event.touches;
    
    if (touches.length === 1 && isTouching) {
        const rect = canvas.getBoundingClientRect();
        const currentX = touches[0].clientX - rect.left;
        const currentY = touches[0].clientY - rect.top;
        
        if (isDragging && selectedEntity) {
            // Move selected entity
            const gridPos = screenToDiamond(currentX, currentY);
            const newX = gridPos.x - dragOffsetX;
            const newY = gridPos.y - dragOffsetY;
            
            if (isPositionValid(newX, newY, selectedEntity)) {
                selectedEntity.x = newX;
                selectedEntity.y = newY;
                redraw();
                markUnsavedChanges();
            }
        } else if (isPanning || selectedType === 'move') {
            // Pan the map
            panX = touchStartPanX + (currentX - touchStartX);
            panY = touchStartPanY + (currentY - touchStartY);
            redraw();
        } else if (selectedType && selectedType !== 'select' && selectedType !== 'move') {
            // Update ghost preview
            updateGhostPreview(currentX, currentY);
        }
    } else if (touches.length === 2) {
        // Pinch zoom
        const touch1 = touches[0];
        const touch2 = touches[1];
        const currentDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        if (touchStartDistance > 0) {
            const zoomFactor = currentDistance / touchStartDistance;
            const newZoom = Math.max(0.1, Math.min(3, initialZoom * zoomFactor));
            
            // Zoom towards the center point between fingers
            const dx = touchStartX - panX;
            const dy = touchStartY - panY;
            
            panX = touchStartX - dx * (newZoom / zoom);
            panY = touchStartY - dy * (newZoom / zoom);
            
            zoom = newZoom;
            gridSize = baseGridSize * zoom;
            
            redraw();
            updateZoomDisplay();
        }
    }
}

function handleTouchEnd(event) {
    event.preventDefault();
    const touchDuration = Date.now() - touchStartTime;
    
    if (event.touches.length === 0) {
        isTouching = false;
        
        // Check for tap (short touch duration and minimal movement)
        if (touchDuration < 300 && !isDragging && !isPanning) {
            const rect = canvas.getBoundingClientRect();
            const tapEvent = {
                clientX: event.changedTouches[0].clientX,
                clientY: event.changedTouches[0].clientY
            };
            
            if (selectedType && selectedType !== 'select' && selectedType !== 'move') {
                addEntity(tapEvent);
            }
        }
        
        isDragging = false;
        isPanning = false;
        touchStartDistance = 0;
    }
}

function updateGhostPreview(mouseX, mouseY) {
    territoryPreview = null;

    if (selectedType && selectedType !== 'select' && selectedType !== 'move') {
        const gridPos = screenToDiamond(mouseX, mouseY);
        const x = gridPos.x;
        const y = gridPos.y;

        let width, height;
        if (selectedType === 'flag' || selectedType === 'obstacle') {
            width = 1;
            height = 1;
        } else if (selectedType === 'city') {
            width = 2;
            height = 2;
        } else if (selectedType === 'building' || selectedType === 'hq' || selectedType === 'node') {
            width = 3;
            height = 3;
        }

        const tempEntity = { x, y, width, height, type: selectedType };
        const validPosition = isPositionValid(x, y, tempEntity);

        if (validPosition) {
            ghostPreview = { x, y, width, height, type: selectedType };

            // If the selected building is a flag or HQ, calculate its territory for preview
            if (selectedType === 'flag' || selectedType === 'hq') {
                const radius = selectedType === 'flag' ? 3 : 6;
                const previewArea = new Set();
                markFlagArea(ghostPreview, previewArea, radius);
                territoryPreview = previewArea;
            }
        } else {
            ghostPreview = null;
        }
        
        redraw();
    }
}

function isPositionValid(newX, newY, entity) {
    if (newX < -gridCols || newX + entity.width > gridCols + 1 || 
        newY < -gridRows || newY + entity.height > gridRows + 1) {
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
        return;
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
    const mobileCityList = document.getElementById('mobileCityList');
    const sortSelect = document.getElementById('citySort');
    const mobileSortSelect = document.getElementById('mobileCitySort');
    
    if (!cityList || !sortSelect || !mobileCityList || !mobileSortSelect) return;

    // Sync sort options between desktop and mobile
    mobileSortSelect.innerHTML = sortSelect.innerHTML;
    mobileSortSelect.value = sortSelect.value;
    
    const sortBy = sortSelect.value;
    cityList.innerHTML = '';
    mobileCityList.innerHTML = '';

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

    // Render prioritized cities first, then others for both lists
    [...prioritized, ...others].forEach(city => {
        // Create desktop list item
        const li = document.createElement('li');
        li.className = 'flex items-center space-x-2 mb-2';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = city.name || `City ${city.id}`;
        input.placeholder = `City ${city.id}`;
        input.className = 'border p-1 rounded touch-input';
        input.style.width = '15ch';
        input.addEventListener('change', () => {
            city.name = input.value;
            redraw();
            markUnsavedChanges();
            updateCityList(); // Update both lists
        });
        li.appendChild(input);

        // Create mobile list item (clone of desktop)
        const mli = li.cloneNode(true);
        mli.querySelector('input').addEventListener('change', (e) => {
            city.name = e.target.value;
            redraw();
            markUnsavedChanges();
            updateCityList(); // Update both lists
        });

        // Add BT bubbles to both lists
        [li, mli].forEach(listItem => {
            city.marchTimes.forEach((time, i) => {
                const key = `bt${i+1}`;
                const isPriority = city.priorities && city.priorities[key];
                const bubble = document.createElement('span');
                bubble.textContent = `BT${i+1}: ${time}s`;
                bubble.className = `bt-bubble inline-flex items-center justify-center px-2 py-1 text-xs leading-none rounded cursor-pointer min-w-[70px] ${
                    isPriority ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                }`;
                bubble.addEventListener('click', () => {
                    city.priorities = city.priorities || {};
                    city.priorities[key] = !city.priorities[key];
                    if (city.priorities[key]) {
                        const candidates = entities.filter(e => 
                            e.type === 'city' && 
                            !(e.priorities && e.priorities[key])
                        );
                        if (candidates.length) {
                            let bestCity = candidates[0];
                            let bestTime;
                            if (sortBy === 'both') {
                                bestTime = evaluateCombinedTime(bestCity);
                            } else {
                                bestTime = evaluateBTTime(bestCity, i);
                            }
                            candidates.forEach(c => {
                                const t = sortBy === 'both' ? 
                                    evaluateCombinedTime(c) : 
                                    evaluateBTTime(c, i);
                                if (t < bestTime) {
                                    bestTime = t;
                                    bestCity = c;
                                }
                            });
                            [city.x, bestCity.x] = [bestCity.x, city.x];
                            [city.y, bestCity.y] = [bestCity.y, city.y];
                        }
                    }
                    redraw();
                    updateCityList();
                    markUnsavedChanges();
                });
                listItem.appendChild(bubble);
            });
        });

        cityList.appendChild(li);
        mobileCityList.appendChild(mli);
    });
}

function renumberCities() {
    let newId = 1;
    entities
        .filter(entity => entity.type === 'city')
        .forEach(city => {
            city.id = newId;
            if (!city.name || /^City \d+$/.test(city.name)) {
                city.name = `City ${newId}`;
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
                     entity.type === "node" ? "011" : 
                     entity.type === "hq" ? "101" :
                     "100"; // obstacle = "100"
        
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
                     typeBits === "011" ? "node" : 
                     typeBits === "101" ? "hq" : "obstacle";
        
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
        } else if (type === "hq") {
            entity.width = 3;
            entity.height = 3;
            entity.color = "darkgoldenrod";
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

function compressMapWithName(entities, mapName, anchor = coordAnchor, _waveMode = waveMode, _cityLabelMode = cityLabelMode) {
    let base64String = compressMap(entities);

    const parts = [base64String];

    if (mapName && mapName.trim() !== '') {
        parts.push("n=" + sanitizeMapName(mapName));
    }

    if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
        parts.push("a=" + clamp1200(anchor.x) + ":" + clamp1200(anchor.y));
    }

    parts.push("w=" + (_waveMode ? "1" : "0"));
    parts.push("m=" + _cityLabelMode);

    return parts.join("||");
}


function decompressMapWithName(combinedString) {
    // Returns: { entities, mapName?, anchor?, waveMode?, cityLabelMode? }
    const out = { entities: [], mapName: "", anchor: null, waveMode: null, cityLabelMode: null };

    if (!combinedString || typeof combinedString !== 'string') {
        return out;
    }

    const parts = combinedString.split("||");
    const base64String = parts.shift();

    for (const seg of parts) {
        if (seg.startsWith("n=")) {
            out.mapName = seg.slice(2);
        } else if (seg.startsWith("a=")) {
        	const s = seg.slice(2)
        	out.anchor = parseCoordInput(s)
        } else if (seg.startsWith("w=")) {
            out.waveMode = Boolean(seg.slice(2));
        } else if (seg.startsWith("m=")) {
        	mode = seg.slice(2).trim().toLowerCase();
        	if (!['march', 'coords', 'none'].includes(mode)) {
        	    mode = 'march';
        	}
            out.cityLabelMode = mode
        } else {
            // Legacy support: if no prefix, treat as name
            if (!out.mapName) out.mapName = seg;
        }
    }
    
    out.entities = decompressMap(base64String);

    if (out.mapName) {
        const mapNameInput = document.getElementById('mapNameInput');
        if (mapNameInput) mapNameInput.value = out.mapName;
    }

    return out;
}


// Pure helper to generate a shareable URL with provided map data and name
function getShareableUrl(entitiesArg, mapNameArg) {
    const compressedMap = compressMapWithName(entitiesArg, mapNameArg);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('mapData', compressedMap);
    return newUrl.toString();
}

function loadMap() {
    try {
        const compressedMap = mapData.value;
        const loaded = decompressMapWithName(compressedMap);
        const loadedEntities = Array.isArray(loaded) ? loaded : loaded.entities || [];

        entities.length = 0;
        bearTraps.length = 0;

        loadedEntities.forEach(entity => {
            entities.push(entity);
            if (entity.type === "building") {
                bearTraps.push(entity);
            }
        });

        if (!Array.isArray(loaded)) {
            setAnchorInput(loaded.anchor)
            setWaveMode(loaded.waveMode);
            setCityLabelMode(loaded.cityLabelMode);
        }

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
    // 1. Find the bounding box of all entities
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    if (entities.length === 0) {
        // If empty, use the grid boundaries
        minX = -gridCols;
        maxX = gridCols;
        minY = -gridRows;
        maxY = gridRows;
    } else {
        // Otherwise, use the entity boundaries
        entities.forEach(entity => {
            minX = Math.min(minX, entity.x);
            maxX = Math.max(maxX, entity.x + entity.width);
            minY = Math.min(minY, entity.y);
            maxY = Math.max(maxY, entity.y + entity.height);
        });
    }

    // 2. Create an off-screen canvas
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');

    // 3. Calculate the required canvas size
    const padding = 60; // Add some padding around the entities
    
    // Calculate the corners of the bounding box in screen coordinates at zoom 1
    const topLeft = diamondToScreenCorner(minX, minY, 0, 0, 1);
    const topRight = diamondToScreenCorner(maxX, minY, 0, 0, 1);
    const bottomLeft = diamondToScreenCorner(minX, maxY, 0, 0, 1);
    const bottomRight = diamondToScreenCorner(maxX, maxY, 0, 0, 1);

    const screenMinX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const screenMaxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const screenMinY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
    const screenMaxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

    const requiredWidth = screenMaxX - screenMinX + padding * 2;
    const requiredHeight = screenMaxY - screenMinY + padding * 2;

    offscreenCanvas.width = requiredWidth;
    offscreenCanvas.height = requiredHeight;

    // 4. Calculate new pan values to center the content
    const exportPanX = -screenMinX + padding;
    const exportPanY = -screenMinY + padding;
    const exportZoom = 1;

    // 5. Redraw everything on the off-screen canvas
    drawDiamondGrid(offscreenCtx, exportPanX, exportPanY, exportZoom);
    drawEntities(offscreenCtx, exportPanX, exportPanY, exportZoom);
    drawAnchorSymbol(offscreenCtx, exportPanX, exportPanY, exportZoom);

    // 6. Trigger download
    const link = document.createElement('a');
    const mapName = document.getElementById('mapNameInput').value.trim();
    link.download = mapName ? `${sanitizeMapName(mapName)}.png` : 'layout.png';
    link.href = offscreenCanvas.toDataURL('image/png');
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

// ======= UTILS – Player import/export =======
// This works for city names and their coordinates. 
// With a few changes we could export the entire building list

// is "City 1/2/3 ..."?
function isDefaultCityName(name){
    return /^city\s*\d+$/i.test(String(name||'').trim());
}

// number conversion
function num(v){ const n = +v; return Number.isFinite(n) ? n : null; }

// split CSV into fields (handles quoted commas)
function splitCsvLine(line){
    const out = [];
    let cur = '', inQ = false;
    for (let i=0; i<line.length; i++){
        const ch = line[i];
        if (ch === '"'){
        if (inQ && line[i+1] === '"'){ cur += '"'; i++; }
        else inQ = !inQ;
        } else if (ch === ',' && !inQ){
        out.push(cur); cur = '';
        } else {
        cur += ch;
        }
    }
    out.push(cur);
    return out;
}

// find a free spot in the grid for a new entity of given size
// spiral search from anchorGridCell or 0,0
// respects isPositionValid if defined
function findFreeGridSpot(width=2, height=2){
    const start = anchorGridCell ? anchorGridCell() : { x:0, y:0 };
    const maxR = Math.max(gridCols||50, gridRows||50);
    for (let r=0; r<=maxR; r++){
        for (let dx=-r; dx<=r; dx++){
        for (let dy=-r; dy<=r; dy++){
            if (Math.max(Math.abs(dx),Math.abs(dy)) !== r) continue;
            const x = start.x + dx, y = start.y + dy;
            const candidate = { x, y, width, height };
            if (typeof isPositionValid !== 'function' || isPositionValid(x,y,candidate)) {
            return { x, y };
            }
        }
        }
    }
    return start;
}

// Game world coord -> grid top-left coord
// width,height = e.g. 2x2 for cities
function worldCoordToGrid(world, width=2, height=2){
  const mid = anchorGridCell ? anchorGridCell() : {x:0, y:0};
  const wx = clamp1200 ? clamp1200(world.x) : world.x|0;
  const wy = clamp1200 ? clamp1200(world.y) : world.y|0;

  // reverse of coordForCity function
  const tipX = mid.x + (wy - coordAnchor.y);
  const tipY = mid.y + (wx - coordAnchor.x);

  return { x: tipX - (width - 1), y: tipY - (height - 1) };
}

// Import: name[,x,y] while x and y are optional
// 1) Existing "City N" cities are RENAMED only.
// 2) Only when no default cities remain, new 2x2 cities are created.
// 3) Provided x,y are by default used ONLY for new cities.
//    -> with option { moveDefaultCities:true } you can also move existing default cities,
//       I used this for for testing, might not be the best idea for normal use 
function importPlayerNamesCSV(text, { moveDefaultCities = false } = {}){
  const lines = String(text).split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return;

  const headers = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const idx = k => headers.indexOf(k);

  const iName = idx('name');
  const iX    = idx('x');
  const iY    = idx('y');

  if (iName === -1) {
    alert('CSV must have at least a "name" column.');
    return;
  }

  // load CSV
  const rows = [];
  for (let i = 1; i < lines.length; i++){
    const cols = splitCsvLine(lines[i]);
    const name = (cols[iName] || '').trim();
    if (!name) continue;
    const x = (iX !== -1) ? num(cols[iX]) : null;
    const y = (iY !== -1) ? num(cols[iY]) : null;
    rows.push({ name, x, y });
  }
  if (!rows.length) return;

  // 1) Collect default cities (rename only)
  const defaultCities = entities
    .filter(e => e.type === 'city' && isDefaultCityName(e.name))
    .sort((a,b) => (a.id||0) - (b.id||0));

  let r = 0;

  while (r < rows.length && defaultCities.length){
    const city = defaultCities.shift();
    const rec  = rows[r];

    // only rename
    city.name = rec.name;

    // only move if explicitly allowed
    if (moveDefaultCities && Number.isFinite(rec.x) && Number.isFinite(rec.y)) {
      const width = city.width || 2, height = city.height || 2;
      const g = worldCoordToGrid({ x: rec.x, y: rec.y }, width, height);
      const ok = (typeof isPositionValid !== 'function') ||
                 isPositionValid(g.x, g.y, { x:g.x, y:g.y, width, height });
      if (ok) { city.x = g.x; city.y = g.y; }
    }

    r++;
  }
  
  // 2) Für übrig gebliebene Namen neue Städte anlegen
  for (; r < rows.length; r++){
    const rec = rows[r];
    const width = 2, height = 2;

    // Get target position (x,y only for new cities)
    let gx, gy;
    if (Number.isFinite(rec.x) && Number.isFinite(rec.y)) {
      const g = worldCoordToGrid({ x: rec.x, y: rec.y }, width, height);
      if (typeof isPositionValid !== 'function' || isPositionValid(g.x, g.y, { x:g.x, y:g.y, width, height })) {
        gx = g.x; gy = g.y;
      }
    }
    if (!Number.isFinite(gx) || !Number.isFinite(gy)) {
      const spot = findFreeGridSpot(width, height);
      gx = spot.x; gy = spot.y;
    }

    entities.push({
      type: 'city',
      id: (typeof cityCounterId !== 'undefined' ? cityCounterId++ : undefined),
      name: rec.name,
      x: gx, y: gy,
      width, height,
      color: (typeof getRandomColor === 'function' ? getRandomColor() : 'rgb(200,200,200)')
    });
  }

  try { redraw(); } catch(e) { console.error("Redraw failed:", e); }  
  try { updateCounters(); } catch(e) { console.error("Update counters failed:", e); }  
  try { updateCityList(); } catch(e) { console.error("Update city list failed:", e); }  
  try { markUnsavedChanges(); } catch(e) { console.error("Marking unsaved changes failed:", e); } 
}


/* =========================
   EXPORT: name,x,y  (coordinates, lower corner)
   - x,y = coordForCity(city)
   - onlyNamed=true -> skips "City N" - only used for testing
========================= */
function exportPlayerNamesCSV({ onlyNamed = false } = {}) {
  if (preventActionOnEmptyMap("exporting to CSV")) return;
  const rows = ['name,x,y'];

  const cities = entities
    .filter(e => e.type === 'city')
    .sort((a,b) => (a.id||0) - (b.id||0));

  for (const c of cities) {
    const rawName = (c.name && c.name.trim()) ? c.name.trim() : `City ${c.id ?? ''}`.trim();
    if (onlyNamed && isDefaultCityName(rawName)) continue;

    const world = coordForCity(c);
    const safeName = `"${rawName.replace(/"/g,'""')}"`;
    rows.push([safeName, world.x, world.y].join(','));
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  const mapName = document.getElementById('mapNameInput').value.trim();
  a.download = mapName ? `${sanitizeMapName(mapName)}.csv` : 'layout.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ======= Enhanced Mobile Touch (pinch-zoom + one-finger pan) =======
(function(){
    let touchMode = null; // 'pan' | 'pinch' | null
    let t0 = null, t1 = null;
    let startPanX = 0, startPanY = 0;
    let startZoom = 1;
    let startDist = 0;
    let lastCenter = {x: 0, y: 0};
    let lastTapTime = 0;
    let longPressTimer = null;
    const LONG_PRESS_MS = 450;

    function getTouches(e){
        const rect = canvas.getBoundingClientRect();
        const arr = Array.from(e.touches).map(t => ({x: t.clientX - rect.left, y: t.clientY - rect.top, id: t.identifier}));
        return arr;
    }

    function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }
    function mid(a,b){ return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 }; }

    function clearLongPress(){ if (longPressTimer){ clearTimeout(longPressTimer); longPressTimer=null; }}

    canvas.addEventListener('touchstart', (e)=>{
        if (!e.target.closest('#layoutCanvas')) return;
        e.preventDefault();
        const touches = getTouches(e);

        if (touches.length === 1){
            // single-finger: either tap-to-place/select or drag-to-pan when in Move mode
            t0 = touches[0];
            touchMode = 'pan';
            startPanX = panX;
            startPanY = panY;

            // long-press to delete selected entity (mobile shortcut)
            clearLongPress();
            longPressTimer = setTimeout(()=>{
                // If something is selected, delete it
                if (selectedEntity){
                    deleteSelectedEntity();
                }
            }, LONG_PRESS_MS);

            // double-tap to quick zoom in towards tap
            const now = Date.now();
            if (now - lastTapTime < 350){
                const prevZoom = zoom;
                const newZoom = Math.min(3, zoom * 1.35);
                const dx = t0.x - panX;
                const dy = t0.y - panY;
                panX = t0.x - dx * (newZoom / prevZoom);
                panY = t0.y - dy * (newZoom / prevZoom);
                zoom = newZoom;
                gridSize = baseGridSize * zoom;
                redraw();
                updateZoomDisplay();
            }
            lastTapTime = now;

        } else if (touches.length >= 2){
            // two-finger pinch
            t0 = touches[0]; t1 = touches[1];
            touchMode = 'pinch';
            startZoom = zoom;
            startDist = dist(t0, t1);
            lastCenter = mid(t0, t1);
        }
    }, {passive:false});

    canvas.addEventListener('touchmove', (e)=>{
        if (!e.target.closest('#layoutCanvas')) return;
        e.preventDefault();
        const touches = getTouches(e);

        if (touchMode === 'pan' && touches.length === 1 && t0){
            clearLongPress();
            const cur = touches[0];
            // If toolbar mode is 'move' OR two-finger initially—pan the map
            if (selectedType === 'move'){
                panX = startPanX + (cur.x - t0.x);
                panY = startPanY + (cur.y - t0.y);
                redraw();
            } else {
                // show ghost preview while moving single finger
                updateGhostPreview(cur.x, cur.y);
                redraw();
            }
        } else if (touchMode === 'pinch' && touches.length >= 2){
            const a = touches[0], b = touches[1];
            const currDist = dist(a,b);
            const factor = currDist / (startDist || 1);
            const newZoom = Math.max(0.1, Math.min(3, startZoom * factor));

            // Zoom around the pinch midpoint
            const center = mid(a,b);
            const dx = center.x - panX;
            const dy = center.y - panY;
            panX = center.x - dx * (newZoom / zoom);
            panY = center.y - dy * (newZoom / zoom);
            zoom = newZoom;
            gridSize = baseGridSize * zoom;
            redraw();
            updateZoomDisplay();
        }
    }, {passive:false});

    canvas.addEventListener('touchend', (e)=>{
        if (!e.target.closest('#layoutCanvas')) return;
        e.preventDefault();
        const touches = getTouches(e);

        clearLongPress();

        if (touchMode === 'pan' && (!touches || touches.length === 0) && t0){
            // Treat as tap if movement was very small
            const dx = (e.changedTouches[0].clientX - (canvas.getBoundingClientRect().left + t0.x));
            const dy = (e.changedTouches[0].clientY - (canvas.getBoundingClientRect().top + t0.y));
            const moved = Math.hypot(dx,dy);
            if (moved < 8){
                // Trigger the same logic as a click on canvas (place/select)
                const rect = canvas.getBoundingClientRect();
                const x = e.changedTouches[0].clientX - rect.left;
                const y = e.changedTouches[0].clientY - rect.top;
                handleCanvasClick(x, y, { fromTouch: true });
            }
        }

        // reset
        touchMode = null; t0 = null; t1 = null;
    }, {passive:false});

    // Centralized handler for canvas tap/click logic (used by both mouse & touch)
    function handleCanvasClick(x, y, opts = {}) {
        if (selectedType === 'select') {
            // Simulate a selectEntity at (x, y)
            const rect = canvas.getBoundingClientRect();
            const event = { clientX: x + rect.left, clientY: y + rect.top };
            selectEntity(event);
        } else {
            // Simulate an addEntity at (x, y)
            const rect = canvas.getBoundingClientRect();
            const event = { clientX: x + rect.left, clientY: y + rect.top };
            addEntity(event);
        }
      // Remove GhostPreview after placement
      if (opts.fromTouch) {
        ghostPreview = null;
        redraw();
      }
    }

    // Prevent page bounce/scroll while interacting with canvas
    document.addEventListener('touchmove', (e)=>{
        if (e.target === canvas) e.preventDefault();
    }, {passive:false});
})();


/*__MOBILE_BOTTOM_SHEET__*/
(function(){
    const panels = document.querySelectorAll('.mobile-panel');
    panels.forEach(panel => {
        let startY=0, curY=0, isDragging=false;
        panel.addEventListener('touchstart', (e)=>{
            startY = e.touches[0].clientY;
            isDragging = true;
        }, {passive:true});
        panel.addEventListener('touchmove', (e)=>{
            if(!isDragging) return;
            curY = e.touches[0].clientY;
            const delta = Math.max(0, curY - startY);
            panel.style.transform = `translateY(${delta}px)`;
        }, {passive:true});
        panel.addEventListener('touchend', ()=>{
            if(!isDragging) return;
            const delta = Math.max(0, curY - startY);
            const shouldClose = delta > 100;
            panel.style.transform = '';
            if (shouldClose){
                panel.classList.remove('active');
                setTimeout(()=>{ panel.style.display='none'; }, 300);
            }
            isDragging=false;
        });
    });

    // Mirror desktop action buttons into mobile where needed
    const mirrors = [
        ['downloadButton','mobileDownloadButton'],
        ['saveButton','mobileSaveButton'],
        ['saveAsCSVButton','mobileSaveAsCSVButton'],
        ['shareButton','mobileShareButton'],
        ['shortUrlButton','mobileShortUrlButton'],
        ['loadButton','mobileLoadButton'],
    ];
    mirrors.forEach(([deskId, mobId])=>{
        const d = document.getElementById(deskId);
        const m = document.getElementById(mobId);
        if (d && m){
            m.addEventListener('click', ()=> d.click());
        }
    });

    // Keep code textarea in sync
    const deskTA = document.getElementById('mapData');
    const mobTA = document.getElementById('mobileMapData');
    if (deskTA && mobTA){
        const sync = (src, dst)=>{
            src.addEventListener('input', ()=> { dst.value = src.value; });
        };
        sync(deskTA, mobTA); sync(mobTA, deskTA);
    }

    // Sync city sort dropdowns
    const deskSort = document.getElementById('citySort');
    const mobSort = document.getElementById('mobileCitySort');
    if (deskSort && mobSort){
        const reflect = (src, dst)=> src.addEventListener('change', ()=>{ dst.value = src.value; dst.dispatchEvent(new Event('change')); });
        reflect(deskSort, mobSort); reflect(mobSort, deskSort);
    }
})();

// ===== APPLICATION INITIALIZATION =====
// Initialize the application
resizeCanvas();
redraw();
