window.addEventListener("beforeunload", function (e) {
    e.preventDefault()
    return "You're in an active game of multigolf. Leaving this website will break the game!"
})

const logOutput = document.querySelector("#log-output")
const qrImg = document.querySelector("#qr-img")
const playerListContainer = document.querySelector("#player-list-container")

const addPlayerButton = document.querySelector("#add-player-button")
const abortPlayerButton = document.querySelector("#abort-player-button")
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

const rtcConnections = []

function updatePlayerlist() {
    playerListFieldset.style.display = "grid"
    playerListContainer.innerHTML = ""
    if (rtcConnections.length == 0) {
        playerListContainer.textContent = ("No players added yet. " 
            + "To add a new player, click the button below. A QR code will "
            + "be generated to be scanned by the player and that player only.")
    }

    for (let i = 0; i < rtcConnections.length; i++) {
        rtcConnections[i].index = i + 1 // 0 is reserved for the host

        const playerContainer = document.createElement("div")
        playerContainer.classList.add("player-status-container")
        const circularIndicator = document.createElement("div")
        circularIndicator.classList.add("circle-indicator")
        const playerNameElement = document.createElement("div")
        playerNameElement.classList.add("player-name")

        playerContainer.appendChild(circularIndicator)
        playerContainer.appendChild(playerNameElement)

        playerNameElement.textContent = `Device #${rtcConnections[i].index}`

        const connectionStatus = rtcConnections[i].getStatus()
        circularIndicator.classList.add(connectionStatus.color)
        playerContainer.title = connectionStatus.message ?? ""

        if (connectionStatus.color == "red") {
            const reconnectButton = document.createElement("button")
            reconnectButton.classList.add("reconnect")
            reconnectButton.textContent = "Reconnect"

            reconnectButton.onclick = () => {
                if (currAddingPlayerUid) {
                    alert("Cannot reconnect while other Player is connecting.")
                    return
                }
                addPlayer(i)
            }

            playerContainer.appendChild(reconnectButton)
            playerContainer.style.gridTemplateColumns = "1rem 1fr 1fr"
        }

        playerListContainer.appendChild(playerContainer)
    }
}

let abortPlayerFlag = false
let currAddingPlayerUid = null
let currAddingRtc = null
let removedPlayerUids = new Set()

async function abortPlayer() {
    if (abortPlayerFlag) return

    abortPlayerFlag = true
    if (currAddingRtc.signalingUid) {
        removedPlayerUids.add(currAddingRtc.signalingUid)
    }
    
    removedPlayerUids.add(currAddingPlayerUid)
}

async function finishPlayers() {
    if (gameState.phase != gamePhase.Connecting || currAddingPlayerUid) return

    if (confirm("Do you really want to start the game? You won't be able to add any more players.")) {
        addPlayerButton.style.display = "none"
        finishPlayersButton.style.display = "none"
        abortPlayerButton.style.display = "none"

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

async function addPlayer(playerIndex) {
    if (currAddingPlayerUid) {
        return
    }

    updateHtmlSection(gamePhase.Connecting)
    abortPlayerFlag = false
    addPlayerButton.style.display = "none"
    logOutput.style.display = "block"
    abortPlayerButton.style.display = "block"
    finishPlayersButton.style.display = "none"

    let scopedUid = Math.random() + 1
    currAddingPlayerUid = scopedUid

    const rtc = new RtcHost({
        index: rtcConnections.length + 1,
        logFunction: (message) => {
            if (removedPlayerUids.has(rtc.signalingUid) || removedPlayerUids.has(scopedUid)) return
            logToConnectionLog(`[${rtc.index}] ${message}`)
        },
        onClientUrlAvailable: (clientUrl) => {
            if (removedPlayerUids.has(rtc.signalingUid) || removedPlayerUids.has(scopedUid)) return
            console.log("QR CODE URL", clientUrl + "&nofullscreen")
            console.log("QR CODE URL DEBUG", clientUrl.replace("https://multi.golf", "localhost:8000") + "&nofullscreen")

            qrImg.innerHTML = "" // clear current qr code
            new QRCode(qrImg, clientUrl)
            qrImg.style.display = "block"
        },
        onDataMessage: (message) => {
            if (removedPlayerUids.has(rtc.signalingUid) || removedPlayerUids.has(scopedUid)) return
            onDataMessage(message, rtc)
        }
    })

    currAddingRtc = rtc

    try {
        let err = null

        rtc.start().catch(rej => {
            err = rej
        })

        while (!rtc.dataChannelOpen) {
            await new Promise(resolve => setTimeout(resolve, 100))
            if (abortPlayerFlag) {
                throw new Error()
            }
            if (err) {
                throw err
            }
        }

        if (playerIndex === undefined) {
            rtcConnections.push(rtc)
        } else {
            removedPlayerUids.add(rtcConnections[playerIndex].signalingUid)
            rtcConnections[playerIndex] = rtc
        }

        rtc.startPinging()

        onRtcReconnect(rtc)
    } catch (err) {
        if (!abortPlayerFlag) {
            qrImg.style.display = "none"
            abortPlayerButton.style.display = "none"
            logToConnectionLog(`\n❌ Connection Failed. You may try again in 10 seconds.`)
            if (err.message) {
                logToConnectionLog(`Error-Message: ${err.message}`)
            }
            await new Promise(resolve => setTimeout(resolve, 10000))
        }
    }

    logOutput.textContent = ""
    logOutput.style.display = "none"
    qrImg.style.display = "none"
    abortPlayerButton.style.display = "none"
    currAddingPlayerUid = null
    currAddingRtc = null

    addPlayerButton.style.display = "block"
    finishPlayersButton.style.display = rtcConnections.length > 0 ? "block" : "none"

    updatePlayerlist()

    updateHtmlSection(gameState.phase)
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

    // we already have connections ready
    if (rtcConnections.length > 0) {
        startGame()
    }
}