const gamePhase = {
    None: -1,
    Hello: 0,
    ModeChoice: 1,
    PlayerSetupDuell: 2,
    PlayerSetupTournament: 3,
    Connecting: 4,
    TournamentExplanation: 5,
    DuellExplanation: 6,
    Construction: 7,
    Loading: 8,
    PlaceStart: 9,
    PlaceEnd: 10,
    PlaceDuellEnds: 11,
    PlayingDuell: 12,
    PlayingSandbox: 13,
    PlayingTournament: 14,
    ShowingResultsOfTournament: 15,
    ShowingResultsOfDuell: 16,

    __LOWEST_PLAYING: 12,
    __LOWEST_SHOWING_RESULTS: 15,
    __MAX_VALUE: 17,

    isPlaying(phase) {
        return (
            phase == gamePhase.PlayingDuell
            || phase == gamePhase.PlayingSandbox
            || phase == gamePhase.PlayingTournament
        )
    },
}

const gamePhaseNames = {
    [gamePhase.None]: "none",
    [gamePhase.Hello]: "hello",
    [gamePhase.ModeChoice]: "mode-choice",
    [gamePhase.PlayerSetupDuell]: "player-setup-duell",
    [gamePhase.PlayerSetupTournament]: "player-setup-tournament",
    [gamePhase.Connecting]: "connecting",
    [gamePhase.TournamentExplanation]: "tournament-explanation",
    [gamePhase.DuellExplanation]: "duell-explanation",
    [gamePhase.Construction]: "construction",
    [gamePhase.Loading]: "loading",
    [gamePhase.PlaceStart]: "place-start",
    [gamePhase.PlaceEnd]: "place-end",
    [gamePhase.PlayingDuell]: "playing-duell",
    [gamePhase.PlayingTournament]: "playing-tournament",
    [gamePhase.PlayingSandbox]: "playing-sandbox",
    [gamePhase.ShowingResultsOfTournament]: "showing-results-of-tournament",
    [gamePhase.ShowingResultsOfDuell]: "showing-results-of-duell",
    [gamePhase.PlaceDuellEnds]: "place-duell-ends"
}

const gameMode = {
    Sandbox: "sandbox",
    Tournament: "tournament",
    Duell: "duell",
    None: "none",
}

class Player {

    constructor(name, roundScores=[]) {
        this.name = name
        this.roundScores = roundScores
    }

    get score() {
        let sum = 0
        for (let score of this.roundScores) {
            sum += score
        }
        return sum
    }

    toObject() {
        return {
            name: this.name,
            roundScores: this.roundScores
        }
    }

    static fromObject(obj) {
        return new Player(obj.name, obj.score, obj.roundScores)
    }

    addRound(score) {
        this.roundScores.push(score)
    }

}

class GameState {

    constructor(phase, mode, board, players=[], deviceIndex=null,
        tournamentBuilderIndex=0, tournamentBallIndex=0,
        duellActivePlayerIndex=0, duellWinnerIndex=null) {
        this.phase = phase
        this.mode = mode
        this.board = board
        this.players = players
        this.deviceIndex = deviceIndex

        // tournament related
        this.tournamentBuilderIndex = tournamentBuilderIndex
        this.tournamentBallIndex = tournamentBallIndex
        this.duellActivePlayerIndex = duellActivePlayerIndex
        this.duellWinnerIndex = duellWinnerIndex
    }
    
    get duellActivePlayer() {
        return this.players[this.duellActivePlayerIndex % this.players.length]
    }

    get duellInactivePlayer() {
        return this.players[(this.duellActivePlayerIndex + 1) % this.players.length]
    }

    get duellWinner() {
        return this.players[this.duellWinnerIndex]
    }

    get tournamentFinished() {
        return this.tournamentBuilderIndex >= this.players.length
    }

    get tournamentBuilder() {
        return this.players[this.tournamentBuilderIndex % this.players.length]
    }

    get tournamentBall() {
        return this.board.balls[this.tournamentBallIndex % this.board.balls.length]
    }

    get tournamentActivePlayer() {
        return this.players[this.tournamentBallIndex % this.players.length]
    }

    addPlayer(player) {
        this.players.push(player)
    }

    screenPosToBoardPos(pos) {
        return this.board.course.phones[this.deviceIndex - 1].screenPosToBoardPos(pos)
    }

    boardPosToScreenPos(pos) {
        return this.board.course.phones[this.deviceIndex - 1].boardPosToScreenPos(pos)
    }

    get scalingFactor() {
        return this.board.course.phones[this.deviceIndex - 1].scalar
    }

    toObject(deviceIndex) {
        return {
            phase: this.phase,
            mode: this.mode,
            board: this.board.toObject(),
            players: this.players.map(p => p.toObject()),
            index: deviceIndex ?? this.deviceIndex,
            tournamentBuilderIndex: this.tournamentBuilderIndex,
            tournamentBallIndex: this.tournamentBallIndex,
            duellActivePlayerIndex: this.duellActivePlayerIndex,
            duellWinnerIndex: this.duellWinnerIndex
        }
    }

    static fromObject(obj) {
        return new GameState(
            obj.phase, obj.mode,
            Board.fromObject(obj.board),
            obj.players.map(p => Player.fromObject(p)),
            obj.index,
            obj.tournamentBuilderIndex,
            obj.tournamentBallIndex,
            obj.duellActivePlayerIndex,
            obj.duellWinnerIndex)
    }

    updatePhysics() {
        if (gamePhase.isPlaying(this.phase)) {
            this.board.updatePhysics()
        }
    }

    startSandboxRound() {
        this.board.balls = []
        this.board.spawnBall({spriteUrl: Sprite.BallWhite})
    }

    updateSandbox() {
        this.board.balls = this.board.balls.filter(b => b.radius > 0)
    }

    startTournamentRound() {
        this.board.balls = []
        for (let i = 0; i < this.players.length; i++) {
            const spriteUrl = Sprite.AllBalls[i % Sprite.AllBalls.length]
            this.board.spawnBall({spriteUrl})
        }

        this.tournamentBallIndex = 0

        this.board.balls.forEach(b => b.active = false)
        this.tournamentBall.active = true
    }

    endTournament() {
        this.phase = gamePhase.ShowingResultsOfTournament
        generateScoreboard()
    }

    endTournamentRound() {
        this.phase = gamePhase.TournamentExplanation

        for (let i = 0; i < this.players.length; i++) {
            const kicks = this.board.balls[i].kicks
            this.players[i].addRound(kicks)
        }

        this.tournamentBuilderIndex++
        this.board.balls.splice(0, this.board.balls.length)

        if (this.tournamentFinished) {
            this.endTournament()
        }

        this.board.startPos = null
        this.board.endPositions = []
    }

    updateTournament() {
        let madeChange = false

        const currBall = this.tournamentBall
        const nextBall = this.board.balls[(this.tournamentBallIndex + 1) % this.board.balls.length]
        if (currBall.isMoving() && !nextBall.isMoving()) {
            currBall.active = false
            nextBall.active = true
            this.tournamentBallIndex++
            madeChange = true
        }

        let inHoleCount = 0
        while ((this.tournamentBall.inHole && this.tournamentBall.radius == 0) || this.tournamentBall.kicks > 8) {
            inHoleCount++

            if (this.tournamentBall.kicks > 8) {
                this.tournamentBall.kicks = 10
            }

            this.tournamentBall.active = false
            this.tournamentBallIndex++
            this.tournamentBall.active = true

            if (inHoleCount >= this.players.length) {
                this.endTournamentRound()
                madeChange = true
                break
            }
        }

        return madeChange
    }

    endDuell() {
        this.phase = gamePhase.ShowingResultsOfDuell
        this.board.balls = []
    }

    startDuellRound() {
        this.board.balls = []
        this.board.spawnBall({spriteUrl: Sprite.BallWhite})
    }

    updateDuell() {
        const ball = this.board.balls[0]
        if (ball.radius == 0 && ball.inHole) {
            const holeDist1 = ball.pos.distance(gameState.board.endPositions[0])
            const holeDist2 = ball.pos.distance(gameState.board.endPositions[1])

            if (holeDist1 < holeDist2) {
                this.duellWinnerIndex = 0
            } else {
                this.duellWinnerIndex = 1
            }

            this.endDuell()
            return true
        }
    }

    update() {
        this.updatePhysics()

        if (gamePhase.isPlaying(this.phase)) {
            if (this.mode == gameMode.Tournament) {
                return this.updateTournament()
            } else if (this.mode == gameMode.Sandbox) {
                return this.updateSandbox()
            } else if (this.mode == gameMode.Duell) {
                return this.updateDuell()
            }
        }
    }

}