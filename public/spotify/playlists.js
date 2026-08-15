let playlists = [];
let selectedPlaylist = null;


// =====================================================
// PLAYLISTS
// =====================================================

async function loadPlaylists() {

    const container =
        document.getElementById(
            "playlistList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="playlistLoading">
            Cargando playlists...
        </div>
    `;

    try {

        const response =
            await fetch(
                "/api/playlists"
            );

        if (!response.ok) {
            throw new Error(
                "No se pudieron cargar las playlists."
            );
        }

        const data =
            await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "Respuesta de playlists no válida."
            );
        }

        playlists = data;

        if (!playlists.length) {

            container.innerHTML = `
                <div class="playlistEmpty">
                    No tienes playlists disponibles.
                </div>
            `;

            updateStartButton?.();
            return;
        }

        renderPlaylists();
        updateStartButton?.();

    } catch (error) {

        console.error(
            "Playlists:",
            error
        );

        container.innerHTML = `
            <div class="playlistEmpty">
                Error cargando tus playlists.
            </div>
        `;
    }
}


// =====================================================
// RENDER
// =====================================================

function renderPlaylists() {

    const container =
        document.getElementById(
            "playlistList"
        );

    if (!container) {
        return;
    }

    const fragment =
        document.createDocumentFragment();

    container.innerHTML = "";

    playlists.forEach(
        playlist => {

            const card =
                document.createElement(
                    "button"
                );

            card.type = "button";
            card.className = "playlist";
            card.dataset.id =
                playlist.id;

            const image =
                document.createElement(
                    "img"
                );

            image.src =
                playlist.image || "";

            image.alt =
                playlist.name || "";

            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "playlistName";

            name.textContent =
                playlist.name || "";

            const tracks =
                document.createElement(
                    "span"
                );

            tracks.className =
                "playlistTracks";

            tracks.textContent =
                `${playlist.tracks || 0} canciones`;

            card.append(
                image,
                name,
                tracks
            );

            card.addEventListener(
                "click",
                () => selectPlaylist(
                    playlist
                )
            );

            fragment.appendChild(
                card
            );
        }
    );

    container.appendChild(
        fragment
    );
}


// =====================================================
// SELECCIÓN
// =====================================================

function selectPlaylist(playlist) {

    selectedPlaylist =
        playlist;

    document
        .querySelectorAll(".playlist")
        .forEach(card =>
            card.classList.toggle(
                "selected",
                card.dataset.id ===
                    playlist.id
            )
        );

    const selectedText =
        document.getElementById(
            "selectedText"
        );

    if (selectedText) {
        selectedText.textContent =
            `Playlist: ${playlist.name}`;
    }

    updateStartButton?.();
}


// =====================================================
// CANCIONES
// =====================================================

async function getPlaylistTracks(
    playlistId
) {

    if (!playlistId) {
        throw new Error(
            "Falta el ID de la playlist."
        );
    }

    const response =
        await fetch(
            `/api/playlists/${encodeURIComponent(
                playlistId
            )}/tracks`
        );

    if (!response.ok) {

        console.error(
            "Error obteniendo canciones:",
            await response.text()
        );

        throw new Error(
            "No se pudieron obtener las canciones."
        );
    }

    const data =
        await response.json();

    if (!Array.isArray(data)) {
        throw new Error(
            "La respuesta de canciones no es válida."
        );
    }

    return data
        .filter(track =>
            track?.uri &&
            track?.name
        )
        .map(track => ({
            id: track.id,
            uri: track.uri,
            name: track.name,
            artist: track.artist || "",
            album: track.album || "",
            year: Number.isInteger(
                Number(track.year)
            )
                ? Number(track.year)
                : null,
            cover: track.cover || null
        }));
}


// =====================================================
// PLAYLIST ACTUAL
// =====================================================

function getSelectedPlaylist() {
    return selectedPlaylist;
}


async function getSelectedPlaylistTracks() {

    if (!selectedPlaylist) {
        throw new Error(
            "No hay ninguna playlist seleccionada."
        );
    }

    return getPlaylistTracks(
        selectedPlaylist.id
    );
}