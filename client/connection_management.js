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
            statusTitle.textContent = "Connection failed."
            logToUser("⌛ Trying again in 5 seconds.")
            setTimeout(main, 1 * 2 * 3 * 4 * 5 * 6 * 7) // 7! ~ 5000
        },
        poolUid: urlParams.get("p"),
    })

    statusTitle.textContent = "Connecting to Host..."
    
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
        statusTitle.textContent = "Connected to Host."
        startGame()
    } catch (err) {
        logToUser("❌ Could not connect to Host.")
        logToUser(`Error-Message: ${err.message}`)
        logToUser("⌛ Trying again in 10 seconds.")
        statusTitle.textContent = "Connection failed."
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
        && fullscreenCanvas.requestFullscreen
    ) {
        fullscreenCanvas.requestFullscreen()
    }
})

setInterval(() => {
    if (!rtc || rtc.getStatus().color == "green") {
        fullscreenCanvas.style.display = "block"
    } else {
        fullscreenCanvas.style.display = "none"
    }
}, 1000)

main()