// ==================== КАРТА (map.js) ====================
let mapLocations = [];
let mapConnections = [];
let isMapAdmin = false;
let editMode = false;
let currentLocationId = null;
let dragTarget = null;
let dragOffsetX = 0, dragOffsetY = 0;

let isDraggingMap = false;
let mapDragStartX = 0, mapDragStartY = 0;
let mapScrollLeft = 0, mapScrollTop = 0;

let currentZoom = 0.888;
const minZoom = 0.650;
const maxZoom = 1.5;
const zoomStep = 0.045;

const CANVAS_WIDTH = 1484;
const CANVAS_HEIGHT = 1060;

// По умолчанию — картинка; каждый пользователь хранит свой выбор в localStorage
let currentBg = localStorage.getItem('map_bg') || 'bg-image';

// ==================== СТИЛИ ТРОП ====================
const TRAIL_STYLES = {
    dirt:   { shadow: '#302006', mid: '#583f22', hi: '#5c4828', midW: 4.5, shadowW: 9, jitter: 2.4 },
    stone:  { shadow: '#2a2a2a', mid: '#606060', hi: '#b0b0b0', midW: 4.5, shadowW: 11, jitter: 1.2 },
    grass:  { shadow: '#1a4020', mid: '#347530', hi: '#70c044', midW: 3.5, shadowW: 6, jitter: 2.9 },
    danger: { shadow: '#6a1010', mid: '#bb2828', hi: '#ff9090', midW: 4.5, shadowW: 8, jitter: 1.9 },
};

const COLOR_TO_TRAIL = {
    '#8a7a40': 'dirt',
    '#44aaff': 'stone',
    '#44ff88': 'grass',
    '#ff44aa': 'danger',
    '#ff4444': 'danger',
};

// Маппинг типа тропы → цвет (для автоматического обновления color при сохранении)
const TRAIL_TO_COLOR = {
    dirt:   '#8a7a40',
    stone:  '#44aaff',
    grass:  '#44ff88',
    danger: '#ff4444',
};

// Простой seeded random для стабильного шума
function seededRand(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// Предрасчёт точек кривой с шумовым смещением — один раз при загрузке
const _trailPointsCache = new Map();
function getTrailPoints(ax, ay, bx, by, jitter, seed) {
    const key = `${ax|0}_${ay|0}_${bx|0}_${by|0}_${jitter}`;
    if (_trailPointsCache.has(key)) return _trailPointsCache.get(key);
    const rand = seededRand(seed);
    const steps = 18;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ct = 1 - t;
        const mx = (ax + bx) / 2 + (by - ay) * 0.06;
        const my = (ay + by) / 2 + (ax - bx) * 0.06;
        const x = ct*ct*ax + 2*ct*t*mx + t*t*bx;
        const y = ct*ct*ay + 2*ct*t*my + t*t*by;
        const dx = bx - ax, dy = by - ay;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const nx = -dy/len, ny = dx/len;
        const noise = (rand() - 0.5) * 2 * jitter * Math.sin(Math.PI * t);
        pts.push([x + nx * noise, y + ny * noise]);
    }
    _trailPointsCache.set(key, pts);
    return pts;
}

// Дашевые паттерны для хайлайта
const DASH_PATTERNS = {
    dirt:   [5, 10],
    stone:  [3, 14],
    grass:  [7, 12],
    danger: [5, 10],
};

// ==================== ЗАГРУЗКА ====================
async function loadMapData() {
    [mapLocations, mapConnections] = await Promise.all([
        getMapLocations(),
        getMapConnections()
    ]);
    renderMap();
    addAdminButton();
}

// ==================== HELPERS: NEIGHBORS ====================
function getNeighborIds(loc) {
    if (loc.neighbors && loc.neighbors.trim()) {
        return loc.neighbors.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    }
    const ids = new Set();
    mapConnections.forEach(c => {
        if (c.from_id == loc.id) ids.add(c.to_id);
        if (c.to_id == loc.id) ids.add(c.from_id);
    });
    return [...ids];
}

function buildConnectionPairs() {
    const pairs = new Map();
    mapLocations.forEach(loc => {
        getNeighborIds(loc).forEach(nid => {
            const a = Math.min(loc.id, nid);
            const b = Math.max(loc.id, nid);
            const key = `${a}_${b}`;
            if (!pairs.has(key)) {
                const conn = mapConnections.find(c =>
                    (c.from_id == a && c.to_id == b) || (c.from_id == b && c.to_id == a)
                );
                pairs.set(key, {
                    a: mapLocations.find(l => l.id == a),
                    b: mapLocations.find(l => l.id == b),
                    color: conn ? conn.color : '#8a7a40',
                    trail: conn ? (conn.trail || null) : null,
                    connId: conn ? conn.id : null
                });
            }
        });
    });
    return [...pairs.values()];
}

// ==================== РАССТОЯНИЕ ОТ ТОЧКИ ДО ОТРЕЗКА ====================
function pointToSegmentDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// ==================== CANVAS ТРОПЫ ====================
function createTrailCanvas(pairs, width, height) {
    let cvs = document.getElementById('trailCanvas');
    if (!cvs) {
        cvs = document.createElement('canvas');
        cvs.id = 'trailCanvas';
        cvs.style.cssText = 'position:absolute;top:0;left:0;z-index:5;';
    }
    cvs.width = width;
    cvs.height = height;

    // В режиме редактирования тропы кликабельны
    cvs.style.pointerEvents = editMode ? 'auto' : 'none';
    cvs.style.cursor = editMode ? 'pointer' : 'default';

    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const isParchment = currentBg === 'bg-parchment';

    pairs.forEach(({ a, b, color, trail }) => {
        if (!a || !b) return;
        const x1 = a.x * currentZoom, y1 = a.y * currentZoom;
        const x2 = b.x * currentZoom, y2 = b.y * currentZoom;

        const trailKey = trail || COLOR_TO_TRAIL[color] || 'dirt';
        const style = TRAIL_STYLES[trailKey];
        const jitter = style.jitter * currentZoom * 0.6;
        const seed = (a.id * 1000 + b.id) & 0xffffff;

        const pts = getTrailPoints(x1, y1, x2, y2, jitter, seed);

        const drawPath = (lineWidth, strokeStyle, alpha, dashPat) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (dashPat) ctx.setLineDash(dashPat);
            else ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
            ctx.stroke();
            ctx.restore();
        };

        if (isParchment) {
            drawPath(style.shadowW * currentZoom * 0.5, 'rgba(60,30,0,1)',    0.35, null);
            drawPath(style.midW    * currentZoom * 0.5, 'rgba(110,65,10,1)',  0.65, null);
            drawPath(1.5           * currentZoom * 0.5, 'rgba(190,145,50,1)', 0.35, DASH_PATTERNS[trailKey]?.map(v => v * currentZoom * 0.5));
        } else {
            drawPath(style.shadowW * currentZoom * 0.5, style.shadow, 0.40, null);
            drawPath(style.midW    * currentZoom * 0.5, style.mid,    0.80, null);
            drawPath(1.5           * currentZoom * 0.5, style.hi,     0.40, DASH_PATTERNS[trailKey]?.map(v => v * currentZoom * 0.5));
        }
    });

    // Клик по тропе в режиме редактирования
    cvs.onclick = null;
    if (editMode) {
        cvs.onclick = (e) => {
            const rect = cvs.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            let closestConnId = null;
            let minDist = 14; // порог в пикселях

            pairs.forEach(({ a, b, connId }) => {
                if (!a || !b || !connId) return;
                const x1 = a.x * currentZoom, y1 = a.y * currentZoom;
                const x2 = b.x * currentZoom, y2 = b.y * currentZoom;
                const dist = pointToSegmentDist(mx, my, x1, y1, x2, y2);
                if (dist < minDist) {
                    minDist = dist;
                    closestConnId = connId;
                }
            });

            if (closestConnId) openTrailEditModal(closestConnId);
        };
    }

    return cvs;
}

// Обёртка для совместимости
function createTrailSvg(pairs) {
    const w = Math.ceil(CANVAS_WIDTH * currentZoom);
    const h = Math.ceil(CANVAS_HEIGHT * currentZoom);
    return createTrailCanvas(pairs, w, h);
}

// ==================== РЕНДЕР ====================
function renderMap() {
    const canvas = document.getElementById('mapCanvas');
    if (!canvas) return;
    canvas.innerHTML = '';
    canvas.className = currentBg;
    canvas.style.width = (CANVAS_WIDTH * currentZoom) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * currentZoom) + 'px';

    const trailEl = createTrailSvg(buildConnectionPairs());
    canvas.appendChild(trailEl);

    mapLocations.forEach(loc => {
        const node = document.createElement('div');
        node.className = 'location-node' + (editMode ? ' editable' : '');
        node.style.left = (loc.x * currentZoom) + 'px';
        node.style.top = (loc.y * currentZoom) + 'px';
        node.setAttribute('data-id', loc.id);

        const iconRow = (loc.icon_map_row !== undefined && loc.icon_map_row !== null) ? loc.icon_map_row : 8;
        const iconCol = (loc.icon_map_col !== undefined && loc.icon_map_col !== null) ? loc.icon_map_col : 11;

        node.innerHTML = `
            <div class="loc-icon-map" style="--mr:${iconRow};--mc:${iconCol};"></div>
            <div class="loc-label">${escapeHtml(loc.name)}</div>
        `;

        if (editMode) node.addEventListener('mousedown', startDrag);
        node.addEventListener('click', e => { e.stopPropagation(); openLocationModal(loc); });
        canvas.appendChild(node);
    });
}

function redrawSvgOnly() {
    const canvas = document.getElementById('mapCanvas');
    if (!canvas) return;
    const existing = document.getElementById('trailCanvas');
    const newTrail = createTrailSvg(buildConnectionPairs());
    if (existing) existing.replaceWith(newTrail);
    else canvas.insertBefore(newTrail, canvas.firstChild);
}

// ==================== ПЕРЕКЛЮЧАТЕЛЬ ФОНА (доступен всем) ====================
function setBg(bgClass) {
    currentBg = bgClass;
    localStorage.setItem('map_bg', bgClass);
    renderMap();
}

function addBgSwitcher(panel) {
    if (document.getElementById('bgSwitcher')) return;
    const s = document.createElement('div');
    s.id = 'bgSwitcher';
    s.className = 'bg-switcher';
    s.innerHTML = `<label>🎨 Фон:</label>
        <select id="bgSelect">
            <option value="bg-image">Картинка (mapfon.png)</option>
            <option value="bg-grid">Тёмная сетка</option>
            <option value="bg-parchment">Пергамент</option>
        </select>`;
    panel.insertBefore(s, panel.firstChild);
    const sel = document.getElementById('bgSelect');
    sel.value = currentBg;
    sel.addEventListener('change', () => setBg(sel.value));
}

// ==================== КНОПКИ АДМИНА ====================
function addAdminButton() {
    const panel = document.getElementById('editorPanel');
    if (!panel) return;
    const user = checkAuth();
    isMapAdmin = user && user.role === 'admin';

    // Переключатель фона доступен всем пользователям
    addBgSwitcher(panel);

    if (isMapAdmin && !document.getElementById('editModeBtn')) {
        const mk = (text, cls, fn) => {
            const btn = document.createElement('button');
            btn.textContent = text; btn.className = cls; btn.onclick = fn;
            panel.appendChild(btn); return btn;
        };
        mk('✏️ Режим редактирования', 'cat-btn', toggleEditMode).id = 'editModeBtn';
        Object.assign(mk('➕ Добавить локацию', 'admin-only cat-btn', openAddLocationModal), { id: 'addLocBtn', style: { display: 'none' } });
        Object.assign(mk('💾 Сохранить позиции', 'admin-only cat-btn', saveAllMap), { id: 'saveMapBtn', style: { display: 'none' } });
        Object.assign(mk('🦇 Мобы', 'admin-only cat-btn', () => { window.location.href = 'admin-map.html'; }), { id: 'manageMobsBtn', style: { display: 'none' } });
    }
}

// ==================== DRAG КАРТЫ ====================
function initMapDrag() {
    const wrapper = document.getElementById('canvasWrapper');
    if (!wrapper) return;
    wrapper.addEventListener('mousedown', e => {
        if (editMode && e.target.closest('.location-node')) return;
        isDraggingMap = true;
        mapDragStartX = e.clientX; mapDragStartY = e.clientY;
        mapScrollLeft = wrapper.scrollLeft; mapScrollTop = wrapper.scrollTop;
        wrapper.classList.add('dragging');
        e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
        if (!isDraggingMap) return;
        wrapper.scrollLeft = mapScrollLeft - (e.clientX - mapDragStartX);
        wrapper.scrollTop = mapScrollTop - (e.clientY - mapDragStartY);
    });
    window.addEventListener('mouseup', () => {
        isDraggingMap = false;
        document.getElementById('canvasWrapper')?.classList.remove('dragging');
    });
}

// ==================== ЗУМ ====================
function initZoom() {
    const wrapper = document.getElementById('canvasWrapper');
    const zoomLevelSpan = document.getElementById('zoomLevel');
    function updateLabel() { zoomLevelSpan.textContent = Math.round(currentZoom * 100) + '%'; }
    function zoom(delta) {
        const nz = Math.min(maxZoom, Math.max(minZoom, currentZoom + delta));
        if (nz === currentZoom) return;
        const cx = wrapper.scrollLeft + wrapper.clientWidth / 2;
        const cy = wrapper.scrollTop + wrapper.clientHeight / 2;
        const rx = cx / (CANVAS_WIDTH * currentZoom);
        const ry = cy / (CANVAS_HEIGHT * currentZoom);
        currentZoom = nz;
        _trailPointsCache.clear();
        renderMap();
        wrapper.scrollLeft = rx * CANVAS_WIDTH * currentZoom - wrapper.clientWidth / 2;
        wrapper.scrollTop = ry * CANVAS_HEIGHT * currentZoom - wrapper.clientHeight / 2;
        updateLabel();
    }
    document.getElementById('zoomInBtn')?.addEventListener('click', () => zoom(zoomStep));
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => zoom(-zoomStep));
    wrapper.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? -zoomStep : zoomStep); }, { passive: false });
    updateLabel();
}

// ==================== DRAG ЛОКАЦИЙ ====================
function startDrag(e) {
    if (!editMode) return;
    const node = e.target.closest('.location-node');
    if (!node) return;
    e.stopPropagation();
    dragTarget = node;
    const rect = node.getBoundingClientRect();
    dragOffsetX = (e.clientX - rect.left) / currentZoom;
    dragOffsetY = (e.clientY - rect.top) / currentZoom;
    node.classList.add('dragging');
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
}

function onDrag(e) {
    if (!dragTarget) return;
    const wrapper = document.getElementById('canvasWrapper');
    const wr = wrapper.getBoundingClientRect();
    let nx = (e.clientX - wr.left + wrapper.scrollLeft) / currentZoom - dragOffsetX;
    let ny = (e.clientY - wr.top + wrapper.scrollTop) / currentZoom - dragOffsetY;
    nx = Math.max(0, Math.min(nx, CANVAS_WIDTH));
    ny = Math.max(0, Math.min(ny, CANVAS_HEIGHT));
    dragTarget.style.left = (nx * currentZoom) + 'px';
    dragTarget.style.top = (ny * currentZoom) + 'px';
    const id = parseInt(dragTarget.getAttribute('data-id'));
    const loc = mapLocations.find(l => l.id === id);
    if (loc) { loc.x = nx; loc.y = ny; redrawSvgOnly(); }
}

function stopDrag() {
    dragTarget?.classList.remove('dragging');
    dragTarget = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

// ==================== МОДАЛКА ЛОКАЦИИ (просмотр) ====================
async function openLocationModal(loc) {
    if (!loc) return;
    currentLocationId = loc.id;
    const modal = document.getElementById('locationModal');

    const mobs = await getLocationMobs(loc.id);
    let mobsHtml = mobs?.length > 0
        ? '<div class="location-mobs-section"><div class="location-mobs-title">🦇 Мобы:</div><div class="location-mobs-grid">' +
          mobs.map(mob => `<div class="location-mob-card" onclick="event.stopPropagation();viewMobInfo(${mob.id})">
                <div class="icon-from-icons" style="--row:${mob.icon_row||0};--col:${mob.icon_col||0};width:28px;height:28px;margin:0 auto 4px;"></div>
                <div class="location-mob-name">${escapeHtml(mob.name)}</div>
                <div class="location-mob-level">⭐ ${mob.level}</div>
            </div>`).join('') + '</div></div>'
        : '<div class="location-mobs-empty">📭 Нет мобов</div>';

    const neighborIds = getNeighborIds(loc);
    let neighborsHtml = '';
    if (neighborIds.length > 0) {
        const names = neighborIds.map(id => {
            const n = mapLocations.find(l => l.id == id);
            return n ? `<span onclick="event.stopPropagation();jumpToLocation(${n.id})" style="cursor:pointer;color:#ffaa44;text-decoration:underline;">${escapeHtml(n.name)}</span>` : `#${id}`;
        }).join(', ');
        neighborsHtml = `<div style="margin-bottom:12px;font-size:12px;color:#a0a0a0;">🔗 ${names}</div>`;
    }

    const typeMap = { green: '🟢 Безопасная', yellow: '🟡 Магазин', red: '🔴 Опасная' };
    const iconRow = (loc.icon_map_row !== undefined && loc.icon_map_row !== null) ? loc.icon_map_row : 8;
    const iconCol = (loc.icon_map_col !== undefined && loc.icon_map_col !== null) ? loc.icon_map_col : 11;

    modal.innerHTML = `
        <div class="location-modal-content">
            <div class="location-modal-header">
                <div class="location-modal-close" onclick="closeLocationModal()">✕</div>
                <div class="loc-icon-map loc-icon-modal" style="--mr:${iconRow};--mc:${iconCol};"></div>
                <div class="location-modal-title">${escapeHtml(loc.name)}</div>
                <div class="location-modal-type">${typeMap[loc.color] || ''}</div>
                ${editMode ? `<button class="location-modal-btn edit-location-btn" onclick="openEditFromView(${loc.id})" style="margin-top:8px;">✏️ Редактировать</button>` : ''}
            </div>
            <div class="location-modal-body">
                ${neighborsHtml}
                <div class="location-modal-description">${escapeHtml(loc.description || 'Описание отсутствует')}</div>
                ${mobsHtml}
            </div>
            <div class="location-modal-footer">
                <button class="location-modal-btn" onclick="closeLocationModal()">Закрыть</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function openEditFromView(locId) {
    closeLocationModal();
    setTimeout(() => openEditLocationModal(locId), 50);
}

function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentLocationId = null;
}

function jumpToLocation(locId) {
    closeLocationModal();
    setTimeout(() => centerMapOnLocation(locId), 100);
}

async function viewMobInfo(mobId) {
    const mob = await getLocationMobById(mobId);
    if (!mob) return;
    alert(`🦇 ${mob.name}\n⭐ Уровень: ${mob.level}${mob.description ? '\n' + mob.description : ''}`);
}

// ==================== МОДАЛКА РЕДАКТИРОВАНИЯ ЛОКАЦИИ ====================
async function openEditLocationModal(locId) {
    const loc = mapLocations.find(l => l.id === locId);
    if (!loc) return;

    document.getElementById('editLocId').value = loc.id;
    document.getElementById('editLocName').value = loc.name;
    document.getElementById('editLocColor').value = loc.color || 'green';
    document.getElementById('editLocDescription').value = loc.description || '';

    const mr = (loc.icon_map_row !== undefined && loc.icon_map_row !== null) ? loc.icon_map_row : 8;
    const mc = (loc.icon_map_col !== undefined && loc.icon_map_col !== null) ? loc.icon_map_col : 11;
    document.getElementById('editLocMapIconRow').value = mr;
    document.getElementById('editLocMapIconCol').value = mc;
    const preview = document.getElementById('editLocMapIconPreview');
    if (preview) { preview.style.setProperty('--mr', mr); preview.style.setProperty('--mc', mc); }

    renderNeighborCheckboxes(locId, getNeighborIds(loc));

    const modal = document.getElementById('editLocationModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function renderNeighborCheckboxes(currentLocId, selectedIds) {
    const container = document.getElementById('editNeighborsList');
    if (!container) return;
    const selectedSet = new Set(selectedIds.map(Number));
    container.innerHTML = mapLocations
        .filter(l => l.id !== currentLocId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map(l => `<label class="connection-checkbox">
            <input type="checkbox" value="${l.id}" ${selectedSet.has(l.id) ? 'checked' : ''}>
            <span>${escapeHtml(l.name)} <small style="color:#888;">(${l.id})</small></span>
        </label>`).join('');
}

function closeEditLocationModal() {
    document.getElementById('editLocationModal').style.display = 'none';
    document.body.style.overflow = '';
}

async function saveEditLocation() {
    const locId = parseInt(document.getElementById('editLocId').value);
    const name = document.getElementById('editLocName').value.trim();
    if (!name) { alert('Введите название!'); return; }

    const checked = document.querySelectorAll('#editNeighborsList input:checked');
    const neighborIds = [...checked].map(cb => parseInt(cb.value));
    const existing = mapLocations.find(l => l.id === locId);

    const updatedLoc = {
        id: locId, name,
        color: document.getElementById('editLocColor').value,
        icon_row: existing.icon_row || 3,
        icon_col: existing.icon_col || 10,
        icon_map_row: parseInt(document.getElementById('editLocMapIconRow').value),
        icon_map_col: parseInt(document.getElementById('editLocMapIconCol').value),
        description: document.getElementById('editLocDescription').value,
        x: existing.x, y: existing.y,
        level: existing.level || 1,
        neighbors: neighborIds.join(',')
    };

    const result = await saveMapLocation(updatedLoc);
    if (!result) { alert('❌ Ошибка!'); return; }

    await syncConnectionsFromNeighbors(locId, neighborIds);
    await loadMapData();
    closeEditLocationModal();
    alert('✅ Локация обновлена!');
}

async function syncConnectionsFromNeighbors(locId, newNeighborIds) {
    await deleteMapConnectionsByLocationId(locId);
    for (const nid of newNeighborIds) {
        const exists = mapConnections.find(c =>
            (c.from_id == locId && c.to_id == nid) || (c.from_id == nid && c.to_id == locId)
        );
        if (!exists) await saveMapConnection({ from_id: locId, to_id: nid, color: '#8a7a40' });
    }
    for (const nid of newNeighborIds) {
        const neighbor = mapLocations.find(l => l.id == nid);
        if (!neighbor) continue;
        const nn = getNeighborIds(neighbor);
        if (!nn.includes(locId)) {
            await saveMapLocation({ ...neighbor, neighbors: [...nn, locId].join(',') });
        }
    }
}

async function deleteCurrentLocation() {
    const locId = parseInt(document.getElementById('editLocId').value);
    if (!confirm('Удалить локацию и все её тропы и мобов?')) return;
    const loc = mapLocations.find(l => l.id === locId);
    if (loc) {
        for (const nid of getNeighborIds(loc)) {
            const neighbor = mapLocations.find(l => l.id == nid);
            if (!neighbor) continue;
            await saveMapLocation({ ...neighbor, neighbors: getNeighborIds(neighbor).filter(id => id !== locId).join(',') });
        }
    }
    await deleteMapConnectionsByLocationId(locId);
    await deleteLocationMobsByLocationId(locId);
    await deleteMapLocation(locId);
    await loadMapData();
    closeEditLocationModal();
    alert('🗑️ Локация удалена');
}

// ==================== МОДАЛКА ДОБАВЛЕНИЯ ЛОКАЦИИ ====================
function openAddLocationModal() {
    if (!editMode) return;
    renderNeighborCheckboxesForNew();
    document.getElementById('addLocationModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function renderNeighborCheckboxesForNew() {
    const container = document.getElementById('connectionsList');
    if (!container) return;
    container.innerHTML = mapLocations
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map(l => `<label class="connection-checkbox">
            <input type="checkbox" value="${l.id}">
            <span>${escapeHtml(l.name)} <small style="color:#888;">(${l.id})</small></span>
        </label>`).join('');
}

function closeAddLocationModal() {
    document.getElementById('addLocationModal').style.display = 'none';
    document.body.style.overflow = '';
    document.getElementById('newLocName').value = '';
    document.getElementById('newLocDescription').value = '';
}

async function saveNewLocation() {
    if (!editMode) return;
    const name = document.getElementById('newLocName').value.trim();
    if (!name) { alert('Введите название!'); return; }

    const checkboxes = document.querySelectorAll('#connectionsList input:checked');
    const neighborIds = [...checkboxes].map(cb => parseInt(cb.value));
    let targetX = 700, targetY = 500;
    if (neighborIds.length > 0) {
        const near = mapLocations.find(l => l.id === neighborIds[0]);
        if (near) { targetX = near.x + 150; targetY = near.y + 80; }
    }

    const newLoc = {
        name,
        color: document.getElementById('newLocColor').value,
        icon_row: 3, icon_col: 10,
        icon_map_row: parseInt(document.getElementById('newLocMapIconRow').value) || 8,
        icon_map_col: parseInt(document.getElementById('newLocMapIconCol').value) || 11,
        description: document.getElementById('newLocDescription').value,
        x: targetX, y: targetY, level: 1,
        neighbors: neighborIds.join(',')
    };

    const result = await saveMapLocation(newLoc);
    if (!result) { alert('❌ Ошибка!'); return; }
    const newId = result[0]?.id || result.id;

    for (const nid of neighborIds) {
        await saveMapConnection({ from_id: newId, to_id: nid, color: '#8a7a40' });
        const neighbor = mapLocations.find(l => l.id == nid);
        if (neighbor) {
            const nn = getNeighborIds(neighbor);
            if (!nn.includes(newId)) await saveMapLocation({ ...neighbor, neighbors: [...nn, newId].join(',') });
        }
    }

    await loadMapData();
    closeAddLocationModal();
    setTimeout(() => centerMapOnLocation(newId), 200);
    alert('✅ Локация добавлена!');
}

// ==================== РЕДАКТИРОВАНИЕ ТРОПЫ ====================
async function openTrailEditModal(connId) {
    const conn = mapConnections.find(c => c.id == connId);
    if (!conn) return;

    const modal = document.getElementById('trailEditModal');
    if (!modal) return;

    document.getElementById('trailEditConnId').value = connId;

    const fromLoc = mapLocations.find(l => l.id == conn.from_id);
    const toLoc   = mapLocations.find(l => l.id == conn.to_id);
    const title = document.getElementById('trailEditTitle');
    if (title) title.textContent = `${fromLoc?.name || '?'} → ${toLoc?.name || '?'}`;

    // Определяем текущий стиль тропы
    const currentTrail = conn.trail || COLOR_TO_TRAIL[conn.color] || 'dirt';
    const sel = document.getElementById('trailStyleSelect');
    if (sel) sel.value = currentTrail;

    // Показываем превью текущего стиля
    updateTrailPreview(currentTrail);

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function updateTrailPreview(trailKey) {
    const preview = document.getElementById('trailStylePreview');
    if (!preview) return;
    const labels = {
        dirt:   { text: 'Грунтовая',  color: '#8a6e41', desc: 'Обычная земляная дорога' },
        stone:  { text: 'Каменная',   color: '#b0b0b0', desc: 'Мощёная камнем тропа' },
        grass:  { text: 'Травяная',   color: '#70c044', desc: 'Зелёная травяная тропка' },
        danger: { text: 'Опасная',    color: '#ff9090', desc: 'Опасный маршрут' },
    };
    const info = labels[trailKey] || labels.dirt;
    preview.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#0d0a07;border-radius:8px;border:1px solid #3a342a;">
            <div style="width:60px;height:6px;background:${info.color};border-radius:3px;box-shadow:0 0 6px ${info.color}44;flex-shrink:0;"></div>
            <div>
                <div style="color:${info.color};font-weight:bold;font-size:13px;">${info.text}</div>
                <div style="color:#888;font-size:11px;">${info.desc}</div>
            </div>
        </div>
    `;
}

function closeTrailEditModal() {
    const modal = document.getElementById('trailEditModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

async function saveTrailEdit() {
    const connId = parseInt(document.getElementById('trailEditConnId').value);
    const trail = document.getElementById('trailStyleSelect').value;

    // Цвет выставляется автоматически из типа тропы
    const color = TRAIL_TO_COLOR[trail] || '#8a7a40';

    const conn = mapConnections.find(c => c.id == connId);
    if (!conn) { closeTrailEditModal(); return; }

    const updated = { ...conn, trail, color };
    const result = await saveMapConnection(updated);
    if (!result) { alert('❌ Ошибка сохранения!'); return; }

    _trailPointsCache.clear();
    await loadMapData();
    closeTrailEditModal();
    updateStatus('✅ Стиль тропы сохранён');
}

// ==================== РЕЖИМ РЕДАКТИРОВАНИЯ ====================
function toggleEditMode() {
    editMode = !editMode;
    const editModeBtn = document.getElementById('editModeBtn');
    document.querySelectorAll('.admin-only').forEach(b => b.style.display = editMode ? 'inline-block' : 'none');

    if (editMode) {
        editModeBtn.textContent = '🔒 Выйти из редактирования';
        updateStatus('✏️ Перемещай иконки; нажми на тропу чтобы изменить стиль');
    } else {
        editModeBtn.textContent = '✏️ Режим редактирования';
        updateStatus('⚡ Нажми на локацию для просмотра');
    }
    renderMap();
}

// ==================== ЦЕНТРИРОВАНИЕ ====================
function centerMapOnLocation(locIdOrName) {
    const loc = typeof locIdOrName === 'number'
        ? mapLocations.find(l => l.id === locIdOrName)
        : mapLocations.find(l => l.name.toLowerCase() === locIdOrName.toLowerCase());
    if (!loc) return false;
    const wrapper = document.getElementById('canvasWrapper');
    wrapper.scrollLeft = loc.x * currentZoom - wrapper.clientWidth / 2;
    wrapper.scrollTop  = loc.y * currentZoom - wrapper.clientHeight / 2;
    return true;
}

function centerMapFromUrl() {
    const p = new URLSearchParams(window.location.search);
    const idParam = p.get('location') || p.get('id');
    const nameParam = p.get('name');
    let loc = null;
    if (idParam) loc = mapLocations.find(l => l.id == parseInt(idParam));
    if (!loc && nameParam) loc = mapLocations.find(l => l.name.toLowerCase() === nameParam.toLowerCase());
    if (!loc && mapLocations.length > 0) {
        loc = mapLocations.find(l => l.name.toLowerCase().includes('ярмарка')) || mapLocations[0];
    }
    if (loc) setTimeout(() => centerMapOnLocation(loc.id), 150);
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ====================
async function saveAllMap() {
    if (!editMode) return;
    let saved = 0;
    for (const loc of mapLocations) { if (await saveMapLocation(loc)) saved++; }
    updateStatus(`💾 Сохранено ${saved} локаций`);
    alert(`✅ Сохранено ${saved} локаций!`);
}

function updateStatus(msg) {
    const s = document.getElementById('statusMsg');
    if (s) s.textContent = msg;
    setTimeout(() => {
        if (s) s.textContent = editMode ? '✏️ Режим редактирования — нажми на тропу для смены стиля' : '⚡ Нажми на локацию для просмотра';
    }, 3000);
}

// ==================== ПИКЕР ИКОНОК КАРТЫ ====================
function showMapIconPicker(onSelect, buttonEl) {
    document.getElementById('mapIconPickerPopup')?.remove();
    const picker = document.createElement('div');
    picker.id = 'mapIconPickerPopup';
    picker.style.cssText = `position:fixed;z-index:20000;background:linear-gradient(145deg,#1e1a14,#0a0806);border:2px solid #c7ba00;border-radius:16px;padding:15px;box-shadow:0 0 30px rgba(0,0,0,0.7);`;
    picker.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #c7ba00;">
            <span style="color:#d4b35a;font-weight:bold;font-size:14px;">🗺️ Иконка локации</span>
            <button onclick="document.getElementById('mapIconPickerPopup').remove()" style="background:#ff4444;border:none;border-radius:6px;padding:3px 12px;color:white;cursor:pointer;">✕</button>
        </div>
        <div id="mapIconPickerGrid" style="display:grid;grid-template-columns:repeat(12,50px);gap:3px;max-height:430px;overflow-y:auto;padding:4px;"></div>
    `;
    document.body.appendChild(picker);

    const grid = picker.querySelector('#mapIconPickerGrid');
    for (let row = 0; row < 24; row++) {
        for (let col = 0; col < 12; col++) {
            const cell = document.createElement('div');
            cell.style.cssText = `width:50px;height:50px;background-image:url('img/iconmap.png');background-repeat:no-repeat;background-position:-${col*50}px -${row*50}px;background-size:600px 1200px;cursor:pointer;border:2px solid #3a342a;border-radius:6px;transition:0.15s;box-sizing:content-box;`;
            cell.title = `Ряд ${row+1}, кол ${col+1}`;
            cell.onmouseover = () => { cell.style.borderColor='#ffaa44'; cell.style.transform='scale(1.1)'; };
            cell.onmouseout  = () => { cell.style.borderColor='#3a342a'; cell.style.transform='scale(1)'; };
            cell.onclick = () => { onSelect(row, col); picker.remove(); };
            grid.appendChild(cell);
        }
    }

    const r = buttonEl.getBoundingClientRect();
    let top = r.bottom + 6, left = r.left;
    if (top + 460 > window.innerHeight) top = r.top - 466;
    if (left + 626 > window.innerWidth) left = window.innerWidth - 632;
    if (left < 5) left = 5;
    picker.style.top = top + 'px';
    picker.style.left = left + 'px';

    setTimeout(() => {
        const close = e => {
            if (!picker.contains(e.target) && !buttonEl.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', close);
            }
        };
        document.addEventListener('click', close);
    }, 100);
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
async function initMap() {
    await loadMapData();
    initMapDrag();
    initZoom();

    document.getElementById('saveNewLocationBtn')?.addEventListener('click', saveNewLocation);
    document.getElementById('saveEditLocationBtn')?.addEventListener('click', saveEditLocation);
    document.getElementById('deleteLocationBtn')?.addEventListener('click', deleteCurrentLocation);
    document.getElementById('saveTrailEditBtn')?.addEventListener('click', saveTrailEdit);

    // Обновляем превью при смене стиля в модалке тропы
    document.getElementById('trailStyleSelect')?.addEventListener('change', function() {
        updateTrailPreview(this.value);
    });

    document.getElementById('selectMapIconBtn')?.addEventListener('click', function() {
        showMapIconPicker((row, col) => {
            document.getElementById('newLocMapIconRow').value = row;
            document.getElementById('newLocMapIconCol').value = col;
            const prev = document.getElementById('newLocMapIconPreview');
            if (prev) { prev.style.setProperty('--mr', row); prev.style.setProperty('--mc', col); }
        }, this);
    });

    document.getElementById('editSelectMapIconBtn')?.addEventListener('click', function() {
        showMapIconPicker((row, col) => {
            document.getElementById('editLocMapIconRow').value = row;
            document.getElementById('editLocMapIconCol').value = col;
            const prev = document.getElementById('editLocMapIconPreview');
            if (prev) { prev.style.setProperty('--mr', row); prev.style.setProperty('--mc', col); }
        }, this);
    });

    centerMapFromUrl();
}

initMap();
document.addEventListener('DOMContentLoaded', displayAdminPanel);