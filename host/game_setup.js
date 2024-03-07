let gameState = new GameState(
    gamePhase.Hello,
    gameMode.None,
    new Board()
)

function updateHtmlSection(phase) {
    for (let section of document.querySelectorAll("main > section[data-phase]")) {
        if (section.dataset.phase == gamePhaseNames[phase]) {
            section.style.display = "grid"
        } else {
            section.style.display = "none"
        }
    }

    const fillPlaceholders = (attr, value) => {
        for (let element of document.querySelectorAll("[data-fill]")) {
            if (element.dataset.fill == attr) {
                element.textContent = value
            }
        }
    }

    fillPlaceholders("tournament-builder-name", gameState.tournamentBuilder?.name)
    fillPlaceholders("tournament-active-name", gameState.tournamentActivePlayer?.name)
    fillPlaceholders("duell-active-name", gameState.duellActivePlayer?.name)
    fillPlaceholders("duell-inactive-name", gameState.duellInactivePlayer?.name)
    fillPlaceholders("duell-winner-name", gameState.duellWinner?.name)
}

async function generateScoreboard() {
    const scoreboardSrc = await ScoreboardMaker.makeImg(gameState.players)
    for (let element of document.querySelectorAll("img.scoreboard")) {
        element.src = scoreboardSrc
    }
}

async function shareScoreboard() {
    const scoreboardSrc = await ScoreboardMaker.makeImg(gameState.players)
    const blob = await (await fetch(scoreboardSrc)).blob()
    const file = new File([blob], 'multigolf2-scoreboard.png', {type: blob.type})

    navigator.share({
        title: "Multigolf 2 Scoreboard!",
        text: "Look! Scores! We played Multigolf! You should too!",
        files: [file],
    })
}

function changeGamePhase(newPhase, force=false) {
    if (gameState.phase >= newPhase && !force) {
        return
    }

    gameState.phase = newPhase
    updateHtmlSection(newPhase)
}

function chooseGamemode(mode) {
    if (gameState.phase != gamePhase.ModeChoice) {
        return
    }

    gameState.tournamentBuilderIndex = 0
    
    if (gameState.board.endPositions.length == 2) {
        gameState.board.endPositions = gameState.board.endPositions.slice(1)
    }

    gameState.mode = mode
    if (mode == gameMode.Sandbox) {
        startConnectionProcess()
    } else if (mode == gameMode.Tournament) {
        changeGamePhase(gamePhase.PlayerSetupTournament)
    } else if (mode == gameMode.Duell) {
        changeGamePhase(gamePhase.PlayerSetupDuell)
    }
}

function registerPlayers() {
    if (![gamePhase.PlayerSetupDuell, gamePhase.PlayerSetupTournament].includes(gameState.phase)) {
        return
    }

    const isValidName = name => {
        if (name.length > 30) {
            alert(`Name "${name.slice(0, 30)}..." is too long.`)
            return false
        }

        return name
    }

    const players = []
    const nameInputs = document.querySelectorAll(`input[data-game-mode="${gameState.mode}"]`)
    for (let nameInput of nameInputs) {
        const name = nameInput.value.trim()
        if (!name) {
            continue
        }
        if (isValidName(name)) {
            players.push(new Player(name))
        } else {
            return
        }
    }

    if (gameState.mode == gameMode.Duell && players.length != 2) {
        alert("Please fill out all fields.")
        return
    }

    if (gameState.mode == gameMode.Tournament && players.length == 0) {
        alert("Fill out at least one name to continue")
        return
    }

    const playerNames = new Set()
    for (let player of players) {
        const n = player.name.toLowerCase()
        if (playerNames.has(player.name)) {
            alert("Two players cannot have the same name")
            return
        }
        playerNames.add(n)
    }

    gameState.players = players
    startConnectionProcess()
}