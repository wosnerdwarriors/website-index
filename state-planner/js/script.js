'use strict';

// ===== DOM =====
const canvas = document.getElementById('stateCanvas');
const ctx    = canvas.getContext('2d');

// ===== CONSTANTS =====
const BASE_GRID_SIZE = 30;
// Full 1200×1200 world: grid coords run ±600 from the anchor
const GRID_COLS = 600;
const GRID_ROWS = 600;

const FLAG_RADIUS = 3;
const HQ_RADIUS   = 6;
const HISTORY_LIMIT = 100;

// Anchor is always the world centre (600, 600).
// grid_x = ANCHOR_Y - worldY,  grid_y = ANCHOR_X - worldX
const ANCHOR_X = 600;
const ANCHOR_Y = 600;

const WORLDMAP_URL = 'https://raw.githubusercontent.com/wosnerdwarriors/wos-data/refs/heads/main/data/worldmap/worldmap.json';

// ─── Offscreen worldmap canvas ───────────────────────────────────────────────
// We pre-render the 1200×1200 world into a 1201×1201 pixel canvas at gs=1
// and then blit it with context.drawImage each frame: one draw call instead
// of up to 1.44 M per-cell operations.
//
// Mapping:  ox = round((wx - wy + 1200) / 2)
//           oy = round((2399 - wx - wy) / 2)
// Screen :  destX = panX - 600*gs,  destW/H = 1201*gs
const OFC_SIZE = 1201;  // 1201×1201 pixels
const OFC_CX   = 600;   // column offset  (= ANCHOR_Y)
const OFC_CY   = 599;   // row    offset
let   worldmapOffscreen = null;

// RGBA tuples for each worldmap key (alpha pre-multiplied would be nicer, but
// plain RGBA is simpler here; key 0 = transparent / not painted).
const WM_RGBA = [
    null,
    [120,120,130,140], // 1 mountain
    [ 60,130,200,140], // 2 lake
    [210,150, 50,140], // 3 building
    [180, 60,180,153], // 4 castle
    [160, 50, 50,140], // 5 fortress / stronghold
    [ 50,170,150,140], // 6 facility
];
// ─────────────────────────────────────────────────────────────────────────────

// World-target style table
const TARGET_STYLES = {
    facility:  { fill:'#064e3b', stroke:'#10B981', label:'FAC'    },
    stronghold:{ fill:'#7c2d12', stroke:'#fb923c', label:'SH'     },
    castle:    { fill:'#1e3a5f', stroke:'#60a5fa', label:'CASTLE' },
};
// No size threshold – the single largest key=5 component = castle, all others = stronghold.
const MIN_COMPONENT_CELLS = 4; // ignore noise

const TYPE_CODES      = ['hq', 'flag'];
const ALLIANCE_SCOPED = new Set(['hq', 'flag']);
const TARGET_TYPES    = new Set(['facility', 'stronghold', 'castle']);

const ENTITY_DEFS = {
    hq:   { width:3, height:3 },
    flag: { width:1, height:1 },
};

const ALLIANCE_PALETTE = [
    '#071cda','#EF4444','#10B981','#F59E0B',
    '#8B5CF6','#EC4899','#14B8A6','#F97316',
    '#6366F1','#84CC16',
];

// ===== STATE =====
let zoom = 1;
let panX = 0, panY = 0;
let canvasWidth = 0, canvasHeight = 0;

let entities     = [];   // user-placed: HQ + Flag
let worldTargets = [];   // auto-loaded from worldmap
let alliances    = [{ name:'Alliance 1', color:'#1D4ED8' }];
let activeAllianceIndex = 0;
let selectedType = 'flag';
let mapName      = '';

// Interaction
let isPanning = false;
let panStartX = 0, panStartY = 0, panStartPanX = 0, panStartPanY = 0;
let ghostPreview = null;
let ghostBlocked = false; // true when ghost hovers over impassable terrain

// Select / drag
let selectedEntities   = new Set();  // currently selected user entities
let isDragging         = false;
let dragOffsetX        = 0, dragOffsetY    = 0;  // mouse grid pos at drag start
let dragSelectionStart = [];                      // [{ entity, origX, origY }]
let hasDragMovement    = false;
let isBoxSelecting     = false;
let boxStart           = null;   // screen-px {x,y} when box drag started
let boxCurrent         = null;   // screen-px {x,y} current box corner

// Paint mode
let isPainting    = false;
let paintLastCell = null;   // {x,y} last painted cell to skip duplicates

// Route mode
let routeWaypoints    = [];        // [{x,y}] committed click-waypoints
let routeGhostPos     = null;      // current cursor position for live preview
let routeSegmentCache = new Map(); // key "x0,y0,x1,y1" → flag cell array (A* results)

// Undo/redo
let history = [];
let historyIndex = -1;

// Worldmap raw data
let worldmapData    = null;
let worldmapLoading = false;

// Touch
let lastPinchDist = null;
let touchStartX = 0, touchStartY = 0;

// ─── Connectivity + Territory cache (first-placed-wins) ──────────────────────
let _connCache    = null;
let _terrCache    = null;
let _claimedCache = null;
// Drag-phase cache: claimed cells of the static backdrop (dragged entities excluded),
// computed once at drag start and reused for every canMoveGroupTo call in the drag.
let _dragClaimedCache = null;

function invalidateConnectivity() { _connCache = null; _terrCache = null; _claimedCache = null; territoryLayerCache.dirty = true; }

// Build a Map<coord, allianceIndex> in entity-insertion order.
// The first alliance whose flag/HQ covers a cell wins it permanently.
function buildGlobalClaimedCells(excludeEntities = null) {
    if (!excludeEntities && _claimedCache) return _claimedCache;
    if (excludeEntities && _dragClaimedCache) return _dragClaimedCache;
    const claimed = new Map();
    for (const e of entities) {
        if (excludeEntities && excludeEntities.has(e)) continue;
        if (e.type !== 'flag' && e.type !== 'hq') continue;
        const idx = e.allianceIndex;
        if (idx === undefined || idx < 0 || idx >= alliances.length) continue;
        const area = new Set();
        markFlagArea(e, area, e.type === 'hq' ? HQ_RADIUS : FLAG_RADIUS);
        area.forEach(coord => { if (!claimed.has(coord)) claimed.set(coord, idx); });
    }
    if (!excludeEntities) _claimedCache = claimed;
    return claimed;
}

function getConnectivity() {
    if (!_connCache) _connCache = alliances.map((_, i) => computeConnectivity(i));
    return _connCache;
}

// Per-alliance territory Sets derived from the claimed-cells map.
// Used for placement blocking (isForeignTerritory).
function getAllTerritories(excludeEntities = null) {
    if (!excludeEntities && _terrCache) return _terrCache;
    const claimed = buildGlobalClaimedCells(excludeEntities);
    const terrs = alliances.map(() => new Set());
    for (const [coord, idx] of claimed) {
        if (idx >= 0 && idx < terrs.length) terrs[idx].add(coord);
    }
    if (!excludeEntities) _terrCache = terrs;
    return terrs;
}

// Returns true if the given footprint overlaps with territory owned by a DIFFERENT alliance.
function isForeignTerritory(gx, gy, width, height, ownAllianceIndex, excludeEntities = null) {
    const claimed = buildGlobalClaimedCells(excludeEntities);
    for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
            const owner = claimed.get(packCoord(gx+dx, gy+dy));
            if (owner !== undefined && owner !== ownAllianceIndex) return true;
        }
    }
    return false;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── requestAnimationFrame batching ──────────────────────────────────────────
// Ensures at most one redraw per display frame regardless of how many
// mousemove / wheel events fire in that interval.
let _rafPending = false;
function scheduleRedraw() {
    if (_rafPending) return;
    _rafPending = true;
    requestAnimationFrame(() => { _rafPending = false; redraw(); });
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Viewport-cached render layers ───────────────────────────────────────────
// Grid lines, terrain obstacles and territory overlays are expensive to redraw
// per-cell every frame (hundreds of thousands of path ops when zoomed out with
// many objects on the map). Each is instead pre-rendered once into an offscreen
// canvas sized to cover the viewport plus a margin. Panning then only needs a
// translated drawImage(); small zoom changes are absorbed by scaling the same
// raster. A full re-render only happens when the raster would need to scale
// beyond [0.5x, 2x] (visibly blurry), the pan has moved outside the buffered
// margin, the window was resized, or the layer was explicitly marked dirty
// (worldmap loaded / entities changed).
const LAYER_MARGIN    = 1.5;  // buffer size = viewport size * this, centred on pan
const LAYER_SCALE_MIN = 0.5;
const LAYER_SCALE_MAX = 2.0;
// Flushing every PATH_CHUNK_SIZE subpaths keeps each individual fill/stroke call cheap.
const PATH_CHUNK_SIZE = 4000;

function createLayerCache() { return { canvas:null, ctx:null, gs:0, refPX:0, refPY:0, w:0, h:0, dirty:true }; }

// renderFn(context, pX, pY, z, viewW, viewH) must draw the layer using viewW/viewH
// (not the canvasWidth/canvasHeight globals) for its own viewport culling, since
// during a rebuild it draws into a buffer larger than the live canvas.
function blitLayer(cache, renderFn, context, pX, pY, z) {
    const gs = BASE_GRID_SIZE * z;
    const w = Math.ceil(canvasWidth  * LAYER_MARGIN);
    const h = Math.ceil(canvasHeight * LAYER_MARGIN);

    let scale = (cache.canvas && cache.gs) ? gs / cache.gs : 0;
    let fits = false;
    if (cache.canvas && !cache.dirty && cache.w === w && cache.h === h &&
            scale >= LAYER_SCALE_MIN && scale <= LAYER_SCALE_MAX) {
        const destX = pX - scale * cache.refPX, destY = pY - scale * cache.refPY;
        const destW = scale * cache.w,          destH = scale * cache.h;
        fits = destX <= 0 && destY <= 0 && destX + destW >= canvasWidth && destY + destH >= canvasHeight;
    }

    if (!fits) {
        if (!cache.canvas) {
            cache.canvas = document.createElement('canvas');
            cache.ctx = cache.canvas.getContext('2d');
        }
        if (cache.w !== w || cache.h !== h) {
            cache.canvas.width = w; cache.canvas.height = h;
            cache.w = w; cache.h = h;
        } else {
            cache.ctx.clearRect(0, 0, w, h);
        }
        const marginX = (w - canvasWidth) / 2, marginY = (h - canvasHeight) / 2;
        cache.refPX = pX + marginX;
        cache.refPY = pY + marginY;
        cache.gs    = gs;
        cache.dirty = false;
        renderFn(cache.ctx, cache.refPX, cache.refPY, z, w, h);
        scale = 1;
    }

    context.drawImage(cache.canvas,
        pX - scale * cache.refPX, pY - scale * cache.refPY,
        scale * cache.w,          scale * cache.h);
}

const gridLayerCache      = createLayerCache();
const obstacleLayerCache  = createLayerCache();
const territoryLayerCache = createLayerCache();
// ─────────────────────────────────────────────────────────────────────────────

// ===== UTILITY =====
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function clamp1200(v)      { return clamp(Math.round(v), 0, 1199); }

function hexToRgba(hex, a) {
    const h = hex.replace('#','');
    return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;
}

function getFflate() { return typeof fflate !== 'undefined' ? fflate : null; }

function base64UrlEncode(bytes) {
    let s = ''; for (let i=0;i<bytes.length;i++) s+=String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function base64UrlDecode(str) {
    const b64 = str.replace(/-/g,'+').replace(/_/g,'/');
    const pad = b64.length%4 ? b64+'===='.slice(b64.length%4) : b64;
    const bin = atob(pad);
    const out = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
    return out;
}

// ===== CANVAS SETUP =====
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvasWidth  = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width  = Math.round(canvasWidth  * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    canvas.style.width  = canvasWidth  + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
}

function calcFitZoom() {
    // The full-state diamond spans 1200 * BASE_GRID_SIZE * z in screen pixels.
    return Math.min(canvasWidth, canvasHeight) * 0.85 / (1200 * BASE_GRID_SIZE);
}

function redraw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawBackground(ctx);
    blitLayer(gridLayerCache, drawGridLines, ctx, panX, panY, zoom);
    drawWorldmapOffscreenLayer(ctx, panX, panY, zoom);
    blitLayer(obstacleLayerCache, drawObstacleOverlay, ctx, panX, panY, zoom); // per-cell obstacle layer, visible when zoomed in
    blitLayer(territoryLayerCache, drawTerritoryLayer, ctx, panX, panY, zoom);
    drawEntitiesLayer(ctx, panX, panY, zoom);
}

// ===== COORDINATE CONVERSION =====
function screenToDiamond(sx, sy) {
    const gs = BASE_GRID_SIZE * zoom;
    const ox = sx - panX, oy = sy - panY;
    return { x:Math.floor((ox+oy)/gs), y:Math.floor((oy-ox)/gs) };
}

function diamondToScreen(gx, gy, pX, pY, z) {
    const gs = BASE_GRID_SIZE * z;
    return {
        x: (gx + 0.5 - gy - 0.5) * gs * 0.5 + pX,
        y: (gx + 0.5 + gy + 0.5) * gs * 0.5 + pY,
    };
}

function diamondToScreenCorner(gx, gy, pX, pY, z) {
    const gs = BASE_GRID_SIZE * z;
    return { x:(gx-gy)*gs*0.5+pX, y:(gx+gy)*gs*0.5+pY };
}

// World coordinate (0-1199) for entity reference corner
function coordForEntity(entity) {
    const tipX = entity.x + entity.width  - 1;
    const tipY = entity.y + entity.height - 1;
    return { x: clamp1200(ANCHOR_X - tipY), y: clamp1200(ANCHOR_Y - tipX) };
}

// World bounding box → grid entity (hardcoded anchor 600/600)
// refSc/refHs are computed here (not in a later pass) because worldTargets is
// populated incrementally by an async/chunked extraction (extractTargetsFromWorldmap
// yields via setTimeout every 100 rows) — a redraw() triggered mid-extraction (e.g.
// the user zooming while the map is still loading) would otherwise hit a target
// whose refSc hasn't been set yet and crash in drawEntitiesLayer.
function worldBboxToEntity(type, minWX, minWY, maxWX, maxWY) {
    const gridW = maxWY - minWY + 1;   // world-Y span → grid width
    const gridH = maxWX - minWX + 1;   // world-X span → grid height
    const e = {
        type,
        x: ANCHOR_Y - maxWY,   // = ANCHOR_Y - minWY - (gridW-1)
        y: ANCHOR_X - maxWX,   // = ANCHOR_X - minWX - (gridH-1)
        width:  gridW,
        height: gridH,
        fromWorldmap: true,
        worldMinX: minWX, worldMinY: minWY,
    };
    e.refSc = entityCenter(e, 0, 0, 1);
    e.refHs = (e.width + e.height) / 2 * BASE_GRID_SIZE * 0.45;
    return e;
}

// ===== GRID RENDERING =====
// Layer 0 – background gradient. One fillRect; drawn fresh every frame directly onto the visible canvas, never cached.
function drawBackground(context) {
    const g = context.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    g.addColorStop(0, '#667eea'); g.addColorStop(1, '#764ba2');
    context.fillStyle = g; context.fillRect(0, 0, canvasWidth, canvasHeight);
}

function drawGridLines(context, pX, pY, z, viewW = canvasWidth, viewH = canvasHeight) {
    const gs = BASE_GRID_SIZE * z;
    if (gs < 6) return; // lines invisible below this scale – skip entirely

    // At low zoom a full 1-cell grid needs hundreds of thousands of segments;
    // thin it out (draw every Nth line) to keep on-screen line density roughly
    // constant instead of scaling with the number of visible cells.
    const stride = gs < 16 ? Math.ceil(16 / gs) : 1;

    // Viewport-culled iteration (same math as worldmap layer)
    const hs = gs * 0.5;
    const dMin = Math.floor(2*(-hs-pX)/gs),   dMax = Math.ceil(2*(viewW+hs-pX)/gs);
    const sMin = Math.floor(2*(-hs-pY)/gs)-1, sMax = Math.ceil(2*(viewH+hs-pY)/gs)-1;
    const x0 = Math.max(Math.floor((sMin+dMin)/2), -GRID_COLS);
    const x1 = Math.min(Math.ceil( (sMax+dMax)/2),  GRID_COLS);
    const y0 = Math.max(Math.floor((sMin-dMax)/2), -GRID_ROWS);
    const y1 = Math.min(Math.ceil( (sMax-dMin)/2),  GRID_ROWS);

    context.save();
    context.strokeStyle = 'rgba(255,255,255,0.3)';
    context.lineWidth = 1;
    // Batch grid lines into a path per PATH_CHUNK_SIZE cells → few stroke()
    // calls instead of 2*N (see PATH_CHUNK_SIZE comment for why chunked).
    context.beginPath();
    let n = 0;
    for (let x = Math.floor(x0/stride)*stride; x <= x1; x += stride) {
        const yl = Math.max(y0, sMin-x, x-dMax);
        const yh = Math.min(y1, sMax-x, x-dMin);
        for (let y = Math.floor(yl/stride)*stride; y <= yh; y += stride) {
            if (n > 0 && n % PATH_CHUNK_SIZE === 0) { context.stroke(); context.beginPath(); }
            const s  = diamondToScreenCorner(x,        y,        pX, pY, z);
            const s2 = diamondToScreenCorner(x+stride, y,        pX, pY, z);
            const s3 = diamondToScreenCorner(x,        y+stride, pX, pY, z);
            context.moveTo(s.x, s.y); context.lineTo(s2.x, s2.y);
            context.moveTo(s.x, s.y); context.lineTo(s3.x, s3.y);
            n++;
        }
    }
    context.stroke();
    context.restore();
}

// ===== WORLDMAP – OFFSCREEN CANVAS =====
// Build once after data loads; blit each frame with a single drawImage call.
function buildWorldmapOffscreen() {
    const ofc = document.createElement('canvas');
    ofc.width = ofc.height = OFC_SIZE;
    const octx = ofc.getContext('2d');
    const img  = octx.createImageData(OFC_SIZE, OFC_SIZE);
    const d    = img.data;

    for (let wy = 0; wy < 1200; wy++) {
        for (let wx = 0; wx < 1200; wx++) {
            const key = worldmapData[wy * 1200 + wx];
            if (!key || key > 6) continue;
            const rgba = WM_RGBA[key]; if (!rgba) continue;

            // Isometric pixel position inside the offscreen canvas
            const ox = Math.round((wx - wy + 1200) / 2);          // range [1, 1200]
            const oy = Math.round((2399 - wx - wy) / 2);           // range [1, 1200]
            if (ox < 0 || ox >= OFC_SIZE || oy < 0 || oy >= OFC_SIZE) continue;

            const i = (oy * OFC_SIZE + ox) * 4;
            d[i] = rgba[0]; d[i+1] = rgba[1]; d[i+2] = rgba[2]; d[i+3] = rgba[3];
        }
    }
    octx.putImageData(img, 0, 0);
    return ofc;
}

// Single drawImage call per frame – only used when cells are sub-pixel (gs < 2).
// Above that threshold the per-cell obstacle overlay takes over with correct geometry.
function drawWorldmapOffscreenLayer(context, pX, pY, z) {
    if (!worldmapOffscreen) return;
    const gs = BASE_GRID_SIZE * z;
    if (gs >= 2) return; // per-cell overlay handles terrain at this scale; avoid pixel-centre misalignment
    context.imageSmoothingEnabled = false;
    context.drawImage(
        worldmapOffscreen,
        pX - OFC_CX * gs,
        pY - OFC_CY * gs,
        OFC_SIZE * gs,
        OFC_SIZE * gs
    );
    context.imageSmoothingEnabled = true;
}

// ===== WORLDMAP LOAD + TARGET EXTRACTION =====
async function loadWorldmap() {
    if (worldmapData || worldmapLoading) return;
    worldmapLoading = true;
    setStatus('Loading worldmap…');
    try {
        const resp = await fetch(WORLDMAP_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const entries = await resp.json();
        worldmapData = new Uint8Array(1200 * 1200);
        for (const { x, y, key } of entries) {
            if (x >= 0 && x < 1200 && y >= 0 && y < 1200) worldmapData[y*1200+x] = key;
        }

        setStatus('Building offscreen canvas…');
        // Build offscreen canvas synchronously (< 50 ms typical)
        worldmapOffscreen = buildWorldmapOffscreen();
        obstacleLayerCache.dirty = true;
        redraw(); // show the map before target extraction

        setStatus('Extracting targets…');
        await extractTargetsFromWorldmap();
        invalidateConnectivity();
        setStatus(``);
        updateUI();
    } catch (e) {
        console.warn('[Worldmap]', e);
        setStatus('Failed to load worldmap');
    } finally {
        worldmapLoading = false;
    }
}

function setStatus(msg) {
    const el = document.getElementById('worldmapStatus'); if (el) el.textContent = msg;
}

// Connected-component extraction for key=5 (castle/stronghold) and key=6 (facility).
// Strategy for key=5: collect ALL components first, then label the single largest one
// "castle" and every other one "stronghold". No arbitrary size threshold.
async function extractTargetsFromWorldmap() {
    if (!worldmapData) return;
    worldTargets = [];
    const visited  = new Uint8Array(1200 * 1200);
    const key5comps = []; // { minX, minY, maxX, maxY, cellCount }

    for (let wy = 0; wy < 1200; wy++) {
        for (let wx = 0; wx < 1200; wx++) {
            const startIdx = wy * 1200 + wx;
            const key = worldmapData[startIdx];
            if ((key !== 5 && key !== 6) || visited[startIdx]) continue;

            // BFS (flat 1-D queue for speed)
            const queue = [startIdx];
            visited[startIdx] = 1;
            let minX = wx, maxX = wx, minY = wy, maxY = wy;
            let qi = 0, cellCount = 0;

            while (qi < queue.length) {
                const cur = queue[qi++];
                cellCount++;
                const cx = cur % 1200, cy = (cur / 1200) | 0;
                const neighbours = [
                    cx > 0    ? cur - 1    : -1,
                    cx < 1199 ? cur + 1    : -1,
                    cy > 0    ? cur - 1200 : -1,
                    cy < 1199 ? cur + 1200 : -1,
                ];
                for (const n of neighbours) {
                    if (n < 0 || visited[n] || worldmapData[n] !== key) continue;
                    visited[n] = 1;
                    queue.push(n);
                    const nx = n % 1200, ny = (n / 1200) | 0;
                    if (nx < minX) minX = nx; if (nx > maxX) maxX = nx;
                    if (ny < minY) minY = ny; if (ny > maxY) maxY = ny;
                }
            }

            if (cellCount < MIN_COMPONENT_CELLS) continue;

            if (key === 6) {
                worldTargets.push(worldBboxToEntity('facility', minX, minY, maxX, maxY));
            } else {
                key5comps.push({ minX, minY, maxX, maxY, cellCount });
            }
        }
        if (wy % 100 === 99) await new Promise(r => setTimeout(r, 0)); // yield
    }

    // Largest key=5 component = castle; all others = stronghold
    if (key5comps.length > 0) {
        key5comps.sort((a, b) => b.cellCount - a.cellCount);
        key5comps.forEach((c, i) => {
            worldTargets.push(worldBboxToEntity(
                i === 0 ? 'castle' : 'stronghold',
                c.minX, c.minY, c.maxX, c.maxY
            ));
        });
    }
}

// ===== TERRAIN / OBSTACLE HELPERS =====
// Returns true for any worldmap cell that blocks placement.
// Same rule as layout-planner: block keys 1-4, allow 5 (fortress) + 6 (facility).
function isTerrainAt(gx, gy) {
    if (!worldmapData) return false;
    const wx = ANCHOR_X - gy;
    const wy = ANCHOR_Y - gx;
    if (wx < 0 || wx >= 1200 || wy < 0 || wy >= 1200) return false;
    const key = worldmapData[wy * 1200 + wx];
    return key !== 0; // block all terrain including fortress/facility
}

// Check every cell of the proposed footprint.
function isTerrainBlocked(gx, gy, width, height) {
    for (let dx = 0; dx < width;  dx++)
        for (let dy = 0; dy < height; dy++)
            if (isTerrainAt(gx + dx, gy + dy)) return true;
    return false;
}

// Per-cell obstacle overlay – drawn when gs >= 3 so individual cells are visible.
// Uses the same viewport-culling math as drawWorldmapLayer.
// Batches cells per key type into one fill() call – same pattern as world-target drawing.
const OBSTACLE_COLORS = {
    1: 'rgba(80,  80,  90,  0.70)', // mountain  – dark grey
    2: 'rgba(30, 100, 170,  0.70)', // lake      – dark blue
    3: 'rgba(160, 110,  30,  0.60)', // building  – amber
    4: 'rgba(130,  35, 130,  0.60)', // castle    – purple
    5: 'rgba(160,  50,  50,  0.60)', // stronghold/fortress – red
    6: 'rgba( 50, 170, 150,  0.60)', // facility  – teal
};

function drawObstacleOverlay(context, pX, pY, z, viewW = canvasWidth, viewH = canvasHeight) {
    if (!worldmapData) return;
    const gs = BASE_GRID_SIZE * z;
    if (gs < 2) return; // too small – the offscreen worldmap texture covers sub-pixel range

    const hs = gs * 0.45;
    const S  = gs;

    // Diagonal-constraint viewport culling (identical to drawWorldmapLayer)
    const dMin = Math.floor(2 * (-hs - pX) / S);
    const dMax = Math.ceil( 2 * (viewW  + hs - pX) / S);
    const sMin = Math.floor(2 * (-hs - pY) / S) - 1;
    const sMax = Math.ceil( 2 * (viewH + hs - pY) / S) - 1;

    const minGX = Math.max(Math.floor((sMin + dMin) / 2), ANCHOR_Y - 1199, -GRID_COLS);
    const maxGX = Math.min(Math.ceil( (sMax + dMax) / 2), ANCHOR_Y,          GRID_COLS);
    const minGY = Math.max(Math.floor((sMin - dMax) / 2), ANCHOR_X - 1199, -GRID_ROWS);
    const maxGY = Math.min(Math.ceil( (sMax - dMin) / 2), ANCHOR_X,          GRID_ROWS);
    if (minGX > maxGX || minGY > maxGY) return;

    // Collect visible obstacle cells grouped by key
    const byKey = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (let gx = minGX; gx <= maxGX; gx++) {
        const gyMin = Math.max(minGY, sMin - gx, gx - dMax);
        const gyMax = Math.min(maxGY, sMax - gx, gx - dMin);
        for (let gy = gyMin; gy <= gyMax; gy++) {
            const wx = ANCHOR_X - gy;
            const wy = ANCHOR_Y - gx;
            if (wx < 0 || wx >= 1200 || wy < 0 || wy >= 1200) continue;
            const key = worldmapData[wy * 1200 + wx];
            if (!key) continue;
            if (byKey[key]) byKey[key].push(gx, gy); // pack as flat pairs
        }
    }

    // Batch draw per key type, chunked every PATH_CHUNK_SIZE cells (few fill()
    // calls each → minimal GPU state changes while keeping each path small).
    context.save();
    for (const [key, pairs] of Object.entries(byKey)) {
        if (!pairs.length) continue;
        context.fillStyle = OBSTACLE_COLORS[key];
        context.beginPath();
        for (let i = 0, n = 0; i < pairs.length; i += 2, n++) {
            if (n > 0 && n % PATH_CHUNK_SIZE === 0) { context.fill(); context.beginPath(); }
            const s = diamondToScreen(pairs[i], pairs[i + 1], pX, pY, z);
            context.moveTo(s.x, s.y - hs); context.lineTo(s.x + hs, s.y);
            context.lineTo(s.x, s.y + hs); context.lineTo(s.x - hs, s.y);
            context.closePath();
        }
        context.fill();
    }
    context.restore();
}

// Numeric packing for grid coordinates (replaces "x,y" string keys). Territory
// sets are rebuilt rarely but read every frame in the render path, so avoiding
// the per-cell string alloc + split + parseInt there matters.
function packCoord(x, y) { return (x + 2000) * 5000 + (y + 2000); }
function unpackCoord(key) { const yy = key % 5000; return { x: (key - yy) / 5000 - 2000, y: yy - 2000 }; }

// ===== FLAG AREA MECHANICS (from layout-planner) =====
function markFlagArea(entity, areas, radius) {
    let cx, cy;
    if (entity.width === 1 && entity.height === 1) { cx=entity.x; cy=entity.y; }
    else { cx=entity.x+Math.floor(entity.width/2); cy=entity.y+Math.floor(entity.height/2); }
    const r = entity.type==='hq' ? radius+Math.floor(entity.width/2) : radius;
    for (let x=cx-r; x<=cx+r; x++) for (let y=cy-r; y<=cy+r; y++) areas.add(packCoord(x, y));
}

// ===== CHAIN CONNECTIVITY =====
function computeConnectivity(allianceIdx) {
    const claimed = buildGlobalClaimedCells(); // cached; first-placed-wins
    const hqs   = entities.filter(e => e.type==='hq'   && e.allianceIndex===allianceIdx);
    const flags  = entities.filter(e => e.type==='flag' && e.allianceIndex===allianceIdx);

    // Build territory: HQ coverage – only cells that belong to this alliance
    const territory = new Set();
    hqs.forEach(hq => {
        const area = new Set();
        markFlagArea(hq, area, HQ_RADIUS);
        area.forEach(coord => { if (claimed.get(coord) === allianceIdx) territory.add(coord); });
    });

    const connectedFlags = new Set();
    let changed = true;
    while (changed) {
        changed = false;
        for (const flag of flags) {
            if (connectedFlags.has(flag)) continue;
            // Use FLAG_RADIUS+1 for the touch-check against own territory
            const check = new Set();
            markFlagArea(flag, check, FLAG_RADIUS + 1);
            let overlaps = false;
            for (const c of check) { if (territory.has(c)) { overlaps=true; break; } }
            if (overlaps) {
                connectedFlags.add(flag);
                const cells = new Set();
                markFlagArea(flag, cells, FLAG_RADIUS);
                // Only add cells owned by this alliance (not pre-claimed by another)
                cells.forEach(c => { if (claimed.get(c) === allianceIdx) territory.add(c); });
                changed = true;
            }
        }
    }

    const disconnectedFlags = new Set(flags.filter(f => !connectedFlags.has(f)));
    const disconnTerr = new Set();
    disconnectedFlags.forEach(f => {
        const area = new Set();
        markFlagArea(f, area, FLAG_RADIUS);
        area.forEach(coord => { if (claimed.get(coord) === allianceIdx) disconnTerr.add(coord); });
    });

    // Which world targets are reachable?
    const connectedTargets = new Set();
    for (const t of worldTargets) {
        let hit = false;
        outer: for (let dx=0; dx<t.width; dx++)
            for (let dy=0; dy<t.height; dy++)
                if (territory.has(packCoord(t.x+dx, t.y+dy))) { hit=true; break outer; }
        if (hit) connectedTargets.add(t);
    }

    return { territory, connectedFlags, disconnectedFlags, disconnTerr, connectedTargets };
}

// ===== RENDERING =====
function drawDiamond(context, cx, cy, hs, fill, stroke, lw) {
    context.beginPath();
    context.moveTo(cx,cy-hs); context.lineTo(cx+hs,cy);
    context.lineTo(cx,cy+hs); context.lineTo(cx-hs,cy);
    context.closePath();
    context.fillStyle=fill; context.fill();
    context.strokeStyle=stroke; context.lineWidth=lw; context.stroke();
}

function drawLabel(context, cx, cy, text, size) {
    if (!text || size < 5) return;
    context.font=`bold ${size}px sans-serif`;
    context.textAlign='center'; context.textBaseline='middle';
    context.strokeStyle='rgba(0,0,0,0.65)'; context.lineWidth=2.5;
    context.strokeText(text,cx,cy);
    context.fillStyle='#fff'; context.fillText(text,cx,cy);
}

function entityCenter(e, pX, pY, z) {
    const s1=diamondToScreen(e.x,e.y,pX,pY,z);
    const s2=diamondToScreen(e.x+e.width-1,e.y+e.height-1,pX,pY,z);
    return { x:(s1.x+s2.x)/2, y:(s1.y+s2.y)/2 };
}

// Draw territory cells – all in ONE batched path per color
function drawFlagCells(context, pX, pY, z, cells, color, viewW = canvasWidth, viewH = canvasHeight) {
    const gs = BASE_GRID_SIZE * z;
    if (gs < 2 || cells.size === 0) return;
    const hs = gs * 0.45;
    context.save();
    context.fillStyle = color;
    context.beginPath();
    let n = 0;
    for (const coord of cells) {
        const { x, y } = unpackCoord(coord);
        const s = diamondToScreen(x, y, pX, pY, z);
        if (s.x+hs<0||s.x-hs>viewW||s.y+hs<0||s.y-hs>viewH) continue;
        if (n > 0 && n % PATH_CHUNK_SIZE === 0) { context.fill(); context.beginPath(); }
        context.moveTo(s.x, s.y-hs); context.lineTo(s.x+hs, s.y);
        context.lineTo(s.x, s.y+hs); context.lineTo(s.x-hs, s.y);
        context.closePath();
        n++;
    }
    context.fill();
    context.restore();
}

// Layer 3 – territory overlays (per-alliance claimed/disconnected cells).
// Invalidated only when entities/alliances change (see invalidateConnectivity).
function drawTerritoryLayer(context, pX, pY, z, viewW = canvasWidth, viewH = canvasHeight) {
    const conn = getConnectivity(); // cached
    alliances.forEach((alli, i) => {
        const { territory, disconnTerr } = conn[i];
        drawFlagCells(context, pX, pY, z, territory,   hexToRgba(alli.color, 0.22), viewW, viewH);
        drawFlagCells(context, pX, pY, z, disconnTerr, 'rgba(220,40,40,0.18)',      viewW, viewH);
    });
}

function drawEntitiesLayer(context, pX, pY, z) {
    const gs   = BASE_GRID_SIZE * z;
    const conn = getConnectivity(); // cached

    // 1. World targets – batched per type to minimise GPU state changes.
    //    Pre-computed refSc/refHs means no diamondToScreen calls per frame.
    if (worldTargets.length > 0) {
        // Which targets are connected by the active alliance?
        const connectedSet = conn[activeAllianceIndex]?.connectedTargets ?? new Set();

        const lw_normal = Math.max(1.5, 2 * z);
        const lw_conn   = Math.max(2.5, 3 * z);
        const MIN_HS    = 4; // minimum half-size in pixels

        // Draw base shapes: one fill+stroke call per type per connectivity bucket
        for (const [typeName, style] of Object.entries(TARGET_STYLES)) {
            // --- Disconnected ---
            context.fillStyle   = style.fill;
            context.strokeStyle = style.stroke;
            context.lineWidth   = lw_normal;
            context.beginPath();
            for (const t of worldTargets) {
                if (t.type !== typeName || connectedSet.has(t)) continue;
                const sx = t.refSc.x * z + pX, sy = t.refSc.y * z + pY;
                const hs = Math.max(MIN_HS, t.refHs * z);
                if (sx+hs<0||sx-hs>canvasWidth||sy+hs<0||sy-hs>canvasHeight) continue;
                context.moveTo(sx, sy-hs); context.lineTo(sx+hs, sy);
                context.lineTo(sx, sy+hs); context.lineTo(sx-hs, sy); context.closePath();
            }
            context.fill(); context.stroke();

            // --- Connected (gold border) ---
            context.fillStyle   = style.fill;
            context.strokeStyle = '#facc15';
            context.lineWidth   = lw_conn;
            context.beginPath();
            for (const t of worldTargets) {
                if (t.type !== typeName || !connectedSet.has(t)) continue;
                const sx = t.refSc.x * z + pX, sy = t.refSc.y * z + pY;
                const hs = Math.max(MIN_HS, t.refHs * z);
                if (sx+hs<0||sx-hs>canvasWidth||sy+hs<0||sy-hs>canvasHeight) continue;
                context.moveTo(sx, sy-hs); context.lineTo(sx+hs, sy);
                context.lineTo(sx, sy+hs); context.lineTo(sx-hs, sy); context.closePath();
            }
            context.fill(); context.stroke();
        }

        // Labels only when cells are large enough to be readable
        if (gs >= 4) {
            for (const t of worldTargets) {
                const sx = t.refSc.x * z + pX, sy = t.refSc.y * z + pY;
                const hs = Math.max(MIN_HS, t.refHs * z);
                if (sx+hs<0||sx-hs>canvasWidth||sy+hs<0||sy-hs>canvasHeight) continue;
                drawLabel(context, sx, sy, TARGET_STYLES[t.type].label,
                    Math.max(5, gs * 0.3 * Math.min(t.width, t.height)));
            }
        }
    }

    // 2. User entities (HQ + Flag) – typically few, individual draw is fine
    for (const entity of entities) {
        const sc = entityCenter(entity, pX, pY, z);
        if (entity.type === 'hq') {
            const hs  = Math.max(4, (entity.width+entity.height)/2*gs*0.45);
            const col = alliances[entity.allianceIndex]?.color || '#fff';
            drawDiamond(context, sc.x, sc.y, hs, hexToRgba(col,0.85), col, Math.max(2,2.5*z));
            drawLabel(context, sc.x, sc.y, 'HQ', Math.max(7, gs*0.3*entity.width));
        } else if (entity.type === 'flag') {
            const hs  = Math.max(3, gs * 0.38);
            const col = alliances[entity.allianceIndex]?.color || '#fff';
            const c   = conn[entity.allianceIndex];
            const isC = c && c.connectedFlags.has(entity);
            drawDiamond(context, sc.x, sc.y, hs, hexToRgba(col,0.75), isC?col:'#ef4444', Math.max(1,1.8*z));
        }
        // Selection highlight
        if (selectedEntities.has(entity)) {
            const hs2 = (entity.type === 'hq')
                ? Math.max(4, (entity.width+entity.height)/2*gs*0.45) + Math.max(3, 4*z)
                : Math.max(3, gs*0.38) + Math.max(2, 3*z);
            context.save();
            context.strokeStyle = '#fff';
            context.lineWidth   = Math.max(1.5, 2*z);
            context.setLineDash([Math.max(3,4*z), Math.max(2,3*z)]);
            context.beginPath();
            context.moveTo(sc.x, sc.y-hs2); context.lineTo(sc.x+hs2, sc.y);
            context.lineTo(sc.x, sc.y+hs2); context.lineTo(sc.x-hs2, sc.y);
            context.closePath();
            context.stroke();
            context.restore();
        }
    }

    // 3. Ghost preview – red when hovering over impassable terrain
    if (ghostPreview) {
        context.save(); context.globalAlpha = ghostBlocked ? 0.55 : 0.45;
        const gp  = ghostPreview;
        const sc  = entityCenter(gp, pX, pY, z);
        // Blocked = red cross-stroke, normal = alliance color
        const col    = ghostBlocked ? '#ef4444' : (alliances[activeAllianceIndex]?.color || '#fff');
        const fill   = ghostBlocked ? 'rgba(239,68,68,0.3)' : hexToRgba(col, 0.75);
        const lw     = ghostBlocked ? Math.max(2, 2.5 * z) : 1.5;
        if (gp.type === 'flag') {
            drawDiamond(context, sc.x, sc.y, Math.max(3, gs*0.38), fill, col, lw);
        } else {
            const hs = Math.max(4, (gp.width+gp.height)/2*gs*0.45);
            drawDiamond(context, sc.x, sc.y, hs, fill, col, lw);
            if (!ghostBlocked) drawLabel(context, sc.x, sc.y, 'HQ', Math.max(7, gs*0.3*gp.width));
        }
        // Draw an X on blocked ghosts
        if (ghostBlocked && gs >= 4) {
            const r = Math.max(3, gs * 0.25);
            context.strokeStyle = '#ef4444';
            context.lineWidth   = Math.max(1.5, 2 * z);
            context.beginPath();
            context.moveTo(sc.x - r, sc.y - r); context.lineTo(sc.x + r, sc.y + r);
            context.moveTo(sc.x + r, sc.y - r); context.lineTo(sc.x - r, sc.y + r);
            context.stroke();
        }
        context.restore();
    }

    // 4. Box-selection marquee
    if (isBoxSelecting && boxStart && boxCurrent) {
        const bx = Math.min(boxStart.x, boxCurrent.x), by = Math.min(boxStart.y, boxCurrent.y);
        const bw = Math.abs(boxCurrent.x - boxStart.x), bh = Math.abs(boxCurrent.y - boxStart.y);
        context.save();
        context.fillStyle   = 'rgba(59,130,246,0.12)';
        context.strokeStyle = 'rgba(59,130,246,0.9)';
        context.lineWidth   = 1.5;
        context.setLineDash([6, 4]);
        context.fillRect(bx, by, bw, bh);
        context.strokeRect(bx, by, bw, bh);
        context.restore();
    }

    // 5. Route preview – all cells along the path + waypoint markers
    if (selectedType === 'flag-route') {
        const cells = getRouteCells();
        if (cells.length > 0) {
            const hs  = Math.max(3, gs * 0.38);
            const col = alliances[activeAllianceIndex]?.color || '#fff';
            context.save();
            context.globalAlpha = 0.5;
            context.lineWidth   = 1.5;
            // Valid placement cells
            context.fillStyle   = hexToRgba(col, 0.75);
            context.strokeStyle = col;
            context.beginPath();
            for (const c of cells) {
                if (isOccupied(c.x, c.y) || isTerrainBlocked(c.x, c.y, 1, 1)) continue;
                const s = diamondToScreen(c.x, c.y, pX, pY, z);
                if (s.x+hs<0||s.x-hs>canvasWidth||s.y+hs<0||s.y-hs>canvasHeight) continue;
                context.moveTo(s.x, s.y-hs); context.lineTo(s.x+hs, s.y);
                context.lineTo(s.x, s.y+hs); context.lineTo(s.x-hs, s.y);
                context.closePath();
            }
            context.fill(); context.stroke();
            // Blocked cells shown in red
            context.fillStyle   = 'rgba(239,68,68,0.3)';
            context.strokeStyle = '#ef4444';
            context.beginPath();
            for (const c of cells) {
                if (!isOccupied(c.x, c.y) && !isTerrainBlocked(c.x, c.y, 1, 1)) continue;
                const s = diamondToScreen(c.x, c.y, pX, pY, z);
                if (s.x+hs<0||s.x-hs>canvasWidth||s.y+hs<0||s.y-hs>canvasHeight) continue;
                context.moveTo(s.x, s.y-hs); context.lineTo(s.x+hs, s.y);
                context.lineTo(s.x, s.y+hs); context.lineTo(s.x-hs, s.y);
                context.closePath();
            }
            context.fill(); context.stroke();
            context.restore();
        }
        // Waypoint dot markers
        if (gs >= 5 && routeWaypoints.length > 0) {
            const col = alliances[activeAllianceIndex]?.color || '#fff';
            context.save();
            context.fillStyle   = col;
            context.strokeStyle = '#fff';
            context.lineWidth   = Math.max(1.5, 2*z);
            for (const wp of routeWaypoints) {
                const s = diamondToScreen(wp.x, wp.y, pX, pY, z);
                context.beginPath();
                context.arc(s.x, s.y, Math.max(4, gs * 0.22), 0, Math.PI*2);
                context.fill(); context.stroke();
            }
            context.restore();
        }
    }
}

// ===== ENTITY PLACEMENT =====
function getEntityAtGrid(gx, gy) {
    for (let i = entities.length - 1; i >= 0; i--) {
        const e = entities[i];
        if (gx >= e.x && gx < e.x + e.width && gy >= e.y && gy < e.y + e.height) return e;
    }
    return null;
}

function getSelectedEntities() {
    const valid = [];
    selectedEntities.forEach(e => { if (entities.includes(e)) valid.push(e); });
    if (valid.length !== selectedEntities.size) selectedEntities = new Set(valid);
    return valid;
}

function clearSelection() { selectedEntities.clear(); }

function deleteSelection() {
    const sel = getSelectedEntities();
    if (!sel.length) return;
    sel.forEach(e => { const i = entities.indexOf(e); if (i !== -1) entities.splice(i, 1); });
    selectedEntities.clear();
    invalidateConnectivity();
    pushHistory();
    updateUI();
}

function getEntitiesInSelectionBox(x1, y1, x2, y2) {
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    return entities.filter(e => {
        const tl = diamondToScreenCorner(e.x,         e.y,          panX, panY, zoom);
        const tr = diamondToScreenCorner(e.x+e.width, e.y,          panX, panY, zoom);
        const bl = diamondToScreenCorner(e.x,         e.y+e.height, panX, panY, zoom);
        const br = diamondToScreenCorner(e.x+e.width, e.y+e.height, panX, panY, zoom);
        const eMinX = Math.min(tl.x,tr.x,bl.x,br.x), eMaxX = Math.max(tl.x,tr.x,bl.x,br.x);
        const eMinY = Math.min(tl.y,tr.y,bl.y,br.y), eMaxY = Math.max(tl.y,tr.y,bl.y,br.y);
        return !(eMaxX < minX || eMinX > maxX || eMaxY < minY || eMinY > maxY);
    });
}

// Move-validity check for a whole group (ignores intra-group collisions).
function canMoveGroupTo(items, dx, dy) {
    const ignoreSet = new Set(items.map(i => i.entity));
    return items.every(item => {
        const gx = item.origX + dx, gy = item.origY + dy;
        if (isTerrainBlocked(gx, gy, item.entity.width, item.entity.height)) return false;
        if (ALLIANCE_SCOPED.has(item.entity.type) && item.entity.allianceIndex !== undefined) {
            if (isForeignTerritory(gx, gy, item.entity.width, item.entity.height, item.entity.allianceIndex, ignoreSet)) return false;
        }
        for (let ddx = 0; ddx < item.entity.width; ddx++)
            for (let ddy = 0; ddy < item.entity.height; ddy++) {
                const cx = gx+ddx, cy = gy+ddy;
                if (entities.some(e => !ignoreSet.has(e) && cx>=e.x && cx<e.x+e.width && cy>=e.y && cy<e.y+e.height)) return false;
            }
        return true;
    });
}

function isOccupied(gx, gy, exclude=null) {
    return entities.some(e => {
        if (e===exclude) return false;
        return gx>=e.x && gx<e.x+e.width && gy>=e.y && gy<e.y+e.height;
    });
}

// Chebyshev spiral search for the nearest 1×1 flag cell that is free.
function findNearestValidFlagCell(gx, gy, allianceIndex, maxRadius = 7) {
    for (let r = 0; r <= maxRadius; r++) {
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const cx = gx + dx, cy = gy + dy;
                if (isOccupied(cx, cy)) continue;
                if (isTerrainBlocked(cx, cy, 1, 1)) continue;
                if (isForeignTerritory(cx, cy, 1, 1, allianceIndex)) continue;
                return { x: cx, y: cy };
            }
        }
    }
    return null;
}

function placeEntity(gx, gy, type) {
    const def = ENTITY_DEFS[type]; if (!def) return;
    let px = gx, py = gy;

    const isValidPos = (x, y) => {
        for (let dx=0;dx<def.width;dx++) for (let dy=0;dy<def.height;dy++) if (isOccupied(x+dx,y+dy)) return false;
        if (isTerrainBlocked(x, y, def.width, def.height)) return false;
        if (ALLIANCE_SCOPED.has(type) && isForeignTerritory(x, y, def.width, def.height, activeAllianceIndex)) return false;
        return true;
    };

    if (!isValidPos(px, py)) {
        // For flags snap to nearest valid cell; for HQ do nothing
        if (type !== 'flag') return;
        const alt = findNearestValidFlagCell(gx, gy, activeAllianceIndex);
        if (!alt) return;
        px = alt.x; py = alt.y;
    }

    const e = { type, x:px, y:py, width:def.width, height:def.height };
    if (ALLIANCE_SCOPED.has(type)) e.allianceIndex = activeAllianceIndex;
    entities.push(e);
    invalidateConnectivity(); pushHistory(); updateUI();
}

function deleteAt(gx, gy) {
    const idx = entities.findIndex(e => gx>=e.x&&gx<e.x+e.width&&gy>=e.y&&gy<e.y+e.height);
    if (idx!==-1) { entities.splice(idx,1); invalidateConnectivity(); pushHistory(); updateUI(); }
}

// Maximum Chebyshev spacing where two flag areas still touch (FLAG_RADIUS * 2 + 1)
const FLAG_STEP = FLAG_RADIUS * 2 + 1;

// Positions along a segment at Chebyshev intervals of FLAG_STEP, including both endpoints.
// Guarantees Chebyshev distance ≤ FLAG_STEP between every consecutive pair.
function spacedSegmentCells(x0, y0, x1, y1) {
    const dx = x1-x0, dy = y1-y0;
    const L = Math.max(Math.abs(dx), Math.abs(dy));
    if (L === 0) return [{x:x0, y:y0}];
    const pts = [];
    const n = Math.floor(L / FLAG_STEP);
    for (let i = 0; i <= n; i++) {
        const t = (i * FLAG_STEP) / L;
        pts.push({ x: Math.round(x0 + t * dx), y: Math.round(y0 + t * dy) });
    }
    const last = pts[pts.length - 1];
    if (last.x !== x1 || last.y !== y1) pts.push({x:x1, y:y1});
    return pts;
}

// ── A* pathfinding helpers ────────────────────────────────────────────────────
function _hPush(h, item) {
    h.push(item); let i=h.length-1;
    while (i>0){const p=(i-1)>>1; if(h[p][0]<=h[i][0]) break; const t=h[p];h[p]=h[i];h[i]=t; i=p;}
}
function _hPop(h) {
    const top=h[0], last=h.pop();
    if (h.length){h[0]=last; let i=0; for(;;){const l=2*i+1,r=2*i+2;let m=i; if(l<h.length&&h[l][0]<h[m][0])m=l; if(r<h.length&&h[r][0]<h[m][0])m=r; if(m===i)break; const t=h[m];h[m]=h[i];h[i]=t; i=m;}}
    return top;
}

// A* on the diamond grid, avoiding terrain-blocked cells.
// Returns array of {x,y} from (x0,y0) to (x1,y1), or null if unreachable / no worldmap.
function aStarPath(x0, y0, x1, y1) {  
    x0 = Math.max(-GRID_COLS, Math.min(GRID_COLS, x0));  
    y0 = Math.max(-GRID_ROWS, Math.min(GRID_ROWS, y0));  
    x1 = Math.max(-GRID_COLS, Math.min(GRID_COLS, x1));  
    y1 = Math.max(-GRID_ROWS, Math.min(GRID_ROWS, y1));  
    if (x0===x1 && y0===y1) return [{x:x0,y:y0}];  
    if (!worldmapData) return null;  
    const cheb = Math.max(Math.abs(x1-x0), Math.abs(y1-y0));  
    const pad  = Math.min(80, (cheb>>1) + 20);  
    const minX = Math.max(Math.min(x0,x1)-pad, -GRID_COLS);  
    const maxX = Math.min(Math.max(x0,x1)+pad,  GRID_COLS);  
    const minY = Math.max(Math.min(y0,y1)-pad, -GRID_ROWS);  
    const maxY = Math.min(Math.max(y0,y1)+pad,  GRID_ROWS);  
    const W=maxX-minX+1, H=maxY-minY+1;  
    const lx0=x0-minX, ly0=y0-minY, lx1=x1-minX, ly1=y1-minY;  
    if (lx1<0||lx1>=W||ly1<0||ly1>=H) return null;  
    const INF=1e9;
    const g=new Float32Array(W*H).fill(INF);
    const came=new Int32Array(W*H).fill(-1);
    const vis=new Uint8Array(W*H);
    g[ly0*W+lx0]=0;
    const open=[[Math.max(Math.abs(lx1-lx0),Math.abs(ly1-ly0)),lx0,ly0]];
    const DX=[-1,-1,-1,0,0,1,1,1], DY=[-1,0,1,-1,1,-1,0,1];
    let count=0;
    while (open.length) {
        const [,cx,cy]=_hPop(open);
        const ci=cy*W+cx;
        if (vis[ci]) continue;
        vis[ci]=1;
        if (++count>30000) break;
        if (cx===lx1&&cy===ly1) {
            const path=[]; let cur=ci;
            while (cur!==-1){path.push({x:(cur%W)+minX,y:Math.floor(cur/W)+minY});cur=came[cur];}
            return path.reverse();
        }
        const gc=g[ci];
        for (let d=0;d<8;d++) {
            const nx=cx+DX[d],ny=cy+DY[d];
            if (nx<0||nx>=W||ny<0||ny>=H) continue;
            const ni=ny*W+nx;
            if (vis[ni]) continue;
            if (isTerrainAt(nx+minX,ny+minY)) continue;
            const ng=gc+1;
            if (ng<g[ni]){g[ni]=ng;came[ni]=ci;_hPush(open,[ng+Math.max(Math.abs(nx-lx1),Math.abs(ny-ly1)),nx,ny]);}
        }
    }
    return null;
}

// Convert A* cell-path to optimally-spaced flag positions (FLAG_STEP apart by path distance)
function pathToFlagCells(path) {
    if (!path||!path.length) return [];
    const flags=[path[0]]; let steps=0;
    for (let i=1;i<path.length;i++){
        if (++steps>=FLAG_STEP){flags.push(path[i]);steps=0;}
    }
    const end=path[path.length-1], last=flags[flags.length-1];
    if (last.x!==end.x||last.y!==end.y) flags.push(end);
    return flags;
}

// Route segment: A* if terrain is in the way, otherwise straight-line spacing.
// Results are cached so repeated preview calls don't re-run A*.
function routeSegmentCells(x0, y0, x1, y1) {
    const key=`${x0},${y0},${x1},${y1}`;
    if (routeSegmentCache.has(key)) return routeSegmentCache.get(key);
    const straight=spacedSegmentCells(x0,y0,x1,y1);
    const blocked=straight.some(c=>isTerrainAt(c.x,c.y));
    const result = blocked ? (pathToFlagCells(aStarPath(x0,y0,x1,y1)) || straight) : straight;
    routeSegmentCache.set(key, result);
    return result;
}
// ─────────────────────────────────────────────────────────────────────────────

// All deduplicated flag positions along routeWaypoints (+ optional routeGhostPos for preview).
// Committed segments use A* (cached); the live ghost segment uses straight-line so it's fast
// and shows red obstacle cells — a useful visual hint to the user.
function getRouteCells() {
    const committed = routeWaypoints.length;
    const pts = [...routeWaypoints];
    if (routeGhostPos) pts.push(routeGhostPos);
    if (pts.length < 2) return pts.length===1 ? [{x:pts[0].x, y:pts[0].y}] : [];
    const seen = new Set(), result = [];
    for (let i=1; i<pts.length; i++) {
        // Last segment (ghost) stays as straight line preview; earlier segments use A*
        const cells = (i < committed)
            ? routeSegmentCells(pts[i-1].x, pts[i-1].y, pts[i].x, pts[i].y)
            : spacedSegmentCells(pts[i-1].x, pts[i-1].y, pts[i].x, pts[i].y);
        for (const c of cells) {
            const k = `${c.x},${c.y}`;
            if (!seen.has(k)) { seen.add(k); result.push(c); }
        }
    }
    return result;
}

// Place flags along all committed routeWaypoints (using A* to route around obstacles)
function commitRoute() {
    const pts = [...routeWaypoints];
    routeWaypoints = []; routeGhostPos = null;
    if (pts.length === 0) { routeSegmentCache.clear(); scheduleRedraw(); return; }
    const cells = [];
    if (pts.length === 1) {
        cells.push(pts[0]);
    } else {
        const seen = new Set();
        for (let i=1; i<pts.length; i++) {
            for (const c of routeSegmentCells(pts[i-1].x, pts[i-1].y, pts[i].x, pts[i].y)) {
                const k = `${c.x},${c.y}`;
                if (!seen.has(k)) { seen.add(k); cells.push(c); }
            }
        }
    }
    routeSegmentCache.clear();
    let placed = 0;
    for (const c of cells) {
        if (!isOccupied(c.x, c.y) && !isTerrainBlocked(c.x, c.y, 1, 1) &&
                !isForeignTerritory(c.x, c.y, 1, 1, activeAllianceIndex)) {
            entities.push({type:'flag', x:c.x, y:c.y, width:1, height:1, allianceIndex:activeAllianceIndex});
            placed++;
        }
    }
    if (placed > 0) { invalidateConnectivity(); pushHistory(); updateUI(); }
    else scheduleRedraw();
}

// ===== UNDO / REDO =====
function pushHistory() {
    history = history.slice(0, historyIndex+1);
    history.push(JSON.stringify(entities));
    if (history.length>HISTORY_LIMIT) history.shift(); else historyIndex++;
    syncUndoRedo();
}
function undo() { if (historyIndex<=0) return; historyIndex--; entities=JSON.parse(history[historyIndex]); clearSelection(); invalidateConnectivity(); updateUI(); syncUndoRedo(); }
function redo() { if (historyIndex>=history.length-1) return; historyIndex++; entities=JSON.parse(history[historyIndex]); clearSelection(); invalidateConnectivity(); updateUI(); syncUndoRedo(); }
function syncUndoRedo() {
    const u=document.getElementById('undoButton'); if(u) u.disabled=historyIndex<=0;
    const r=document.getElementById('redoButton'); if(r) r.disabled=historyIndex>=history.length-1;
}

// ===== SHARE LINK =====
function encodeState() {
    const data = { v:2, n:mapName, al:alliances.map(a=>[a.name,a.color]), act:activeAllianceIndex,
        e:entities.map(e=>e.allianceIndex!==undefined?[TYPE_CODES.indexOf(e.type),e.x,e.y,e.allianceIndex]:[TYPE_CODES.indexOf(e.type),e.x,e.y]) };
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    const ff = getFflate();
    if (ff) { try { return 'sp2:'+base64UrlEncode(ff.deflateSync(bytes,{level:9})); } catch(_){} }
    return 'sp1:'+base64UrlEncode(bytes);
}

function decodeState(param) {
    try {
        let bytes;
        if (param.startsWith('sp2:')) { const ff=getFflate(); if(!ff) return null; bytes=ff.inflateSync(base64UrlDecode(param.slice(4))); }
        else if (param.startsWith('sp1:')) { bytes=base64UrlDecode(param.slice(4)); }
        else return null;
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch(_){ return null; }
}

function applyState(data) {
    if (!data||(data.v!==1&&data.v!==2)) return false;
    mapName = data.n||''; document.getElementById('mapNameInput').value=mapName;
    alliances = (data.al||[]).map(a=>({name:String(a[0]||'Alliance'),color:String(a[1]||'#1D4ED8')}));
    if (!alliances.length) alliances=[{name:'Alliance 1',color:'#27549c'}];
    activeAllianceIndex = clamp(+data.act||0,0,alliances.length-1);
    entities = (data.e||[]).map(arr=>{
        const type=TYPE_CODES[arr[0]]; if(!type) return null;
        const def=ENTITY_DEFS[type];
        const ent={type,x:arr[1],y:arr[2],width:def.width,height:def.height};
        if(arr[3]!==undefined) ent.allianceIndex=arr[3];
        return ent;
    }).filter(Boolean);
    invalidateConnectivity();
    return true;
}

function buildShareUrl() { const u=new URL(window.location.href); u.searchParams.set('mapData',encodeState()); return u.toString(); }

async function generateShortUrl() {
    const btn=document.getElementById('shortUrlButton');
    btn.disabled=true; btn.textContent='Generating…';
    const errEl=document.getElementById('shortUrlError'); errEl.textContent='';
    try {
        const ctrl=new AbortController(); const tid=setTimeout(()=>ctrl.abort(),10000);
        const resp=await fetch('https://tinyurl.com/api-create.php?url='+encodeURIComponent(buildShareUrl()),{signal:ctrl.signal});
        clearTimeout(tid); if(!resp.ok) throw new Error();
        document.getElementById('shortUrlOutput').value=(await resp.text()).trim();
        document.getElementById('shortUrlContainer').classList.remove('hidden');
    } catch(e) { errEl.textContent='Failed – copy long link instead'; }
    finally { btn.disabled=false; btn.textContent='Generate Short URL'; }
}

// ===== ZOOM =====
function setZoom(newZ, cx, cy) {
    const z=clamp(newZ,0.01,4), r=z/zoom;
    panX=cx-(cx-panX)*r; panY=cy-(cy-panY)*r; zoom=z;
    document.getElementById('zoomLevel').textContent=Math.round(z*100)+'%';
    scheduleRedraw();
}

// ===== ALLIANCE MANAGEMENT =====
function addAlliance() {
    const i=alliances.length;
    alliances.push({name:`Alliance ${i+1}`,color:ALLIANCE_PALETTE[i%ALLIANCE_PALETTE.length]});
    activeAllianceIndex=i; invalidateConnectivity(); updateUI();
}

function removeAlliance(i) {
    if (alliances.length<=1) return;
    entities=entities.filter(e=>!ALLIANCE_SCOPED.has(e.type)||e.allianceIndex!==i);
    entities.forEach(e=>{if(ALLIANCE_SCOPED.has(e.type)&&e.allianceIndex>i) e.allianceIndex--;});
    alliances.splice(i,1);
    activeAllianceIndex=clamp(activeAllianceIndex,0,alliances.length-1);
    invalidateConnectivity(); pushHistory(); updateUI();
}

function cycleAlliance() { activeAllianceIndex=(activeAllianceIndex+1)%alliances.length; invalidateConnectivity(); updateUI(); }

// ===== UI =====
function buildAllianceItem(alli, i) {
    const conn=getConnectivity()[i];
    const flags=entities.filter(e=>e.type==='flag'&&e.allianceIndex===i).length;
    const hqSet=entities.some(e=>e.type==='hq'&&e.allianceIndex===i);
    const connCnt=worldTargets.filter(t=>conn.connectedTargets.has(t)).length;

    const div=document.createElement('div');
    div.className='alliance-item'+(i===activeAllianceIndex?' active':'');

    const sw=document.createElement('span'); sw.className='alli-color-swatch'; sw.style.background=alli.color;
    sw.addEventListener('click',e=>{e.stopPropagation();const p=document.getElementById('colorPicker');p.dataset.idx=String(i);p.value=alli.color;p.click();});

    const ni=document.createElement('input'); ni.className='alli-name-input'; ni.value=alli.name;
    ni.addEventListener('click',e=>e.stopPropagation());
    ni.addEventListener('change',()=>{alliances[i].name=ni.value.trim()||`Alliance ${i+1}`;updateUI();});

    const st=document.createElement('span'); st.className='alli-stats';
    st.textContent=`${flags} Flags ${hqSet?'HQ set':'—'} ${connCnt}/${worldTargets.length}✓`;

    const dl=document.createElement('button'); dl.className='alli-del'; dl.textContent='✕';
    dl.addEventListener('click',e=>{e.stopPropagation();removeAlliance(i);});

    div.append(sw,ni,st,dl);
    div.addEventListener('click',()=>{activeAllianceIndex=i;invalidateConnectivity();updateUI();});
    return div;
}

function renderAllianceList() {
    ['allianceList','allianceListMobile'].forEach(id=>{
        const list=document.getElementById(id); if(!list) return;
        list.innerHTML=''; alliances.forEach((a,i)=>list.appendChild(buildAllianceItem(a,i)));
    });
}

function renderFlagList() {
    const conn  = getConnectivity()[activeAllianceIndex];
    const alli  = alliances[activeAllianceIndex];
    const flags = entities.filter(e=>e.type==='flag'&&e.allianceIndex===activeAllianceIndex);
    const hqCnt = entities.filter(e=>e.type==='hq'  &&e.allianceIndex===activeAllianceIndex).length;

    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set('activeAllianceName',       alli?`(${alli.name})`:'');
    set('activeAllianceNameMobile', alli?`(${alli.name})`:'');
    set('flagCountBadge',flags.length); set('flagCountBadgeMobile',flags.length);
    set('flagCounter',flags.length);    set('mobileFlagCounter',flags.length);
    set('hqCounter',hqCnt);             set('mobileHqCounter',hqCnt);

    ['flagList','flagListMobile'].forEach(lid=>{
        const list=document.getElementById(lid); if(!list) return;
        list.innerHTML='';
        if (!flags.length) { const p=document.createElement('p'); p.className='text-xs text-gray-400 text-center py-1'; p.textContent='No flags'; list.appendChild(p); return; }
        flags.forEach((flag,i)=>{
            const coord=coordForEntity(flag), isC=conn.connectedFlags.has(flag);
            const div=document.createElement('div'); div.className='flag-item'; div.style.borderLeftColor=alli?alli.color:'#6b7280';
            div.style.cursor='pointer'; div.title='Click to center';
            div.addEventListener('click',()=>{
                const sc=entityCenter(flag,0,0,zoom);
                panX=canvasWidth/2-sc.x; panY=canvasHeight/2-sc.y;
                scheduleRedraw();
            });
            const n=document.createElement('span');n.className='flag-num';n.textContent=`#${i+1}`;
            const c=document.createElement('span');c.className='flag-coord';c.textContent=`${coord.x} : ${coord.y}`;
            const s=document.createElement('span');s.className='flag-status';s.textContent=isC?'✓':'✗';s.style.color=isC?'#16a34a':'#dc2626';
            div.append(n,c,s); list.appendChild(div);
        });
    });
}

function renderConnectionStatus() {
    const panel=document.getElementById('connectionStatus'); if(!panel) return;
    panel.innerHTML='';
    if (!worldTargets.length) { panel.innerHTML='<p class="text-xs text-gray-400 text-center py-2">Loading worldmap…</p>'; return; }
    const allConn = getConnectivity();

    const byType = { castle:[], stronghold:[], facility:[] };
    worldTargets.forEach(t=>{if(byType[t.type]) byType[t.type].push(t);});

    for (const [typeName,targets] of Object.entries(byType)) {
        if (!targets.length) continue;
        const style=TARGET_STYLES[typeName];
        const hdr=document.createElement('p'); hdr.className='text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2 mb-1';
        hdr.textContent=`${style.label} (${targets.length})`; panel.appendChild(hdr);
        targets.forEach(t=>{
            const coord=coordForEntity(t);
            const connAllis=alliances.filter((_,i)=>allConn[i].connectedTargets.has(t));
            const div=document.createElement('div'); div.className='target-item';
            const hr=document.createElement('div'); hr.className='target-header';
            const ts=document.createElement('span');ts.className='target-type-label';ts.style.color=style.stroke;ts.textContent=style.label;
            const cs=document.createElement('span');cs.className='target-coord-label';cs.textContent=`${coord.x} : ${coord.y}`;
            hr.append(ts,cs);
            const cn=document.createElement('div');cn.className='target-connections';
            if(!connAllis.length){const s=document.createElement('span');s.className='no-conn-label';s.textContent='No alliance connected';cn.appendChild(s);}
            else connAllis.forEach(a=>{const b=document.createElement('span');b.className='conn-badge';b.style.background=hexToRgba(a.color,0.15);b.style.borderColor=a.color;b.style.color=a.color;b.title=a.name;b.textContent=a.name;cn.appendChild(b);});
            div.append(hr,cn); panel.appendChild(div);
        });
    }
}

function updateUI() { renderAllianceList(); renderFlagList(); renderConnectionStatus(); redraw(); }

// ===== TOOL SELECTION =====
function setTool(type) {
    if (selectedType === 'flag-route') { routeWaypoints = []; routeGhostPos = null; routeSegmentCache.clear(); }
    if (selectedType === 'flag-paint') { isPainting = false; paintLastCell = null; }
    if (type === 'delete' && getSelectedEntities().length > 0) { deleteSelection(); return; }
    if (type !== 'select') { clearSelection(); isDragging = false; isBoxSelecting = false; boxStart = null; boxCurrent = null; }
    selectedType = type;
    document.querySelectorAll('#toolbar-controls [data-tool]').forEach(btn=>{
        const a=btn.dataset.tool===type;
        if(btn.dataset.tool==='select') btn.className=`shortcut-button ${a?'bg-yellow-500 hover:bg-yellow-600':'bg-gray-500 hover:bg-gray-600'} text-white px-3 py-2 rounded-lg text-sm font-medium flex-none leading-5`;
        else if(btn.dataset.tool==='move')   btn.className=`shortcut-button ${a?'bg-yellow-500 hover:bg-yellow-600':'bg-purple-500 hover:bg-purple-600'} text-white px-3 py-2 rounded-lg text-sm font-medium flex-none leading-5`;
        else if(btn.dataset.tool==='delete') btn.className=`shortcut-button ${a?'bg-yellow-500 hover:bg-yellow-600':'bg-red-500 hover:bg-red-600'} text-white px-3 py-2 rounded-lg text-sm font-medium flex-none leading-5`;
    });
    // HQ button
    document.querySelectorAll('#toolbar-buildings [data-tool],#mobile-toolbar-buildings [data-tool]').forEach(btn=>{
        const a=btn.dataset.tool===type;
        btn.className=`shortcut-button ${a?'bg-yellow-500 hover:bg-yellow-600':'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-3 rounded-lg text-sm font-medium`;
    });
    // Flag cycle button + sub-mode chips
    const isFlagMode = ['flag','flag-paint','flag-route'].includes(type);
    const modeLabel  = {'flag':'Flag','flag-paint':'Paint','flag-route':'Route'};
    document.querySelectorAll('.flag-mode-btn').forEach(btn => {
        btn.className = `flag-mode-btn shortcut-button ${isFlagMode?'bg-yellow-500 hover:bg-yellow-600':'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-3 rounded-lg text-sm font-medium`;
    });
    document.querySelectorAll('.flag-mode-label').forEach(el => { el.textContent = modeLabel[type] ?? 'Flag'; });
    document.querySelectorAll('[data-subtool]').forEach(btn => {
        const a = btn.dataset.subtool === type;
        btn.className = `flag-sub-btn flex-1 text-xs py-1.5 rounded font-medium transition-colors ${a?'bg-yellow-500 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`;
    });
    canvas.style.cursor=type==='move'?'grab':type==='select'?'default':'crosshair';
}

const FLAG_CYCLE = ['flag', 'flag-paint', 'flag-route'];
function cycleFlagTool() {
    const i = FLAG_CYCLE.indexOf(selectedType);
    setTool(FLAG_CYCLE[i === -1 ? 0 : (i + 1) % FLAG_CYCLE.length]);
}

// ===== EVENTS =====
canvas.addEventListener('mousemove', e => {
    if (isPanning) {
        panX = panStartPanX + (e.clientX - panStartX);
        panY = panStartPanY + (e.clientY - panStartY);
        scheduleRedraw(); return;
    }

    if (selectedType === 'select') {
        ghostPreview = null; ghostBlocked = false;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        if (isDragging && dragSelectionStart.length) {
            const g = screenToDiamond(mx, my);
            const dx = g.x - dragOffsetX, dy = g.y - dragOffsetY;
            const cur = { x: dragSelectionStart[0].entity.x - dragSelectionStart[0].origX,
                          y: dragSelectionStart[0].entity.y - dragSelectionStart[0].origY };
            for (const c of [{ x:dx,y:dy }, { x:dx,y:cur.y }, { x:cur.x,y:dy }]) {
                if (c.x===cur.x && c.y===cur.y) break;
                if (canMoveGroupTo(dragSelectionStart, c.x, c.y)) {
                    dragSelectionStart.forEach(item => { item.entity.x = item.origX+c.x; item.entity.y = item.origY+c.y; });
                    hasDragMovement = true; invalidateConnectivity(); break;
                }
            }
            canvas.style.cursor = 'grabbing';
        } else if (isBoxSelecting) {
            boxCurrent = { x: mx, y: my };
            canvas.style.cursor = 'crosshair';
        } else {
            const g = screenToDiamond(mx, my);
            canvas.style.cursor = getEntityAtGrid(g.x, g.y) ? 'grab' : 'default';
        }
        scheduleRedraw(); return;
    }

    const isPlace = selectedType && !['move','delete','flag-route'].includes(selectedType);
    if (isPlace) {
        const rect = canvas.getBoundingClientRect();
        const g = screenToDiamond(e.clientX - rect.left, e.clientY - rect.top);
        const effectiveType = selectedType === 'flag-paint' ? 'flag' : selectedType;
        const def = ENTITY_DEFS[effectiveType];
        ghostPreview = { type:effectiveType, x:g.x, y:g.y, width:def.width, height:def.height };
        if (ALLIANCE_SCOPED.has(effectiveType)) ghostPreview.allianceIndex = activeAllianceIndex;
        ghostBlocked = isTerrainBlocked(g.x, g.y, def.width, def.height) ||
            (ALLIANCE_SCOPED.has(effectiveType) && isForeignTerritory(g.x, g.y, def.width, def.height, activeAllianceIndex));
        // For flags: snap ghost to nearest valid cell so the user sees exactly where the flag will land
        if (ghostBlocked && effectiveType === 'flag') {
            const alt = findNearestValidFlagCell(g.x, g.y, activeAllianceIndex);
            if (alt) { ghostPreview.x = alt.x; ghostPreview.y = alt.y; ghostBlocked = false; }
        }
        // Paint mode: advance last-placed flag toward cursor in FLAG_STEP increments
        if (selectedType === 'flag-paint' && isPainting) {
            while (true) {
                const lx = paintLastCell.x, ly = paintLastCell.y;
                const ddx = g.x - lx, ddy = g.y - ly;
                const dist = Math.max(Math.abs(ddx), Math.abs(ddy));
                if (dist < FLAG_STEP) break;
                const t = FLAG_STEP / dist;
                const nx = Math.round(lx + t * ddx), ny = Math.round(ly + t * ddy);
                if (nx === lx && ny === ly) break; // rounding stall guard
                if (!isOccupied(nx, ny) && !isTerrainBlocked(nx, ny, 1, 1) &&
                        !isForeignTerritory(nx, ny, 1, 1, activeAllianceIndex)) {
                    entities.push({type:'flag', x:nx, y:ny, width:1, height:1, allianceIndex:activeAllianceIndex});
                    invalidateConnectivity();
                }
                paintLastCell = {x:nx, y:ny};
            }
        }
    } else {
        ghostPreview = null; ghostBlocked = false;
        // Route mode: update live cursor preview
        if (selectedType === 'flag-route') {
            const rect = canvas.getBoundingClientRect();
            const g = screenToDiamond(e.clientX - rect.left, e.clientY - rect.top);
            routeGhostPos = {x:g.x, y:g.y};
        }
    }
    scheduleRedraw();
});

canvas.addEventListener('mousedown', e => {
    if (e.button===1 || selectedType==='move') {
        isPanning=true; panStartX=e.clientX; panStartY=e.clientY;
        panStartPanX=panX; panStartPanY=panY; canvas.style.cursor='grabbing'; return;
    }
    if (selectedType === 'select') {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const g = screenToDiamond(mx, my);
        const hit = getEntityAtGrid(g.x, g.y);
        const additive = e.ctrlKey || e.metaKey;
        if (hit) {
            if (additive) {
                if (selectedEntities.has(hit)) selectedEntities.delete(hit);
                else selectedEntities.add(hit);
            } else if (!selectedEntities.has(hit)) {
                selectedEntities = new Set([hit]);
            }
            if (selectedEntities.has(hit)) {
                isDragging = true;
                dragOffsetX = g.x; dragOffsetY = g.y;
                dragSelectionStart = getSelectedEntities().map(ent => ({ entity:ent, origX:ent.x, origY:ent.y }));
                _dragClaimedCache = buildGlobalClaimedCells(new Set(dragSelectionStart.map(i => i.entity)));
                hasDragMovement = false;
                canvas.style.cursor = 'grabbing';
            }
        } else {
            if (!additive) clearSelection();
            isBoxSelecting = true;
            boxStart = { x:mx, y:my }; boxCurrent = { x:mx, y:my };
        }
        scheduleRedraw(); return;
    }
    const rect = canvas.getBoundingClientRect();
    const g = screenToDiamond(e.clientX - rect.left, e.clientY - rect.top);
    // Route mode: left-click adds waypoint, right-click commits
    if (selectedType === 'flag-route') {
        if (e.button === 2) { commitRoute(); }
        else if (e.button === 0) { routeWaypoints.push({x:g.x, y:g.y}); }
        scheduleRedraw(); return;
    }
    // Paint mode: start painting on mousedown
    if (selectedType === 'flag-paint' && e.button === 0) {
        isPainting = true;
        paintLastCell = {x:g.x, y:g.y};
        if (!isOccupied(g.x, g.y) && !isTerrainBlocked(g.x, g.y, 1, 1) &&
                !isForeignTerritory(g.x, g.y, 1, 1, activeAllianceIndex)) {
            entities.push({type:'flag', x:g.x, y:g.y, width:1, height:1, allianceIndex:activeAllianceIndex});
            invalidateConnectivity();
        }
        scheduleRedraw(); return;
    }
    if (selectedType==='delete' || e.button===2) { deleteAt(g.x, g.y); }
    else if (selectedType && !['move'].includes(selectedType)) { placeEntity(g.x, g.y, selectedType); }
    scheduleRedraw();
});

canvas.addEventListener('mouseup', () => {
    if (isBoxSelecting) {
        isBoxSelecting = false;
        if (boxStart && boxCurrent) {
            const w = Math.abs(boxCurrent.x - boxStart.x), h = Math.abs(boxCurrent.y - boxStart.y);
            if (w >= 4 || h >= 4)
                getEntitiesInSelectionBox(boxStart.x, boxStart.y, boxCurrent.x, boxCurrent.y)
                    .forEach(e => selectedEntities.add(e));
        }
        boxStart = null; boxCurrent = null;
        scheduleRedraw(); return;
    }
    if (isDragging) {
        isDragging = false;
        _dragClaimedCache = null;
        if (hasDragMovement) { pushHistory(); updateUI(); }
        hasDragMovement = false;
        canvas.style.cursor = 'grab';
        return;
    }
    if (isPainting) {
        isPainting = false; paintLastCell = null;
        pushHistory(); updateUI(); return;
    }
    isPanning = false;
    canvas.style.cursor = selectedType==='move' ? 'grab' : selectedType==='select' ? 'default' : 'crosshair';
});
canvas.addEventListener('mouseleave', () => {
    ghostPreview = null; isPanning = false;
    routeGhostPos = null;
    if (isPainting) { isPainting = false; paintLastCell = null; pushHistory(); updateUI(); return; }
    if (isBoxSelecting) { isBoxSelecting = false; boxStart = null; boxCurrent = null; }
    if (isDragging) {
        isDragging = false;
        _dragClaimedCache = null;
        if (hasDragMovement) { pushHistory(); updateUI(); }
        hasDragMovement = false;
    }
    scheduleRedraw();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('dblclick', e => {
    if (selectedType === 'flag-route' && e.button === 0) { e.preventDefault(); commitRoute(); }
});
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    setZoom(zoom * (e.deltaY > 0 ? 0.9 : 1.1), e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length===1) { touchStartX=e.touches[0].clientX; touchStartY=e.touches[0].clientY; panStartPanX=panX; panStartPanY=panY; }
    else if (e.touches.length===2) lastPinchDist=Math.hypot(e.touches[1].clientX-e.touches[0].clientX, e.touches[1].clientY-e.touches[0].clientY);
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length===1 && selectedType==='move') {
        panX=panStartPanX+e.touches[0].clientX-touchStartX;
        panY=panStartPanY+e.touches[0].clientY-touchStartY;
        scheduleRedraw();
    } else if (e.touches.length===2) {
        const d = Math.hypot(e.touches[1].clientX-e.touches[0].clientX, e.touches[1].clientY-e.touches[0].clientY);
        if (lastPinchDist) {
            const rect=canvas.getBoundingClientRect();
            setZoom(zoom*d/lastPinchDist, (e.touches[0].clientX+e.touches[1].clientX)/2-rect.left, (e.touches[0].clientY+e.touches[1].clientY)/2-rect.top);
        }
        lastPinchDist=d;
    }
}, { passive: false });

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (e.touches.length===0 && Math.hypot(t.clientX-touchStartX, t.clientY-touchStartY)<8) {
        const rect=canvas.getBoundingClientRect(), g=screenToDiamond(t.clientX-rect.left, t.clientY-rect.top);
        if (selectedType&&!['select','move','delete'].includes(selectedType)) { placeEntity(g.x,g.y,selectedType); }
        else if (selectedType==='delete') { deleteAt(g.x,g.y); }
        scheduleRedraw();
    }
    lastPinchDist=null;
}, { passive: false });

document.addEventListener('keydown',e=>{
    if(e.target.matches('input,textarea')) return;
    const tools={q:'select',w:'move',e:'delete','1':'hq'};
    const k=e.key.toLowerCase();
    if(tools[k]){setTool(tools[k]);return;}
    if(k==='2'){cycleFlagTool();return;}
    if(k==='escape'&&selectedType==='flag-route'){routeWaypoints=[];routeGhostPos=null;routeSegmentCache.clear();scheduleRedraw();return;}
    if(k==='a'){e.preventDefault();cycleAlliance();return;}
    if((e.key==='Delete'||e.key==='Backspace')&&selectedType==='select'&&getSelectedEntities().length){
        e.preventDefault(); deleteSelection(); return;
    }
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&k==='z'){e.preventDefault();undo();return;}
    if((e.ctrlKey||e.metaKey)&&(k==='y'||(e.shiftKey&&k==='z'))){e.preventDefault();redo();return;}
});

// ===== PNG SAVE =====
function savePNG() {  
    const scale=2,tmp=document.createElement('canvas');  
    tmp.width=canvasWidth*scale;tmp.height=canvasHeight*scale;  
    const tc=tmp.getContext('2d');tc.scale(scale,scale);
    drawBackground(tc);
    drawGridLines(tc,panX,panY,zoom);
    drawWorldmapOffscreenLayer(tc,panX,panY,zoom);
    drawObstacleOverlay(tc,panX,panY,zoom);
    drawTerritoryLayer(tc,panX,panY,zoom);
    drawEntitiesLayer(tc,panX,panY,zoom);
    tmp.toBlob(b=>{const a=document.createElement('a');a.download=(mapName||'state-plan')+'.png';a.href=URL.createObjectURL(b);a.click();});  
}  

function showCopied(btnId,msgId){const b=document.getElementById(btnId),m=document.getElementById(msgId);if(m){m.classList.remove('hidden');setTimeout(()=>m.classList.add('hidden'),2000);}if(b){const o=b.textContent;b.textContent='Copied!';setTimeout(()=>b.textContent=o,2000);}}

// ===== INIT =====
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    zoom = calcFitZoom();
    panX = canvasWidth / 2;
    panY = canvasHeight / 2;
    document.getElementById('zoomLevel').textContent = Math.round(zoom*100)+'%';

    document.querySelectorAll('[data-tool]').forEach(btn=>btn.addEventListener('click',()=>setTool(btn.dataset.tool)));
    document.querySelectorAll('[data-subtool]').forEach(btn=>btn.addEventListener('click',()=>setTool(btn.dataset.subtool)));
    document.querySelectorAll('.flag-mode-btn').forEach(btn=>btn.addEventListener('click',cycleFlagTool));

    document.getElementById('zoomInBtn').addEventListener('click',  ()=>setZoom(zoom*1.2,canvasWidth/2,canvasHeight/2));
    document.getElementById('zoomOutBtn').addEventListener('click', ()=>setZoom(zoom*0.8,canvasWidth/2,canvasHeight/2));
    document.getElementById('resetZoomBtn').addEventListener('click',()=>{zoom=calcFitZoom();panX=canvasWidth/2;panY=canvasHeight/2;document.getElementById('zoomLevel').textContent=Math.round(zoom*100)+'%';redraw();});
    document.getElementById('centerBtn').addEventListener('click',  ()=>{panX=canvasWidth/2;panY=canvasHeight/2;redraw();});
    document.getElementById('undoButton').addEventListener('click', undo);
    document.getElementById('redoButton').addEventListener('click', redo);
    document.getElementById('clearButton').addEventListener('click',()=>{if(!confirm('Delete all HQs and flags?')) return; entities=[];clearSelection();invalidateConnectivity();pushHistory();updateUI();});
    document.getElementById('mapNameInput').addEventListener('input',e=>{mapName=e.target.value;});
    document.getElementById('btnAddAlliance').addEventListener('click',addAlliance);
    const bm=document.getElementById('btnAddAllianceMobile');if(bm) bm.addEventListener('click',addAlliance);
    document.getElementById('colorPicker').addEventListener('input',e=>{const i=+e.target.dataset.idx;if(alliances[i]){alliances[i].color=e.target.value;invalidateConnectivity();updateUI();}});
    document.getElementById('shareButton').addEventListener('click',()=>navigator.clipboard.writeText(buildShareUrl()).then(()=>showCopied('shareButton','copyMessage')));
    const ms=document.getElementById('mobileShareButton');if(ms) ms.addEventListener('click',()=>navigator.clipboard.writeText(buildShareUrl()).then(()=>showCopied('mobileShareButton','mobileCopyMessage')));
    document.getElementById('shortUrlButton').addEventListener('click',generateShortUrl);
    const csu=document.getElementById('copyShortUrlButton');if(csu) csu.addEventListener('click',()=>{const v=document.getElementById('shortUrlOutput').value;if(v)navigator.clipboard.writeText(v);});
    document.getElementById('downloadButton').addEventListener('click',savePNG);
    const md=document.getElementById('mobileDownloadButton');if(md) md.addEventListener('click',savePNG);

    function saveCSV() {  
        const rows = ['alliance;type;x;y'];  
        entities.forEach(e => {  
            if (e.type !== 'hq' && e.type !== 'flag') return;  
            const name = alliances[e.allianceIndex]?.name || '';  
            const safeName = name.includes(';') || name.includes('"') ? `"${name.replace(/"/g, '""')}"` : name;  
            rows.push(`${safeName};${e.type};${e.x};${e.y}`);  
        });  
        const blob = new Blob([rows.join('\r\n')], { type: 'text/csv' });  
        const a = document.createElement('a');  
        a.href = URL.createObjectURL(blob);  
        a.download = (mapName || 'state-plan') + '.csv';  
        a.click();  
        URL.revokeObjectURL(a.href);  
    } 
    document.getElementById('saveAsCSVButton')?.addEventListener('click', saveCSV);
    document.getElementById('mobileSaveAsCSVButton')?.addEventListener('click', saveCSV);

    function saveCode() {
        const code = encodeState();
        const ta = document.getElementById('mapData');
        const mta = document.getElementById('mobileMapData');
        if (ta) ta.value = code;
        if (mta) mta.value = code;
        const u = new URL(window.location.href);
        u.searchParams.set('mapData', code);
        history.replaceState(null,'',u.toString());
    }
    function loadCode() {
        const ta = document.getElementById('mapData');
        const mta = document.getElementById('mobileMapData');
        const code = (ta && ta.value.trim()) || (mta && mta.value.trim()) || '';
        if (!code) return;
        const data = decodeState(code);
        if (data && applyState(data)) { pushHistory(); updateUI(); }
    }
    document.getElementById('saveButton')?.addEventListener('click', saveCode);
    document.getElementById('mobileSaveButton')?.addEventListener('click', saveCode);
    document.getElementById('loadButton')?.addEventListener('click', loadCode);
    document.getElementById('mobileLoadButton')?.addEventListener('click', loadCode);
    const dtaEl = document.getElementById('mapData');
    const mtaEl = document.getElementById('mobileMapData');
    if (dtaEl && mtaEl) {
        dtaEl.addEventListener('input', () => { mtaEl.value = dtaEl.value; });
        mtaEl.addEventListener('input', () => { dtaEl.value = mtaEl.value; });
    }

    const param=new URLSearchParams(window.location.search).get('mapData');
    if(param){
        const ta2=document.getElementById('mapData'); if(ta2) ta2.value=param;
        const mta2=document.getElementById('mobileMapData'); if(mta2) mta2.value=param;
        const data=decodeState(param);if(data&&applyState(data)) pushHistory();
    }
    if(!history.length) pushHistory();
    setTool('flag');
    updateUI();
    loadWorldmap(); // auto-load on startup
}

init();
