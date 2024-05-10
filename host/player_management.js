window.addEventListener("beforeunload", function (e) {
    e.preventDefault()
    return "You're in an active game of multigolf. Leaving this website will break the game!"
})

const logOutput = document.querySelector("#log-output")
const qrImg = document.querySelector("#qr-img")
const playerListContainer = document.querySelector("#player-list-container")

const finishPlayersButton = document.querySelector("#finish-players-button")
const boardCanvas = document.querySelector("#board-canvas")
const boardContext = boardCanvas.getContext("2d")
const boardCanvasFieldset = document.querySelector("#board-canvas-fieldset")
const playerListFieldset = document.querySelector("#player-list-fieldset")

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
        playerListContainer.textContent = ("No players added yet. " 
            + "To add a new player, click the button below. A QR code will "
            + "be generated to be scanned by the player and that player only.")
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

        playerNameElement.textContent = `Device #${connection.index}`

        const connectionStatus = connection.getStatus()
        circularIndicator.classList.add(connectionStatus.color)
        playerContainer.title = connectionStatus.message ?? ""

        playerListContainer.appendChild(playerContainer)
    }
}

async function finishPlayers() {
    if (gameState.phase != gamePhase.Connecting) return

    if (rtc.connections.length == 0) {
        alert("You connected any devices yet. Connect one and try again!")
        return
    } 

    if (confirm("Do you really want to start the game? You won't be able to add any more players.")) {
        updatePlayerlist()

        if (gameState.mode == gameMode.Tournament) {
            changeGamePhase(gamePhase.TournamentExplanation)
        } else if (gameState.mode == gameMode.Duell) {
            changeGamePhase(gamePhase.DuellExplanation)
        } else {
            startGame()
        }
    }
}

let setUpdatePlayerListInterval = false
function startConnectionProcess() {
    if (gameState.phase >= gamePhase.Connecting) {
        return
    }

    if (!setUpdatePlayerListInterval) {
        setInterval(updatePlayerlist, 1000)
        setUpdatePlayerListInterval = true
    }

    updatePlayerlist()
    changeGamePhase(gamePhase.Connecting)

    if (rtc) {
        startGame()
    } else {
        rtc = new RtcHostManager({
            logFunction: (message) => {
                logToConnectionLog(message)
            },
            onClientUrlAvailable: (clientUrl) => {
                if (new URLSearchParams(location.search).has("debug")) {
                    console.log("QR CODE URL", clientUrl + "&nofullscreen")
                    console.log("QR CODE URL DEBUG", clientUrl.replace("https://multi.golf", "localhost:8000") + "&nofullscreen")
                }

                qrImg.innerHTML = "" // clear current qr code
                new QRCode(qrImg, clientUrl)
                qrImg.style.display = "block"
            },
            onDataMessage: (message, connection) => {
                onDataMessage(message, connection)
            }
        })
        rtc.start()
    }
}