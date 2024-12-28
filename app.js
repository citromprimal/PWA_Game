// ----- Constants and Variables -----
const mazeSize = 10;
let gameState = {
    playerPosition: { x: 0, y: 0 },
    playerStart: { x: 0, y: 0 },
    enemyPosition: { x: 0, y: 0 },
    exitPosition: { x: 0, y: 0 },
    collectibles: 0,
    keyCount: 0,
    keys: 0,
    deaths: 0,
    currentTask: null,
    completedTasks: new Set(),
    startTime: null,
    isGameActive: false,
    tasks: [],
    enemies: [],
};

// Game state variables
let deaths = 0;
let collectibles = 0;
let collectibleCount = 0;
let collectiblesCollected = 0;
let keys = 0;
let keyCount = 0;
let movementAccumulator = {x: 0, y: 0};

let enemyInterval = null;
const maze = document.getElementById("maze");
const mazeContainer = document.getElementById("maze-container");
const backgroundMusic = document.getElementById("backgroundMusic");
const muteButton = document.getElementById("muteButton");

// ----- Audio Controls -----
function playMusic() {
    backgroundMusic.volume = 0.2;
    backgroundMusic.play();
    backgroundMusic.muted = false;
}

function stopMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
}

muteButton.addEventListener("click", () => {
    const icon = muteButton.querySelector("i");
    if (backgroundMusic.muted) {
        backgroundMusic.muted = false;
        icon.classList.remove("bi-volume-mute");
        icon.classList.add("bi-volume-up");
    } else {
        backgroundMusic.muted = true;
        icon.classList.remove("bi-volume-up");
        icon.classList.add("bi-volume-mute");
    }
});

// ----- Save and Load Game State -----
function saveGameState() {
    try {
        const serializedState = JSON.stringify(gameState);
        localStorage.setItem("gameState", serializedState);
    } catch (error) {
        console.error("Failed to save game state:", error);
    }
}

function loadGameState() {
    const savedState = localStorage.getItem("gameState");

    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);

            gameState.completedTasks = new Set(Array.isArray(parsedState.completedTasks) ? parsedState.completedTasks : []);

            gameState.deaths = typeof parsedState.deaths === "number" ? parsedState.deaths : 0;
            gameState.tasks = Array.isArray(parsedState.tasks) ? parsedState.tasks : [];

            console.log("Loaded game state:", gameState);
        } catch (error) {
            console.error("Failed to parse saved game state:", error);
            resetGameState();
        }
    } else {
        console.log("No saved game state found. Initializing a new game.");
        resetGameState();
    }
}

// ----- Reset Game State -----
function resetGameState() {
    const tasksBackup = gameState.tasks;
    gameState = {
        playerPosition: { x: 0, y: 0 },
        playerStart: { x: 0, y: 0 },
        enemyPosition: { x: 0, y: 0 },
        exitPosition: { x: 0, y: 0 },
        collectibles: 0,
        keyCount: 0,
        keys: 0,
        deaths: 0,
        currentTask: null,
        completedTasks: new Set(),
        startTime: null,
        isGameActive: false,
        isTimerRunning: false,
        tasks: tasksBackup || [],
        enemies: [],
    };

    if (enemyInterval) clearInterval(enemyInterval);

    clearMaze();
    maze.innerHTML = '';
    document.getElementById("timer").innerText = "00:00";
    document.getElementById("collectibles").innerText = "0";
    document.getElementById("keys").innerText = "0";
    document.getElementById("deaths").innerText = "0";

    localStorage.removeItem("gameState");
}

// ----- Initialization -----
window.onload = async () => {
    setupStartModal();
    try {
        await loadTasks();
        loadGameState();
        console.log("Game state tasks loaded:", gameState.tasks);
        initializeGame();
    } catch (error) {
        console.error("Failed to initialize game:", error);
    }
};

function initializeGame() {
    if (!gameState.tasks || gameState.tasks.length === 0) {
        console.error("No tasks available. Cannot initialize the game.");
    }

    if (!gameState.isGameActive) {
        console.log("Starting a new game...");
        const nextTask = getNextTask();
        if (!nextTask) {
            console.error("No valid task to start the game.");
        }
        setupLevel(nextTask);
    }

    if (isIOS()) {
        showIOSPermissionPopup();
    } else {
        window.addEventListener("deviceorientation", handleDeviceOrientation);
    }
}

// ----- Restart Game -----
function restartGame() {
    console.log("Restarting the game...");

    const endModal = document.getElementById("endModal");
    if (endModal) endModal.remove();

    resetGameState();
    initializeGame();
    setupStartModal();
    console.log("Game restarted successfully.");
}

// ----- Task Management -----
async function loadTasks() {
    try {
        console.log("Attempting to load tasks.json...");
        const response = await fetch('tasks.json');
        if (!response.ok) {
            console.log(`Failed to fetch tasks.json. Status: ${response.status}`);
            return;
        }

        const data = await response.json();
        if (!data.tasks || !Array.isArray(data.tasks) || data.tasks.length === 0) {
            console.log("Invalid or empty tasks.json file.");
            return;
        }

        gameState.tasks = data.tasks;
        console.log("Tasks successfully loaded:", gameState.tasks);
    } catch (error) {
        console.error("Error loading tasks.json:", error);
    }
}

function getNextTask() {
    if (!gameState.tasks || !Array.isArray(gameState.tasks)) {
        console.error("Tasks array is missing or invalid:", gameState.tasks);
        endGame();
        return null;
    }

    const availableTasks = gameState.tasks.filter(task => {
        if (!task || !task.id) {
            console.warn("Invalid task detected and ignored:", task);
            return false; // Skip invalid tasks
        }
        return Array.isArray(task.maze) && task.maze.length > 0 && !gameState.completedTasks.has(task.id);
    });

    if (availableTasks.length === 0) {
        console.log("No more tasks available. Ending game.");
        endGame();
        return null;
    }

    for (let i = availableTasks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableTasks[i], availableTasks[j]] = [availableTasks[j], availableTasks[i]];
    }

    const nextTask = availableTasks[0];
    if (!nextTask || !nextTask.id) {
        console.error("Next task is invalid:", nextTask);
        endGame();
        return null;
    }

    gameState.completedTasks.add(nextTask.id);
    return nextTask;
}


// ----- Start Modal -----
function setupStartModal() {
    const existingModal = document.getElementById("startModal");
    if (existingModal) {
        mazeContainer.removeChild(existingModal);
    }

    const startModalHTML = `
        <div id="startModal" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 10px; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h2>Start Game?</h2>
                <br>
                <button id="startButton"><i class="bi bi-play-circle-fill"></i> Start Game</button>
            </div>
        </div>`;
    mazeContainer.insertAdjacentHTML("beforeend", startModalHTML);

    document.getElementById("startButton").addEventListener("click", () => {
        document.getElementById("startModal").style.display = "none";
        gameState.isGameActive = true;
        gameState.isTimerRunning = true;
        gameState.startTime = Date.now();
        playMusic();
    });
}

// ----- Timer -----
function updateTimer() {
    if (!gameState.startTime || !gameState.isTimerRunning) return;
    const elapsedTime = Date.now() -  gameState.startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    document.getElementById("timer").innerText =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

setInterval(updateTimer, 1000);

// ----- Maze Setup -----
function setupLevel(task) {
    gameState.isTimerRunning = true;
    if (!task || !task.maze || !Array.isArray(task.maze)) {
        console.error("Invalid task or maze data:", task);
        return;
    }

    clearMaze();

    collectibles = 0;
    keys = 0;
    collectibleCount = 0;
    keyCount = 0;

    generateMaze(task);
    gameState.currentTask = task;

    const helpField = document.getElementById("helpField");
    if (helpField.style.display === "block") {
        helpField.innerHTML = `<p>${task.help || "No help available for this level."}</p>`;
    }

    gameState.enemies = (task.enemies || []).map(enemy => ({
        path: enemy.path,
        position: enemy.path[0],
        index: 0,
        movingForward: true
    }));

    gameState.enemies.forEach(enemy => {
        const initialCell = document.querySelector(`.cell[data-x="${enemy.position.x}"][data-y="${enemy.position.y}"]`);
        if (initialCell) initialCell.classList.add("enemy");
    });

    if (enemyInterval) clearInterval(enemyInterval);
    if (gameState.enemies.length > 0) {
        enemyInterval = setInterval(moveEnemies, 500);
    }
}

function clearMaze() {
    maze.innerHTML = '';
    if (enemyInterval) clearInterval(enemyInterval);
}

function generateMaze(task) {
    if (!task.maze || !Array.isArray(task.maze) || task.maze.length === 0) {
        console.error("Invalid maze data for task:", task);
        return;
    }

    for (let row = 0; row < mazeSize; row++) {
        if (!task.maze[row]) {
            console.error(`Missing row ${row} in maze data for task:`, task);
            continue;
        }
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
                    gameState.playerStart = {x: col, y: row};
                    gameState.playerPosition = {x: col, y: row};
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
                    gameState.exitPosition = {x: col, y: row};
                    cell.classList.add("exit");
                    break;
                case "enemy":
                    break;
                default:
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

    const playerCell = document.querySelectorAll(".cell")[ gameState.playerPosition.y * mazeSize +  gameState.playerPosition.x];
    playerCell.classList.add("player");
}

// ----- Player Interaction -----
function collectCollectibles(cell) {
    cell.classList.remove("collectible");
    collectibles += 1;
    collectiblesCollected += 1;
    document.getElementById("collectibles").innerText = collectibles;
    checkWinCondition();
}

function collectKeys(cell) {
    cell.classList.remove("key");
    keys += 1;
    document.getElementById("keys").innerText = keys;
    checkWinCondition();
}

function trapPlayer() {
    gameState.playerPosition = gameState.playerStart;
    deaths += 1;
    document.getElementById("deaths").innerText = deaths;
    placePlayer();
}

function handleInteractions(x, y, cell) {
    if (!cell.classList.contains("wall")) {
        if (cell.classList.contains("exit") && keys !== keyCount) {
            return;
        }

        if (cell.classList.contains("exit-open")) {
            checkWinCondition();
        }

        gameState.playerPosition = {x: x, y: y};
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

    gameState.enemies.forEach(enemy => {
        if (gameState.playerPosition.x === enemy.position.x && gameState.playerPosition.y === enemy.position.y) {
            trapPlayer();
        }
    });
}

function moveEnemies() {
    if (!gameState.isGameActive) return;

    gameState.enemies.forEach(enemy => {
        const currentCell = document.querySelector(`.cell[data-x="${enemy.position.x}"][data-y="${enemy.position.y}"]`);
        if (currentCell) currentCell.classList.remove("enemy");
    });

    gameState.enemies.forEach(enemy => {
        if (!enemy.path || enemy.path.length === 0) return;

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

        enemy.position = enemy.path[enemy.index];

        const newCell = document.querySelector(`.cell[data-x="${enemy.position.x}"][data-y="${enemy.position.y}"]`);
        if (newCell) newCell.classList.add("enemy");

        if (enemy.position.x ===  gameState.playerPosition.x && enemy.position.y ===  gameState.playerPosition.y) {
            trapPlayer();
        }
    });
}

function movePlayer(dx, dy) {
    const newX = gameState.playerPosition.x + dx;
    const newY = gameState.playerPosition.y + dy;

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
    if (!gameState.isGameActive) return;
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
    if (!gameState.isGameActive) return;
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
    if (!gameState.isGameActive) return;

    const cell = event.target;
    if (!cell.classList.contains("cell")) return;

    const targetX = parseInt(cell.dataset.x, 10);
    const targetY = parseInt(cell.dataset.y, 10);

    const dx = targetX - gameState.playerPosition.x;
    const dy = targetY - gameState.playerPosition.y;

    if (Math.abs(dx) + Math.abs(dy) === 1) {
        movePlayer(dx, dy);
    }
}

// ----- Level Stats Modal -----
function showLevelStatsModal() {
    gameState.isTimerRunning = false;
    const elapsedTime = Date.now() -  gameState.startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    const currentDifficulty = gameState.currentTask.difficulty;

    const levelStatsHTML = `
        <div id="levelStatsModal" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center; width: 80%; max-width: 400px;">
                <h2>Level Complete!</h2>
                <p>Level Difficulty: ${currentDifficulty}</p>
                <p>Time Elapsed: ${minutes}m ${seconds}s</p>
                <p>Collectibles: ${collectibles} / ${collectibleCount}</p>
                <p>Keys Collected: ${keys} / ${keyCount}</p>
                <p>Deaths: ${deaths}</p>
                <br>
                <button id="continueButton" style="padding: 10px 20px; font-size: 16px;"><i class="bi bi-play-circle-fill"></i> Continue</button>
            </div>
        </div>`;
    mazeContainer.insertAdjacentHTML("beforeend", levelStatsHTML);

    document.getElementById("continueButton").addEventListener("click", () => {
        document.getElementById("levelStatsModal").remove();
        document.getElementById("collectibles").innerText = 0;
        document.getElementById("keys").innerText = 0;
        document.getElementById("deaths").innerText = 0;
        const nextTask = getNextTask();
        if (nextTask) {
            setupLevel(nextTask);
        } else {
            endGame();
        }
    });

    saveGameState();
}

// ----- Win and End Game -----
function checkWinCondition() {
    const allCollected = (keyCount === keys);
    const playerAtExit = (gameState.playerPosition.x === gameState.exitPosition.x && gameState.playerPosition.y === gameState.exitPosition.y);

    if (allCollected) {
        const exitCell = document.querySelector(`.cell[data-x="${gameState.exitPosition.x}"][data-y="${gameState.exitPosition.y}"]`);
        exitCell.classList.remove("exit");
        exitCell.classList.add("exit-open");
    }

    if (allCollected && playerAtExit) {
        showLevelStatsModal();
    }
}

function endGame() {
    const existingModal = document.getElementById("endModal");
    if (existingModal) {
        mazeContainer.removeChild(existingModal);
    }

    stopMusic();
    gameState.isGameActive = false;
    const elapsedTime = Date.now() - gameState.startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    gameState.isTimerRunning = false;

    const endModalHTML = `
        <div id="endModal" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 10px; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h2>Game Completed!</h2>
                <p>Total Time: ${minutes}m ${seconds}s<br>Collectibles: ${collectiblesCollected} / 25<br>Deaths: ${deaths}</p>
                <br>
                <button id="restartButton"><i class="bi bi-arrow-clockwise"></i>Restart</button>
            </div>
        </div>`;
    mazeContainer.insertAdjacentHTML("beforeend", endModalHTML);

    document.getElementById("restartButton").addEventListener("click", () => {
        document.getElementById("endModal").remove();
        restartGame();
    });
}

// ----- Help Player -----
function toggleHelp() {
    const helpField = document.getElementById("helpField");
    const helpButton = document.querySelector("button[onclick='toggleHelp()']");

    if (helpField.style.display === "block") {
        helpField.style.display = "none";
        helpButton.classList.remove("active");
    } else {
        if (!gameState.currentTask || !gameState.currentTask.help) {
            console.error("No help text available for the current task.");
            return;
        }
        helpField.innerText = gameState.currentTask.help;
        helpField.style.display = "block";
        helpButton.classList.add("active");
    }
}