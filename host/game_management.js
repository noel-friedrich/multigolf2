function playNewGame() {
    changeGamePhase(gamePhase.ModeChoice, true)
}

function syncGamestate(rtcs) {
    rtcs ??= rtc.connections
    for (const rtc of rtcs) {
        const message = new DataMessage(
            dataMessageType.GAMESTATE,
            gameState.toObject(rtc.index))
        rtc.sendMessage(message)
    }
}
    
function physicsLoop() {
    if (gameState.update()) {
        syncGamestate()
        updateHtmlSection(gameState.phase)
    }

    window.requestAnimationFrame(physicsLoop)
}

function onDataMessage(dataMessage, rtc) {
    if (dataMessage.type == dataMessageType.PING) {
        if (rtc.receivePing(dataMessage) && gameState.phase == gamePhase.ConstructionAuto) {
            generateBoardTemplates()
        } 

    } else if (
        gameState.phase == gamePhase.ConstructionCustom &&
        dataMessage.type == dataMessageType.CONSTRUCTION_LINE
    ) {
        const constructionLine = ConstructionLine.fromObject(dataMessage.data.line)
        const phoneModel = PhoneCoordinates.fromObject(dataMessage.data.phone)
        gameState.board.addConstructionLine(
            constructionLine, phoneModel,
            Date.now(), rtc.index
        )

    } else if (
        gameState.phase == gamePhase.Loading &&
        dataMessage.type == dataMessageType.SEND_DIMENSIONS
    ) {
        gameState.board.course = Course.fromObject(dataMessage.data.course)
        gameState.phase = gamePhase.ConstructionAuto
        finishConstruction()

    } else if (
        gameState.phase == gamePhase.Placing &&
        dataMessage.type == dataMessageType.PLACE_OBJECT
    ) {
        const object = GolfObject.fromObject(dataMessage.data.object)

        // remove existing starts
        if (object.type == golfObjectType.Start) {
            gameState.board.objects = gameState.board.objects.filter(o => o.type != golfObjectType.Start)
        }

        gameState.board.objects.push(object)
        syncGamestate()

    } else if (
        gameState.phase == gamePhase.Placing &&
        dataMessage.type == dataMessageType.REMOVE_OBJECT
    ) {
        gameState.board.objects = gameState.board.objects.filter(o => o.uid != dataMessage.data.uid)
        syncGamestate()

    } else if (
        gameState.phase == gamePhase.Placing &&
        dataMessage.type == dataMessageType.CHANGE_OBJECT
    ) {
        const changedObject = GolfObject.fromObject(dataMessage.data.object)
        gameState.board.updateObject(changedObject)

        syncGamestate()

    } else if (
        gamePhase.isPlaying(gameState.phase) &&
        dataMessage.type == dataMessageType.KICK_BALL
    ) {
        const ball = gameState.board.balls.find(b => b.uid == dataMessage.data.ballUid)
        if (ball) {
            if (gameState.mode == gameMode.Tournament) {
                gameState.onTournamentKick(ball)
            }
            ball.kick(Vector2d.fromObject(dataMessage.data.direction))
            updateHtmlSection(gameState.phase)
        } else {
            console.error("Couldn't find ball with id", dataMessage.data.ballUid)
        }

        syncGamestate()

    } else if (
        dataMessage.type == dataMessageType.DEVICE_ORIENTATION
    ) {
        if (gamePhase.isPlaying(gameState.phase)) {
            const gravity = Vector2d.fromObject(dataMessage.data)
            if (Math.abs(gravity.x) < 0.1) gravity.x = 0
            if (Math.abs(gravity.y) < 0.1) gravity.y = 0
            const phone = gameState.board.course.phones[dataMessage.data.deviceIndex - 1]
            if (phone) {
                phone.gravity = gravity
                syncGamestate()
            } else {
                console.log(`[Warning] Tried updating phone gravity of index ${dataMessage.data.deviceIndex}`)
            }
        }

    } else {
        console.log("received unknown message", dataMessage)
    }
}

function onRtcReconnect(rtc) {
    updatePlayerlist()
    syncGamestate([rtc])
}


let renderingIntervalIsSet = false
let isPhysicsLoopRunning = false
async function startGame() {
    // called when all players were successfully added

    if (!renderingIntervalIsSet) {
        setInterval(() => {
            if (gameState.board.course.phones.length > 0) {
                boardCanvasFieldset.style.display = "grid"
                BoardRenderer.render(gameState.board, boardContext, {
                    drawConnectionLines: gameState.phase >= gamePhase.ConstructionChoice && gameState.phase <= gamePhase.Placing
                })
            } else {
                boardCanvasFieldset.style.display = "none"
            }

            if (!gameState.board.balls.some(b => b.isMoving())) {
                syncGamestate()
            }

            if (gameState.phase == gamePhase.PlayingTournament) {
                generateScoreboard()
            }
        }, 500)
    
        renderingIntervalIsSet = true
    }

    if (!isPhysicsLoopRunning) {
        physicsLoop()
        isPhysicsLoopRunning = true
    }

    if (rtc.connections.length == 1) {
        changeGamePhase(gamePhase.Loading, true)
        syncGamestate()
        rtc.connections[0].sendMessage(new DataMessage(
            dataMessageType.REQUEST_DIMENSIONS))
    } else {
        changeGamePhase(gamePhase.ConstructionChoice, true)
    }

    syncGamestate()
}

async function finishConstruction() {
    if (![
        gamePhase.ConstructionChoice,
        gamePhase.ConstructionAuto,
        gamePhase.ConstructionCustom
    ].includes(gameState.phase)) {
        return
    }

    if (gameState.board.course.phones.length == 0) {
        return customAlert(Text.NotConstructedYet)
    }

    if (gameState.board.course && gameState.board.course.getOverlaps().length > 0) {
        if (!(await customConfirm(Text.CourseHasOverlap))) {
            return
        }
    }

    changeGamePhase(gamePhase.Placing)
    preparePlacing()
    syncGamestate()
}

let busyPlacingObjects = false
function placeRandomObjects(numObjects, objectType) {
    if (gameState.phase != gamePhase.Placing || busyPlacingObjects) {
        return
    }

    busyPlacingObjects = true
    BoardGenerator.placeObjectsRandomly(gameState.board, {numObjects, objectType}).then(() => busyPlacingObjects = false)
}

function preparePlacing() {
    for (const container of document.querySelectorAll(".object-selection-container")) {
        container.innerHTML = ""
        const allObjectContainers = []
        for (const obj of placableObjects) {
            if (!obj.visibility(gameState)) {
                continue
            }

            const object = document.createElement("div")
            const title = document.createElement("div")
            const headImg = document.createElement("div")
            const objectImg = document.createElement("img")
            const description = document.createElement("div")

            object.classList.add("object")
            title.classList.add("title")
            headImg.classList.add("head-img")
            description.classList.add("description")

            title.textContent = obj.name
            objectImg.src = obj.sprite
            description.textContent = gameState.replaceText(obj.description)

            headImg.appendChild(objectImg)

            object.appendChild(title)
            object.appendChild(headImg)
            object.appendChild(description)

            if (gameState.placingObjectType == obj.type) {
                object.classList.add("selected")
            }

            object.addEventListener("click", () => {
                for (let element of allObjectContainers) {
                    element.classList.remove("selected")
                }
                object.classList.add("selected")
                gameState.placingObjectType = obj.type
                syncGamestate()
            })

            container.appendChild(object)
            allObjectContainers.push(object)
        }
    }
}

function finishPlacing() {
    if (gameState.phase != gamePhase.Placing) {
        return
    }

    if (!gameState.board.startPos) {
        customAlert(Text.NoStartYet)
        return
    }

    if (gameState.board.endPositions.length == 0) {
        customAlert(Text.NoHoleYet)
        return
    }

    if (gameState.mode == gameMode.Duell) {
        if (!gameState.board.objects.find(o => o.type == golfObjectType.DuellHole1)) {
            customAlert(Text.HaventPlacedHoleFor(gameState.replaceText("<duell-player-1>")))
            return
        }

        if (!gameState.board.objects.find(o => o.type == golfObjectType.DuellHole2)) {
            customAlert(Text.HaventPlacedHoleFor(gameState.replaceText("<duell-player-2>")))
            return
        }
    }

    startPlaying()
}

function startPlaying() {
    if (gameState.phase >= gamePhase.__LOWEST_PLAYING) {
        return
    }

    switch(gameState.mode) {
        case gameMode.Duell:
            changeGamePhase(gamePhase.PlayingDuell)
            gameState.startDuellRound()
            break
        case gameMode.Sandbox:
            changeGamePhase(gamePhase.PlayingSandbox)
            gameState.startSandboxRound()
            break
        case gameMode.Tournament:
            changeGamePhase(gamePhase.PlayingTournament)
            gameState.startTournamentRound()
            break
    }

    syncGamestate()
}


function back() {
    switch (gameState.phase) {
        case gamePhase.ModeChoice:
            return changeGamePhase(gamePhase.Hello, true)
        case gamePhase.PlayerSetupTournament:
            return changeGamePhase(gamePhase.ModeChoice, true)
        case gamePhase.PlayerSetupDuell:
            return changeGamePhase(gamePhase.ModeChoice, true)
        case gamePhase.Connecting:
            if (gameState.mode == gameMode.Tournament) {
                return changeGamePhase(gamePhase.PlayerSetupTournament, true)
            } else if (gameState.mode == gameMode.Duell) {
                return changeGamePhase(gamePhase.PlayerSetupDuell, true)
            } else {
                return changeGamePhase(gamePhase.ModeChoice, true)
            }
        case gamePhase.ConfigGame:
            return changeGamePhase(gamePhase.Connecting, true)
        case gamePhase.TournamentExplanation:
        case gamePhase.DuellExplanation:
            return changeGamePhase(gamePhase.ConfigGame, true)
        case gamePhase.ConstructionChoice:
            if (gameState.mode == gameMode.Tournament) {
                return changeGamePhase(gamePhase.TournamentExplanation, true)
            } else if (gameState.mode == gameMode.Duell) {
                return changeGamePhase(gamePhase.DuellExplanation, true)
            } else {
                return changeGamePhase(gamePhase.ConfigGame, true)
            }
        case gamePhase.ConstructionAuto:
        case gamePhase.ConstructionCustom:
            return changeGamePhase(gamePhase.ConstructionChoice, true)
        case gamePhase.Placing:
            if (rtc.connections.length == 1) {
                if (gameState.mode == gameMode.Tournament) {
                    return changeGamePhase(gamePhase.TournamentExplanation, true)
                } else if (gameState.mode == gameMode.Duell) {
                    return changeGamePhase(gamePhase.DuellExplanation, true)
                } else {
                    return changeGamePhase(gamePhase.ConfigGame, true)
                }
            } else {
                return changeGamePhase(gamePhase.ConstructionChoice, true)
            }
    }
}

function toggleCameraControls() {
    gameState.cameraControlsActive = !gameState.cameraControlsActive
    updateHtmlSection(gameState.phase)
    syncGamestate()
}