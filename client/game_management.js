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
    draggingObject: false,

    gestureHoverPos: null,
    gestureHoverPosTime: null
}

window.touchInfo = touchInfo

function clampToEdges(pos) {
    return pos.clampX([0, fullscreenCanvas.width], 100)
              .clampY([0, fullscreenCanvas.height], 100)
}

function onTouchStart(pos) {
    touchInfo.isDown = true
    touchInfo.currPos = pos
    touchInfo.lastDownPos = touchInfo.currPos.copy()
    touchInfo.lastDownTime = Date.now()

    if (gameState.phase == gamePhase.ConstructionCustom) {
        touchInfo.currPos = clampToEdges(touchInfo.currPos)
        touchInfo.lastDownPos = touchInfo.currPos.copy()
    } else if (gamePhase.isPlaying(gameState.phase)) {
        onBallDown(touchInfo)
    } else if (gameState.phase == gamePhase.Placing) {
        onObjectDown(touchInfo)
    }
}

function onTouchMove(pos) {
    touchInfo.currPos = pos

    if (gameState.phase == gamePhase.ConstructionCustom) {
        touchInfo.currPos = clampToEdges(touchInfo.currPos)
    } else if (gameState.phase == gamePhase.Placing) {
        onPlaceTouchMove(touchInfo)
    }
}

function onTouchEnd(pos) {
    touchInfo.isDown = false
    touchInfo.currPos = null
    touchInfo.lastUpPos = pos
    touchInfo.lastUpTime = Date.now()

    if (gameState.phase == gamePhase.ConstructionCustom) {
        touchInfo.lastUpPos = clampToEdges(touchInfo.lastUpPos)
        onConstructionTouchEvent(touchInfo)
    } else if (gameState.phase == gamePhase.Placing) {
        onPlaceTouchEvent(touchInfo)
    } else if (gamePhase.isPlaying(gameState.phase)) {
        onKickBallTouchEvent(touchInfo)
    }

    touchInfo.focusedBall = null
    touchInfo.draggingObject = false
}

fullscreenCanvas.addEventListener("touchstart", event => {
    onTouchStart(Vector2d.fromTouchEvent(event, fullscreenCanvas))
})

fullscreenCanvas.addEventListener("touchmove", event => {
    onTouchMove(Vector2d.fromTouchEvent(event, fullscreenCanvas))
})

fullscreenCanvas.addEventListener("touchend", event => {
    onTouchEnd(Vector2d.fromTouchEvent(event, fullscreenCanvas))
})

let currHandDraggingBall = null
let currHandDraggingStartPos = null
let currHandDraggingPos = null

const isThereABallToHandControl = () => {
    if (gameState.mode == gameMode.Sandbox && gamePhase.isPlaying(gameState.phase) && gameState.deviceIndex == 1) {
        return gameState.board.balls.filter(b => !b.inHole).length > 0
    }

    if (gameState.mode == gameMode.Tournament && gamePhase.isPlaying(gameState.phase)) {
        return (
            gameState.tournamentBall &&
            !gameState.tournamentBall.isInMovement() &&
            !gameState.tournamentBall.inHole &&
            gameState.thisPhone.containsPos(gameState.tournamentBall.pos)
        )
    }
}

window.isThereABallToHandControl = isThereABallToHandControl

handControls.onNonDragMove((_, normalPos) => {
    touchInfo.gestureHoverPos = normalPos
        .scaleX(window.innerWidth)
        .scaleY(window.innerHeight)
    touchInfo.gestureHoverPosTime = Date.now()
})

handControls.onDragStart(pos => {
    // only let it start if gamemode is sandbox and it's the first device (to prevent multiple triggers)
    if (gameState.mode == gameMode.Sandbox && gamePhase.isPlaying(gameState.phase) && gameState.deviceIndex == 1) {
        if (gameState.board.balls.length == 0) {
            return
        }

        currHandDraggingBall = gameState.board.balls[0]
        currHandDraggingStartPos = pos.copy()
        currHandDraggingPos = currHandDraggingStartPos.copy()
        const ballScreenPos = gameState.boardPosToScreenPos(currHandDraggingBall.pos)
        onTouchStart(ballScreenPos)
    }

    // only let it start if gamemode is tournament and if the current ball is in this screen
    if (gameState.mode == gameMode.Tournament && gamePhase.isPlaying(gameState.phase)) {
        if (!gameState.tournamentBall || gameState.tournamentBall.isInMovement()) {
            return
        }

        if (!gameState.thisPhone.containsPos(gameState.tournamentBall.pos)) {
            return
        }

        currHandDraggingBall = gameState.tournamentBall
        currHandDraggingStartPos = pos.copy()
        currHandDraggingPos = currHandDraggingStartPos.copy()
        const ballScreenPos = gameState.boardPosToScreenPos(currHandDraggingBall.pos)
        onTouchStart(ballScreenPos)
    }
})

handControls.onDragMove(pos => {
    if (currHandDraggingBall === null) {
        return
    }

    const ballScreenPos = gameState.boardPosToScreenPos(currHandDraggingBall.pos)
    const relativePos = pos.sub(currHandDraggingStartPos).scale(2).add(ballScreenPos)
    currHandDraggingPos = relativePos.copy()
    onTouchMove(relativePos)
})

handControls.onDragEnd(() => {
    if (currHandDraggingBall === null) {
        return
    }

    onTouchEnd(currHandDraggingPos)

    currHandDraggingBall = null
    currHandDraggingStartPos = null
    currHandDraggingPos = null
})

// called when the gesture leaves the camera window
// (when the hand goes too far for the camera to see)
handControls.onDragCancel(() => {
    if (currHandDraggingBall === null) {
        return
    }

    // move cursor back to the ball to prevent a shot from happening
    const ballScreenPos = gameState.boardPosToScreenPos(currHandDraggingBall.pos)
    onTouchEnd(ballScreenPos)

    currHandDraggingBall = null
    currHandDraggingStartPos = null
    currHandDraggingPos = null
})

// animate currPos and gestureHoverPos a little
let renderCurrPos = null
let renderHoverPos = null
function getRenderTouchInfo(touchInfo) {
    if (renderCurrPos === null && (touchInfo.currPos instanceof Vector2d)) {
        renderCurrPos = touchInfo.currPos.copy()
    }

    if (renderHoverPos === null && (touchInfo.gestureHoverPos instanceof Vector2d)) {
        renderHoverPos = touchInfo.gestureHoverPos.copy()
    }
    
    const touchInfoCopy = {...touchInfo}

    if ((renderCurrPos instanceof Vector2d) && (touchInfo.currPos instanceof Vector2d)) {
        renderCurrPos = renderCurrPos.lerp(touchInfo.currPos, 0.3)
        touchInfoCopy.currPos = renderCurrPos.copy()
    }

    if ((renderHoverPos instanceof Vector2d) && (touchInfo.gestureHoverPos instanceof Vector2d)) {
        renderHoverPos = renderHoverPos.lerp(touchInfo.gestureHoverPos, 0.3)
        touchInfoCopy.gestureHoverPos = renderHoverPos.copy()
    }
    
    return touchInfoCopy
}

function renderLoop() {
    if (rtc) {
        try {
            gameState.updatePhysics(getHostTime())
        } catch (physicsError) {
            logToUser(`[p] ${physicsError}`)
        }

        try {
            if (rtc && rtc.getStatus().color == "green") {
                const renderTouchInfo = getRenderTouchInfo(touchInfo)
                fullscreenCanvas.style.display = "block"
                Renderer.render(gameState, context, renderTouchInfo)
            } else {
                fullscreenCanvas.style.display = "none"
            }
        } catch (renderError) {
            logToUser(`[r] ${renderError}`)
        }
    }

    window.requestAnimationFrame(renderLoop)
}

let startedOrientationInterval = false
let startedHandControlInterval = false
async function startGame() {
    gameState = new GameState(gamePhase.Connecting, gameMode.None, new Board())
    window.gameState = gameState
    renderLoop()

    if (!startedOrientationInterval) {
        startedOrientationInterval = true

        setInterval(() => {
            if (deviceTilt.steady && deviceTilt.hasChangedFlag && rtc) {
                rtc.sendMessage(new DataMessage(dataMessageType.DEVICE_ORIENTATION,
                    {x: deviceTilt.stableTilt.x, y: deviceTilt.stableTilt.y, deviceIndex: gameState.deviceIndex}
                ))
                deviceTilt.hasChangedFlag = false
            }
        }, 3000)
    }

    if (!startedHandControlInterval) {
        startedHandControlInterval = true
        setInterval(() => {
            updateHandControlState()
        }, 333)
    }
}

async function onKickBallTouchEvent(touchInfo) {
    if (!touchInfo.focusedBall || !touchInfo.lastDownPos || !touchInfo.lastUpPos) {
        return
    }

    if (touchInfo.lastDownPos.distance(touchInfo.lastUpPos) < 10) {
        return
    }

    const ballPos = gameState.boardPosToScreenPos(touchInfo.focusedBall.pos)
    const strength = Math.min(ballPos.distance(touchInfo.lastUpPos) * 0.3 / gameState.combinedScalingFactor, 70)
    const touchUpBoardPos = gameState.screenPosToBoardPos(touchInfo.lastUpPos)
    const direction = touchInfo.focusedBall.pos.sub(touchUpBoardPos).normalized.scale(-strength)
    rtc.sendMessage(new DataMessage(dataMessageType.KICK_BALL,
        {direction: direction.toObject(), ballUid: touchInfo.focusedBall.uid}))

    // do an optimistic change
    if (gameState.mode == gameMode.Tournament) {
        gameState.onTournamentKick(touchInfo.focusedBall)
    }
    touchInfo.focusedBall.kick(direction)
}

async function onObjectDown(touchInfo) {
    if (touchInfo.focusedObject &&
        gameState.boardPosToScreenPos(touchInfo.focusedObject.dragCorner).distance(touchInfo.currPos) < 20) {
            touchInfo.draggingObject = true
    } else {
        const boardPos = gameState.screenPosToBoardPos(touchInfo.currPos)
        const closestObject = gameState.board.getClosestObject(boardPos)
        
        if (closestObject) {
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
        if (ball.isInMovement() || !ball.active || ball.inHole) {
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
        let hitObject = null
        for (const object of gameState.board.objects) {
            if (object.intersects(eraserPos)) {
                hitObject = object
                break
            }
        }

        if (!hitObject) {
            return
        }

        // optimistic change
        gameState.board.objects = gameState.board.objects.filter(o => o.uid != hitObject.uid)
        rtc.sendMessage(new DataMessage(dataMessageType.REMOVE_OBJECT, {uid: hitObject.uid}))
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
            touchInfo.focusedObject.radius = objectPos.distance(touchInfo.currPos) / 1.2 * gameState.combinedScalingFactor
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

function updateHandControlState() {
    if (gameState.cameraControlsActive) {
        if (isThereABallToHandControl()) {
            if (!handControls.cameraActive) {
                handControls.startCamera()
            }
        } else {
            handControls.stopCamera()
        }
    }

    if (!gameState.cameraControlsActive && handControls.cameraActive) {
        handControls.stopCamera()
    }
}

async function onDataMessage(dataMessage) {
    if (dataMessage.type == dataMessageType.PING) {
        // send ping back with displaysize and get deviceindex from ping
        updateDeviceIndex(dataMessage.data.index)

        const displaySize = new Vector2d(window.innerWidth, window.innerHeight)
        if (window.creditCardPixelHeight) {
            displaySize.iscale(400 / window.creditCardPixelHeight)
        }

        rtc.sendMessage(DataMessage.Ping({displaySize: displaySize.toObject()}))

    } else if (dataMessage.type == dataMessageType.GAMESTATE) {
        gameState = GameState.fromObject(dataMessage.data)
        window.gameState = gameState

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