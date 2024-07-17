let level = null
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
        if (ball.isMoving() || !ball.active) {
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
        || touchInfo.lastDownPos.distance(touchInfo.lastUpPos) < 30
    ) {
        return
    }

    const strength = Math.min(touchInfo.lastDownPos.distance(touchInfo.lastUpPos) * 0.3 / gameState.combinedScalingFactor, 70)
    const touchUpBoardPos = gameState.screenPosToBoardPos(touchInfo.lastUpPos)
    const direction = touchInfo.focusedBall.pos.sub(touchUpBoardPos).normalized.scale(-strength)

    // do an optimistic change
    if (gameState.mode == gameMode.Tournament) {
        gameState.onTournamentKick(touchInfo.focusedBall)
    }

    touchInfo.focusedBall.kick(direction)

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

if (!hasUnlockedLevel(levelId)) {
    goBackToLevelChoice()
}

levelCanvas.addEventListener("touchstart", onEventDown)
levelCanvas.addEventListener("touchmove", onEventMove)
levelCanvas.addEventListener("touchend", onEventUp)

levelCanvas.addEventListener("mousedown", onEventDown)
levelCanvas.addEventListener("mousemove", onEventMove)
levelCanvas.addEventListener("mouseup", onEventUp)

let hasGoneToNextLevel = false
function goToNextLevel() {
    if (hasGoneToNextLevel) {
        return
    }

    hasGoneToNextLevel = true
    const nextLevelId = parseInt(levelId) + 1
    if (levels.find(l => l.id == nextLevelId) && hasUnlockedLevel(nextLevelId)) {
        loadLevel(nextLevelId)
    } else {
        goBackToLevelChoice()
    }
}

function resizeCanvas() {
    if (gameState) {
        canvasPadding = Math.round(5 / gameState.combinedScalingFactor)
    }

    const displaySize = new Vector2d(100 * displayAspectRatio, displayAspectRatio)

    const maxWidth = window.innerWidth
    const maxHeight = window.innerHeight
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

function gameLoop() {
    gameState.update()
    Renderer.render(gameState, levelContext, touchInfo)

    if (ball && ball.inHole && ball.radius == 0) {
        completeLevel(level.id)
        goToNextLevel()
    }

    window.requestAnimationFrame(gameLoop)
}

function loadLevel(id) {
    level = levels.find(l => l.id == id)
    levelId = id
    levelIdOutput.textContent = levelId.toString().padStart(2, "0")

    if (!level) {
        goBackToLevelChoice()
    }
    
    gameState = GameState.fromObject(level.gameState)
    gameState.getReferenceCanvas = () => levelCanvas
    gameState.board.physicsTime = Date.now()

    ball = gameState.board.spawnBall({spriteUrl: Sprite.BallWhite})

    const url = new URL(window.location.href)
    url.searchParams.set("id", levelId)
    window.history.pushState(null, "", url.toString())

    hasGoneToNextLevel = false
}

async function main() {
    resizeCanvas()
    drawLoading()

    await Renderer.load()
    window.AudioPlayer = AudioPlayer
    await window.AudioPlayer.load()

    await loadLevels("../mono/default_levels.json")
    loadLevel(levelId)

    isLoading = false
    resizeCanvas()
    gameLoop()

    addEventListener("resize", resizeCanvas)
}

main()