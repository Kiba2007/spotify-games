let spotifyPlayer = null;
let spotifyDeviceId = null;
let spotifyReady = null;


// =====================================================
// INICIALIZAR
// =====================================================

function initSpotify() {

    if (!spotifyReady) {
        spotifyReady =
            initializeSpotify();
    }

    return spotifyReady;
}


async function initializeSpotify() {

    if (
        !window.Spotify ||
        typeof window.Spotify.Player !==
            "function"
    ) {
        throw new Error(
            "Spotify Web Playback SDK no está cargado."
        );
    }

    const token =
        await getSpotifyToken();

    const player =
        new window.Spotify.Player({
            name: "Spotify Games",
            getOAuthToken: callback =>
                callback(token),
            volume: 0.5
        });

    spotifyPlayer = player;


    // Player listo

    player.addListener(
        "ready",
        async ({ device_id }) => {

            spotifyDeviceId =
                device_id;

            try {

                const response =
                    await fetch(
                        "/api/transfer",
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify({
                                    deviceId:
                                        device_id
                                })
                        }
                    );

                if (!response.ok) {

                    console.error(
                        "Error transfiriendo Spotify:",
                        await response.text()
                    );
                }

            } catch (error) {

                console.error(
                    "Error transfiriendo Spotify:",
                    error
                );
            }
        }
    );


    // Estado de reproducción

    player.addListener(
        "player_state_changed",
        state => {

            if (
                typeof window
                    .onSpotifyGameStateChanged ===
                "function"
            ) {
                window.onSpotifyGameStateChanged(
                    state
                );
            }
        }
    );


    // Player no disponible

    player.addListener(
        "not_ready",
        ({ device_id }) => {

            if (
                spotifyDeviceId ===
                device_id
            ) {
                spotifyDeviceId = null;
            }
        }
    );


    // Errores

    const logError =
        (type, message) =>
            console.error(
                `Spotify ${type}:`,
                message
            );

    player.addListener(
        "initialization_error",
        ({ message }) =>
            logError(
                "initialization",
                message
            )
    );

    player.addListener(
        "authentication_error",
        ({ message }) =>
            logError(
                "authentication",
                message
            )
    );

    player.addListener(
        "account_error",
        ({ message }) =>
            logError(
                "account",
                message
            )
    );

    player.addListener(
        "playback_error",
        ({ message }) =>
            logError(
                "playback",
                message
            )
    );


    const connected =
        await player.connect();

    if (!connected) {
        throw new Error(
            "No se pudo conectar con Spotify."
        );
    }

    return player;
}


// =====================================================
// SDK
// =====================================================

window.onSpotifyWebPlaybackSDKReady =
    () => {
        console.log(
            "Spotify Web Playback SDK cargado"
        );
    };


// =====================================================
// PLAYER DISPONIBLE
// =====================================================

async function waitForSpotify() {

    await initSpotify();

    if (!spotifyDeviceId) {
        throw new Error(
            "Spotify Player no está listo."
        );
    }

    return spotifyDeviceId;
}


// =====================================================
// REPRODUCCIÓN
// =====================================================

async function playSpotifyTrack(
    trackUri
) {

    if (!trackUri) {
        throw new Error(
            "Falta URI de la canción."
        );
    }

    const deviceId =
        await waitForSpotify();

    const response =
        await fetch(
            "/api/play",
            {
                method: "PUT",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify({
                        deviceId,
                        trackUri
                    })
            }
        );

    if (!response.ok) {

        const error =
            await response.text();

        throw new Error(
            error ||
            "Error reproduciendo canción."
        );
    }
}


async function pauseSpotify() {

    try {

        await fetch(
            "/api/pause",
            {
                method: "PUT"
            }
        );

    } catch (error) {

        console.error(
            "Error pausando Spotify:",
            error
        );
    }
}


// =====================================================
// CONTROLES
// =====================================================

async function spotifyResume() {
    return (
        await initSpotify()
    ).resume();
}


async function spotifyPause() {
    return (
        await initSpotify()
    ).pause();
}


async function spotifyTogglePlay() {
    return (
        await initSpotify()
    ).togglePlay();
}


async function spotifySeek(positionMs) {

    return (
        await initSpotify()
    ).seek(
        Math.round(positionMs)
    );
}


async function spotifyGetState() {

    if (!spotifyPlayer) {
        return null;
    }

    return spotifyPlayer.getCurrentState();
}