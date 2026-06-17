// ==================== УТИЛИТЫ ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getRussianStyleText(styleValue) {
    switch (styleValue) {
        case "rare": return "Урон";
        case "uncommon": return "Уворот";
        case "armor": return "Броня";
        case "epic": return "Элита";
        default: return styleValue || "—";
    }
}

function getStatIconClass(statName) {
    const name = String(statName).toLowerCase();
    const map = {
        'урон': 'stat-icon-урон',
        'точность': 'stat-icon-точность',
        'уворот': 'stat-icon-уворот',
        'броня': 'stat-icon-броня',
        'блок': 'stat-icon-блок',
        'оглушение': 'stat-icon-оглушение',
        'здоровье': 'stat-icon-здоровье',
        'износ': 'stat-icon-износ'
    };
    return 'stat-icon ' + (map[name] || 'stat-icon-износ');
}

// ==================== АВТОРИЗАЦИЯ ====================

// Проверка авторизации — читает сессию из db.js
// Возвращает объект пользователя или null
function checkAuth() {
    // getSession() определена в db.js
    if (typeof getSession === 'function') {
        return getSession();
    }
    // Fallback — обратная совместимость со старым кодом
    try {
        const raw = localStorage.getItem('mb_session');
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (!session.expires || Date.now() > session.expires) {
            localStorage.removeItem('mb_session');
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

// Проверка роли администратора (НЕ доверяй только клиентской стороне!)
// Для критичных операций используй verifySession() из db.js
function isAdmin() {
    const user = checkAuth();
    return user && user.role === 'admin';
}

// Отображение панели в зависимости от роли
async function displayAdminPanel() {
    const user = checkAuth();
    const ap = document.getElementById('adminPanel');
    const up = document.getElementById('userPanel');
    const ab = document.getElementById('addItemBtn');

    if (!user) {
        if (ap) ap.style.display = 'none';
        if (up) up.style.display = 'none';
        if (ab) ab.style.display = 'none';
        return;
    }

    if (user.role === 'admin') {
        if (ap) ap.style.display = 'block';
        if (up) up.style.display = 'none';
        if (ab) ab.style.display = 'block';
        const n = document.getElementById('adminName');
        if (n) n.textContent = user.name;
    } else {
        if (ap) ap.style.display = 'none';
        if (up) up.style.display = 'block';
        if (ab) ab.style.display = 'none';
        const n = document.getElementById('userName');
        if (n) n.textContent = user.name;

        const actionsDiv = document.querySelector('#userPanel .admin-actions');
        if (actionsDiv && !actionsDiv.querySelector('.profile-btn')) {
            const profileBtn = document.createElement('button');
            profileBtn.className = 'admin-btn profile-btn';
            profileBtn.innerHTML = '👤 Профиль';
            profileBtn.onclick = () => location.href = '/profile';
            const logoutBtn = actionsDiv.querySelector('.logout-btn');
            if (logoutBtn) {
                actionsDiv.insertBefore(profileBtn, logoutBtn);
            } else {
                actionsDiv.appendChild(profileBtn);
            }
        }
    }

    addBellToHeader();
    addGlobalSearch();
    addSoundToggleButton();
    initNotificationBell();
    initHotkeys();
    initSound();

    // Проверяем завершённые таймеры на каждой странице
    await checkExpiredTimers();
}

// Выход из аккаунта (использует async logout из db.js)
function logout() {
    if (typeof window.logout === 'function' && window.logout !== logout) {
        window.logout();
        return;
    }
    // Fallback
    if (typeof clearSession === 'function') clearSession();
    localStorage.removeItem('user');
    localStorage.removeItem('mb_session');
    window.location.href = '/auth';
}

// Открытие админ-панели с проверкой роли
function openAdminPanel() {
    if (!isAdmin()) {
        alert('Доступ запрещён!');
        return;
    }
    window.location.href = '/admin.html';
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) {
        m.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function openRunesModal() {
    const m = document.getElementById('runesModal');
    if (m) {
        m.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeRunesModal() {
    closeModal('runesModal');
}

window.onclick = function (e) {
    const ids = ['runesModal', 'demonModal', 'runeModal', 'totemModal', 'editNewsModal', 'item-modal', 'editItemModal'];
    for (let id of ids) {
        const m = document.getElementById(id);
        if (m && e.target === m) {
            closeModal(id);
            break;
        }
    }
    const editModal = document.getElementById('editModal');
    if (editModal && e.target === editModal) return;
};

// ==================== ЗВУК ====================

let soundEnabled = localStorage.getItem('soundEnabled') === 'true';
let audioCtx = null;
let audioUnlocked = false;

function initSound() {
    if (soundEnabled === null) {
        soundEnabled = true;
        localStorage.setItem('soundEnabled', 'true');
    }
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        audioCtx.suspend();
    } catch (e) {}
    updateSoundButton();
    const unlockAudio = () => {
        if (audioCtx && !audioUnlocked) {
            audioCtx.resume().then(() => { audioUnlocked = true; }).catch(() => {});
        }
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
}

function playNotificationSound() {
    if (!soundEnabled || !audioCtx || !audioUnlocked) return;
    try {
        const now = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc1.frequency.value = 880;
        osc1.type = 'sine';
        osc2.frequency.value = 660;
        osc2.type = 'sine';
        gainNode.gain.value = 0;
        osc1.start();
        osc2.start();
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.35);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
    } catch (e) {}
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled);
    updateSoundButton();
    if (soundEnabled && audioUnlocked) playNotificationSound();
}

function updateSoundButton() {
    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) {
        soundBtn.innerHTML = soundEnabled ? '🔊' : '🔇';
        soundBtn.title = soundEnabled ? 'Выключить звук' : 'Включить звук';
    }
}

function addSoundToggleButton() {
    const notificationHeader = document.querySelector('.notification-header');
    if (!notificationHeader || document.getElementById('soundToggleBtn')) return;
    const headerButtons = notificationHeader.querySelector('.notification-header-buttons');
    if (headerButtons) {
        headerButtons.insertAdjacentHTML('afterbegin', `
            <button class="sound-toggle-btn" id="soundToggleBtn" onclick="event.stopPropagation(); toggleSound()" title="${soundEnabled ? 'Выключить звук' : 'Включить звук'}">
                ${soundEnabled ? '🔊' : '🔇'}
            </button>
        `);
    }
}

// ==================== ГОРЯЧИЕ КЛАВИШИ ====================

function initHotkeys() {
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal, .item-compare-modal, .select-item-modal, .demon-modal, .rune-modal, .totem-modal, .runes-modal, .global-search-dropdown, .notification-dropdown');
            modals.forEach(modal => {
                if (modal.style.display === 'flex' || modal.classList.contains('show')) {
                    modal.classList.remove('show');
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchIcon = document.querySelector('.global-search-icon');
            if (searchIcon) searchIcon.click();
        }
    });
}

// ==================== ФОНОВАЯ ПРОВЕРКА ТАЙМЕРОВ ====================
async function checkExpiredTimers() {
    const user = getSession();
    if (!user) return;

    if (window._checkExpiredTimersRunning) return;
    window._checkExpiredTimersRunning = true;

    try {
        await ensureDb();

        const characters = await getUserCharacters(user.login);
        if (!characters || characters.length === 0) return;

        const now = Date.now();
        const savedFlags = JSON.parse(localStorage.getItem('timerHistoryFlags') || '{}');
        let flagsChanged = false;

        for (const char of characters) {
            const timers = await getCharacterTimers(char.id);
            if (!timers || timers.length === 0) continue;

            for (const timer of timers) {
                if (!timer.is_active) continue;

                const remaining = timer.end_time - now;

                if (remaining <= 0 && !savedFlags[timer.id]) {
                    // Сразу ставим флаг чтобы не было дублей
                    savedFlags[timer.id] = true;
                    flagsChanged = true;

                    addNotification(`⏰ Таймер завершён! [${char.name}] — ${timer.quest_name}`);
                    playNotificationSound();

                    await addTimerHistory({
                        timer_id: timer.id,
                        character_id: char.id,
                        quest_name: timer.quest_name,
                        start_time: new Date(timer.end_time - timer.duration).toISOString(),
                        end_time: new Date(timer.end_time).toISOString(),
                        duration: timer.duration,
                        notes: timer.notes || ''
                    });

                    await toggleTimerActive(timer.id, false);
                }
            }
        }

        if (flagsChanged) {
            localStorage.setItem('timerHistoryFlags', JSON.stringify(savedFlags));
        }

    } catch (e) {
        console.error('checkExpiredTimers error:', e);
    } finally {
        window._checkExpiredTimersRunning = false;
    }
}

// ==================== УВЕДОМЛЕНИЯ ====================

let notifications = [];

// Добавление иконки колокольчика в шапку сайта
function addBellToHeader() {
    const headerWrapper = document.querySelector('.header-wrapper');
    if(!headerWrapper || document.querySelector('.notification-bell')) return;
    
    const rightLink = headerWrapper.querySelector('a:last-child');
    
    const bellHtml = `
        <div class="notification-bell" onclick="event.stopPropagation(); toggleNotificationDropdown()">
            <div class="bell-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            </div>
            <div class="bell-badge" id="notificationBadge" style="display:none;">0</div>
            <div class="notification-dropdown" id="notificationDropdown">
                <div class="notification-header">
                    <span>🔔 Уведомления (<span id="unreadCount">0</span>)</span>
                    <div class="notification-header-buttons">
                        <button onclick="event.stopPropagation(); markAllNotificationsRead()">📖 Все</button>
                        <button onclick="event.stopPropagation(); clearAllNotifications()">🗑️ Очистить</button>
                    </div>
                </div>
                <div class="notification-list" id="notificationList"></div>
            </div>
        </div>
    `;
    
    if(rightLink) {
        rightLink.insertAdjacentHTML('beforebegin', bellHtml);
    } else {
        headerWrapper.insertAdjacentHTML('beforeend', bellHtml);
    }
    
    document.addEventListener('click', function(e) {
        if(!e.target.closest('.notification-bell')) {
            const dropdown = document.getElementById('notificationDropdown');
            if(dropdown) dropdown.classList.remove('show');
        }
    });
}

function addNotification(text) {
    try {
        const saved = localStorage.getItem('mb_notifications');
        if (saved) notifications = JSON.parse(saved);
    } catch { notifications = []; }

    notifications.unshift({
        text,
        time: new Date().toLocaleTimeString(),
        read: false
    });

    // Храним максимум 50 уведомлений
    if (notifications.length > 50) notifications = notifications.slice(0, 50);

    localStorage.setItem('mb_notifications', JSON.stringify(notifications));
    updateNotificationBadge();
}

window.addNotification = addNotification;
function initNotificationBell() {
    try {
        const saved = localStorage.getItem('mb_notifications');
        if (saved) notifications = JSON.parse(saved);
    } catch { notifications = []; }
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    const unread = notifications.filter(n => !n.read).length;
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
}

function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('show');
    if (dropdown.classList.contains('show')) renderNotifications();
}

function renderNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    if (notifications.length === 0) {
        list.innerHTML = '<div class="notification-empty">📭 Нет уведомлений</div>';
        return;
    }
    list.innerHTML = notifications.map((n, i) => `
        <div class="notification-item ${n.read ? 'read' : 'unread'}" onclick="markNotificationRead(${i})">
            <div class="notification-text">${escapeHtml(n.text)}</div>
            <div class="notification-time">${n.time || ''}</div>
        </div>
    `).join('');
}

function markNotificationRead(index) {
    if (notifications[index]) {
        notifications[index].read = true;
        localStorage.setItem('mb_notifications', JSON.stringify(notifications));
        updateNotificationBadge();
        renderNotifications();
    }
}

function markAllNotificationsRead() {
    notifications.forEach(n => n.read = true);
    localStorage.setItem('mb_notifications', JSON.stringify(notifications));
    updateNotificationBadge();
    renderNotifications();
}

function clearAllNotifications() {
    notifications = [];
    localStorage.setItem('mb_notifications', JSON.stringify(notifications));
    updateNotificationBadge();
    renderNotifications();
}

// ==================== ГЛОБАЛЬНЫЙ ПОИСК ====================

let globalSearchTimeout = null;

function toggleGlobalSearch() {
    const dropdown = document.getElementById('globalSearchDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('show');
    if (dropdown.classList.contains('show')) {
        setTimeout(() => {
            const input = document.getElementById('globalSearchInput');
            if (input) input.focus();
        }, 100);
    }
}

function addGlobalSearch() {
    const headerWrapper = document.querySelector('.header-wrapper');
    if(!headerWrapper || document.querySelector('.global-search')) return;
    
    const leftLink = headerWrapper.querySelector('a:first-child');
    
    if(leftLink) {
        leftLink.style.marginRight = '15px';
    }
    
    const searchHtml = `
        <div class="global-search">
            <div class="global-search-icon" onclick="event.stopPropagation(); toggleGlobalSearch()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>
            <div class="global-search-dropdown" id="globalSearchDropdown">
                <div class="global-search-input-container">
                    <input type="text" id="globalSearchInput" placeholder="🔍 Поиск предметов, рун, новостей..." autocomplete="off">
                </div>
                <div class="global-search-results" id="globalSearchResults"></div>
            </div>
        </div>
    `;
    
    if(leftLink) {
        leftLink.insertAdjacentHTML('afterend', searchHtml);
    } else {
        headerWrapper.insertAdjacentHTML('afterbegin', searchHtml);
    }
    
    const searchInput = document.getElementById('globalSearchInput');
    if(searchInput) {
        searchInput.addEventListener('input', function() {
            if(globalSearchTimeout) clearTimeout(globalSearchTimeout);
            globalSearchTimeout = setTimeout(performGlobalSearch, 300);
        });
        
        document.addEventListener('click', function(e) {
            if(!e.target.closest('.global-search')) {
                const dropdown = document.getElementById('globalSearchDropdown');
                if(dropdown) dropdown.classList.remove('show');
            }
        });
        
        searchInput.addEventListener('keydown', function(e) {
            if(e.key === 'Escape') {
                const dropdown = document.getElementById('globalSearchDropdown');
                if(dropdown) dropdown.classList.remove('show');
                searchInput.blur();
            }
        });
    }
}

async function performGlobalSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput) return;
    const searchTerm = searchInput.value.toLowerCase().trim();
    const resultsContainer = document.getElementById('globalSearchResults');
    if (!resultsContainer) return;
    if (searchTerm.length < 2) { resultsContainer.innerHTML = ''; return; }

    resultsContainer.innerHTML = '<div class="global-search-loading"><span>Поиск...</span></div>';
    await new Promise(resolve => setTimeout(resolve, 50));

    const [items, demons, totems, masterRunes, druidsRunes, nakolki, news, secretItems, secretSets, mapLocations] = await Promise.all([
        getItems(), getDemons(), getTotems(), getMasterRunes(), getDruidsRunes(),
        getNakolki(), getNews(), getSecretItems(), getSecretSets(), getMapLocations()
    ]);

    const results = [];
    const addResults = (arr, type, urlFn) => arr.forEach(item => {
        if ((item.name && item.name.toLowerCase().includes(searchTerm)) ||
            (item.description && item.description.toLowerCase().includes(searchTerm)) ||
            (item.title && item.title.toLowerCase().includes(searchTerm)) ||
            (item.content && item.content.toLowerCase().includes(searchTerm))) {
            results.push({ type, name: item.name || item.title, url: urlFn(item) });
        }
    });

    addResults(items, '📦 Предмет', i => `/items?id=${i.id}&open=modal`);
    addResults(demons, '👹 Круг демона', i => `/demon?id=${i.id}&open=modal`);
    addResults(totems, '🧪 Тотем', i => `/totem?id=${i.id}&open=modal`);
    addResults(masterRunes, '🏰 Руна мастера', i => `/master?id=${i.id}&open=modal`);
    addResults(druidsRunes, '🌿 Руна друидов', i => `/druids?id=${i.id}&open=modal`);
    addResults(nakolki, '🏚️ Квестовая руна', i => `/nakolki?id=${i.id}&open=modal`);
    addResults(news, '📰 Новость', i => `/news?id=${i.id}&open=modal`);
    addResults(secretItems, '🔮 Секретная вещь', i => `/secret_items?id=${i.id}&open=modal`);
    addResults(secretSets, '👘 Секретный сет', i => `/secret_sets?set=${i.id}&open=modal`);
    addResults(mapLocations, '🗺️ Локация', i => `/map?id=${i.id}&open=modal`);

    const limited = results.slice(0, 15);

    if (limited.length === 0) {
        resultsContainer.innerHTML = '<div class="global-search-empty">🔍 Ничего не найдено</div>';
        return;
    }

    resultsContainer.innerHTML = limited.map(res => `
        <div class="global-search-item" onclick="window.location.href='${res.url}'">
            <span class="global-search-type">${res.type}</span>
            <span class="global-search-name">${escapeHtml(res.name)}</span>
        </div>
    `).join('');
}

// ==================== URL-ПАРАМЕТРЫ ДЛЯ МОДАЛОК ====================

function openModalFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const open = params.get('open');
    if (id && open === 'modal' && typeof window.openItemModalById === 'function') {
        window.openItemModalById(parseInt(id));
    }
}

// ==================== УНИВЕРСАЛЬНАЯ МОДАЛКА ====================

window.showItemModal = function (item, category) {
    const questModal = document.getElementById('questModal');
    if (questModal && questModal.style.display === 'flex') {
        questModal.style.display = 'none';
    }

    let modal = document.getElementById('universalItemModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'universalItemModal';
        modal.className = 'rune-modal';
        modal.style.display = 'none';
        modal.style.zIndex = '10001';
        modal.innerHTML = `
            <div class="rune-modal-content">
                <div class="rune-modal-header">
                    <div class="rune-modal-close" onclick="window.closeUniversalItemModal()">✕</div>
                    <div class="rune-modal-icon">
                        <div class="item-icon shop-icon" id="universalModalIcon" style="width:80px;height:80px;background-image:url('img/shop.png');background-repeat:no-repeat;"></div>
                    </div>
                    <div class="rune-modal-title" id="universalModalTitle"></div>
                    <div class="rune-modal-subtitle" id="universalModalSubtitle"></div>
                </div>
                <div class="rune-modal-body">
                    <div class="rune-modal-stats">
                        <div class="rune-modal-stats-title">ХАРАКТЕРИСТИКИ</div>
                        <div id="universalModalStats"></div>
                    </div>
                    <div id="universalModalUniqueContainer" class="item-card-unique" style="display:none;">
                        <div class="item-card-unique-title">УНИКАЛЬНЫЕ ХАРАКТЕРИСТИКИ</div>
                        <ul id="universalModalUniqueList"></ul>
                    </div>
                    <div class="rune-modal-description" id="universalModalDescription"></div>
                </div>
                <div class="rune-modal-footer">
                    <button class="rune-modal-btn" onclick="window.closeUniversalItemModal()">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const iconEl = document.getElementById('universalModalIcon');
    const titleEl = document.getElementById('universalModalTitle');
    const subtitleEl = document.getElementById('universalModalSubtitle');
    const statsContainer = document.getElementById('universalModalStats');
    const uniqueContainer = document.getElementById('universalModalUniqueContainer');
    const uniqueList = document.getElementById('universalModalUniqueList');
    const descEl = document.getElementById('universalModalDescription');

    if (iconEl && item.icon_row !== undefined && item.icon_col !== undefined) {
        iconEl.style.backgroundPosition = `-${item.icon_col * 80}px -${item.icon_row * 80}px`;
    }

    if (titleEl) titleEl.innerText = item.name || 'Без названия';

    let typeText = '';
    if (category === 'demon') typeText = 'Демон';
    else if (category === 'rune') typeText = 'Руна';
    else if (category === 'item') typeText = item.type || 'Предмет';
    else if (category === 'secret') typeText = item.type === 'temporary' ? 'Временное' : 'Постоянное';
    else if (category === 'enhancement') typeText = item.type === 'temporary' ? 'Временное усиление' : 'Постоянное усиление';

    if (subtitleEl) subtitleEl.innerHTML = [item.level ? `Уровень ${item.level}` : '', typeText].filter(Boolean).join(' | ');
    if (descEl) descEl.innerHTML = item.description ? escapeHtml(item.description) : 'Описание отсутствует';

    if (statsContainer && typeof renderStats === 'function') {
        renderStats(item.stats || {}, statsContainer);
    }

    if (item.unique_stats && item.unique_stats.length > 0) {
        if (uniqueContainer) uniqueContainer.style.display = 'block';
        if (uniqueList) uniqueList.innerHTML = item.unique_stats.map(u => `<li>${escapeHtml(u)}</li>`).join('');
    } else {
        if (uniqueContainer) uniqueContainer.style.display = 'none';
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeUniversalItemModal = function () {
    const modal = document.getElementById('universalItemModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.openItemModalById = async function (itemId, category) {
    let item = null;
    try {
        switch (category) {
            case 'secret': item = await getSecretItemById(itemId); break;
            case 'demon': item = await getDemonById(itemId); break;
            case 'rune':
                item = await getMasterRuneById(itemId);
                if (!item) item = await getDruidsRuneById(itemId);
                if (!item) item = await getNakolkiById(itemId);
                break;
            case 'item': item = await getItemById(itemId); break;
            case 'enhancement': item = await getEnhancementById(itemId); break;
            default: item = await getSecretItemById(itemId);
        }
    } catch (e) {
        console.error('Ошибка:', e);
        return;
    }
    if (!item) return;
    window.showItemModal(item, category);
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', function () {
    displayAdminPanel();
    openModalFromUrl();
});

// Экспорт
window.toggleGlobalSearch = toggleGlobalSearch;
window.toggleNotificationDropdown = toggleNotificationDropdown;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.clearAllNotifications = clearAllNotifications;
window.toggleSound = toggleSound;
window.openModalFromUrl = openModalFromUrl;
