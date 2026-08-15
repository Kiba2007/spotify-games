require("dotenv").config();

const express = require("express");

const app = express();
const PORT = 3000;

let accessToken = null;

app.use(express.json());
app.use(express.static("public"));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const REDIRECT_URI =
    "http://127.0.0.1:3000/callback";

const HIPSTER_PLAYLIST_ID =
    "323RDMtCMPS3Jb8cvv0QeE";

const SPOTIFY_API =
    "https://api.spotify.com/v1";


// =====================================================
// SPOTIFY
// =====================================================

function spotifyHeaders() {
    return {
        Authorization: `Bearer ${accessToken}`
    };
}


async function spotifyFetch(path, options = {}) {

    return fetch(
        `${SPOTIFY_API}${path}`,
        {
            ...options,
            headers: {
                ...spotifyHeaders(),
                ...(options.headers || {})
            }
        }
    );
}


function requireAuth(req, res) {

    if (accessToken) {
        return true;
    }

    res.status(401).json({
        error: "No hay usuario autenticado"
    });

    return false;
}


// =====================================================
// LOGIN
// =====================================================

app.get("/login", (req, res) => {

    const scope = [
        "streaming",
        "user-read-private",
        "user-read-email",
        "user-modify-playback-state",
        "playlist-read-private",
        "playlist-read-collaborative"
    ].join(" ");

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        scope
    });

    res.redirect(
        `https://accounts.spotify.com/authorize?${params}`
    );
});


app.get("/callback", async (req, res) => {

    const { code } = req.query;

    if (!code) {
        return res
            .status(400)
            .send("No se recibió ningún código.");
    }

    try {

        const response = await fetch(
            "https://accounts.spotify.com/api/token",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: REDIRECT_URI,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET
                })
            }
        );

        const data =
            await response.json();

        if (!response.ok) {

            console.error(
                "Spotify token error:",
                data
            );

            return res
                .status(response.status)
                .send(
                    "Error obteniendo el Access Token."
                );
        }

        accessToken =
            data.access_token;

        console.log(
            "Access Token conseguido"
        );

        res.redirect("/");

    } catch (error) {

        console.error(
            "Error en callback:",
            error
        );

        res
            .status(500)
            .send(
                "Error conectando con Spotify."
            );
    }
});


app.get("/auth/token", (req, res) => {

    if (!accessToken) {
        return res.status(401).json({
            error:
                "No hay usuario autenticado"
        });
    }

    res.json({
        access_token:
            accessToken
    });
});


// =====================================================
// HELPERS DE PLAYLISTS
// =====================================================

function getTrackYear(track) {

    const date =
        track.album?.release_date;

    const year =
        parseInt(
            date?.slice(0, 4),
            10
        );

    return Number.isInteger(year)
        ? year
        : null;
}


function formatTrack(track) {

    return {
        id: track.id,
        uri: track.uri,
        name: track.name,

        artist:
            (track.artists || [])
                .map(artist => artist.name)
                .join(", "),

        album:
            track.album?.name || "",

        year:
            getTrackYear(track),

        cover:
            track.album?.images?.[0]?.url ||
            track.album?.images?.[1]?.url ||
            track.album?.images?.[2]?.url ||
            null
    };
}


function validTrack(track) {

    return (
        track &&
        track.type === "track" &&
        track.uri
    );
}


async function getPlaylistPage(
    playlistId,
    offset = 0,
    limit = 50
) {

    const response =
        await spotifyFetch(
            `/playlists/${encodeURIComponent(
                playlistId
            )}/items?limit=${limit}&offset=${offset}`
        );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data?.error?.message ||
            "Error obteniendo canciones."
        );
    }

    return data;
}


async function getPlaylistTotal(
    playlistId
) {

    const response =
        await spotifyFetch(
            `/playlists/${encodeURIComponent(
                playlistId
            )}`
        );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data?.error?.message ||
            "Error obteniendo playlist."
        );
    }

    return {
        name:
            data.name || "",
        total:
            data.items?.total ??
            data.tracks?.total ??
            0
    };
}


async function getAllPlaylistTracks(
    playlistId
) {

    const tracks = [];
    let offset = 0;

    while (true) {

        const data =
            await getPlaylistPage(
                playlistId,
                offset,
                50
            );

        const items =
            data.items || [];

        for (
            const item of items
        ) {

            const track =
                item.item;

            if (validTrack(track)) {
                tracks.push(
                    formatTrack(track)
                );
            }
        }

        if (items.length < 50) {
            break;
        }

        offset += 50;
    }

    return tracks;
}


function uniqueTracks(tracks) {

    const seen = new Set();

    return tracks.filter(
        track => {

            if (seen.has(track.id)) {
                return false;
            }

            seen.add(track.id);
            return true;
        }
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
// PLAYLISTS DEL USUARIO
// =====================================================

app.get(
    "/api/playlists",
    async (req, res) => {

        if (!requireAuth(req, res)) {
            return;
        }

        try {

            const response =
                await spotifyFetch(
                    "/me/playlists?limit=50"
                );

            const data =
                await response.json();

            if (!response.ok) {

                return res
                    .status(response.status)
                    .json(data);
            }

            const playlists =
                (data.items || [])
                    .map(
                        playlist => ({
                            id:
                                playlist.id,

                            name:
                                playlist.name,

                            image:
                                playlist.images?.[0]?.url ||
                                null,

                            tracks:
                                playlist.items?.total ??
                                playlist.tracks?.total ??
                                0,

                            uri:
                                playlist.uri
                        })
                    );

            res.json(playlists);

        } catch (error) {

            console.error(
                "Error playlists:",
                error
            );

            res.status(500).json({
                error:
                    "No se pudieron obtener las playlists."
            });
        }
    }
);


// =====================================================
// 50 CANCIONES ALEATORIAS
// =====================================================

app.get(
    "/api/playlists/:playlistId/tracks",
    async (req, res) => {

        if (!requireAuth(req, res)) {
            return;
        }

        const {
            playlistId
        } = req.params;

        try {

            const {
                name,
                total
            } =
                await getPlaylistTotal(
                    playlistId
                );

            if (!total) {
                return res.json([]);
            }

            const amount =
                Math.min(50, total);

            const positions =
                new Set();

            while (
                positions.size < amount
            ) {

                positions.add(
                    Math.floor(
                        Math.random() *
                        total
                    )
                );
            }

            const offsets =
                new Set(
                    [...positions].map(
                        position =>
                            Math.floor(
                                position / 50
                            ) * 50
                    )
                );

            const tracks = [];

            for (
                const offset
                of offsets
            ) {

                const data =
                    await getPlaylistPage(
                        playlistId,
                        offset,
                        50
                    );

                for (
                    const item
                    of data.items || []
                ) {

                    const track =
                        item.item;

                    if (validTrack(track)) {
                        tracks.push(
                            formatTrack(track)
                        );
                    }
                }
            }

            const result =
                shuffle(
                    uniqueTracks(
                        tracks
                    )
                ).slice(
                    0,
                    50
                );

            console.log(
                `Playlist ${name}: ${result.length} canciones`
            );

            res.json(result);

        } catch (error) {

            console.error(
                "Error obteniendo canciones:",
                error
            );

            res.status(500).json({
                error:
                    "No se pudieron obtener las canciones."
            });
        }
    }
);


// =====================================================
// CATÁLOGO COMPLETO — BINGO
// =====================================================

app.get(
    "/api/playlists/:playlistId/catalog",
    async (req, res) => {

        if (!requireAuth(req, res)) {
            return;
        }

        try {

            const tracks =
                shuffle(
                    uniqueTracks(
                        await getAllPlaylistTracks(
                            req.params.playlistId
                        )
                    )
                );

            res.json(tracks);

        } catch (error) {

            console.error(
                "Error cargando catálogo:",
                error
            );

            res.status(500).json({
                error:
                    "No se pudo cargar el catálogo de la playlist."
            });
        }
    }
);


// =====================================================
// HIPSTER PERSONAL
// =====================================================

app.get(
    "/api/playlists/:playlistId/hipster",
    async (req, res) => {

        if (!requireAuth(req, res)) {
            return;
        }

        try {

            const tracks =
                uniqueTracks(
                    await getAllPlaylistTracks(
                        req.params.playlistId
                    )
                )
                .filter(
                    track =>
                        Number.isInteger(
                            track.year
                        ) &&
                        track.year > 0
                );

            shuffle(tracks);

            console.log(
                `Hipster personal: ${tracks.length} canciones`
            );

            res.json(tracks);

        } catch (error) {

            console.error(
                "Error cargando Hipster personal:",
                error
            );

            res.status(500).json({
                error:
                    "No se pudo cargar la playlist para Hipster."
            });
        }
    }
);


// =====================================================
// HIPSTER GLOBAL
// =====================================================

app.get(
    "/api/hipster/tracks",
    async (req, res) => {

        if (!requireAuth(req, res)) {
            return;
        }

        try {

            const tracks =
                uniqueTracks(
                    await getAllPlaylistTracks(
                        HIPSTER_PLAYLIST_ID
                    )
                )
                .filter(
                    track =>
                        Number.isInteger(
                            track.year
                        ) &&
                        track.year > 0
                );

            shuffle(tracks);

            console.log(
                `Hipster Global: ${tracks.length} canciones`
            );

            res.json(tracks);

        } catch (error) {

            console.error(
                "Error cargando Hipster Global:",
                error
            );

            res.status(500).json({
                error:
                    "No se pudo cargar Hipster Global."
            });
        }
    }
);


// =====================================================
// REPRODUCCIÓN
// =====================================================

app.put(
    "/api/transfer",
    async (req, res) => {

        if (!requireAuth(req, res)) {
            return;
        }

        const {
            deviceId
        } = req.body;

        if (!deviceId) {
            return res
                .status(400)
                .send("Falta deviceId.");
        }

        try {

            const response =
                await spotifyFetch(
                    "/me/player",
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                device_ids: [
                                    deviceId
                                ],
                                play: false
                            })
                    }
                );

            if (!response.ok) {

                return res
                    .status(
                        response.status
                    )
                    .send(
                        await response.text()
                    );
            }

            res.sendStatus(204);

        } catch (error) {

            console.error(
                "Error transfiriendo:",
                error
            );

            res.status(500).send(
                "Error transfiriendo reproducción."
            );
        }
    }
);


app.put(
    "/api/play",
    async (req, res) => {

        if (!requireAuth(req, res)) {
            return;
        }

        const {
            deviceId,
            trackUri
        } = req.body;

        if (!deviceId) {
            return res
                .status(400)
                .send("Falta deviceId.");
        }

        try {

            const response =
                await spotifyFetch(
                    `/me/player/play?device_id=${encodeURIComponent(
                        deviceId
                    )}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                trackUri
                                    ? {
                                        uris: [
                                            trackUri
                                        ]
                                    }
                                    : {}
                            )
                    }
                );

            if (!response.ok) {

                return res
                    .status(
                        response.status
                    )
                    .send(
                        await response.text()
                    );
            }

            res.sendStatus(204);

        } catch (error) {

            console.error(
                "Error reproduciendo:",
                error
            );

            res.status(500).send(
                "Error reproduciendo."
            );
        }
    }
);


app.put(
    "/api/pause",
    async (req, res) => {

        if (!requireAuth(req, res)) {
            return;
        }

        try {

            const response =
                await spotifyFetch(
                    "/me/player/pause",
                    {
                        method: "PUT"
                    }
                );

            if (!response.ok) {

                return res
                    .status(
                        response.status
                    )
                    .send(
                        await response.text()
                    );
            }

            res.sendStatus(204);

        } catch (error) {

            console.error(
                "Error pausando:",
                error
            );

            res.status(500).send(
                "Error pausando."
            );
        }
    }
);


// =====================================================
// SERVIDOR
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            `Spotify Games: http://127.0.0.1:${PORT}`
        );
    }
);