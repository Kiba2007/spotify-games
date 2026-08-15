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

const imageCache = new Map();

const SNAKE = {
    cols: 20,
    rows: 15,
    cell: 40,
    tick: 130
};


// =====================================================
// INICIO
// =====================================================

function startSnake(tracks, playlistName) {

    if (!Array.isArray(tracks) || !tracks.length) {
        console.error("Snake necesita canciones.");
        return;
    }

    const canvas =
        document.getElementById("gameCanvas");

    if (!canvas) {
        console.error("No existe #gameCanvas.");
        return;
    }

    snakeInitialized = true;
    snakePlaylistName = playlistName || "";
    snakeTracks = tracks.map(track => ({ ...track }));

    canvas.width =
        SNAKE.cols * SNAKE.cell;

    canvas.height =
        SNAKE.rows * SNAKE.cell;

    const playlistNameElement =
        document.getElementById(
            "gamePlaylistName"
        );

    if (playlistNameElement) {
        playlistNameElement.textContent =
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

    snake = [
        {
            x: 10,
            y: 7,
            cover: null
        }
    ];

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

    snake = [
        {
            x: 10,
            y: 7,
            cover: null
        }
    ];

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
// DETENER
// =====================================================

function stopSnake(pauseMusic = true) {

    snakeRunning = false;

    if (animationFrame !== null) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;
    }

    if (
        pauseMusic &&
        typeof pauseSpotify ===
            "function"
    ) {
        pauseSpotify();
    }
}


// =====================================================
// BUCLE
// =====================================================

function snakeFrame(now) {

    if (!snakeRunning) {
        return;
    }

    if (!lastFrameTime) {
        lastFrameTime = now;
    }

    const delta =
        Math.min(
            now - lastFrameTime,
            250
        );

    lastFrameTime = now;
    accumulator += delta;

    while (
        accumulator >=
        SNAKE.tick
    ) {

        accumulator -=
            SNAKE.tick;

        updateSnake();

        if (!snakeRunning) {
            return;
        }
    }

    drawSnake(
        accumulator / SNAKE.tick
    );

    animationFrame =
        requestAnimationFrame(
            snakeFrame
        );
}


// =====================================================
// CONTROLES
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
// MOVIMIENTO
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
        x:
            head.x +
            direction.x,

        y:
            head.y +
            direction.y,

        cover: null
    };


    if (
        newHead.x < 0 ||
        newHead.x >= SNAKE.cols ||
        newHead.y < 0 ||
        newHead.y >= SNAKE.rows
    ) {

        gameOver();
        return;
    }


    const ateFood =
        food &&
        newHead.x === food.x &&
        newHead.y === food.y;


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
            oldSnake[i].x ===
                newHead.x &&
            oldSnake[i].y ===
                newHead.y
        ) {

            gameOver();
            return;
        }
    }


    const newSnake = [
        newHead
    ];


    for (
        let i = 0;
        i < oldSnake.length - 1;
        i++
    ) {

        newSnake.push({
            x:
                oldSnake[i].x,

            y:
                oldSnake[i].y,

            cover:
                oldSnake[i + 1].cover ||
                null
        });
    }


    if (ateFood) {

        score++;

        updateScore();

        const tail =
            oldSnake[
                oldSnake.length - 1
            ];

        newSnake.push({

            x:
                tail.x,

            y:
                tail.y,

            cover:
                food.track?.cover ||
                null
        });


        if (
            food.track?.cover
        ) {

            preloadImage(
                food.track.cover
            );
        }


        nextSnakeTrack();
        createFood();
    }


    previousSnake =
        oldSnake;

    snake =
        newSnake;
}


// =====================================================
// CAMBIAR CANCIÓN
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

        snakeTracks =
            shuffle(
                snakeTracks.map(
                    track => ({
                        ...track
                    })
                )
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


    if (
        currentTrack.cover
    ) {

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
            "Error reproduciendo Snake:",
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

            x:
                Math.floor(
                    Math.random() *
                    SNAKE.cols
                ),

            y:
                Math.floor(
                    Math.random() *
                    SNAKE.rows
                )
        };

        attempts++;

    } while (
        snake.some(
            segment =>
                segment.x ===
                    position.x &&
                segment.y ===
                    position.y
        ) &&
        attempts < 500
    );


    food = {

        x:
            position.x,

        y:
            position.y,

        track:
            currentTrack
    };


    if (
        currentTrack.cover
    ) {

        preloadImage(
            currentTrack.cover
        );
    }
}


// =====================================================
// DIBUJO
// =====================================================

function drawSnake(alpha = 0) {

    const canvas =
        document.getElementById(
            "gameCanvas"
        );

    if (!canvas) {
        return;
    }

    const ctx =
        canvas.getContext(
            "2d"
        );


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
        "#111";

    ctx.lineWidth = 1;


    for (
        let x = 0;
        x <= SNAKE.cols;
        x++
    ) {

        const px =
            x * SNAKE.cell;

        ctx.beginPath();

        ctx.moveTo(
            px,
            0
        );

        ctx.lineTo(
            px,
            SNAKE.rows *
                SNAKE.cell
        );

        ctx.stroke();
    }


    for (
        let y = 0;
        y <= SNAKE.rows;
        y++
    ) {

        const py =
            y * SNAKE.cell;

        ctx.beginPath();

        ctx.moveTo(
            0,
            py
        );

        ctx.lineTo(
            SNAKE.cols *
                SNAKE.cell,
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
        food.x *
        SNAKE.cell;

    const py =
        food.y *
        SNAKE.cell;

    const image =
        food.track?.cover
            ? imageCache.get(
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

            SNAKE.cell - 4,
            SNAKE.cell - 4
        );

    } else {

        ctx.fillStyle =
            "#1db954";

        ctx.fillRect(
            px + 3,
            py + 3,

            SNAKE.cell - 6,
            SNAKE.cell - 6
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
            ) *
            alpha;


        const y =
            previous.y +
            (
                current.y -
                previous.y
            ) *
            alpha;


        const px =
            x * SNAKE.cell;

        const py =
            y * SNAKE.cell;


        const image =
            current.cover
                ? imageCache.get(
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

                SNAKE.cell - 4,
                SNAKE.cell - 4
            );

        } else {

            ctx.fillStyle =
                "#1db954";

            ctx.fillRect(
                px + 3,
                py + 3,

                SNAKE.cell - 6,
                SNAKE.cell - 6
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
        ) *
        alpha;


    const y =
        previous.y +
        (
            current.y -
            previous.y
        ) *
        alpha;


    const centerX =
        x * SNAKE.cell +
        SNAKE.cell / 2;

    const centerY =
        y * SNAKE.cell +
        SNAKE.cell / 2;


    const half =
        SNAKE.cell * .4;


    ctx.fillStyle =
        "#1ed760";

    ctx.beginPath();


    if (
        direction.x === 1
    ) {

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


    if (
        direction.x !== 0
    ) {

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

    snakeTracks.forEach(
        track => {

            if (track.cover) {
                preloadImage(
                    track.cover
                );
            }
        }
    );
}


function preloadImage(src) {

    if (!src) {
        return null;
    }

    if (
        imageCache.has(src)
    ) {
        return imageCache.get(
            src
        );
    }


    const image =
        new Image();

    image.decoding =
        "async";

    image.src =
        src;


    imageCache.set(
        src,
        image
    );

    return image;
}


// =====================================================
// INTERFAZ
// =====================================================

function updateTrackUI(
    track
) {

    const image =
        document.getElementById(
            "gameAlbumImage"
        );

    const name =
        document.getElementById(
            "gameTrackName"
        );

    const artist =
        document.getElementById(
            "gameArtistName"
        );


    if (!track) {

        image?.removeAttribute(
            "src"
        );

        if (name) {
            name.textContent =
                "—";
        }

        if (artist) {
            artist.textContent =
                "—";
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


function updateScore() {

    const scoreElement =
        document.getElementById(
            "score"
        );

    if (scoreElement) {
        scoreElement.textContent =
            score;
    }
}


// =====================================================
// PANTALLAS
// =====================================================

function showSnakeReady() {

    document
        .getElementById(
            "snakeReady"
        )
        ?.classList.remove(
            "hidden"
        );

    document
        .getElementById(
            "snakeGameOver"
        )
        ?.classList.add(
            "hidden"
        );
}


function hideSnakeReady() {

    document
        .getElementById(
            "snakeReady"
        )
        ?.classList.add(
            "hidden"
        );
}


function hideSnakeGameOver() {

    document
        .getElementById(
            "snakeGameOver"
        )
        ?.classList.add(
            "hidden"
        );
}


// =====================================================
// GAME OVER
// =====================================================

function gameOver() {

    snakeRunning = false;

    if (
        animationFrame !==
        null
    ) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame =
            null;
    }


    if (
        typeof pauseSpotify ===
        "function"
    ) {
        pauseSpotify();
    }


    const finalScore =
        document.getElementById(
            "snakeFinalScore"
        );

    if (finalScore) {

        finalScore.textContent =
            `Puntuación: ${score}`;
    }


    document
        .getElementById(
            "snakeGameOver"
        )
        ?.classList.remove(
            "hidden"
        );
}


// =====================================================
// UTILIDADES
// =====================================================

function cloneSnake(
    source
) {

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


function shuffle(
    array
) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
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