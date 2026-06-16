// ==================== АДМИН-ПАНЕЛЬ (admin.js) ====================
const user = checkAuth();
if (!user || user.role !== 'admin') {
    alert('Доступ запрещён!');
    window.location.href = '/';
}

let currentType = null, currentId = null, currentPickerCallback = null;
let allItemsData = [];
let allEnhancementsAdmin = [];

// ==================== ЗАГРУЗКА ТАБЛИЦ ====================
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-panel-content').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Panel').classList.add('active');
        loadTable(tab.dataset.tab);
    });
});

async function loadTable(type) {
    if (type === 'items') {
        await loadItemsWithSearch();
        const searchInput = document.getElementById('searchItems');
        if (searchInput && !searchInput.hasListener) {
            searchInput.addEventListener('input', () => renderItemsWithSearch());
            searchInput.hasListener = true;
        }
    }
    if (type === 'demons') renderDemons(await getDemons());
    if (type === 'totems') renderTotems(await getTotems());
    if (type === 'master') renderMaster(await getMasterRunes());
    if (type === 'druids') renderDruids(await getDruidsRunes());
    if (type === 'nakolki') renderNakolki(await getNakolki());
    if (type === 'news') renderNews(await getNews());
    if (type === 'users') renderUsers(await getUsers());
    if (type === 'enhancements') {
        allEnhancementsAdmin = await getEnhancements();
        renderEnhancements(allEnhancementsAdmin);
    }
    if (type === 'secret_items') {
        await loadSecretItemsAdmin();
        const searchInput = document.getElementById('searchSecretItemsAdmin');
        if (searchInput && !searchInput.hasListener) {
            searchInput.addEventListener('input', () => filterSecretItemsAdmin());
            searchInput.hasListener = true;
        }
    }
    if (type === 'secret_sets') {
        await loadSecretSetsAdmin();
    }
    if (type === 'secret_set_items') {
        await initSecretSetItemsPanel();
    }
    if (type === 'quests') {
    await loadQuestsAdmin();
    const searchInput = document.getElementById('searchQuestsAdmin');
    if (searchInput && !searchInput.hasListener) {
        searchInput.addEventListener('input', () => filterQuestsAdmin());
        searchInput.hasListener = true;}
    }
}

// ==================== ПОИСК В АДМИНКЕ ====================
async function loadItemsWithSearch() {
    allItemsData = await getItems();
    renderItemsWithSearch();
}

function renderItemsWithSearch() {
    const tbody = document.getElementById('itemsList');
    if (!tbody) return;

    const searchTerm = document.getElementById('searchItems') ? document.getElementById('searchItems').value.toLowerCase().trim() : '';

    let filtered = [...allItemsData];
    if (searchTerm !== '') {
        filtered = filtered.filter(item => item.name.toLowerCase().includes(searchTerm));
    }

    let html = '';
    for (const d of filtered) {
        html += `<tr>
            <td>${d.id}</td>
            <td>${escapeHtml(d.name)}</td>
            <td>${escapeHtml(d.type)}</td>
            <td>${d.level}</td>
            <td>${getRussianStyleText(d.style)}</td>
            <td><button class="edit-btn" onclick="openModal('items',${d.id})">✏️</button><button class="delete-btn" onclick="deleteRow('items',${d.id})">🗑️</button></td>
        </tr>`;
    }
    tbody.innerHTML = html;
}

function clearSearch() {
    const searchInput = document.getElementById('searchItems');
    if (searchInput) {
        searchInput.value = '';
        renderItemsWithSearch();
    }
}

// ==================== РЕНДЕР ФУНКЦИИ ====================
function renderItems(data) {
    const tbody = document.getElementById('itemsList');
    if (!tbody) return;
    let html = '';
    for (const d of data) html += `<tr>
        <td>${d.id}</td>
        <td>${escapeHtml(d.name)}</td>
        <td>${escapeHtml(d.type)}</td>
        <td>${d.level}</td>
        <td>${getRussianStyleText(d.style)}</td>
        <td><button class="edit-btn" onclick="openModal('items',${d.id})">✏️</button><button class="delete-btn" onclick="deleteRow('items',${d.id})">🗑️</button></td>
    </tr>`;
    tbody.innerHTML = html;
}

function renderDemons(data) {
    const tbody = document.getElementById('demonsList');
    if (!tbody) return;
    let html = '';
    for (const d of data) html += `<tr>
        <td>${d.id}</td>
        <td>${escapeHtml(d.name)}</td>
        <td>${d.level}</td>
        <td><button class="edit-btn" onclick="openModal('demons',${d.id})">✏️</button><button class="delete-btn" onclick="deleteRow('demons',${d.id})">🗑️</button></td>
    </tr>`;
    tbody.innerHTML = html;
}

function renderTotems(data) {
    const tbody = document.getElementById('totemsList');
    if (!tbody) return;
    let html = '';
    for (const d of data) html += `<tr>
        <td>${d.id}</td>
        <td>${escapeHtml(d.name)}</td>
        <td>${d.level}</td>
        <td>${d.required_level}</td>
        <td><button class="edit-btn" onclick="openModal('totems',${d.id})">✏️</button><button class="delete-btn" onclick="deleteRow('totems',${d.id})">🗑️</button></td>
    </tr>`;
    tbody.innerHTML = html;
}

function renderMaster(data) {
    const tbody = document.getElementById('masterList');
    if (!tbody) return;
    let html = '';
    for (const d of data) html += `<tr>
        <td>${d.id}</td>
        <td>${escapeHtml(d.name)}</td>
        <td>${d.level}</td>
        <td><button class="edit-btn" onclick="openModal('master',${d.id})">✏️</button><button class="delete-btn" onclick="deleteRow('master',${d.id})">🗑️</button></td>
    </tr>`;
    tbody.innerHTML = html;
}

function renderDruids(data) {
    const tbody = document.getElementById('druidsList');
    if (!tbody) return;
    let html = '';
    for (const d of data) html += `<tr>
        <td>${d.id}</td>
        <td>${escapeHtml(d.name)}</td>
        <td>${d.level}</td>
        <td><button class="edit-btn" onclick="openModal('druids',${d.id})">✏️</button><button class="delete-btn" onclick="deleteRow('druids',${d.id})">🗑️</button></td>
    </tr>`;
    tbody.innerHTML = html;
}

function renderNakolki(data) {
    const tbody = document.getElementById('nakolkiList');
    if (!tbody) return;
    let html = '';
    for (const d of data) html += `<tr>
        <td>${d.id}</td>
        <td>${escapeHtml(d.name)}</td>
        <td>${d.level}</td>
        <td><button class="edit-btn" onclick="openModal('nakolki',${d.id})">✏️</button><button class="delete-btn" onclick="deleteRow('nakolki',${d.id})">🗑️</button></td>
    </tr>`;
    tbody.innerHTML = html;
}

function renderNews(data) {
    const tbody = document.getElementById('newsList');
    if (!tbody) return;
    let html = '';
    for (const d of data) html += `<tr>
        <td>${d.id}</td>
        <td>${escapeHtml(d.title)}</td>
        <td>${d.date}</td>
        <td><button class="edit-btn" onclick="openModal('news',${d.id})">✏️</button><button class="delete-btn" onclick="deleteRow('news',${d.id})">🗑️</button></td>
    </tr>`;
    tbody.innerHTML = html;
}

function renderUsers(data) {
    const tbody = document.getElementById('usersList');
    if (!tbody) return;
    let html = '';
    for (const d of data) html += `<tr>
        <td>${d.id}</td>
        <td>${escapeHtml(d.login)}</td>
        <td>${escapeHtml(d.email || '-')}</td>
        <td>${d.role}</td>
        <td><button class="delete-btn" onclick="deleteUser(${d.id})">🗑️</button></td>
    </tr>`;
    tbody.innerHTML = html;
}

// ==================== УСИЛЕНИЯ (ENHANCEMENTS) ====================
function renderEnhancements(data) {
    const tbody = document.getElementById('enhancementsList');
    if (!tbody) return;
    let html = '';
    for (const d of data) {
        const typeText = d.type === 'temporary' ? '⏳ Временное' : '♾️ Постоянное';
        html += `<tr>
            <td>${d.id}</td>
            <td><div class="shop-icon" style="--row:${d.icon_row}; --col:${d.icon_col}; width:80px; height:80px;"></div></td>
            <td>${escapeHtml(d.name)}</td>
            <td>${typeText}</td>
            <td>${escapeHtml(d.expiry_text || '—')}</td>
            <td>${d.level}</td>
            <td>${escapeHtml((d.how_to_get || '').substring(0, 30))}${(d.how_to_get || '').length > 30 ? '...' : ''}</td>
            <td><button class="edit-btn" onclick="openModal('enhancements',${d.id})">✏️</button><button class="delete-btn" onclick="deleteRow('enhancements',${d.id})">🗑️</button></td>
        </tr>`;
    }
    tbody.innerHTML = html;
    
    const searchInput = document.getElementById('searchEnhancementsAdmin');
    if (searchInput && !searchInput.hasListener) {
        searchInput.addEventListener('input', () => filterEnhancementsAdmin());
        searchInput.hasListener = true;
    }
}

function filterEnhancementsAdmin() {
    const searchTerm = document.getElementById('searchEnhancementsAdmin').value.toLowerCase().trim();
    if (!searchTerm) {
        renderEnhancements(allEnhancementsAdmin);
        return;
    }
    const filtered = allEnhancementsAdmin.filter(e => e.name.toLowerCase().includes(searchTerm));
    renderEnhancements(filtered);
}

function clearEnhancementsSearch() {
    document.getElementById('searchEnhancementsAdmin').value = '';
    renderEnhancements(allEnhancementsAdmin);
}

// ==================== УДАЛЕНИЕ ====================
async function deleteRow(type, id) {
    if (confirm('Удалить?')) {
        if (type === 'items') await deleteItemById(id);
        if (type === 'demons') await deleteDemonById(id);
        if (type === 'totems') await deleteTotemById(id);
        if (type === 'master') await deleteMasterRuneById(id);
        if (type === 'druids') await deleteDruidsRuneById(id);
        if (type === 'nakolki') await deleteNakolkiById(id);
        if (type === 'news') await deleteNewsById(id);
        if (type === 'enhancements') await deleteEnhancementById(id);
        loadTable(type);
    }
}

async function deleteUser(id) {
    if (confirm('Удалить пользователя?')) {
        await db.from('users').delete().eq('id', id);
        loadTable('users');
    }
}

// ==================== ПРОВЕРКА ДУБЛИКАТОВ ====================
async function checkDuplicateItem(itemName, itemType, currentId = null) {
    const allItems = await getItems();
    const duplicate = allItems.find(item =>
        item.name.toLowerCase() === itemName.toLowerCase() &&
        item.type.toLowerCase() === itemType.toLowerCase() &&
        (currentId === null || item.id !== currentId)
    );
    return duplicate !== undefined;
}

async function checkDuplicateGeneric(itemName, currentId = null, getFunction) {
    const allItems = await getFunction();
    const duplicate = allItems.find(item =>
        item.name.toLowerCase() === itemName.toLowerCase() &&
        (currentId === null || item.id !== currentId)
    );
    return duplicate !== undefined;
}

// ==================== ПИКЕР ИКОНОК (shop.png) ====================
function showIconPicker(callback, buttonElement) {
    currentPickerCallback = callback;
    const grid = document.getElementById('iconPicker');
    const gridInner = document.getElementById('iconPickerGrid');
    gridInner.innerHTML = '';
    for (let r = 0; r < 34; r++) {
        for (let c = 0; c < 9; c++) {
            const div = document.createElement('div');
            div.className = 'icon-cell';
            div.style.backgroundPosition = `-${c * 80}px -${r * 80}px`;
            div.onclick = (function (row, col) { return function () { if (currentPickerCallback) currentPickerCallback(row, col); grid.style.display = 'none'; }; })(r, c);
            gridInner.appendChild(div);
        }
    }
    const btnRect = buttonElement.getBoundingClientRect();
    grid.style.position = 'fixed';
    grid.style.top = (btnRect.bottom + 5) + 'px';
    grid.style.left = (btnRect.left) + 'px';
    grid.style.display = 'block';
}

// ==================== ОТКРЫТИЕ МОДАЛКИ ====================
async function openModal(type, id = null) {
    currentType = type;
    currentId = id;
    document.getElementById('modalTitle').innerText = id ? '✏️ Редактировать' : '➕ Добавить';
    const container = document.getElementById('modalFields');
    let data = null;
    if (id) {
        if (type === 'items') data = await getItemById(id);
        if (type === 'demons') data = await getDemonById(id);
        if (type === 'totems') data = await getTotemById(id);
        if (type === 'master') data = await getMasterRuneById(id);
        if (type === 'druids') data = await getDruidsRuneById(id);
        if (type === 'nakolki') data = await getNakolkiById(id);
        if (type === 'news') data = await getNewsById(id);
        if (type === 'enhancements') data = await getEnhancementById(id);
    }
    let html = '';

    if (type === 'items') {
        const typeOptions = ['Оружие', 'Щит', 'Броня', 'Зелье', 'Свиток', 'Амулет', 'Кольцо', 'Разное'];
        let typeSelect = '<select id="itemType" class="form-control">';
        for (let opt of typeOptions) { const selected = (data && data.type === opt) ? 'selected' : ''; typeSelect += `<option value="${opt}" ${selected}>${opt}</option>`; }
        typeSelect += '</select>';
        const styleOptions = ['', 'rare', 'uncommon', 'armor', 'epic'];
        const styleNames = ['— Нет —', 'Урон', 'Уворот', 'Броня', 'Элита'];
        let styleSelect = '<select id="itemStyle" class="form-control">';
        for (let i = 0; i < styleOptions.length; i++) { const selected = (data && data.style === styleOptions[i]) ? 'selected' : ''; styleSelect += `<option value="${styleOptions[i]}" ${selected}>${styleNames[i]}</option>`; }
        styleSelect += '</select>';
        html = `<div class="form-row"><div class="form-group"><label>📝 Название</label><input type="text" id="itemName" value="${data ? escapeHtml(data.name) : ''}"></div></div>
        <div class="form-row"><div class="form-group"><label>📌 Тип</label>${typeSelect}</div><div class="form-group"><label>⭐ Уровень</label><input type="number" id="itemLevel" value="${data ? data.level : ''}"></div></div>
        <div class="form-row"><div class="form-group"><label>✨ Стиль</label>${styleSelect}</div></div>
        <div class="form-group"><button type="button" class="cat-btn" onclick="showIconPicker((r,c)=>{document.getElementById('iconRow').value=r; document.getElementById('iconCol').value=c; document.getElementById('iconPreview').innerHTML='✅ Выбрано: ряд '+(r+1)+', колонка '+(c+1);}, this)">🎨 Выбрать иконку</button><div id="iconPreview" class="icon-preview">${data ? `Текущая: ряд ${data.icon_row + 1}, колонка ${data.icon_col + 1}` : '❌ Не выбрано'}</div><input type="hidden" id="iconRow" value="${data ? data.icon_row : 19}"><input type="hidden" id="iconCol" value="${data ? data.icon_col : 4}"></div>
        <div class="stats-grid" id="statsGrid"></div>
        <div class="form-group"><label>📝 Описание</label><textarea id="description" rows="3" placeholder="Описание предмета...">${data ? escapeHtml(data.description || '') : ''}</textarea></div>
        <div class="unique-container" id="uniqueContainer"></div>
        <button type="button" class="add-stat-btn" onclick="addUniqueField()">➕ Добавить уникальную характеристику</button>`;
        container.innerHTML = html;

        const nameInput = document.getElementById('itemName');
        const typeSelectEl = document.getElementById('itemType');
        const saveBtn = document.querySelector('.modal-buttons .cat-btn:first-child');

        async function checkItemDuplicate() {
            const currentName = nameInput ? nameInput.value.trim() : '';
            const currentType = typeSelectEl ? typeSelectEl.value : '';
            if (!currentName) {
                let existingWarning = document.getElementById('duplicateWarning');
                if (existingWarning) existingWarning.remove();
                if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer'; }
                return;
            }
            const allItems = await getItems();
            const isDuplicate = allItems.find(item =>
                item.name.toLowerCase() === currentName.toLowerCase() &&
                item.type.toLowerCase() === currentType.toLowerCase() &&
                (currentId === null || item.id !== currentId)
            );
            let warning = document.getElementById('duplicateWarning');
            if (isDuplicate) {
                if (!warning) {
                    const formRow = document.querySelector('#modalFields .form-row');
                    const div = document.createElement('div');
                    div.id = 'duplicateWarning';
                    div.style.cssText = 'background:rgba(255,68,68,0.2);border:1px solid #ff4444;border-radius:8px;padding:8px;margin-top:10px;text-align:center;color:#ff8888;font-size:12px;';
                    div.innerHTML = `⚠️ ПРЕДУПРЕЖДЕНИЕ! Предмет "${currentName}" (${currentType}) уже существует!`;
                    if (formRow) formRow.after(div);
                    else document.getElementById('modalFields').appendChild(div);
                } else {
                    warning.innerHTML = `⚠️ ПРЕДУПРЕЖДЕНИЕ! Предмет "${currentName}" (${currentType}) уже существует!`;
                    warning.style.display = 'block';
                }
                if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; saveBtn.style.cursor = 'not-allowed'; }
            } else {
                if (warning) warning.remove();
                if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer'; }
            }
        }
        if (nameInput) nameInput.addEventListener('input', checkItemDuplicate);
        if (typeSelectEl) typeSelectEl.addEventListener('change', checkItemDuplicate);
    }
    else if (type === 'demons' || type === 'totems' || type === 'master' || type === 'druids' || type === 'nakolki') {
        let extraField = '';
        if (type === 'totems') extraField = `<div class="form-group"><label>⭐ Требуемый уровень</label><input type="number" id="requiredLevel" value="${data ? data.required_level : ''}"></div>`;
        html = `<div class="form-row"><div class="form-group"><label>📝 Название</label><input type="text" id="itemName" value="${data ? escapeHtml(data.name) : ''}"></div></div>
        <div class="form-row"><div class="form-group"><label>⭐ Уровень</label><input type="number" id="itemLevel" value="${data ? data.level : ''}"></div>${extraField ? `<div class="form-group">${extraField}</div>` : ''}</div>
        <div class="form-group"><button type="button" class="cat-btn" onclick="showIconPicker((r,c)=>{document.getElementById('iconRow').value=r; document.getElementById('iconCol').value=c; document.getElementById('iconPreview').innerHTML='✅ Выбрано: ряд '+(r+1)+', колонка '+(c+1);}, this)">🎨 Выбрать иконку</button><div id="iconPreview" class="icon-preview">${data ? `Текущая: ряд ${data.icon_row + 1}, колонка ${data.icon_col + 1}` : '❌ Не выбрано'}</div><input type="hidden" id="iconRow" value="${data ? data.icon_row : 19}"><input type="hidden" id="iconCol" value="${data ? data.icon_col : 4}"></div>
        <div class="stats-grid" id="statsGrid"></div>
        <div class="form-group"><label>📝 Описание</label><textarea id="description" rows="3" placeholder="Описание...">${data ? escapeHtml(data.description || '') : ''}</textarea></div>`;
        container.innerHTML = html;

        const nameInput = document.getElementById('itemName');
        const saveBtn = document.querySelector('.modal-buttons .cat-btn:first-child');
        let getFunction = null;
        if (type === 'demons') getFunction = getDemons;
        else if (type === 'totems') getFunction = getTotems;
        else if (type === 'master') getFunction = getMasterRunes;
        else if (type === 'druids') getFunction = getDruidsRunes;
        else if (type === 'nakolki') getFunction = getNakolki;

        async function checkGenericDuplicate() {
            const currentName = nameInput ? nameInput.value.trim() : '';
            if (!currentName) {
                let existingWarning = document.getElementById('duplicateWarning');
                if (existingWarning) existingWarning.remove();
                if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer'; }
                return;
            }
            const allItems = await getFunction();
            const isDuplicate = allItems.find(item =>
                item.name.toLowerCase() === currentName.toLowerCase() &&
                (currentId === null || item.id !== currentId)
            );
            let warning = document.getElementById('duplicateWarning');
            if (isDuplicate) {
                if (!warning) {
                    const formRow = document.querySelector('#modalFields .form-row');
                    const div = document.createElement('div');
                    div.id = 'duplicateWarning';
                    div.style.cssText = 'background:rgba(255,68,68,0.2);border:1px solid #ff4444;border-radius:8px;padding:8px;margin-top:10px;text-align:center;color:#ff8888;font-size:12px;';
                    div.innerHTML = `⚠️ ПРЕДУПРЕЖДЕНИЕ! "${currentName}" уже существует!`;
                    if (formRow) formRow.after(div);
                    else document.getElementById('modalFields').appendChild(div);
                } else {
                    warning.innerHTML = `⚠️ ПРЕДУПРЕЖДЕНИЕ! "${currentName}" уже существует!`;
                    warning.style.display = 'block';
                }
                if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; saveBtn.style.cursor = 'not-allowed'; }
            } else {
                if (warning) warning.remove();
                if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer'; }
            }
        }
        if (nameInput) nameInput.addEventListener('input', checkGenericDuplicate);
    }
    else if (type === 'enhancements') {
        const typeOptions = [
            {value: 'temporary', label: '⏳ Временное'},
            {value: 'permanent', label: '♾️ Постоянное'}
        ];
        let typeSelect = '<select id="enhType" class="form-control">';
        for (let opt of typeOptions) {
            const selected = (data && data.type === opt.value) ? 'selected' : '';
            typeSelect += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
        }
        typeSelect += '</select>';
        
        html = `<div class="form-row"><div class="form-group"><label>📝 Название</label><input type="text" id="itemName" value="${data ? escapeHtml(data.name) : ''}"></div></div>
        <div class="form-row"><div class="form-group"><label>📌 Тип</label>${typeSelect}</div><div class="form-group"><label>⭐ Уровень</label><input type="number" id="itemLevel" value="${data ? data.level : 1}"></div></div>
        <div class="form-row"><div class="form-group"><label>📅 Годность (текст)</label><input type="text" id="expiryText" value="${data ? escapeHtml(data.expiry_text || '') : ''}" placeholder="Например: 2 часа, 1 день, ∞"></div></div>
        <div class="form-group"><button type="button" class="cat-btn" onclick="showIconPicker((r,c)=>{document.getElementById('iconRow').value=r; document.getElementById('iconCol').value=c; document.getElementById('iconPreview').innerHTML='✅ Выбрано: ряд '+(r+1)+', колонка '+(c+1);}, this)">🎨 Выбрать иконку</button><div id="iconPreview" class="icon-preview">${data ? `Текущая: ряд ${data.icon_row + 1}, колонка ${data.icon_col + 1}` : '❌ Не выбрано'}</div><input type="hidden" id="iconRow" value="${data ? data.icon_row : 0}"><input type="hidden" id="iconCol" value="${data ? data.icon_col : 0}"></div>
        <div class="stats-grid" id="statsGrid"></div>
        <div class="form-group"><label>📝 Описание</label><textarea id="description" rows="3" placeholder="Описание усиления...">${data ? escapeHtml(data.description || '') : ''}</textarea></div>
        <div class="form-group"><label>🎯 Способ получения</label><textarea id="howToGet" rows="2" placeholder="Где и как получить это усиление...">${data ? escapeHtml(data.how_to_get || '') : ''}</textarea></div>`;
        container.innerHTML = html;
    }
    else if (type === 'news') {
        const categoryOptions = ['default', 'update', 'event', 'patch'];
        const categoryNames = ['📰 Обычная', '⚙️ Обновление', '🎉 Событие', '🔧 Патч'];
        let categorySelect = '<select id="newsCategory" class="form-control">';
        for (let i = 0; i < categoryOptions.length; i++) {
            const selected = (data && data.category === categoryOptions[i]) ? 'selected' : '';
            categorySelect += `<option value="${categoryOptions[i]}" ${selected}>${categoryNames[i]}</option>`;
        }
        categorySelect += '</select>';

        html = `<div class="form-row"><div class="form-group"><label>📰 Заголовок</label><input type="text" id="newsTitle" value="${data ? escapeHtml(data.title) : ''}"></div></div>
        <div class="form-row"><div class="form-group"><label>🏷️ Категория</label>${categorySelect}</div></div>
        <div class="form-group"><label>📄 Текст</label><textarea id="newsContent" rows="5">${data ? escapeHtml(data.content) : ''}</textarea></div>
        <div class="form-group"><label>✍️ Подпись</label><input type="text" id="newsFooter" value="${data ? escapeHtml(data.footer || 'С уважением, команда MMOBitva!') : 'С уважением, команда MMOBitva!'}" placeholder="Подпись в конце новости"></div>
        <div class="form-group"><label>📅 Дата</label><input type="date" id="newsDate" value="${data ? data.date : ''}"></div>`;
        container.innerHTML = html;

        const titleInput = document.getElementById('newsTitle');
        const saveBtn = document.querySelector('.modal-buttons .cat-btn:first-child');

        async function checkNewsDuplicate() {
            const currentTitle = titleInput ? titleInput.value.trim() : '';
            if (!currentTitle) {
                let existingWarning = document.getElementById('duplicateWarning');
                if (existingWarning) existingWarning.remove();
                if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer'; }
                return;
            }
            const allNews = await getNews();
            const isDuplicate = allNews.find(item =>
                item.title.toLowerCase() === currentTitle.toLowerCase() &&
                (currentId === null || item.id !== currentId)
            );
            let warning = document.getElementById('duplicateWarning');
            if (isDuplicate) {
                if (!warning) {
                    const formRow = document.querySelector('#modalFields .form-row');
                    const div = document.createElement('div');
                    div.id = 'duplicateWarning';
                    div.style.cssText = 'background:rgba(255,68,68,0.2);border:1px solid #ff4444;border-radius:8px;padding:8px;margin-top:10px;text-align:center;color:#ff8888;font-size:12px;';
                    div.innerHTML = `⚠️ ПРЕДУПРЕЖДЕНИЕ! Новость с заголовком "${currentTitle}" уже существует!`;
                    if (formRow) formRow.after(div);
                    else document.getElementById('modalFields').appendChild(div);
                } else {
                    warning.innerHTML = `⚠️ ПРЕДУПРЕЖДЕНИЕ! Новость с заголовком "${currentTitle}" уже существует!`;
                    warning.style.display = 'block';
                }
                if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; saveBtn.style.cursor = 'not-allowed'; }
            } else {
                if (warning) warning.remove();
                if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; saveBtn.style.cursor = 'pointer'; }
            }
        }
        if (titleInput) titleInput.addEventListener('input', checkNewsDuplicate);
    }

    // Общая часть для статов
    if (type !== 'news') {
        const stats = data ? data.stats : {};
        const statsList = (type === 'items') ? ['уровень', 'износ', 'количество', 'годность', 'точность', 'урон', 'блок', 'оглушение', 'уворот', 'броня', 'здоровье'] : ['точность', 'урон', 'блок', 'оглушение', 'уворот', 'броня', 'здоровье'];
        const icons = { 'уровень': 'stat-icon-уровень', 'износ': 'stat-icon-износ', 'количество': 'stat-icon-количество', 'годность': 'stat-icon-годность', 'точность': 'stat-icon-точность', 'урон': 'stat-icon-урон', 'блок': 'stat-icon-блок', 'уворот': 'stat-icon-уворот', 'оглушение': 'stat-icon-оглушение', 'броня': 'stat-icon-броня', 'здоровье': 'stat-icon-здоровье' };
        const names = { 'уровень': 'Уровень', 'износ': 'Износ', 'количество': 'Количество', 'годность': 'Годность', 'точность': 'Точность', 'урон': 'Урон', 'блок': 'Блок', 'оглушение': 'Оглушение', 'уворот': 'Уворот', 'броня': 'Броня', 'здоровье': 'Здоровье' };
        const statsGrid = document.getElementById('statsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = '';
            statsList.forEach(stat => {
                const div = document.createElement('div');
                div.className = 'stat-field';
                div.innerHTML = `<label><span class="stat-icon ${icons[stat]}"></span> ${names[stat]}:</label><input type="text" class="stat-${stat}" value="${stats[stat] || ''}" placeholder="Значение">`;
                statsGrid.appendChild(div);
            });
        }
        if (type === 'items') {
            const uniqueStats = data ? (data.unique_stats || []) : [];
            const uniqueContainer = document.getElementById('uniqueContainer');
            if (uniqueContainer) {
                uniqueContainer.innerHTML = '';
                uniqueStats.forEach(u => addUniqueField(u));
            }
        }
    }

    document.getElementById('editModal').style.display = 'flex';
}

function addUniqueField(value = '') {
    const container = document.getElementById('uniqueContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'unique-row';
    div.innerHTML = `<input type="text" class="unique-value" value="${escapeHtml(value)}" placeholder="Уникальная характеристика"><button onclick="this.parentElement.remove()">🗑️</button>`;
    container.appendChild(div);
}

function collectStats(type) {
    const stats = {};
    const statsList = (type === 'items') ? ['уровень', 'износ', 'количество', 'годность', 'точность', 'урон', 'блок', 'оглушение', 'уворот', 'броня', 'здоровье'] : ['точность', 'урон', 'блок', 'оглушение', 'уворот', 'броня', 'здоровье'];
    statsList.forEach(stat => { const input = document.querySelector(`.stat-${stat}`); if (input && input.value.trim()) stats[stat] = input.value.trim(); });
    return stats;
}

function collectUniqueStats() {
    const unique = [];
    document.querySelectorAll('.unique-value').forEach(input => { if (input.value.trim()) unique.push(input.value.trim()); });
    return unique;
}

// ==================== СОХРАНЕНИЕ ====================
async function saveData() {
    let item = {};

    if (currentType === 'items') {
        const itemName = document.getElementById('itemName').value.trim();
        const itemType = document.getElementById('itemType').value;
        const itemDescription = document.getElementById('description') ? document.getElementById('description').value.trim() : '';
        if (!itemName) { alert('❌ Введите название предмета!'); return; }
        const isDuplicate = await checkDuplicateItem(itemName, itemType, currentId);
        if (isDuplicate) { alert(`❌ Ошибка! Предмет "${itemName}" с типом "${itemType}" уже существует!`); return; }
        item = {
            name: itemName, type: itemType, level: parseInt(document.getElementById('itemLevel').value),
            style: document.getElementById('itemStyle').value, icon: 'shop-icon',
            icon_row: parseInt(document.getElementById('iconRow').value), icon_col: parseInt(document.getElementById('iconCol').value),
            stats: collectStats('items'), unique_stats: collectUniqueStats(), description: itemDescription
        };
        if (currentId) item.id = currentId;
        await saveItem(item);
    }
    else if (currentType === 'demons') {
        const itemName = document.getElementById('itemName').value.trim();
        const itemDescription = document.getElementById('description') ? document.getElementById('description').value.trim() : '';
        if (!itemName) { alert('❌ Введите название!'); return; }
        const isDuplicate = await checkDuplicateGeneric(itemName, currentId, getDemons);
        if (isDuplicate) { alert(`❌ Ошибка! Демон "${itemName}" уже существует!`); return; }
        item = {
            name: itemName, level: parseInt(document.getElementById('itemLevel').value), icon: 'shop-icon',
            icon_row: parseInt(document.getElementById('iconRow').value), icon_col: parseInt(document.getElementById('iconCol').value),
            stats: collectStats('default'), description: itemDescription
        };
        if (currentId) item.id = currentId; await saveDemon(item);
    }
    else if (currentType === 'totems') {
        const itemName = document.getElementById('itemName').value.trim();
        const itemDescription = document.getElementById('description') ? document.getElementById('description').value.trim() : '';
        if (!itemName) { alert('❌ Введите название!'); return; }
        const isDuplicate = await checkDuplicateGeneric(itemName, currentId, getTotems);
        if (isDuplicate) { alert(`❌ Ошибка! Тотем "${itemName}" уже существует!`); return; }
        item = {
            name: itemName, level: parseInt(document.getElementById('itemLevel').value),
            required_level: parseInt(document.getElementById('requiredLevel').value), icon: 'shop-icon',
            icon_row: parseInt(document.getElementById('iconRow').value), icon_col: parseInt(document.getElementById('iconCol').value),
            stats: collectStats('default'), description: itemDescription
        };
        if (currentId) item.id = currentId; await saveTotem(item);
    }
    else if (currentType === 'master') {
        const itemName = document.getElementById('itemName').value.trim();
        const itemDescription = document.getElementById('description') ? document.getElementById('description').value.trim() : '';
        if (!itemName) { alert('❌ Введите название!'); return; }
        const isDuplicate = await checkDuplicateGeneric(itemName, currentId, getMasterRunes);
        if (isDuplicate) { alert(`❌ Ошибка! Руна мастера "${itemName}" уже существует!`); return; }
        item = {
            name: itemName, level: parseInt(document.getElementById('itemLevel').value), icon: 'shop-icon',
            icon_row: parseInt(document.getElementById('iconRow').value), icon_col: parseInt(document.getElementById('iconCol').value),
            stats: collectStats('default'), description: itemDescription
        };
        if (currentId) item.id = currentId; await saveMasterRune(item);
    }
    else if (currentType === 'druids') {
        const itemName = document.getElementById('itemName').value.trim();
        const itemDescription = document.getElementById('description') ? document.getElementById('description').value.trim() : '';
        if (!itemName) { alert('❌ Введите название!'); return; }
        const isDuplicate = await checkDuplicateGeneric(itemName, currentId, getDruidsRunes);
        if (isDuplicate) { alert(`❌ Ошибка! Руна друидов "${itemName}" уже существует!`); return; }
        item = {
            name: itemName, level: parseInt(document.getElementById('itemLevel').value), icon: 'shop-icon',
            icon_row: parseInt(document.getElementById('iconRow').value), icon_col: parseInt(document.getElementById('iconCol').value),
            stats: collectStats('default'), description: itemDescription
        };
        if (currentId) item.id = currentId; await saveDruidsRune(item);
    }
    else if (currentType === 'nakolki') {
        const itemName = document.getElementById('itemName').value.trim();
        const itemDescription = document.getElementById('description') ? document.getElementById('description').value.trim() : '';
        if (!itemName) { alert('❌ Введите название!'); return; }
        const isDuplicate = await checkDuplicateGeneric(itemName, currentId, getNakolki);
        if (isDuplicate) { alert(`❌ Ошибка! Квестовая руна "${itemName}" уже существует!`); return; }
        item = {
            name: itemName, level: parseInt(document.getElementById('itemLevel').value), icon: 'shop-icon',
            icon_row: parseInt(document.getElementById('iconRow').value), icon_col: parseInt(document.getElementById('iconCol').value),
            stats: collectStats('default'), description: itemDescription
        };
        if (currentId) item.id = currentId; await saveNakolki(item);
    }
    else if (currentType === 'news') {
        const newsTitle = document.getElementById('newsTitle').value.trim();
        if (!newsTitle) { alert('❌ Введите заголовок новости!'); return; }
        const allNews = await getNews();
        const isDuplicate = allNews.find(n => n.title.toLowerCase() === newsTitle.toLowerCase() && (currentId === null || n.id !== currentId));
        if (isDuplicate) { alert(`❌ Ошибка! Новость с заголовком "${newsTitle}" уже существует!`); return; }
        item = {
            title: newsTitle, content: document.getElementById('newsContent').value,
            footer: document.getElementById('newsFooter').value, date: document.getElementById('newsDate').value,
            category: document.getElementById('newsCategory').value
        };
        if (currentId) item.id = currentId; await saveNewsItem(item);
    }
    else if (currentType === 'enhancements') {
        const itemName = document.getElementById('itemName').value.trim();
        if (!itemName) { alert('❌ Введите название!'); return; }
        item = {
            name: itemName,
            type: document.getElementById('enhType').value,
            level: parseInt(document.getElementById('itemLevel').value) || 1,
            icon_row: parseInt(document.getElementById('iconRow').value),
            icon_col: parseInt(document.getElementById('iconCol').value),
            stats: collectStats('default'),
            description: document.getElementById('description')?.value.trim() || '',
            expiry_text: document.getElementById('expiryText')?.value.trim() || '',
            how_to_get: document.getElementById('howToGet')?.value.trim() || ''
        };
        if (currentId) item.id = currentId;
        await saveEnhancement(item);
    }

    closeModal();
    loadTable(currentType);
    if (currentType === 'enhancements') {
        allEnhancementsAdmin = await getEnhancements();
        renderEnhancements(allEnhancementsAdmin);
    }
    alert('✅ Сохранено!');
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentId = null;
}

// ==================== СЕКРЕТНЫЕ ВЕЩИ (АДМИНКА) ====================
let allSecretItems = [];
let currentSecretItemId = null;

async function loadSecretItemsAdmin() {
    allSecretItems = await getSecretItems();
    renderSecretItemsAdmin(allSecretItems);
}

function renderSecretItemsAdmin(data) {
    const tbody = document.getElementById('secretItemsList');
    if (!tbody) return;
    let html = '';
    for (const d of data) {
        const typeText = d.type === 'temporary' ? '⏳ Временное' : '♾️ Постоянное';
        html += `<tr>
            <td>${d.id}</td>
            <td><div class="shop-icon" style="--row:${d.icon_row}; --col:${d.icon_col}; width:80px; height:80px;"></div></td>
            <td>${escapeHtml(d.name)}</div></td>
            <td>${typeText}</div></td>
            <td>${escapeHtml(d.expiry_text || '—')}</div></td>
            <td>${d.level}</div></td>
            <td>${escapeHtml((d.how_to_get || '').substring(0, 30))}${(d.how_to_get || '').length > 30 ? '...' : ''}</div></td>
            <td>
                <button class="edit-btn" onclick="openSecretItemAdminModal(${d.id})">✏️</button>
                <button class="delete-btn" onclick="deleteSecretItemAdmin(${d.id})">🗑️</button>
            </div></td>
        </tr>`;
    }
    tbody.innerHTML = html;
}

function filterSecretItemsAdmin() {
    const searchTerm = document.getElementById('searchSecretItemsAdmin')?.value.toLowerCase().trim() || '';
    if (!searchTerm) {
        renderSecretItemsAdmin(allSecretItems);
        return;
    }
    const filtered = allSecretItems.filter(e => e.name.toLowerCase().includes(searchTerm));
    renderSecretItemsAdmin(filtered);
}

function clearSecretItemsSearch() {
    const input = document.getElementById('searchSecretItemsAdmin');
    if (input) input.value = '';
    renderSecretItemsAdmin(allSecretItems);
}

function addSecretUniqueField(value = '') {
    const container = document.getElementById('secretUniqueContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'unique-row';
    div.innerHTML = `<input type="text" class="secret-unique-value" value="${escapeHtml(value)}" placeholder="Уникальная характеристика"><button onclick="this.parentElement.remove()">🗑️</button>`;
    container.appendChild(div);
}

function collectSecretUniqueStats() {
    const unique = [];
    document.querySelectorAll('#secretUniqueContainer .secret-unique-value').forEach(input => {
        if (input.value.trim()) unique.push(input.value.trim());
    });
    return unique;
}

async function openSecretItemAdminModal(id = null) {
    currentSecretItemId = id;
    let item = null;
    if (id) {
        item = await getSecretItemById(id);
    }

    document.getElementById('secretItemName').value = item ? item.name : '';
    document.getElementById('secretItemLevel').value = item ? item.level : 1;
    document.getElementById('secretItemType').value = item ? item.type : 'temporary';
    document.getElementById('secretItemExpiryText').value = item ? (item.expiry_text || '') : '';
    document.getElementById('secretItemDescription').value = item ? (item.description || '') : '';
    document.getElementById('secretItemHowToGet').value = item ? (item.how_to_get || '') : '';
    document.getElementById('secretItemIconRow').value = item ? (item.icon_row || 0) : 0;
    document.getElementById('secretItemIconCol').value = item ? (item.icon_col || 0) : 0;
    document.getElementById('secretItemIconPreview').innerHTML = item ? `✅ Выбрано: ряд ${(item.icon_row || 0) + 1}, колонка ${(item.icon_col || 0) + 1}` : '❌ Не выбрано';

    const uniqueContainer = document.getElementById('secretUniqueContainer');
    if (uniqueContainer) {
        uniqueContainer.innerHTML = '';
        const uniqueStats = item ? (item.unique_stats || []) : [];
        uniqueStats.forEach(u => addSecretUniqueField(u));
    }

    const stats = item ? item.stats : {};
    const statsList = ['точность', 'урон', 'блок', 'оглушение', 'уворот', 'броня', 'здоровье', ];
    const icons = { 'точность': 'stat-icon-точность', 'урон': 'stat-icon-урон', 'блок': 'stat-icon-блок', 'оглушение': 'stat-icon-оглушение', 'уворот': 'stat-icon-уворот', 'броня': 'stat-icon-броня', 'здоровье': 'stat-icon-здоровье' };
    const names = { 'точность': 'Точность', 'урон': 'Урон', 'блок': 'Блок', 'оглушение': 'Оглушение', 'уворот': 'Уворот', 'броня': 'Броня', 'здоровье': 'Здоровье' };
    const statsGrid = document.getElementById('secretItemStatsGrid');
    if (statsGrid) {
        statsGrid.innerHTML = '';
        statsList.forEach(stat => {
            const div = document.createElement('div');
            div.className = 'stat-field';
            div.innerHTML = `<label><span class="stat-icon ${icons[stat]}"></span> ${names[stat]}:</label><input type="text" class="stat-${stat}" value="${stats[stat] || ''}" placeholder="Значение">`;
            statsGrid.appendChild(div);
        });
    }

    document.getElementById('secretItemAdminModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSecretItemAdminModal() {
    document.getElementById('secretItemAdminModal').style.display = 'none';
    document.body.style.overflow = '';
    currentSecretItemId = null;
}

async function saveSecretItemAdmin() {
    const name = document.getElementById('secretItemName').value.trim();
    if (!name) {
        alert('❌ Введите название!');
        return;
    }

    const stats = {};
    const statsList = ['точность', 'урон', 'блок', 'оглушение', 'уворот', 'броня', 'здоровье'];
    statsList.forEach(stat => {
        const input = document.querySelector(`#secretItemStatsGrid .stat-${stat}`);
        if (input && input.value.trim()) stats[stat] = input.value.trim();
    });

    const uniqueStats = collectSecretUniqueStats();

    const item = {
        name: name,
        type: document.getElementById('secretItemType').value,
        level: parseInt(document.getElementById('secretItemLevel').value) || 1,
        icon_row: parseInt(document.getElementById('secretItemIconRow').value) || 0,
        icon_col: parseInt(document.getElementById('secretItemIconCol').value) || 0,
        stats: stats,
        unique_stats: uniqueStats,
        description: document.getElementById('secretItemDescription').value.trim() || '',
        expiry_text: document.getElementById('secretItemExpiryText').value.trim() || '',
        how_to_get: document.getElementById('secretItemHowToGet').value.trim() || ''
    };
    if (currentSecretItemId) item.id = currentSecretItemId;

    const result = await saveSecretItem(item);
    if (result) {
        closeSecretItemAdminModal();
        await loadSecretItemsAdmin();
        alert('✅ Сохранено!');
    } else {
        alert('❌ Ошибка при сохранении!');
    }
}

async function deleteSecretItemAdmin(id) {
    if (!confirm('Удалить секретную вещь?')) return;
    const success = await deleteSecretItem(id);
    if (success) {
        await loadSecretItemsAdmin();
        alert('🗑️ Удалено');
    } else {
        alert('❌ Ошибка при удалении!');
    }
}

// ==================== СЕКРЕТНЫЕ СЕТЫ (АДМИНКА) ====================
let allSecretSets = [];
let currentSetId = null;

async function loadSecretSetsAdmin() {
    allSecretSets = await getSecretSets();
    renderSecretSetsAdmin(allSecretSets);
}

function renderSecretSetsAdmin(data) {
    const tbody = document.getElementById('secretSetsList');
    if (!tbody) return;
    let html = '';
    for (const d of data) {
        const styleText = d.style === 'rare' ? 'Урон' : d.style === 'uncommon' ? 'Уворот' : d.style === 'armor' ? 'Броня' : d.style === 'epic' ? 'Элита' : '—';
        html += `<tr>
            <td>${d.id}</td>
            <td>${escapeHtml(d.name)}</div></td>
            <td>${styleText}</div></td>
            <td>${d.level}</div></td>
            <td>
                <button class="edit-btn" onclick="openSetAdminModal(${d.id})">✏️</button>
                <button class="delete-btn" onclick="deleteSetAdmin(${d.id})">🗑️</button>
            </div></td>
        </tr>`;
    }
    tbody.innerHTML = html;
}

async function openSetAdminModal(id = null) {
    currentSetId = id;
    let set = null;
    if (id) {
        set = await getSecretSetById(id);
    }
    document.getElementById('setNameAdmin').value = set ? set.name : '';
    document.getElementById('setLevelAdmin').value = set ? set.level : 1;
    document.getElementById('setStyleAdmin').value = set ? set.style : '';
    document.getElementById('setAdminModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSetAdminModal() {
    document.getElementById('setAdminModal').style.display = 'none';
    document.body.style.overflow = '';
    currentSetId = null;
}

async function saveSetAdmin() {
    const name = document.getElementById('setNameAdmin').value.trim();
    if (!name) {
        alert('❌ Введите название сета!');
        return;
    }
    const set = {
        name: name,
        level: parseInt(document.getElementById('setLevelAdmin').value) || 1,
        style: document.getElementById('setStyleAdmin').value
    };
    if (currentSetId) set.id = currentSetId;

    const result = await saveSecretSet(set);
    if (result) {
        closeSetAdminModal();
        await loadSecretSetsAdmin();
        alert('✅ Сет сохранен!');
    } else {
        alert('❌ Ошибка при сохранении!');
    }
}

async function deleteSetAdmin(id) {
    if (!confirm('Удалить сет и все его предметы?')) return;
    const items = await getSecretSetItemsBySetId(id);
    for (const item of items) {
        await deleteSecretSetItem(item.id);
    }
    const success = await deleteSecretSet(id);
    if (success) {
        await loadSecretSetsAdmin();
        alert('🗑️ Сет удален');
    } else {
        alert('❌ Ошибка при удалении!');
    }
}

// ==================== ПРЕДМЕТЫ СЕТОВ (АДМИНКА) ====================
let currentSetItemId = null;
let currentItemSetId = null;

async function initSecretSetItemsPanel() {
    const sets = await getSecretSets();
    const select = document.getElementById('setFilterSelect');
    if (!select) return;
    select.innerHTML = '<option value="">-- Выберите сет --</option>';
    for (const set of sets) {
        select.innerHTML += `<option value="${set.id}">${escapeHtml(set.name)}</option>`;
    }
    if (select.onchange) {
        select.removeEventListener('change', loadSecretSetItemsBySet);
    }
    select.addEventListener('change', loadSecretSetItemsBySet);
}

async function loadSecretSetItemsBySet() {
    const setId = document.getElementById('setFilterSelect').value;
    const tbody = document.getElementById('secretSetItemsList');
    if (!setId) {
        tbody.innerHTML = '<tr><td colspan="6">Выберите сет</td></tr>';
        return;
    }

    const items = await getSecretSetItems(parseInt(setId));
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">📭 В этом сете нет предметов</td></tr>';
        return;
    }

    let html = '';
    for (const item of items) {
        const uniqueText = item.unique_stats && item.unique_stats.length > 0 ? item.unique_stats.slice(0, 2).join(', ') + (item.unique_stats.length > 2 ? '...' : '') : '—';
        html += `<tr>
            <td>${item.id}</td>
            <td><div class="shop-icon" style="--row:${item.icon_row}; --col:${item.icon_col}; width:80px; height:80px;"></div></td>
            <td>${escapeHtml(item.name)}</div></td>
            <td>${item.level}</div></td>
            <td>${uniqueText}</div></td>
            <td>
                <button class="edit-btn" onclick="openSetItemAdminModal(${item.id})">✏️</button>
                <button class="delete-btn" onclick="deleteSetItemAdmin(${item.id})">🗑️</button>
            </div></td>
        </tr>`;
    }
    tbody.innerHTML = html;
}

async function openSetItemAdminModal(itemId = null, setId = null) {
    currentSetItemId = itemId;
    currentItemSetId = setId;

    let item = null;
    if (itemId) {
        item = await getSecretSetItemById(itemId);
        currentItemSetId = item.set_id;
    }

    document.getElementById('setItemName').value = item ? item.name : '';
    document.getElementById('setItemLevel').value = item ? item.level : 1;
    document.getElementById('setItemStyle').value = item ? (item.style || '') : '';
    document.getElementById('setItemIconRow').value = item ? (item.icon_row || 0) : 0;
    document.getElementById('setItemIconCol').value = item ? (item.icon_col || 0) : 0;
    document.getElementById('setItemIconPreview').innerHTML = item ? `✅ Выбрано: ряд ${(item.icon_row || 0) + 1}, колонка ${(item.icon_col || 0) + 1}` : '❌ Не выбрано';
    document.getElementById('setItemDescription').value = item ? (item.description || '') : '';
    document.getElementById('setItemHowToGet').value = item ? (item.how_to_get || '') : '';

    const uniqueContainer = document.getElementById('setItemUniqueContainer');
    if (uniqueContainer) {
        uniqueContainer.innerHTML = '';
        const uniqueStats = item ? (item.unique_stats || []) : [];
        uniqueStats.forEach(u => addSetItemUniqueField(u));
    }

    const stats = item ? item.stats : {};
    const statsList = ['точность', 'урон', 'блок', 'оглушение', 'уворот', 'броня', 'здоровье'];
    const icons = { 'точность': 'stat-icon-точность', 'урон': 'stat-icon-урон', 'блок': 'stat-icon-блок', 'оглушение': 'stat-icon-оглушение', 'уворот': 'stat-icon-уворот', 'броня': 'stat-icon-броня', 'здоровье': 'stat-icon-здоровье' };
    const names = { 'точность': 'Точность', 'урон': 'Урон', 'блок': 'Блок', 'оглушение': 'Оглушение','уворот': 'Уворот', 'броня': 'Броня', 'здоровье': 'Здоровье' };
    const statsGrid = document.getElementById('setItemStatsGrid');
    if (statsGrid) {
        statsGrid.innerHTML = '';
        statsList.forEach(stat => {
            const div = document.createElement('div');
            div.className = 'stat-field';
            div.innerHTML = `<label><span class="stat-icon ${icons[stat]}"></span> ${names[stat]}:</label><input type="text" class="stat-${stat}" value="${stats[stat] || ''}" placeholder="Значение">`;
            statsGrid.appendChild(div);
        });
    }

    document.getElementById('setItemAdminModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function addSetItemUniqueField(value = '') {
    const container = document.getElementById('setItemUniqueContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'unique-row';
    div.innerHTML = `<input type="text" class="set-item-unique-value" value="${escapeHtml(value)}" placeholder="Уникальная характеристика"><button onclick="this.parentElement.remove()">🗑️</button>`;
    container.appendChild(div);
}

function collectSetItemUniqueStats() {
    const unique = [];
    document.querySelectorAll('#setItemUniqueContainer .set-item-unique-value').forEach(input => {
        if (input.value.trim()) unique.push(input.value.trim());
    });
    return unique;
}

function closeSetItemAdminModal() {
    document.getElementById('setItemAdminModal').style.display = 'none';
    document.body.style.overflow = '';
    currentSetItemId = null;
    currentItemSetId = null;
}

async function saveSetItemAdmin() {
    const name = document.getElementById('setItemName').value.trim();
    if (!name) {
        alert('❌ Введите название предмета!');
        return;
    }
    if (!currentItemSetId) {
        alert('❌ Ошибка: не выбран сет!');
        return;
    }

    const stats = {};
    const statsList = ['точность', 'урон', 'блок', 'уворот', 'оглушение', 'броня', 'здоровье'];
    statsList.forEach(stat => {
        const input = document.querySelector(`#setItemStatsGrid .stat-${stat}`);
        if (input && input.value.trim()) stats[stat] = input.value.trim();
    });

    const uniqueStats = collectSetItemUniqueStats();

    const item = {
        set_id: currentItemSetId,
        name: name,
        level: parseInt(document.getElementById('setItemLevel').value) || 1,
        style: document.getElementById('setItemStyle').value,
        icon_row: parseInt(document.getElementById('setItemIconRow').value) || 0,
        icon_col: parseInt(document.getElementById('setItemIconCol').value) || 0,
        stats: stats,
        unique_stats: uniqueStats,
        description: document.getElementById('setItemDescription').value.trim() || '',
        how_to_get: document.getElementById('setItemHowToGet').value.trim() || ''
    };
    if (currentSetItemId) item.id = currentSetItemId;

    const result = await saveSecretSetItem(item);
    if (result) {
        closeSetItemAdminModal();
        await loadSecretSetsAdmin();
        await loadSecretSetItemsBySet();
        alert('✅ Предмет сохранен!');
    } else {
        alert('❌ Ошибка при сохранении!');
    }
}

async function deleteSetItemAdmin(itemId) {
    if (!confirm('Удалить этот предмет?')) return;
    const success = await deleteSecretSetItem(itemId);
    if (success) {
        await loadSecretSetsAdmin();
        await loadSecretSetItemsBySet();
        alert('🗑️ Предмет удален');
    } else {
        alert('❌ Ошибка при удалении!');
    }
}

// Запуск
loadTable('items');
document.addEventListener('DOMContentLoaded', displayAdminPanel);

// ==================== ПРЕДОТВРАЩАЕМ ОТПРАВКУ ПО ENTER В TEXTAREA ====================
document.addEventListener('DOMContentLoaded', function() {
    const modalFields = document.getElementById('modalFields');
    if (modalFields) {
        modalFields.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.tagName === 'TEXTAREA') {
                e.stopPropagation();
                return true;
            }
        });
    }
    
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                const saveBtn = document.querySelector('#editModal .modal-buttons .cat-btn:first-child');
                if (saveBtn && saveBtn.onclick) {
                    e.preventDefault();
                    saveBtn.click();
                }
            }
        });
    }
});

// ==================== КВЕСТЫ (АДМИНКА) ====================
let allQuestsAdmin = [];
let currentQuestId = null;
let mapLocationsList = [];

async function loadQuestsAdmin() {
    allQuestsAdmin = await getQuests();
    renderQuestsAdmin(allQuestsAdmin);
}

function renderQuestsAdmin(data) {
    const tbody = document.getElementById('questsList');
    if (!tbody) return;
    
    let html = '';
    for (const q of data) {
        // Получаем все типы квеста
        let questTypes = q.types || [q.type];
        if (!Array.isArray(questTypes)) questTypes = [questTypes];
        
        const typeIcons = [];
        for (const t of questTypes) {
            switch(t) {
                case 'story': typeIcons.push('📖'); break;
                case 'reward': typeIcons.push('💰'); break;
                case 'item': typeIcons.push('🎁'); break;
                case 'daily': typeIcons.push('🌙'); break;
                case 'blago': typeIcons.push('✨'); break;
                case 'useless': typeIcons.push('💀'); break;
                default: typeIcons.push('❓');
            }
        }
        const typeText = typeIcons.join(' ');
        
        const repeatText = q.repeat_type === 'once' ? '🔒' : q.repeat_type === 'repeat' ? '🔄' : '🌙';
        
        html += `<tr>
            <td>${q.id}</td>
            <td>${escapeHtml(q.name)}</div></td>
            <td>${escapeHtml(q.location_name)}</div></td>
            <td>${q.level}</div></td>
            <td>${typeText}</div></td>
            <td>${repeatText}</div></td>
            <td>
                <button class="edit-btn" onclick="openQuestAdminModal(${q.id})">✏️</button>
                <button class="delete-btn" onclick="deleteQuestAdmin(${q.id})">🗑️</button>
            </div></td>
        </tr>`;
    }
    tbody.innerHTML = html;
}

function filterQuestsAdmin() {
    const searchTerm = document.getElementById('searchQuestsAdmin')?.value.toLowerCase().trim() || '';
    if (!searchTerm) {
        renderQuestsAdmin(allQuestsAdmin);
        return;
    }
    const filtered = allQuestsAdmin.filter(q => q.name.toLowerCase().includes(searchTerm));
    renderQuestsAdmin(filtered);
}

function clearQuestsSearch() {
    const input = document.getElementById('searchQuestsAdmin');
    if (input) input.value = '';
    renderQuestsAdmin(allQuestsAdmin);
}

async function loadMapLocationsForSelect() {
    mapLocationsList = await getMapLocations();
    const select = document.getElementById('questLocationId');
    if (!select) return;
    select.innerHTML = '<option value="">-- Выберите локацию --</option>';
    for (const loc of mapLocationsList) {
        select.innerHTML += `<option value="${loc.id}">${escapeHtml(loc.name)}</option>`;
    }
}

function showCooldownHelp() {
    alert('СООТНОШЕНИЕ МИНУТ:\n\n60 минут = 1 час\n120 минут = 2 часа\n720 минут = 12 часов\n1440 минут = 1 день\n4320 минут = 3 дня\n10080 минут = 7 дней');
}

function addQuestRewardItemField(value = null) {
    const container = document.getElementById('questRewardItemsContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'unique-row';
    div.style.flexWrap = 'wrap';
    div.style.gap = '8px';
    div.style.marginBottom = '8px';
    
    div.innerHTML = `
        <select class="reward-item-category" style="width:140px; padding:8px; background:#0d0a07; border:1px solid #c7ba00; border-radius:6px; color:#e8dcc0;">
            <option value="secret">🔮 Секретные вещи</option>
            <option value="demon">👹 Демоны</option>
            <option value="rune">🏰 Руны</option>
            <option value="item">📦 Предметы</option>
            <option value="enhancement">⚡ Усиления</option>
        </select>
        <select class="reward-item-select" style="flex:2; padding:8px; background:#0d0a07; border:1px solid #c7ba00; border-radius:6px; color:#e8dcc0;">
            <option value="">-- Выберите предмет --</option>
        </select>
        <button onclick="this.parentElement.remove()" style="background:#ff4444; border:none; border-radius:6px; padding:6px 12px; color:white; cursor:pointer;">🗑️</button>
    `;
    container.appendChild(div);
    
    const categorySelect = div.querySelector('.reward-item-category');
    const itemSelect = div.querySelector('.reward-item-select');
    
    if (value) {
        categorySelect.value = value.category || 'secret';
    }
    
    categorySelect.addEventListener('change', () => {
        loadItemsByCategory(categorySelect.value, itemSelect, value);
    });
    
    loadItemsByCategory(categorySelect.value, itemSelect, value);
}

async function loadItemsByCategory(category, select, selectedValue = null) {
    let items = [];
    switch(category) {
        case 'secret':
            items = await getSecretItems();
            break;
        case 'demon':
            items = await getDemons();
            break;
        case 'rune':
            const master = await getMasterRunes();
            const druids = await getDruidsRunes();
            const nakolki = await getNakolki();
            items = [...master, ...druids, ...nakolki];
            break;
        case 'item':
            items = await getItems();
            break;
        case 'enhancement':
            items = await getEnhancements();
            break;
    }
    
    select.innerHTML = '<option value="">-- Выберите предмет --</option>';
    for (const item of items) {
        const selected = selectedValue && selectedValue.id === item.id ? 'selected' : '';
        let level = item.level || 0;
        let name = item.name;
        if (category === 'enhancement') {
            const typeText = item.type === 'temporary' ? '⏳' : '♾️';
            name = `${typeText} ${item.name}`;
        }
        select.innerHTML += `<option value="${item.id}" data-name="${escapeHtml(item.name)}" data-level="${level}" data-category="${category}" ${selected}>${escapeHtml(name)} (${level} ур.)</option>`;
    }
}

function collectQuestRewardItems() {
    const items = [];
    document.querySelectorAll('#questRewardItemsContainer .reward-item-select').forEach(select => {
        const option = select.options[select.selectedIndex];
        const categorySelect = select.closest('.unique-row')?.querySelector('.reward-item-category');
        if (option && option.value) {
            items.push({
                id: parseInt(option.value),
                name: option.getAttribute('data-name') || option.text.split(' (')[0],
                level: parseInt(option.getAttribute('data-level')) || 0,
                category: categorySelect ? categorySelect.value : 'secret'
            });
        }
    });
    return items;
}

async function openQuestAdminModal(id = null) {
    currentQuestId = id;
    await loadMapLocationsForSelect();
    
    let quest = null;
    if (id) {
        quest = await getQuestById(id);
    }
    
    document.getElementById('questName').value = quest ? quest.name : '';
    document.getElementById('questLocationId').value = quest ? (quest.location_id || '') : '';
    document.getElementById('questLevel').value = quest ? quest.level : 1;
    document.getElementById('questRepeatType').value = quest ? (quest.repeat_type || 'once') : 'once';
    document.getElementById('questCooldown').value = quest ? (quest.cooldown || '') : '';
    document.getElementById('questCooldownMinutes').value = quest ? (quest.cooldown_minutes || 0) : 0;
    document.getElementById('questDescription').value = quest ? (quest.description || '') : '';
    document.getElementById('questRequirements').value = quest ? (quest.requirements || '') : '';
    document.getElementById('questComment').value = quest ? (quest.comment || '') : '';
    document.getElementById('questRewardExp').value = quest?.rewards?.exp || 0;
    document.getElementById('questRewardGlory').value = quest?.rewards?.glory || 0;
    document.getElementById('questRewardFee').value = quest?.rewards?.fee || 0;
    document.getElementById('questRewardGold').value = quest?.rewards?.gold || 0;
    document.getElementById('questRewardSilver').value = quest?.rewards?.silver || 0;
    document.getElementById('questRewardCopper').value = quest?.rewards?.copper || 0;
    
    // Загрузка типов (кнопки-теги)
    const questTypes = [];
    if (quest) {
        if (Array.isArray(quest.types)) {
            questTypes.push(...quest.types);
        } else if (quest.type) {
            questTypes.push(quest.type);
        }
    } else {
        questTypes.push('story');
    }
    
    document.querySelectorAll('.quest-type-tag').forEach(tag => {
        const typeValue = tag.dataset.type;
        if (questTypes.includes(typeValue)) {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });
    
    initQuestTypesTags();
    
    // Загрузка этапов
    loadQuestStages(quest?.stages || []);
    
    const container = document.getElementById('questRewardItemsContainer');
    if (container) {
        container.innerHTML = '';
        const items = quest?.rewards?.items || [];
        for (const item of items) {
            addQuestRewardItemField(item);
        }
    }
    
    const extraContainer = document.getElementById('extraRewardsContainer');
    const showBtn = document.getElementById('showSilverCopperBtn');
    const hideBtn = document.getElementById('hideSilverCopperBtn');
    
    if (extraContainer && showBtn && hideBtn) {
        const hasExtra = (quest?.rewards?.silver || 0) > 0 || (quest?.rewards?.copper || 0) > 0;
        
        if (hasExtra) {
            extraContainer.style.display = 'block';
            showBtn.style.display = 'none';
            hideBtn.style.display = 'inline-block';
        } else {
            extraContainer.style.display = 'none';
            showBtn.style.display = 'inline-block';
            hideBtn.style.display = 'none';
        }
        
        showBtn.onclick = () => {
            extraContainer.style.display = 'block';
            showBtn.style.display = 'none';
            hideBtn.style.display = 'inline-block';
        };
        hideBtn.onclick = () => {
            extraContainer.style.display = 'none';
            showBtn.style.display = 'inline-block';
            hideBtn.style.display = 'none';
        };
    }
    
    setTimeout(() => {
        document.querySelectorAll('.quick-cooldown').forEach(btn => {
            btn.onclick = function() {
                const minutes = parseInt(this.dataset.minutes);
                const minutesInput = document.getElementById('questCooldownMinutes');
                if (minutesInput) minutesInput.value = minutes;
                
                const textInput = document.getElementById('questCooldown');
                if (textInput) {
                    if (minutes === 120) textInput.value = '2 часа';
                    else if (minutes === 720) textInput.value = '12 часов';
                    else if (minutes === 1440) textInput.value = '1 день';
                    else if (minutes === 4320) textInput.value = '3 дня';
                    else if (minutes === 10080) textInput.value = '7 дней';
                }
            };
        });
    }, 100);
    
    document.getElementById('questAdminModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeQuestAdminModal() {
    document.getElementById('questAdminModal').style.display = 'none';
    document.body.style.overflow = '';
    currentQuestId = null;
}

async function saveQuestAdmin() {
    const name = document.getElementById('questName').value.trim();
    if (!name) {
        alert('Введите название квеста!');
        return;
    }
    
    const locationId = document.getElementById('questLocationId').value;
    const location = mapLocationsList.find(l => l.id == locationId);
    const locationName = location ? location.name : '';
    
    const types = [];
    document.querySelectorAll('.quest-type-tag.active').forEach(tag => {
        types.push(tag.dataset.type);
    });
    if (types.length === 0) types.push('story');
    
    const rewards = {
        exp: parseInt(document.getElementById('questRewardExp').value) || 0,
        glory: parseInt(document.getElementById('questRewardGlory').value) || 0,
        fee: parseInt(document.getElementById('questRewardFee').value) || 0,
        gold: parseInt(document.getElementById('questRewardGold').value) || 0,
        silver: parseInt(document.getElementById('questRewardSilver').value) || 0,
        copper: parseInt(document.getElementById('questRewardCopper').value) || 0,
        items: collectQuestRewardItems()
    };
    
    const quest = {
        name: name,
        location_id: locationId ? parseInt(locationId) : null,
        location_name: locationName,
        level: parseInt(document.getElementById('questLevel').value) || 1,
        types: types,
        type: types[0],
        repeat_type: document.getElementById('questRepeatType').value,
        cooldown: document.getElementById('questCooldown').value,
        cooldown_minutes: parseInt(document.getElementById('questCooldownMinutes').value) || 0,
        description: document.getElementById('questDescription').value,
        requirements: document.getElementById('questRequirements').value,
        comment: document.getElementById('questComment').value,
        stages: collectQuestStages(),
        rewards: rewards
    };
    if (currentQuestId) quest.id = currentQuestId;
    
    const result = await saveQuest(quest);
    if (result) {
        closeQuestAdminModal();
        await loadQuestsAdmin();
        alert('Квест сохранён!');
    } else {
        alert('Ошибка при сохранении!');
    }
}

async function deleteQuestAdmin(id) {
    if (!confirm('Удалить квест?')) return;
    const success = await deleteQuest(id);
    if (success) {
        await loadQuestsAdmin();
        alert('Квест удалён');
    } else {
        alert('Ошибка при удалении!');
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'TEXTAREA') {
        e.stopPropagation();
    }
}, true);
// Инициализация обработчиков для тегов типов квестов
function initQuestTypesTags() {
    document.querySelectorAll('.quest-type-tag').forEach(tag => {
        tag.removeEventListener('click', tagClickHandler);
        tag.addEventListener('click', tagClickHandler);
    });
}

function tagClickHandler() {
    this.classList.toggle('active');
}
// Добавление этапа
function addQuestStage(stageData = null) {
    const container = document.getElementById('questStagesContainer');
    if (!container) return;
    
    const stageIndex = container.children.length;
    const div = document.createElement('div');
    div.className = 'stage-item';
    div.setAttribute('data-stage-index', stageIndex);
    
    div.innerHTML = `
        <div class="stage-header">
            <span class="stage-title">📌 ЭТАП ${stageIndex + 1}</span>
            <button type="button" class="stage-remove" onclick="this.closest('.stage-item').remove(); renumberStages();">🗑️ Удалить</button>
        </div>
        <div class="form-group">
            <label>📖 Описание этапа</label>
            <textarea class="stage-description" rows="2" placeholder="Что нужно сделать на этом этапе...">${stageData ? escapeHtml(stageData.description) : ''}</textarea>
        </div>
        <div class="form-group">
            <label>📋 Требования этапа</label>
            <textarea class="stage-requirements" rows="2" placeholder="Требования для выполнения этапа...">${stageData ? escapeHtml(stageData.requirements) : ''}</textarea>
        </div>
        <div class="form-group">
            <label>📝 Комментарий этапа</label>
            <textarea class="stage-comment" rows="2" placeholder="Дополнительная информация...">${stageData ? escapeHtml(stageData.comment) : ''}</textarea>
        </div>
    `;
    container.appendChild(div);
}

// Перенумерация этапов после удаления
function renumberStages() {
    const container = document.getElementById('questStagesContainer');
    if (!container) return;
    
    const stages = container.querySelectorAll('.stage-item');
    stages.forEach((stage, idx) => {
        stage.setAttribute('data-stage-index', idx);
        const titleSpan = stage.querySelector('.stage-title');
        if (titleSpan) titleSpan.innerHTML = `📌 ЭТАП ${idx + 1}`;
    });
}

// Сбор данных этапов
function collectQuestStages() {
    const stages = [];
    document.querySelectorAll('#questStagesContainer .stage-item').forEach(stage => {
        const description = stage.querySelector('.stage-description')?.value.trim() || '';
        const requirements = stage.querySelector('.stage-requirements')?.value.trim() || '';
        const comment = stage.querySelector('.stage-comment')?.value.trim() || '';
        
        if (description || requirements || comment) {
            stages.push({ description, requirements, comment });
        }
    });
    return stages;
}

// Загрузка этапов в модалку
function loadQuestStages(stages) {
    const container = document.getElementById('questStagesContainer');
    if (!container) return;
    container.innerHTML = '';
    if (stages && stages.length > 0) {
        for (const stage of stages) {
            addQuestStage(stage);
        }
    }
}