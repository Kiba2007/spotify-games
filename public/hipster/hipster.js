let hipsterTracks = [];
let hipsterTimeline = [];
let hipsterCurrentTrack = null;

let hipsterMode = "global";
let hipsterPlaylist = null;

let hipsterScore = 0;
let hipsterBest = Number(
    localStorage.getItem("hipsterBest") || 0
);

let hipsterLocked = false;
let hipsterPlayerState = null;

let hipsterTimer = null;
let hipsterGameId = 0;


// =====================================================
// HELPER
// =====================================================

function hipsterElement(id) {
    return document.getElementById(id);
}


// =====================================================
// INICIAR PARTIDA
// =====================================================

async function startHipster({
    mode = "global",
    playlist = null
} = {}) {

    /*
     * Mata completamente la partida anterior.
     */
    stopHipster();

    /*
     * Nuevo identificador de partida.
     */
    const gameId =
        ++hipsterGameId;

    hipsterMode = mode;
    hipsterPlaylist = playlist;

    hipsterScore = 0;
    hipsterLocked = false;

    hipsterTracks = [];
    hipsterTimeline = [];
    hipsterCurrentTrack = null;

    const score =
        hipsterElement("hipsterScore");

    const best =
        hipsterElement("hipsterBest");

    if (score) {
        score.textContent = "0";
    }

    if (best) {
        best.textContent =
            hipsterBest;
    }

    hipsterElement("hipsterIntro")
        ?.classList.add("hidden");

    hipsterElement("hipsterGameOver")
        ?.classList.add("hidden");

    hipsterElement("hipsterBoard")
        ?.classList.remove("hidden");

    resetPlayer();

    try {

        hipsterTracks =
            await loadHipsterTracks();

        /*
         * Normalizamos años.
         * No existe ningún límite artificial de longitud.
         */
        hipsterTracks = hipsterTracks
            .filter(track =>
                track &&
                track.uri &&
                track.name &&
                Number.isInteger(
                    Number(track.year)
                ) &&
                Number(track.year) > 0
            )
            .map(track => ({
                ...track,
                year: Number(track.year)
            }));


        if (gameId !== hipsterGameId) {
            return;
        }


        if (hipsterTracks.length < 2) {

            throw new Error(
                "Esta playlist necesita al menos 2 canciones con año para jugar a Hipster."
            );
        }


        shuffle(
            hipsterTracks
        );


        /*
         * Primera carta conocida.
         */

        hipsterTimeline = [
            hipsterTracks.shift()
        ];

        renderTimeline();


        /*
         * Segunda canción.
         */

        await nextHipsterTrack(
            gameId
        );

    } catch (error) {

        if (gameId !== hipsterGameId) {
            return;
        }

        console.error(
            "❌ Hipster:",
            error
        );

        alert(
            error.message ||
            "No se pudo iniciar Hipster."
        );

        showScreen(
            "menuScreen"
        );
    }
}


// =====================================================
// CARGAR CANCIONES
// =====================================================

async function loadHipsterTracks() {

    /*
     * HIPSTER PERSONAL
     */

    if (hipsterMode === "user") {

        if (!hipsterPlaylist) {
            throw new Error(
                "No hay playlist seleccionada."
            );
        }

        if (
            typeof getPlaylistTracks !==
            "function"
        ) {
            throw new Error(
                "getPlaylistTracks no está disponible."
            );
        }

        return getPlaylistTracks(
            hipsterPlaylist.id
        );
    }


    /*
     * HIPSTER GLOBAL
     */

    const response =
        await fetch(
            "/api/hipster/tracks"
        );

    if (!response.ok) {

        throw new Error(
            `Error cargando Hipster Global: ${response.status}`
        );
    }

    const data =
        await response.json();

    if (!Array.isArray(data)) {

        throw new Error(
            "La playlist oficial devolvió una respuesta inválida."
        );
    }

    return data;
}


// =====================================================
// SIGUIENTE CANCIÓN
// =====================================================

async function nextHipsterTrack(gameId) {

    if (
        gameId !== undefined &&
        gameId !== hipsterGameId
    ) {
        return;
    }

    if (!hipsterTracks.length) {
        endHipster(true);
        return;
    }

    hipsterCurrentTrack =
        hipsterTracks.shift();

    hipsterLocked = false;

    hideResult();
    resetPlayer();
    setPlayerStatus("CARGANDO");


    try {

        await playSpotifyTrack(
            hipsterCurrentTrack.uri
        );

        if (
            gameId !== undefined &&
            gameId !== hipsterGameId
        ) {
            return;
        }

        setPlayerStatus(
            "REPRODUCIENDO"
        );

    } catch (error) {

        console.warn(
            "⚠️ No se pudo iniciar automáticamente:",
            error
        );

        setPlayerStatus(
            "PULSA ▶"
        );
    }
}


// =====================================================
// PLAY / PAUSA
// =====================================================

async function toggleHipsterPlay() {

    try {

        await spotifyTogglePlay();

    } catch (error) {

        console.error(
            "❌ Player Hipster:",
            error
        );
    }
}


// =====================================================
// SEEK
// =====================================================

async function seekHipster(event) {

    if (
        !hipsterPlayerState?.duration
    ) {
        return;
    }

    const position =
        hipsterPlayerState.duration *
        Number(event.target.value) /
        1000;

    try {

        await spotifySeek(
            position
        );

    } catch (error) {

        console.error(
            "❌ Seek Hipster:",
            error
        );
    }
}


// =====================================================
// ESTADO SPOTIFY
// =====================================================

window.onSpotifyGameStateChanged =
    state => {

        if (!state) {
            return;
        }

        hipsterPlayerState =
            state;

        const progress =
            hipsterElement(
                "hipsterProgress"
            );

        if (
            progress &&
            state.duration
        ) {

            progress.value =
                Math.round(
                    state.position /
                    state.duration *
                    1000
                );
        }

        const current =
            hipsterElement(
                "hipsterCurrentTime"
            );

        const duration =
            hipsterElement(
                "hipsterDuration"
            );

        if (current) {
            current.textContent =
                formatTime(
                    state.position
                );
        }

        if (duration) {
            duration.textContent =
                formatTime(
                    state.duration
                );
        }

        const button =
            hipsterElement(
                "hipsterPlayPause"
            );

        if (button) {
            button.textContent =
                state.paused
                    ? "▶"
                    : "Ⅱ";
        }

        setPlayerStatus(
            state.paused
                ? "PAUSADO"
                : "REPRODUCIENDO"
        );
    };


// =====================================================
// TIMELINE
// =====================================================

function renderTimeline() {

    const timeline =
        hipsterElement(
            "hipsterTimeline"
        );

    if (!timeline) {
        return;
    }

    timeline.innerHTML = "";


    for (
        let position = 0;
        position <= hipsterTimeline.length;
        position++
    ) {

        const slot =
            document.createElement(
                "div"
            );

        slot.className =
            "hipsterSlot";


        const button =
            document.createElement(
                "button"
            );

        button.type = "button";
        button.className =
            "hipsterPlus";

        button.textContent =
            "+";

        button.title =
            position === 0
                ? "Colocar al principio"
                : position === hipsterTimeline.length
                    ? "Colocar al final"
                    : "Colocar aquí";


        button.onclick =
            () => choosePosition(
                position
            );


        slot.appendChild(button);

        timeline.appendChild(slot);


        if (
            position <
            hipsterTimeline.length
        ) {

            timeline.appendChild(
                createCard(
                    hipsterTimeline[position]
                )
            );
        }
    }
}


// =====================================================
// CARTA
// =====================================================

function createCard(track) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "hipsterCard";


    const image =
        document.createElement(
            "img"
        );

    image.className =
        "hipsterCardCover";

    image.src =
        track.cover || "";

    image.alt = "";


    const artist =
        document.createElement(
            "div"
        );

    artist.className =
        "hipsterCardArtist";

    artist.textContent =
        track.artist || "";


    const year =
        document.createElement(
            "div"
        );

    year.className =
        "hipsterCardYear";

    year.textContent =
        track.year;


    const song =
        document.createElement(
            "div"
        );

    song.className =
        "hipsterCardSong";

    song.textContent =
        track.name;


    card.append(
        image,
        artist,
        year,
        song
    );

    return card;
}


// =====================================================
// COLOCAR CANCIÓN
// =====================================================

function choosePosition(position) {

    if (
        hipsterLocked ||
        !hipsterCurrentTrack
    ) {
        return;
    }

    hipsterLocked = true;

    const before =
        hipsterTimeline[
            position - 1
        ];

    const after =
        hipsterTimeline[
            position
        ];

    const year =
        hipsterCurrentTrack.year;


    const correct =
        (!before || year >= before.year) &&
        (!after || year <= after.year);


    hipsterTimeline.splice(
        position,
        0,
        hipsterCurrentTrack
    );

    renderTimeline();


    const cards =
        document.querySelectorAll(
            ".hipsterCard"
        );

    const selectedCard =
        cards[position];


    if (selectedCard) {

        selectedCard.classList.add(
            correct
                ? "correct"
                : "wrong"
        );
    }


    showResult(
        correct
    );


    setPlayerStatus(
        correct
            ? "CORRECTO"
            : "FALLO"
    );


    /*
     * ERROR → fin de partida.
     */

    if (!correct) {

        clearTimeout(
            hipsterTimer
        );

        hipsterTimer =
            setTimeout(
                () => {

                    endHipster(
                        false
                    );

                },
                900
            );

        return;
    }


    /*
     * ACIERTO.
     */

    hipsterScore++;

    const score =
        hipsterElement(
            "hipsterScore"
        );

    if (score) {
        score.textContent =
            hipsterScore;
    }


    const gameId =
        hipsterGameId;


    clearTimeout(
        hipsterTimer
    );


    hipsterTimer =
        setTimeout(
            () => {

                if (
                    gameId !==
                    hipsterGameId
                ) {
                    return;
                }

                nextHipsterTrack(
                    gameId
                );

            },
            850
        );
}


// =====================================================
// RESULTADO
// =====================================================

function showResult(correct) {

    const result =
        hipsterElement(
            "hipsterResult"
        );

    if (!result) {
        return;
    }

    result.classList.remove(
        "hidden"
    );


    result.innerHTML =
        correct

            ? `
                <strong>✓ ¡Correcto!</strong>
                ${escapeHtml(
                    hipsterCurrentTrack.name
                )}
                · ${hipsterCurrentTrack.year}
            `

            : `
                <strong>✕ Incorrecto</strong>
                Era
                ${escapeHtml(
                    hipsterCurrentTrack.name
                )}
                · ${hipsterCurrentTrack.year}
            `;
}


function hideResult() {

    hipsterElement(
        "hipsterResult"
    )?.classList.add(
        "hidden"
    );
}


// =====================================================
// PLAYER
// =====================================================

function resetPlayer() {

    const progress =
        hipsterElement(
            "hipsterProgress"
        );

    const current =
        hipsterElement(
            "hipsterCurrentTime"
        );

    const duration =
        hipsterElement(
            "hipsterDuration"
        );

    const button =
        hipsterElement(
            "hipsterPlayPause"
        );


    if (progress) {
        progress.value = 0;
    }

    if (current) {
        current.textContent =
            "0:00";
    }

    if (duration) {
        duration.textContent =
            "0:00";
    }

    if (button) {
        button.textContent =
            "▶";
    }
}


function setPlayerStatus(text) {

    const status =
        hipsterElement(
            "hipsterPlayerStatus"
        );

    if (status) {
        status.textContent =
            text;
    }
}


// =====================================================
// GAME OVER
// =====================================================

function endHipster(completed = false) {

    clearTimeout(
        hipsterTimer
    );

    /*
     * Invalidamos cualquier callback pendiente.
     */
    ++hipsterGameId;

    hipsterLocked = true;


    /*
     * PAUSAR SPOTIFY.
     */
    if (
        typeof spotifyPause ===
        "function"
    ) {

        spotifyPause()
            .catch(() => {});
    }

    if (
        typeof pauseSpotify ===
        "function"
    ) {

        pauseSpotify();
    }


    hipsterElement(
        "hipsterBoard"
    )?.classList.add(
        "hidden"
    );


    hipsterElement(
        "hipsterGameOver"
    )?.classList.remove(
        "hidden"
    );


    const finalScore =
        hipsterElement(
            "hipsterFinalScore"
        );

    if (finalScore) {
        finalScore.textContent =
            hipsterScore;
    }


    if (
        hipsterScore >
        hipsterBest
    ) {

        hipsterBest =
            hipsterScore;

        localStorage.setItem(
            "hipsterBest",
            String(hipsterBest)
        );

        hipsterElement(
            "hipsterFinalRecord"
        ).textContent =
            "🏆 Nuevo récord";

    } else {

        hipsterElement(
            "hipsterFinalRecord"
        ).textContent =
            `Récord: ${hipsterBest}`;
    }


    hipsterElement(
        "hipsterFinalTitle"
    ).textContent =
        completed
            ? "¡Has completado Hipster!"
            : "Te has equivocado";
}


// =====================================================
// DETENER PARTIDA ANTERIOR
// =====================================================

function stopHipster() {

    clearTimeout(
        hipsterTimer
    );

    ++hipsterGameId;

    hipsterLocked = true;

    hipsterTracks = [];
    hipsterTimeline = [];
    hipsterCurrentTrack = null;

    if (
        typeof spotifyPause ===
        "function"
    ) {

        spotifyPause()
            .catch(() => {});
    }

    if (
        typeof pauseSpotify ===
        "function"
    ) {

        pauseSpotify();
    }
}


// =====================================================
// UTILIDADES
// =====================================================

function formatTime(ms) {

    const seconds =
        Math.floor(
            (ms || 0) / 1000
        );

    return `${Math.floor(seconds / 60)}:${
        String(seconds % 60).padStart(
            2,
            "0"
        )}`;
}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
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
                "#hipsterPlayPause"
            )
        ) {

            toggleHipsterPlay();
            return;
        }


        if (
            event.target.closest(
                "#hipsterRestartButton"
            )
        ) {

            startHipster({
                mode: hipsterMode,
                playlist: hipsterPlaylist
            });

            return;
        }


        if (
            event.target.closest(
                "#hipsterExitButton"
            )
        ) {

            stopHipster();

            showScreen(
                "menuScreen"
            );
        }
    }
);


document.addEventListener(
    "input",
    event => {

        if (
            event.target.id ===
            "hipsterProgress"
        ) {

            seekHipster(
                event
            );
        }
    }
);