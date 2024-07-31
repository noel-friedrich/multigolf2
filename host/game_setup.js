let gameState = new GameState(
    gamePhase.Hello,
    gameMode.None,
    new Board()
)

function updateHtmlSection(phase) {
    for (let section of document.querySelectorAll("main > section[data-phase]")) {
        if (section.dataset.phase == gamePhaseNames[phase]) {
            section.style.display = "grid"
            section.classList.add("visible")
        } else {
            section.style.display = "none"
            section.classList.remove("visible")
        }
    }

    const fillPlaceholders = (attr, value) => {
        for (let element of document.querySelectorAll("[data-fill]")) {
            if (element.dataset.fill == attr) {
                element.textContent = value
            }
        }
    }

    fillPlaceholders("num-connected-devices", rtc?.connections.length)

    fillPlaceholders("tournament-builder-name", gameState.tournamentBuilder?.name)
    fillPlaceholders("tournament-active-name", gameState.tournamentActivePlayer?.name)
    fillPlaceholders("tournament-max-kicks", gameState.tournamentMaxKicks)
    
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
        title: Text.MultigolfScoreboard,
        text: Text.ShareText,
        files: [file],
    })
}

let setBeforeUnloadListener = false
function changeGamePhase(newPhase, force=false) {
    if (!setBeforeUnloadListener) {
        addEventListener("beforeunload", event => {
            event.preventDefault()
            return Text.LeavingWarning
        })
    }

    if (gameState.phase >= newPhase && !force) {
        return
    }

    gameState.phase = newPhase
    updateHtmlSection(newPhase)

    if (newPhase == gamePhase.ConstructionChoice) {
        const hasLayout = gameState.board.course.phones.length > 0
        keepLayoutButton.style.display = hasLayout ? "block" : "none"
    } else if (newPhase == gamePhase.ConstructionAuto) {
        generateBoardTemplates()
    } else if (newPhase == gamePhase.ConstructionCustom) {
        gameState.board.resetConfig()
    } else if (newPhase == gamePhase.ConfigGame) {
        generateConfigHtml()
    }

    headerElement.scrollIntoView({behavior: "smooth"})
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
            customAlert(Text.NameTooLong(name.slice(0, 30)))
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
        customAlert(Text.PleaseFillOutFields)
        return
    }

    if (gameState.mode == gameMode.Tournament && players.length == 0) {
        customAlert(Text.FilloutOneName)
        return
    }

    const playerNames = new Set()
    for (let player of players) {
        const n = player.name.toLowerCase()
        if (playerNames.has(player.name)) {
            customAlert(Text.TwoPlayersSameName)
            return
        }
        playerNames.add(n)
    }

    gameState.players = players
    startConnectionProcess()
}

const gameConfigSettings = [
    {
        name: Text.DeviceGravity,
        description: Text.DeviceGravityDescription,
        warning: Text.DeviceGravityWarning,
        getValue: () => gameState.board.deviceGravityEnabled,
        setValue: val => gameState.board.deviceGravityEnabled = val,
        type: "boolean",
        showIf: () => true
    },
    {
        name: Text.BallCollisions,
        description: Text.BallCollisionsDescription,
        getValue: () => gameState.board.ballCollisionEnabled,
        setValue: val => gameState.board.ballCollisionEnabled = val,
        type: "boolean",
        showIf: () => [gameMode.Sandbox, gameMode.Tournament].includes(gameState.mode)
    },
    {
        name: Text.Soundeffects,
        description: Text.SoundeffectsDescription,
        getValue: () => AudioPlayer.soundsEnabled,
        setValue: val => AudioPlayer.soundsEnabled = val,
        type: "boolean",
        showIf: () => true
    },
    {
        name: Text.ReadNames,
        description: Text.ReadNamesDescription,
        getValue: () => AudioPlayer.speechEnabled,
        setValue: val => AudioPlayer.speechEnabled = val,
        type: "boolean",
        showIf: () => gameState.mode == gameMode.Tournament
    },
    {
        name: Text.MaximumKicksPerRound,
        description: Text.MaximumKicksPerRoundDescription,
        getValue: () => gameState.tournamentMaxKicks,
        setValue: val => gameState.tournamentMaxKicks = val,
        type: "integer", min: 1, max: 100,
        showIf: () => gameState.mode == gameMode.Tournament
    }
]

async function generateConfigHtml() {
    gameConfigContainer.innerHTML = ""

    for (const setting of gameConfigSettings) {
        if (!setting.showIf()) continue

        const container = document.createElement("div")
        const titleRow = document.createElement("div")
        titleRow.classList.add("titlerow")
        const name = document.createElement("div")
        name.textContent = setting.name
        name.classList.add("name")
        const inputContainer = document.createElement("div")
        inputContainer.classList.add("input-container")
        
        let inputElement = null
        if (setting.type == "boolean") {
            inputElement = document.createElement("input")
            inputElement.type = "checkbox"
            inputElement.checked = setting.getValue()

            inputElement.onchange = () => {
                setting.setValue(inputElement.checked)
            }
        } else if (setting.type == "integer") {
            inputElement= document.createElement("input")
            inputElement.type = "number"
            inputElement.value = setting.getValue()
            inputElement.min = setting.min
            inputElement.max = setting.max
            
            inputElement.oninput = () => {
                const stringValue = inputElement.value.trim()
                if (/^-?[0-9]+$/.test(stringValue)) {
                    inputElement.style.color = "black"
                } else {
                    inputElement.style.color = "red"
                    return
                }
                const value = parseInt(stringValue)
                if ((setting.min ?? -Infinity) > value
                    || (setting.max ?? Infinity) < value
                ) {
                    inputElement.style.color = "red"
                    return
                }
                setting.setValue(value)
            }
        } else {
            throw new Error(`Unknown Setting type "${setting.type}"`)
        }

        const description = document.createElement("div")
        description.textContent = setting.description
        description.classList.add("description")

        container.appendChild(titleRow)
        titleRow.appendChild(name)
        inputContainer.appendChild(inputElement)
        titleRow.appendChild(inputContainer)
        container.appendChild(description)

        if (setting.warning) {
            const warning = document.createElement("div")
            warning.textContent = setting.warning
            warning.classList.add("warning")
            container.appendChild(warning)
        }

        gameConfigContainer.appendChild(container)
    }
}

async function generateBoardTemplates() {
    if (gameState.phase != gamePhase.ConstructionAuto) {
        return
    }
    
    layoutChoiceContainer.innerHTML = ""

    const displaySizes = rtc.connections.map(r => r.clientDisplaySize).filter(r => r != null)

    if (displaySizes.length == 0) return

    const boardGenerator = new BoardGenerator(displaySizes)

    for (let i = 0; i < 3; i++) {
        const layoutContainer = document.createElement("div")
        layoutContainer.classList.add("layout-choice")

        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")

        const button = document.createElement("button")
        button.textContent = "Choose Layout"

        const boardOption = boardGenerator.generate()
        setTimeout(() => {
            BoardRenderer.render(boardOption, context, {drawConnectionLines: true})
        }, 100)

        button.onclick = () => {
            gameState.board = boardOption.copy()
            finishConstruction()
        }

        layoutContainer.appendChild(canvas)
        layoutContainer.appendChild(button)

        layoutChoiceContainer.appendChild(layoutContainer)
    }   
}