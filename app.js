// ----- Constants and Variables -----
const mazeSize = 10; // 10x10 grid
let playerPosition = { x: 0, y: 0 }; // Starting position
let enemyPosition = { x: 0, y: 0 }; // Enemy starting position
let exitPosition = { x: 0, y: 0 }; // Exit position
let collectibleCount = 0; // Number of collectibles in the maze
let keyCount = 0; // Number of keys in the maze
let enemyInterval = null; // Interval ID for enemy movement
let isGameActive = false; // Game starts inactive
let isTimerRunning = false; // Controls the timer's activity


// Game state variables
let startTime = null; // Will be set when the game starts
let deaths = 0;
let collectibles = 0;
let keys = 0;
let tasks = []; // Array to hold loaded tasks
let currentTask = null; // To keep track of the current task
let completedTasks = new Set(); // Track completed tasks
let movementAccumulator = { x: 0, y: 0 }; // For mobile gyroscope controls

const maze = document.getElementById("maze");
const mazeContainer = document.getElementById("maze-container");

// ----- Initialization -----
window.onload = () => {
    setupStartModal();
    loadGameState();
    initializeGame();
};

// ----- Start Modal -----
function setupStartModal() {
    const startModalHTML = `
        <div id="startModal" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 10px; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h2>Start Game?</h2>
                <button id="startButton" style="padding: 10px 20px; font-size: 16px;">Start Game</button>
            </div>
        </div>`;
    mazeContainer.insertAdjacentHTML("beforeend", startModalHTML);

    document.getElementById("startButton").addEventListener("click", () => {
        document.getElementById("startModal").style.display = "none";
        isGameActive = true;
        isTimerRunning = true;
        startTime = Date.now();
    });
}

// ----- Task Management -----
async function loadTasks() {
    try {
        const response = await fetch('tasks.json');
        if (!response.ok) console.error("Failed to load tasks.json");

        const data = await response.json();
        console.log(data);

        tasks = data.tasks;
    } catch (error) {
        console.error("Error loading tasks:", error);
    }
}

function getNextTask() {
    const availableTasks = tasks.filter(task => !completedTasks.has(task.id));
    if (availableTasks.length === 0) {
        completedTasks.clear();
        endGame();
    }

    const randomTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];
    completedTasks.add(randomTask.id);
    return randomTask;
}

// ----- Save and Load Game State -----
function saveGameState() {
    const gameState = {
        playerPosition,
        enemyPosition,
        collectibles,
        keys,
        deaths,
        startTime,
        completedTasks: Array.from(completedTasks),
        currentTask,
    };
    localStorage.setItem("gameState", JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem("gameState");
    if (savedState) {
        const state = JSON.parse(savedState);
        playerPosition = state.playerPosition;
        enemyPosition = state.enemyPosition;
        collectibles = state.collectibles;
        keys = state.keys;
        deaths = state.deaths;
        startTime = state.startTime;
        completedTasks = new Set(state.completedTasks);
        currentTask = state.currentTask;
        setupLevel(currentTask); // Restore current level
    }
}

// ----- Timer -----
function updateTimer() {
    if (!startTime || !isTimerRunning) return;
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    document.getElementById("timer").innerText =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
setInterval(updateTimer, 1000);

// ----- Maze Setup -----
function initializeGame() {
    loadTasks().then(() => {
        const initialTask = getNextTask();
        setupLevel(initialTask);

        if (isIOS()) {
            // Show the permission popup for iOS devices
            showIOSPermissionPopup();
        } else {
            // Directly start listening to device orientation for non-iOS
            window.addEventListener("deviceorientation", handleDeviceOrientation);
        }
    });
}

function setupLevel(task) {
    clearMaze();
    generateMaze(task);
    currentTask = task;
    document.getElementById("collectibles").innerText = collectibles;

    if (enemyInterval) clearInterval(enemyInterval);
    if (enemyPosition.x !== 0 || enemyPosition.y !== 0) {
        enemyInterval = setInterval(moveEnemy, task.enemySpeed);
    }
}

function clearMaze() {
    maze.innerHTML = '';
    if (enemyInterval) clearInterval(enemyInterval);
}

function generateMaze(task) {
    for (let row = 0; row < mazeSize; row++) {
        for (let col = 0; col < mazeSize; col++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.x = col;
            cell.dataset.y = row;

            const element = task.maze[row][col];
            switch (element) {
                case "wall":
                    cell.classList.add("wall");
                    break;
                case "player":
                    playerPosition = { x: col, y: row };
                    cell.classList.add("player");
                    break;
                case "collectible":
                    cell.classList.add("collectible");
                    collectibleCount += 1;
                    break;
                case "key":
                    cell.classList.add("key");
                    keyCount += 1;
                    break;
                case "enemy":
                    enemyPosition = { x: col, y: row };
                    cell.classList.add("enemy");
                    break;
                case "exit":
                    exitPosition = { x: col, y: row };
                    cell.classList.add("exit");
                    break;
            }
            maze.appendChild(cell);
        }
    }
    placePlayer();
}

function placePlayer() {
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => cell.classList.remove("player"));

    const playerCell = document.querySelectorAll(".cell")[playerPosition.y * mazeSize + playerPosition.x];
    playerCell.classList.add("player");
}

// ----- Player Interaction -----
function collectCollectibles(cell) {
    cell.classList.remove("collectible");
    collectibles += 1;
    document.getElementById("collectibles").innerText = collectibles;
    saveGameState();
    checkWinCondition();
}

function collectKeys(cell) {
    cell.classList.remove("key");
    keys += 1;
    document.getElementById("keys").innerText = keys;
    saveGameState();
    checkWinCondition();
}

function movePlayer(dx, dy) {
    const newX = playerPosition.x + dx;
    const newY = playerPosition.y + dy;

    if (newX >= 0 && newX < mazeSize && newY >= 0 && newY < mazeSize) {
        const newCell = document.querySelector(`.cell[data-x="${newX}"][data-y="${newY}"]`);
        if (!newCell.classList.contains("wall")) {
            playerPosition = { x: newX, y: newY };
            placePlayer();
            saveGameState();
        }

        if (newCell.classList.contains("collectible")) {
            collectCollectibles(newCell);
        }

        if (newCell.classList.contains("key")) {
            collectKeys(newCell);
        }

        checkWinCondition();
    }
}

// ----- Device Controls -----
function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function requestDeviceOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener("deviceorientation", handleDeviceOrientation);
                } else {
                    alert("Motion controls were not granted. You can enable them in your device settings.");
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener("deviceorientation", handleDeviceOrientation);
    }
}

function handleDeviceOrientation(event) {
    if (!isGameActive) return;
    const { beta, gamma } = event;
    const scaleFactor = 0.003;

    movementAccumulator.x += gamma * scaleFactor;
    movementAccumulator.y += beta * scaleFactor;

    if (movementAccumulator.x >= 1) {
        movePlayer(1, 0);
        movementAccumulator.x = 0;
    } else if (movementAccumulator.x <= -1) {
        movePlayer(-1, 0);
        movementAccumulator.x = 0;
    }

    if (movementAccumulator.y >= 1) {
        movePlayer(0, 1);
        movementAccumulator.y = 0;
    } else if (movementAccumulator.y <= -1) {
        movePlayer(0, -1);
        movementAccumulator.y = 0;
    }
}

function showIOSPermissionPopup() {
    const popup = document.createElement("div");
    popup.id = "iosPermissionPopup";

    popup.innerHTML = `
        <div class="modal-content">
            <p>This game requires motion controls. Please enable them to continue.</p>
            <button id="enableMotion" style="padding: 10px 20px;">Enable Motion Controls</button>
        </div>
    `;

    document.body.appendChild(popup);

    document.getElementById("enableMotion").onclick = function() {
        requestDeviceOrientationPermission();
        popup.remove();
    };
}

// ----- Keyboard Controls -----
window.addEventListener("keydown", (event) => {
    if (!isGameActive) return;
    switch (event.key) {
        case "ArrowUp":
        case "w":
            movePlayer(0, -1);
            break;
        case "ArrowDown":
        case "s":
            movePlayer(0, 1);
            break;
        case "ArrowLeft":
        case "a":
            movePlayer(-1, 0);
            break;
        case "ArrowRight":
        case "d":
            movePlayer(1, 0);
            break;
    }
});

// ----- Win and End Game -----
function checkWinCondition() {
    const allCollected = keyCount === keys;
    const playerAtExit = (playerPosition.x === exitPosition.x && playerPosition.y === exitPosition.y);

    if (allCollected && playerAtExit) {
        setupLevel(getNextTask());
    }
}

function endGame() {
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    isTimerRunning = false;

    const endModalHTML = `
        <div id="endModal" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 10px; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h2>Game Over!</h2>
                <p>Total Time: ${minutes}m ${seconds}s<br>Collectibles: ${collectibles}<br>Keys: ${keys}<br>Deaths: ${deaths}</p>
                <button id="restartButton" style="padding: 10px 20px;">Restart</button>
            </div>
        </div>`;
    mazeContainer.insertAdjacentHTML("beforeend", endModalHTML);

    document.getElementById("restartButton").addEventListener("click", () => {
        document.getElementById("endModal").remove();
        restartGame();
    });

    localStorage.removeItem("gameState");
}

// ----- Restart Game -----
function restartGame() {
    playerPosition = { x: 0, y: 0 };
    enemyPosition = { x: 0, y: 0 };
    exitPosition = { x: 0, y: 0 };
    collectibleCount = 0;
    keyCount = 0;
    collectibles = 0;
    keys = 0;
    deaths = 0;
    startTime = Date.now();
    clearMaze();
    setupLevel(getNextTask());
}
