const logOutput = document.querySelector("#log-output")
const qrImg = document.querySelector("#qr-img")
const playerListContainer = document.querySelector("#player-list-container")

const finishPlayersButton = document.querySelector("#finish-players-button")
const boardCanvas = document.querySelector("#board-canvas")
const boardContext = boardCanvas.getContext("2d")
const boardCanvasFieldset = document.querySelector("#board-canvas-fieldset")
const playerListFieldset = document.querySelector("#player-list-fieldset")

const layoutChoiceContainer = document.querySelector("#layout-choice-container")
const gameConfigContainer = document.querySelector("#game-config-container")

const keepLayoutButton = document.querySelector("#keep-layout-button")

const headerElement = document.querySelector("header")

function logToConnectionLog(message) {
    if (logOutput.textContent.length > 0) {
        logOutput.textContent += "\n"
    }

    logOutput.textContent += message
}

let rtc = null

function updatePlayerlist() {
    if (!rtc) {
        return
    }

    playerListFieldset.style.display = "grid"
    playerListContainer.innerHTML = ""
    if (rtc.connections.length == 0) {
        playerListContainer.textContent = Text.OnceYouConnectPlayers
    }

    for (let i = 0; i < rtc.connections.length; i++) {
        const playerContainer = document.createElement("div")
        playerContainer.classList.add("player-status-container")
        const circularIndicator = document.createElement("div")
        circularIndicator.classList.add("circle-indicator")
        const playerNameElement = document.createElement("div")
        playerNameElement.classList.add("player-name")

        playerContainer.appendChild(circularIndicator)
        playerContainer.appendChild(playerNameElement)

        const connection = rtc.connections[i]

        playerNameElement.textContent = Text.DeviceNum(connection.index)

        const connectionStatus = connection.getStatus()
        circularIndicator.classList.add(connectionStatus.color)
        playerContainer.title = connectionStatus.message ?? ""

        playerListContainer.appendChild(playerContainer)
    }
}

async function finishPlayers() {
    if (gameState.phase != gamePhase.Connecting) return

    if (rtc.connections.length == 0) {
        alert(Text.NoDevicesError)
        return
    } 

    updatePlayerlist()
    changeGamePhase(gamePhase.ConfigGame)
}

async function finishConfig() {
    if (gameState.phase != gamePhase.ConfigGame) return

    if (gameState.mode == gameMode.Tournament) {
        changeGamePhase(gamePhase.TournamentExplanation)
    } else if (gameState.mode == gameMode.Duell) {
        changeGamePhase(gamePhase.DuellExplanation)
    } else {
        startGame()
    }
}

let setUpdatePlayerListInterval = false
function startConnectionProcess() {
    if (gameState.phase >= gamePhase.Connecting) {
        return
    }

    if (!setUpdatePlayerListInterval) {
        setInterval(() => {
            updatePlayerlist()
            if (rtc && gameState.phase == gamePhase.Connecting) {
                rtc.removeLostConnections()
            }
        }, 1000)
        setUpdatePlayerListInterval = true
    }

    updatePlayerlist()
    changeGamePhase(gamePhase.Connecting)

    if (!rtc) {
        rtc = new RtcHostManager({
            logFunction: (message) => {
                logToConnectionLog(message)
            },
            onClientUrlAvailable: async (clientUrl) => {
                if (new URLSearchParams(location.search).has("debug")) {
                    console.log("QR CODE URL", clientUrl + "&nofullscreen")
                    console.log("QR CODE URL DEBUG", clientUrl.replace("https://multi.golf", "localhost:8000") + "&nofullscreen")
                }

                qrImg.innerHTML = "" // clear current qr code
                new QRCode(qrImg, clientUrl)
            },
            onDataMessage: (message, connection) => {
                onDataMessage(message, connection)
            },
            allowConnectionOverride: () => gameState.phase == gamePhase.Connecting
        })
        rtc.start()

        fetch("https://www.noel-friedrich.de/multigolf2/api/count_start.php")
    }
}