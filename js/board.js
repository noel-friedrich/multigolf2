class Ball {

    constructor(pos, vel, inHole, radius, spriteUrl, kicks, active, uid, rotationAngle) {
        this.pos = pos
        this.vel = vel ?? new Vector2d(0, 0)

        this.inHole = inHole ?? false
        this.radius = radius ?? 18
        this.spriteUrl = spriteUrl ?? Sprite.BallWhite

        
        this.kicks = kicks ?? 0
        this.active = active ?? true
        this.uid = uid
        this.rotationAngle = rotationAngle ?? 0

        // the following properties will not be saved
        // and synced across devices
        this.outOfBoundsTickCount = 0
    }

    toObject() {
        return {
            pos: this.pos.toObject(),
            vel: this.vel.toObject(),
            inHole: this.inHole,
            radius: this.radius,
            spriteUrl: this.spriteUrl,
            kicks: this.kicks,
            active: this.active,
            uid: this.uid,
            rotationAngle: this.rotationAngle,
        }
    }

    static fromObject(obj) {
        return new Ball(
            Vector2d.fromObject(obj.pos),
            Vector2d.fromObject(obj.vel),
            obj.inHole,
            obj.radius,
            obj.spriteUrl,
            obj.kicks,
            obj.active,
            obj.uid,
            obj.rotationAngle
        )
    }

    kick(direction) {
        this.vel.iadd(direction)
        this.kicks++
    }

    isMoving() {
        return this.vel.length > 0
    }

    _getClosestWall(pos, board) {
        let closestWall = null
        let smallestDistance = Infinity

        const walledObjects = board.course.phones
            .concat(board.objects.filter(o => o.type == golfObjectType.CustomWall))

        for (let wallObject of walledObjects) {
            for (let [p1, p2] of wallObject.walls) {
                const distanceToWall = this._distanceToWall(p1, p2, pos)
                if (distanceToWall < smallestDistance) {
                    closestWall = [p1, p2]
                    smallestDistance = distanceToWall
                }
            }
        }

        return closestWall
    }

    _getClosestEndPos(pos, board) {
        let closestPos = board.endPositions[0]
        let smallestDistance = Infinity

        for (let endPos of board.endPositions) {
            const distance = endPos.distance(pos)
            if (distance < smallestDistance) {
                smallestDistance = distance
                closestPos = endPos
            }
        }

        return closestPos.copy()
    }

    _distanceToWall(p1, p2, point) {
        let p2toP1 = p2.sub(p1)
        let p2toPoint = point.sub(p1)
        let d = p2toP1.dot(p2toPoint) / (p2toP1.length ** 2)

        if (d < 0) {
            return p1.distance(point)
        } else if (d > 1) {
            return p2.distance(point)
        } else {
            let closestPoint = p1.add(p2toP1.scale(d))
            return closestPoint.distance(point)
        }
    }

    _isInCustomWall(pos, board) {
        return board.objects.filter(o = o.type == golfObjectType.CustomWall)
            .some(o => o.intersects(pos))
    }

    _reflectAtWall(p1, p2, dir) {
        const wallDir = p2.sub(p1)
        const wallNormal = new Vector2d(-wallDir.y, wallDir.x)
        const angleDifference = dir.angle - wallNormal.angle
        return dir.rotate(-angleDifference * 2).scale(-1)
    }

    readyToCollide(board) {
        return board.startPos.distance(this.pos) > 2 * this.radius
    }

    calcBallCollisions(board) {
        if (!this.readyToCollide(board)) {
            return
        }
        
        for (let ball of board.balls) {
            if (ball.uid == this.uid) {
                continue
            }

            if (!ball.readyToCollide(board)) {
                continue
            }

            const collision = ball.pos.distance(this.pos) <= (ball.radius + this.radius)

            if (collision) {
                // https://en.wikipedia.org/wiki/Elastic_collision
                const [v1, v2, x1, x2] = [this.vel, ball.vel, this.pos, ball.pos]
                const v1p = v1.sub(x1.sub(x2).scale(v1.sub(v2).dot(x1.sub(x2)) / (x1.sub(x2).length ** 2)))
                const v2p = v2.sub(x2.sub(x1).scale(v2.sub(v1).dot(x2.sub(x1)) / (x2.sub(x1).length ** 2)))
                
                this.vel = v1p
                ball.vel = v2p
                this.pos.iadd(this.vel)
                ball.pos.iadd(ball.vel)
            }
        }
    }

    updatePhysics(board) {
        const stepCount = Math.max(Math.ceil(this.vel.length / 10), 1)
        this.vel.iscale(1 / stepCount)
        for (let i = 0; i < stepCount; i++) {
            this.physicsStep(board)
        }
        this.vel.iscale(stepCount)
        this.vel.iscale(0.95)
    }

    physicsStep(board) {
        this.pos.iadd(this.vel)
        if (this.vel.length < 0.05) {
            this.vel.iscale(0)
        }

        const inLava = board.objects.filter(o => o.type == golfObjectType.Lava)
            .some(o => o.intersects(this.pos))

        if (inLava && !this.inHole) {
            this.pos = board.startPos.copy()
            this.vel.iscale(0)
            return
        }

        const outOfBounds = !board.course.containsPos(this.pos)

        if (outOfBounds) {
            this.outOfBoundsTickCount++
            if (this.outOfBoundsTickCount > 10) {
                this.pos = board.startPos.copy()
                this.vel.iscale(0)
                return
            }
        } else {
            this.outOfBoundsTickCount = 0
        }

        if (outOfBounds || this._isInCustomWall(this.pos, board)) {
            const [p1, p2] = this._getClosestWall(this.pos, board)
            this.pos.isub(this.vel)
            this.vel = this._reflectAtWall(p1, p2, this.vel)
            this.pos.iadd(this.vel)
        }

        if (board.ballCollisionEnabled) {
            this.calcBallCollisions(board)
        }
        
        const endPos = this._getClosestEndPos(this.pos, board)
        if (endPos && !this.inHole) {
            const distance = endPos.distance(this.pos)
            // you may ask why 1.35 and 40? But please don't
            if (distance <= this.radius * 1.35 && this.vel.length < 40) {
                this.inHole = true
            }
        }

        if (this.inHole) {
            this.radius = Math.max(0, this.radius - 0.1)
            this.pos = this.pos.lerp(endPos, 0.1)
            this.rotationAngle += 0.4
        } else {
            this.rotationAngle += this.vel.length / 40
        }
    }

}

class Board {

    static physicsTimestep = 30

    constructor(course, objects, balls, physicsTime, ballCollisionEnabled) {
        this.course = course ?? new Course()
        this.objects = objects ?? []
        this.balls = balls ?? []
        this.physicsTime = physicsTime ?? Date.now()
        this.ballCollisionEnabled = ballCollisionEnabled ?? true

        // the following properties will not be
        // exported and thus not sent to clients
        // (as they are only useful for host)
        this.constructionLineBuffer = []
        this.courseHistory = [this.course.copy()]
    }

    updateObject(object) {
        // find the object and replace it with new one,
        // return wether object was found
        for (let i = 0; i < gameState.board.objects.length; i++) {
            if (gameState.board.objects[i].uid == object.uid) {
                gameState.board.objects[i] = object
                return true
            }
        }
        return false
    }

    getClosestObject(pos) {
        let smallestDistance = Infinity
        let closestObject = null
        for (let object of this.objects) {
            const distance = pos.distance(object.pos)
            if (distance < smallestDistance) {
                smallestDistance = distance
                closestObject = object
            }
        }
        return closestObject
    }

    get startPos() {
        const startObject = this.objects.find(o => o.type == golfObjectType.Start)
        if (startObject) {
            return startObject.pos
        } else {
            return undefined
        }
    }

    get endPositions() {
        return this.objects.filter(o => (
            o.type == golfObjectType.Hole
            || o.type == golfObjectType.DuellHole1
            || o.type == golfObjectType.DuellHole2
            )).map(o => o.pos)
    }

    physicsStep() {
        for (const ball of this.balls) {
            ball.updatePhysics(this)
        }
        this.physicsTime += Board.physicsTimestep
    }

    updatePhysics() {
        this.physicsStep()
    }

    spawnBall({
        spriteUrl = "random"
    }={}) {
        if (!this.startPos) {
            throw new Error("StartPos must be set before spawning ball")
        }

        if (spriteUrl == "random") {
            spriteUrl = Sprite.AllBalls[Math.floor(Math.random() * Sprite.AllBalls.length)]
        }

        this.balls.push(new Ball(
            this.startPos.copy(), new Vector2d(0, 0),
            false, 18, spriteUrl, 0, true,
            Math.random().toString().slice(2), 0
        ))
    }

    addConstructionLine(line, phone, timestamp, deviceIndex) {
        this.constructionLineBuffer.push({
            line, phone, timestamp, deviceIndex})
        
        this.parseConstructionLines()
    }

    toObject() {
        return {
            course: this.course.toObject(),
            objects: this.objects.map(o => o.toObject()),
            balls: this.balls.map(b => b.toObject()),
            physicsTime: this.physicsTime,
            ballCollisionEnabled: this.ballCollisionEnabled
        }
    }

    static fromObject(obj) {
        return new Board(
            Course.fromObject(obj.course),
            obj.objects.map(o => GolfObject.fromObject(o)),
            obj.balls.map(b => Ball.fromObject(b)),
            obj.physicsTime, obj.ballCollisionEnabled
        )
    }

    get currPhoneIndex() {
        return Math.max(1, this.course.phones.length)
    }

    parseConstructionLines() {
        this.constructionLineBuffer = this.constructionLineBuffer
            .filter(c => Date.now() - c.timestamp < 5000)
        
        if (this.constructionLineBuffer.length < 2) {
            return
        }

        const removeIndeces = new Set()
        for (let i = 0; i + 1 < this.constructionLineBuffer.length; i++) {
            let a = this.constructionLineBuffer[i]
            let b = this.constructionLineBuffer[i + 1]

            if (a.deviceIndex > b.deviceIndex) {
                [a, b] = [b, a] // swap values, make sure {a} has smaller deviceIndex
            }

            if (!this.connectTwoConstructionLines(a, b)) {
                removeIndeces.add(i)
            }
        }

        this.constructionLineBuffer = this.constructionLineBuffer
            .filter((_, i) => !removeIndeces.has(i))
    }

    connectTwoConstructionLines(a, b) {
        if (a.deviceIndex > this.currPhoneIndex || a.deviceIndex == b.deviceIndex) {
            return false
        }
        
        // delete all existing connections (after and including the one we are modifying)
        if (a.deviceIndex < this.currPhoneIndex) {
            while (this.course.phones.length > parseInt(a.deviceIndex)) {
                this.courseHistory.pop()
                this.course = this.courseHistory.slice(-1)[0].copy()
            }
        }

        if (this.course.phones.length == 0) {
            this.course = new Course([a.phone.copy()])
            this.courseHistory.push(this.course.copy())
        }

        const deltaA = a.line.endPos.sub(a.line.startPos)
        const deltaB = b.line.endPos.sub(b.line.startPos)

        const originA = a.line.startPos.copy()
        const originB = b.line.startPos.copy()

        // in the following, we will scale, rotate and translate
        // the existing course to fit the new phone (b) to it
        // and match sizing, rotation and translation

        // scale
        this.course.scale(deltaB.length / deltaA.length)
        originA.iscale(deltaB.length / deltaA.length)

        // rotate
        this.course.rotate(deltaB.angle - deltaA.angle)
        originA.irotate(deltaB.angle - deltaA.angle)

        // translate
        this.course.translate(originB.sub(originA))

        this.course.addPhone(b.phone.copy())
        this.courseHistory.push(this.course.copy())

        return true
    }

}