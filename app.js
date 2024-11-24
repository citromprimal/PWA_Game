// ----- Constants and Variables -----
const mazeSize = 10; // 10x10 grid
let playerStart = {x: 0, y: 0}; // Player starting position
let playerPosition = {x: 0, y: 0}; // Player position
let enemyPosition = {x: 0, y: 0}; // Enemy position
let exitPosition = {x: 0, y: 0}; // Exit position
let collectibleCount = 0; // Number of collectibles in the maze
let keyCount = 0; // Number of keys in the maze
let enemyInterval = null; // Interval ID for enemy movement
let isGameActive = false; // Game starts inactive
let isTimerRunning = false; // Controls the timer's activity
let enemies = []; // Store multiple enemies

// Game state variables
let startTime = null; // Will be set when the game starts
let deaths = 0;
let collectibles = 0;
let keys = 0;
let tasks = []; // Array to hold loaded tasks
let currentTask = null; // To keep track of the current task
let completedTasks = new Set(); // Track completed tasks
let movementAccumulator = {x: 0, y: 0}; // For mobile gyroscope controls

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
                <br>
                <button id="startButton" style="padding: 10px 20px; font-size: 16px;"><i class="bi bi-play-circle-fill"></i> Start Game</button>
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
        return null;
    }

    keyCount = 0;
    keys = 0;
    document.getElementById("keys").innerText = keys;

    const randomTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];
    completedTasks.add(randomTask.id);
    return randomTask;
}

// ----- Save and Load Game State -----
function saveGameState() {
    if (!currentTask) {
        console.error("Cannot save game state: currentTask is null or undefined.");
        return;
    }
    const gameState = {
        playerPosition,
        enemyPosition,
        collectibles,
        keys,
        deaths,
        startTime,
        completedTasks: Array.from(completedTasks),
        currentTask, // Ensure this is valid
        enemies: enemies.map(enemy => ({
            position: enemy.position,
            index: enemy.index,
            movingForward: enemy.movingForward
        }))
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

        if (currentTask && currentTask.enemies) {
            enemies = state.enemies.map(savedEnemy => ({
                path: currentTask.enemies.find(e => e.path[0].x === savedEnemy.position.x)?.path || [],
                position: savedEnemy.position,
                index: savedEnemy.index,
                movingForward: savedEnemy.movingForward
            }));
        } else {
            console.warn("Invalid currentTask or enemies, resetting to initial state.");
            currentTask = getNextTask();
            enemies = [];
        }

        setupLevel(currentTask);
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
    if (!task) return;

    clearMaze();
    generateMaze(task);
    currentTask = task;

    const helpField = document.getElementById("helpField");
    if (helpField.style.display === "block") {
        helpField.innerHTML = `<p>${currentTask.help}</p>`;
    }

    enemies = (task.enemies || []).map(enemy => ({
        path: enemy.path,
        position: enemy.path[0],
        index: 0,
        movingForward: true
    }));

    enemies.forEach(enemy => {
        const initialCell = document.querySelector(`.cell[data-x="${enemy.position.x}"][data-y="${enemy.position.y}"]`);
        if (initialCell) initialCell.classList.add("enemy");
    });

    if (enemyInterval) clearInterval(enemyInterval);
    if (enemies.length > 0) {
        enemyInterval = setInterval(moveEnemies, 500);
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
                    playerStart = {x: col, y: row};
                    playerPosition = {x: col, y: row};
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
                case "trap":
                    cell.classList.add("trap");
                    break;
                case "exit":
                    exitPosition = {x: col, y: row};
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

function trapPlayer() {
    playerPosition = playerStart;
    deaths += 1;
    document.getElementById("deaths").innerText = deaths;
    placePlayer();
    saveGameState();
}

function handleInteractions(x, y, cell) {
    if (!cell.classList.contains("wall")) {
        if (cell.classList.contains("exit") && keys !== keyCount) {
            return;
        }

        if (cell.classList.contains("exit-open")) {
            checkWinCondition();
        }

        playerPosition = {x: x, y: y};
        placePlayer();
        saveGameState();
    }

    if (cell.classList.contains("collectible")) {
        collectCollectibles(cell);
    }

    if (cell.classList.contains("key")) {
        collectKeys(cell);
    }

    if (cell.classList.contains("trap")) {
        trapPlayer();
    }

    enemies.forEach(enemy => {
        if (playerPosition.x === enemy.position.x && playerPosition.y === enemy.position.y) {
            trapPlayer();
            console.log("Player caught by enemy!");
        }
    });
}

function moveEnemies() {
    if (!isGameActive) return;

    enemies.forEach(enemy => {
        const currentCell = document.querySelector(`.cell[data-x="${enemy.position.x}"][data-y="${enemy.position.y}"]`);
        if (currentCell) currentCell.classList.remove("enemy");
    });

    enemies.forEach(enemy => {
        if (!enemy.path || enemy.path.length === 0) return;

        // Update the enemy's path index
        if (enemy.movingForward) {
            enemy.index++;
            if (enemy.index >= enemy.path.length) {
                enemy.index = enemy.path.length - 1;
                enemy.movingForward = false;
            }
        } else {
            enemy.index--;
            if (enemy.index < 0) {
                enemy.index = 0;
                enemy.movingForward = true;
            }
        }

        // Update enemy position
        enemy.position = enemy.path[enemy.index];

        // Add "enemy" class to the new position
        const newCell = document.querySelector(`.cell[data-x="${enemy.position.x}"][data-y="${enemy.position.y}"]`);
        if (newCell) newCell.classList.add("enemy");

        // Check if the enemy catches the player
        if (enemy.position.x === playerPosition.x && enemy.position.y === playerPosition.y) {
            trapPlayer();
        }
    });
}

function movePlayer(dx, dy) {
    const newX = playerPosition.x + dx;
    const newY = playerPosition.y + dy;

    if (newX >= 0 && newX < mazeSize && newY >= 0 && newY < mazeSize) {
        const newCell = document.querySelector(`.cell[data-x="${newX}"][data-y="${newY}"]`);

        handleInteractions(newX, newY, newCell);
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
    const {beta, gamma} = event;
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

    document.getElementById("enableMotion").onclick = function () {
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
            event.preventDefault();
            movePlayer(0, -1);
            break;
        case "ArrowDown":
        case "s":
            event.preventDefault();
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

// ----- Mouse Controls -----
maze.addEventListener("click", handleMouseClick);

function handleMouseClick(event) {
    if (!isGameActive) return;

    const cell = event.target;
    if (!cell.classList.contains("cell")) return;

    const targetX = parseInt(cell.dataset.x, 10);
    const targetY = parseInt(cell.dataset.y, 10);

    const dx = targetX - playerPosition.x;
    const dy = targetY - playerPosition.y;

    if (Math.abs(dx) + Math.abs(dy) === 1) {
        movePlayer(dx, dy);
    }
}


// ----- Win and End Game -----
function checkWinCondition() {
    const allCollected = (keyCount === keys);
    const playerAtExit = (playerPosition.x === exitPosition.x && playerPosition.y === exitPosition.y);

    if (allCollected) {
        const exitCell = document.querySelector(`.cell[data-x="${exitPosition.x}"][data-y="${exitPosition.y}"]`);
        exitCell.classList.remove("exit");
        exitCell.classList.add("exit-open");
    }

    if (allCollected && playerAtExit) {
        setupLevel(getNextTask());
    }
}

function endGame() {
    isGameActive = false;
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    isTimerRunning = false;

    const endModalHTML = `
        <div id="endModal" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 10px; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h2>Game Completed!</h2>
                <p>Total Time: ${minutes}m ${seconds}s<br>Collectibles: ${collectibles} / 25<br>Deaths: ${deaths}</p>
                <br>
                <button id="restartButton" style="padding: 10px 20px;"><i class="bi bi-arrow-clockwise"></i>Restart</button>
            </div>
        </div>`;
    mazeContainer.insertAdjacentHTML("beforeend", endModalHTML);

    document.getElementById("restartButton").addEventListener("click", () => {
        document.getElementById("endModal").remove();
        restartGame();
    });

    localStorage.removeItem("gameState");
}

// ----- Help Player -----
function toggleHelp() {
    const helpField = document.getElementById("helpField");
    const helpButton = document.querySelector("button[onclick='toggleHelp()']");

    if (helpField.style.display === "block") {
        helpField.style.display = "none";
        helpButton.style.backgroundColor = "#007bff";
    } else {
        if (!currentTask || !currentTask.help) {
            console.error("No help text available for the current task.");
            return;
        }
        helpField.innerText = currentTask.help;
        helpField.style.display = "block";
        helpButton.style.backgroundColor = "#014e9f";
    }
}


// ----- Restart Game -----
function restartGame() {
    playerPosition = {x: 0, y: 0};
    enemyPosition = {x: 0, y: 0};
    exitPosition = {x: 0, y: 0};
    collectibleCount = 0;
    keyCount = 0;
    collectibles = 0;
    keys = 0;
    deaths = 0;
    document.getElementById("collectibles").innerText = collectibles;
    document.getElementById("keys").innerText = keys;
    document.getElementById("deaths").innerText = deaths;
    startTime = Date.now();
    clearMaze();
    setupLevel(getNextTask());
    setupStartModal();
}
