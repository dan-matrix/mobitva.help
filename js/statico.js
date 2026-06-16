
// порядок отображения характеристик
const STAT_ORDER = [
    'износ',
    'количество',
    'годность',
    'точность',
    'урон',
    'блок',
    'оглушение',
    'уворот',
    'броня',
    'здоровье'
];

function createStatElement(statName, statValue) {
    const statLine = document.createElement('div');
    statLine.classList.add('circle-stat-line');

    const statLabel = document.createElement('span');
    statLabel.textContent = getRussianStyleText(statName);

    const statIcon = document.createElement('i');
    let iconClass = getStatIconClass(statName);
    if (iconClass) {
        // разбиваем по пробелам и добавляем каждый токен отдельно
        iconClass.split(/\s+/).forEach(cls => statIcon.classList.add(cls));
        statIcon.classList.add('stat-icon'); // добавляем общий класс
    }

    const statValueEl = document.createElement('span');
    statValueEl.textContent = statValue;
    statValueEl.classList.add('circle-stat-value');

    const leftContainer = document.createElement('div');
    leftContainer.style.display = 'flex';
    leftContainer.style.alignItems = 'center';
    leftContainer.style.gap = '6px';
    leftContainer.appendChild(statIcon);
    leftContainer.appendChild(statLabel);

    statLine.appendChild(leftContainer);
    statLine.appendChild(statValueEl);

    return statLine;
}


function renderStats(statsObj, container) {

    container.innerHTML = '';

    STAT_ORDER.forEach(stat => {
        if (statsObj[stat] !== undefined && statsObj[stat] !== null) {
            const statEl = createStatElement(stat, statsObj[stat]);
            container.appendChild(statEl);
        }
    });
}

