// =====================================================
// AUTH - SPOTIFY
// =====================================================

async function checkSpotifyLogin() {

    try {

        const response = await fetch("/auth/token");

        if (!response.ok) {

            console.log("🔴 No hay sesión de Spotify.");

            return false;
        }

        const data = await response.json();

        if (!data.access_token) {

            console.log("🔴 No se recibió Access Token.");

            return false;
        }

        console.log("🟢 Sesión de Spotify activa.");

        return true;

    } catch (error) {

        console.error(
            "Error comprobando sesión de Spotify:",
            error
        );

        return false;
    }
}


// =====================================================
// OBTENER ACCESS TOKEN
// =====================================================

async function getSpotifyToken() {

    const response = await fetch("/auth/token");

    if (!response.ok) {

        throw new Error(
            "No estás autenticado en Spotify."
        );
    }

    const data = await response.json();

    if (!data.access_token) {

        throw new Error(
            "Spotify no devolvió un Access Token."
        );
    }

    return data.access_token;
}