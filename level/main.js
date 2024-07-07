let level = null
let gameState = null
let ball = null

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

function getCurrDirection() {
    return (Date.now() % directionLoopLengthMs) / directionLoopLengthMs * Math.PI * 2
}

function shoot() {
    if (!gameState) return
    if (!ball || ball.inHole || ball.isMoving()) return

    const angle = getCurrDirection()
    ball.kick(Vector2d.fromAngle(angle).scale(28))
}

function gameLoop() {
    gameState.update()

    if (ball && !ball.inHole && !ball.isMoving()) {
        const touchScreenPos = ball.pos.add(Vector2d.fromAngle(getCurrDirection())
            .scale(Math.min(levelCanvas.width, levelCanvas.height) * 0.2))
        Renderer.render(gameState, levelContext, {
            isDown: true, focusedBall: ball,
            currPos: gameState.boardPosToScreenPos(touchScreenPos)
        })
    } else {
        Renderer.render(gameState, levelContext, {})
    }

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
    addEventListener("keydown", event => {
        if ([" ", "Enter"].includes(event.key)) shoot()
    })
    levelCanvas.addEventListener("click", shoot)
}

main()