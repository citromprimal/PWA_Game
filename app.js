// Game settings
const mazeSize = 10; // 10x10 grid
let playerPosition = { x: 0, y: 0 }; // Starting position
let enemyPosition = { x: 0, y: 0 }; // Enemy starting position
let exitPosition = { x: 0, y: 0 }; // Exit position
let collectibleCount = 0; // Number of collectibles in the maze
let keyCount = 0; // Number of keys in the maze
let enemyInterval = null; // Interval ID for enemy movement
let gameOver = false;

// Game state variables
let startTime = Date.now();
let deaths = 0;
let collectibles = 0;
let keys = 0;

// Get maze container
const mazeContainer = document.getElementById("maze");

// Load tasks from JSON
let tasks = []; // Array to hold loaded tasks
let currentTask = null; // To keep track of the current task
let completedTasks = new Set(); // Track completed tasks

async function loadTasks() {
    try {
        const response = await fetch('tasks.json');
        if (!response.ok) console.error("Failed to load tasks.json");

        const data = await response.json();
        console.log(data); // Check if data is loaded correctly

        tasks = data.tasks;
    } catch (error) {
        console.error("Error loading tasks:", error);
    }
}

// Get a random task that hasn’t been completed yet
function getNextTask() {
    const availableTasks = tasks.filter(task => !completedTasks.has(task.id));
    if (availableTasks.length === 0) {
        completedTasks.clear();

        return getNextTask();
    }

    const randomTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];
    completedTasks.add(randomTask.id);
    return randomTask;
}

// Set up the level based on the maze matrix from the task
function setupLevel(task) {
    clearMaze(); // Clear previous elements
    generateMaze(task); // Generate maze based on the matrix from the task

    currentTask = task;
    document.getElementById("collectibles").innerText = collectibles;

    if (enemyInterval) clearInterval(enemyInterval); // Clear previous interval if any
    // Check if enemyPosition is set before starting the interval
    if (enemyPosition.x !== 0 || enemyPosition.y !== 0) {
        enemyInterval = setInterval(moveEnemy, task.enemySpeed); // Set enemy movement speed
    }
}

// Clear the maze grid
function clearMaze() {
    mazeContainer.innerHTML = ''; // Clear existing maze elements
    if (enemyInterval) clearInterval(enemyInterval); // Stop enemy movement
}

// Generate maze based on the matrix provided in the task
function generateMaze(task) {
    for (let row = 0; row < mazeSize; row++) {
        for (let col = 0; col < mazeSize; col++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.x = col;
            cell.dataset.y = row;

            // Read the element from the task's maze matrix
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
                    exitPosition = { x: col, y: row }
                    cell.classList.add("exit");
                    break;
                // Leave empty strings as empty spaces
            }
            mazeContainer.appendChild(cell);
        }
    }
    placePlayer();
}

// Initialize Player
function placePlayer() {
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => cell.classList.remove("player"));

    const playerCell = document.querySelectorAll(".cell")[playerPosition.y * mazeSize + playerPosition.x];
    playerCell.classList.add("player");
}

// Place the enemy and set its movement
function moveEnemy() {
    if (gameOver) return;

    const directions = [
        { dx: 0, dy: -1 }, // up
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 }   // right
    ];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const newX = enemyPosition.x + direction.dx;
    const newY = enemyPosition.y + direction.dy;

    if (newX >= 0 && newX < mazeSize && newY >= 0 && newY < mazeSize) {
        const oldCell = document.querySelector(`.cell[data-x="${enemyPosition.x}"][data-y="${enemyPosition.y}"]`);
        if (oldCell) oldCell.classList.remove("enemy");

        enemyPosition = { x: newX, y: newY };
        const newCell = document.querySelector(`.cell[data-x="${newX}"][data-y="${newY}"]`);
        if (newCell) newCell.classList.add("enemy");

        // Check if enemy touches player
        if (newX === playerPosition.x && newY === playerPosition.y) {
            gameOver = true;
            alert("Game Over! You were caught by the enemy.");
            incrementDeaths();
            restartGame();
        }
    }
}

// Check if all collectibles are gathered and player is at the exit
function checkWinCondition() {
    const allCollected = keyCount === keys;
    const playerAtExit = (playerPosition.x === exitPosition.x && playerPosition.y === exitPosition.y);

    if (allCollected && playerAtExit) {
        alert("You win! Task complete.");
        setupLevel(getNextTask()); // Load next task
    }
}

// Call this function when a collectible is picked up
function collectCollectibles(cell) {
    cell.classList.remove("collectible");
    collectibles += 1;
    document.getElementById("collectibles").innerText = collectibles;
    checkWinCondition();
}

// Call this function when a key is picked up
function collectKeys(cell) {
    cell.classList.remove("key");
    keys += 1;
    document.getElementById("keys").innerText = keys;
    checkWinCondition();
}

// Movement Controls for Desktop
function movePlayer(dx, dy) {
    const newX = playerPosition.x + dx;
    const newY = playerPosition.y + dy;

    if (newX >= 0 && newX < mazeSize && newY >= 0 && newY < mazeSize) {
        const newCell = document.querySelectorAll(".cell")[newY * mazeSize + newX];
        if (!newCell.classList.contains("wall")) {
            playerPosition = { x: newX, y: newY };
            placePlayer();
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

// Keyboard Controls
window.addEventListener("keydown", (event) => {
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

// Gyroscope Controls for Mobile
// Detect if the device is iOS
function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Request permission for iOS devices to access device orientation
function requestDeviceOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    // Start listening to the orientation events if permission is granted
                    window.addEventListener("deviceorientation", handleDeviceOrientation);
                } else {
                    alert("Motion controls were not granted. You can enable them in your device settings.");
                }
            })
            .catch(console.error);
    } else {
        // Add listener directly if permission request is not needed (non-iOS devices)
        window.addEventListener("deviceorientation", handleDeviceOrientation);
    }
}

let movementAccumulator = { x: 0, y: 0 }; // Track accumulated movement for smoother transitions

// Handle device orientation events
function handleDeviceOrientation(event) {
    const { beta, gamma } = event;
    const scaleFactor = 0.003; // Reduce this value to make movement slower

    // Accumulate movement based on tilt, but scaled down by the factor
    movementAccumulator.x += gamma * scaleFactor;
    movementAccumulator.y += beta * scaleFactor;

    // Move the player only if accumulated movement exceeds one cell
    if (movementAccumulator.x >= 1) {
        movePlayer(1, 0);
        movementAccumulator.x = 0; // Reset accumulator for next move
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

// Show popup for iOS devices
function showIOSPermissionPopup() {
    const popup = document.createElement("div");
    popup.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; padding-left:20px; padding-right: 20px; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                <p>This game requires motion controls. Please enable them to continue.</p>
                <button id="enableMotion" style="padding: 10px 20px; margin-top: 10px; font-size: 16px;">Enable Motion Controls</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    // Attach click event to request permission on button click
    document.getElementById("enableMotion").onclick = function() {
        requestDeviceOrientationPermission();
        popup.remove(); // Remove popup after clicking the button
    };
}

// Initialize game and check for iOS
async function initializeGame() {
    await loadTasks(); // Ensure tasks are loaded before setting up the level
    const initialTask = getNextTask(); // Get the first task
    setupLevel(initialTask); // Set up the level with the initial task

    if (isIOS()) {
        // Show the permission popup for iOS devices
        showIOSPermissionPopup();
    } else {
        // Directly start listening to device orientation for non-iOS
        window.addEventListener("deviceorientation", handleDeviceOrientation);
    }
}

// Call the initialize function on page load
window.onload = initializeGame;

function updateTimer() {
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    document.getElementById("timer").innerText =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function incrementDeaths() {
    deaths += 1;
    document.getElementById("deaths").innerText = deaths;
}

setInterval(updateTimer, 1000); // Updates timer every second

function restartGame() {
    gameOver = false;
    playerPosition = { x: 0, y: 0 };
    enemyPosition = { x: 0, y: 0 };
    exitPosition = { x: 0, y: 0 };
    collectibleCount = 0;
    keyCount = 0;
    collectibles = 0;
    keys = 0;
    deaths = 0;
    startTime = Date.now();
    document.getElementById("deaths").innerText = deaths;
    document.getElementById("collectibles").innerText = collectibles;
    document.getElementById("keys").innerText = keys;
    document.getElementById("timer").innerText = "00:00";
    clearMaze();
    setupLevel(getNextTask());
}
