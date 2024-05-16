window.addEventListener("beforeunload", function (e) {
    e.preventDefault()
    return "You're in an active game of multigolf. Leaving this website will break the game!"
})

const activeMain = document.querySelector("#active-main")
const failedMain = document.querySelector("#failed-main")

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
        // significantly for at least 3 seconds
        return Date.now() - deviceTilt.lastSignificantMoveTime > 3000
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

const rtc = new RtcClient({
    logFunction: logToUser,
    onDataMessage: (dataMessage) => {
        onDataMessage(dataMessage)
    },
    poolUid: urlParams.get("p")
})

const noSleep = new NoSleep()

let hostTimeOffset = 0
function getHostTime() {
    return Date.now() + hostTimeOffset
}

async function main() {
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
        statusTitle.textContent = "Connection failed."
        throw err
    }

    fullscreenCanvas.addEventListener("click", () => {
        if (!requestFullscreenOnCanvasClick) {
            return
        }

        if (document.fullscreenElement != fullscreenCanvas) {
            if (fullscreenCanvas.requestFullscreen) {
                fullscreenCanvas.requestFullscreen()
            }
        }
    })

    document.addEventListener("click", function enableNoSleep() {
        document.removeEventListener("click", enableNoSleep, false)
        noSleep.enable()
    }, false)
}

setInterval(() => {
    const status = rtc.getStatus()

    if (status.color == "red") {
        activeMain.style.display = "none"
        failedMain.style.display = "grid"
        fullscreenCanvas.remove()
    } else {
        activeMain.style.display = "grid"
        failedMain.style.display = "none"
    }
}, 1000)

main()