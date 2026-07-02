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
const clearButton = document.getElementById('clearButton');
const eraserCursor = document.getElementById('eraserCursor');

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
const defaultCityLabelMode = "march";
const defaultWaveMode = false;
let selectedType = null;
let obstacleSize = 1; // 1, 2, 3 or 4 — placement drops N×N individual 1×1 obstacles
let selectedEntity = null;
let selectedEntities = new Set();
let cityCounterId = 1;
let bearTraps = [];
let enemyZones = []; // Array for enemy zones (max 3)
let cityTeams = {}; // Store team assignments for cities: {cityId: teamIndex}
let customTeams = []; // Dynamic array of teams: [{name: 'Team A', color: '#3B82F6'}, ...]
let showTeamsInBase = false;
const ALLIANCES = [
    { id: 'main', name: 'Main', short: 'M', areaColor: 'rgba(167, 164, 0, 0.3)' },
    { id: 'farm', name: 'Farm', short: 'F', areaColor: 'rgba(68, 239, 77, 0.3)' }
];
const DEFAULT_ALLIANCE_ID = 'main';
const DEFAULT_TEAMS = Object.freeze([
    Object.freeze({ name: 'Main Team', color: '#3B82F6' }),
    Object.freeze({ name: 'Counters', color: '#EF4444' })
]);
let activeAllianceId = DEFAULT_ALLIANCE_ID;
const INACTIVE_ALLIANCE_ENTITY_FILL = 'rgba(156, 163, 175, 0.92)';
const INACTIVE_ALLIANCE_ENTITY_STROKE = 'rgba(75, 85, 99, 0.95)';
const INACTIVE_ALLIANCE_AREA_FILL = 'rgba(148, 163, 184, 0.3)';

// Initialize with default teams
function initializeDefaultTeams() {
    if (customTeams.length === 0) {
        customTeams = DEFAULT_TEAMS.map(team => ({ name: team.name, color: team.color }));
    }
}

let isDragging = false;
let isErasing = false;
let isPanning = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragSelectionStart = [];
let hasDragMovement = false;
let isBoxSelecting = false;
let selectionBoxStart = null;
let selectionBoxCurrent = null;
let selectionBoxAdditive = false;
let hasPendingEraseHistory = false;
let lastMouseX = 0;
let lastMouseY = 0;
let hasUnsavedChanges = false;
let ghostPreview = null;
let territoryPreview = null;
let cityLabelMode = defaultCityLabelMode;  // "march", "coords", "none"
let waveMode = defaultWaveMode;
let coordAnchor = { x: 600, y: 600 };
let worldmapPresence = null; // Uint8Array(1200*1200), key per cell; loaded on first activation
let worldmapLoading = false;
let showWorldmap = false;
let mapMode = 'base'; // 'base' or 'castle' (add island?)
const castleReservedSize = 12; // Size of the reserved castle area
const castleRedzoneThickness = 8; // Thickness of the redzone ring around the reserved area
const selectionPulseDurationMs = 1400;
let selectionPulseActiveUntil = 0;
let selectionPulseRafId = null;
let shortcutToastTimerId = null;
const selectionBoxMinPixels = 4;
let lastPointerClientX = null;
let lastPointerClientY = null;
const KEYBOARD_MOVE_HISTORY_DEBOUNCE_MS = 220;
let keyboardMoveHistoryTimerId = null;
const WORLDMAP_URL = 'https://raw.githubusercontent.com/wosnerdwarriors/wos-data/refs/heads/main/data/worldmap/worldmap.json';

const TOOL_LABELS = Object.freeze({
    select: 'Select',
    move: 'Pan',
    delete: 'Erase',
    flag: 'Flag',
    city: 'City',
    building: 'Trap',
    hq: 'HQ',
    node: 'Node',
    obstacle: 'Obstacle',
    enemyzone: 'Enemy Zone'
});

const TOOL_SHORTCUT_LABELS = Object.freeze({
    select: 'Q',
    move: 'W',
    delete: 'E',
    flag: '1',
    city: '2',
    building: '3',
    hq: '4',
    node: '5',
    obstacle: '6',
    enemyzone: '7'
});

const TOOL_SHORTCUT_KEY_MAP = Object.freeze({
    q: 'select',
    w: 'move',
    '1': 'flag',
    '2': 'city',
    '3': 'building',
    '4': 'hq',
    '5': 'node',
    '6': 'obstacle',
    '7': 'enemyzone'
});

// Semi-transparent fill colors per key type (keys 1-7)
const WORLDMAP_KEY_COLORS = [
    null,
    'rgba(120, 120, 130, 0.55)', // 1 – mountain (grey)
    'rgba(25, 63, 102, 0.52)', // 2 – lake (blue)
    'rgba(210, 150,  50, 0.55)', // 3 – building (amber)
    'rgba(180,  60, 180, 0.60)', // 4 – castle (purple)
    'rgba(160,  50,  50, 0.55)', // 5 – fortress / stronghold (dark red)
    'rgba( 50, 170, 150, 0.55)', // 6 – facility area (green)
    'rgba(234, 179,   8, 0.55)', // 7 – alliance resource node (gold)
];


function isTextInputTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.isContentEditable) return true;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
}

function setEraserCursorVisible(isVisible) {
    if (!eraserCursor) return;
    eraserCursor.classList.toggle('visible', Boolean(isVisible));
}

function rememberPointerPosition(clientX, clientY) {
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
    lastPointerClientX = clientX;
    lastPointerClientY = clientY;
}

function updateEraserCursorPosition(clientX, clientY) {
    if (!eraserCursor || typeof clientX !== 'number' || typeof clientY !== 'number') return;
    eraserCursor.style.left = `${clientX}px`;
    eraserCursor.style.top = `${clientY}px`;
}

function isPlacementTool(toolType = selectedType) {
    return Boolean(toolType && toolType !== 'select' && toolType !== 'move' && toolType !== 'delete');
}

function refreshGhostPreviewForCurrentPointer(toolType = selectedType) {
    if (!isPlacementTool(toolType)) return;
    if (!canvas.matches(':hover')) return;
    if (lastPointerClientX === null || lastPointerClientY === null) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = lastPointerClientX - rect.left;
    const mouseY = lastPointerClientY - rect.top;
    updateGhostPreview(mouseX, mouseY);
}

function refreshEraserCursorForCurrentPointer(toolType = selectedType) {
    if (toolType !== 'delete') {
        setEraserCursorVisible(false);
        return;
    }

    if (!canvas.matches(':hover')) {
        setEraserCursorVisible(false);
        return;
    }

    if (lastPointerClientX === null || lastPointerClientY === null) {
        const rect = canvas.getBoundingClientRect();
        updateEraserCursorPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
        updateEraserCursorPosition(lastPointerClientX, lastPointerClientY);
    }
    setEraserCursorVisible(true);
}

function flushPendingEraseHistory() {
    if (!hasPendingEraseHistory) return;
    pushHistory();
    hasPendingEraseHistory = false;
}

function flushPendingKeyboardMoveHistory() {
    if (keyboardMoveHistoryTimerId === null) return;
    clearTimeout(keyboardMoveHistoryTimerId);
    keyboardMoveHistoryTimerId = null;
    pushHistory();
}

function scheduleKeyboardMoveHistoryPush() {
    if (keyboardMoveHistoryTimerId !== null) {
        clearTimeout(keyboardMoveHistoryTimerId);
    }
    keyboardMoveHistoryTimerId = window.setTimeout(() => {
        keyboardMoveHistoryTimerId = null;
        pushHistory();
    }, KEYBOARD_MOVE_HISTORY_DEBOUNCE_MS);
}

function updateCanvasCursorForTool(toolType = selectedType) {
    canvas.classList.toggle('eraser-cursor-active', toolType === 'delete');

    if (toolType === 'move') {
        canvas.style.cursor = 'move';
    } else if (toolType === 'delete') {
        canvas.style.cursor = 'none';
    } else if (toolType === 'select') {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'crosshair';
    }

    refreshEraserCursorForCurrentPointer(toolType);
}

function showShortcutToast(message, timeoutMs = 950) {
    const toast = document.getElementById('shortcutToast');
    if (!toast || !message) return;

    toast.textContent = message;
    toast.classList.add('visible');

    if (shortcutToastTimerId !== null) {
        clearTimeout(shortcutToastTimerId);
    }
    shortcutToastTimerId = setTimeout(() => {
        toast.classList.remove('visible');
        shortcutToastTimerId = null;
    }, timeoutMs);
}

function normalizeAllianceId(allianceId) {
    return ALLIANCES.some(a => a.id === allianceId) ? allianceId : DEFAULT_ALLIANCE_ID;
}

function getAllianceMeta(allianceId) {
    const normalized = normalizeAllianceId(allianceId);
    return ALLIANCES.find(a => a.id === normalized) || ALLIANCES[0];
}

function getAllianceName(allianceId) {
    return getAllianceMeta(allianceId).name;
}

function getAllianceShort(allianceId) {
    return getAllianceMeta(allianceId).short;
}

function isAllianceScopedType(type) {
    return type === 'flag' || type === 'city' || type === 'building' || type === 'hq' || type === 'node';
}

function getEntityAllianceId(entity) {
    if (!entity || !isAllianceScopedType(entity.type)) {
        return DEFAULT_ALLIANCE_ID;
    }
    const normalized = normalizeAllianceId(entity.allianceId);
    if (entity.allianceId !== normalized) {
        entity.allianceId = normalized;
    }
    return normalized;
}

function isInInactiveAllianceView(entity) {
    if (!entity || !isAllianceScopedType(entity.type)) return false;
    return getEntityAllianceId(entity) !== normalizeAllianceId(activeAllianceId);
}

function getAllianceTrapCount(allianceId = activeAllianceId) {
    const normalized = normalizeAllianceId(allianceId);
    return bearTraps.filter(trap => getEntityAllianceId(trap) === normalized).length;
}

function getAllianceTrapIndex(trap) {
    if (!trap) return 0;
    const trapAlliance = getEntityAllianceId(trap);
    const trapsInAlliance = bearTraps.filter(t => getEntityAllianceId(t) === trapAlliance);
    return trapsInAlliance.indexOf(trap) + 1;
}

function setActiveAlliance(allianceId) {
    activeAllianceId = normalizeAllianceId(allianceId);

    document.querySelectorAll('[data-alliance]').forEach(button => {
        const isActive = button.dataset.alliance === activeAllianceId;
        button.classList.remove(
            'bg-transparent', 'text-gray-500', 'hover:text-gray-700',
            'bg-blue-500', 'bg-rose-500', 'text-white', 'shadow-sm'
        );
        button.classList.add('transition-colors');

        if (isActive) {
            button.classList.add('bg-blue-500', 'text-white', 'shadow-sm');
        } else {
            button.classList.add('bg-transparent', 'text-gray-500', 'hover:text-gray-700');
        }
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    const hintText = `${getAllianceName(activeAllianceId)} traps: ${getAllianceTrapCount(activeAllianceId)}/2`;
    const hintDesktop = document.getElementById('activeAllianceTrapHint');
    const hintMobile = document.getElementById('mobileActiveAllianceTrapHint');
    if (hintDesktop) hintDesktop.textContent = hintText;
    if (hintMobile) hintMobile.textContent = hintText;

    const currentSort = document.getElementById('citySort')?.value || 'id';
    enablePopulateSortOptions(currentSort);
    updateCounters();
    redraw();
    updateCityList();
}


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
    const allianceId = normalizeAllianceId(activeAllianceId);
    const flags = entities.filter(entity => entity.type === 'flag' && getEntityAllianceId(entity) === allianceId).length;
    const cities = entities.filter(entity => entity.type === 'city' && getEntityAllianceId(entity) === allianceId).length;
    const buildings = entities.filter(entity => entity.type === 'building' && getEntityAllianceId(entity) === allianceId).length;
    const hqs = entities.filter(entity => entity.type === 'hq' && getEntityAllianceId(entity) === allianceId).length;
    const nodes = entities.filter(entity => entity.type === 'node' && getEntityAllianceId(entity) === allianceId).length;
    const trapText = `${buildings}/2`;

    // Update desktop counters
    flagCounter.textContent = flags;
    cityCounter.textContent = cities;
    buildingCounter.textContent = trapText;
    hqCounter.textContent = hqs;
    nodeCounter.textContent = nodes;

    // Update mobile counters
    document.getElementById('mobileFlagCounter').textContent = flags;
    document.getElementById('mobileCityCounter').textContent = cities;
    document.getElementById('mobileBuildingCounter').textContent = trapText;
    document.getElementById('mobileHqCounter').textContent = hqs;
    document.getElementById('mobileNodeCounter').textContent = nodes;

    const hintText = `${getAllianceName(allianceId)} traps: ${buildings}/2`;
    const hintDesktop = document.getElementById('activeAllianceTrapHint');
    const hintMobile = document.getElementById('mobileActiveAllianceTrapHint');
    if (hintDesktop) hintDesktop.textContent = hintText;
    if (hintMobile) hintMobile.textContent = hintText;
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
    // If castle mode is enabled, draw the redzone ring and reserved central area
    drawRedZoneArea(context, pX, pY, z);
    drawCastleReservedArea(context, pX, pY, z);
    context.restore();
}

// Draw the redzone ring around the reserved castle area
function drawRedZoneArea(context, pX, pY, z) {
    if (mapMode !== 'castle') return;
    const mid = anchorGridCell();
    context.save();
    context.fillStyle = 'rgba(255, 80, 80, 0.12)';
    context.strokeStyle = 'rgba(255,80,80,0.25)';
    context.lineWidth = Math.max(1, 1 * z);

    const halfReserved = Math.floor(castleReservedSize / 2);
    const outerHalf = halfReserved + castleRedzoneThickness;

    // draw all cells from mid-outerHalf..mid+outerHalf-1, but skip the inner reserved area
    for (let x = mid.x - outerHalf; x <= mid.x + outerHalf - 1; x++) {
        for (let y = mid.y - outerHalf; y <= mid.y + outerHalf - 1; y++) {
            const inInner = (x >= mid.x - halfReserved && x <= mid.x + halfReserved - 1 && y >= mid.y - halfReserved && y <= mid.y + halfReserved - 1);
            if (inInner) continue; // skip reserved area

            const corner = diamondToScreenCorner(x, y, pX, pY, z);
            const p2 = diamondToScreenCorner(x + 1, y, pX, pY, z);
            const p3 = diamondToScreenCorner(x + 1, y + 1, pX, pY, z);
            const p4 = diamondToScreenCorner(x, y + 1, pX, pY, z);
            context.beginPath();
            context.moveTo(corner.x, corner.y);
            context.lineTo(p2.x, p2.y);
            context.lineTo(p3.x, p3.y);
            context.lineTo(p4.x, p4.y);
            context.closePath();
            context.fill();
        }
    }

    context.restore();
}

function buildProtectedAreaSnapshot(sourceEntities = entities, excludedEntity = null) {
    const protectedAreasByAlliance = {};
    ALLIANCES.forEach(alliance => {
        protectedAreasByAlliance[alliance.id] = new Set();
    });

    // Cell ownership by first placed protected source (flag/HQ).
    const claimedCells = new Map();

    sourceEntities.forEach(entity => {
        if (!entity) return;
        if (excludedEntity && entity === excludedEntity) return;
        if (entity.type !== 'flag' && entity.type !== 'hq') return;

        const allianceId = getEntityAllianceId(entity);
        const area = new Set();
        markFlagArea(entity, area, entity.type === 'flag' ? 3 : 6);

        area.forEach(coord => {
            const owner = claimedCells.get(coord);
            if (owner && owner !== allianceId) {
                return;
            }
            if (!owner) {
                claimedCells.set(coord, allianceId);
            }
            protectedAreasByAlliance[allianceId].add(coord);
        });
    });

    return { protectedAreasByAlliance, claimedCells };
}

function getTerritoryPreviewAreaForEntity(entity) {
    if (!entity || (entity.type !== 'flag' && entity.type !== 'hq')) return null;

    const rawArea = new Set();
    markFlagArea(entity, rawArea, entity.type === 'flag' ? 3 : 6);

    const ownAllianceId = getEntityAllianceId(entity);
    const { claimedCells } = buildProtectedAreaSnapshot();
    const effectiveArea = new Set();

    rawArea.forEach(coord => {
        const owner = claimedCells.get(coord);
        if (owner && owner !== ownAllianceId) {
            return;
        }
        effectiveArea.add(coord);
    });

    return effectiveArea;
}

// ===== ENTITY RENDERING =====
function drawEntities(context, pX, pY, z) {
    const { protectedAreasByAlliance } = buildProtectedAreaSnapshot();

    ALLIANCES.forEach(alliance => {
        const color = alliance.id === normalizeAllianceId(activeAllianceId)
            ? alliance.areaColor
            : INACTIVE_ALLIANCE_AREA_FILL;
        drawFlagAreas(context, pX, pY, z, protectedAreasByAlliance[alliance.id], color);
    });

    // Draw the territory preview for the building being placed
    drawTerritoryPreview(context, pX, pY, z, territoryPreview);

    // Draw entities
    entities.forEach(entity => {
        drawEntity(context, pX, pY, z, entity, protectedAreasByAlliance);
        
    });
    
    // Draw ghost preview if applicable
    if (ghostPreview) {
        drawGhostEntity(context, pX, pY, z, ghostPreview);
    }

    // Always draw selection as the top-most layer for better visibility.
    getSelectedEntities().forEach(entity => {
        drawSelectionHighlight(context, pX, pY, z, entity);
    });

    if (isBoxSelecting && selectionBoxStart && selectionBoxCurrent) {
        drawSelectionMarquee(context);
    }
}

function drawEntity(context, pX, pY, z, entity, protectedAreasByAlliance) {
    context.save();
    
    const screen = diamondToScreen(entity.x, entity.y, pX, pY, z);
    const currentGridSize = baseGridSize * z;
    const isInactiveAllianceEntity = isInInactiveAllianceView(entity);

    if (isInactiveAllianceEntity) {
        context.globalAlpha = 0.82;
    }
    
    
    if (entity.type === 'city') {
        if (isInactiveAllianceEntity) {
            context.fillStyle = INACTIVE_ALLIANCE_ENTITY_FILL;
        } else {
            const teamIndex = cityTeams[entity.id];
            const teamColor = (teamIndex !== undefined && customTeams[teamIndex]) ? customTeams[teamIndex].color : entity.color;
            context.fillStyle = waveMode ? getWaveColorForCity(entity) : teamColor;
        }
    } else {
        context.fillStyle = isInactiveAllianceEntity ? INACTIVE_ALLIANCE_ENTITY_FILL : entity.color;
    }

    
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
    // NOTE: in castle mode we skip this check to avoid showing red warning borders
    const cityAlliance = getEntityAllianceId(entity);
    const cityProtectedAreas = protectedAreasByAlliance?.[cityAlliance] || new Set();
    if (isInactiveAllianceEntity) {
        context.strokeStyle = INACTIVE_ALLIANCE_ENTITY_STROKE;
        context.lineWidth = Math.max(1, 2 * z);
    } else if (entity.type === 'city' && mapMode !== 'castle') {
        // Flag bonus thresholds: 2/4 cells is the minimum to still receive the alliance bonus.
        const protectedCells = countCityProtectedCells(entity, cityProtectedAreas);
        const totalCells = entity.width * entity.height;
        if (protectedCells < 2) {
            context.strokeStyle = 'rgba(255, 0, 0, 1.0)';
            context.lineWidth = Math.max(2, 4 * z);
        } else if (protectedCells < totalCells) {
            context.strokeStyle = 'rgba(255, 140, 0, 1.0)';
            context.lineWidth = Math.max(2, 4 * z);
        } else {
            context.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            context.lineWidth = Math.max(1, 2 * z);
        }
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
    } else if (entity.type === 'castle') {
        // draw castle label
        context.fillStyle = 'white';
        const currentGridSize = baseGridSize * z;
        const baseFontSize = Math.max(10, Math.min(24, currentGridSize * 0.25));
        context.font = `${baseFontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(entity.name || 'Castle', centerScreen.x, centerScreen.y);
    } else if (entity.type === 'turret') {
        context.fillStyle = 'white';
        const currentGridSize = baseGridSize * z;
        const baseFontSize = Math.max(8, Math.min(18, currentGridSize * 0.2));
        context.font = `${baseFontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(entity.name || 'Turret', centerScreen.x, centerScreen.y);
    } else if (entity.type === 'building') {
        drawBearTrapDetails(context, z, entity, centerScreen);
    } else if (entity.type === 'hq') {
        drawHQDetails(context, z, entity, centerScreen);
    } else if (entity.type === 'node') {
        drawNodeDetails(context, z, entity, centerScreen);
    } else if (entity.type === 'obstacle') {
        drawObstacleDetails(context, z, entity, centerScreen);
    } else if (entity.type === 'enemyzone') {
        drawEnemyZoneDetails(context, z, entity, centerScreen);
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
    // Text is always black for readability
    context.fillStyle = 'black';
    
    // Scale font size, with minimum and maximum limits
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(6, Math.min(16, currentGridSize * 0.25));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Shift text upward to accommodate multiple bear trap times
    const baseOffset = -currentGridSize * 0.29;
    
    const label = city.name || `City ${city.id}`;
    context.fillText(label, screen.x, screen.y + baseOffset);
    
    // Draw march times only if enabled
    if (cityLabelMode === 'march') {
        const marchTimes = calculateMarchTimes(city);

        if (mapMode === 'castle') {
            if (marchTimes.length > 0) {
                const yOffset = baseOffset + currentGridSize * 0.25;
                context.fillText(`${marchTimes[0]}s`, screen.x, screen.y + yOffset);
            }
        } else {
            marchTimes.forEach((time, index) => {
                const yOffset = baseOffset + (index + 1) * currentGridSize * 0.25;
                context.fillText(`BT${index + 1}: ${time}s`, screen.x, screen.y + yOffset);
            });
        }
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

function drawCoordLabelBelow(context, z, entity, screen, mainFontSize) {
    if (cityLabelMode !== 'coords') return;
    const c = coordForCity(entity);
    const fs = Math.max(6, Math.min(14, baseGridSize * z * 0.22));
    context.font = `${fs}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(`${c.x}:${c.y}`, screen.x, screen.y + mainFontSize * 0.55);
}

function drawBearTrapDetails(context, z, trap, screen) {
    context.fillStyle = 'white';

    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(8, Math.min(20, currentGridSize * 0.3));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const trapIndex = getAllianceTrapIndex(trap);
    const allianceShort = getAllianceShort(getEntityAllianceId(trap));
    const labelOffset = cityLabelMode === 'coords' ? -baseFontSize * 0.55 : 0;
    context.fillText(`${allianceShort}BT${trapIndex}`, screen.x, screen.y + labelOffset);

    drawCoordLabelBelow(context, z, trap, screen, baseFontSize);
}

function drawHQDetails(context, z, hq, screen) {
    context.fillStyle = 'white';

    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(8, Math.min(20, currentGridSize * 0.3));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const labelOffset = cityLabelMode === 'coords' ? -baseFontSize * 0.55 : 0;
    context.fillText('HQ', screen.x, screen.y + labelOffset);

    drawCoordLabelBelow(context, z, hq, screen, baseFontSize);
}

function drawNodeDetails(context, z, node, screen) {
    context.fillStyle = 'white';

    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(6, Math.min(18, currentGridSize * 0.25));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const labelOffset = cityLabelMode === 'coords' ? -baseFontSize * 0.55 : 0;
    context.fillText('NODE', screen.x, screen.y + labelOffset);

    drawCoordLabelBelow(context, z, node, screen, baseFontSize);
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

function drawEnemyZoneDetails(context, z, zone, screen) {
    context.fillStyle = 'white';
    const currentGridSize = baseGridSize * z;
    const baseFontSize = Math.max(10, Math.min(24, currentGridSize * 0.25));
    context.font = `${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('ENEMIES STATE', screen.x, screen.y);
}


function traceEntityOutlinePath(context, pX, pY, z, entity) {
    const currentGridSize = baseGridSize * z;

    if (entity.width === 1 && entity.height === 1) {
        const screen = diamondToScreen(entity.x, entity.y, pX, pY, z);
        const size = currentGridSize;

        context.beginPath();
        context.moveTo(screen.x, screen.y - size * 0.5);
        context.lineTo(screen.x + size * 0.5, screen.y);
        context.lineTo(screen.x, screen.y + size * 0.5);
        context.lineTo(screen.x - size * 0.5, screen.y);
        context.closePath();
        return;
    }

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

function drawSelectionHighlight(context, pX, pY, z, entity) {
    const now = performance.now();
    const pulseActive = now < selectionPulseActiveUntil;
    const pulseProgress = pulseActive
        ? 1 - ((selectionPulseActiveUntil - now) / selectionPulseDurationMs)
        : 1;
    const pulseWave = pulseActive
        ? (Math.sin(pulseProgress * Math.PI * 6) + 1) * 0.5
        : 0;

    context.save();

    traceEntityOutlinePath(context, pX, pY, z, entity);

    if (pulseActive) {
        context.save();
        context.strokeStyle = `rgba(255, 255, 255, ${0.3 + pulseWave * 0.4})`;
        context.lineWidth = Math.max(4, (8 + pulseWave * 10) * z);
        context.setLineDash([]);
        context.shadowColor = `rgba(255, 255, 255, ${0.35 + pulseWave * 0.45})`;
        context.shadowBlur = Math.max(10, 24 * z);
        context.stroke();
        context.restore();
    }

    context.strokeStyle = '#ffff00';
    context.lineWidth = Math.max(2, 4 * z);
    context.setLineDash([5 * z, 5 * z]);
    context.stroke();

    context.restore();
}

function drawSelectionMarquee(context) {
    if (!selectionBoxStart || !selectionBoxCurrent) return;

    const x = Math.min(selectionBoxStart.x, selectionBoxCurrent.x);
    const y = Math.min(selectionBoxStart.y, selectionBoxCurrent.y);
    const width = Math.abs(selectionBoxCurrent.x - selectionBoxStart.x);
    const height = Math.abs(selectionBoxCurrent.y - selectionBoxStart.y);

    context.save();
    context.fillStyle = 'rgba(59, 130, 246, 0.15)';
    context.strokeStyle = 'rgba(59, 130, 246, 0.95)';
    context.lineWidth = 1.5;
    context.setLineDash([6, 4]);
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
    context.restore();
}

function calculateMarchTimes(city) {
    // Castle time at 25% speed bonus
    if (mapMode === 'castle') {
        // Constants for march time calculation, based on IKKEREKI3's python calculation
        const MARCH_TIME_FACTOR_A = 4.2813;
        const MARCH_TIME_FACTOR_B = 6.079;

        const castle = entities.find(e => e.type === 'castle');
        if (!castle) return [];

        // Center of the city and the castle
        const cityCenterX   = city.x   + city.width  / 2 - 0.5;
        const cityCenterY   = city.y   + city.height / 2 - 0.5;
        const castleCenterX = castle.x + castle.width  / 2 - 0.5;
        const castleCenterY = castle.y + castle.height / 2 - 0.5;

        const dx = castleCenterX - cityCenterX;
        const dy = castleCenterY - cityCenterY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        const marchSpeedAt25Marchspeed = Math.round(MARCH_TIME_FACTOR_A * distance + MARCH_TIME_FACTOR_B);

        return [marchSpeedAt25Marchspeed];
    }

    // Beartap times
    const times = [];
    const cityAlliance = getEntityAllianceId(city);
    bearTraps.forEach(trap => {
        if (getEntityAllianceId(trap) !== cityAlliance) return;
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

// Helper function to count how many of a city's cells fall inside any flag's or HQ's area
function countCityProtectedCells(cityEntity, protectedAreas) {
    let count = 0;
    for (let dx = 0; dx < cityEntity.width; dx++) {
        for (let dy = 0; dy < cityEntity.height; dy++) {
            const gridX = cityEntity.x + dx;
            const gridY = cityEntity.y + dy;
            if (protectedAreas.has(`${gridX},${gridY}`)) {
                count++;
            }
        }
    }
    return count;
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
  const cityAlliance = getEntityAllianceId(city);

  let best = Infinity;
  let hasMatchingTrap = false;

  for (const t of bearTraps) {
    if (getEntityAllianceId(t) !== cityAlliance) continue;
    hasMatchingTrap = true;
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
  if (!hasMatchingTrap) return null;
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
    if (!selectedType || selectedType === 'select' || selectedType === 'move' || selectedType === 'delete') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const gridPos = screenToDiamond(mouseX, mouseY);
    const x = gridPos.x;
    const y = gridPos.y;

    // Obstacle preset: drop N×N individual 1×1 obstacles in one click. Each placed cell
    // remains its own entity so the existing save/load format (which derives obstacle size
    // from type) keeps working unchanged.
    if (selectedType === 'obstacle') {
        const size = Math.max(1, Math.min(4, obstacleSize | 0));
        let placedAny = false;
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                const cellX = x + dx;
                const cellY = y + dy;
                const cellTemplate = { x: cellX, y: cellY, width: 1, height: 1, type: 'obstacle' };
                if (!isPositionValid(cellX, cellY, cellTemplate)) continue;
                entities.push({ ...cellTemplate, color: '#8B0000', id: null });
                placedAny = true;
            }
        }
        if (placedAny) {
            redraw();
            updateCounters();
            markUnsavedChanges();
            pushHistory();
        }
        return;
    }

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
        if (getAllianceTrapCount(activeAllianceId) >= 2) {
            alert(`You can only place up to 2 Bear Traps for ${getAllianceName(activeAllianceId)}.`);
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
    } else if (selectedType === 'enemyzone') {
        if (mapMode !== 'castle') {
            alert('Enemy zones can only be placed in Castle mode.');
            return;
        }
        if (enemyZones.length >= 3) {
            alert('You can only place up to 3 Enemy Zones.');
            return;
        }
        color = 'black';
        width = 12;
        height = 12;
    }

    const newEntityTemplate = isAllianceScopedType(selectedType)
        ? { x, y, width, height, type: selectedType, allianceId: normalizeAllianceId(activeAllianceId) }
        : { x, y, width, height, type: selectedType };
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
        } else if (selectedType === 'enemyzone') {
            enemyZones.push(newEntity);
        }
        redraw();
        updateCounters();
        markUnsavedChanges();
        pushHistory();

        if (selectedType === 'city' || selectedType === 'building') {
            updateCityList();
        }
    }
}

// ===== WORLDMAP OBSTACLE LAYER =====

async function loadWorldmapData() {
    if (worldmapPresence || worldmapLoading) return;
    worldmapLoading = true;
    try {
        const resp = await fetch(WORLDMAP_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const entries = await resp.json();
        if (!Array.isArray(entries)) throw new Error('Expected an array of entries');
        const map = new Uint8Array(1200 * 1200);
        for (const { x, y, key } of entries) {
            if (x >= 0 && x < 1200 && y >= 0 && y < 1200) map[y * 1200 + x] = key;
        }
        worldmapPresence = map;
        redraw();
    } catch (e) {
        console.warn('[Worldmap] Failed to load:', e);
    } finally {
        worldmapLoading = false;
    }
}

function drawWorldmapLayer(context, pX, pY, z) {
    if (!worldmapPresence || (!showWorldmap && cityLabelMode !== 'coords')) return;

    const S = baseGridSize * z;
    const fillSize = S * 0.75;
    const hs = fillSize * 0.5;

    // Tight viewport culling via diagonal constraints. diamondToScreen gives:
    //   screen.x = (gx - gy) * S * 0.5 + pX
    //   screen.y = (gx + gy + 1) * S * 0.5 + pY
    // A cell is on-screen when screen.x ∈ [-hs, canvasWidth+hs] and screen.y ∈ [-hs, canvasHeight+hs].
    const diagDiffMin = Math.floor(2 * (-hs - pX) / S);
    const diagDiffMax = Math.ceil(2 * (canvasWidth + hs - pX) / S);
    const diagSumMin  = Math.floor(2 * (-hs - pY) / S) - 1;
    const diagSumMax  = Math.ceil(2 * (canvasHeight + hs - pY) / S) - 1;

    // Axis-aligned bounds derived from diagonal constraints, clamped to worldmap range
    // and to the placement grid (where entities can actually be placed).
    const minGX = Math.max(Math.floor((diagSumMin + diagDiffMin) / 2), coordAnchor.y - 1199, -gridCols);
    const maxGX = Math.min(Math.ceil((diagSumMax + diagDiffMax) / 2),  coordAnchor.y,          gridCols);
    const minGY = Math.max(Math.floor((diagSumMin - diagDiffMax) / 2), coordAnchor.x - 1199, -gridRows);
    const maxGY = Math.min(Math.ceil((diagSumMax - diagDiffMin) / 2),  coordAnchor.x,          gridRows);

    if (minGX > maxGX || minGY > maxGY) return;

    context.save();
    for (let gx = minGX; gx <= maxGX; gx++) {
        // Per-column tight gy bounds eliminate the triangle corners that fall off-screen.
        const gyMin = Math.max(minGY, diagSumMin - gx, gx - diagDiffMax);
        const gyMax = Math.min(maxGY, diagSumMax - gx, gx - diagDiffMin);
        for (let gy = gyMin; gy <= gyMax; gy++) {
            const wx = coordAnchor.x - gy;
            const wy = coordAnchor.y - gx;
            if (wx < 0 || wx >= 1200 || wy < 0 || wy >= 1200) continue;
            const key = worldmapPresence[wy * 1200 + wx];
            if (!key) continue;
            const screen = diamondToScreen(gx, gy, pX, pY, z);
            context.fillStyle = WORLDMAP_KEY_COLORS[key] ?? 'rgba(139, 90, 43, 0.45)';
            context.beginPath();
            context.moveTo(screen.x,      screen.y - hs);
            context.lineTo(screen.x + hs, screen.y);
            context.lineTo(screen.x,      screen.y + hs);
            context.lineTo(screen.x - hs, screen.y);
            context.closePath();
            context.fill();
        }
    }
    context.restore();
}

function redraw() {
    drawDiamondGrid(ctx, panX, panY, zoom);
    drawWorldmapLayer(ctx, panX, panY, zoom);
    drawEntities(ctx, panX, panY, zoom);
    drawAnchorSymbol(ctx, panX, panY, zoom);
}

function stopSelectionPulse() {
    selectionPulseActiveUntil = 0;
    if (selectionPulseRafId !== null) {
        cancelAnimationFrame(selectionPulseRafId);
        selectionPulseRafId = null;
    }
}

function startSelectionPulse(durationMs = selectionPulseDurationMs) {
    selectionPulseActiveUntil = performance.now() + durationMs;
    if (selectionPulseRafId !== null) return;

    const animatePulse = (now) => {
        if (!selectedEntity || !entities.includes(selectedEntity) || now >= selectionPulseActiveUntil) {
            selectionPulseRafId = null;
            redraw();
            return;
        }
        redraw();
        selectionPulseRafId = requestAnimationFrame(animatePulse);
    };

    selectionPulseRafId = requestAnimationFrame(animatePulse);
}

function getSelectedEntities() {
    const validSelection = [];
    selectedEntities.forEach(entity => {
        if (entities.includes(entity)) {
            validSelection.push(entity);
        }
    });

    if (validSelection.length !== selectedEntities.size) {
        selectedEntities = new Set(validSelection);
    }

    if (selectedEntity && !selectedEntities.has(selectedEntity)) {
        selectedEntity = validSelection.length ? validSelection[validSelection.length - 1] : null;
    }

    return validSelection;
}

function clearSelection({ stopPulse = true } = {}) {
    selectedEntities.clear();
    selectedEntity = null;
    if (stopPulse) {
        stopSelectionPulse();
    }
}

function setSelection(entitiesToSelect = [], { primaryEntity = null, pulse = false } = {}) {
    const validSelection = entitiesToSelect.filter(entity => entity && entities.includes(entity));
    selectedEntities = new Set(validSelection);

    if (!validSelection.length) {
        selectedEntity = null;
        stopSelectionPulse();
        return;
    }

    if (primaryEntity && selectedEntities.has(primaryEntity)) {
        selectedEntity = primaryEntity;
    } else {
        selectedEntity = validSelection[validSelection.length - 1];
    }

    if (pulse) {
        startSelectionPulse();
    } else {
        stopSelectionPulse();
    }
}

function addToSelection(entity, { makePrimary = true, pulse = false } = {}) {
    if (!entity || !entities.includes(entity)) return;
    const currentSelection = getSelectedEntities();
    if (!selectedEntities.has(entity)) {
        currentSelection.push(entity);
    }
    setSelection(currentSelection, { primaryEntity: makePrimary ? entity : selectedEntity, pulse });
}

function removeFromSelection(entity) {
    if (!entity || !selectedEntities.has(entity)) return;
    const remainingSelection = getSelectedEntities().filter(item => item !== entity);
    const nextPrimary = selectedEntity === entity ? remainingSelection[remainingSelection.length - 1] : selectedEntity;
    setSelection(remainingSelection, { primaryEntity: nextPrimary, pulse: false });
}

function toggleSelection(entity, { pulseOnAdd = true } = {}) {
    if (!entity) return;
    if (selectedEntities.has(entity)) {
        removeFromSelection(entity);
    } else {
        addToSelection(entity, { makePrimary: true, pulse: pulseOnAdd });
    }
}

function getEntityAtGrid(gridX, gridY) {
    for (let i = entities.length - 1; i >= 0; i--) {
        const entity = entities[i];
        if (
            gridX >= entity.x &&
            gridX < entity.x + entity.width &&
            gridY >= entity.y &&
            gridY < entity.y + entity.height
        ) {
            return entity;
        }
    }
    return null;
}

function getSelectionBoxRect() {
    if (!selectionBoxStart || !selectionBoxCurrent) return null;

    const x = Math.min(selectionBoxStart.x, selectionBoxCurrent.x);
    const y = Math.min(selectionBoxStart.y, selectionBoxCurrent.y);
    const width = Math.abs(selectionBoxCurrent.x - selectionBoxStart.x);
    const height = Math.abs(selectionBoxCurrent.y - selectionBoxStart.y);

    return { x, y, width, height };
}

function getEntitiesInSelectionBox(rect) {
    if (!rect) return [];

    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;

    return entities.filter(entity => {
        const topLeft = diamondToScreenCorner(entity.x, entity.y, panX, panY, zoom);
        const topRight = diamondToScreenCorner(entity.x + entity.width, entity.y, panX, panY, zoom);
        const bottomLeft = diamondToScreenCorner(entity.x, entity.y + entity.height, panX, panY, zoom);
        const bottomRight = diamondToScreenCorner(entity.x + entity.width, entity.y + entity.height, panX, panY, zoom);

        const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
        const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
        const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

        return !(maxX < rect.x || minX > right || maxY < rect.y || minY > bottom);
    });
}

function startBoxSelection(mouseX, mouseY, { additive = false } = {}) {
    isBoxSelecting = true;
    selectionBoxAdditive = additive;
    selectionBoxStart = { x: mouseX, y: mouseY };
    selectionBoxCurrent = { x: mouseX, y: mouseY };
}

function updateBoxSelection(mouseX, mouseY) {
    if (!isBoxSelecting) return;
    selectionBoxCurrent = { x: mouseX, y: mouseY };
}

function resetBoxSelection() {
    isBoxSelecting = false;
    selectionBoxStart = null;
    selectionBoxCurrent = null;
    selectionBoxAdditive = false;
}

function finalizeBoxSelection() {
    if (!isBoxSelecting) return;

    const rect = getSelectionBoxRect();
    const isDragSelection = rect && (rect.width >= selectionBoxMinPixels || rect.height >= selectionBoxMinPixels);

    if (!isDragSelection) {
        if (!selectionBoxAdditive) {
            clearSelection();
        }
        resetBoxSelection();
        redraw();
        return;
    }

    const boxEntities = getEntitiesInSelectionBox(rect);
    if (selectionBoxAdditive) {
        const merged = new Set(getSelectedEntities());
        boxEntities.forEach(entity => merged.add(entity));
        const mergedArray = Array.from(merged);
        setSelection(mergedArray, {
            primaryEntity: boxEntities[boxEntities.length - 1] || selectedEntity,
            pulse: false
        });
    } else {
        setSelection(boxEntities, {
            primaryEntity: boxEntities[boxEntities.length - 1] || null,
            pulse: false
        });
    }

    resetBoxSelection();
    redraw();
}

function selectEntity(event, { additive = false, toggle = false, pulse = false } = {}) {
    if (selectedType !== 'select') return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const gridPos = screenToDiamond(mouseX, mouseY);
    const clickedEntity = getEntityAtGrid(gridPos.x, gridPos.y);

    if (!clickedEntity) {
        if (!additive && !toggle) {
            clearSelection();
        }
        redraw();
        return null;
    }

    if (toggle || additive) {
        toggleSelection(clickedEntity, { pulseOnAdd: pulse });
    } else {
        setSelection([clickedEntity], { primaryEntity: clickedEntity, pulse });
    }

    redraw();
    return clickedEntity;
}

function eraseEntityAtEvent(event, { deferHistory = false } = {}) {
    if (selectedType !== 'delete') return false;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const gridPos = screenToDiamond(mouseX, mouseY);
    const clickedEntity = getEntityAtGrid(gridPos.x, gridPos.y);

    if (!clickedEntity || clickedEntity.locked) {
        return false;
    }

    setSelection([clickedEntity], { primaryEntity: clickedEntity, pulse: false });
    return deleteSelectedEntity({ pushHistoryEntry: !deferHistory }) > 0;
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

function canMoveDraggedSelection(deltaX, deltaY) {
    if (!dragSelectionStart.length) return false;
    const ignoreEntities = new Set(dragSelectionStart.map(item => item.entity));

    return dragSelectionStart.every(item =>
        isPositionValid(item.x + deltaX, item.y + deltaY, item.entity, ignoreEntities)
    );
}

function applyDraggedSelection(deltaX, deltaY) {
    dragSelectionStart.forEach(item => {
        item.entity.x = item.x + deltaX;
        item.entity.y = item.y + deltaY;
    });
}

function getDraggedSelectionDelta() {
    if (!dragSelectionStart.length) return { x: 0, y: 0 };
    const first = dragSelectionStart[0];
    return {
        x: first.entity.x - first.x,
        y: first.entity.y - first.y
    };
}

function tryApplyDraggedSelectionDelta(targetDeltaX, targetDeltaY) {
    if (!dragSelectionStart.length) return false;

    const currentDelta = getDraggedSelectionDelta();
    if (targetDeltaX === currentDelta.x && targetDeltaY === currentDelta.y) {
        return false;
    }

    const fallbackDeltas = [
        { x: targetDeltaX, y: targetDeltaY },
        { x: targetDeltaX, y: currentDelta.y },
        { x: currentDelta.x, y: targetDeltaY }
    ];

    const seen = new Set();
    for (const candidate of fallbackDeltas) {
        const key = `${candidate.x},${candidate.y}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (!canMoveDraggedSelection(candidate.x, candidate.y)) continue;
        applyDraggedSelection(candidate.x, candidate.y);
        return true;
    }

    return false;
}

function beginSelectionDragFromEntity(clickedEntity, gridPos) {
    const movableSelection = getSelectedEntities().filter(entity => !entity.locked);
    if (!movableSelection.length || !movableSelection.includes(clickedEntity)) return;

    isDragging = true;
    dragOffsetX = gridPos.x;
    dragOffsetY = gridPos.y;
    dragSelectionStart = movableSelection.map(entity => ({
        entity,
        x: entity.x,
        y: entity.y
    }));
}

function handleSelectEntityClick(clickedEntity, gridPos, { additiveSelection = false } = {}) {
    if (additiveSelection) {
        toggleSelection(clickedEntity, { pulseOnAdd: false });
        redraw();
        return;
    }

    const selectedNow = getSelectedEntities();
    if (!selectedEntities.has(clickedEntity) || selectedNow.length <= 1) {
        setSelection([clickedEntity], { primaryEntity: clickedEntity, pulse: false });
    } else {
        selectedEntity = clickedEntity;
        stopSelectionPulse();
    }

    beginSelectionDragFromEntity(clickedEntity, gridPos);
    redraw();
}

function handleSelectBlankClick(mouseX, mouseY, { additiveSelection = false } = {}) {
    startBoxSelection(mouseX, mouseY, { additive: additiveSelection });
    if (!additiveSelection) {
        clearSelection();
    }
    redraw();
}

function handleSelectMouseDown(event, mouseX, mouseY) {
    const gridPos = screenToDiamond(mouseX, mouseY);
    const clickedEntity = getEntityAtGrid(gridPos.x, gridPos.y);
    const additiveSelection = event.ctrlKey || event.metaKey;

    hasDragMovement = false;
    dragSelectionStart = [];

    if (clickedEntity) {
        handleSelectEntityClick(clickedEntity, gridPos, { additiveSelection });
    } else {
        handleSelectBlankClick(mouseX, mouseY, { additiveSelection });
    }
}

function handleMouseDown(event) {
    rememberPointerPosition(event.clientX, event.clientY);
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (selectedType === 'delete') {
        updateEraserCursorPosition(event.clientX, event.clientY);
        setEraserCursorVisible(true);
    }
    
    if (event.button === 1) { // Middle mouse button
        isPanning = true;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        event.preventDefault();
        return;
    }

    if (event.button !== 0) return; // Left mouse button only from here

    if (selectedType === 'select') {
        handleSelectMouseDown(event, mouseX, mouseY);
        return;
    }

    if (selectedType === 'move') {
        isPanning = true;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        return;
    }

    if (selectedType === 'delete') {
        flushPendingEraseHistory();
        hasPendingEraseHistory = false;
        isErasing = true;
        if (eraseEntityAtEvent(event, { deferHistory: true })) {
            hasPendingEraseHistory = true;
        }
        return;
    }

    addEntity(event);
}

function handleMouseMove(event) {
    rememberPointerPosition(event.clientX, event.clientY);
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (selectedType === 'delete') {
        updateEraserCursorPosition(event.clientX, event.clientY);
        setEraserCursorVisible(true);
    }
    
    if (isPanning) {
        panX += mouseX - lastMouseX;
        panY += mouseY - lastMouseY;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        redraw();
    } else if (isBoxSelecting) {
        updateBoxSelection(mouseX, mouseY);
        redraw();
    } else if (isErasing && selectedType === 'delete') {
        if (eraseEntityAtEvent(event, { deferHistory: true })) {
            hasPendingEraseHistory = true;
        }
    } else if (isDragging && dragSelectionStart.length) {
        const gridPos = screenToDiamond(mouseX, mouseY);
        const deltaX = gridPos.x - dragOffsetX;
        const deltaY = gridPos.y - dragOffsetY;

        if (tryApplyDraggedSelectionDelta(deltaX, deltaY)) {
            hasDragMovement = true;
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
        if (isBoxSelecting) {
            finalizeBoxSelection();
            return;
        }

        if (isDragging) {
            isDragging = false;
            dragSelectionStart = [];
            if (hasDragMovement) {
                pushHistory();
            }
            hasDragMovement = false;
        }
        if (selectedType === 'move') {
            isPanning = false;
        }
    }

    // this has to be separate to avoid lost undo entries when click-deleting in Delete mode
    if (isErasing) {
        isErasing = false;
        flushPendingEraseHistory();
    }
}

// Update this function to handle both desktop and mobile toolbars
function handleToolbarClick(e) {
    const button = e.target instanceof Element ? e.target.closest('button') : null;
    if (!button) return;

    // Handle map-mode toggles (e.g. Castle)
    if (button.dataset.mode) {
        setMapMode(button.dataset.mode);
        return;
    }

    if (button.dataset.type === 'delete') {
        if (getSelectedEntities().length) {
            const deletedCount = deleteSelectedEntity();
            showShortcutToast(
                deletedCount > 0
                    ? `Deleted ${deletedCount === 1 ? 'selected entity' : `${deletedCount} entities`} (E)`
                    : 'Selected object cannot be deleted'
            );
        } else {
            setSelectedTool('delete', { showToast: true });
        }
        return;
    }

    if (button.dataset.type) {
        setSelectedTool(button.dataset.type);
    }
}

function setSelectedTool(toolType, { showToast = false } = {}) {
    if (!toolType) return false;

    const knownToolButton = document.querySelector(
        `#toolbar-controls button[data-type="${toolType}"], #toolbar-buildings button[data-type="${toolType}"], #mobile-toolbar-buildings button[data-type="${toolType}"]`
    );
    if (!knownToolButton) return false;

    flushPendingEraseHistory();
    selectedType = toolType;
    clearSelection();
    isErasing = false;
    isDragging = false;
    dragSelectionStart = [];
    hasDragMovement = false;
    resetBoxSelection();
    stopSelectionPulse();

    document.querySelectorAll('#toolbar-controls button[data-type], #toolbar-buildings button[data-type], #mobile-toolbar-buildings button[data-type]').forEach(button => {
        button.classList.remove('bg-yellow-500', 'bg-yellow-600');

        if (button.dataset.type === toolType) {
            button.classList.add('bg-yellow-500');
        } else if (['flag', 'city', 'building', 'node', 'hq', 'obstacle'].includes(button.dataset.type)) {
            button.classList.add('bg-blue-500');
        }
    });

    if ((selectedType === 'select' || selectedType === 'move' || selectedType === 'delete') && ghostPreview) {
        ghostPreview = null;
    }
    updateObstacleSizeSelectorVisibility();
    redraw();
    updateCanvasCursorForTool(toolType);
    refreshGhostPreviewForCurrentPointer(toolType);

    if (showToast) {
        const shortcut = TOOL_SHORTCUT_LABELS[toolType];
        const label = TOOL_LABELS[toolType] || toolType;
        showShortcutToast(shortcut ? `${label} (${shortcut})` : label);
    }

    return true;
}

function setObstacleSize(size) {
    const normalized = Math.max(1, Math.min(4, parseInt(size, 10) || 1));
    obstacleSize = normalized;

    document.querySelectorAll('[data-obstacle-size]').forEach(btn => {
        const isActive = parseInt(btn.dataset.obstacleSize, 10) === normalized;
        btn.classList.remove('bg-blue-500', 'text-white', 'shadow-sm', 'bg-transparent', 'text-gray-500', 'hover:text-gray-700');
        if (isActive) {
            btn.classList.add('bg-blue-500', 'text-white', 'shadow-sm');
        } else {
            btn.classList.add('bg-transparent', 'text-gray-500', 'hover:text-gray-700');
        }
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (selectedType === 'obstacle') {
        refreshGhostPreviewForCurrentPointer('obstacle');
    }
}

function updateObstacleSizeSelectorVisibility() {
    const visible = selectedType === 'obstacle';
    document.querySelectorAll('.obstacle-size-selector').forEach(el => {
        el.classList.toggle('hidden', !visible);
    });
}

// ===== SET/RENDER GUI BUTTONS =====
function setCityLabelMode(mode = defaultCityLabelMode) {
    // mode: "march", "coords", "none"
    cityLabelMode = mode || defaultCityLabelMode;
    const p1 = document.querySelector('[citySettingsButtons="1"]');
    const m1 = document.querySelector('[citySettingsButtons="m1"]');
    const p3 = document.querySelector('[citySettingsButtons="3"]');
    const m3 = document.querySelector('[citySettingsButtons="m3"]');
    const anchorInputContainer = document.getElementById('anchorInputContainer');

    // Reset all
    [p1, m1, p3, m3].forEach(b => {
        if (b) b.classList.remove('bg-yellow-500', 'bg-indigo-600', 'text-white');
    });

    if (cityLabelMode === "march") {
        [p1, m1].forEach(b => b?.classList.add('bg-yellow-500', 'text-white'));
    }
    if (cityLabelMode === "coords") {
        [p3, m3].forEach(b => b?.classList.add('bg-indigo-600', 'text-white'));
    }

    if (anchorInputContainer) {
        anchorInputContainer.classList.toggle('hidden', cityLabelMode !== "coords");
    }

    if (cityLabelMode === 'coords') loadWorldmapData();

    redraw();
}

function setWaveMode(_waveMode = defaultWaveMode) {
    waveMode = _waveMode || defaultWaveMode;
    
    const d2 = document.querySelector('[citySettingsButtons="2"]');
    const m2 = document.querySelector('[citySettingsButtons="m2"]');
    [d2, m2].forEach(b => {
        if (!b) return;
        b.classList.toggle('bg-yellow-500', waveMode);
        b.classList.toggle('text-white', waveMode);
    });
    redraw();
}

function setShowWorldmap(value) {
    showWorldmap = value;
    document.querySelectorAll('[citySettingsButtons="6"], [citySettingsButtons="m6"]').forEach(b => {
        b.classList.toggle('bg-yellow-500', showWorldmap);
        b.classList.toggle('text-white', showWorldmap);
    });
    if (showWorldmap) loadWorldmapData();
    redraw();
}

// Set the current map mode. Supported modes: 'base', 'castle'
function setMapMode(mode = 'base') {
    mapMode = mode || 'base';

    // Update mode switch visuals (desktop + mobile)
    document.querySelectorAll('[data-mode]').forEach(b => {
        const isActive = b.dataset.mode === mapMode;
        b.classList.remove('bg-transparent', 'text-gray-500', 'hover:text-gray-700', 'bg-blue-500', 'text-white', 'shadow-sm');
        b.classList.add('transition-colors');
        if (isActive) {
            b.classList.add('bg-blue-500', 'text-white', 'shadow-sm');
        } else {
            b.classList.add('bg-transparent', 'text-gray-500', 'hover:text-gray-700');
        }
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    updateEnemyZoneButtonVisibility();
    updateTeamControlsVisibility();

    // If entering castle mode, set the coord anchor to 599:599 and ensure entities
    if (mapMode === 'castle') {
        try { setAnchorInput({ x: 599, y: 599 }); } catch (e) { setCoordAnchor(599, 599); }
        ensureCastleEntities();
    } else {
        // leaving castle mode -> remove the locked castle/turret entities
        removeCastleEntities();
    }
    redraw();
    updateCityList();
    window.dispatchEvent(new CustomEvent('layout-mapmode-change', { detail: { mode: mapMode } }));
}

function updateEnemyZoneButtonVisibility() {
    const show = mapMode === 'castle';
    document.querySelectorAll('[data-type="enemyzone"]').forEach(button => {
        button.classList.toggle('hidden', !show);
        button.disabled = !show;
        if (!show) {
            button.setAttribute('aria-hidden', 'true');
            button.setAttribute('tabindex', '-1');
        } else {
            button.removeAttribute('aria-hidden');
            button.removeAttribute('tabindex');
        }
    });

    if (!show && selectedType === 'enemyzone') {
        if (!setSelectedTool('select')) {
            selectedType = 'select';
            updateCanvasCursorForTool('select');
        }
    }
}

function updateTeamControlsVisibility() {
    const showTeams = mapMode === 'castle' || showTeamsInBase;
    const teamSection = document.getElementById('teamManagementSection');
    if (teamSection) {
        teamSection.classList.toggle('hidden', !showTeams);
    }
    const mobileTeamActions = document.getElementById('mobileTeamActions');
    if (mobileTeamActions) {
        mobileTeamActions.classList.toggle('hidden', !showTeams);
    }
    const showToggle = mapMode === 'base';
    document.querySelectorAll('[citySettingsButtons="5"], [citySettingsButtons="m5"]').forEach(btn => {
        btn.classList.toggle('hidden', !showToggle);
        btn.classList.toggle('bg-yellow-500', showTeamsInBase);
        btn.classList.toggle('text-white', showTeamsInBase);
    });
    const current = document.getElementById('citySort')?.value || 'id';
    enablePopulateSortOptions(current);
}

// Draw the reserved castle area around the anchor cell
function drawCastleReservedArea(context, pX, pY, z) {
    if (mapMode !== 'castle') return;

    const mid = anchorGridCell();
    context.save();
    context.fillStyle = 'rgba(200, 50, 50, 0.25)';
    context.strokeStyle = 'rgba(200,50,50,0.6)';
    context.lineWidth = Math.max(1, 2 * z);
    const half = Math.floor(castleReservedSize / 2);
    for (let x = mid.x - half; x <= mid.x + half - 1; x++) {
        for (let y = mid.y - half; y <= mid.y + half - 1; y++) {
            // draw diamond cell
            const corner = diamondToScreenCorner(x, y, pX, pY, z);
            const p2 = diamondToScreenCorner(x + 1, y, pX, pY, z);
            const p3 = diamondToScreenCorner(x + 1, y + 1, pX, pY, z);
            const p4 = diamondToScreenCorner(x, y + 1, pX, pY, z);
            context.beginPath();
            context.moveTo(corner.x, corner.y);
            context.lineTo(p2.x, p2.y);
            context.lineTo(p3.x, p3.y);
            context.lineTo(p4.x, p4.y);
            context.closePath();
            context.fill();
            context.stroke();
        }
    }

    context.restore();
}

// Ensure the central Castle and four Turrets exist (locked) when castle mode is active
function ensureCastleEntities() {
    const mid = anchorGridCell();
    const half = Math.floor(castleReservedSize / 2);
    const startX = mid.x - half;
    const endX = mid.x + half - 1;
    const startY = mid.y - half;
    const endY = mid.y + half - 1;

    // Check if castle already present
    const existingCastle = entities.find(e => e.type === 'castle');
    if (!existingCastle) {
        // Place 8x8 Castle centered in reserved area
        const castleSize = 6;
        const castleHalf = Math.floor(castleSize / 2);
        const castleX = mid.x - castleHalf;
        const castleY = mid.y - castleHalf;
        const castle = {
            x: castleX,
            y: castleY,
            width: castleSize,
            height: castleSize,
            type: 'castle',
            color: '#912900cc',
            name: 'Castle',
            locked: true
        };
        entities.push(castle);
    }

    // Turrets positions: north, east, south, west — 2x2 adjacent to reserved area
    const turrets = [
        { name: 'North Turret', x: mid.x - 6, y: startY + 0 },
        { name: 'East Turret',  x: endX - 1,  y: mid.y - 6 },
        { name: 'South Turret', x: mid.x + 4, y: endY -1  },
        { name: 'West Turret',  x: startX + 0, y: mid.y + 4 }
    ];

    for (const t of turrets) {
        const exists = entities.find(e => e.type === 'turret' && e.name === t.name);
        if (!exists) {
            entities.push({ x: t.x, y: t.y, width: 2, height: 2, type: 'turret', color: '#882222', name: t.name, locked: true });
        }
    }

    updateCounters();
    redraw();
    pushHistory();
}

function removeCastleEntities() {
    let changed = false;
    for (let i = entities.length - 1; i >= 0; i--) {
        if (entities[i].type === 'castle' || entities[i].type === 'turret') {
            entities.splice(i, 1);
            changed = true;
        }
    }
    if (changed) {
        updateCounters();
        redraw();
        pushHistory();
    }
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

// ========== TEAM MANAGEMENT FUNCTIONS ==========

function openTeamModal() {
    const modal = document.getElementById('teamModal');
    const nameInput = document.getElementById('teamNameInput');
    const colorInput = document.getElementById('teamColorInput');
    const hexInput = document.getElementById('teamColorHex');
    if (!modal || !nameInput || !colorInput || !hexInput) return;

    const defaultName = `Team ${customTeams.length + 1}`;
    const defaultColor = '#3B82F6';
    nameInput.value = defaultName;
    colorInput.value = defaultColor;
    hexInput.value = defaultColor;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => nameInput.focus(), 0);
}

function closeTeamModal() {
    const modal = document.getElementById('teamModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function saveTeamFromModal() {
    const nameInput = document.getElementById('teamNameInput');
    const colorInput = document.getElementById('teamColorInput');
    const hexInput = document.getElementById('teamColorHex');
    if (!nameInput || !colorInput || !hexInput) return;

    const name = (nameInput.value || '').trim() || `Team ${customTeams.length + 1}`;
    let color = (hexInput.value || '').trim();
    if (!/^#([0-9a-fA-F]{3}){1,2}$/.test(color)) {
        color = colorInput.value || '#3B82F6';
    }

    customTeams.push({ name, color });
    updateTeamsUI();
    markUnsavedChanges();
    closeTeamModal();
}

function createNewTeam() {
    openTeamModal();
}

function deleteTeam(index) {
    if (confirm(`Delete ${customTeams[index].name}?`)) {
        // Remove team assignments for this team
        Object.keys(cityTeams).forEach(cityId => {
            if (cityTeams[cityId] === index) {
                delete cityTeams[cityId];
            } else if (cityTeams[cityId] > index) {
                cityTeams[cityId]--; // Shift down indices
            }
        });

        customTeams.splice(index, 1);
        updateTeamsUI();
        redraw();
        markUnsavedChanges();
    }
}

function assignCityToTeam(city, teamIndex) {
    if (city && city.id !== undefined) {
        if (teamIndex === -1) {
            delete cityTeams[city.id];
        } else {
            cityTeams[city.id] = teamIndex;
        }
        updateCityList();
        redraw();
        markUnsavedChanges();
    }
}

function updateTeamsUI() {
    const container = document.getElementById('teamsContainer');
    if (!container) return;

    container.innerHTML = '';

    customTeams.forEach((team, index) => {
        const teamEl = document.createElement('div');
        teamEl.className = 'flex items-center justify-between p-2 bg-gray-50 rounded mb-2';
        const teamInfo = document.createElement('div');
        teamInfo.className = 'flex items-center gap-2';

        const colorBox = document.createElement('div');
        colorBox.className = 'w-4 h-4 rounded';
        const safeColor = typeof team.color === 'string' && /^#([0-9a-fA-F]{3}){1,2}$/.test(team.color)
            ? team.color
            : '#9ca3af';
        colorBox.style.backgroundColor = safeColor;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'text-sm font-medium';
        nameSpan.textContent = team.name || 'Team';

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'text-red-500 hover:text-red-700 text-xs';
        deleteButton.textContent = '✕';
        deleteButton.addEventListener('click', () => deleteTeam(index));

        teamInfo.appendChild(colorBox);
        teamInfo.appendChild(nameSpan);
        teamEl.appendChild(teamInfo);
        teamEl.appendChild(deleteButton);
        container.appendChild(teamEl);
    });
}

// Call this on load
window.addEventListener('DOMContentLoaded', () => {
    initializeDefaultTeams();
    updateTeamsUI();
});

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('mouseup', handleMouseUp);

canvas.addEventListener('wheel', handleWheel);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseenter', (event) => {
    rememberPointerPosition(event.clientX, event.clientY);
    refreshEraserCursorForCurrentPointer(selectedType);
    refreshGhostPreviewForCurrentPointer(selectedType);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mouseleave', () => {
    isErasing = false;
    setEraserCursorVisible(false);
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
    setCityLabelMode();
    
    // Set up toolbar click handlers
    document.querySelectorAll('#toolbar-controls button, #toolbar-buildings button').forEach(button => {
        button.addEventListener('click', handleToolbarClick);
    });

    // Set up mobile toolbar click handlers
    document.querySelectorAll('#mobile-toolbar-buildings button').forEach(button => {
        button.addEventListener('click', handleToolbarClick);
    });

    document.querySelectorAll('[data-mode]').forEach(button => {
        button.addEventListener('click', () => setMapMode(button.dataset.mode));
    });
    document.querySelectorAll('[data-alliance]').forEach(button => {
        button.addEventListener('click', () => setActiveAlliance(button.dataset.alliance));
    });
    document.querySelectorAll('[data-obstacle-size]').forEach(button => {
        button.addEventListener('click', () => setObstacleSize(button.dataset.obstacleSize));
    });

    // Initialize mode/alliance switch visuals
    setMapMode(mapMode);
    setActiveAlliance(activeAllianceId);
    setObstacleSize(obstacleSize);
    setSelectedTool(selectedType || 'select');

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
    document.getElementById('createNewTeamBtn')?.addEventListener('click', createNewTeam);
    document.getElementById('createNewTeamBtnMobile')?.addEventListener('click', createNewTeam);
    document.getElementById('saveAsCSVButton')?.addEventListener('click', () => exportPlayerNamesCSV({ onlyNamed: false }));

    // Team modal wiring
    const teamModal = document.getElementById('teamModal');
    const teamModalClose = document.getElementById('teamModalClose');
    const teamModalCancel = document.getElementById('teamModalCancel');
    const teamModalSave = document.getElementById('teamModalSave');
    const teamNameInput = document.getElementById('teamNameInput');
    const teamColorInput = document.getElementById('teamColorInput');
    const teamColorHex = document.getElementById('teamColorHex');

    teamModalClose?.addEventListener('click', closeTeamModal);
    teamModalCancel?.addEventListener('click', closeTeamModal);
    teamModalSave?.addEventListener('click', saveTeamFromModal);
    teamModal?.addEventListener('click', (e) => {
        if (e.target === teamModal) closeTeamModal();
    });

    teamColorInput?.addEventListener('input', () => {
        if (teamColorHex) teamColorHex.value = teamColorInput.value;
    });
    teamColorHex?.addEventListener('input', () => {
        const val = teamColorHex.value.trim();
        if (/^#([0-9a-fA-F]{3}){1,2}$/.test(val) && teamColorInput) {
            teamColorInput.value = val;
        }
    });
    teamNameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTeamFromModal();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeTeamModal();
        }
    });
    teamColorHex?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTeamFromModal();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeTeamModal();
        }
    });

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
    
    // Clear the entire map but preserve locked entities (e.g., castle/turrets)
    clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire map?')) {
            // Keep entities that are locked (locked: true) and remove the rest
            const lockedEntities = entities.filter(e => e && e.locked);
            entities.length = 0;
            for (const e of lockedEntities) entities.push(e);

            // Clear bear traps, enemy zones and reset city counter and selection
            bearTraps.length = 0;
            enemyZones.length = 0;
            cityCounterId = 1;
            clearSelection();

            redraw();
            updateCounters();
            updateCityList();
            markUnsavedChanges();
            pushHistory();
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

        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);

        // UTF-8 decode, remove BOM
        let text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

        // mojibake -> Windows-1252/Latin-1 fallback
        const looksBroken = /Ã.|Â.|�/.test(text);
        if (looksBroken) {
        try {
            text = new TextDecoder('windows-1252').decode(bytes);
        } catch {
            // naive Latin-1 Fallback
            text = String.fromCharCode(...bytes);
            }
        }
        
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
            // P5: Show teams in base
            if (key.endsWith('5')) {
                if (mapMode !== 'base') return;
                showTeamsInBase = !showTeamsInBase;
                updateTeamControlsVisibility();
                updateCityList();
            }

            // P6: Toggle worldmap obstacle layer
            if (key.endsWith('6')) {
                setShowWorldmap(!showWorldmap);
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

function replaceBrowserUrlSafely(urlLike) {
    try {
        window.history.replaceState(null, '', urlLike);
        return true;
    } catch (error) {
        console.warn('Skipping URL update (likely too long):', error);
        return false;
    }
}

// Update saveMap function to sync both textareas
function saveMap() {
    if (preventActionOnEmptyMap("generating the code")) return;

    try {
        const mapName = document.getElementById('mapNameInput').value;
        const compressedMap = compressMapWithName(entities, mapName, coordAnchor, waveMode, cityLabelMode, mapMode);
        const mapDataInput = document.getElementById('mapData');
        const mobileMapData = document.getElementById('mobileMapData');
        
        if (mapDataInput) mapDataInput.value = compressedMap;
        if (mobileMapData) mobileMapData.value = compressedMap;
        
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('mapData', compressedMap);
        replaceBrowserUrlSafely(newUrl);
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
        const compressedMap = compressMapWithName(entities, mapName, coordAnchor, waveMode, cityLabelMode, mapMode);
        const mapDataInput = document.getElementById('mapData');
        const mobileMapData = document.getElementById('mobileMapData');
        
        if (mapDataInput) mapDataInput.value = compressedMap;
        if (mobileMapData) mobileMapData.value = compressedMap;
        
        const longUrl = getShareableUrl(entities, mapName);
        replaceBrowserUrlSafely(longUrl);

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
                    const body = new URLSearchParams({ url: longUrl }).toString();
	    			const resp = await fetch(config.tinyurlApi, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                        },
                        body,
                        signal: controller.signal
                    });
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
                    return text;
	    		} catch (err) {
	    			console.warn('Short URL failed', err);
	    			if (shortUrlOutput) shortUrlOutput.value = '';
	    			if (mobileShortUrlOutput) mobileShortUrlOutput.value = '';

    			// show manual fallback links
    			if (shortUrlError) {
    				shortUrlError.textContent = 'Shortening failed. ';
    				const a = document.createElement('a');
	    				a.href = `${config.tinyurlManual}?url=${encodeURIComponent(longUrl)}`;
    				a.target = '_blank';
    				a.rel = 'noopener noreferrer';
    				a.textContent = 'Try manually';
    				a.className = 'underline text-blue-600';
    				shortUrlError.appendChild(a);
    			}
    			if (mobileShortUrlError) {
    				mobileShortUrlError.textContent = 'Shortening failed. ';
    				const a = document.createElement('a');
	    				a.href = `${config.tinyurlManual}?url=${encodeURIComponent(longUrl)}`;
    				a.target = '_blank';
    				a.rel = 'noopener noreferrer';
    				a.textContent = 'Try manually';
	    				a.className = 'underline text-blue-600';
	    				mobileShortUrlError.appendChild(a);
	    			}
                    return null;
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
                const compressed = compressMapWithName(entities, mapName, coordAnchor, waveMode, cityLabelMode, mapMode);
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
                const compressed = compressMapWithName(entities, mapName, coordAnchor, waveMode, cityLabelMode, mapMode);
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

function updateGhostPreview(mouseX, mouseY) {
    territoryPreview = null;

    if (selectedType && selectedType !== 'select' && selectedType !== 'move' && selectedType !== 'delete') {
        const gridPos = screenToDiamond(mouseX, mouseY);
        const x = gridPos.x;
        const y = gridPos.y;

        let width, height;
        if (selectedType === 'flag') {
            width = 1;
            height = 1;
        } else if (selectedType === 'obstacle') {
            width = Math.max(1, Math.min(4, obstacleSize | 0));
            height = width;
        } else if (selectedType === 'enemyzone') {
            width = 12;
            height = 12;
        } else if (selectedType === 'city') {
            width = 2;
            height = 2;
        } else if (selectedType === 'building' || selectedType === 'hq' || selectedType === 'node') {
            width = 3;
            height = 3;
        }

        const tempEntity = isAllianceScopedType(selectedType)
            ? { x, y, width, height, type: selectedType, allianceId: normalizeAllianceId(activeAllianceId) }
            : { x, y, width, height, type: selectedType };

        let validPosition;
        if (selectedType === 'obstacle') {
            // Each cell is placed individually; show preview if at least one cell fits.
            validPosition = false;
            for (let dx = 0; dx < width && !validPosition; dx++) {
                for (let dy = 0; dy < height && !validPosition; dy++) {
                    if (isPositionValid(x + dx, y + dy, { x: x + dx, y: y + dy, width: 1, height: 1, type: 'obstacle' })) {
                        validPosition = true;
                    }
                }
            }
        } else {
            validPosition = isPositionValid(x, y, tempEntity);
        }

        if (validPosition) {
            ghostPreview = { ...tempEntity };

            // If the selected building is a flag or HQ, calculate its territory for preview
            if (selectedType === 'flag' || selectedType === 'hq') {
                territoryPreview = getTerritoryPreviewAreaForEntity(ghostPreview);
            }
        } else {
            ghostPreview = null;
        }
        
        redraw();
    }
}

function isProtectedSourceInsideForeignProtectedArea(newX, newY, entity) {
    if (!entity || (entity.type !== 'flag' && entity.type !== 'hq')) return false;

    const ownAllianceId = getEntityAllianceId(entity);
    const { claimedCells } = buildProtectedAreaSnapshot(entities, entity);
    const width = entity.width || 1;
    const height = entity.height || 1;

    for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
            const owner = claimedCells.get(`${newX + dx},${newY + dy}`);
            if (owner && owner !== ownAllianceId) {
                return true;
            }
        }
    }
    return false;
}

function isPositionValid(newX, newY, entity, ignoreEntities = null) {
    if (newX < -gridCols || newX + entity.width > gridCols + 1 || 
        newY < -gridRows || newY + entity.height > gridRows + 1) {
        return false;
    }

    // In castle mode, disallow placing/moving ANY part of an entity inside the reserved center
    if (mapMode === 'castle') {
        const mid = anchorGridCell();
        const half = Math.floor(castleReservedSize / 2);
        const startX = mid.x - half;
        const endX = mid.x + half - 1;
        const startY = mid.y - half;
        const endY = mid.y + half - 1;
        for (let dx = 0; dx < entity.width; dx++) {
            for (let dy = 0; dy < entity.height; dy++) {
                const cx = newX + dx;
                const cy = newY + dy;
                if (cx >= startX && cx <= endX && cy >= startY && cy <= endY) return false;
            }
        }
        // Also enforce redzone rules: building allowed, but flags are forbidden inside the redzone ring
        const outerHalf = half + castleRedzoneThickness;
        const redStartX = mid.x - outerHalf;
        const redEndX = mid.x + outerHalf - 1;
        const redStartY = mid.y - outerHalf;
        const redEndY = mid.y + outerHalf - 1;
        // For flags, disallow placement anywhere inside redzone (but building/city allowed)
        if (entity.type === 'flag') {
            for (let dx = 0; dx < entity.width; dx++) {
                for (let dy = 0; dy < entity.height; dy++) {
                    const cx = newX + dx;
                    const cy = newY + dy;
                    // If inside outer box but not in inner reserved (i.e., within ring), forbid
                    const inOuter = (cx >= redStartX && cx <= redEndX && cy >= redStartY && cy <= redEndY);
                    const inInner = (cx >= startX && cx <= endX && cy >= startY && cy <= endY);
                    if (inOuter && !inInner) return false;
                }
            }
        }
        // Disallow HQs, similiar to flags
        if (entity.type === 'hq') {
            const HQRadius = 6;
            const centerX = newX + Math.floor(entity.width / 2);
            const centerY = newY + Math.floor(entity.height / 2);
            const effectiveRadius = HQRadius + Math.floor(entity.width / 2);

            for (let cx = centerX - effectiveRadius; cx <= centerX + effectiveRadius; cx++) {
                for (let cy = centerY - effectiveRadius; cy <= centerY + effectiveRadius; cy++) {
                    // If cell is inside the inner reserved area -> forbid
                    const inInner = (cx >= startX && cx <= endX && cy >= startY && cy <= endY);
                    if (inInner) return false;

                    // If cell is inside the outer redzone ring (outer box but not inner) -> forbid
                    const inOuter = (cx >= redStartX && cx <= redEndX && cy >= redStartY && cy <= redEndY);
                    if (inOuter && !inInner) return false;
                }
            }
        }
    }

    // Flags/HQs cannot be placed inside the protected area of another alliance.
    if (isProtectedSourceInsideForeignProtectedArea(newX, newY, entity)) {
        return false;
    }
    
    // Block placement on worldmap terrain when the worldmap layer is visible.
    if (worldmapPresence && (showWorldmap || cityLabelMode === 'coords')) {
        for (let dx = 0; dx < entity.width; dx++) {
            for (let dy = 0; dy < entity.height; dy++) {
                const wx = coordAnchor.x - (newY + dy);
                const wy = coordAnchor.y - (newX + dx);
                const wmKey = wx >= 0 && wx < 1200 && wy >= 0 && wy < 1200 ? worldmapPresence[wy * 1200 + wx] : 0;
                if (wmKey) {
                    if (wmKey !== 5 && wmKey !== 6) return false;
                    if (wmKey === 5 && entity.type !== 'city') return false;
                }
            }
        }
    }

    for (let other of entities) {
        if (other !== entity) {
            if (ignoreEntities && ignoreEntities.has(other)) continue;
            const hasOverlap =
                newX < other.x + other.width &&
                newX + entity.width > other.x &&
                newY < other.y + other.height &&
                newY + entity.height > other.y;

            if (hasOverlap) {
                return false;
            }
        }
    }
    return true;
}

function canInlineEditEntityName(entity) {
    return Boolean(entity && entity.type === 'city' && !entity.locked);
}

function handleInlineEntityNameEditKey(event, key, entity) {
    if (!canInlineEditEntityName(entity)) return false;
    if (event.altKey || event.ctrlKey || event.metaKey) return false;

    if (key === 'Enter') {
        event.preventDefault();
        entity.isEditing = false;
        redraw();
        updateCityList();
        return true;
    }

    if (key === 'Backspace') {
        event.preventDefault();
        entity.name = entity.name ? entity.name.slice(0, -1) : '';
        entity.isEditing = true;
        redraw();
        updateCityList();
        markUnsavedChanges();
        return true;
    }

    if (key.length === 1) {
        event.preventDefault();
        if (!entity.isEditing) {
            entity.name = '';
        }
        entity.isEditing = true;
        entity.name += key;
        redraw();
        updateCityList();
        markUnsavedChanges();
        return true;
    }

    return false;
}

function handleKeyDown(event) {
    const key = event.key || '';
    const normalizedKey = key.toLowerCase();
    const isTyping = isTextInputTarget(event.target);
    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);

    if (!isArrowKey) {
        flushPendingKeyboardMoveHistory();
    }

    // Global Undo/Redo: Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+Shift+Z
    try {
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const modKey = isMac ? event.metaKey : event.ctrlKey;
        if (!isTyping && modKey && normalizedKey === 'z') {
            event.preventDefault();
            if (event.shiftKey) redo(); else undo();
            return;
        }
        if (!isTyping && modKey && normalizedKey === 'y') {
            event.preventDefault();
            redo();
            return;
        }
    } catch (e) {
        console.error('Error in undo/redo keyboard shortcut handler:', e);
    }

    if (isTyping) return;

    const selectedNow = getSelectedEntities();
    const singleSelection = selectedNow.length === 1;

    if (singleSelection && (!selectedEntity || !selectedEntities.has(selectedEntity))) {
        selectedEntity = selectedNow[selectedNow.length - 1];
    }

    if (key === 'Escape' || key === 'Enter' && selectedNow.length) {
        event.preventDefault();
        selectedNow.forEach(entity => {
            if (entity && entity.type === 'city') {
                entity.isEditing = false;
            }
        });
        clearSelection();
        isDragging = false;
        dragSelectionStart = [];
        hasDragMovement = false;
        resetBoxSelection();
        redraw();
        return;
    }

    // Inline rename has priority over plain shortcuts when a single editable entity is selected.
    if (singleSelection && handleInlineEntityNameEditKey(event, key, selectedEntity)) {
        return;
    }

    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
        if (normalizedKey === 'm') {
            event.preventDefault();
            const nextMode = mapMode === 'castle' ? 'base' : 'castle';
            setMapMode(nextMode);
            showShortcutToast(`Mode: ${nextMode === 'castle' ? 'Castle' : 'Base'} (M)`);
            return;
        }

        if (normalizedKey === 'a') {
            event.preventDefault();
            const currentAllianceIndex = ALLIANCES.findIndex(a => a.id === normalizeAllianceId(activeAllianceId));
            const nextAlliance = ALLIANCES[(currentAllianceIndex + 1) % ALLIANCES.length]?.id || DEFAULT_ALLIANCE_ID;
            setActiveAlliance(nextAlliance);
            showShortcutToast(`Alliance: ${getAllianceName(nextAlliance)} (A)`);
            return;
        }

        if (normalizedKey === 'e') {
            event.preventDefault();
            if (getSelectedEntities().length) {
                const deletedCount = deleteSelectedEntity();
                showShortcutToast(
                    deletedCount > 0
                        ? `Deleted ${deletedCount === 1 ? 'selected entity' : `${deletedCount} entities`} (E)`
                        : 'Selected object cannot be deleted'
                );
            } else {
                setSelectedTool('delete', { showToast: true });
            }
            return;
        }

        const shortcutTool = TOOL_SHORTCUT_KEY_MAP[normalizedKey];
        if (shortcutTool) {
            event.preventDefault();
            if (shortcutTool === 'enemyzone' && mapMode !== 'castle') {
                showShortcutToast('Enemy Zone only in Castle mode');
                return;
            }
            if (shortcutTool === 'obstacle' && selectedType === 'obstacle') {
                const nextSize = (obstacleSize % 4) + 1;
                setObstacleSize(nextSize);
                showShortcutToast(`Obstacle ${nextSize}×${nextSize} (${TOOL_SHORTCUT_LABELS.obstacle})`);
                return;
            }
            setSelectedTool(shortcutTool, { showToast: true });
            return;
        }
    }

    if (!selectedNow.length) return;

    if (!selectedEntity || !selectedEntities.has(selectedEntity)) {
        selectedEntity = selectedNow[selectedNow.length - 1];
    }

    if (isArrowKey) {
        event.preventDefault();
    }

    if (key === 'Delete') {
        deleteSelectedEntity();
        return;
    }

    let deltaX = 0;
    let deltaY = 0;
    if (key === 'ArrowUp') {
        deltaY = -1;
    } else if (key === 'ArrowDown') {
        deltaY = 1;
    } else if (key === 'ArrowLeft') {
        deltaX = -1;
    } else if (key === 'ArrowRight') {
        deltaX = 1;
    }

    if (deltaX === 0 && deltaY === 0) return;

    const movableSelection = selectedNow.filter(entity => !entity.locked);
    if (!movableSelection.length) return;
    const ignoreEntities = new Set(movableSelection);
    const canMove = movableSelection.every(entity =>
        isPositionValid(entity.x + deltaX, entity.y + deltaY, entity, ignoreEntities)
    );

    if (canMove) {
        movableSelection.forEach(entity => {
            entity.x += deltaX;
            entity.y += deltaY;
        });
        redraw();
        markUnsavedChanges();
        scheduleKeyboardMoveHistoryPush();
    }
}

function deleteSelectedEntity({ pushHistoryEntry = true } = {}) {
    const selectedNow = getSelectedEntities();
    if (!selectedNow.length) return 0;

    const deletable = selectedNow.filter(entity => !entity.locked);
    if (!deletable.length) return 0;

    let removedCities = false;
    deletable.forEach(entity => {
        const index = entities.indexOf(entity);
        if (index === -1) return;

        if (entity.type === 'city') {
            removedCities = true;
        } else if (entity.type === 'building') {
            bearTraps = bearTraps.filter(trap => trap !== entity);
        } else if (entity.type === 'enemyzone') {
            enemyZones = enemyZones.filter(zone => zone !== entity);
        }

        entities.splice(index, 1);
    });

    if (removedCities) {
        renumberCities();
    }

    clearSelection();
    redraw();
    updateCounters();
    updateCityList();
    markUnsavedChanges();
    if (pushHistoryEntry) {
        pushHistory();
    }
    return deletable.length;
}

function updateCityList() {
    const allianceId = normalizeAllianceId(activeAllianceId);
    const visibleCities = entities.filter(e => e.type === 'city' && getEntityAllianceId(e) === allianceId);

    // Get march times for visible cities
    visibleCities.forEach(city => {
        city.marchTimes = calculateMarchTimes(city);
    });

    const cityList = document.getElementById('cityList');
    const mobileCityList = document.getElementById('mobileCityList');
    const sortSelect = document.getElementById('citySort');
    const mobileSortSelect = document.getElementById('mobileCitySort');

    if (!cityList || !sortSelect || !mobileCityList || !mobileSortSelect) return;

    // Sync sort options between desktop and mobile by cloning option nodes
    while (mobileSortSelect.firstChild) mobileSortSelect.removeChild(mobileSortSelect.firstChild);
    Array.from(sortSelect.options).forEach(opt => {
        const newOpt = document.createElement('option');
        newOpt.value = opt.value;
        newOpt.textContent = opt.textContent;
        mobileSortSelect.appendChild(newOpt);
    });
    mobileSortSelect.value = sortSelect.value;

    let sortBy = sortSelect.value;
    if (mapMode !== 'castle' && sortBy === 'team') {
        sortBy = 'id';
    }

    cityList.innerHTML = '';
    mobileCityList.innerHTML = '';

    const cities = visibleCities;
    const btIndex = sortBy === 'bt1' ? 0 : sortBy === 'bt2' ? 1 : null;

    // Separate prioritized
    const prioritized = btIndex !== null
        ? cities.filter(c => c.priorities && c.priorities[`bt${btIndex + 1}`])
        : [];
    const others = btIndex !== null
        ? cities.filter(c => !(c.priorities && c.priorities[`bt${btIndex + 1}`]))
        : cities;

    // Comparator for sorting
    const comparator = (a, b) => {
        switch (sortBy) {
            case 'name':
                return (a.name || `City ${a.id}`)
                    .toLowerCase()
                    .localeCompare((b.name || `City ${b.id}`).toLowerCase());
            case 'team': {
                const teamA = cityTeams[a.id] !== undefined ? cityTeams[a.id] : Infinity;
                const teamB = cityTeams[b.id] !== undefined ? cityTeams[b.id] : Infinity;
                if (teamA === teamB) {
                    return (a.name || `City ${a.id}`)
                        .toLowerCase()
                        .localeCompare((b.name || `City ${b.id}`).toLowerCase());
                }
                return teamA - teamB;
            }
            case 'bt1':
                return evaluateBTTime(a, 0) - evaluateBTTime(b, 0);
            case 'bt2':
                return evaluateBTTime(a, 1) - evaluateBTTime(b, 1);
            case 'both':
                return evaluateCombinedTime(a) - evaluateCombinedTime(b);
            default:
                return (a.id || 0) - (b.id || 0);
        }
    };

    prioritized.sort(comparator);
    others.sort(comparator);

    const selectCityFromList = (city) => {
        setSelection([city], { primaryEntity: city, pulse: true });
        redraw();
    };

    const buildCityItem = (city) => {
        const li = document.createElement('li');
        li.className = 'flex items-center space-x-2 mb-2';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = city.name || `City ${city.id}`;
        input.placeholder = `City ${city.id}`;
        input.className = 'border p-1 rounded touch-input';
        input.style.width = '15ch';
        const handleCityNameClick = () => selectCityFromList(city);
        input.addEventListener('click', handleCityNameClick);
        input.addEventListener('change', () => {
            city.name = input.value;
            redraw();
            markUnsavedChanges();
            updateCityList();
        });
        li.appendChild(input);

        if (mapMode === 'castle' || showTeamsInBase) {
            const teamSelect = document.createElement('select');
            teamSelect.className = 'text-xs border rounded px-2 py-1';
            teamSelect.style.minWidth = '80px';

            const noTeamOption = document.createElement('option');
            noTeamOption.value = '-1';
            noTeamOption.textContent = 'No Team';
            teamSelect.appendChild(noTeamOption);

            customTeams.forEach((team, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = team.name;
                option.style.color = team.color;
                teamSelect.appendChild(option);
            });

            teamSelect.value = cityTeams[city.id] !== undefined ? cityTeams[city.id] : '-1';
            teamSelect.addEventListener('change', () => {
                const teamIndex = parseInt(teamSelect.value);
                assignCityToTeam(city, teamIndex);
            });

            li.appendChild(teamSelect);
        }

        city.marchTimes.forEach((time, i) => {
            const key = `bt${i + 1}`;
            const isPriority = city.priorities && city.priorities[key];
            const bubble = document.createElement('span');
            const labelPrefix = mapMode === 'castle'
                ? 'Castle'
                : `${getAllianceShort(getEntityAllianceId(city))}BT${i + 1}`;
            bubble.textContent = `${labelPrefix}: ${time}s`;
            bubble.className = `bt-bubble inline-flex items-center justify-center px-2 py-1 text-xs leading-none rounded cursor-pointer min-w-[70px] ${
                isPriority ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`;
            bubble.addEventListener('click', () => {
                city.priorities = city.priorities || {};
                city.priorities[key] = !city.priorities[key];
                if (city.priorities[key]) {
                        const candidates = entities.filter(e =>
                            e.type === 'city' &&
                            getEntityAllianceId(e) === getEntityAllianceId(city) &&
                            !(e.priorities && e.priorities[key])
                        );
                    if (candidates.length) {
                        let bestCity = candidates[0];
                        let bestTime = sortBy === 'both'
                            ? evaluateCombinedTime(bestCity)
                            : evaluateBTTime(bestCity, i);
                        candidates.forEach(c => {
                            const t = sortBy === 'both'
                                ? evaluateCombinedTime(c)
                                : evaluateBTTime(c, i);
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
            li.appendChild(bubble);
        });

        return li;
    };

    // Render prioritized cities first, then others for both lists
    [...prioritized, ...others].forEach(city => {
        cityList.appendChild(buildCityItem(city));
        mobileCityList.appendChild(buildCityItem(city));
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

// Helper
function needsUtf8(str) {
    if (str.length > 254) return true;
    for (const ch of str) {
        if (ch.codePointAt(0) > 0xFF) return true;
    }
    return false;
}

// Checks if we can read bitCount bits from bitstr starting at offset
function canReadBits(bitstr, offset, bitCount) {
    return offset + bitCount <= bitstr.length;
}

  // Reads a 32-bit unsigned integer
function readUInt(bitstr, offset, len) {
    if (!canReadBits(bitstr, offset, len)) return { ok: false };
    const value = parseInt(bitstr.slice(offset, offset + len), 2);
    return { ok: true, value, next: offset + len };
}

// Reads byteCount bytes from offset and returns them as a Uint8Array
function readBytesFromBitString(bitstr, offset, byteCount) {
    const bitsNeeded = byteCount * 8;
    if (!canReadBits(bitstr, offset, bitsNeeded)) return { ok: false };
    const bytes = new Uint8Array(byteCount);
    for (let k = 0; k < byteCount; k++) {
        const start = offset + k * 8;
        bytes[k] = parseInt(bitstr.slice(start, start + 8), 2);
    }
    return { ok: true, bytes, next: offset + bitsNeeded };
}

const _utf8Decoder = new TextDecoder("utf-8"); // reuse for efficiency

function bytesToBitString(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(2).padStart(8, "0");
    return s;
}

function readBitsAsInt(bits, offset, len) {
    if (offset + len > bits.length) return null;
    return parseInt(bits.slice(offset, offset + len), 2);
}

// Compression and decompression functions
function compressMap(entities) {
    let bitString = "";

    entities.forEach(entity => {
        // skip castle and turret entities (will be generated due mode switch)
        if (entity.type === 'castle' || entity.type === 'turret') {
            return;
        }

        const type = entity.type === "flag" ? "000" :
                    entity.type === "city" ? "001" : 
                    entity.type === "building" ? "010" : 
                    entity.type === "node" ? "011" : 
                    entity.type === "hq" ? "101" : 
                    entity.type === "enemyzone" ? "110" :
                    "100"; // obstacle

        const storageX = entity.x + gridCols;
        const storageY = entity.y + gridRows;
        const x = storageX.toString(2).padStart(10, "0");
        const y = storageY.toString(2).padStart(10, "0");

        bitString += type + x + y;

        if (entity.type === "city") {
            const name = entity.name || `City ${entity.id}}`;

        if (needsUtf8(name)) {
            // New mode: marker 255 (11111111), then 16-bit byte length, then UTF-8 bytes
            const utf8 = new TextEncoder().encode(name);
            bitString += "11111111"; // 255
            bitString += utf8.length.toString(2).padStart(16, "0");
            bitString += bytesToBitString(utf8);
        } else {
            // Legacy compatible: 1 byte per character
            const len = Math.min(name.length, 254); // if > 254, you'd choose UTF-8 above
            bitString += len.toString(2).padStart(8, "0");
            for (let i = 0; i < len; i++) {
            const code = name.charCodeAt(i) & 0xFF;
            bitString += code.toString(2).padStart(8, "0");
            }
        }
        }
    });

    if (bitString.length % 8 !== 0) {
        bitString += "0".repeat(8 - (bitString.length % 8));
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
        i += 20; // x,y

        if (typeBits === "01") { // city legacy
        if (i + 8 > totalBits) break;
        const nameLen = parseInt(binaryString.slice(i, i + 8), 2);
        i += 8 + nameLen * 8;
        if (i > totalBits) break;
        }
        entities22++;
    }
    
    // Reset and try parsing as 23-bit chunks (new format)
    i = 0;
    while (i + 23 <= totalBits) {
        const typeBits = binaryString.slice(i, i + 3);
        i += 3;
        i += 20; // x,y

        if (typeBits === "001") { // city new
        if (i + 8 > totalBits) break;
        const lenByte = parseInt(binaryString.slice(i, i + 8), 2);
        i += 8;

        if (lenByte === 255) {
            if (i + 16 > totalBits) break;
            const byteLen = parseInt(binaryString.slice(i, i + 16), 2);
            i += 16 + byteLen * 8;
        } else {
            i += lenByte * 8;
        }
        if (i > totalBits) break;
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

        const type =
        typeBits === "000" ? "flag" :
        typeBits === "001" ? "city" :
        typeBits === "010" ? "building" :
        typeBits === "011" ? "node" :
        typeBits === "101" ? "hq" :
        typeBits === "110" ? "enemyzone" :
        "obstacle";

        const storageX = parseInt(xBits, 2);
        const storageY = parseInt(yBits, 2);
        const x = storageX - gridCols;
        const y = storageY - gridRows;

        const entity = { x, y, type };

        if (type === "flag") {
        entity.width = 1;
        entity.height = 1;
        entity.color = "gray";
        } else if (type === "city") {
        entity.width = 2;
        entity.height = 2;
        entity.color = getRandomColor();

        // read length byte (legacy length or 255 marker)
        const lenByteRes = readUInt(binaryString, i, 8);
        if (!lenByteRes.ok) break;
        const lenByte = lenByteRes.value;
        i = lenByteRes.next;

        if (lenByte === 255) {
            // UTF-8 name: 16-bit byte length + bytes
            const len16Res = readUInt(binaryString, i, 16);
            if (!len16Res.ok) break;
            const byteLen = len16Res.value;
            i = len16Res.next;

            const bytesRes = readBytesFromBitString(binaryString, i, byteLen);
            if (!bytesRes.ok) break;
            i = bytesRes.next;

            entity.name = _utf8Decoder.decode(bytesRes.bytes);
        } else {
            // Legacy name: lenByte latin-1 bytes
            const bytesRes = readBytesFromBitString(binaryString, i, lenByte);
            if (!bytesRes.ok) break;
            i = bytesRes.next;

            const arr = bytesRes.bytes;
            let name = "";
            for (let k = 0; k < arr.length; k++) {
            name += String.fromCharCode(arr[k]);
            }
            entity.name = name;
        }
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
        } else if (type === "enemyzone") {
        entity.width = 12;
        entity.height = 12;
        entity.color = "black";
        } else if (type === "obstacle") {
        entity.width = 1;
        entity.height = 1;
        entity.color = "#8B0000";
        }

        entities.push(entity);
    }

  return entities;
}

// ===== ENTITY ENCODING (6-bit coordinates, 15 bits/entity) =====
// Used by the lp1/lp2 packet format.
// gridCols/gridRows = 30, so storageX/Y range = 0–60, fits in 6 bits (max 63). Need to be adjusted if grid size changes.

function compressMapV3Bytes(entities) {
    let bitString = "";

    entities.forEach(entity => {
        if (entity.type === 'castle' || entity.type === 'turret') return;

        const type = entity.type === "flag"      ? "000" :
                     entity.type === "city"      ? "001" :
                     entity.type === "building"  ? "010" :
                     entity.type === "node"      ? "011" :
                     entity.type === "hq"        ? "101" :
                     entity.type === "enemyzone" ? "110" :
                                                   "100"; // obstacle

        const storageX = entity.x + gridCols;
        const storageY = entity.y + gridRows;
        bitString += type
            + storageX.toString(2).padStart(6, "0")
            + storageY.toString(2).padStart(6, "0");

        if (entity.type === "city") {
            const name = entity.name || `City ${entity.id}`;
            if (needsUtf8(name)) {
                const utf8 = new TextEncoder().encode(name);
                bitString += "11111111"; // marker 255
                bitString += utf8.length.toString(2).padStart(16, "0");
                bitString += bytesToBitString(utf8);
            } else {
                const len = Math.min(name.length, 254);
                bitString += len.toString(2).padStart(8, "0");
                for (let i = 0; i < len; i++) {
                    bitString += (name.charCodeAt(i) & 0xFF).toString(2).padStart(8, "0");
                }
            }
        }
    });

    if (bitString.length % 8 !== 0) {
        bitString += "0".repeat(8 - (bitString.length % 8));
    }

    const bytes = (bitString.match(/.{1,8}/g) || []).map(b => parseInt(b, 2));
    return new Uint8Array(bytes);
}

function decompressMapV2Bytes(bytes) {
    let bitString = "";
    for (let i = 0; i < bytes.length; i++) {
        bitString += bytes[i].toString(2).padStart(8, "0");
    }

    const entities = [];
    let i = 0;

    while (i + 15 <= bitString.length) {
        const typeBits = bitString.slice(i, i + 3);
        i += 3;
        const storageX = parseInt(bitString.slice(i, i + 6), 2);
        i += 6;
        const storageY = parseInt(bitString.slice(i, i + 6), 2);
        i += 6;

        const type = typeBits === "000" ? "flag"      :
                     typeBits === "001" ? "city"      :
                     typeBits === "010" ? "building"  :
                     typeBits === "011" ? "node"      :
                     typeBits === "101" ? "hq"        :
                     typeBits === "110" ? "enemyzone" :
                                         "obstacle";

        const entity = {
            x: storageX - gridCols,
            y: storageY - gridRows,
            type
        };

        if (type === "flag") {
            entity.width = 1; entity.height = 1; entity.color = "gray";
        } else if (type === "city") {
            entity.width = 2; entity.height = 2; entity.color = getRandomColor();

            const lenByteRes = readUInt(bitString, i, 8);
            if (!lenByteRes.ok) break;
            const lenByte = lenByteRes.value;
            i = lenByteRes.next;

            if (lenByte === 255) {
                const len16Res = readUInt(bitString, i, 16);
                if (!len16Res.ok) break;
                i = len16Res.next;
                const bytesRes = readBytesFromBitString(bitString, i, len16Res.value);
                if (!bytesRes.ok) break;
                i = bytesRes.next;
                entity.name = _utf8Decoder.decode(bytesRes.bytes);
            } else {
                const bytesRes = readBytesFromBitString(bitString, i, lenByte);
                if (!bytesRes.ok) break;
                i = bytesRes.next;
                let name = "";
                for (let k = 0; k < bytesRes.bytes.length; k++) {
                    name += String.fromCharCode(bytesRes.bytes[k]);
                }
                entity.name = name;
            }
        } else if (type === "building") {
            entity.width = 3; entity.height = 3; entity.color = "black";
        } else if (type === "hq") {
            entity.width = 3; entity.height = 3; entity.color = "darkgoldenrod";
        } else if (type === "node") {
            entity.width = 3; entity.height = 3; entity.color = "darkgreen";
        } else if (type === "enemyzone") {
            entity.width = 12; entity.height = 12; entity.color = "black";
        } else if (type === "obstacle") {
            entity.width = 1; entity.height = 1; entity.color = "#8B0000";
        }

        entities.push(entity);
    }

    return entities;
}

function sanitizeMapName(name) {
    return name.replace(/[^a-zA-Z0-9 \-_]/g, '').substring(0, 30);
}

function base64UrlEncodeUtf8(text) {
    const bytes = new TextEncoder().encode(String(text));
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlDecodeUtf8(value) {
    const normalized = String(value || '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = normalized + (padding ? '='.repeat(4 - padding) : '');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function bytesToBase64Url(bytes) {
    return bytesToBase64(bytes)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
    const normalized = String(value || '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = normalized + (padding ? '='.repeat(4 - padding) : '');
    return base64ToBytes(padded);
}


function getFflateApi() {
    const api = (typeof window !== 'undefined' && window.fflate) ? window.fflate : null;
    if (!api) return null;
    if (typeof api.deflateSync !== 'function') return null;
    if (typeof api.inflateSync !== 'function') return null;
    return api;
}

function buildUnifiedMapMeta(mapName, anchor, _waveMode, _cityLabelMode, _mapMode, serializableEntities) {
    const meta = {};
    const sanitizedName = sanitizeMapName(mapName || '');
    if (sanitizedName) meta.n = sanitizedName;

    if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
        meta.a = [clamp1200(anchor.x), clamp1200(anchor.y)];
    }

    if (_waveMode) meta.w = 1;                                    // omit if false (default)
    if (_cityLabelMode !== defaultCityLabelMode) meta.m = _cityLabelMode; // omit if "march"
    if (_mapMode === 'castle') meta.o = 'c';                     // omit if 'base' (default)

    const teamsPayload = getOptionalTeamsPayloadForMapCode();
    if (teamsPayload) {
        meta.t = teamsPayload;
    }

    const alliancesPayload = getOptionalAlliancesPayloadForMapCode(serializableEntities);
    if (alliancesPayload) {
        meta.l = alliancesPayload;
    }

    return meta;
}

function buildUnifiedMapPacket(serializableEntities, mapName, anchor, _waveMode, _cityLabelMode, _mapMode) {
    const entityBytes = compressMapV3Bytes(serializableEntities);
    const metaPayload = buildUnifiedMapMeta(
        mapName,
        anchor,
        _waveMode,
        _cityLabelMode,
        _mapMode,
        serializableEntities
    );
    const metaBytes = new TextEncoder().encode(JSON.stringify(metaPayload));

    // Header: 2 bytes big-endian uint16 = entity data length (up to 65535 bytes)
    if (entityBytes.length > 0xFFFF) {
        throw new Error(`Map entity data too large to encode: ${entityBytes.length} bytes (max 65535)`);
    }
    const packet = new Uint8Array(2 + entityBytes.length + metaBytes.length);
    packet[0] = (entityBytes.length >> 8) & 0xFF;
    packet[1] = entityBytes.length & 0xFF;
    packet.set(entityBytes, 2);
    packet.set(metaBytes, 2 + entityBytes.length);

    return packet;
}

function decodeUnifiedMapPacket(packet) {
    if (!(packet instanceof Uint8Array) || packet.length < 2) {
        return null;
    }

    const entityLen = (packet[0] << 8) | packet[1];
    if (2 + entityLen > packet.length) return null;

    const entityBytes = packet.slice(2, 2 + entityLen);
    const metaBytes = packet.slice(2 + entityLen);
    const entitiesDecoded = decompressMapV2Bytes(entityBytes);

    let meta = {};
    try {
        meta = JSON.parse(new TextDecoder().decode(metaBytes));
    } catch (e) {
        console.warn('Failed to parse unified map metadata payload', e);
    }

    const out = {
        entities: Array.isArray(entitiesDecoded) ? entitiesDecoded : [],
        mapName: '',
        anchor: null,
        waveMode: defaultWaveMode,
        cityLabelMode: defaultCityLabelMode,
        mapMode: 'base',
        teams: null,
        alliances: null
    };

    if (typeof meta.n === 'string') {
        out.mapName = meta.n;
    }

    if (Array.isArray(meta.a) && meta.a.length >= 2) {
        out.anchor = parseCoordInput(`${meta.a[0]}:${meta.a[1]}`);
    }

    if (meta.w !== undefined) {
        out.waveMode = String(meta.w) === '1' || meta.w === true;
    }

    if (typeof meta.m === 'string') {
        const mode = meta.m.trim().toLowerCase();
        if (['march', 'coords', 'none'].includes(mode)) {
            out.cityLabelMode = mode;
        }
    }

    if (typeof meta.o === 'string') {
        out.mapMode = meta.o === 'c' ? 'castle' : 'base';
    }

    const normalizedTeams = deserializeTeamsFromMapCode(meta.t ?? meta.teams);
    if (normalizedTeams) {
        out.teams = normalizedTeams;
    }

    const normalizedAlliances = deserializeAlliancesFromMapCode(meta.l ?? meta.alliances);
    if (normalizedAlliances) {
        out.alliances = normalizedAlliances;
    }

    return out;
}

function compressMapUnifiedPayload(serializableEntities, mapName, anchor, _waveMode, _cityLabelMode, _mapMode) {
    try {
        const packet = buildUnifiedMapPacket(
            serializableEntities,
            mapName,
            anchor,
            _waveMode,
            _cityLabelMode,
            _mapMode
        );

        const lp1Payload = 'lp1:' + bytesToBase64Url(packet);
        const fflateApi = getFflateApi();
        if (!fflateApi) {
            return lp1Payload;
        }

        try {
            const compressed = fflateApi.deflateSync(packet, { level: 9 });
            if (!(compressed instanceof Uint8Array) || compressed.length === 0) {
                return lp1Payload;
            }
            const lp2Payload = 'lp2:' + bytesToBase64Url(compressed);
            return lp2Payload.length < lp1Payload.length ? lp2Payload : lp1Payload;
        } catch (compressionError) {
            console.warn('Failed to compress unified map payload with deflate; using lp1 payload.', compressionError);
            return lp1Payload;
        }
    } catch (e) {
        console.warn('Failed to build unified map payload; falling back to segmented code.', e);
        return null;
    }
}

function decompressMapUnifiedPayload(combinedString) {
    if (typeof combinedString !== 'string') {
        return null;
    }

    try {
        if (combinedString.startsWith('lp1:')) {
            const packet = base64UrlToBytes(combinedString.slice(4));
            return decodeUnifiedMapPacket(packet);
        }
        if (combinedString.startsWith('lp2:')) {
            const fflateApi = getFflateApi();
            if (!fflateApi) {
                console.warn('Cannot decode lp2 payload because compression support is unavailable.');
                return null;
            }
            const compressed = base64UrlToBytes(combinedString.slice(4));
            const packet = fflateApi.inflateSync(compressed);
            return decodeUnifiedMapPacket(packet);
        }
        return null;
    } catch (e) {
        console.warn('Failed to decode unified map payload', e);
        return null;
    }
}

function encodeCompactJsonForMapCode(payload) {
    try {
        return base64UrlEncodeUtf8(JSON.stringify(payload));
    } catch (e) {
        console.warn('Failed to encode compact map payload', e);
        return '';
    }
}

function decodeCompactJsonFromMapCode(value) {
    try {
        const raw = base64UrlDecodeUtf8(value);
        return JSON.parse(raw);
    } catch (e) {
        console.warn('Failed to decode compact map payload', e);
        return null;
    }
}

const DEFAULT_MAP_CODE_TEAM_LIST = DEFAULT_TEAMS.map(team => [
    normalizeTeamNameForMapCodeComparison(team.name),
    normalizeTeamColorForMapCodeComparison(team.color)
]);

function normalizeTeamColorForMapCodeComparison(color) {
    const raw = String(color || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!raw) return '#3b82f6';
    if (raw === '#3b82f6' || raw === 'rgb(59,130,246)' || raw === 'rgba(59,130,246,1)') return '#3b82f6';
    if (raw === '#ef4444' || raw === 'rgb(239,68,68)' || raw === 'rgba(239,68,68,1)') return '#ef4444';
    return raw;
}

function normalizeTeamNameForMapCodeComparison(name) {
    return typeof name === 'string' ? name.trim() : 'Team';
}

function hasTeamAssignmentsForMapCode() {
    return Object.entries(cityTeams).some(([cityId, teamIndex]) => {
        const parsedCityId = Number.parseInt(cityId, 10);
        const parsedTeamIndex = Number.parseInt(teamIndex, 10);
        return Number.isFinite(parsedCityId) && Number.isFinite(parsedTeamIndex) && parsedTeamIndex >= 0;
    });
}

function hasNonDefaultTeamListForMapCode() {
    if (!Array.isArray(customTeams) || customTeams.length === 0) {
        // Empty team list falls back to defaults on load, so we can omit it.
        return false;
    }

    const normalizedCurrent = customTeams.map(team => [
        normalizeTeamNameForMapCodeComparison(team?.name),
        normalizeTeamColorForMapCodeComparison(team?.color)
    ]);

    if (normalizedCurrent.length !== DEFAULT_MAP_CODE_TEAM_LIST.length) {
        return true;
    }

    for (let i = 0; i < normalizedCurrent.length; i++) {
        if (normalizedCurrent[i][0] !== DEFAULT_MAP_CODE_TEAM_LIST[i][0]) return true;
        if (normalizedCurrent[i][1] !== DEFAULT_MAP_CODE_TEAM_LIST[i][1]) return true;
    }

    return false;
}

function shouldPersistTeamsForMapCode() {
    return hasTeamAssignmentsForMapCode() || hasNonDefaultTeamListForMapCode();
}

function serializeTeamsForMapCode() {
    const compactAssignments = Object.entries(cityTeams)
        .map(([cityId, teamIndex]) => [Number.parseInt(cityId, 10), Number(teamIndex)])
        .filter(([cityId, teamIndex]) => Number.isFinite(cityId) && Number.isFinite(teamIndex))
        .sort((a, b) => a[0] - b[0]);

    return {
        a: compactAssignments,
        l: customTeams.map(team => [
            typeof team?.name === 'string' ? team.name : 'Team',
            typeof team?.color === 'string' ? team.color : '#3B82F6'
        ])
    };
}

function deserializeTeamsFromMapCode(payload) {
    if (!payload || typeof payload !== 'object') return null;

    const rawAssignmentsPayload = payload.assignments ?? payload.a;
    const rawAssignments = {};
    if (Array.isArray(rawAssignmentsPayload)) {
        rawAssignmentsPayload.forEach(item => {
            if (!Array.isArray(item) || item.length < 2) return;
            const cityId = Number.parseInt(item[0], 10);
            const teamIndex = Number.parseInt(item[1], 10);
            if (!Number.isFinite(cityId) || !Number.isFinite(teamIndex)) return;
            rawAssignments[String(cityId)] = teamIndex;
        });
    } else if (rawAssignmentsPayload && typeof rawAssignmentsPayload === 'object') {
        Object.entries(rawAssignmentsPayload).forEach(([key, value]) => {
            const cityId = Number.parseInt(key, 10);
            const teamIndex = Number.parseInt(value, 10);
            if (!Number.isFinite(cityId) || !Number.isFinite(teamIndex)) return;
            rawAssignments[String(cityId)] = teamIndex;
        });
    }

    const rawList = Array.isArray(payload.list)
        ? payload.list
        : (Array.isArray(payload.l) ? payload.l : []);

    const normalizedList = rawList.map(item => {
        if (Array.isArray(item)) {
            return {
                name: typeof item[0] === 'string' ? item[0] : 'Team',
                color: typeof item[1] === 'string' ? item[1] : '#3B82F6'
            };
        }
        if (item && typeof item === 'object') {
            return {
                name: typeof item.name === 'string' ? item.name : 'Team',
                color: typeof item.color === 'string' ? item.color : '#3B82F6'
            };
        }
        return { name: 'Team', color: '#3B82F6' };
    });

    return {
        assignments: rawAssignments,
        list: normalizedList
    };
}

function getOptionalTeamsPayloadForMapCode() {
    if (!shouldPersistTeamsForMapCode()) return null;
    return serializeTeamsForMapCode();
}

function encodeAllianceTokenToBits(token) {
    if (token === 'm') return 1;
    if (token === 'f') return 2;
    return 0;
}

function decodeAllianceBitsToToken(bits) {
    if (bits === 1) return 'm';
    if (bits === 2) return 'f';
    return 'n';
}

function packAllianceTokenString(tokenString) {
    if (typeof tokenString !== 'string') return { p: '', c: 0 };
    const count = tokenString.length;
    if (count === 0) return { p: '', c: 0 };

    const bytes = new Uint8Array(Math.ceil(count / 4));
    for (let i = 0; i < count; i++) {
        const code = encodeAllianceTokenToBits(tokenString[i]);
        const byteIndex = Math.floor(i / 4);
        const shift = (3 - (i % 4)) * 2;
        bytes[byteIndex] |= code << shift;
    }

    return { p: bytesToBase64Url(bytes), c: count };
}

function unpackAllianceTokenString(packedBase64, count) {
    const safeCount = Number.parseInt(count, 10);
    if (!Number.isFinite(safeCount) || safeCount <= 0) return [];
    if (typeof packedBase64 !== 'string' || packedBase64.length === 0) return [];

    try {
        const bytes = base64UrlToBytes(packedBase64);
        const requiredBytes = Math.ceil(safeCount / 4);
        if (bytes.length < requiredBytes) return [];

        const tokens = new Array(safeCount);
        for (let i = 0; i < safeCount; i++) {
            const byteIndex = Math.floor(i / 4);
            const shift = (3 - (i % 4)) * 2;
            const code = (bytes[byteIndex] >> shift) & 0b11;
            tokens[i] = decodeAllianceBitsToToken(code);
        }
        return tokens;
    } catch (e) {
        console.warn('Failed to unpack compact alliance list', e);
        return [];
    }
}

function serializeAlliancesForMapCode(serializableEntities) {
    const activeToken = normalizeAllianceId(activeAllianceId) === 'farm' ? 'f' : 'm';
    const listTokens = serializableEntities.map(entity => {
        if (!isAllianceScopedType(entity.type)) return 'n';
        return normalizeAllianceId(getEntityAllianceId(entity)) === 'farm' ? 'f' : 'm';
    }).join('');

    const packed = packAllianceTokenString(listTokens);
    return { a: activeToken, p: packed.p, c: packed.c };
}

function shouldPersistAlliancesForMapCode(serializableEntities) {
    if (normalizeAllianceId(activeAllianceId) !== DEFAULT_ALLIANCE_ID) {
        return true;
    }

    return serializableEntities.some(entity => (
        isAllianceScopedType(entity.type) &&
        normalizeAllianceId(getEntityAllianceId(entity)) !== DEFAULT_ALLIANCE_ID
    ));
}

function getOptionalAlliancesPayloadForMapCode(serializableEntities) {
    if (!shouldPersistAlliancesForMapCode(serializableEntities)) return null;
    return serializeAlliancesForMapCode(serializableEntities);
}

function normalizeAllianceToken(value) {
    if (value === null || value === undefined) return null;
    if (value === 'n' || value === 'x') return null;
    if (value === 'f' || value === 'farm') return 'farm';
    if (value === 'm' || value === 'main') return 'main';
    return null;
}

function deserializeAlliancesFromMapCode(payload) {
    if (!payload || typeof payload !== 'object') return null;

    const rawActive = payload.active ?? payload.a;
    const active = normalizeAllianceToken(rawActive) || DEFAULT_ALLIANCE_ID;

    let rawList = [];
    if (typeof payload.p === 'string' && payload.p.length > 0) {
        rawList = unpackAllianceTokenString(payload.p, payload.c);
    } else if (Array.isArray(payload.list)) {
        rawList = payload.list;
    } else if (Array.isArray(payload.l)) {
        rawList = payload.l;
    } else if (typeof payload.l === 'string') {
        rawList = Array.from(payload.l);
    }

    const list = rawList.map(item => normalizeAllianceToken(item));
    return { active, list };
}

function getSerializableEntitiesForMapCode(sourceEntities = entities) {
    return sourceEntities.filter(entity => entity.type !== 'castle' && entity.type !== 'turret');
}

function compressMapWithName(entities, mapName, anchor = coordAnchor, _waveMode = waveMode, _cityLabelMode = cityLabelMode, _mapMode = mapMode) {
    const serializableEntities = getSerializableEntitiesForMapCode(entities);
    const unifiedPayload = compressMapUnifiedPayload(
        serializableEntities,
        mapName,
        anchor,
        _waveMode,
        _cityLabelMode,
        _mapMode
    );
    if (unifiedPayload) {
        return unifiedPayload;
    }

    let base64String = compressMap(serializableEntities);
    const parts = [base64String];

    if (mapName && mapName.trim() !== '') {
        parts.push("n=" + sanitizeMapName(mapName));
    }

    if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
        parts.push("a=" + clamp1200(anchor.x) + ":" + clamp1200(anchor.y));
    }

    parts.push("w=" + (_waveMode ? "1" : "0"));
    parts.push("m=" + _cityLabelMode);
    parts.push("mode=" + (_mapMode === 'castle' ? 'c' : 'b')); // 'b' = base, 'c' = castle

    const teamsPayload = getOptionalTeamsPayloadForMapCode();
    if (teamsPayload) {
        const teamsCompact = encodeCompactJsonForMapCode(teamsPayload);
        if (teamsCompact) {
            parts.push("teams2=" + teamsCompact);
        } else {
            parts.push("teams=" + encodeURIComponent(JSON.stringify({ assignments: cityTeams, list: customTeams })));
        }
    }

    const alliancesPayload = getOptionalAlliancesPayloadForMapCode(serializableEntities);
    if (alliancesPayload) {
        const alliancesCompact = encodeCompactJsonForMapCode(alliancesPayload);
        if (alliancesCompact) {
            parts.push("alli2=" + alliancesCompact);
        } else {
            parts.push("alli=" + encodeURIComponent(JSON.stringify({
                active: normalizeAllianceId(activeAllianceId),
                list: serializableEntities.map(entity => isAllianceScopedType(entity.type) ? getEntityAllianceId(entity) : null)
            })));
        }
    }

    return parts.join("||");
}


function decompressMapWithName(combinedString) {
    // Returns: { entities, mapName?, anchor?, waveMode?, cityLabelMode?, teams?, alliances? }
    const out = { entities: [], mapName: "", anchor: null, waveMode: null, cityLabelMode: null, teams: null, alliances: null };

    if (!combinedString || typeof combinedString !== 'string') {
        return out;
    }

    const unified = decompressMapUnifiedPayload(combinedString);
    if (unified) {
        if (unified.mapName) {
            const mapNameInput = document.getElementById('mapNameInput');
            if (mapNameInput) mapNameInput.value = unified.mapName;
        }
        return unified;
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
            out.waveMode = seg.slice(2) === '1';
        } else if (seg.startsWith("m=")) {
            let mode = seg.slice(2).trim().toLowerCase();
            if (!['march', 'coords', 'none'].includes(mode)) {
                mode = defaultCityLabelMode;
            }
            out.cityLabelMode = mode;
        } else if (seg.startsWith("mode=")) {
            out.mapMode = seg.slice(5).trim().toLowerCase();
        } else if (seg.startsWith("teams2=")) {
            const decoded = decodeCompactJsonFromMapCode(seg.slice(7));
            const normalizedTeams = deserializeTeamsFromMapCode(decoded);
            if (normalizedTeams) {
                out.teams = normalizedTeams;
            }
        } else if (seg.startsWith("teams=")) {
            try {
                const raw = decodeURIComponent(seg.slice(6));
                const parsed = JSON.parse(raw);
                const normalizedTeams = deserializeTeamsFromMapCode(parsed);
                if (normalizedTeams) {
                    out.teams = normalizedTeams;
                }
            } catch (e) {
                console.warn('Failed to parse teams data from map code', e);
            }
        } else if (seg.startsWith("alli2=")) {
            const decoded = decodeCompactJsonFromMapCode(seg.slice(6));
            const normalizedAlliances = deserializeAlliancesFromMapCode(decoded);
            if (normalizedAlliances) {
                out.alliances = normalizedAlliances;
            }
        } else if (seg.startsWith("alli=")) {
            try {
                const raw = decodeURIComponent(seg.slice(5));
                const parsed = JSON.parse(raw);
                const normalizedAlliances = deserializeAlliancesFromMapCode(parsed);
                if (normalizedAlliances) {
                    out.alliances = normalizedAlliances;
                }
            } catch (e) {
                console.warn('Failed to parse alliances data from map code', e);
            }
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

    if (out.mapMode) {
        // normalize
        out.mapMode = out.mapMode === 'c' ? 'castle' : 'base';
    }

    return out;
}


// Pure helper to generate a shareable URL with provided map data and name
function getShareableUrl(entitiesArg, mapNameArg) {
    const compressedMap = compressMapWithName(entitiesArg, mapNameArg, coordAnchor, waveMode, cityLabelMode, mapMode);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('mapData', compressedMap);
    return newUrl.toString();
}

function loadMap() {
    try {
        const compressedMap = mapData.value;
        const loaded = decompressMapWithName(compressedMap);
        const loadedEntities = Array.isArray(loaded) ? loaded : loaded.entities || [];
        const loadedAllianceData = !Array.isArray(loaded) && loaded.alliances && typeof loaded.alliances === 'object'
            ? loaded.alliances
            : null;
        const allianceList = Array.isArray(loadedAllianceData?.list) ? loadedAllianceData.list : [];
        const activeFromMap = normalizeAllianceId(loadedAllianceData?.active);

        entities.length = 0;
        bearTraps.length = 0;
        enemyZones.length = 0;

        loadedEntities.forEach((entity, index) => {
            if (isAllianceScopedType(entity.type)) {
                const fromList = allianceList[index];
                entity.allianceId = normalizeAllianceId(
                    typeof fromList === 'string' ? fromList : entity.allianceId
                );
            }
            entities.push(entity);
            if (entity.type === "building") {
                bearTraps.push(entity);
            } else if (entity.type === "enemyzone") {
                enemyZones.push(entity);
            }
        });

        if (!Array.isArray(loaded)) {
            setAnchorInput(loaded.anchor);
            setWaveMode(loaded.waveMode);
            setCityLabelMode(loaded.cityLabelMode);
            setMapMode(loaded.mapMode || 'castle'); // 'base' as default if no mapmode was saved

            // Restore teams if present; otherwise reset to defaults for legacy map codes
            if (loaded.teams && typeof loaded.teams === 'object') {
                const list = Array.isArray(loaded.teams.list) ? loaded.teams.list : [];
                const assignments = (loaded.teams.assignments && typeof loaded.teams.assignments === 'object')
                    ? loaded.teams.assignments
                    : {};
                customTeams = list.map(t => ({
                    name: typeof t.name === 'string' ? t.name : 'Team',
                    color: typeof t.color === 'string' ? t.color : '#3B82F6'
                }));
                if (customTeams.length === 0) {
                    initializeDefaultTeams();
                }
                cityTeams = assignments;
            } else {
                customTeams = [];
                initializeDefaultTeams();
                cityTeams = {};
            }
            updateTeamsUI();
            activeAllianceId = activeFromMap;
        } else {
            activeAllianceId = DEFAULT_ALLIANCE_ID;
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

        setActiveAlliance(activeAllianceId);
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
    // High-resolution export (4x)
    const scale = 2;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    tempCanvas.width = originalWidth * scale;
    tempCanvas.height = originalHeight * scale;

    const scaledPanX = panX * scale;
    const scaledPanY = panY * scale;
    const scaledZoom = zoom * scale;

    drawDiamondGrid(tempCtx, scaledPanX, scaledPanY, scaledZoom);
    drawEntities(tempCtx, scaledPanX, scaledPanY, scaledZoom);
    drawAnchorSymbol(tempCtx, scaledPanX, scaledPanY, scaledZoom);

    tempCanvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const mapName = document.getElementById('mapNameInput')?.value || 'layout';
        link.download = `${mapName}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}


function markUnsavedChanges() {
    hasUnsavedChanges = true;
    updatePageTitle();
}

function markChangesSaved() {
    hasUnsavedChanges = false;
    try {
        // Record a snapshot representing the saved state
        lastSavedSnapshot = (typeof snapshotState === 'function') ? snapshotState() : null;
    } catch (e) {
        console.error('Failed to create saved state snapshot:', e);
        lastSavedSnapshot = null;
    }
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
    const mobileSort = document.getElementById('mobileCitySort');
    const selects = [sortSelect, mobileSort].filter(Boolean);
    if (!selects.length) return;

    selects.forEach(sel => {
        sel.innerHTML = '';
        sel.appendChild(new Option('ID', 'id'));
        sel.appendChild(new Option('Name', 'name'));
        if (mapMode === 'castle' || showTeamsInBase) {
            sel.appendChild(new Option('Team', 'team'));
        }
    });
    
    // Check presence of BT1/BT2
    const allianceId = normalizeAllianceId(activeAllianceId);
    const cities = entities.filter(e => e.type === 'city' && getEntityAllianceId(e) === allianceId);
    const anyBT1 = cities.some(c => calculateMarchTimes(c).length >= 1);
    const anyBT2 = cities.some(c => calculateMarchTimes(c).length >= 2);
    
    selects.forEach(sel => {
        if (anyBT1) sel.appendChild(new Option('BT1-Time', 'bt1'));
        if (anyBT2) sel.appendChild(new Option('BT2-Time', 'bt2'));
        if (anyBT1 && anyBT2) sel.appendChild(new Option('Combined BT1+BT2', 'both'));

        if (selected && Array.from(sel.options).some(o => o.value === selected)) {
            sel.value = selected;
        } else {
            sel.value = 'id';
        }
        sel.onchange = updateCityList;
    });
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

function csvEscape(value) {
    const str = String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
}

function parseAllianceIdFromCsv(value, fallbackAllianceId = activeAllianceId) {
    const fallback = normalizeAllianceId(fallbackAllianceId);
    const needle = String(value ?? '').trim().toLowerCase();
    if (!needle) return fallback;

    const match = ALLIANCES.find(alliance =>
        alliance.id.toLowerCase() === needle ||
        alliance.name.toLowerCase() === needle ||
        alliance.short.toLowerCase() === needle
    );
    return match ? match.id : fallback;
}

function findTeamIndexByName(teamName) {
    const needle = String(teamName ?? '').trim().toLowerCase();
    if (!needle) return -1;
    return customTeams.findIndex(team => String(team?.name ?? '').trim().toLowerCase() === needle);
}

function getImportTeamColor(index) {
    const palette = [
        '#3B82F6', '#10B981', '#EF4444', '#F59E0B',
        '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ];
    return palette[index % palette.length];
}

function ensureTeamIndexByName(teamName) {
    const normalizedName = String(teamName ?? '').trim();
    if (!normalizedName) return -1;

    const existing = findTeamIndexByName(normalizedName);
    if (existing !== -1) return existing;

    customTeams.push({ name: normalizedName, color: getImportTeamColor(customTeams.length) });
    return customTeams.length - 1;
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
  const tipX = mid.x + (coordAnchor.y - wy);
  const tipY = mid.y + (coordAnchor.x - wx);

  return { x: tipX - (width - 1), y: tipY - (height - 1) };
}

// Import: name[,x,y,alliance,team] where all but "name" are optional
// 1) Existing "City N" cities are RENAMED only.
// 2) Only when no default cities remain, new 2x2 cities are created.
// 3) Provided x,y are by default used ONLY for new cities.
//    -> with option { moveDefaultCities:true } you can also move existing default cities,
//       I used this for for testing, might not be the best idea for normal use 
function importPlayerNamesCSV(text, { moveDefaultCities = false } = {}){
  const lines = String(text).split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return;
  const fallbackAllianceId = normalizeAllianceId(activeAllianceId);

  const headers = splitCsvLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
  const idx = k => headers.indexOf(k);

  const iName = idx('name');
  const iX    = idx('x');
  const iY    = idx('y');
  const iAlliance = idx('alliance');
  const iTeam = idx('team');
  const hasAllianceColumn = iAlliance !== -1;
  const hasTeamColumn = iTeam !== -1;

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
    const allianceId = hasAllianceColumn
      ? parseAllianceIdFromCsv(cols[iAlliance], fallbackAllianceId)
      : fallbackAllianceId;
    const teamName = hasTeamColumn ? (cols[iTeam] || '').trim() : null;
    rows.push({ name, x, y, allianceId, teamName });
  }
  if (!rows.length) return;

  const defaultCitiesByAlliance = {};
  const alliancesToPrepare = hasAllianceColumn ? ALLIANCES.map(a => a.id) : [fallbackAllianceId];
  alliancesToPrepare.forEach(allianceId => {
    defaultCitiesByAlliance[allianceId] = entities
      .filter(e => e.type === 'city' && getEntityAllianceId(e) === allianceId && isDefaultCityName(e.name))
      .sort((a,b) => (a.id||0) - (b.id||0));
  });

  const assignImportedTeam = (city, teamName) => {
    if (!hasTeamColumn || !city || city.id === undefined) return;
    const teamIndex = ensureTeamIndexByName(teamName);
    if (teamIndex === -1) {
      delete cityTeams[city.id];
      return;
    }
    cityTeams[city.id] = teamIndex;
  };

  const teamCountBeforeImport = customTeams.length;

  // 1) First consume default cities per alliance, then create new ones.
  for (let r = 0; r < rows.length; r++){
    const rec = rows[r];
    const defaultCities = defaultCitiesByAlliance[rec.allianceId] || [];
    const existingCity = defaultCities.shift();

    if (existingCity) {
      existingCity.name = rec.name;

      // only move if explicitly allowed
      if (moveDefaultCities && Number.isFinite(rec.x) && Number.isFinite(rec.y)) {
        const width = existingCity.width || 2, height = existingCity.height || 2;
        const g = worldCoordToGrid({ x: rec.x, y: rec.y }, width, height);
        const ok = (typeof isPositionValid !== 'function') ||
                   isPositionValid(g.x, g.y, { x:g.x, y:g.y, width, height });
        if (ok) { existingCity.x = g.x; existingCity.y = g.y; }
      }

      assignImportedTeam(existingCity, rec.teamName);
      continue;
    }

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

    const city = {
      type: 'city',
      id: (typeof cityCounterId !== 'undefined' ? cityCounterId++ : undefined),
      name: rec.name,
      x: gx, y: gy,
      width, height,
      allianceId: rec.allianceId,
      color: (typeof getRandomColor === 'function' ? getRandomColor() : 'rgb(200,200,200)')
    };
    entities.push(city);
    assignImportedTeam(city, rec.teamName);
  }

  if (hasTeamColumn && customTeams.length !== teamCountBeforeImport) {
    updateTeamsUI();
  }

  try { redraw(); } catch(e) { console.error("Redraw failed:", e); }  
  try { updateCounters(); } catch(e) { console.error("Update counters failed:", e); }  
  try { updateCityList(); } catch(e) { console.error("Update city list failed:", e); }  
  try { markUnsavedChanges(); } catch(e) { console.error("Marking unsaved changes failed:", e); } 
}


/* =========================
   EXPORT: name,x,y,alliance,team
   - x,y = coordForCity(city)
   - includes all cities (both alliances)
   - onlyNamed=true -> skips "City N" - only used for testing
========================= */
function exportPlayerNamesCSV({ onlyNamed = false } = {}) {
  if (preventActionOnEmptyMap("exporting to CSV")) return;
  const rows = ['name,x,y,alliance,team'];

  const allianceOrder = ALLIANCES.reduce((acc, a, idx) => {
    acc[a.id] = idx;
    return acc;
  }, {});

  const cities = entities
    .filter(e => e.type === 'city')
    .sort((a, b) => {
      const aa = allianceOrder[getEntityAllianceId(a)] ?? 999;
      const ab = allianceOrder[getEntityAllianceId(b)] ?? 999;
      if (aa !== ab) return aa - ab;
      return (a.id || 0) - (b.id || 0);
    });

  for (const c of cities) {
    const rawName = (c.name && c.name.trim()) ? c.name.trim() : `City ${c.id ?? ''}`.trim();
    if (onlyNamed && isDefaultCityName(rawName)) continue;

    const world = coordForCity(c);
    const allianceName = getAllianceName(getEntityAllianceId(c));
    const teamIdx = cityTeams[c.id];
    const teamName = (teamIdx !== undefined && customTeams[teamIdx]?.name)
      ? customTeams[teamIdx].name
      : '';

    rows.push([
      csvEscape(rawName),
      world.x,
      world.y,
      csvEscape(allianceName),
      csvEscape(teamName)
    ].join(','));
  }

  const csv = rows.join('\n');
  const BOM = '\uFEFF'; // UTF-8 BOM
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
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
(function () {
    let touchMode = null; // 'pan' | 'pinch' | null
    let t0 = null;
    let t1 = null;
    let startPanX = 0;
    let startPanY = 0;
    let startZoom = 1;
    let startDist = 0;
    let startCenterX = 0;
    let startCenterY = 0;
    let longPressTimer = null;
    const LONG_PRESS_MS = 450;
    const SELECT_TWO_FINGER_PAN_THRESHOLD = 0.2;

    function getTouches(e) {
        const rect = canvas.getBoundingClientRect();
        return Array.from(e.touches).map(t => ({
            x: t.clientX - rect.left,
            y: t.clientY - rect.top
        }));
    }

    function dist(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.hypot(dx, dy);
    }

    function mid(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function clearLongPress() {
        if (!longPressTimer) return;
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    function resetTouchState() {
        clearLongPress();
        touchMode = null;
        t0 = null;
        t1 = null;
    }

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touches = getTouches(e);

        if (touches.length === 1) {
            t0 = touches[0];
            touchMode = 'pan';
            startPanX = panX;
            startPanY = panY;
            hasDragMovement = false;
            dragSelectionStart = [];

            // Long-press deletes current selection on mobile.
            clearLongPress();
            longPressTimer = setTimeout(() => {
                if (getSelectedEntities().length) {
                    deleteSelectedEntity();
                }
            }, LONG_PRESS_MS);

            if (selectedType === 'select') {
                const gridPos = screenToDiamond(t0.x, t0.y);
                const touchedEntity = getEntityAtGrid(gridPos.x, gridPos.y);

                if (touchedEntity) {
                    const selectedNow = getSelectedEntities();
                    if (!selectedEntities.has(touchedEntity) || selectedNow.length <= 1) {
                        setSelection([touchedEntity], { primaryEntity: touchedEntity, pulse: false });
                    } else {
                        selectedEntity = touchedEntity;
                        stopSelectionPulse();
                    }

                    const movableSelection = getSelectedEntities().filter(entity => !entity.locked);
                    if (movableSelection.length && movableSelection.includes(touchedEntity)) {
                        isDragging = true;
                        dragOffsetX = gridPos.x;
                        dragOffsetY = gridPos.y;
                        dragSelectionStart = movableSelection.map(entity => ({
                            entity,
                            x: entity.x,
                            y: entity.y
                        }));
                    }
                } else {
                    clearSelection();
                    isDragging = false;
                    dragSelectionStart = [];
                }
                redraw();
            }
            return;
        }

        if (touches.length >= 2) {
            t0 = touches[0];
            t1 = touches[1];
            touchMode = 'pinch';
            startZoom = zoom;
            startDist = dist(t0, t1);
            const startCenter = mid(t0, t1);
            startCenterX = startCenter.x;
            startCenterY = startCenter.y;
            startPanX = panX;
            startPanY = panY;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touches = getTouches(e);

        if (touchMode === 'pan' && touches.length === 1 && t0) {
            clearLongPress();
            const cur = touches[0];

            if (isDragging && dragSelectionStart.length) {
                const gridPos = screenToDiamond(cur.x, cur.y);
                const deltaX = gridPos.x - dragOffsetX;
                const deltaY = gridPos.y - dragOffsetY;

                if (tryApplyDraggedSelectionDelta(deltaX, deltaY)) {
                    hasDragMovement = true;
                    redraw();
                    markUnsavedChanges();
                }
            } else if (selectedType === 'move') {
                panX = startPanX + (cur.x - t0.x);
                panY = startPanY + (cur.y - t0.y);
                redraw();
            } else if (isPlacementTool(selectedType)) {
                updateGhostPreview(cur.x, cur.y);
                redraw();
            }
            return;
        }

        if (touchMode === 'pinch' && touches.length >= 2) {
            const a = touches[0];
            const b = touches[1];
            const center = mid(a, b);
            const currDist = dist(a, b);
            const factor = currDist / (startDist || 1);
            const pinchDelta = Math.abs(factor - 1);

            // In Pan mode, a two-finger gesture always translates the map.
            if (selectedType === 'move') {
                panX = startPanX + (center.x - startCenterX);
                panY = startPanY + (center.y - startCenterY);
                redraw();
                return;
            }

            // In Select and placement modes, a two-finger swipe (without pinch) pans the map.
            // Pinch is still available if the distance change is large enough.
            if ((selectedType === 'select' || isPlacementTool(selectedType)) && pinchDelta < SELECT_TWO_FINGER_PAN_THRESHOLD) {
                panX = startPanX + (center.x - startCenterX);
                panY = startPanY + (center.y - startCenterY);
                redraw();
                return;
            }

            const newZoom = Math.max(0.1, Math.min(3, startZoom * factor));

            // Zoom around the pinch midpoint.
            const dx = center.x - panX;
            const dy = center.y - panY;
            panX = center.x - dx * (newZoom / zoom);
            panY = center.y - dy * (newZoom / zoom);
            zoom = newZoom;
            gridSize = baseGridSize * zoom;
            redraw();
            updateZoomDisplay();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touches = getTouches(e);
        const didEntityDrag = isDragging && hasDragMovement;

        if (isDragging) {
            isDragging = false;
            dragSelectionStart = [];
            if (hasDragMovement) {
                pushHistory();
            }
            hasDragMovement = false;
        }

        if (touchMode === 'pan' && (!touches || touches.length === 0) && t0) {
            // Treat as tap if movement was very small.
            const dx = e.changedTouches[0].clientX - (canvas.getBoundingClientRect().left + t0.x);
            const dy = e.changedTouches[0].clientY - (canvas.getBoundingClientRect().top + t0.y);
            const moved = Math.hypot(dx, dy);
            if (moved < 8 && !didEntityDrag) {
                const rect = canvas.getBoundingClientRect();
                const x = e.changedTouches[0].clientX - rect.left;
                const y = e.changedTouches[0].clientY - rect.top;
                handleCanvasClick(x, y, { fromTouch: true });
            }
        }

        resetTouchState();
    }, { passive: false });

    canvas.addEventListener('touchcancel', () => {
        resetTouchState();
    }, { passive: true });

    // Centralized handler for canvas tap/click logic (used by touch).
    function handleCanvasClick(x, y, opts = {}) {
        const rect = canvas.getBoundingClientRect();
        const event = { clientX: x + rect.left, clientY: y + rect.top };

        if (selectedType === 'select') {
            selectEntity(event);
        } else if (selectedType === 'delete') {
            eraseEntityAtEvent(event);
        } else {
            addEntity(event);
        }

        if (opts.fromTouch) {
            ghostPreview = null;
            redraw();
        }
    }

    // Prevent page bounce/scroll while interacting with canvas.
    document.addEventListener('touchmove', (e) => {
        if (e.target === canvas) e.preventDefault();
    }, { passive: false });
})();

// Fallback guard to prevent browser double-tap zoom on non-interactive surfaces.
(function () {
    let lastTouchEndTs = 0;
    const DOUBLE_TAP_GUARD_MS = 320;

    function shouldBypassDoubleTapGuard(target) {
        if (!(target instanceof Element)) return false;
        if (isTextInputTarget(target)) return true;
        return Boolean(target.closest('button, a, label, summary, [role="button"], [role="tab"], [data-allow-double-tap]'));
    }

    document.addEventListener('touchend', (e) => {
        if (e.touches.length > 0 || e.changedTouches.length !== 1) return;
        if (shouldBypassDoubleTapGuard(e.target)) {
            lastTouchEndTs = 0;
            return;
        }

        const now = Date.now();
        if (now - lastTouchEndTs < DOUBLE_TAP_GUARD_MS) {
            e.preventDefault();
        }
        lastTouchEndTs = now;
    }, { passive: false });
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


// ===== HISTORY (UNDO/REDO) =====
// Snapshot-based history 
const HISTORY_LIMIT = 200;
let history = [];
let historyIndex = -1; // points to current state in history
// Snapshot of the last saved state (stringified snapshot); used to determine "unsaved" status
let lastSavedSnapshot = null;

function snapshotState() {
    // create a deep copy of entities
    // Prefer structuredClone when available (handles more types and is faster)
    const entitiesCopy = (typeof structuredClone === 'function')
        ? structuredClone(entities)
        : entities.map(e => JSON.parse(JSON.stringify(e)));
    return JSON.stringify({ entities: entitiesCopy, cityCounterId });
}

function applySnapshot(snapshot) {
    try {
        const state = JSON.parse(snapshot);
        // Replace entities array contents
        entities.length = 0;
        state.entities.forEach(e => entities.push(e));
        // Reconstruct derived arrays
        bearTraps = entities.filter(e => e.type === 'building');
        cityCounterId = state.cityCounterId || 1;
        clearSelection();
        redraw();
        updateCounters();
        updateCityList();
        // Update unsaved-state: compare current state to last saved snapshot when available
        try {
            const currentSnapshot = snapshotState();
            if (lastSavedSnapshot === null) {
                // If we don't have a saved snapshot, don't modify existing hasUnsavedChanges
            } else {
                hasUnsavedChanges = (currentSnapshot !== lastSavedSnapshot);
                updatePageTitle();
            }
        } catch (err) {
            // If snapshotting fails, leave hasUnsavedChanges unchanged but log for debugging
            console.error('Error comparing snapshots in applySnapshot:', err);
        }
    } catch (err) {
        console.error('Failed to apply snapshot:', err);
    }
}

// Wire up Undo/Redo buttons and create an initial history snapshot once DOM is ready.
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('undoButton')?.addEventListener('click', () => undo());
    document.getElementById('redoButton')?.addEventListener('click', () => redo());
    updateUndoRedoButtons();
    // Push initial snapshot (reflects any pre-loaded map)
    try { pushHistory(); } catch (e) { console.error('Failed to create initial history snapshot:', e); }
});

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoButton');
    const redoBtn = document.getElementById('redoButton');
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1 || history.length === 0;
}

function pushHistory() {
    try {
        const snap = snapshotState();
        // If we've undone some steps and then make a new change, drop forward history
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        history.push(snap);
        if (history.length > HISTORY_LIMIT) {
            history.shift();
        }
        historyIndex = history.length - 1;
        updateUndoRedoButtons();
    } catch (err) {
        console.error('pushHistory error', err);
    }
}

function undo() {
    flushPendingEraseHistory();
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    applySnapshot(history[historyIndex]);
    updateUndoRedoButtons();
}

function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    applySnapshot(history[historyIndex]);
    updateUndoRedoButtons();
}

// ===== APPLICATION INITIALIZATION =====
// Initialize the application
resizeCanvas();
redraw();
