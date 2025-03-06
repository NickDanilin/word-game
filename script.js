// ====== 1. ДАННЫЕ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====== //

// Пять возможных предложений:
const sentences = [
    "Кошка лежит на теплом подоконнике",
    "Море шумит нежным вечерним бризом",
    "Бабочка села на яркий цветок",
    "Дерево растет высоко над домами",
    "Солнце греет землю своими лучами"
];

// Допустимое вертикальное расхождение (для «одной линии»)
const verticalTolerance = 30;

// DOM-элементы
const container = document.getElementById("game-container");
const restartBtn = document.getElementById("restart-btn");

// Текущее состояние слов, а также флаг «уже собрано»
let wordObjects = [];
let successShown = false;

// ====== 2. СТАРТОВАЯ ИНИЦИАЛИЗАЦИЯ ====== //

initGame(); // Запускаем при загрузке
restartBtn.addEventListener("click", initGame); // По нажатию перезапуск

function initGame() {
    // 1) Очищаем контейнер (сотрём слова, svg, звёздочку), сбросим флаг
    container.innerHTML = "";
    successShown = false;
    wordObjects = [];

    // 2) Прячем кнопку "Restart", чтобы не мешала
    restartBtn.style.display = "none";

    // 3) Выбираем случайное предложение
    const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
    const words = randomSentence.split(" ");

    // 4) Создаём карточки
    createWordCards(words);
}

// Создаём слова, рандомно раскидываем в container
function createWordCards(words) {
    const rect = container.getBoundingClientRect();
    const cWidth = rect.width;
    const cHeight = rect.height;

    words.forEach((text) => {
        const div = document.createElement("div");
        div.classList.add("word-card");
        div.textContent = text;

        // Случайная позиция в контейнере
        const randX = randomRange(0, cWidth - 80);
        const randY = randomRange(0, cHeight - 40);
        div.style.left = randX + "px";
        div.style.top = randY + "px";

        const obj = {
            text,
            currentX: randX,
            currentY: randY,
            element: div
        };
        wordObjects.push(obj);

        // Добавляем перетаскивание
        addDragEvents(div, obj);

        container.appendChild(div);
    });
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// ====== 3. ПЕРЕТАСКИВАНИЕ СЛОВ ====== //

function addDragEvents(el, obj) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    el.addEventListener("mousedown", (e) => {
        // Если уже собрали, запрещаем двигать
        if (successShown) return;

        isDragging = true;
        offsetX = e.clientX - el.getBoundingClientRect().left;
        offsetY = e.clientY - el.getBoundingClientRect().top;

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;

        const containerRect = container.getBoundingClientRect();
        let newX = e.clientX - containerRect.left - offsetX;
        let newY = e.clientY - containerRect.top - offsetY;

        // Ограничиваем область
        newX = Math.max(0, Math.min(newX, containerRect.width - el.offsetWidth));
        newY = Math.max(0, Math.min(newY, containerRect.height - el.offsetHeight));

        el.style.left = newX + "px";
        el.style.top = newY + "px";

        obj.currentX = newX;
        obj.currentY = newY;
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        // Проверяем условие победы
        if (!successShown && checkWin()) {
            successShown = true;
            startStarOrbit();
            blockAllCards();             // Блокируем дальнейшее перетаскивание
            restartBtn.style.display = "inline-block"; // Показываем кнопку перезапуска
        }
    }
}

// Блокируем все карточки от перетаскивания
function blockAllCards() {
    for (let obj of wordObjects) {
        obj.element.style.pointerEvents = "none";
        obj.element.style.cursor = "default";
    }
}

// ====== 4. ПРОВЕРКА, ЧТО СЛОВА СОБРАНЫ ====== //

function checkWin() {
    // Сортируем копию слов по X
    const sorted = [...wordObjects].sort((a, b) => a.currentX - b.currentX);

    // Проверка правильного порядка
    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].text !== wordObjects[i].text) {
            return false;
        }
    }

    // Проверка «одной линии» по Y
    const refY = sorted[0].currentY;
    for (let i = 1; i < sorted.length; i++) {
        if (Math.abs(sorted[i].currentY - refY) > verticalTolerance) {
            return false;
        }
    }
    return true;
}

// ====== 5. ПОСТРОЕНИЕ ОРБИТЫ И АНИМАЦИЯ ЗВЕЗДЫ ====== //

function startStarOrbit() {
    const margin = 20;
    const { minX, maxX, minY, maxY } = getBoundingBox(wordObjects);

    // Центр эллипса
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Половина ширины/высоты + небольшой отступ
    const rx = (maxX - minX) / 2 + margin;
    const ry = (maxY - minY) / 2 + margin;

    // Создаём и добавляем SVG, чтобы «проложить» орбиту
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "orbit-svg");
    svg.setAttribute("width", container.offsetWidth);
    svg.setAttribute("height", container.offsetHeight);
    container.appendChild(svg);

    // Создаём путь «эллипс»
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("id", "orbit-path");
    path.setAttribute("d", makeEllipsePath(cx, cy, rx, ry));
    svg.appendChild(path);

    // Группа для звезды
    const starGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // Полигон звезды (пятилучевая, радиус около 10px)
    const starPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    starPolygon.setAttribute("points", "0,-10 4,-3 10,-3 6,2 7,9 0,5 -7,9 -6,2 -10,-3 -4,-3");
    starPolygon.classList.add("star-polygon");

    starGroup.appendChild(starPolygon);
    svg.appendChild(starGroup);

    // animateMotion + mpath
    const anim = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
    anim.setAttribute("dur", "5s");
    anim.setAttribute("repeatCount", "indefinite");
    anim.setAttribute("rotate", "auto");

    const mpath = document.createElementNS("http://www.w3.org/2000/svg", "mpath");
    mpath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#orbit-path");

    anim.appendChild(mpath);
    starGroup.appendChild(anim);

    // Показываем SVG
    svg.style.display = "block";
}

// Учитываем ширину/высоту каждой карточки
function getBoundingBox(objs) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (let o of objs) {
        const x1 = o.currentX;
        const y1 = o.currentY;
        const w = o.element.offsetWidth;
        const h = o.element.offsetHeight;

        const x2 = x1 + w;
        const y2 = y1 + h;

        if (x1 < minX) minX = x1;
        if (y1 < minY) minY = y1;
        if (x2 > maxX) maxX = x2;
        if (y2 > maxY) maxY = y2;
    }
    return { minX, maxX, minY, maxY };
}

// Построение замкнутого эллипса
function makeEllipsePath(cx, cy, rx, ry) {
    return `
    M ${cx} ${cy - ry}
    A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry}
    A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry}
    Z
  `;
}
