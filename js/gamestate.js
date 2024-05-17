const gamePhase = {
    None: -1,
    Hello: 0,
    ModeChoice: 1,
    PlayerSetupDuell: 2,
    PlayerSetupTournament: 3,
    Connecting: 4,
    ConfigGame: 5,
    TournamentExplanation: 6,
    DuellExplanation: 7,
    Construction: 8,
    Loading: 9,
    Placing: 10,
    PlayingDuell: 11,
    PlayingSandbox: 12,
    PlayingTournament: 13,
    ShowingResultsOfTournament: 14,
    ShowingResultsOfDuell: 15,

    __LOWEST_PLAYING: 11,
    __LOWEST_SHOWING_RESULTS: 14,
    __MAX_VALUE: 16,

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
    [gamePhase.ConfigGame]: "config-game",
    [gamePhase.TournamentExplanation]: "tournament-explanation",
    [gamePhase.DuellExplanation]: "duell-explanation",
    [gamePhase.Construction]: "construction",
    [gamePhase.Loading]: "loading",
    [gamePhase.Placing]: "placing",
    [gamePhase.PlayingDuell]: "playing-duell",
    [gamePhase.PlayingTournament]: "playing-tournament",
    [gamePhase.PlayingSandbox]: "playing-sandbox",
    [gamePhase.ShowingResultsOfTournament]: "showing-results-of-tournament",
    [gamePhase.ShowingResultsOfDuell]: "showing-results-of-duell",
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
        placingObjectType=golfObjectType.Start,
        tournamentBuilderIndex=0, tournamentBallIndex=0,
        duellActivePlayerIndex=0, duellWinnerIndex=null,
        tournamentMaxKicks=10) {
        this.phase = phase
        this.mode = mode
        this.board = board
        this.players = players
        this.deviceIndex = deviceIndex
        
        this.placingObjectType = placingObjectType

        // tournament related
        this.tournamentBuilderIndex = tournamentBuilderIndex
        this.tournamentBallIndex = tournamentBallIndex
        this.duellActivePlayerIndex = duellActivePlayerIndex
        this.duellWinnerIndex = duellWinnerIndex
        this.tournamentMaxKicks = tournamentMaxKicks
    }

    replaceText(txt) {
        if (this.mode == gameMode.Duell && this.players.length >= 2) {
            txt = txt.replaceAll("<duell-player-1>", this.players[0].name)
            txt = txt.replaceAll("<duell-player-2>", this.players[1].name)
        }

        return txt
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

    screenAngleToBoardAngle(angle) {
        return angle + this.board.course.phones[this.deviceIndex - 1].angle
    }

    boardAngleToScreenAngle(angle) {
        return angle - this.board.course.phones[this.deviceIndex - 1].angle
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
            placingObjectType: this.placingObjectType,
            tournamentBuilderIndex: this.tournamentBuilderIndex,
            tournamentBallIndex: this.tournamentBallIndex,
            duellActivePlayerIndex: this.duellActivePlayerIndex,
            duellWinnerIndex: this.duellWinnerIndex,
            tournamentMaxKicks: this.tournamentMaxKicks
        }
    }

    static fromObject(obj) {
        return new GameState(
            obj.phase, obj.mode,
            Board.fromObject(obj.board),
            obj.players.map(p => Player.fromObject(p)),
            obj.index,
            obj.placingObjectType,
            obj.tournamentBuilderIndex,
            obj.tournamentBallIndex,
            obj.duellActivePlayerIndex,
            obj.duellWinnerIndex,
            obj.tournamentMaxKicks)
    }

    updatePhysics(hostTime=Date.now()) {
        this.board.updatePhysics(hostTime)
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
        generateScoreboard()
    }

    endTournament() {
        this.phase = gamePhase.ShowingResultsOfTournament
        generateScoreboard()
    }

    endTournamentRound() {
        this.phase = gamePhase.TournamentExplanation

        // penalize balls that haven't reached goal in time 
        // with two extra points!
        for (let i = 0; i < this.players.length; i++) {
            const roundIndex = this.tournamentBuilderIndex
            if (!this.board.balls[i].inHole) {
                this.players[i].roundScores[roundIndex] += 2
            }
        }

        this.tournamentBuilderIndex++
        this.board.balls.splice(0, this.board.balls.length)

        if (this.tournamentFinished) {
            this.endTournament()
        }

        this.board.objects = []
    }

    onTournamentKick(ball) {
        let ballIndex = 0
        for (let i = 0; i < this.board.balls.length; i++) {
            ballIndex = i
            if (ball.uid == this.board.balls[i].uid) {
                break
            }
        }

        this.tournamentBall.active = false
        this.tournamentBallIndex = ballIndex + 1
        this.tournamentBall.active = true
    }

    updateTournament() {
        let madeChange = false

        for (let i = 0; i < this.players.length; i++) {
            let kicks = this.board.balls[i].kicks
            const player = this.players[i]
            const roundIndex = this.tournamentBuilderIndex
            if (player.roundScores[roundIndex] === undefined) {
                player.addRound(kicks)
            } else {
                player.roundScores[roundIndex] = kicks
            }
        }

        let inHoleCount = 0
        while ((this.tournamentBall.inHole && this.tournamentBall.radius == 0)
            || (this.tournamentBall.kicks >= this.tournamentMaxKicks && !this.tournamentBall.isMoving())) {
            inHoleCount++

            this.tournamentBall.active = false
            this.tournamentBallIndex++
            this.tournamentBall.active = true

            if (inHoleCount > this.players.length) {
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
            const closestObject = this.board.getClosestObject(ball.pos)

            if (closestObject.type == golfObjectType.DuellHole1) {
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