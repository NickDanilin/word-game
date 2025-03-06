// ----- Данные и глобальные переменные ----- //

const sentences = [
    "Кошка лежит на теплом подоконнике",
    "Море шумит нежным вечерним бризом",
    "Бабочка села на яркий цветок",
    "Дерево растет высоко над домами",
    "Солнце греет землю своими лучами"
];

// Допустимое вертикальное расхождение
const verticalTolerance = 30;

// Допустимое горизонтальное расхождение (разрыв)
const maxHorizontalGap = 100;

// Ограничение сборки у границ контейнера
const minDragMargin = 30;

// DOM-элементы
const container = document.getElementById("game-container");
const restartBtn = document.getElementById("restart-btn");

// Текущее состояние слов, а также флаг успеха
let wordObjects = [];
let successShown = false;

// ----- Стартовая инициализация ----- //

initGame(); // при загрузке
restartBtn.addEventListener("click", initGame); // при перезапуске

function initGame() {
    container.innerHTML = "";
    successShown = false;
    wordObjects = [];

    const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
    const words = randomSentence.split(" ");

    createWordCards(words);
}

// Создаём карточек и распределение по контейнеру
function createWordCards(words) {
    const rect = container.getBoundingClientRect();
    const cWidth = rect.width;
    const cHeight = rect.height;

    words.forEach((text) => {
        const div = document.createElement("div");
        div.classList.add("word-card");
        div.textContent = text;

        // Ищем свободную позицию без наложений
        const {x, y} = findNonOverlappingPosition(div, cWidth, cHeight, 50);

        div.style.left = x + "px";
        div.style.top = y + "px";

        const obj = {
            text,
            currentX: x,
            currentY: y,
            element: div
        };
        wordObjects.push(obj);

        // Подключаем перетаскивание
        addDragEvents(div, obj);

        container.appendChild(div);
    });
}

// Вспомогательная функция для проверки не пересекаемости
function findNonOverlappingPosition(div, cWidth, cHeight, maxAttempts) {
    // Приблизительные габариты (до фактического добавления в DOM)
    const approxWidth = div.textContent.length * 8 + 20;
    const approxHeight = 30;

    for (let i = 0; i < maxAttempts; i++) {
        let randX = randomRange(0, cWidth - approxWidth);
        let randY = randomRange(0, cHeight - approxHeight);

        // Проверяем, нет ли пересечения
        const tempRect = {
            left: randX,
            top: randY,
            right: randX + approxWidth,
            bottom: randY + approxHeight
        };

        let overlap = false;
        for (let obj of wordObjects) {
            const w = obj.element.offsetWidth;
            const h = obj.element.offsetHeight;

            const existingRect = {
                left: obj.currentX,
                top: obj.currentY,
                right: obj.currentX + w,
                bottom: obj.currentY + h
            };

            if (isIntersecting(tempRect, existingRect)) {
                overlap = true;
                break;
            }
        }
        if (!overlap) {
            return {x: randX, y: randY};
        }
    }
    // fallback
    return {x: 0, y: 0};
}

// Проверяет, пересекаются ли два прямоугольника
function isIntersecting(r1, r2) {
    return !(
        r2.left >= r1.right ||
        r2.right <= r1.left ||
        r2.top >= r1.bottom ||
        r2.bottom <= r1.top
    );
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// ----- Перетаскивание слов с учетом ограничений + завершение игры ----- //

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

        // ограничиваем с учётом minDragMargin
        const maxX = containerRect.width - el.offsetWidth - minDragMargin;
        const maxY = containerRect.height - el.offsetHeight - minDragMargin;

        newX = Math.max(minDragMargin, Math.min(newX, maxX));
        newY = Math.max(minDragMargin, Math.min(newY, maxY));

        // проверяем, не пересечётся ли новое положение с другими карточками
        const newRect = {
            left: newX,
            top: newY,
            right: newX + el.offsetWidth,
            bottom: newY + el.offsetHeight
        };

        let canPlace = true;
        for (let other of wordObjects) {
            if (other === obj) continue; // сам с собой не сравниваем

            const w = other.element.offsetWidth;
            const h = other.element.offsetHeight;

            const otherRect = {
                left: other.currentX,
                top: other.currentY,
                right: other.currentX + w,
                bottom: other.currentY + h
            };

            if (isIntersecting(newRect, otherRect)) {
                canPlace = false;
                break;
            }
        }

        if (!canPlace) {
            // Если пересекается, не даём двигать (просто выходим)
            return;
        }

        // Обновляем позицию
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
            blockAllCards(); // Блокируем дальнейшее перетаскивание
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

// Проверка, что предложение собрано
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

    // Проверка, что между соседними словами нет большого разрыва
    for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i+1].currentX - sorted[i].currentX;
        if (gap > maxHorizontalGap) {
            return false;
        }
    }

    return true;
}

// ----- Празднование победы полетом звезды ----- //

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

    // Полигон звезды
    const starPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    starPolygon.setAttribute("points", "0,-10 4,-3 10,-3 6,2 7,9 0,5 -7,9 -6,2 -10,-3 -4,-3");
    starPolygon.classList.add("star-polygon");

    starGroup.appendChild(starPolygon);
    svg.appendChild(starGroup);

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
