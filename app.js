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
window.addEventListener("deviceorientation", (event) => {
    const { beta, gamma } = event;

    // Thresholds to detect tilt direction (tweak as needed)
    if (beta > 10) movePlayer(0, 1); // Tilt down
    if (beta < -10) movePlayer(0, -1); // Tilt up
    if (gamma > 10) movePlayer(1, 0); // Tilt right
    if (gamma < -10) movePlayer(-1, 0); // Tilt left
});

// Initialize Game
generateMaze();
placePlayer();
