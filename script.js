document.addEventListener('DOMContentLoaded', () => {

    // --- Game Elements ---
    const scoreDisplay = document.getElementById('score-display');
    const captureBox = document.getElementById('capture-box');
    const dragonElements = document.querySelectorAll('.floating-dragon');
    const body = document.body; // Or a specific container
    const instructionsBox = document.getElementById('instructions'); // Get instructions box
    const closeInstructionsBtn = document.getElementById('close-instructions'); // Get close button

    // --- Game State ---
    let score = 0;
    let dragons = []; // Array to hold state for each dragon
    let draggedDragonData = null; // Store the data object of the dragged dragon
    let offsetX = 0;
    let offsetY = 0;

    // --- Physics/Animation Constants ---
    const DRAGON_SPEED_MIN = 1; // Base speed units
    const DRAGON_SPEED_MAX = 3;
    const ROTATION_SPEED_MAX = 30; // Degrees per second

    // --- Initial Setup ---
    updateScore(); // Set initial score display
    initializeDragons(); // Position dragons and set up state
    requestAnimationFrame(gameLoop); // Start the animation loop

    // --- Event Listener for Closing Instructions ---
    if (closeInstructionsBtn && instructionsBox) {
        closeInstructionsBtn.addEventListener('click', () => {
            instructionsBox.classList.add('hidden');
            // Optional: Move score back up when instructions close
            scoreDisplay.style.top = '20px';
        });
         // Optional: Automatically hide after some time
        // setTimeout(() => {
        //     if (instructionsBox && !instructionsBox.classList.contains('hidden')) {
        //          instructionsBox.classList.add('hidden');
        //          scoreDisplay.style.top = '20px';
        //      }
        // }, 10000); // Hide after 10 seconds
    } else {
        console.warn("Instructions elements not found.");
    }


    // --- Initialize Dragon States ---
    function initializeDragons() {
        dragons = []; // Clear existing data
        const bounds = body.getBoundingClientRect(); // Get viewport dimensions

        // Define desired starting positions (percentages of viewport)
        const startPositions = [
            { pX: 0.15, pY: 0.10 }, // Dragon 1 (Top-Leftish)
            { pX: 0.80, pY: 0.85 }, // Dragon 2 (Bottom-Rightish)
            { pX: 0.10, pY: 0.75 }, // Dragon 3 (Bottom-Leftish)
            { pX: 0.75, pY: 0.20 }  // Dragon 4 (Top-Rightish)
        ];

        dragonElements.forEach((el, index) => {
            const startPos = startPositions[index] || { pX: Math.random(), pY: Math.random() };
            const initialX = bounds.width * startPos.pX;
            const initialY = bounds.height * startPos.pY;

            // Get element dimensions - use offsetWidth/Height for better chance of non-zero value
            const dragonWidth = el.offsetWidth || 50;
            const dragonHeight = el.offsetHeight || 50;

            const speed = (Math.random() * (DRAGON_SPEED_MAX - DRAGON_SPEED_MIN) + DRAGON_SPEED_MIN) * 60; // Speed in pixels/second approx
            const angle = Math.random() * 2 * Math.PI; // Random initial direction

            const dragonData = {
                el: el,
                x: initialX,
                y: initialY,
                vx: Math.cos(angle) * speed, // Pixels per second
                vy: Math.sin(angle) * speed, // Pixels per second
                rotation: Math.random() * 360,
                rotateSpeed: (Math.random() - 0.5) * 2 * ROTATION_SPEED_MAX, // Degrees per second
                width: dragonWidth,
                height: dragonHeight,
                isDragging: false,
                isCaptured: false
            };
            dragons.push(dragonData);

            // Apply Initial Transform
            el.style.transform = `translate(${dragonData.x}px, ${dragonData.y}px) rotate(${dragonData.rotation}deg)`;

            // Add drag listeners
            el.setAttribute('draggable', 'false');
            el.addEventListener('mousedown', startDrag);
            // el.addEventListener('touchstart', startDrag, { passive: false });
        });
        console.log("Dragons initialized:", dragons.length);
    }

    // --- Animation Loop ---
    let lastTime = 0;
    function gameLoop(currentTime) {
        const now = performance.now(); // Use performance.now for high-resolution time
        const deltaTime = lastTime ? (now - lastTime) / 1000 : 0; // Time delta in seconds
        lastTime = now;

        const bounds = body.getBoundingClientRect(); // Get viewport bounds each frame

        dragons.forEach(dragon => {
            if (dragon.isDragging || dragon.isCaptured) {
                // Skip physics update if dragged or captured
                return;
            }

            // Update position based on velocity and deltaTime
            dragon.x += dragon.vx * deltaTime;
            dragon.y += dragon.vy * deltaTime;
            dragon.rotation += dragon.rotateSpeed * deltaTime;

            // Boundary Collision Check (Bounce)
            let bounced = false;
            // Left boundary
            if (dragon.x < 0) {
                dragon.x = 0;
                dragon.vx *= -1;
                bounced = true;
            }
            // Right boundary
            if (dragon.x + dragon.width > bounds.width) {
                dragon.x = bounds.width - dragon.width;
                dragon.vx *= -1;
                bounced = true;
            }
            // Top boundary
            if (dragon.y < 0) {
                dragon.y = 0;
                dragon.vy *= -1;
                bounced = true;
            }
            // Bottom boundary
            if (dragon.y + dragon.height > bounds.height) {
                dragon.y = bounds.height - dragon.height;
                dragon.vy *= -1;
                bounced = true;
            }
            // Optional: Add slight random velocity change on bounce
            // if (bounced) {
            //     dragon.vx *= (0.9 + Math.random() * 0.2); // Slightly change speed
            //     dragon.vy *= (0.9 + Math.random() * 0.2);
            // }


            // Apply updated position and rotation using transform
            dragon.el.style.transform = `translate(${dragon.x}px, ${dragon.y}px) rotate(${dragon.rotation}deg)`;
        });

        requestAnimationFrame(gameLoop); // Continue the loop
    }


    // --- Drag and Drop Logic ---
    function startDrag(e) {
        const targetElement = e.currentTarget;
        const dragonData = dragons.find(d => d.el === targetElement);
        if (!dragonData || dragonData.isCaptured) return;

        // Prevent initiating drag if already dragging another element
        if (draggedDragonData) return;

        draggedDragonData = dragonData;
        draggedDragonData.isDragging = true;
        draggedDragonData.el.classList.add('dragging');
        draggedDragonData.el.style.zIndex = 100; // Bring to front

        const clientX = e.clientX;
        const clientY = e.clientY;
        // Calculate offset based on current translated position
        offsetX = clientX - draggedDragonData.x;
        offsetY = clientY - draggedDragonData.y;

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
    }

    function drag(e) {
        if (!draggedDragonData) return;

        const clientX = e.clientX;
        const clientY = e.clientY;

        // Update target position based on mouse/touch and initial offset
        let newX = clientX - offsetX;
        let newY = clientY - offsetY;

        // Update the data object's position
        draggedDragonData.x = newX;
        draggedDragonData.y = newY;

        // Apply the transform immediately for visual feedback during drag
        // Keep rotation from the state, update translation
        draggedDragonData.el.style.transform = `translate(${newX}px, ${newY}px) rotate(${draggedDragonData.rotation}deg)`;
    }

    function endDrag(e) {
        if (!draggedDragonData) return;

        const droppedDragon = draggedDragonData; // Keep reference
        console.log(`--- endDrag for ${droppedDragon.el.id} ---`);

        // Check for capture on drop
        const overlaps = isOverlapping(droppedDragon.el, captureBox);
        console.log(`Overlap check result: ${overlaps}`);

        if (overlaps) {
             console.log("Overlap detected! Calling captureDragon...");
             captureDragon(droppedDragon); // Pass the data object
        } else {
             console.log("No overlap detected.");
             // Not captured, just stop dragging
             droppedDragon.isDragging = false;
             droppedDragon.el.classList.remove('dragging');
             droppedDragon.el.style.zIndex = 0; // Reset z-index
             // Position is already set via drag's transform update
             // Game loop will resume using current x/y
        }

        // Clean up global listeners and state
        draggedDragonData = null;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', endDrag);
    }

    // --- Capture Logic ---
    function captureDragon(dragonData) { // Accepts the data object
        console.log(`Inside captureDragon for ${dragonData.el.id}. Current score: ${score}`);

        // Prevent double capture if somehow called again quickly
        if (dragonData.isCaptured) {
            console.log("Already captured, ignoring.");
            return;
        }

        dragonData.isCaptured = true; // Mark as captured in state FIRST
        dragonData.el.classList.add('captured'); // Hide element via CSS
        dragonData.isDragging = false; // Ensure dragging state is off
        dragonData.el.classList.remove('dragging'); // Ensure class is removed
        dragonData.el.style.zIndex = -1; // Keep captured ones behind

        score++; // Increment score
        console.log(`Score after increment: ${score}`);

        updateScore(); // Update the display

        console.log(`Capture complete for ${dragonData.el.id}. New score displayed.`);
    }

    // --- Update Score Display ---
    function updateScore() {
        scoreDisplay.textContent = `Score: ${score}`;
        console.log(`Updating score display to: ${score}`); // Keep this log
    }

    // --- Utility Function: Overlap Check ---
    function isOverlapping(elem1, elem2) {
        if (!elem1 || !elem2) return false;
        const rect1 = elem1.getBoundingClientRect();
        const rect2 = elem2.getBoundingClientRect();

        // Check for intersection
        // Added tolerance: Check if center point is inside is often better
        const center1X = rect1.left + rect1.width / 2;
        const center1Y = rect1.top + rect1.height / 2;

        return (
            center1X > rect2.left &&
            center1X < rect2.right &&
            center1Y > rect2.top &&
            center1Y < rect2.bottom
        );
        /* // Original edge overlap check:
        return !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
        );
        */
    }

}); // End DOMContentLoaded