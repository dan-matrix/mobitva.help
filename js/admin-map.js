// ==================== АДМИНКА КАРТЫ (admin-map.js) ====================
const user = checkAuth();
if (!user || user.role !== 'admin') {
    alert('Доступ запрещён!');
    window.location.href = '/';
}

let currentLocationId = null;
let currentMobId = null;
let locationsList = [];

const urlParams = new URLSearchParams(window.location.search);
const locationIdParam = urlParams.get('location');

async function loadLocationsList() {
    locationsList = await getMapLocations();
    const select = document.getElementById('locationSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Выберите локацию --</option>';
    for (const loc of locationsList) {
        const selected = (currentLocationId == loc.id) ? 'selected' : '';
        select.innerHTML += `<option value="${loc.id}" ${selected}>${escapeHtml(loc.name)} (ID: ${loc.id})</option>`;
    }

    if (currentLocationId) {
        loadMobsForLocation(currentLocationId);
    }
}

async function loadMobsForLocation(locationId) {
    currentLocationId = locationId;
    const mobs = await getLocationMobs(locationId);
    const container = document.getElementById('mobsList');
    if (!container) return;

    if (mobs.length === 0) {
        container.innerHTML = '<div class="no-mobs">📭 Нет мобов в этой локации. Нажмите "Добавить моба"</div>';
        return;
    }

    let html = '<table class="admin-table"><thead><tr><th>ID</th><th>Иконка</th><th>Название</th><th>Уровень</th><th>Действия</th></tr></thead><tbody>';
    for (const mob of mobs) {
        html += `
            <tr>
                <td>${mob.id}</td>
                <td><div class="icon-from-icons" style="--row:${mob.icon_row || 0}; --col:${mob.icon_col || 0}; width:28px; height:28px;"></div></td>
                <td>${escapeHtml(mob.name)}</td>
                <td>⭐ ${mob.level}</td>
                <td>
                    <button class="edit-btn" onclick="openMobModal(${mob.id})">✏️</button>
                    <button class="delete-btn" onclick="deleteMob(${mob.id})">🗑️</button>
                </td>
            </tr>
        `;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function openMobModal(mobId = null) {
    currentMobId = mobId;
    let mob = null;
    if (mobId) {
        mob = await getLocationMobById(mobId);
    }

    document.getElementById('mobName').value = mob ? mob.name : '';
    document.getElementById('mobLevel').value = mob ? mob.level : 1;
    document.getElementById('mobDescription').value = mob ? (mob.description || '') : '';
    document.getElementById('mobIconRow').value = mob ? (mob.icon_row || 0) : 0;
    document.getElementById('mobIconCol').value = mob ? (mob.icon_col || 0) : 0;
    document.getElementById('mobIconPreview').innerHTML = mob ? `✅ Выбрано: ряд ${(mob.icon_row || 0) + 1}, колонка ${(mob.icon_col || 0) + 1}` : '❌ Не выбрано';

    document.getElementById('mobModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeMobModal() {
    document.getElementById('mobModal').style.display = 'none';
    document.body.style.overflow = '';
    currentMobId = null;
}

function showIconPickerForMob(callback, buttonElement) {
    if (typeof showIconPickerIcons !== 'undefined') {
        showIconPickerIcons(callback, buttonElement, { title: 'Выберите иконку для моба' });
    } else {
        alert('Пикер иконок не загружен');
    }
}

async function saveMob() {
    if (!currentLocationId) {
        alert('Сначала выберите локацию!');
        return;
    }
    
    const name = document.getElementById('mobName').value.trim();
    if (!name) {
        alert('Введите название моба!');
        return;
    }

    const mob = {
        location_id: currentLocationId,
        name: name,
        level: parseInt(document.getElementById('mobLevel').value) || 1,
        icon_row: parseInt(document.getElementById('mobIconRow').value) || 0,
        icon_col: parseInt(document.getElementById('mobIconCol').value) || 0,
        description: document.getElementById('mobDescription').value.trim() || '',
        stats: {}
    };

    if (currentMobId) mob.id = currentMobId;

    const result = await saveLocationMob(mob);
    if (result) {
        closeMobModal();
        await loadMobsForLocation(currentLocationId);
        alert('✅ Моб сохранен!');
    } else {
        alert('❌ Ошибка при сохранении моба!');
    }
}

async function deleteMob(mobId) {
    if (!confirm('Удалить моба?')) return;
    const success = await deleteLocationMob(mobId);
    if (success) {
        await loadMobsForLocation(currentLocationId);
        alert('🗑️ Моб удален');
    } else {
        alert('❌ Ошибка при удалении!');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const locationSelect = document.getElementById('locationSelect');
    if (locationSelect) {
        locationSelect.addEventListener('change', (e) => {
            currentLocationId = parseInt(e.target.value);
            if (currentLocationId) {
                loadMobsForLocation(currentLocationId);
            }
        });
    }
    
    const addMobBtn = document.getElementById('addMobBtn');
    if (addMobBtn) {
        addMobBtn.addEventListener('click', () => openMobModal());
    }
    
    const saveMobBtn = document.getElementById('saveMobBtn');
    if (saveMobBtn) {
        saveMobBtn.addEventListener('click', saveMob);
    }
    
    const cancelMobBtn = document.getElementById('cancelMobBtn');
    if (cancelMobBtn) {
        cancelMobBtn.addEventListener('click', closeMobModal);
    }
    
    const selectIconBtn = document.getElementById('selectMobIconBtn');
    if (selectIconBtn) {
        selectIconBtn.addEventListener('click', () => {
            showIconPickerForMob((row, col) => {
                document.getElementById('mobIconRow').value = row;
                document.getElementById('mobIconCol').value = col;
                document.getElementById('mobIconPreview').innerHTML = `✅ Выбрано: ряд ${row + 1}, колонка ${col + 1}`;
            }, selectIconBtn);
        });
    }
});

if (locationIdParam) {
    currentLocationId = parseInt(locationIdParam);
}
loadLocationsList();