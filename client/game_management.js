let gameState = null
const touchInfo = {
    isDown: false,
    lastDownPos: null,
    lastUpPos: null,
    currPos: null,
    lastDownTime: null,
    lastUpTime: null,
    focusedBall: null
}

function clampToEdges(pos) {
    return pos.clampX([0, fullscreenCanvas.width], 100)
              .clampY([0, fullscreenCanvas.height], 100)
}

fullscreenCanvas.addEventListener("touchstart", event => {
    touchInfo.isDown = true
    touchInfo.currPos = Vector2d.fromTouchEvent(event, fullscreenCanvas)
    touchInfo.lastDownPos = touchInfo.currPos.copy()
    touchInfo.lastDownTime = Date.now()

    if (gameState.phase == gamePhase.Construction) {
        touchInfo.currPos = clampToEdges(touchInfo.currPos)
        touchInfo.lastDownPos = touchInfo.currPos.copy()
    } else if (gamePhase.isPlaying(gameState.phase)) {
        onBallDown(touchInfo)
    }
})

fullscreenCanvas.addEventListener("touchmove", event => {
    touchInfo.currPos = Vector2d.fromTouchEvent(event, fullscreenCanvas)

    if (gameState.phase == gamePhase.Construction) {
        touchInfo.currPos = clampToEdges(touchInfo.currPos)
    }
})

fullscreenCanvas.addEventListener("touchend", event => {
    touchInfo.isDown = false
    touchInfo.currPos = null
    touchInfo.lastUpPos = Vector2d.fromTouchEvent(event, fullscreenCanvas)
    touchInfo.lastUpTime = Date.now()

    if (gameState.phase == gamePhase.Construction) {
        touchInfo.lastUpPos = clampToEdges(touchInfo.lastUpPos)
        onConstructionTouchEvent(touchInfo)
    } else if (gameState.phase == gamePhase.PlaceStart) {
        onPlaceStartTouchEvent(touchInfo)
    } else if (gameState.phase == gamePhase.PlaceEnd
        || gameState.phase == gamePhase.PlaceDuellEnds) {
        onPlaceEndTouchEvent(touchInfo)
    } else if (gamePhase.isPlaying(gameState.phase)) {
        onKickBallTouchEvent(touchInfo)
    }

    touchInfo.focusedBall = null
})

function renderLoop() {
    Renderer.render(gameState, context, touchInfo)
    gameState.updatePhysics()

    window.requestAnimationFrame(renderLoop)
}

async function startGame() {
    gameState = new GameState(gamePhase.Connecting, gameMode.None, new Board())
    renderLoop()
}

async function onKickBallTouchEvent(touchInfo) {
    if (!touchInfo.focusedBall || !touchInfo.lastDownPos || !touchInfo.lastUpPos) {
        return
    }

    if (touchInfo.lastDownPos.distance(touchInfo.lastUpPos) < 30) {
        return
    }

    const strength = Math.min(touchInfo.lastDownPos.distance(touchInfo.lastUpPos) * 0.3 * gameState.scalingFactor, 70)
    const touchUpBoardPos = gameState.screenPosToBoardPos(touchInfo.lastUpPos)
    const direction = touchInfo.focusedBall.pos.sub(touchUpBoardPos).normalized.scale(-strength)
    rtc.sendMessage(new DataMessage(dataMessageType.KICK_BALL,
        {direction: direction.toObject(), ballUid: touchInfo.focusedBall.uid}))
}

async function onBallDown(touchInfo) {
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

async function onPlaceStartTouchEvent(touchInfo) {
    if (!touchInfo.lastUpPos || !touchInfo.lastDownPos
        || touchInfo.lastDownPos.distance(touchInfo.lastUpPos) > 10) {
        return
    }

    rtc.sendMessage(new DataMessage(dataMessageType.PLACE_START,
        {pos: gameState.screenPosToBoardPos(touchInfo.lastDownPos)}))
}

async function onPlaceEndTouchEvent(touchInfo) {
    if (!touchInfo.lastUpPos || !touchInfo.lastDownPos
        || touchInfo.lastDownPos.distance(touchInfo.lastUpPos) > 10) {
        return
    }

    rtc.sendMessage(new DataMessage(dataMessageType.PLACE_END,
        {pos: gameState.screenPosToBoardPos(touchInfo.lastDownPos)}))
}

async function onConstructionTouchEvent(touchInfo) {
    const lieOnSameEdge = (p1, p2) => {
        return (
               (p1.x == 0 && p1.x == p2.x)
            || (p1.y == 0 && p1.y == p2.y)
            || (p1.x == fullscreenCanvas.width && p1.x == p2.x)
            || (p1.y == fullscreenCanvas.height && p1.y == p2.y)
        )
    }

    if (!touchInfo.lastUpPos || !touchInfo.lastDownPos
        || touchInfo.lastDownPos.distance(touchInfo.lastUpPos) < 100
        || !lieOnSameEdge(touchInfo.lastDownPos, touchInfo.lastUpPos)) {
        return
    }

    const constructionLine = new ConstructionLine(
        touchInfo.lastDownPos, touchInfo.lastUpPos)
    const phoneCoords = PhoneCoordinates.fromWidthHeight(
        fullscreenCanvas.width, fullscreenCanvas.height)

    rtc.sendMessage(new DataMessage(dataMessageType.CONSTRUCTION_LINE,
        {line: constructionLine.toObject(), phone: phoneCoords.toObject()}))
}

async function onDataMessage(dataMessage) {
    // ignore pings
    if (dataMessage.type == dataMessageType.PING) {
        return
    }

    if (dataMessage.type == dataMessageType.GAMESTATE) {
        gameState = GameState.fromObject(dataMessage.data)

    } else if (dataMessage.type == dataMessageType.REQUEST_DIMENSIONS) {
        const course = new Course([PhoneCoordinates.fromWidthHeight(window.innerWidth, window.innerHeight)])
        rtc.sendMessage(new DataMessage(dataMessageType.SEND_DIMENSIONS, {course: course.toObject()}))
    }
}