class Renderer {

    static spriteImgMap = {}

    static async loadImg(src) {
        return new Promise(resolve => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.src = src
            img.dataset.sprite = src
        })
    }

    static async load() {
        const promises = Object.values(Sprite).map(s => this.loadImg(s))
        for (const img of await Promise.all(promises)) {
            this.spriteImgMap[img.dataset.sprite] = img
        }
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
        
        document.body.style.overflow = "visible"
        const fullscreenElement = document.mozFullScreenElement || document.webkitFullscreenElement || document.fullscreenElement
        if (fullscreenElement) {
            // who doesn't love browser compat?
            if (document.exitFullscreen) {
                document.exitFullscreen()
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen()
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen()
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen()
            }
        }
    }

    static drawCircle(context, pos, radius) {
        context.beginPath()
        context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI, false)
    }

    static renderConnectionLines(gameState, context, touchInfo) {
        for (const line of gameState.board.course.lines) {
            context.beginPath()

            const startPos = gameState.boardPosToScreenPos(line.start)
            const endPos = gameState.boardPosToScreenPos(line.end)

            context.moveTo(startPos.x, startPos.y)
            context.lineTo(endPos.x, endPos.y)
            
            context.lineWidth = 20 / gameState.combinedScalingFactor
            context.strokeStyle = line.color
            context.lineCap = "round"
            context.stroke()
        }
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
        context.fillText(gameState.deviceIndex + ".", canvas.width / 2, canvas.height / 2)

        if (touchInfo.isDown) {
            if (touchInfo.lastDownPos) {
                context.beginPath()
                context.moveTo(touchInfo.lastDownPos.x, touchInfo.lastDownPos.y)
                context.lineTo(touchInfo.currPos.x, touchInfo.currPos.y)
                context.lineWidth = 30
                context.lineCap = "round"
                context.strokeStyle = "#bac4ff"
                context.stroke()
            }

            context.fillStyle = "blue"
            this.drawCircle(context, touchInfo.currPos, 25)
            context.fill()
        }

        this.renderConnectionLines(gameState, context, touchInfo)
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

    static drawCustomWall(gameState, context, corners) {
        context.beginPath()
        context.moveTo(corners[0].x, corners[0].y)
        for (let i = 0; i < corners.length; i++) {
            const index = (i + 1) % corners.length
            context.lineTo(corners[index].x, corners[index].y)
        }

        context.strokeStyle = "black"
        context.fillStyle = "white"
        context.lineWidth = 3 / gameState.combinedScalingFactor
        context.lineCap = "round"

        context.fill()
        context.stroke()
    }

    static drawGravityArrow(context, pos, direction) {
        direction = direction.rotate(-Math.PI / 2)

        context.save()
        context.translate(pos.x, pos.y)
        context.rotate(direction.angle)
        context.scale(direction.length, direction.length)
        context.beginPath()
        context.moveTo(-0.5, 0)
        context.lineTo(0.5, 0)
        context.lineTo(0, 1)
        context.lineTo(-0.5, 0)
        context.fillStyle = "#5cfaa3"
        context.fill()
        context.restore()
    }

    static drawGravityArrows(gameState, context, touchInfo) {
        let arrowDirection = gameState.board.course.phones[gameState.deviceIndex - 1].gravity
        if (!arrowDirection) return

        arrowDirection = arrowDirection.scale(200 / gameState.scalingFactor)
        if (arrowDirection.length < 30 / gameState.scalingFactor) {
            arrowDirection = arrowDirection.normalized.scale(30 / gameState.scalingFactor)
        }

        let pos = new Vector2d(0, 0)
        let gridSize = Math.max(arrowDirection.length * 2, 100 / gameState.scalingFactor)

        for (let x = gridSize / 2; x < context.canvas.width; x += gridSize) {
            for (let y = gridSize / 2; y < context.canvas.height; y += gridSize) {
                pos.set(x, y)
                this.drawGravityArrow(context, pos, arrowDirection)
            }
        }
    }

    static renderBoard(gameState, context, touchInfo, {
        drawBalls = true,
        drawSelection = true,
        drawGravity = false,
        drawConnectionLines = false,
    }={}) {
        context.canvas.style.display = "block"
        const backgroundSizePx = 202 / gameState.combinedScalingFactor
        const backgroundSizePercent = Math.max(Math.round(backgroundSizePx / context.canvas.width * 100), 1)
        context.canvas.style.backgroundSize = `${backgroundSizePercent}%`

        if (drawConnectionLines) {
            this.renderConnectionLines(gameState, context, touchInfo)
        }

        if (drawGravity) {
            this.drawGravityArrows(gameState, context, touchInfo)
        }

        for (const object of gameState.board.objects) {
            if (object.type == golfObjectType.CustomWall) {
                const screenCorners = object.corners.map(corner => {
                    return gameState.boardPosToScreenPos(corner)})
                this.drawCustomWall(gameState, context, screenCorners)
            } else {
                const screenPos = gameState.boardPosToScreenPos(object.pos)
                this.drawSprite(context, screenPos,
                    object.size.scale(1 / gameState.combinedScalingFactor),
                    object.sprite, {angle: gameState.boardAngleToScreenAngle(object.angle)})
            }


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
            const size = new Vector2d(ball.radius, ball.radius).scale(2 / gameState.combinedScalingFactor)

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

        if (gameState.board.particlesEnabled) {
            for (const particle of gameState.board.particles) {
                context.globalAlpha = particle.opacity
                const screenPos = gameState.boardPosToScreenPos(particle.pos)
                context.fillStyle = particle.color
                context.fillRect(screenPos.x, screenPos.y, particle.radius, particle.radius)
            }
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

    static renderPlacingTools(gameState, context, touchInfo) {
        if (gameState.placingObjectType == golfObjectType.Eraser 
            && touchInfo.isDown && touchInfo.currPos
        ) {
            this.drawSprite(context, touchInfo.currPos, new Vector2d(60, 60), Sprite.Eraser,
                {angle: gameState.boardAngleToScreenAngle(0)})
        }
    }

    static renderChallengeBalls(gameState, context, touchInfo, challengeBalls) {
        const fontSize = context.canvas.height * 0.06
        const padding = 10

        context.font = `bold ${fontSize}px Arial`
        context.fillStyle = "white"
        context.textAlign = "left"
        context.textBaseline = "top"
        context.strokeStyle = "black"
        context.lineWidth = 5
        context.strokeText(challengeBalls, padding + fontSize * 1.1, 10)
        context.fillText(challengeBalls, padding + fontSize * 1.1, 10)
        
        const ballSprite = gameState.board.balls[0]?.spriteUrl ?? Sprite.BallWhite
        this.drawSprite(context, new Vector2d(1, 1).scale(padding + fontSize * 0.5 - 3),
            new Vector2d(1, 1).scale(fontSize * 0.8), ballSprite)
    }

    static render(gameState, context, touchInfo, {
        preventScrolling = true,
        challengeBalls = undefined
    }={}) {
        this.updateCanvasSize(context)

        if (preventScrolling) {
            document.body.style.overflow = "hidden"
        }

        if ([
            gamePhase.ConstructionChoice,
            gamePhase.ConstructionAuto,
            gamePhase.ConstructionCustom
        ].includes(gameState.phase)) {
            return this.renderConstruction(gameState, context, touchInfo)
        }

        if (gameState.phase == gamePhase.Placing) {
            this.renderBoard(gameState, context, touchInfo,
                {drawBalls: false, drawGravity: false, drawConnectionLines: true})
            return this.renderPlacingTools(gameState, context, touchInfo)
        }

        if (gamePhase.isPlaying(gameState.phase)) {
            this.renderBoard(gameState, context, touchInfo, {drawSelection: false, drawGravity: false})
            if (challengeBalls !== undefined) {
                this.renderChallengeBalls(gameState, context, touchInfo, challengeBalls)
            }

            return this.renderBallInteractions(gameState, context, touchInfo)
        }

        return this.renderNothing(gameState, context, touchInfo)
    }

}