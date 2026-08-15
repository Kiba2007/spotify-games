// =====================================================
// BINGO MUSICAL
// =====================================================

let bingoTracks = [];
let bingoPlaylistName = "";


// =====================================================
// INICIAR BINGO
// =====================================================

function startBingo(tracks, playlistName) {

    console.log("🎱 Iniciando Bingo...");
    console.log("🎵 Canciones recibidas:", tracks.length);

    bingoTracks = Array.isArray(tracks)
        ? tracks
        : [];

    bingoPlaylistName = playlistName || "Bingo Musical";

    const title = document.getElementById(
        "bingoPlaylistName"
    );

    if (title) {
        title.textContent = bingoPlaylistName;
    }

    renderBingoSetup();
}


// =====================================================
// CONFIGURACIÓN
// =====================================================

function renderBingoSetup() {

    const content =
        document.getElementById("bingoContent");

    if (!content) {

        console.error(
            "❌ No existe #bingoContent"
        );

        return;
    }

    content.innerHTML = `

        <section class="bingoSetup">

            <div class="bingoSetupInfo">

                <span class="eyebrow">
                    BINGO MUSICAL
                </span>

                <h2>
                    Configura tu bingo
                </h2>

                <p>
                    Genera tus cartones musicales
                    a partir de las canciones de tu playlist.
                </p>

            </div>


            <div class="bingoControls">

                <div class="bingoControl">

                    <label for="bingoName">
                        Nombre del bingo
                    </label>

                    <input
                        id="bingoName"
                        type="text"
                        placeholder="Ej. Bingo de verano"
                        value="${escapeHtml(bingoPlaylistName)}"
                    >

                </div>


                <div class="bingoControl">

                    <label for="bingoCardCount">
                        Número de cartones
                    </label>

                    <select id="bingoCardCount">

                        ${Array.from(
                            { length: 20 },
                            (_, i) => {

                                const number = i + 1;

                                return `
                                    <option value="${number}">
                                        ${number}
                                        ${number === 1
                                            ? "cartón"
                                            : "cartones"}
                                    </option>
                                `;
                            }
                        ).join("")}

                    </select>

                </div>


                <button
                    id="generateBingoButton"
                    class="primaryButton"
                    type="button"
                >
                    Generar cartones
                </button>

            </div>

        </section>


        <section
            id="bingoCards"
            class="bingoCardsSection"
        ></section>

    `;


    const button =
        document.getElementById(
            "generateBingoButton"
        );


    if (!button) {

        console.error(
            "❌ No existe #generateBingoButton"
        );

        return;
    }


    button.addEventListener(
        "click",
        generateBingoCards
    );


    console.log(
        "✅ Configuración del Bingo cargada"
    );
}


// =====================================================
// GENERAR CARTONES
// =====================================================

function generateBingoCards() {

    console.log("🎱 Generando cartones...");

    const countElement =
        document.getElementById(
            "bingoCardCount"
        );

    const nameElement =
        document.getElementById(
            "bingoName"
        );


    if (!countElement) {

        console.error(
            "❌ No existe #bingoCardCount"
        );

        return;
    }


    const count =
        parseInt(
            countElement.value,
            10
        );


    const bingoName =
        nameElement?.value.trim() ||
        bingoPlaylistName ||
        "Bingo Musical";


    const container =
        document.getElementById(
            "bingoCards"
        );


    if (!container) {

        console.error(
            "❌ No existe #bingoCards"
        );

        return;
    }


    if (!bingoTracks.length) {

        alert(
            "No hay canciones disponibles para crear el Bingo."
        );

        return;
    }


    // Guardamos el nombre
    bingoPlaylistName = bingoName;


    container.innerHTML = "";


    // =================================================
    // GENERAR CARTONES
    // =================================================

    for (
        let i = 1;
        i <= count;
        i++
    ) {

        /*
         * Cada cartón utiliza 15 canciones.
         *
         * Se mezclan todas las canciones disponibles
         * antes de seleccionar las 15.
         */

        const cardTracks =
            shuffle(
                [...bingoTracks]
            ).slice(
                0,
                15
            );


        const card =
            createBingoCard(
                cardTracks,
                i,
                bingoName
            );


        container.appendChild(card);
    }


    // =================================================
    // ACCIONES
    // =================================================

    const actions =
        document.createElement(
            "div"
        );

    actions.className =
        "bingoActions";


    actions.innerHTML = `

        <button
            id="regenerateBingoButton"
            class="secondaryButton"
            type="button"
        >
            🔄 Regenerar
        </button>


        <button
            id="printBingoButton"
            class="primaryButton"
            type="button"
        >
            🖨 Imprimir / Guardar PDF
        </button>

    `;


    container.appendChild(
        actions
    );


    document
        .getElementById(
            "regenerateBingoButton"
        )
        ?.addEventListener(
            "click",
            generateBingoCards
        );


    document
        .getElementById(
            "printBingoButton"
        )
        ?.addEventListener(
            "click",
            () => {

                window.print();

            }
        );


    // =================================================
    // SCROLL HACIA LOS CARTONES
    // =================================================

    container.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });


    console.log(
        `✅ ${count} cartones generados`
    );
}


// =====================================================
// CREAR CARTÓN
// =====================================================

function createBingoCard(
    tracks,
    number,
    bingoName
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "bingoCard";


    // =================================================
    // CABECERA
    // =================================================

    const header =
        document.createElement(
            "div"
        );


    header.className =
        "bingoCardHeader";


    header.innerHTML = `

        <div>

            <span class="bingoCardEyebrow">
                BINGO MUSICAL
            </span>

            <h3>
                ${escapeHtml(bingoName)}
            </h3>

        </div>


        <strong>
            ${String(number).padStart(2, "0")}
        </strong>

    `;


    // =================================================
    // GRID
    // =================================================

    const grid =
        document.createElement(
            "div"
        );


    grid.className =
        "bingoGrid";


    const rows =
        createBingoRows();


    let trackIndex = 0;


    for (
        let row = 0;
        row < 3;
        row++
    ) {

        for (
            let col = 0;
            col < 9;
            col++
        ) {

            const cell =
                document.createElement(
                    "div"
                );


            cell.className =
                "bingoCell";


            // Celda con canción
            if (rows[row][col]) {

                const track =
                    tracks[trackIndex++];


                if (track) {

                    cell.classList.add(
                        "filled"
                    );


                    const image =
                        document.createElement(
                            "img"
                        );


                    image.src =
                        track.cover || "";


                    image.alt =
                        "";


                    const name =
                        document.createElement(
                            "div"
                        );


                    name.className =
                        "bingoTrackName";


                    name.textContent =
                        track.name;


                    cell.appendChild(
                        image
                    );


                    cell.appendChild(
                        name
                    );
                }

            } else {

                cell.classList.add(
                    "empty"
                );

            }


            grid.appendChild(
                cell
            );
        }
    }


    // =================================================
    // PIE
    // =================================================

    const footer =
        document.createElement(
            "footer"
        );


    footer.className =
        "bingoCardFooter";


    footer.innerHTML = `

        <span>
            ${escapeHtml(bingoName)}
        </span>

        <span>
            Cartón ${String(number).padStart(2, "0")}
        </span>

    `;


    card.append(
        header,
        grid,
        footer
    );


    return card;
}


// =====================================================
// DISTRIBUCIÓN DE LAS 15 CANCIONES
// =====================================================

function createBingoRows() {

    const rows = [];


    for (
        let row = 0;
        row < 3;
        row++
    ) {

        const positions =
            shuffle(
                [...Array(9).keys()]
            ).slice(
                0,
                5
            );


        const filled =
            new Array(9)
                .fill(false);


        positions.forEach(
            position => {
                filled[position] = true;
            }
        );


        rows.push(
            filled
        );
    }


    return rows;
}


// =====================================================
// SHUFFLE
// =====================================================

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
// ESCAPAR HTML
// =====================================================

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