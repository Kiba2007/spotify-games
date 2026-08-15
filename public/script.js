let selectedGame = "snake";

const $ = id => document.getElementById(id);

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.add("hidden");
    });

    $(id)?.classList.remove("hidden");
}

async function loadGameHTML(path, containerId) {
    const container = $(containerId);

    if (!container) {
        throw new Error(`No existe #${containerId}`);
    }

    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`No se pudo cargar ${path}`);
    }

    container.innerHTML = await response.text();
}

function getPlaylist() {
    return typeof getSelectedPlaylist === "function"
        ? getSelectedPlaylist()
        : null;
}

function gameNeedsPlaylist() {
    return (
        selectedGame === "snake" ||
        selectedGame === "bingo" ||
        selectedGame === "hipster-user"
    );
}

function updateStartButton() {
    const button = $("startButton");
    const selectedText = $("selectedText");

    if (!button) return;

    const playlist = getPlaylist();
    const needsPlaylist = gameNeedsPlaylist();

    button.disabled = needsPlaylist && !playlist;

    switch (selectedGame) {
        case "snake":
            button.textContent = "Empezar Snake";
            break;

        case "bingo":
            button.textContent = "Crear Bingo";
            break;

        case "hipster-user":
            button.textContent = "Empezar Hipster";
            break;

        case "hipster-global":
            button.textContent = "Empezar Hipster Global";
            break;

        default:
            button.textContent = "Empezar";
    }

    if (selectedGame === "hipster-global") {
        selectedText.textContent =
            "Playlist oficial de Hipster";
    } else if (!playlist) {
        selectedText.textContent =
            "Selecciona una playlist";
    }
}

function initGameSelector() {
    document.querySelectorAll(".gameCard").forEach(card => {
        card.addEventListener("click", () => {

            selectedGame = card.dataset.game;

            document.querySelectorAll(".gameCard").forEach(item => {
                item.classList.toggle(
                    "selected",
                    item === card
                );
            });

            updateStartButton();
        });
    });
}

async function getTracks() {
    const playlist = getPlaylist();

    if (!playlist) {
        throw new Error("No hay playlist seleccionada.");
    }

    if (typeof getPlaylistTracks !== "function") {
        throw new Error("getPlaylistTracks no está disponible.");
    }

    const tracks = await getPlaylistTracks(playlist.id);

    if (!Array.isArray(tracks)) {
        throw new Error("Respuesta de canciones inválida.");
    }

    return tracks;
}


// =====================================================
// SNAKE
// =====================================================

async function startSnakeGame() {
    const button = $("startButton");

    try {
        button.disabled = true;
        button.textContent = "Cargando Snake...";

        const playlist = getPlaylist();

        if (!playlist) {
            throw new Error("Selecciona una playlist.");
        }

        const tracks = await getTracks();

        if (!tracks.length) {
            throw new Error(
                "Esta playlist no tiene canciones reproducibles."
            );
        }

        await loadGameHTML(
            "/snake/snake.html",
            "snakeContainer"
        );

        showScreen("gameScreen");

        if (typeof startSnake !== "function") {
            throw new Error("startSnake no está definido.");
        }

        startSnake(tracks, playlist.name);

    } catch (error) {
        console.error("❌ Snake:", error);

        alert(
            error.message ||
            "No se pudo iniciar Snake."
        );

        showScreen("menuScreen");

    } finally {
        updateStartButton();
    }
}


// =====================================================
// BINGO
// =====================================================

async function startBingoGame() {
    const button = $("startButton");

    try {
        button.disabled = true;
        button.textContent = "Cargando Bingo...";

        const playlist = getPlaylist();

        if (!playlist) {
            throw new Error("Selecciona una playlist.");
        }

        const tracks = await getTracks();

        if (tracks.length < 15) {
            throw new Error(
                `Necesitas al menos 15 canciones. Esta playlist tiene ${tracks.length}.`
            );
        }

        await loadGameHTML(
            "/bingo/bingo.html",
            "bingoContainer"
        );

        showScreen("bingoScreen");

        if (typeof startBingo !== "function") {
            throw new Error("startBingo no está definido.");
        }

        startBingo(
            tracks,
            playlist.name
        );

    } catch (error) {
        console.error("❌ Bingo:", error);

        alert(
            error.message ||
            "No se pudo iniciar Bingo."
        );

        showScreen("menuScreen");

    } finally {
        updateStartButton();
    }
}


// =====================================================
// HIPSTER
// =====================================================

async function startHipsterGame(mode) {
    const button = $("startButton");

    try {
        button.disabled = true;
        button.textContent =
            mode === "global"
                ? "Cargando Hipster Global..."
                : "Cargando Hipster...";

        await loadGameHTML(
            "/hipster/hipster.html",
            "hipsterContainer"
        );

        showScreen("hipsterScreen");

        if (typeof startHipster !== "function") {
            throw new Error(
                "startHipster no está definido."
            );
        }

        const playlist =
            mode === "user"
                ? getPlaylist()
                : null;

        if (mode === "user" && !playlist) {
            throw new Error(
                "Selecciona una playlist."
            );
        }

        /*
         * Hipster recibe el modo.
         *
         * user   → playlist seleccionada
         * global → playlist oficial
         */

        await startHipster({
            mode,
            playlist
        });

    } catch (error) {
        console.error("❌ Hipster:", error);

        alert(
            error.message ||
            "No se pudo iniciar Hipster."
        );

        showScreen("menuScreen");

    } finally {
        updateStartButton();
    }
}


// =====================================================
// START
// =====================================================

$("startButton")?.addEventListener(
    "click",
    async () => {

        switch (selectedGame) {

            case "snake":
                await startSnakeGame();
                break;

            case "bingo":
                await startBingoGame();
                break;

            case "hipster-user":
                await startHipsterGame("user");
                break;

            case "hipster-global":
                await startHipsterGame("global");
                break;
        }
    }
);


// =====================================================
// SALIR
// =====================================================

document.addEventListener("click", async event => {

    if (event.target.closest("#exitGameButton")) {

        if (typeof stopSnake === "function") {
            stopSnake();
        }

        await pauseSpotify?.();

        showScreen("menuScreen");
        updateStartButton();
        return;
    }


    if (event.target.closest("#exitBingoButton")) {

        showScreen("menuScreen");
        updateStartButton();
        return;
    }


    if (event.target.closest("#exitHipsterButton")) {

        if (typeof stopHipster === "function") {
            stopHipster();
        }

        await pauseSpotify?.();

        showScreen("menuScreen");
        updateStartButton();
    }
});


// =====================================================
// LOGIN
// =====================================================

async function checkLogin() {
    try {
        const response =
            await fetch("/auth/token");

        if (!response.ok) {
            showScreen("loginScreen");
            return;
        }

        showScreen("menuScreen");

        if (typeof loadPlaylists !== "function") {
            throw new Error(
                "loadPlaylists no está definido."
            );
        }

        await loadPlaylists();

        updateStartButton();

        if (typeof initSpotify === "function") {
            initSpotify().catch(error => {
                console.error(
                    "Spotify:",
                    error
                );
            });
        }

    } catch (error) {
        console.error(
            "❌ Inicio:",
            error
        );

        showScreen("loginScreen");
    }
}


// =====================================================
// START
// =====================================================

initGameSelector();
checkLogin();