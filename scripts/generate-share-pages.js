// ====================================================================
// Генератор превью-страниц для соцсетей/мессенджеров (Telegram, VK, Discord и т.д.)
//
// Зачем это нужно: боты, которые разворачивают ссылку в красивую карточку
// (когда кидаешь ссылку в чат), НЕ выполняют JavaScript и не видят данные,
// которые сайт подгружает из Supabase на лету. Поэтому для каждого
// предмета/руны/сущности заранее, во время сборки, генерируется отдельный
// маленький статический HTML-файл с готовыми тегами og:title/og:description/
// og:image — а обычного человека, который перешёл по ссылке, этот файл сразу
// перенаправляет на настоящую интерактивную страницу сайта.
//
// Запускается через GitHub Actions при каждом пуше (см. .github/workflows/
// generate-share-pages.yml), не требует ручного запуска.
// ====================================================================

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

let sharp = null;
try {
    sharp = require('sharp');
} catch (e) {
    console.warn('! Модуль "sharp" недоступен — иконки предметов вырезаться не будут, будет использован общий значок сайта.');
}

const SUPABASE_URL = 'https://gmcqxgxwtczjlwyifwew.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtY3F4Z3h3dGN6amx3eWlmd2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjIxMTAsImV4cCI6MjA5MDk5ODExMH0.cM6xm9qCRbl-c1h-pWOWKSeAozYUy7KpJjua79JgFuk';
const SITE_URL = 'https://mobitva.help';
const ROOT = path.join(__dirname, '..');
const SHOP_SPRITE_PATH = path.join(ROOT, 'img', 'shop.png');
const SPRITE_CELL = 80;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { transport: WebSocket },
    auth: { persistSession: false },
});

// Описание каждой категории: таблица в БД, папка на сайте, куда ведёт редирект,
// параметр URL, которым запрос открывает нужную модалку на живой странице.
const CATEGORIES = [
    { table: 'items', folder: 'items', appPath: '/items/', param: 'id', label: 'Предмет' },
    { table: 'demons', folder: 'demon', appPath: '/demon/', param: 'id', label: 'Круг демона' },
    { table: 'totems', folder: 'totem', appPath: '/totem/', param: 'id', label: 'Тотем' },
    { table: 'runes_master', folder: 'master', appPath: '/master/', param: 'id', label: 'Руна мастера' },
    { table: 'runes_druids', folder: 'druids', appPath: '/druids/', param: 'id', label: 'Руна друидов' },
    { table: 'nakolki', folder: 'nakolki', appPath: '/nakolki/', param: 'id', label: 'Наколка' },
    { table: 'enhancements', folder: 'enhancements', appPath: '/enhancements/', param: 'id', label: 'Усиление' },
    { table: 'secret_items_new', folder: 'secret_items', appPath: '/secret_items/', param: 'id', label: 'Секретная вещь' },
    { table: 'secret_sets_new', folder: 'secret_sets', appPath: '/secret_sets/', param: 'set', label: 'Секретный сет' },
];

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildDescription(row) {
    const parts = [];
    if (row.level !== undefined && row.level !== null) parts.push(`Уровень: ${row.level}`);
    if (row.stats && typeof row.stats === 'object') {
        const statsText = Object.entries(row.stats)
            .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 0)
            .slice(0, 4)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        if (statsText) parts.push(statsText);
    }
    if (row.description) parts.push(String(row.description));
    let text = parts.join('. ');
    if (text.length > 200) text = text.slice(0, 197) + '...';
    return text || 'Справочник Mobitva.help — база данных игры МоБитва.';
}

async function cropIcon(row, outFile) {
    try {
        if (!sharp) return null;
        if (row.icon_row === undefined || row.icon_row === null || row.icon_col === undefined || row.icon_col === null) {
            return null;
        }
        if (!fs.existsSync(SHOP_SPRITE_PATH)) return null;
        await sharp(SHOP_SPRITE_PATH)
            .extract({
                left: Number(row.icon_col) * SPRITE_CELL,
                top: Number(row.icon_row) * SPRITE_CELL,
                width: SPRITE_CELL,
                height: SPRITE_CELL,
            })
            .toFile(outFile);
        return true;
    } catch (e) {
        console.warn(`  ! Не удалось вырезать иконку (row=${row.icon_row}, col=${row.icon_col}):`, e.message);
        return null;
    }
}

function renderSharePage({ title, description, imageUrl, canonicalUrl, redirectUrl }) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} - Mobitva(МоБитва)</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:site_name" content="Mobitva.help">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(redirectUrl)}">
<link rel="icon" type="image/png" href="/img/books.png">
</head>
<body>
<p>Открываем страницу... Если перенаправление не произошло автоматически, <a href="${escapeHtml(redirectUrl)}">нажмите сюда</a>.</p>
<script>location.replace(${JSON.stringify(redirectUrl)});</script>
</body>
</html>
`;
}

async function run() {
    let totalGenerated = 0;

    for (const cat of CATEGORIES) {
        console.log(`\n=== ${cat.label} (${cat.table}) ===`);
        const { data, error } = await supabase.from(cat.table).select('*');
        if (error) {
            console.warn(`  ! Не удалось получить данные из "${cat.table}":`, error.message);
            continue;
        }
        if (!data || data.length === 0) {
            console.log('  Нет строк, пропуск.');
            continue;
        }

        for (const row of data) {
            const id = row.id;
            const outDir = path.join(ROOT, 'share', cat.folder, String(id));
            fs.mkdirSync(outDir, { recursive: true });

            const title = row.name ? String(row.name) : `${cat.label} #${id}`;
            const description = buildDescription(row);

            const iconFile = path.join(outDir, 'icon.png');
            const gotIcon = await cropIcon(row, iconFile);
            const imageUrl = gotIcon
                ? `${SITE_URL}/share/${cat.folder}/${id}/icon.png`
                : `${SITE_URL}/img/books.png`;

            const canonicalUrl = `${SITE_URL}/share/${cat.folder}/${id}/`;
            const redirectUrl = `${cat.appPath}?${cat.param}=${id}&open=modal`;

            const html = renderSharePage({ title, description, imageUrl, canonicalUrl, redirectUrl });
            fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
            totalGenerated++;
        }
        console.log(`  Сгенерировано страниц: ${data.length}`);
    }

    console.log(`\nГотово. Всего сгенерировано превью-страниц: ${totalGenerated}`);
}

run().catch(err => {
    console.error('Ошибка генерации превью-страниц:', err);
    process.exit(1);
});
