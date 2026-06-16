// ==================== КОНФИГУРАЦИЯ ====================
const SUPABASE_URL = 'https://gmcqxgxwtczjlwyifwew.supabase.co';
// ⚠️ Замените на новый ключ после ротации в Supabase Dashboard → Settings → API
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtY3F4Z3h3dGN6amx3eWlmd2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjIxMTAsImV4cCI6MjA5MDk5ODExMH0.cM6xm9qCRbl-c1h-pWOWKSeAozYUy7KpJjua79JgFuk';

// ==================== ХЕШИРОВАНИЕ ПАРОЛЕЙ ====================
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode('mobitva_salt_2024_' + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==================== СЕССИЯ ====================
function getSession() {
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
        localStorage.removeItem('mb_session');
        return null;
    }
}

function setSession(user) {
    localStorage.setItem('mb_session', JSON.stringify({
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role,
        token: user.session_token || null,
        expires: Date.now() + (24 * 60 * 60 * 1000)
    }));
}

function clearSession() {
    localStorage.removeItem('mb_session');
    localStorage.removeItem('user');
}

function getCurrentUser() {
    return getSession();
}

// ==================== ИНИЦИАЛИЗАЦИЯ SUPABASE ====================
let dbReady = false;
let dbInitPromise = null;
let db = null;

async function ensureDb() {
    if (db && dbReady) return db;
    if (dbInitPromise) return dbInitPromise;

    dbInitPromise = (async () => {
        while (typeof window.supabase === 'undefined' || typeof window.supabase.createClient === 'undefined') {
            await new Promise(r => setTimeout(r, 50));
        }
        const session = getSession();
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    'x-user-login': session ? session.login : '',
                    'x-user-token': session ? (session.token || '') : ''
                }
            }
        });
        window.__dbClient = db;
        dbReady = true;
        return db;
    })();
    return dbInitPromise;
}

function updateDbHeaders(login, token) {
    if (!db) return;
    try {
        if (db.rest && db.rest.headers) {
            db.rest.headers['x-user-login'] = login || '';
            db.rest.headers['x-user-token'] = token || '';
        }
    } catch (e) { }
}

ensureDb();

// ==================== АВТОРИЗАЦИЯ ====================
async function loginUser(login, password) {
    await ensureDb();
    if (!login || !password) return null;
    const passwordHash = await hashPassword(password);
    const { data, error } = await db
        .from('users')
        .select('id, login, name, role, session_token')
        .eq('login', login)
        .eq('password_hash', passwordHash)
        .maybeSingle();
    if (error || !data) return null;
    const newToken = (typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    await db.from('users').update({ session_token: newToken }).eq('id', data.id);
    data.session_token = newToken;
    setSession(data);
    updateDbHeaders(data.login, newToken);
    return data;
}

async function registerUser(login, password, email) {
    await ensureDb();
    if (!login || login.length < 3) return { success: false, message: '❌ Логин минимум 3 символа' };
    if (!password || password.length < 6) return { success: false, message: '❌ Пароль минимум 6 символов' };
    if (!email || !email.includes('@')) return { success: false, message: '❌ Некорректный email' };
    const { data: existing } = await db.from('users').select('id').eq('login', login).maybeSingle();
    if (existing) return { success: false, message: '❌ Пользователь с таким логином уже существует' };
    const passwordHash = await hashPassword(password);
    const { error } = await db.from('users').insert([{
        login,
        password: '',
        password_hash: passwordHash,
        email,
        role: 'user',
        name: login
    }]);
    if (error) { console.error('registerUser error:', error); return { success: false, message: '❌ Ошибка регистрации. Попробуйте позже.' }; }
    return { success: true, message: '✅ Регистрация успешна!' };
}

async function changePassword(login, oldPassword, newPassword) {
    await ensureDb();
    const user = await loginUser(login, oldPassword);
    if (!user) return { success: false, message: '❌ Неверный текущий пароль!' };
    if (!newPassword || newPassword.length < 6) return { success: false, message: '❌ Новый пароль минимум 6 символов' };
    const newHash = await hashPassword(newPassword);
    const { error } = await db.from('users').update({ password_hash: newHash }).eq('login', login);
    if (error) return { success: false, message: '❌ Ошибка при смене пароля' };
    return { success: true, message: '✅ Пароль успешно изменён!' };
}

async function logout() {
    const session = getSession();
    if (session && db) {
        try { await db.from('users').update({ session_token: null }).eq('login', session.login); } catch (e) { }
    }
    clearSession();
    window.location.href = '/auth';
}

// ==================== КЕШИРОВАНИЕ ====================
const cache = {};
const CACHE_TTL = {
    items: 7 * 24 * 60 * 60 * 1000, demons: 7 * 24 * 60 * 60 * 1000, totems: 7 * 24 * 60 * 60 * 1000,
    master_runes: 7 * 24 * 60 * 60 * 1000, druids_runes: 7 * 24 * 60 * 60 * 1000, nakolki: 7 * 24 * 60 * 60 * 1000,
    secret_items: 7 * 24 * 60 * 60 * 1000, secret_sets: 7 * 24 * 60 * 60 * 1000, enhancements: 7 * 24 * 60 * 60 * 1000,
    map_locations: 3 * 24 * 60 * 60 * 1000, map_connections: 3 * 24 * 60 * 60 * 1000,
    quests: 24 * 60 * 60 * 1000, news: 24 * 60 * 60 * 1000,
    users: 0, user_characters: 0, character_timers: 0
};

async function getCachedOrFetch(key, fetchFn, ttlKey = null) {
    const now = Date.now();
    const ttl = (ttlKey && CACHE_TTL[ttlKey] !== undefined) ? CACHE_TTL[ttlKey] : 5 * 60 * 1000;
    if (ttl === 0) return await fetchFn();
    if (cache[key] && (now - cache[key].timestamp) < ttl) return cache[key].data;
    const data = await fetchFn();
    cache[key] = { data, timestamp: now };
    return data;
}

function invalidateCache(key) { delete cache[key]; }

// ==================== ЧТЕНИЕ ====================
async function getItems() { await ensureDb(); return getCachedOrFetch('items', async () => { const { data, error } = await db.from('items').select('*').order('level'); return error ? [] : data; }, 'items'); }
async function getDemons() { await ensureDb(); return getCachedOrFetch('demons', async () => { const { data, error } = await db.from('demons').select('*').order('sort_order'); return error ? [] : data; }, 'demons'); }
async function getTotems() { await ensureDb(); return getCachedOrFetch('totems', async () => { const { data, error } = await db.from('totems').select('*').order('sort_order'); return error ? [] : data; }, 'totems'); }
async function getMasterRunes() { await ensureDb(); return getCachedOrFetch('master_runes', async () => { const { data, error } = await db.from('runes_master').select('*').order('sort_order'); return error ? [] : data; }, 'master_runes'); }
async function getDruidsRunes() { await ensureDb(); return getCachedOrFetch('druids_runes', async () => { const { data, error } = await db.from('runes_druids').select('*').order('sort_order'); return error ? [] : data; }, 'druids_runes'); }
async function getNews() { await ensureDb(); return getCachedOrFetch('news', async () => { const { data, error } = await db.from('news').select('*').order('date', { ascending: false }); return error ? [] : data; }, 'news'); }
async function getUsers() { await ensureDb(); const { data, error } = await db.from('users').select('id,login,name,role,email,created_at'); return error ? [] : data; }
async function getItemById(id) { await ensureDb(); const { data, error } = await db.from('items').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function getDemonById(id) { await ensureDb(); const { data, error } = await db.from('demons').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function getTotemById(id) { await ensureDb(); const { data, error } = await db.from('totems').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function getMasterRuneById(id) { await ensureDb(); const { data, error } = await db.from('runes_master').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function getDruidsRuneById(id) { await ensureDb(); const { data, error } = await db.from('runes_druids').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function getNewsById(id) { await ensureDb(); const { data, error } = await db.from('news').select('*').eq('id', id).maybeSingle(); return error ? null : data; }

// ==================== ЗАПИСЬ ====================
async function saveItem(item) { await ensureDb(); const { data, error } = await db.from('items').upsert(item).select(); if (error) return null; invalidateCache('items'); return data; }
async function saveDemon(demon) { await ensureDb(); const { data, error } = await db.from('demons').upsert(demon).select(); if (error) return null; invalidateCache('demons'); return data; }
async function saveTotem(totem) { await ensureDb(); const { data, error } = await db.from('totems').upsert(totem).select(); if (error) return null; invalidateCache('totems'); return data; }
async function saveMasterRune(rune) { await ensureDb(); const { data, error } = await db.from('runes_master').upsert(rune).select(); if (error) return null; invalidateCache('master_runes'); return data; }
async function saveDruidsRune(rune) { await ensureDb(); const { data, error } = await db.from('runes_druids').upsert(rune).select(); if (error) return null; invalidateCache('druids_runes'); return data; }
async function saveNewsItem(news) { await ensureDb(); const { data, error } = await db.from('news').upsert(news).select(); if (error) return null; invalidateCache('news'); return data; }

// ==================== УДАЛЕНИЕ ====================
async function deleteItemById(id) { await ensureDb(); const { error } = await db.from('items').delete().eq('id', id); if (!error) invalidateCache('items'); return !error; }
async function deleteDemonById(id) { await ensureDb(); const { error } = await db.from('demons').delete().eq('id', id); if (!error) invalidateCache('demons'); return !error; }
async function deleteTotemById(id) { await ensureDb(); const { error } = await db.from('totems').delete().eq('id', id); if (!error) invalidateCache('totems'); return !error; }
async function deleteMasterRuneById(id) { await ensureDb(); const { error } = await db.from('runes_master').delete().eq('id', id); if (!error) invalidateCache('master_runes'); return !error; }
async function deleteDruidsRuneById(id) { await ensureDb(); const { error } = await db.from('runes_druids').delete().eq('id', id); if (!error) invalidateCache('druids_runes'); return !error; }
async function deleteNewsById(id) { await ensureDb(); const { error } = await db.from('news').delete().eq('id', id); if (!error) invalidateCache('news'); return !error; }

// ==================== НАКОЛКИ ====================
async function getNakolki() { await ensureDb(); return getCachedOrFetch('nakolki', async () => { const { data, error } = await db.from('nakolki').select('*').order('sort_order'); return error ? [] : data; }, 'nakolki'); }
async function getNakolkiById(id) { await ensureDb(); const { data, error } = await db.from('nakolki').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function saveNakolki(item) { await ensureDb(); const { data, error } = await db.from('nakolki').upsert(item).select(); if (error) return null; invalidateCache('nakolki'); return data; }
async function deleteNakolkiById(id) { await ensureDb(); const { error } = await db.from('nakolki').delete().eq('id', id); if (!error) invalidateCache('nakolki'); return !error; }

// ==================== УСИЛЕНИЯ ====================
async function getEnhancements() { await ensureDb(); return getCachedOrFetch('enhancements', async () => { const { data, error } = await db.from('enhancements').select('*').order('sort_order'); return error ? [] : data; }, 'enhancements'); }
async function getEnhancementById(id) { await ensureDb(); const { data, error } = await db.from('enhancements').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function saveEnhancement(item) { await ensureDb(); const { data, error } = await db.from('enhancements').upsert(item).select(); if (error) return null; invalidateCache('enhancements'); return data; }
async function deleteEnhancementById(id) { await ensureDb(); const { error } = await db.from('enhancements').delete().eq('id', id); if (!error) invalidateCache('enhancements'); return !error; }

// ==================== СЕКРЕТНЫЕ ВЕЩИ ====================
async function getSecretItems() { await ensureDb(); return getCachedOrFetch('secret_items', async () => { const { data, error } = await db.from('secret_items_new').select('*').order('id'); return error ? [] : data; }, 'secret_items'); }
async function getSecretItemById(id) { await ensureDb(); const { data, error } = await db.from('secret_items_new').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function saveSecretItem(item) { await ensureDb(); if (!item.id) delete item.id; const { data, error } = await db.from('secret_items_new').upsert(item).select(); if (error) return null; invalidateCache('secret_items'); return data; }
async function deleteSecretItem(id) { await ensureDb(); const { error } = await db.from('secret_items_new').delete().eq('id', id); if (!error) invalidateCache('secret_items'); return !error; }

// ==================== СЕКРЕТНЫЕ СЕТЫ ====================
async function getSecretSets() { await ensureDb(); return getCachedOrFetch('secret_sets', async () => { const { data, error } = await db.from('secret_sets_new').select('*').order('id'); return error ? [] : data; }, 'secret_sets'); }
async function getSecretSetById(id) { await ensureDb(); const { data, error } = await db.from('secret_sets_new').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function saveSecretSet(set) { await ensureDb(); if (!set.id) delete set.id; const { data, error } = await db.from('secret_sets_new').upsert(set).select(); if (error) return null; invalidateCache('secret_sets'); return data; }
async function deleteSecretSet(id) { await ensureDb(); const { error } = await db.from('secret_sets_new').delete().eq('id', id); if (!error) invalidateCache('secret_sets'); return !error; }
async function getSecretSetItems(setId) { await ensureDb(); return getCachedOrFetch(`secret_set_items_${setId}`, async () => { const { data, error } = await db.from('secret_set_items_new').select('*').eq('set_id', setId).order('id'); return error ? [] : data; }); }
async function getSecretSetItemById(id) { await ensureDb(); const { data, error } = await db.from('secret_set_items_new').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function saveSecretSetItem(item) { await ensureDb(); if (!item.id) delete item.id; const { data, error } = await db.from('secret_set_items_new').upsert(item).select(); if (error) return null; invalidateCache(`secret_set_items_${item.set_id}`); return data; }
async function deleteSecretSetItem(id) { await ensureDb(); const { error } = await db.from('secret_set_items_new').delete().eq('id', id); return !error; }
async function getSecretSetItemsBySetId(setId) { await ensureDb(); const { data, error } = await db.from('secret_set_items_new').select('*').eq('set_id', setId); return error ? [] : data; }

// ==================== КВЕСТЫ ====================
async function getQuests() { await ensureDb(); return getCachedOrFetch('quests', async () => { const { data, error } = await db.from('quests').select('*').order('sort_order'); return error ? [] : data; }, 'quests'); }
async function getQuestById(id) { await ensureDb(); const { data, error } = await db.from('quests').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function saveQuest(quest) { await ensureDb(); if (!quest.id) delete quest.id; const { data, error } = await db.from('quests').upsert(quest).select(); if (error) return null; invalidateCache('quests'); return data; }
async function deleteQuest(id) { await ensureDb(); const { error } = await db.from('quests').delete().eq('id', id); if (!error) invalidateCache('quests'); return !error; }

// ==================== КАРТА ====================
async function getMapLocations() { await ensureDb(); return getCachedOrFetch('map_locations', async () => { const { data, error } = await db.from('map_locations').select('*').order('id'); return error ? [] : data; }, 'map_locations'); }
async function saveMapLocation(loc) { await ensureDb(); const { data, error } = await db.from('map_locations').upsert(loc).select(); if (error) return null; invalidateCache('map_locations'); return data; }
async function deleteMapLocation(id) { await ensureDb(); const { error } = await db.from('map_locations').delete().eq('id', id); if (!error) invalidateCache('map_locations'); return !error; }
async function getMapConnections() { await ensureDb(); return getCachedOrFetch('map_connections', async () => { const { data, error } = await db.from('map_connections').select('*'); return error ? [] : data; }, 'map_connections'); }
async function saveMapConnection(conn) { await ensureDb(); const { data, error } = await db.from('map_connections').upsert(conn).select(); if (error) return null; invalidateCache('map_connections'); return data; }
async function deleteMapConnection(id) { await ensureDb(); const { error } = await db.from('map_connections').delete().eq('id', id); if (!error) invalidateCache('map_connections'); return !error; }
async function deleteMapConnectionsByLocationId(locationId) { await ensureDb(); const { error } = await db.from('map_connections').delete().or(`from_id.eq.${locationId},to_id.eq.${locationId}`); if (!error) invalidateCache('map_connections'); return !error; }

// ==================== МОБЫ ====================
async function getLocationMobs(locationId) { await ensureDb(); return getCachedOrFetch(`location_mobs_${locationId}`, async () => { const { data, error } = await db.from('location_mobs').select('*').eq('location_id', locationId).order('level'); return error ? [] : data; }); }
async function getLocationMobById(id) { await ensureDb(); const { data, error } = await db.from('location_mobs').select('*').eq('id', id).maybeSingle(); return error ? null : data; }
async function saveLocationMob(mob) { await ensureDb(); const { data, error } = await db.from('location_mobs').upsert(mob).select(); if (error) return null; invalidateCache(`location_mobs_${mob.location_id}`); return data; }
async function deleteLocationMob(id) { await ensureDb(); const { error } = await db.from('location_mobs').delete().eq('id', id); return !error; }
async function deleteLocationMobsByLocationId(locationId) { await ensureDb(); const { error } = await db.from('location_mobs').delete().eq('location_id', locationId); if (!error) invalidateCache(`location_mobs_${locationId}`); return !error; }

// ==================== ПЕРСОНАЖИ (user_id = login) ====================
async function getUserCharacters(userLogin) {
    await ensureDb();
    const { data, error } = await db
        .from('user_characters')
        .select('*')
        .eq('user_id', userLogin)
        .order('order_index', { ascending: true });
    if (error) { console.error('getUserCharacters:', error); return []; }
    return data;
}
async function addCharacter(userLogin, name) {
    await ensureDb();
    // Получаем максимальный order_index
    const { data: existing } = await db
        .from('user_characters')
        .select('order_index')
        .eq('user_id', userLogin)
        .order('order_index', { ascending: false })
        .limit(1);
    const maxOrder = existing && existing.length > 0 ? (existing[0].order_index || 0) : 0;
    
    const { data, error } = await db
        .from('user_characters')
        .insert([{ user_id: userLogin, name, order_index: maxOrder + 1 }])
        .select();
    if (error) { console.error('addCharacter:', error); return null; }
    return data[0];
}
async function updateCharacter(id, updates) {
    await ensureDb();
    const { error } = await db.from('user_characters').update(updates).eq('id', id);
    return !error;
}
async function deleteCharacter(id) {
    await ensureDb();
    const { error } = await db.from('user_characters').delete().eq('id', id);
    return !error;
}

// ==================== ТАЙМЕРЫ ====================
async function getCharacterTimers(characterId) {
    await ensureDb();
    const { data, error } = await db
        .from('user_timers')
        .select('*')
        .eq('character_id', characterId)
        .order('order_index', { ascending: true });
    if (error) { console.error('getCharacterTimers:', error); return []; }
    return data;
}
async function addTimer(characterId, questName, endTime, duration, notes = '') {
    await ensureDb();
    // Получаем максимальный order_index для таймеров этого персонажа
    const { data: existing } = await db
        .from('user_timers')
        .select('order_index')
        .eq('character_id', characterId)
        .order('order_index', { ascending: false })
        .limit(1);
    const maxOrder = existing && existing.length > 0 ? (existing[0].order_index || 0) : 0;
    
    const { data, error } = await db
        .from('user_timers')
        .insert([{ 
            character_id: characterId, 
            quest_name: questName, 
            end_time: endTime, 
            duration, 
            notes, 
            is_active: true,
            order_index: maxOrder + 1
        }])
        .select();
    if (error) { console.error('addTimer:', error); return null; }
    return data[0];
}
async function updateTimer(id, questName, endTime, duration, notes) {
    await ensureDb();
    const updates = { quest_name: questName, end_time: endTime, duration };
    if (notes !== undefined) updates.notes = notes;
    const { error } = await db.from('user_timers').update(updates).eq('id', id);
    return !error;
}
async function deleteTimer(id) {
    await ensureDb();
    const { error } = await db.from('user_timers').delete().eq('id', id);
    return !error;
}
async function toggleTimerActive(id, isActive) {
    await ensureDb();
    const { error } = await db.from('user_timers').update({ is_active: isActive }).eq('id', id);
    return !error;
}
// ==================== ПОРЯДОК ПЕРСОНАЖЕЙ И ТАЙМЕРОВ ====================
async function updateCharacterOrder(characterId, orderIndex) {
    await ensureDb();
    const { error } = await db
        .from('user_characters')
        .update({ order_index: orderIndex })
        .eq('id', characterId);
    if (error) console.error('updateCharacterOrder:', error);
    return !error;
}

async function updateTimerOrder(timerId, orderIndex) {
    await ensureDb();
    const { error } = await db
        .from('user_timers')
        .update({ order_index: orderIndex })
        .eq('id', timerId);
    if (error) console.error('updateTimerOrder:', error);
    return !error;
}
// ==================== ИСТОРИЯ ТАЙМЕРОВ ====================
async function addTimerHistory(historyItem) {
    await ensureDb();
    const user = getCurrentUser();

    // Защита от дублей
    const { data: existing } = await db
        .from('timer_history')
        .select('id')
        .eq('timer_id', historyItem.timer_id)
        .eq('end_time', historyItem.end_time)
        .maybeSingle();

    if (existing) return null;

    const { data, error } = await db
        .from('timer_history')
        .insert({ ...historyItem, user_id: user ? user.login : null })
        .select();
    return error ? null : data;
}
async function getTimerHistory(characterId = null, limit = 100) {
    await ensureDb();
    const user = getCurrentUser();
    if (!user) return [];
    let query = db.from('timer_history').select('*').eq('user_id', user.login).order('end_time', { ascending: false }).limit(limit);
    if (characterId) query = query.eq('character_id', characterId);
    const { data, error } = await query;
    return error ? [] : data;
}
async function updateTimerHistoryNote(id, notes) {
    await ensureDb();
    const { error } = await db.from('timer_history').update({ notes }).eq('id', id);
    return !error;
}
async function deleteTimerHistory(id) {
    await ensureDb();
    const { error } = await db.from('timer_history').delete().eq('id', id);
    return !error;
}
async function clearTimerHistory(characterId = null) {
    await ensureDb();
    const user = getCurrentUser();
    if (!user) return false;
    let query = db.from('timer_history').delete().eq('user_id', user.login);
    if (characterId) query = query.eq('character_id', characterId);
    const { error } = await query;
    return !error;
}

// ==================== ЗАМЕТКИ ПОЛЬЗОВАТЕЛЯ ====================
async function getUserNote(userLogin) {
    await ensureDb();
    const { data, error } = await db
        .from('user_notes')
        .select('*')
        .eq('user_id', userLogin)
        .maybeSingle();
    return error ? null : data;
}

async function saveUserNote(userLogin, content) {
    await ensureDb();
    const existing = await getUserNote(userLogin);
    if (existing) {
        const { error } = await db
            .from('user_notes')
            .update({ content, updated_at: new Date().toISOString() })
            .eq('user_id', userLogin);
        return !error;
    } else {
        const { error } = await db
            .from('user_notes')
            .insert({ user_id: userLogin, content });
        return !error;
    }
}

// ==================== ИЗБРАННЫЕ КВЕСТЫ ====================
async function getFavoriteQuests(userLogin) {
    await ensureDb();
    const { data, error } = await db
        .from('user_favorite_quests')
        .select('*')
        .eq('user_id', userLogin)
        .order('added_at', { ascending: false });
    return error ? [] : data;
}

async function addFavoriteQuest(userLogin, questId) {
    await ensureDb();
    const { data: existing } = await db
        .from('user_favorite_quests')
        .select('id')
        .eq('user_id', userLogin)
        .eq('quest_id', questId)
        .maybeSingle();
    if (existing) return false;
    const { error } = await db
        .from('user_favorite_quests')
        .insert({ user_id: userLogin, quest_id: questId });
    return !error;
}

async function removeFavoriteQuest(userLogin, questId) {
    await ensureDb();
    const { error } = await db
        .from('user_favorite_quests')
        .delete()
        .eq('user_id', userLogin)
        .eq('quest_id', questId);
    return !error;
}

// ==================== ЛИДЕРЫ ====================
async function getLeaderboard() {
    await ensureDb();
    const { data, error } = await db.rpc('get_leaderboard');
    if (error) { console.error('getLeaderboard:', error); return []; }
    return data || [];
}