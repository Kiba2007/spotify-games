async function getSpotifyToken() {

    const response =
        await fetch("/auth/token");

    if (!response.ok) {
        throw new Error(
            "No estás autenticado en Spotify."
        );
    }

    const data =
        await response.json();

    if (!data.access_token) {
        throw new Error(
            "Spotify no devolvió un Access Token."
        );
    }

    return data.access_token;
}


async function checkSpotifyLogin() {

    try {
        await getSpotifyToken();
        return true;

    } catch (error) {

        console.error(
            "Error comprobando Spotify:",
            error
        );

        return false;
    }
}