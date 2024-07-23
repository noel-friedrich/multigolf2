window.addEventListener("beforeunload", function (e) {
    e.preventDefault()
    return "You're in an active game of multigolf. Leaving this website will break the game!"
})

const logOutput = document.querySelector("#log-output")
const fullscreenCanvas = document.querySelector("#fullscreen-canvas")
const context = fullscreenCanvas.getContext("2d")
const statusTitle = document.querySelector("#status-title")
const fullscreenCheckbox = document.querySelector("#fullscreen-checkbox")

let requestFullscreenOnCanvasClick = true
if (new URLSearchParams(location.search).has("nofullscreen")) {
    requestFullscreenOnCanvasClick = false
}

const deviceTilt = {
    get steady() {
        // device is considered steady if it hasn't moved
        // significantly for at least a second
        return Date.now() - deviceTilt.lastSignificantMoveTime > 1000
    },
    get stableTilt() {
        return deviceTilt.previousSteadyTilt
    },
    lastSignificantMoveTime: Date.now(),
    tilt: new Vector2d(0, 0),
    previousSteadyTilt: new Vector2d(0, 0),
    hasChangedFlag: false
}

addEventListener("deviceorientation", event => {
    if (event.gamma == null || event.beta == null) {
        return
    }

    deviceTilt.tilt.x = event.beta
    if (deviceTilt.tilt.x > 90) {
        deviceTilt.tilt.x = deviceTilt.tilt.x - 180
    } else if (deviceTilt.tilt.x < -90) {
        deviceTilt.tilt.x = 180 + deviceTilt.tilt.x
    }
    deviceTilt.tilt.y = event.gamma

    // swap x and y and adjust scaling to map to interval [-1, 1] each
    // (rounded to the nearest hundreth)
    const temp = deviceTilt.tilt.x
    deviceTilt.tilt.x = deviceTilt.tilt.y
    deviceTilt.tilt.y = temp

    deviceTilt.tilt.x = Math.round(deviceTilt.tilt.x / 0.9) / 100
    deviceTilt.tilt.y = Math.round(deviceTilt.tilt.y / 0.9) / 100

    const epsilon = 0.05
    if (!deviceTilt.tilt.distance(deviceTilt.previousSteadyTilt) < epsilon) {
        deviceTilt.lastSignificantMoveTime = Date.now()
        deviceTilt.previousSteadyTilt = deviceTilt.tilt.copy()
        deviceTilt.hasChangedFlag = true
    }
}, true)

fullscreenCheckbox.checked = requestFullscreenOnCanvasClick
fullscreenCheckbox.addEventListener("click", () => {
    requestFullscreenOnCanvasClick = !requestFullscreenOnCanvasClick
    fullscreenCheckbox.checked = requestFullscreenOnCanvasClick
})

function logToUser(message) {
    if (logOutput.textContent.length > 0) {
        logOutput.textContent += "\n"
    }

    logOutput.textContent += message
}

addEventListener("error", (err) => {
    logToUser(`⚠️ ${err.message}`)
})

function fillPlaceholders(attr, value) {
    for (let element of document.querySelectorAll("[data-fill]")) {
        if (element.dataset.fill == attr) {
            element.textContent = value
        }
    }
}

let deviceIndex = null

function updateDeviceIndex(newIndex) {
    deviceIndex = newIndex
    fillPlaceholders("device-index", deviceIndex != null ? deviceIndex : "?")
    localStorage.setItem("multigolf-deviceIndex", deviceIndex)
}

const urlParams = new URLSearchParams(location.search)
if (!urlParams.has("p")) {
    location.href = "../index.html"
}

let rtc = null

const noSleep = new NoSleep()

let hostTimeOffset = 0
function getHostTime() {
    return Date.now() + hostTimeOffset
}

async function main() {
    logOutput.textContent = ""

    rtc?.die()
    rtc = new RtcClient({
        logFunction: logToUser,
        onDataMessage: (dataMessage) => {
            onDataMessage(dataMessage)
        },
        onDataClose: () => {
            statusTitle.textContent = Text.ConnectionFailed
            logToUser(Text.TryingAgainInSeconds(5))
            setTimeout(main, 1 * 2 * 3 * 4 * 5 * 6 * 7) // 7! ~ 5000
        },
        poolUid: urlParams.get("p"),
    })

    statusTitle.textContent = Text.ConnectingToHost
    
    if (localStorage.getItem("multigolf-poolUid") == rtc.poolUid) {
        if (localStorage.getItem("multigolf-deviceIndex") != null) {
            updateDeviceIndex(localStorage.getItem("multigolf-deviceIndex"))
        }
    } else {
        localStorage.setItem("multigolf-poolUid", rtc.poolUid)
    }

    await Renderer.load()
    document.querySelector("#loading-indicator").style.display = "none"

    try {
        await rtc.start(deviceIndex)
        statusTitle.textContent = Text.ConnectedToHost
        startGame()
    } catch (err) {
        logToUser(Text.CouldNotConnect)
        logToUser(`Error-Message: ${err.message}`)
        logToUser(Text.TryingAgainInSeconds(10))
        statusTitle.textContent = Text.ConnectionFailed
        return setTimeout(main, 10 * 1000)
    }
}

document.addEventListener("click", function enableNoSleep() {
    document.removeEventListener("click", enableNoSleep, false)
    noSleep.enable()
}, false)

fullscreenCanvas.addEventListener("click", () => {
    if (requestFullscreenOnCanvasClick
        && document.fullscreenElement != fullscreenCanvas
    ) {
        // man isn't the web such a fun place?
        if (fullscreenCanvas.requestFullscreen) {
            fullscreenCanvas.requestFullscreen()
        } else if (fullscreenCanvas.msRequestFullscreen) {
            fullscreenCanvas.msRequestFullscreen()
        } else if (fullscreenCanvas.mozRequestFullScreen) {
            fullscreenCanvas.mozRequestFullScreen()
        } else if (fullscreenCanvas.webkitRequestFullscreen) {
            fullscreenCanvas.webkitRequestFullscreen()
        }
    }
})

main()