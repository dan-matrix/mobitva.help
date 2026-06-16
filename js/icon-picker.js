// ==================== ОБЩИЙ ПИКЕР ИКОНОК ДЛЯ ICONS.PNG ====================
let currentIconPickerCallback = null;

function showIconPickerIcons(callback, buttonElement, options = {}) {
    currentIconPickerCallback = callback;
    
    const existingPicker = document.getElementById('iconPickerIcons');
    if(existingPicker) existingPicker.remove();
    
    const picker = document.createElement('div');
    picker.id = 'iconPickerIcons';
    picker.className = 'icon-picker-icons-container';
    picker.style.cssText = `
        position: fixed;
        z-index: 10002;
        background: linear-gradient(145deg,#1e1a14,#0a0806);
        border: 2px solid #c7ba00;
        border-radius: 16px;
        padding: 15px;
        box-shadow: 0 0 30px rgba(0,0,0,0.5);
        display: none;
    `;
    
    picker.innerHTML = `
        <div class="icon-picker-icons-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #c7ba00;">
            <h3 style="color:#d4b35a; margin:0; font-size:16px;">🎨 Выберите иконку (${options.title || 'icons.png'})</h3>
            <button class="close-icon-picker-icons" style="background:#ff4444; border:none; border-radius:6px; padding:5px 15px; color:white; cursor:pointer;">✕ Закрыть</button>
        </div>
        <div class="icon-picker-icons-grid" style="display:grid; grid-template-columns:repeat(12, 28px); gap:4px; max-height:400px; overflow-y:auto; padding:5px; justify-content:center;"></div>
    `;
    
    document.body.appendChild(picker);
    
    const grid = picker.querySelector('.icon-picker-icons-grid');
    for(let row = 0; row < 5; row++) {
        for(let col = 0; col < 12; col++) {
            const iconDiv = document.createElement('div');
            iconDiv.className = 'icon-picker-icon-cell';
            iconDiv.style.cssText = `
                width: 28px;
                height: 28px;
                background-image: url('img/icons.png');
                background-repeat: no-repeat;
                background-position: -${col * 28}px -${row * 28}px;
                background-size: auto;
                cursor: pointer;
                border: 2px solid #5a4a38;
                border-radius: 4px;
                transition: 0.2s;
                margin: 0 auto;
            `;
            iconDiv.onmouseover = () => { iconDiv.style.borderColor = '#ffaa44'; iconDiv.style.transform = 'scale(1.1)'; };
            iconDiv.onmouseout = () => { iconDiv.style.borderColor = '#5a4a38'; iconDiv.style.transform = 'scale(1)'; };
            iconDiv.onclick = (function(r, c) {
                return function() {
                    if(currentIconPickerCallback) currentIconPickerCallback(r, c);
                    picker.style.display = 'none';
                };
            })(row, col);
            grid.appendChild(iconDiv);
        }
    }
    
    picker.querySelector('.close-icon-picker-icons').onclick = () => {
        picker.style.display = 'none';
    };
    
    const btnRect = buttonElement.getBoundingClientRect();
    let top = btnRect.bottom + 5;
    let left = btnRect.left;
    
    if(top + 400 > window.innerHeight) {
        top = btnRect.top - 405;
    }
    if(left + 350 > window.innerWidth) {
        left = window.innerWidth - 360;
    }
    if(left < 0) left = 5;
    
    picker.style.top = top + 'px';
    picker.style.left = left + 'px';
    picker.style.display = 'block';
    
    const closeOnClickOutside = (e) => {
        if(!picker.contains(e.target) && !buttonElement.contains(e.target)) {
            picker.style.display = 'none';
            document.removeEventListener('click', closeOnClickOutside);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', closeOnClickOutside);
    }, 100);
}

function getIconClassFromCoords(row, col) {
    return `icon-${row}-${col}`;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ИКОНОК ====================

// Возвращает HTML строку иконки из icons.png по координатам ряда и колонки
function getIconHtml(row, col, size = 28) {
    return `<div class="icon-from-icons" style="--row:${row}; --col:${col}; width:${size}px; height:${size}px;"></div>`;
}

// Создаёт DOM элемент иконки
function createIconElement(row, col, size = 28) {
    const div = document.createElement('div');
    div.className = 'icon-from-icons';
    div.style.setProperty('--row', row);
    div.style.setProperty('--col', col);
    div.style.width = size + 'px';
    div.style.height = size + 'px';
    return div;
}