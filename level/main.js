let level = null
let levelConfig = null
let levels = []
let gameState = null
let ball = null

const touchInfo = {
    isDown: false,
    lastDownPos: null,
    lastUpPos: null,
    currPos: null,
    lastDownTime: null,
    lastUpTime: null,
    focusedBall: null,
    focusedObject: null,
    draggingObject: false
}

function onEventDown(event) {
    touchInfo.isDown = true
    touchInfo.currPos = Vector2d.fromTouchEvent(event, levelCanvas)
    touchInfo.lastDownPos = touchInfo.currPos.copy()
    touchInfo.lastDownTime = Date.now()

    if (!gameState) return

    const boardPos = gameState.screenPosToBoardPos(touchInfo.currPos)

    let smallestDistance = Infinity
    let closestBall = null

    for (const ball of gameState.board.balls) {
        if (ball.isInMovement() || !ball.active) {
            continue
        }

        const distance = ball.pos.distance(boardPos)
        if (distance < smallestDistance) {
            smallestDistance = distance
            closestBall = ball
        }
    }

    if (smallestDistance < 100) {
        touchInfo.focusedBall = closestBall
    }
}

function onEventMove(event) {
    touchInfo.currPos = Vector2d.fromTouchEvent(event, levelCanvas)
}

function onEventUp(event) {
    touchInfo.isDown = false
    touchInfo.currPos = null
    touchInfo.lastUpPos = Vector2d.fromTouchEvent(event, levelCanvas)
    touchInfo.lastUpTime = Date.now()

    if (!touchInfo.focusedBall || !touchInfo.lastDownPos || !touchInfo.lastUpPos || !gameState
        || touchInfo.lastDownPos.distance(touchInfo.lastUpPos) < 10
    ) {
        return
    }

    const lastUpScreenPos = gameState.screenPosToBoardPos(touchInfo.lastUpPos)
    const strength = Math.min(touchInfo.focusedBall.pos.distance(lastUpScreenPos) * 0.3 / gameState.combinedScalingFactor, 70)
    const touchUpBoardPos = gameState.screenPosToBoardPos(touchInfo.lastUpPos)
    const direction = touchInfo.focusedBall.pos.sub(touchUpBoardPos).normalized.scale(-strength)

    touchInfo.focusedBall.kick(direction)
    challengeKicks--

    localStorage.setItem("challenge-kicks", challengeKicks)

    touchInfo.focusedBall = null
    touchInfo.draggingObject = false
}

const canvasAspectRatio = 9 / 16
const displayAspectRatio = 9 / 17
const directionLoopLengthMs = 2000

const levelCanvas = document.querySelector("#level-canvas")
const levelBody = document.querySelector(".level-body")
const levelHeader = document.querySelector(".level-header")
const levelContainer = document.querySelector(".level-container")
const levelContext = levelCanvas.getContext("2d")
const logoImg = document.querySelector("#logo-img")
const levelIdOutput = document.querySelector("#level-id-output")

if (!hasUnlockedLevel(packId, levelId) && levelId != "editor" && !challengeMode) {
    goBackToLevelChoice()
}

document.body.addEventListener("touchstart", onEventDown)
document.body.addEventListener("touchmove", onEventMove)
document.body.addEventListener("touchend", onEventUp)

document.body.addEventListener("mousedown", onEventDown)
document.body.addEventListener("mousemove", onEventMove)
document.body.addEventListener("mouseup", onEventUp)

let hasGoneToNextLevel = false
async function goToNextLevel() {
    if (hasGoneToNextLevel) {
        return
    }

    if (levelId == "editor") {
        return loadLevel("editor")
    }

    hasGoneToNextLevel = true
    const nextLevelId = parseInt(levelId) + 1
    const nextLevelExists = levels.find(l => l.id == nextLevelId)

    if (!nextLevelExists && challengeKicks >= 0 && challengeMode) {
        localStorage.removeItem("challenge-kicks")
        setHighscore(packId, challengeKicks)
        await customAlert(Text.YouWonLong(challengeKicks), {header: Text.YouWon})
    }

    if (nextLevelExists && hasUnlockedLevel(packId, nextLevelId)) {
        loadLevel(nextLevelId)
    } else {
        return goBackToLevelChoice()
    }
    
    challengeKicks++
    localStorage.setItem("challenge-kicks", challengeKicks)
}

function resizeCanvas() {
    if (gameState) {
        canvasPadding = Math.round(5 / gameState.combinedScalingFactor)
    }

    const displaySize = new Vector2d(100 * displayAspectRatio, displayAspectRatio)

    const maxWidth = window.innerWidth - 20
    const maxHeight = window.innerHeight - 20
    const realSizeRatio = maxWidth / maxHeight

    if (realSizeRatio < displayAspectRatio) {
        displaySize.x = maxWidth
        displaySize.y = maxWidth / displayAspectRatio
    } else {
        displaySize.y = maxHeight
        displaySize.x = maxHeight * displayAspectRatio
    }

    const canvasBodyHeight = displayAspectRatio / canvasAspectRatio * displaySize.y
    const canvasHeaderHeight = displaySize.y - canvasBodyHeight

    levelContainer.style.width = `${displaySize.x}px`
    levelContainer.style.height = `${displaySize.y}px`
    levelContainer.style.gridTemplateRows = `${canvasHeaderHeight}px ${canvasBodyHeight}px`

    levelCanvas.style.width = `${displaySize.x}px`
    levelCanvas.style.height = `${canvasBodyHeight}px`

    levelHeader.style.width = `${displaySize.x}px`
    levelHeader.style.height = `${canvasHeaderHeight}px`
    levelHeader.style.setProperty("--height", `${canvasHeaderHeight}px`)
}

let isLoading = true
const startTimestamp = Date.now()
function drawLoading() {
    if (!logoImg.complete) {
        return
    }

    const t = ((Date.now() - startTimestamp) % 1000) / 1000
    const logoSize = Math.min(levelCanvas.width, levelCanvas.height) * 0.5
    levelCanvas.width = levelCanvas.clientWidth
    levelCanvas.height = levelCanvas.clientHeight

    levelContext.save()
    levelContext.translate(levelCanvas.width / 2, levelCanvas.height / 2)
    levelContext.rotate(t * Math.PI * 2)
    levelContext.drawImage(logoImg, -logoSize / 2, -logoSize / 2, logoSize, logoSize)
    levelContext.restore()
}

setInterval(() => {
    if (isLoading) {
        drawLoading()
    }
})

async function gameLoop() {
    gameState.update()

    Renderer.render(gameState, levelContext, touchInfo,
        challengeMode ? {challengeBalls: challengeKicks} : {}
    )

    if (ball && ball.inHole && ball.radius == 0) {
        unlockLevel(packId, level.id + 1)
        goToNextLevel()
    }

    if (challengeMode && challengeKicks <= 0 && !ball.isInMovement() && !ball.inHole) {
        localStorage.removeItem("challenge-kicks")
        if (await customConfirm(Text.WantToTryAgain, {header: Text.YouLost})) {
            location.reload()
        } else {
            goBackToLevelChoice()
        }
    }

    window.requestAnimationFrame(gameLoop)
}

function loadLevel(id) {
    if (id == "editor") {
        try {
            levelId = "editor"
            const str = localStorage.getItem("level-maker-temp")
            level = {
                id: 0,
                difficulty: "easy",
                gameState: JSON.parse(str)
            }
            levelIdOutput.textContent = "??"
        } catch (e) {
            goBackToLevelChoice()
        }
    } else { 
        level = levels.find(l => l.id == id)
        levelId = id
        levelIdOutput.textContent = levelId.toString().padStart(2, "0")
    }

    if (!level) {
        goBackToLevelChoice()
    }
    
    gameState = GameState.fromObject(level.gameState)
    gameState.phase = gamePhase.PlayingSandbox
    gameState.getReferenceCanvas = () => levelCanvas
    gameState.board.physicsTime = Date.now()
    gameState.board.particlesEnabled = true

    ball = gameState.board.spawnBall({spriteUrl: "random"})

    const url = new URL(window.location.href)
    url.searchParams.set("id", levelId)
    window.history.pushState(null, "", url.toString())

    if (challengeMode) {
        localStorage.setItem("challenge-level", levelId)
    }

    hasGoneToNextLevel = false
}

async function downloadPack(url) {
    const result = await fetch(url)
    const data = await result.json()
    levels.push(...data.levels)
    levelConfig = data.config
}

async function main() {
    resizeCanvas()
    drawLoading()

    await Renderer.load()

    window.AudioPlayer = AudioPlayer
    await window.AudioPlayer.load()

    if (challengeMode) {
        let localKicks = localStorage.getItem("challenge-kicks")
        let localLevel = localStorage.getItem("challenge-level")

        if (localKicks === null || localLevel === null || localKicks < 1) {
            localKicks = 10
            localLevel = 1
        }

        levelId = localLevel
        challengeKicks = localKicks
    }

    if (levelId != "editor") {
        await downloadPack(`../mono/level-data/packs/${packId}.json`)
    }

    loadLevel(levelId)

    isLoading = false
    resizeCanvas()
    gameLoop()

    addEventListener("resize", resizeCanvas)
}

main()