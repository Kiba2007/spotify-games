// =====================================================
// ESTADO
// =====================================================

let snakeTracks = [];
let snakePlaylistName = "";

let snake = [];
let previousSnake = [];

let food = null;
let currentTrack = null;
let currentTrackIndex = -1;

let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };

let score = 0;

let snakeInitialized = false;
let snakeRunning = false;

let animationFrame = null;
let lastFrameTime = 0;
let accumulator = 0;

const snakeImageCache = new Map();


// =====================================================
// CONFIG
// =====================================================

const SNAKE_COLS = 20;
const SNAKE_ROWS = 15;
const SNAKE_CELL = 40;
const SNAKE_TICK = 130;


// =====================================================
// HELPERS
// =====================================================

function snakeEl(id) {
    return document.getElementById(id);
}

function snakeCanvas() {
    return snakeEl("gameCanvas");
}


// =====================================================
// INICIALIZAR
// =====================================================

function startSnake(tracks, playlistName) {

    if (!Array.isArray(tracks) || !tracks.length) {
        console.error("❌ Snake necesita canciones.");
        return;
    }

    snakeInitialized = true;

    snakePlaylistName = playlistName || "";

    snakeTracks = tracks.map(track => ({
        ...track
    }));

    const canvas = snakeCanvas();

    if (!canvas) {
        console.error("❌ No existe #gameCanvas.");
        return;
    }

    canvas.width = SNAKE_COLS * SNAKE_CELL;
    canvas.height = SNAKE_ROWS * SNAKE_CELL;

    const playlistNameEl =
        snakeEl("gamePlaylistName");

    if (playlistNameEl) {
        playlistNameEl.textContent =
            snakePlaylistName;
    }

    document.removeEventListener(
        "keydown",
        handleSnakeKeyboard
    );

    document.addEventListener(
        "keydown",
        handleSnakeKeyboard
    );

    preloadTracks();

    resetSnakeState();
}


// =====================================================
// RESET
// =====================================================

function resetSnakeState() {

    stopSnake(false);

    snakeTracks = shuffle(
        snakeTracks.map(track => ({
            ...track
        }))
    );

    snake = [{
        x: 10,
        y: 7,
        cover: null
    }];

    previousSnake = cloneSnake(snake);

    food = null;
    currentTrack = null;
    currentTrackIndex = -1;

    score = 0;

    direction = {
        x: 1,
        y: 0
    };

    nextDirection = {
        x: 1,
        y: 0
    };

    accumulator = 0;
    lastFrameTime = 0;

    updateScore();
    updateTrackUI(null);

    showSnakeReady();
    hideSnakeGameOver();

    drawSnake(0);
}


// =====================================================
// EMPEZAR
// =====================================================

async function beginSnake() {

    if (
        !snakeInitialized ||
        snakeRunning
    ) {
        return;
    }

    hideSnakeReady();
    hideSnakeGameOver();

    snakeTracks = shuffle(
        snakeTracks.map(track => ({
            ...track
        }))
    );

    snake = [{
        x: 10,
        y: 7,
        cover: null
    }];

    previousSnake = cloneSnake(snake);

    currentTrack = null;
    currentTrackIndex = -1;

    score = 0;

    direction = {
        x: 1,
        y: 0
    };

    nextDirection = {
        x: 1,
        y: 0
    };

    accumulator = 0;
    lastFrameTime = performance.now();

    updateScore();

    await nextSnakeTrack();

    if (!currentTrack) {
        gameOver();
        return;
    }

    createFood();

    snakeRunning = true;

    animationFrame =
        requestAnimationFrame(
            snakeFrame
        );
}


// =====================================================
// STOP
// =====================================================

function stopSnake(pauseMusic = true) {

    snakeRunning = false;

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    if (
        pauseMusic &&
        typeof pauseSpotify === "function"
    ) {
        pauseSpotify();
    }
}


// =====================================================
// MOVIMIENTO SUAVE
// =====================================================

function snakeFrame(now) {

    if (!snakeRunning) {
        return;
    }

    if (!lastFrameTime) {
        lastFrameTime = now;
    }

    let delta =
        now - lastFrameTime;

    delta = Math.min(delta, 250);

    lastFrameTime = now;
    accumulator += delta;

    while (accumulator >= SNAKE_TICK) {

        accumulator -= SNAKE_TICK;

        updateSnake();

        if (!snakeRunning) {
            return;
        }
    }

    const alpha =
        accumulator / SNAKE_TICK;

    drawSnake(alpha);

    animationFrame =
        requestAnimationFrame(
            snakeFrame
        );
}


// =====================================================
// TECLADO
// =====================================================

function handleSnakeKeyboard(event) {

    if (!snakeRunning) {
        return;
    }

    switch (event.key) {

        case "ArrowUp":
        case "w":
        case "W":

            if (direction.y !== 1) {
                nextDirection = {
                    x: 0,
                    y: -1
                };

                event.preventDefault();
            }

            break;


        case "ArrowDown":
        case "s":
        case "S":

            if (direction.y !== -1) {
                nextDirection = {
                    x: 0,
                    y: 1
                };

                event.preventDefault();
            }

            break;


        case "ArrowLeft":
        case "a":
        case "A":

            if (direction.x !== 1) {
                nextDirection = {
                    x: -1,
                    y: 0
                };

                event.preventDefault();
            }

            break;


        case "ArrowRight":
        case "d":
        case "D":

            if (direction.x !== -1) {
                nextDirection = {
                    x: 1,
                    y: 0
                };

                event.preventDefault();
            }

            break;
    }
}


// =====================================================
// UPDATE
// =====================================================

function updateSnake() {

    if (!snakeRunning) {
        return;
    }

    direction = nextDirection;

    const oldSnake =
        cloneSnake(snake);

    const head =
        oldSnake[0];

    const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y,
        cover: null
    };


    // -----------------------------------------------
    // PARED
    // -----------------------------------------------

    if (
        newHead.x < 0 ||
        newHead.x >= SNAKE_COLS ||
        newHead.y < 0 ||
        newHead.y >= SNAKE_ROWS
    ) {
        gameOver();
        return;
    }


    // -----------------------------------------------
    // COMER
    // -----------------------------------------------

    const ateFood =
        food &&
        newHead.x === food.x &&
        newHead.y === food.y;


    // -----------------------------------------------
    // COLISIÓN CON CUERPO
    // -----------------------------------------------

    const collisionLimit =
        ateFood
            ? oldSnake.length
            : oldSnake.length - 1;

    for (
        let i = 1;
        i < collisionLimit;
        i++
    ) {

        if (
            oldSnake[i].x === newHead.x &&
            oldSnake[i].y === newHead.y
        ) {
            gameOver();
            return;
        }
    }


    // -----------------------------------------------
    // NUEVO MOVIMIENTO
    // -----------------------------------------------

    const newSnake = [
        newHead
    ];

    for (
        let i = 0;
        i < oldSnake.length - 1;
        i++
    ) {

        newSnake.push({
            x: oldSnake[i].x,
            y: oldSnake[i].y,
            cover:
                oldSnake[i + 1].cover ||
                null
        });
    }


    // -----------------------------------------------
    // CRECER
    // -----------------------------------------------

    if (ateFood) {

        score++;
        updateScore();

        const oldTail =
            oldSnake[
                oldSnake.length - 1
            ];

        /*
         * Exactamente UN segmento nuevo.
         * Se añade al FINAL.
         */
        newSnake.push({
            x: oldTail.x,
            y: oldTail.y,
            cover:
                food.track?.cover ||
                null
        });

        if (food.track?.cover) {
            preloadImage(
                food.track.cover
            );
        }

        nextSnakeTrack();
        createFood();
    }


    previousSnake = oldSnake;
    snake = newSnake;
}


// =====================================================
// SIGUIENTE CANCIÓN
// =====================================================

async function nextSnakeTrack() {

    if (!snakeTracks.length) {
        return;
    }

    currentTrackIndex++;

    if (
        currentTrackIndex >=
        snakeTracks.length
    ) {

        currentTrackIndex = 0;

        snakeTracks = shuffle(
            snakeTracks.map(track => ({
                ...track
            }))
        );
    }

    currentTrack =
        snakeTracks[
            currentTrackIndex
        ];

    if (!currentTrack) {
        return;
    }

    updateTrackUI(
        currentTrack
    );

    if (currentTrack.cover) {
        preloadImage(
            currentTrack.cover
        );
    }

    try {

        await playSpotifyTrack(
            currentTrack.uri
        );

    } catch (error) {

        console.error(
            "❌ Error reproduciendo Snake:",
            error
        );
    }
}


// =====================================================
// MANZANA
// =====================================================

function createFood() {

    if (!currentTrack) {
        return;
    }

    let position;
    let attempts = 0;

    do {

        position = {
            x: Math.floor(
                Math.random() * SNAKE_COLS
            ),

            y: Math.floor(
                Math.random() * SNAKE_ROWS
            )
        };

        attempts++;

    } while (
        snake.some(
            segment =>
                segment.x === position.x &&
                segment.y === position.y
        ) &&
        attempts < 500
    );

    food = {
        x: position.x,
        y: position.y,
        track: currentTrack
    };

    if (currentTrack.cover) {
        preloadImage(
            currentTrack.cover
        );
    }
}


// =====================================================
// DIBUJAR TODO
// =====================================================

function drawSnake(alpha = 0) {

    const canvas =
        snakeCanvas();

    if (!canvas) {
        return;
    }

    const ctx =
        canvas.getContext("2d");

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle =
        "#080808";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawGrid(ctx);
    drawFood(ctx);
    drawBody(ctx, alpha);
    drawHead(ctx, alpha);
}


// =====================================================
// GRID
// =====================================================

function drawGrid(ctx) {

    ctx.strokeStyle =
        "#111111";

    ctx.lineWidth = 1;

    for (
        let x = 0;
        x <= SNAKE_COLS;
        x++
    ) {

        const px =
            x * SNAKE_CELL;

        ctx.beginPath();

        ctx.moveTo(
            px,
            0
        );

        ctx.lineTo(
            px,
            SNAKE_ROWS * SNAKE_CELL
        );

        ctx.stroke();
    }

    for (
        let y = 0;
        y <= SNAKE_ROWS;
        y++
    ) {

        const py =
            y * SNAKE_CELL;

        ctx.beginPath();

        ctx.moveTo(
            0,
            py
        );

        ctx.lineTo(
            SNAKE_COLS * SNAKE_CELL,
            py
        );

        ctx.stroke();
    }
}


// =====================================================
// MANZANA
// =====================================================

function drawFood(ctx) {

    if (!food) {
        return;
    }

    const px =
        food.x * SNAKE_CELL;

    const py =
        food.y * SNAKE_CELL;

    const image =
        food.track?.cover
            ? snakeImageCache.get(
                food.track.cover
            )
            : null;

    if (
        image &&
        image.complete &&
        image.naturalWidth
    ) {

        ctx.drawImage(
            image,
            px + 2,
            py + 2,
            SNAKE_CELL - 4,
            SNAKE_CELL - 4
        );

    } else {

        ctx.fillStyle =
            "#1db954";

        ctx.fillRect(
            px + 3,
            py + 3,
            SNAKE_CELL - 6,
            SNAKE_CELL - 6
        );
    }
}


// =====================================================
// CUERPO
// =====================================================

function drawBody(
    ctx,
    alpha
) {

    for (
        let i = 1;
        i < snake.length;
        i++
    ) {

        const current =
            snake[i];

        const previous =
            previousSnake[i] ||
            current;

        const x =
            previous.x +
            (
                current.x -
                previous.x
            ) * alpha;

        const y =
            previous.y +
            (
                current.y -
                previous.y
            ) * alpha;

        const px =
            x * SNAKE_CELL;

        const py =
            y * SNAKE_CELL;

        const image =
            current.cover
                ? snakeImageCache.get(
                    current.cover
                )
                : null;

        if (
            image &&
            image.complete &&
            image.naturalWidth
        ) {

            ctx.drawImage(
                image,
                px + 2,
                py + 2,
                SNAKE_CELL - 4,
                SNAKE_CELL - 4
            );

        } else {

            ctx.fillStyle =
                "#1db954";

            ctx.fillRect(
                px + 3,
                py + 3,
                SNAKE_CELL - 6,
                SNAKE_CELL - 6
            );
        }
    }
}


// =====================================================
// CABEZA
// =====================================================

function drawHead(
    ctx,
    alpha
) {

    if (!snake.length) {
        return;
    }

    const current =
        snake[0];

    const previous =
        previousSnake[0] ||
        current;

    const x =
        previous.x +
        (
            current.x -
            previous.x
        ) * alpha;

    const y =
        previous.y +
        (
            current.y -
            previous.y
        ) * alpha;

    const centerX =
        x * SNAKE_CELL +
        SNAKE_CELL / 2;

    const centerY =
        y * SNAKE_CELL +
        SNAKE_CELL / 2;

    const half =
        SNAKE_CELL * 0.4;

    ctx.fillStyle =
        "#1ed760";

    ctx.beginPath();

    if (direction.x === 1) {

        ctx.moveTo(
            centerX + half,
            centerY
        );

        ctx.lineTo(
            centerX - half,
            centerY - half
        );

        ctx.lineTo(
            centerX - half,
            centerY + half
        );

    } else if (
        direction.x === -1
    ) {

        ctx.moveTo(
            centerX - half,
            centerY
        );

        ctx.lineTo(
            centerX + half,
            centerY - half
        );

        ctx.lineTo(
            centerX + half,
            centerY + half
        );

    } else if (
        direction.y === -1
    ) {

        ctx.moveTo(
            centerX,
            centerY - half
        );

        ctx.lineTo(
            centerX - half,
            centerY + half
        );

        ctx.lineTo(
            centerX + half,
            centerY + half
        );

    } else {

        ctx.moveTo(
            centerX,
            centerY + half
        );

        ctx.lineTo(
            centerX - half,
            centerY - half
        );

        ctx.lineTo(
            centerX + half,
            centerY - half
        );
    }

    ctx.closePath();
    ctx.fill();

    drawEyes(
        ctx,
        centerX,
        centerY
    );
}


// =====================================================
// OJOS
// =====================================================

function drawEyes(
    ctx,
    centerX,
    centerY
) {

    ctx.fillStyle =
        "#080808";

    const offset = 6;

    if (direction.x !== 0) {

        const eyeX =
            centerX +
            direction.x * 8;

        ctx.beginPath();

        ctx.arc(
            eyeX,
            centerY - offset,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.beginPath();

        ctx.arc(
            eyeX,
            centerY + offset,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();

    } else {

        const eyeY =
            centerY +
            direction.y * 8;

        ctx.beginPath();

        ctx.arc(
            centerX - offset,
            eyeY,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.beginPath();

        ctx.arc(
            centerX + offset,
            eyeY,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


// =====================================================
// IMÁGENES
// =====================================================

function preloadTracks() {

    snakeTracks.forEach(track => {

        if (track.cover) {
            preloadImage(
                track.cover
            );
        }
    });
}


function preloadImage(src) {

    if (!src) {
        return null;
    }

    if (
        snakeImageCache.has(src)
    ) {
        return snakeImageCache.get(
            src
        );
    }

    const image =
        new Image();

    image.decoding =
        "async";

    image.src =
        src;

    snakeImageCache.set(
        src,
        image
    );

    return image;
}


// =====================================================
// TRACK UI
// =====================================================

function updateTrackUI(
    track
) {

    const image =
        snakeEl("gameAlbumImage");

    const name =
        snakeEl("gameTrackName");

    const artist =
        snakeEl("gameArtistName");

    if (!track) {

        if (image) {
            image.removeAttribute("src");
        }

        if (name) {
            name.textContent = "—";
        }

        if (artist) {
            artist.textContent = "—";
        }

        return;
    }

    if (image) {
        image.src =
            track.cover || "";
    }

    if (name) {
        name.textContent =
            track.name || "—";
    }

    if (artist) {
        artist.textContent =
            track.artist || "—";
    }
}


// =====================================================
// SCORE
// =====================================================

function updateScore() {

    const scoreElement =
        snakeEl("score");

    if (scoreElement) {
        scoreElement.textContent =
            String(score);
    }
}


// =====================================================
// READY
// =====================================================

function showSnakeReady() {

    snakeEl("snakeReady")
        ?.classList.remove("hidden");

    snakeEl("snakeGameOver")
        ?.classList.add("hidden");
}

function hideSnakeReady() {

    snakeEl("snakeReady")
        ?.classList.add("hidden");
}


// =====================================================
// GAME OVER
// =====================================================

function gameOver() {

    snakeRunning = false;

    if (animationFrame !== null) {
        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;
    }

    if (
        typeof pauseSpotify ===
        "function"
    ) {
        pauseSpotify();
    }

    const finalScore =
        snakeEl(
            "snakeFinalScore"
        );

    if (finalScore) {
        finalScore.textContent =
            `Puntuación: ${score}`;
    }

    snakeEl(
        "snakeGameOver"
    )?.classList.remove(
        "hidden"
    );
}


// =====================================================
// GAME OVER HIDE
// =====================================================

function hideSnakeGameOver() {

    snakeEl(
        "snakeGameOver"
    )?.classList.add(
        "hidden"
    );
}


// =====================================================
// UTILIDADES
// =====================================================

function cloneSnake(source) {

    return source.map(
        segment => ({
            x: segment.x,
            y: segment.y,
            cover:
                segment.cover ||
                null
        })
    );
}

function shuffle(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            array[i],
            array[j]
        ] = [
            array[j],
            array[i]
        ];
    }

    return array;
}


// =====================================================
// EVENTOS
// =====================================================

document.addEventListener(
    "click",
    event => {

        if (
            event.target.closest(
                "#startSnakeButton"
            )
        ) {
            beginSnake();
            return;
        }

        if (
            event.target.closest(
                "#restartSnakeButton"
            )
        ) {
            resetSnakeState();
            beginSnake();
        }
    }
);