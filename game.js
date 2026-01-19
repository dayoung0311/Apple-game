const ROWS = 10;
const COLS = 17;
const MIN = 1;
const MAX = 9;

let apples = [];
let score = 0;
let combo = 0;

const CELL_SIZE = 40;
const GAP = 22;

let isDragging = false;
let selectedApples = [];
let currentSum = 0;

const GAME_TIME = 60;

let timeLeft = GAME_TIME;
let timerId = null;

let gameState = 'PLAYING'; // 'PLAYING' | 'ENDED'

const board = document.getElementById('game-board');
const appleElements = new Map();

const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const timeEl = document.getElementById('time');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');
const timerBarFill = document.getElementById('timer-bar-fill');
const restartBtn = document.getElementById('restart-btn');

function getRandomNumber() {
    return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}

function createApples() {
    const apples = [];

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            apples.push({
                id: crypto.randomUUID(),
                value: getRandomNumber(),
                row,
                col,
                x: col * (CELL_SIZE + GAP),
                y: row * (CELL_SIZE + GAP),
                removed: false,
            });

        }
    }

    return apples;
}

function renderApples(apples) {
    board.innerHTML = '';
    appleElements.clear();

    apples.forEach((apple) => {
        if (apple.removed) return;

        const el = document.createElement('div');
        el.className = 'apple';
        el.textContent = apple.value;

        el.dataset.id = apple.id;
        el.dataset.row = apple.row;
        el.dataset.col = apple.col;

        // 좌표 고정
        el.style.left = `${apple.x}px`;
        el.style.top = `${apple.y}px`;

        el.addEventListener('mousedown', onAppleMouseDown);
        el.addEventListener('mouseenter', onAppleMouseEnter);

        appleElements.set(apple.id, el);
        board.appendChild(el);
    });
}

function initGame() {
  apples = createApples();

  score = 0;
  combo = 0;
  timeLeft = GAME_TIME;
  gameState = 'PLAYING';

  updateScoreUI();
  updateTimeUI();
  updateTimerBar();

  renderApples(apples);
  startTimer();
}

initGame();

document.addEventListener('mouseup', onMouseUp);

function onAppleMouseDown(e) {
    if (gameState !== 'PLAYING') return;

    isDragging = true;
    resetSelection();

    selectApple(e.target); // 첫 사과는 인접 검사 없이 선택
}

function onAppleMouseEnter(e) {
    if (gameState !== 'PLAYING') return;

    if (!isDragging) return;

    const target = e.target;
    const appleId = target.dataset.id;

    if (selectedApples.includes(appleId)) return;

    const lastApple = getLastSelectedApple();
    const nextApple = getAppleById(appleId);

    if (!canConnect(lastApple, nextApple)) return;

    selectApple(target);
}

function onMouseUp() {
    if (gameState !== 'PLAYING') return;
    if (!isDragging) return;

    isDragging = false;

    if (currentSum === 10) {
        const count = selectedApples.length;

        // 1️. 점수 계산
        const gainedScore = calculateScore({
            count,
            combo,
        });

        // 2️. 점수 반영
        score += gainedScore;
        combo += 1;

        updateScoreUI();

        // 3️. 사과 제거
        removeSelectedApples();
    } else {
        // 실패 시 콤보 초기화
        combo = 0;
        updateScoreUI();
    }

    resetSelection();

}

// function clearSelection() {
//     selectedApples.forEach((id) => {
//         const el = document.querySelector(`[data-id="${id}"]`);
//         if (el) el.classList.remove('selected');
//     });

//     selectedApples = [];
//     currentSum = 0;
// }


function selectApple(el) {
    if (gameState !== 'PLAYING') return;

    const id = el.dataset.id;
    const apple = getAppleById(id);

    if (!apple) return;

    selectedApples.push(id);
    currentSum += apple.value;

    // appleElements 기준으로 selected 처리
    const appleEl = appleElements.get(id);
    if (appleEl) {
        appleEl.classList.add('selected');
    }
}


function resetSelection() {
    selectedApples.forEach((id) => {
        const el = appleElements.get(id);
        if (el) el.classList.remove('selected');
    });

    selectedApples = [];
    currentSum = 0;
}

function canConnect(a, b) {

    if (!a || !b) return false;

    const visited = Array.from({ length: ROWS }, () =>
        Array(COLS).fill(false)
    );

    const queue = [];
    queue.push([a.row, a.col]);
    visited[a.row][a.col] = true;

    // 8방향 (대각선 포함)
    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1],
    ];

    while (queue.length > 0) {
        const [row, col] = queue.shift();

        // 목표 도달
        if (row === b.row && col === b.col) {
            return true;
        }

        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;

            // 범위 체크
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
            if (visited[nr][nc]) continue;

            const apple = getAppleAt(nr, nc);

            // 이동 가능 조건
            // 1. 빈 칸
            // 2. 또는 목표 위치
            if (!apple || (nr === b.row && nc === b.col)) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
            }
        }
    }

    return false;
}


function getAppleById(id) {
    return apples.find((a) => a.id === id);
}

function getAppleAt(row, col) {
    return apples.find(
        (a) => a.row === row && a.col === col && !a.removed
    );
}

function getLastSelectedApple() {
    if (selectedApples.length === 0) return null;
    return getAppleById(selectedApples[selectedApples.length - 1]);
}

function removeSelectedApples() {
    selectedApples.forEach((id) => {
        // 데이터 제거
        const apple = getAppleById(id);
        apple.removed = true;

        // DOM 제거 (cell은 유지)
        const appleEl = appleElements.get(id);
        if (appleEl) {
            appleEl.remove();
            appleElements.delete(id);
        }
    });
}

function updateScoreUI() {
    scoreEl.textContent = score;

    if (combo >= 2) {
        comboEl.textContent = `콤보 x${combo}`;
    } else {
        comboEl.textContent = '';
    }
}

function getComboMultiplier(combo) {
    if (combo >= 3) return 2.0;
    if (combo === 2) return 1.5;
    return 1.0;
}

function calculateScore({ count, combo }) {
    // 1️. 기본 점수 (누적 방식)
    let baseScore = count * 10;

    // 2️. 효율성 보너스
    let efficiencyBonus = count >= 4 ? 50 : 0;

    // 3️. 콤보 배율
    const multiplier = getComboMultiplier(combo);

    // 4️. 최종 점수
    return Math.floor((baseScore + efficiencyBonus) * multiplier);
}

function updateTimeUI() {
    timeEl.textContent = timeLeft;
}
function updateTimerBar() {
    if (!timerBarFill) return;

    const ratio = timeLeft / GAME_TIME;
    const percentage = Math.max(0, ratio * 100);

    // 길이 조절
    timerBarFill.style.width = `${percentage}%`;

    // 색상 변화
    if (ratio <= 0.1) {
        timerBarFill.style.background = '#e53935'; // 빨강
    } else if (ratio <= 0.3) {
        timerBarFill.style.background = '#fbc02d'; // 노랑
    } else {
        timerBarFill.style.background = '#4caf50'; // 초록
    }
}

function startTimer() {
    stopTimer(); // 중복 방지

    timerId = setInterval(() => {
        if (gameState !== 'PLAYING') return;

        timeLeft -= 1;
        updateTimeUI();
        updateTimerBar();


        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function stopTimer() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }
}

function endGame() {
    gameState = 'ENDED';
    stopTimer();

    // 최종 점수 표시
    finalScoreEl.textContent = score;

    // 오버레이 표시
    gameOverOverlay.classList.remove('hidden');
}

restartBtn.addEventListener('click', () => {
  // 1️. Game Over 화면 숨기기
  gameOverOverlay.classList.add('hidden');

  // 2️. 기존 타이머 완전 정지 (안전)
  stopTimer();

  // 3️. 게임 초기화 (핵심)
  initGame();
});



