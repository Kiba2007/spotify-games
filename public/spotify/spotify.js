let spotifyPlayer = null;
let spotifyDeviceId = null;
let spotifyReady = null;


// =====================================================
// TOKEN
// =====================================================

async function getSpotifyToken() {
    const response = await fetch("/auth/token");

    if (!response.ok) {
        throw new Error("No autenticado en Spotify.");
    }

    const data = await response.json();

    return data.access_token;
}


// =====================================================
// INICIALIZAR PLAYER
// =====================================================

function initSpotify() {
    if (spotifyReady) {
        return spotifyReady;
    }

    spotifyReady = initializeSpotify();

    return spotifyReady;
}

async function initializeSpotify() {

    if (
        !window.Spotify ||
        typeof window.Spotify.Player !== "function"
    ) {
        throw new Error(
            "Spotify Web Playback SDK no está cargado."
        );
    }

    const token = await getSpotifyToken();

    const player =
        new window.Spotify.Player({
            name: "Spotify Games",
            getOAuthToken: callback => callback(token),
            volume: 0.5
        });

    spotifyPlayer = player;


    // PLAYER LISTO

    player.addListener(
        "ready",
        async ({ device_id }) => {

            spotifyDeviceId = device_id;

            console.log(
                "🎵 Spotify Player listo:",
                device_id
            );

            try {
                const response = await fetch(
                    "/api/transfer",
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            deviceId: device_id
                        })
                    }
                );

                if (!response.ok) {
                    console.error(
                        "❌ Error transfiriendo Spotify:",
                        await response.text()
                    );
                }

            } catch (error) {
                console.error(
                    "❌ Error transfiriendo Spotify:",
                    error
                );
            }
        }
    );


    // ESTADO DE REPRODUCCIÓN

    player.addListener(
        "player_state_changed",
        state => {

            if (
                typeof window.onSpotifyGameStateChanged ===
                "function"
            ) {
                window.onSpotifyGameStateChanged(
                    state
                );
            }
        }
    );


    // PLAYER NO DISPONIBLE

    player.addListener(
        "not_ready",
        ({ device_id }) => {

            console.log(
                "Spotify Player no disponible:",
                device_id
            );

            if (
                spotifyDeviceId ===
                device_id
            ) {
                spotifyDeviceId = null;
            }
        }
    );


    // ERRORES

    player.addListener(
        "initialization_error",
        ({ message }) => {
            console.error(
                "Spotify initialization error:",
                message
            );
        }
    );

    player.addListener(
        "authentication_error",
        ({ message }) => {
            console.error(
                "Spotify authentication error:",
                message
            );
        }
    );

    player.addListener(
        "account_error",
        ({ message }) => {
            console.error(
                "Spotify account error:",
                message
            );
        }
    );

    player.addListener(
        "playback_error",
        ({ message }) => {
            console.error(
                "Spotify playback error:",
                message
            );
        }
    );


    // CONECTAR

    const connected =
        await player.connect();

    if (!connected) {
        throw new Error(
            "No se pudo conectar con Spotify."
        );
    }

    console.log(
        "✅ Spotify Player conectado"
    );

    return player;
}


// =====================================================
// SDK READY
// =====================================================

window.onSpotifyWebPlaybackSDKReady = () => {
    console.log(
        "🎵 Spotify Web Playback SDK cargado"
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
// REPRODUCIR CANCIÓN
// =====================================================

async function playSpotifyTrack(trackUri) {

    if (!trackUri) {
        throw new Error(
            "Falta URI de la canción."
        );
    }

    const deviceId =
        await waitForSpotify();

    const response = await fetch(
        "/api/play",
        {
            method: "PUT",
            headers: {
                "Content-Type":
                    "application/json"
            },
            body: JSON.stringify({
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

    console.log(
        "▶ Reproduciendo:",
        trackUri
    );
}


// =====================================================
// PAUSAR
// =====================================================

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
            "❌ Error pausando Spotify:",
            error
        );
    }
}


// =====================================================
// CONTROLES DEL WEB PLAYER
// =====================================================

async function spotifyResume() {
    const player = await initSpotify();
    return player.resume();
}

async function spotifyPause() {
    const player = await initSpotify();
    return player.pause();
}

async function spotifyTogglePlay() {
    const player = await initSpotify();
    return player.togglePlay();
}

async function spotifySeek(positionMs) {
    const player = await initSpotify();

    return player.seek(
        Math.round(positionMs)
    );
}

async function spotifyGetState() {
    if (!spotifyPlayer) {
        return null;
    }

    return spotifyPlayer.getCurrentState();
}