require("dotenv").config();

const express = require("express");

const app = express();
const PORT = 3000;

let accessToken = null;

app.use(express.json());
app.use(express.static("public"));


// =====================================================
// CONFIGURACIÓN SPOTIFY
// =====================================================

const SPOTIFY_CLIENT_ID =
    process.env.SPOTIFY_CLIENT_ID;

const SPOTIFY_CLIENT_SECRET =
    process.env.SPOTIFY_CLIENT_SECRET;

const REDIRECT_URI =
    "http://127.0.0.1:3000/callback";

const HIPSTER_PLAYLIST_ID =
    "323RDMtCMPS3Jb8cvv0QeE";


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
        client_id: SPOTIFY_CLIENT_ID,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        scope
    });

    res.redirect(
        `https://accounts.spotify.com/authorize?${params.toString()}`
    );
});


// =====================================================
// CALLBACK
// =====================================================

app.get("/callback", async (req, res) => {

    const code = req.query.code;

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
                    client_id: SPOTIFY_CLIENT_ID,
                    client_secret: SPOTIFY_CLIENT_SECRET
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
            "✅ Access Token conseguido"
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


// =====================================================
// TOKEN FRONTEND
// =====================================================

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
// PLAYLISTS DEL USUARIO
// =====================================================

app.get("/api/playlists", async (req, res) => {

    if (!accessToken) {

        return res.status(401).json({
            error:
                "No hay usuario autenticado"
        });
    }

    try {

        const response =
            await fetch(
                "https://api.spotify.com/v1/me/playlists?limit=50",
                {
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            console.error(
                "Error obteniendo playlists:",
                data
            );

            return res
                .status(response.status)
                .json(data);
        }

        const playlists =
            (data.items || []).map(
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
});


// =====================================================
// CANCIONES ALEATORIAS
// =====================================================
//
// Máximo 50.
// Pensado para Snake y otros usos generales.
// Las posiciones se eligen de toda la playlist.
// Incluye year.
// =====================================================

app.get(
    "/api/playlists/:playlistId/tracks",
    async (req, res) => {

        if (!accessToken) {

            return res.status(401).json({
                error:
                    "No hay usuario autenticado"
            });
        }

        const {
            playlistId
        } = req.params;

        try {

            // ---------------------------------------------
            // INFO PLAYLIST
            // ---------------------------------------------

            const playlistResponse =
                await fetch(
                    `https://api.spotify.com/v1/playlists/${encodeURIComponent(
                        playlistId
                    )}`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`
                        }
                    }
                );

            const playlistData =
                await playlistResponse.json();

            if (!playlistResponse.ok) {

                console.error(
                    "Error obteniendo playlist:",
                    playlistData
                );

                return res
                    .status(
                        playlistResponse.status
                    )
                    .json(playlistData);
            }

            const total =
                playlistData.items?.total ??
                playlistData.tracks?.total ??
                0;

            console.log(
                `🎵 Playlist: ${playlistData.name}`
            );

            console.log(
                `🎵 Total canciones: ${total}`
            );

            if (!total) {
                return res.json([]);
            }


            // ---------------------------------------------
            // POSICIONES ALEATORIAS
            // ---------------------------------------------

            const amount =
                Math.min(50, total);

            const positions =
                new Set();

            while (
                positions.size < amount
            ) {

                positions.add(
                    Math.floor(
                        Math.random() * total
                    )
                );
            }


            // ---------------------------------------------
            // AGRUPAR POR PÁGINAS
            // ---------------------------------------------

            const pages =
                new Map();

            for (
                const position of positions
            ) {

                const offset =
                    Math.floor(
                        position / 50
                    ) * 50;

                if (!pages.has(offset)) {
                    pages.set(
                        offset,
                        []
                    );
                }

                pages
                    .get(offset)
                    .push(position);
            }


            // ---------------------------------------------
            // OBTENER PÁGINAS
            // ---------------------------------------------

            const selectedTracks =
                [];

            for (
                const [offset]
                of pages
            ) {

                const response =
                    await fetch(
                        `https://api.spotify.com/v1/playlists/${encodeURIComponent(
                            playlistId
                        )}/items?limit=50&offset=${offset}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`
                            }
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    console.error(
                        "Error obteniendo página:",
                        data
                    );

                    return res
                        .status(
                            response.status
                        )
                        .json(data);
                }

                for (
                    const item
                    of data.items || []
                ) {

                    const track =
                        item.item;

                    if (
                        !track ||
                        track.type !== "track" ||
                        !track.uri
                    ) {
                        continue;
                    }

                    selectedTracks.push({
                        id:
                            track.id,

                        uri:
                            track.uri,

                        name:
                            track.name,

                        artist:
                            (track.artists || [])
                                .map(
                                    artist =>
                                        artist.name
                                )
                                .join(", "),

                        album:
                            track.album?.name ||
                            "",

                        year:
                            parseInt(
                                track.album
                                    ?.release_date
                                    ?.slice(0, 4),
                                10
                            ),

                        cover:
                            track.album
                                ?.images?.[0]?.url ||
                            track.album
                                ?.images?.[1]?.url ||
                            track.album
                                ?.images?.[2]?.url ||
                            null
                    });
                }
            }


            // ---------------------------------------------
            // MEZCLAR + ELIMINAR DUPLICADOS
            // ---------------------------------------------

            shuffleArray(
                selectedTracks
            );

            const tracks = [];
            const usedIds =
                new Set();

            for (
                const track
                of selectedTracks
            ) {

                if (
                    usedIds.has(
                        track.id
                    )
                ) {
                    continue;
                }

                usedIds.add(
                    track.id
                );

                tracks.push(
                    track
                );
            }


            console.log(
                `🎲 Enviando ${tracks.length} canciones aleatorias`
            );

            res.json(
                tracks.slice(0, 50)
            );

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
// CATÁLOGO COMPLETO
// =====================================================
//
// Lo utiliza Bingo.
// Recorre toda la playlist.
// Incluye year.
// =====================================================

app.get(
    "/api/playlists/:playlistId/catalog",
    async (req, res) => {

        if (!accessToken) {

            return res.status(401).json({
                error:
                    "No hay usuario autenticado"
            });
        }

        const {
            playlistId
        } = req.params;

        try {

            const allTracks = [];

            let offset = 0;

            const limit = 50;


            while (true) {

                const response =
                    await fetch(
                        `https://api.spotify.com/v1/playlists/${encodeURIComponent(
                            playlistId
                        )}/items?limit=${limit}&offset=${offset}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`
                            }
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    console.error(
                        "Error obteniendo catálogo:",
                        data
                    );

                    return res
                        .status(
                            response.status
                        )
                        .json(data);
                }

                const items =
                    data.items || [];


                for (
                    const item
                    of items
                ) {

                    const track =
                        item.item;

                    if (
                        !track ||
                        track.type !== "track" ||
                        !track.uri
                    ) {
                        continue;
                    }

                    allTracks.push({

                        id:
                            track.id,

                        uri:
                            track.uri,

                        name:
                            track.name,

                        artist:
                            (track.artists || [])
                                .map(
                                    artist =>
                                        artist.name
                                )
                                .join(", "),

                        album:
                            track.album?.name ||
                            "",

                        year:
                            parseInt(
                                track.album
                                    ?.release_date
                                    ?.slice(0, 4),
                                10
                            ),

                        cover:
                            track.album
                                ?.images?.[0]?.url ||
                            track.album
                                ?.images?.[1]?.url ||
                            track.album
                                ?.images?.[2]?.url ||
                            null
                    });
                }


                if (
                    items.length < limit
                ) {
                    break;
                }

                offset += limit;
            }


            shuffleArray(
                allTracks
            );


            console.log(
                `🎵 Catálogo Bingo: ${allTracks.length} canciones`
            );


            res.json(
                allTracks
            );

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
//
// NO HAY LÍMITE ARTIFICIAL.
// Devuelve todas las canciones con año válido.
// =====================================================

app.get(
    "/api/playlists/:playlistId/hipster",
    async (req, res) => {

        if (!accessToken) {

            return res.status(401).json({
                error:
                    "No hay usuario autenticado"
            });
        }

        const {
            playlistId
        } = req.params;

        try {

            const allTracks = [];

            let offset = 0;

            const limit = 50;


            while (true) {

                const response =
                    await fetch(
                        `https://api.spotify.com/v1/playlists/${encodeURIComponent(
                            playlistId
                        )}/items?limit=${limit}&offset=${offset}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`
                            }
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {

                    console.error(
                        "Error obteniendo Hipster personal:",
                        data
                    );

                    return res
                        .status(
                            response.status
                        )
                        .json(data);
                }

                const items =
                    data.items || [];


                for (
                    const item
                    of items
                ) {

                    const track =
                        item.item;

                    if (
                        !track ||
                        track.type !== "track" ||
                        !track.uri
                    ) {
                        continue;
                    }


                    const year =
                        parseInt(
                            track.album
                                ?.release_date
                                ?.slice(0, 4),
                            10
                        );


                    /*
                     * Hipster necesita año.
                     */
                    if (
                        !Number.isInteger(year) ||
                        year <= 0
                    ) {
                        continue;
                    }


                    allTracks.push({

                        id:
                            track.id,

                        uri:
                            track.uri,

                        name:
                            track.name,

                        artist:
                            (track.artists || [])
                                .map(
                                    artist =>
                                        artist.name
                                )
                                .join(", "),

                        album:
                            track.album?.name ||
                            "",

                        year,

                        cover:
                            track.album
                                ?.images?.[0]?.url ||
                            track.album
                                ?.images?.[1]?.url ||
                            track.album
                                ?.images?.[2]?.url ||
                            null
                    });
                }


                if (
                    items.length < limit
                ) {
                    break;
                }

                offset += limit;
            }


            // ---------------------------------------------
            // ELIMINAR DUPLICADOS
            // ---------------------------------------------

            const tracks = [];

            const usedIds =
                new Set();

            for (
                const track
                of allTracks
            ) {

                if (
                    usedIds.has(
                        track.id
                    )
                ) {
                    continue;
                }

                usedIds.add(
                    track.id
                );

                tracks.push(
                    track
                );
            }


            shuffleArray(
                tracks
            );


            console.log(
                `🎵 Hipster personal: ${tracks.length} canciones con año`
            );


            res.json(
                tracks
            );

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

        if (!accessToken) {

            return res.status(401).json({
                error:
                    "No hay usuario autenticado"
            });
        }


        try {

            const tracks = [];

            let offset = 0;

            const limit = 50;


            while (true) {

                const response =
                    await fetch(
                        `https://api.spotify.com/v1/playlists/${HIPSTER_PLAYLIST_ID}/items?limit=${limit}&offset=${offset}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`
                            }
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    console.error(
                        "Error Hipster Global:",
                        data
                    );

                    return res
                        .status(
                            response.status
                        )
                        .json(data);
                }


                const items =
                    data.items || [];


                for (
                    const item
                    of items
                ) {

                    const track =
                        item.item;


                    if (
                        !track ||
                        track.type !== "track" ||
                        !track.uri
                    ) {
                        continue;
                    }


                    const year =
                        parseInt(
                            track.album
                                ?.release_date
                                ?.slice(0, 4),
                            10
                        );


                    if (
                        !Number.isInteger(year) ||
                        year <= 0
                    ) {
                        continue;
                    }


                    tracks.push({

                        id:
                            track.id,

                        uri:
                            track.uri,

                        name:
                            track.name,

                        artist:
                            (track.artists || [])
                                .map(
                                    artist =>
                                        artist.name
                                )
                                .join(", "),

                        year,

                        cover:
                            track.album
                                ?.images?.[0]?.url ||
                            null
                    });
                }


                if (
                    items.length < limit
                ) {
                    break;
                }


                offset += limit;
            }


            shuffleArray(
                tracks
            );


            console.log(
                `🎵 Hipster Global: ${tracks.length} canciones`
            );


            res.json(
                tracks
            );

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
// SHUFFLE
// =====================================================

function shuffleArray(array) {

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
// TRANSFERIR REPRODUCCIÓN
// =====================================================

app.put(
    "/api/transfer",
    async (req, res) => {

        const {
            deviceId
        } = req.body;

        if (!accessToken) {

            return res
                .status(401)
                .send(
                    "No hay Access Token."
                );
        }

        if (!deviceId) {

            return res
                .status(400)
                .send(
                    "Falta deviceId."
                );
        }

        try {

            const response =
                await fetch(
                    "https://api.spotify.com/v1/me/player",
                    {
                        method: "PUT",

                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,

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

                const error =
                    await response.text();

                console.error(
                    "Error transfer:",
                    error
                );

                return res
                    .status(
                        response.status
                    )
                    .send(error);
            }

            console.log(
                "✅ Spotify Games es el dispositivo activo"
            );

            res.sendStatus(204);

        } catch (error) {

            console.error(
                "Error transfer:",
                error
            );

            res.status(500).send(
                "Error transfiriendo reproducción."
            );
        }
    }
);


// =====================================================
// REPRODUCIR CANCIÓN
// =====================================================

app.put(
    "/api/play",
    async (req, res) => {

        const {
            deviceId,
            trackUri
        } = req.body;

        if (!accessToken) {

            return res
                .status(401)
                .send(
                    "No hay Access Token."
                );
        }

        if (!deviceId) {

            return res
                .status(400)
                .send(
                    "Falta deviceId."
                );
        }

        try {

            const body =
                trackUri
                    ? {
                        uris: [
                            trackUri
                        ]
                    }
                    : {};


            const response =
                await fetch(
                    `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(
                        deviceId
                    )}`,
                    {
                        method: "PUT",

                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                body
                            )
                    }
                );


            if (!response.ok) {

                const error =
                    await response.text();

                console.error(
                    "Spotify play error:",
                    error
                );

                return res
                    .status(
                        response.status
                    )
                    .send(error);
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


// =====================================================
// PAUSAR
// =====================================================

app.put(
    "/api/pause",
    async (req, res) => {

        if (!accessToken) {

            return res
                .status(401)
                .send(
                    "No hay Access Token."
                );
        }

        try {

            const response =
                await fetch(
                    "https://api.spotify.com/v1/me/player/pause",
                    {
                        method: "PUT",

                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`
                        }
                    }
                );


            if (!response.ok) {

                const error =
                    await response.text();

                return res
                    .status(
                        response.status
                    )
                    .send(error);
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
// START
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            `🚀 Spotify Games: http://127.0.0.1:${PORT}`
        );
    }
);