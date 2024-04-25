let gameState = null
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
    } else if (gameState.phase == gamePhase.Placing) {
        onObjectDown(touchInfo)
    }
})

fullscreenCanvas.addEventListener("touchmove", event => {
    touchInfo.currPos = Vector2d.fromTouchEvent(event, fullscreenCanvas)

    if (gameState.phase == gamePhase.Construction) {
        touchInfo.currPos = clampToEdges(touchInfo.currPos)
    } else if (gameState.phase == gamePhase.Placing) {
        onPlaceTouchMove(touchInfo)
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
    } else if (gameState.phase == gamePhase.Placing) {
        onPlaceTouchEvent(touchInfo)
    } else if (gamePhase.isPlaying(gameState.phase)) {
        onKickBallTouchEvent(touchInfo)
    }

    touchInfo.focusedBall = null
    touchInfo.draggingObject = false
})

function renderLoop() {
    Renderer.render(gameState, context, touchInfo)
    gameState.updatePhysics(getHostTime())

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

    const strength = Math.min(touchInfo.lastDownPos.distance(touchInfo.lastUpPos) * 0.3 / gameState.scalingFactor, 70)
    const touchUpBoardPos = gameState.screenPosToBoardPos(touchInfo.lastUpPos)
    const direction = touchInfo.focusedBall.pos.sub(touchUpBoardPos).normalized.scale(-strength)
    rtc.sendMessage(new DataMessage(dataMessageType.KICK_BALL,
        {direction: direction.toObject(), ballUid: touchInfo.focusedBall.uid}))
}

async function onObjectDown(touchInfo) {
    if (touchInfo.focusedObject &&
        gameState.boardPosToScreenPos(touchInfo.focusedObject.dragCorner).distance(touchInfo.currPos) < 20) {
            touchInfo.draggingObject = true
    } else {
        const boardPos = gameState.screenPosToBoardPos(touchInfo.currPos)
        const closestObject = gameState.board.getClosestObject(boardPos)
        
        if (closestObject) {
            const objectScreenPos = gameState.boardPosToScreenPos(closestObject.pos)
            if (closestObject.intersects(boardPos)) {
                touchInfo.focusedObject = closestObject
            } else {
                touchInfo.focusedObject = null
            }
        } else {
            touchInfo.focusedObject = null
        }
    }

    if (gameState.placingObjectType == golfObjectType.Eraser) {
        onPlaceTouchMove(touchInfo)
    }
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

const snapAngle = angle => {
    const mod = (n, m) => ((n % m) + m) % m
    angle = mod(angle, Math.PI * 2)
    const values = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2, Math.PI * 2,
                    Math.PI / 4, Math.PI / 4 * 3, Math.PI / 4 * 5, Math.PI / 4 * 7]
    for (let val of values) {
        if (Math.abs(val - angle) < 0.1) {
            return val
        }
    }
    return angle
}

async function onPlaceTouchMove(touchInfo) {
    if (gameState.placingObjectType == golfObjectType.Eraser) {
        const eraserPos = gameState.screenPosToBoardPos(touchInfo.currPos)
        const closestObject = gameState.board.getClosestObject(eraserPos)

        if (!closestObject || closestObject.pos.distance(eraserPos) > 30) {
            return
        }

        // optimistic change
        gameState.board.objects = gameState.board.objects.filter(o => o.uid != closestObject.uid)
        rtc.sendMessage(new DataMessage(dataMessageType.REMOVE_OBJECT, {uid: closestObject.uid}))
        return
    }

    if (!touchInfo.focusedObject) {
        return
    }

    if (touchInfo.draggingObject) {
        const objectPos = gameState.boardPosToScreenPos(touchInfo.focusedObject.pos)
        const angle = objectPos.angleTo(touchInfo.currPos)

        const angleOffset = Math.PI / 2 + Math.atan(touchInfo.focusedObject.size.x / touchInfo.focusedObject.size.y)
        const boardAngle = gameState.screenAngleToBoardAngle(angle + angleOffset)
        touchInfo.focusedObject.angle = snapAngle(boardAngle)
        if (touchInfo.focusedObject.resizable) {
            touchInfo.focusedObject.radius = objectPos.distance(touchInfo.currPos) / 1.2 * gameState.scalingFactor
        }
    } else {
        const boardPos = gameState.screenPosToBoardPos(touchInfo.currPos)
        touchInfo.focusedObject.pos = boardPos
    }
}

async function onPlaceTouchEvent(touchInfo) {
    if (gameState.placingObjectType == golfObjectType.Eraser) {
        return
    }

    if (touchInfo.focusedObject) {
        console.log("Change Object", touchInfo.focusedObject)
        rtc.sendMessage(new DataMessage(dataMessageType.CHANGE_OBJECT,
            {object: touchInfo.focusedObject.toObject()}))

    } else {
        if (!touchInfo.lastUpPos || !touchInfo.lastDownPos
            || touchInfo.lastDownPos.distance(touchInfo.lastUpPos) > 10) {
            return
        }

        const placedObject = placableObjects.find(o => o.type == gameState.placingObjectType).copy()
        if (!placedObject) {
            return
        }
        
        placedObject.uid = Math.random().toString().slice(2)
        placedObject.pos = gameState.screenPosToBoardPos(touchInfo.lastDownPos)
    
        console.log("Place Object", placedObject)
        rtc.sendMessage(new DataMessage(dataMessageType.PLACE_OBJECT,
            {object: placedObject.toObject()}))
    }
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
    if (dataMessage.type == dataMessageType.PING) {
        // send ping back
        rtc.sendMessage(DataMessage.Ping())

    } else if (dataMessage.type == dataMessageType.GAMESTATE) {
        gameState = GameState.fromObject(dataMessage.data)
        
        if (dataMessage.hostTime) {
            hostTimeOffset = dataMessage.hostTime - Date.now()
        }

        if (touchInfo.focusedObject && touchInfo.isDown) {
            gameState.board.updateObject(touchInfo.focusedObject)
        }

    } else if (dataMessage.type == dataMessageType.REQUEST_DIMENSIONS) {
        const course = new Course([PhoneCoordinates.fromWidthHeight(window.innerWidth, window.innerHeight)])
        rtc.sendMessage(new DataMessage(dataMessageType.SEND_DIMENSIONS, {course: course.toObject()}))
    }
}