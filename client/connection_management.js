window.addEventListener("beforeunload", function (e) {
    e.preventDefault()
    return "You're in an active game of multigolf. Leaving this website will break the game!"
})

const logOutput = document.querySelector("#log-output")
const fullscreenCanvas = document.querySelector("#fullscreen-canvas")
const context = fullscreenCanvas.getContext("2d")
const statusTitle = document.querySelector("#status-title")

function logToUser(message) {
    if (logOutput.textContent.length > 0) {
        logOutput.textContent += "\n"
    }

    logOutput.textContent += message
}

addEventListener("error", (err) => {
    logToUser(`⚠️ ${err.message}`)
})

const rtc = new RtcClient({
    logFunction: logToUser,
    onDataMessage: (event) => {
        onDataMessage(DataMessage.fromString(event.data))
    },
})

const urlParams = new URLSearchParams(location.search)
const noSleep = new NoSleep()

async function main() {
    await Renderer.load()
    document.querySelector("#loading-indicator").style.display = "none"

    if (!urlParams.has("uid")) {
        location.href = "../index.html"
        return
    }

    try {
        await rtc.start(urlParams.get("uid"))
        statusTitle.textContent = "Connected to Host."

        rtc.sendMessage(DataMessage.Ping())
        setInterval(() => {
            if (!rtc.dataChannelOpen) return
            rtc.sendMessage(DataMessage.Ping())
        }, RtcBase.pingPeriod)

        startGame()
    } catch (err) {
        logToUser("❌ Could not connect to Host.")
        logToUser(`Error-Message: ${err.message}`)
        statusTitle.textContent = "Connection failed."
        throw err
    }

    if (!new URLSearchParams(location.search).has("nofullscreen"))
    fullscreenCanvas.onclick = () => {

        if (document.fullscreenElement != fullscreenCanvas) {
            fullscreenCanvas.requestFullscreen()
        }
    }

    document.addEventListener("click", function enableNoSleep() {
        document.removeEventListener("click", enableNoSleep, false)
        noSleep.enable()
    }, false)
}

main()