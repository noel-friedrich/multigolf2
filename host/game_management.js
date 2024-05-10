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
        rtc.receivePing(dataMessage)

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
            boardCanvasFieldset.style.display = "grid"
            BoardRenderer.render(gameState.board, boardContext)
    
            updateHtmlSection(gameState.phase)
    
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
        gameState.phase = gamePhase.Loading
        updateHtmlSection(gameState.phase)
        syncGamestate()

        rtc.connections[0].sendMessage(new DataMessage(
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

    changeGamePhase(gamePhase.Placing)
    preparePlacing()
    syncGamestate()
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

            title.textContent = obj.type
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
        alert("You haven't placed a start yet. Place one and try again.")
        return
    }

    if (gameState.board.endPositions.length == 0) {
        alert("You haven't placed a hole yet. Place one and try again.")
        return
    }

    if (gameState.mode == gameMode.Duell) {
        if (!gameState.board.objects.find(o => o.type == golfObjectType.DuellHole1)) {
            alert(gameState.replaceText("You haven't placed a hole for <duell-player-1> yet."))
            return
        }

        if (!gameState.board.objects.find(o => o.type == golfObjectType.DuellHole2)) {
            alert(gameState.replaceText("You haven't placed a hole for <duell-player-2> yet."))
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