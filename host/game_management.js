function playNewGame() {
    changeGamePhase(gamePhase.ModeChoice, true)
}

function syncGamestate(rtcs) {
    rtcs ??= rtcConnections
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
        if (!currAddingPlayerUid) {
            updateHtmlSection(gameState.phase)
        }
    }

    window.requestAnimationFrame(physicsLoop)
}

function onDataMessage(dataMessage, rtc) {
    if (dataMessage.type == dataMessageType.PING) {
        return

    } else if (
        gameState.phase == gamePhase.Construction &&
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
        gameState.phase = gamePhase.Construction
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
        gameState.phase == gamePhase.PlaceDuellEnds &&
        dataMessage.type == dataMessageType.PLACE_END
    ) {
        const endPos = Vector2d.fromObject(dataMessage.data.pos)

        if (gameState.board.endPositions.length == 0) {
            gameState.duellActivePlayerIndex++
            gameState.board.endPositions.push(endPos)

        } else if (gameState.board.endPositions.length == 1) {
            gameState.duellActivePlayerIndex++
            gameState.board.endPositions.push(endPos)

        } else if (gameState.board.endPositions.length == 2) {
            gameState.board.endPositions[gameState.duellActivePlayerIndex % gameState.players.length] = endPos
            gameState.duellActivePlayerIndex++

        } else {
            return
        }

        if (!currAddingPlayerUid) {
            updateHtmlSection(gameState.phase)
        }
        syncGamestate()

    } else if (
        gamePhase.isPlaying(gameState.phase) &&
        dataMessage.type == dataMessageType.KICK_BALL
    ) {
        const ball = gameState.board.balls.find(b => b.uid == dataMessage.data.ballUid)
        if (ball) {
            ball.kick(Vector2d.fromObject(dataMessage.data.direction))
        } else {
            console.error("Couldn't find ball with id", dataMessage.data.ballUid)
        }

        syncGamestate()

    } else {
        console.log("received", dataMessage)
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
            boardCanvasFieldset.style.display = "grid"
            BoardRenderer.render(gameState.board, boardContext)
    
            if (!currAddingPlayerUid) {
                updateHtmlSection(gameState.phase)
            }
    
            if (!gameState.board.balls.some(b => b.isMoving())) {
                syncGamestate()
            }
        }, 500)
    
        renderingIntervalIsSet = true
    }

    if (!isPhysicsLoopRunning) {
        physicsLoop()
        isPhysicsLoopRunning = true
    }

    if (rtcConnections.length == 1) {
        gameState.phase = gamePhase.Loading
        updateHtmlSection(gameState.phase)
        syncGamestate()

        rtcConnections[0].sendMessage(new DataMessage(
            dataMessageType.REQUEST_DIMENSIONS))
    } else {
        gameState.phase = gamePhase.Construction
        updateHtmlSection(gameState.phase)
        syncGamestate()
    }
}

function finishConstruction() {
    if (gameState.phase != gamePhase.Construction) {
        return
    }

    if (gameState.board.course.phones.length < rtcConnections.length) {
        alert("You haven't connected all phones to the course. Connect all and try again.")
        return
    }

    changeGamePhase(gamePhase.Placing)
    preparePlacing()
    syncGamestate()
}

function preparePlacing() {
    for (const container of document.querySelectorAll(".object-selection-container")) {
        container.innerHTML = ""
        const allObjectContainers = []
        for (const obj of placableObjects) {
            const object = document.createElement("div")
            const title = document.createElement("div")
            const headImg = document.createElement("div")
            const objectImg = document.createElement("img")
            const description = document.createElement("div")

            object.classList.add("object")
            title.classList.add("title")
            headImg.classList.add("head-img")
            description.classList.add("description")

            title.textContent = obj.type
            objectImg.src = obj.sprite
            description.textContent = obj.description

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
        alert("You haven't placed a start yet. Place one and try again.")
        return
    }

    if (gameState.board.endPositions.length == 0) {
        alert("You haven't placed a hole yet. Place one and try again.")
        return
    }

    if (gameState.mode == gameMode.Duell) {
        changeGamePhase(gamePhase.PlaceDuellEnds)
        syncGamestate()
    } else {
        startPlaying()
    }
}

function finishDuelEndsPlacing() {
    if (gameState.phase != gamePhase.PlaceDuellEnds) {
        return
    }

    if (gameState.board.endPositions.length != 2) {
        alert("You haven't placed two holes yet. Place both and try again.")
        return
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