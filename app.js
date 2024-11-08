// Game settings
const mazeSize = 10; // 10x10 grid
let playerPosition = { x: 0, y: 0 }; // Starting position

// Get maze container
const mazeContainer = document.getElementById("maze");

// Generate Maze Grid
function generateMaze() {
    for (let row = 0; row < mazeSize; row++) {
        for (let col = 0; col < mazeSize; col++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");

            // Add walls for example (can add more complex logic later)
            if (Math.random() < 0.2 && !(row === 0 && col === 0)) {
                cell.classList.add("wall");
            }

            mazeContainer.appendChild(cell);
        }
    }
}

// Initialize Player
function placePlayer() {
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => cell.classList.remove("player"));

    const playerCell = document.querySelectorAll(".cell")[playerPosition.y * mazeSize + playerPosition.x];
    playerCell.classList.add("player");
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
function initializeGame() {
    generateMaze(); // Assuming this function generates the maze grid
    placePlayer();  // Place the player in the starting position

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

let startTime = Date.now();
let deaths = 0;
let collectibles = 0;

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

function incrementCollectibles() {
    collectibles += 1;
    document.getElementById("collectibles").innerText = collectibles;
}

setInterval(updateTimer, 1000); // Updates timer every second

function restartGame() {
    startTime = Date.now();
    deaths = 0;
    collectibles = 0;
    document.getElementById("deaths").innerText = deaths;
    document.getElementById("collectibles").innerText = collectibles;
    document.getElementById("timer").innerText = "00:00";
    playerPosition = { x: 0, y: 0 };
    movePlayer(0,0)
}
