class Renderer {

    static spriteImgMap = {}

    static async loadImg(src) {
        return new Promise(resolve => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.src = src
        })
    }

    static async load() {
        for (let ballSprite of Sprite.AllBalls) {
            this.spriteImgMap[ballSprite] = await this.loadImg(ballSprite)
        }

        this.spriteImgMap[Sprite.Hole] = await this.loadImg(Sprite.Hole)
        this.spriteImgMap[Sprite.Start] = await this.loadImg(Sprite.Start)
        this.spriteImgMap[Sprite.DuellHole1] = await this.loadImg(Sprite.DuellHole1)
        this.spriteImgMap[Sprite.DuellHole2] = await this.loadImg(Sprite.DuellHole2)
        this.spriteImgMap[Sprite.Lava] = await this.loadImg(Sprite.Lava)
        this.spriteImgMap[Sprite.ZoomIcon] = await this.loadImg(Sprite.ZoomIcon)
    }

    static startSize = new Vector2d(40, 40)
    static endSize = new Vector2d(50, 50)

    static updateCanvasSize(context) {
        context.canvas.width = context.canvas.clientWidth
        context.canvas.height = context.canvas.clientHeight
    }

    static drawSprite(context, centerPos, size, sprite, {
        angle = 0,
        imageSmoothing = false
    }={}) {
        const img = this.spriteImgMap[sprite]
        if (!img) {
            throw new Error(`Unknown Sprite: ${sprite}`)
        }

        context.imageSmoothingEnabled = imageSmoothing // as some sprites may be very small in size

        context.save()
        context.translate(centerPos.x, centerPos.y)
        context.rotate(angle)
        context.drawImage(img, -size.x / 2, -size.y / 2, size.x, size.y)
        context.restore()
    }

    static get screenUnit() {
        return Math.min(window.innerWidth, window.innerHeight) * 0.1
    }

    static renderNothing(gameState, context, touchInfo) {
        context.canvas.style.display = "none"
    }

    static drawCircle(context, pos, radius) {
        context.beginPath()
        context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI, false)
    } 

    static renderConstruction(gameState, context, touchInfo) {
        const canvas = context.canvas

        canvas.style.display = "block"
        context.fillStyle = "#79FFB6"
        context.fillRect(0, 0, canvas.width, canvas.height)

        context.textBaseline = "middle"
        context.textAlign = "center"
        context.font = `${this.screenUnit * 3}px Arial`
        context.fillStyle = "black"
        context.fillText(gameState.deviceIndex, canvas.width / 2, canvas.height / 2)

        if (touchInfo.isDown) {
            if (touchInfo.lastDownPos) {
                context.beginPath()
                context.moveTo(touchInfo.lastDownPos.x, touchInfo.lastDownPos.y)
                context.lineTo(touchInfo.currPos.x, touchInfo.currPos.y)
                context.lineWidth = this.screenUnit
                context.lineCap = "round"
                context.strokeStyle = "#bac4ff"
                context.stroke()
            }

            context.fillStyle = "blue"
            this.drawCircle(context, touchInfo.currPos, Math.min(this.screenUnit, 100))
            context.fill()
        }
    }

    static drawObjectOutline(gameState, context, object) {
        const screenCorners = object.relativeCorners
            .map(c => c.scale(1.2))
            .map(c => c.add(object.pos))
            .map(c => gameState.boardPosToScreenPos(c))

        context.beginPath()
        context.moveTo(screenCorners[0].x, screenCorners[0].y)
        for (let i = 0; i < screenCorners.length; i++) {
            const index = (i + 1) % screenCorners.length
            context.lineTo(screenCorners[index].x, screenCorners[index].y)
        }

        context.strokeStyle = "blue"
        context.lineWidth = 3
        context.lineCap = "round"
        context.stroke()

        this.drawSprite(context, gameState.boardPosToScreenPos(object.dragCorner),
            new Vector2d(20, 20), Sprite.ZoomIcon, {imageSmoothing: true})
    }

    static renderBoard(gameState, context, touchInfo, {
        drawBalls = true,
        drawSelection = true,
    }={}) {
        context.canvas.style.display = "block"
        context.canvas.style.display = "block"
        const backgroundSizePercent = Math.max(Math.round(20 / gameState.scalingFactor), 5)
        context.canvas.style.backgroundSize = `${backgroundSizePercent}%`

        for (const object of gameState.board.objects) {
            const screenPos = gameState.boardPosToScreenPos(object.pos)
            this.drawSprite(context, screenPos, object.size.scale(1 / gameState.scalingFactor),
                object.sprite, {angle: gameState.boardAngleToScreenAngle(object.angle)})

            if (drawSelection) {
                if (touchInfo.focusedObject && object.uid == touchInfo.focusedObject.uid) {
                    this.drawObjectOutline(gameState, context, object)
                }
            }
        }

        if (!drawBalls) {
            return
        }
        
        // shallow copy to sort them into correct rendering order
        const renderBalls = gameState.board.balls.slice()
        renderBalls.sort((a, b) => {
            if (b.active) return -1
            else return 0
        })

        for (let ball of renderBalls) {
            const screenPos = gameState.boardPosToScreenPos(ball.pos)
            const size = new Vector2d(ball.radius, ball.radius).scale(2 / gameState.scalingFactor)

            if (!ball.active && !ball.isMoving()) {
                context.globalAlpha = 0.5
            }

            // rotate context to rotate ball
            context.save()
            context.translate(screenPos.x, screenPos.y)
            context.rotate(gameState.boardAngleToScreenAngle(ball.rotationAngle))

            this.drawSprite(context, new Vector2d(0, 0), size, ball.spriteUrl)
            context.restore()

            context.globalAlpha = 1.0
        }
    }

    static renderBallInteractions(gameState, context, touchInfo) {
        if (!touchInfo.isDown || !touchInfo.focusedBall || !touchInfo.currPos) {
            return
        }

        const ballScreenPos = gameState.boardPosToScreenPos(touchInfo.focusedBall.pos)
        context.beginPath()
        context.moveTo(ballScreenPos.x, ballScreenPos.y)
        context.lineTo(touchInfo.currPos.x, touchInfo.currPos.y)
        context.strokeStyle = "rgba(0, 0, 0, 0.5)"
        context.lineWidth = touchInfo.focusedBall.radius / gameState.scalingFactor
        context.lineCap = "round"
        context.stroke()
    }

    static render(gameState, context, touchInfo) {
        this.updateCanvasSize(context)
        document.body.style.overflow = "hidden"
        switch (gameState.phase) {
            case gamePhase.Construction:
                return this.renderConstruction(gameState, context, touchInfo)
            case gamePhase.Placing:
                return this.renderBoard(gameState, context, touchInfo, {drawBalls: false})
            case gamePhase.PlayingDuell:
            case gamePhase.PlayingSandbox:
            case gamePhase.PlayingTournament:
                this.renderBoard(gameState, context, touchInfo, {drawSelection: false})
                return this.renderBallInteractions(gameState, context, touchInfo)
            default:
                document.body.style.overflow = "visible"
                return this.renderNothing(gameState, context, touchInfo)
        }
    }

}