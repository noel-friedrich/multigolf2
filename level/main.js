let level = null
let gameState = null
let ball = null

const levelCanvas = document.querySelector("#level-canvas")
const levelContext = levelCanvas.getContext("2d")
const displayAspectRatio = 9 / 16
const logoImg = document.querySelector("#logo-img")

const directionLoopLengthMs = 2000

function resizeCanvas() {
    let canvasPadding = 5

    if (gameState) {
        canvasPadding = Math.round(5 / gameState.combinedScalingFactor)
    }

    levelCanvas.style.outline = `${canvasPadding}px solid black`

    const displaySize = new Vector2d(100 * displayAspectRatio, displayAspectRatio)

    const maxWidth = window.innerWidth - canvasPadding * 2
    const maxHeight = window.innerHeight - canvasPadding * 2
    const realSizeRatio = maxWidth / maxHeight

    if (realSizeRatio < displayAspectRatio) {
        displaySize.x = maxWidth
        displaySize.y = maxWidth / displayAspectRatio
    } else {
        displaySize.y = maxHeight
        displaySize.x = maxHeight * displayAspectRatio
    }

    levelCanvas.style.width = `${displaySize.x}px`
    levelCanvas.style.height = `${displaySize.y}px`
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
        goBackToLevelChoice()
    }

    window.requestAnimationFrame(gameLoop)
}

async function main() {
    resizeCanvas()
    drawLoading()

    await Renderer.load()
    window.AudioPlayer = AudioPlayer
    await window.AudioPlayer.load()

    await loadLevels("../mono/default_levels.json")
    level = levels.find(l => l.id == levelId)
    if (!level) {
        goBackToLevelChoice()
    }

    gameState = GameState.fromObject(level.gameState)
    gameState.getReferenceCanvas = () => levelCanvas
    gameState.board.physicsTime = Date.now()

    isLoading = false
    resizeCanvas()
    gameLoop()

    ball = gameState.board.spawnBall({spriteUrl: Sprite.BallWhite})

    addEventListener("resize", resizeCanvas)
    addEventListener("keydown", event => {
        if ([" ", "Enter"].includes(event.key)) shoot()
    })
    levelCanvas.addEventListener("click", shoot)
}

main()