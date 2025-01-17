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
    ConstructionChoice: 8,
    ConstructionAuto: 9,
    ConstructionCustom: 10,
    Loading: 11,
    Placing: 12,
    PlayingDuell: 13,
    PlayingSandbox: 14,
    PlayingTournament: 15,
    ShowingResultsOfTournament: 16,
    ShowingResultsOfDuell: 17,

    __LOWEST_PLAYING: 13,
    __LOWEST_SHOWING_RESULTS: 16,
    __MAX_VALUE: 18,

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
    [gamePhase.ConstructionChoice]: "construction-choice",
    [gamePhase.ConstructionAuto]: "construction-auto",
    [gamePhase.ConstructionCustom]: "construction-custom",
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

    constructor(phase, mode, board, cameraControlsActive=false, players=[], deviceIndex=null,
        placingObjectType=golfObjectType.Start,
        tournamentBuilderIndex=0, tournamentBallIndex=0,
        duellActivePlayerIndex=0, duellWinnerIndex=null,
        tournamentMaxKicks=10) {

        this.phase = phase
        this.mode = mode
        this.board = board

        this.cameraControlsActive = cameraControlsActive
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

    get thisPhone() {
        return this.board.course.phones[this.deviceIndex - 1]
    }

    getReferenceCanvas() {
        return fullscreenCanvas
    }

    screenPosToBoardPos(pos) {
        if (!this.thisPhone) return pos
        const screenSize = new Vector2d(this.getReferenceCanvas().width, this.getReferenceCanvas().height)
        return this.thisPhone.screenPosToBoardPos(pos, screenSize)
    }

    boardPosToScreenPos(pos) {
        if (!this.thisPhone) return pos
        const screenSize = new Vector2d(this.getReferenceCanvas().width, this.getReferenceCanvas().height)
        return this.thisPhone.boardPosToScreenPos(pos, screenSize)
    }

    screenAngleToBoardAngle(angle) {
        if (!this.thisPhone) return angle
        return angle + this.thisPhone.angle
    }

    boardAngleToScreenAngle(angle) {
        if (!this.thisPhone) return angle
        return angle - this.thisPhone.angle
    }

    get scalingFactor() {
        if (!this.thisPhone) return 1
        return this.thisPhone.scalar
    }

    get creditCardScalingFactor() {
        if (!this.thisPhone) return 1
        const screenSize = new Vector2d(this.getReferenceCanvas().width, this.getReferenceCanvas().height)
        return this.thisPhone.creditCardScalingFactor(screenSize)
    }

    get combinedScalingFactor() {
        return this.creditCardScalingFactor * this.scalingFactor
    }

    toObject(deviceIndex) {
        return {
            phase: this.phase,
            mode: this.mode,
            board: this.board.toObject(),
            cameraControlsActive: this.cameraControlsActive,
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
            obj.cameraControlsActive,
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
            const spriteUrl = AllBallSprites[i % AllBallSprites.length]
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
        if (this.board.balls.length == 0) {
            return
        }

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

        this.advanceTournamentBall(true)
    }

    advanceTournamentBall(forceSpeak=false) {
        if (this.tournamentBall === undefined) {
            return false 
        }

        let prevPlayerName = this.tournamentActivePlayer.name
        let inHoleCount = 0
        while ((this.tournamentBall.inHole && this.tournamentBall.radius == 0)
            || (this.tournamentBall.kicks >= this.tournamentMaxKicks && !this.tournamentBall.isInMovement())) {
            inHoleCount++

            this.tournamentBall.active = false
            this.tournamentBallIndex++
            this.tournamentBall.active = true

            if (inHoleCount >= this.players.length) {
                return false
            }
        }

        if (prevPlayerName != this.tournamentActivePlayer.name || forceSpeak) {
            if (window.AudioPlayer && gamePhase.isPlaying(this.phase)) {
                setTimeout(() => {
                    if (gamePhase.isPlaying(this.phase)) {
                        window.AudioPlayer.say(this.tournamentActivePlayer.name)
                    }
                }, 1000)
            }
        }

        return true
    }

    updateTournament() {
        let madeChange = false

        for (let i = 0; i < this.players.length; i++) {
            let kicks = this.board.balls[i].kicks
            const player = this.players[i]
            const roundIndex = this.tournamentBuilderIndex
            if (player.roundScores[roundIndex] === undefined) {
                player.addRound(kicks)
                madeChange = true
            } else {
                player.roundScores[roundIndex] = kicks
            }
        }

        if (!this.advanceTournamentBall()) {
            this.endTournamentRound()
            madeChange = true
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

    update(hostTime=Date.now()) {
        this.updatePhysics(hostTime)

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