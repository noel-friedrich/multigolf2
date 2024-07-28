const PARTICLE_MAX_TICKS = 100

class Particle {

    constructor(pos, vel, color, radius, ticksAlive) {
        this.pos = pos ?? new Vector2d(0, 0)
        this.vel = vel ?? new Vector2d(0, 0)
        this.color = color ?? "white"
        this.radius = radius ?? 10
        this.ticksAlive = 0
        this.alive = true
    }

    die() {
        this.alive = false
    }

    get opacity() {
        return Math.max(1 - this.ticksAlive / PARTICLE_MAX_TICKS, 0)
    }

    updatePhysics(board) {
        if (!this.alive) {
            return
        }

        this.pos.iadd(this.vel)
        if (!board.course.containsPos(this.pos)) {
            this.die()
        }
        
        if (this.ticksAlive > PARTICLE_MAX_TICKS) {
            this.die()
        }

        this.ticksAlive++
    }

    toObject() {
        return {
            p: this.pos.toObject(),
            v: this.vel.toObject(),
            c: this.color,
            r: this.radius,
            t: this.ticksAlive
        }
    }

    static fromObject(obj) {
        return new Particle(
            Vector2d.fromObject(obj.p),
            Vector2d.fromObject(obj.v),
            obj.c, obj.r, obj.t
        )
    }

}

class Ball {

    constructor(pos, vel, inHole, radius, spriteUrl, kicks, active, uid, rotationAngle, lastImmobilePos, immobileTickCount) {
        this.pos = pos
        this.vel = vel ?? new Vector2d(0, 0)

        this.inHole = inHole ?? false

        this.radius = radius ?? 18
        this.spriteUrl = spriteUrl ?? Sprite.BallWhite
        
        this.kicks = kicks ?? 0
        this.active = active ?? true
        this.uid = uid
        this.rotationAngle = rotationAngle ?? 0

        this.lastImmobilePos = lastImmobilePos ?? this.pos.copy()
        this.immobileTickCount = immobileTickCount ?? 0

        // the following properties will not be saved
        // and synced across devices
        this.outOfBoundsTickCount = 0
        this.movingTickCount = 0
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
            lastImmobilePos: this.lastImmobilePos,
            immobileTickCount: this.immobileTickCount
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
            obj.rotationAngle,
            obj.lastImmobilePos,
            obj.immobileTickCount
        )
    }

    kick(direction) {
        if (this.inHole) {
            return
        }
        
        this.vel.iadd(direction.scale(0.6))
        this.kicks++
        this.immobileTickCount = 0
        this.lastImmobilePos = this.pos.copy()

        if (window.AudioPlayer) {
            window.AudioPlayer.play(AudioSprite.Shot)
        }
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
                const {distance} = this._distanceToWall(p1, p2, pos)
                if (distance < smallestDistance) {
                    closestWall = [p1, p2]
                    smallestDistance = distance
                }
            }
        }

        return closestWall
    }

    _getCollidingCorners(board) {
        const walledObjects = board.course.phones
            .concat(board.objects.filter(o => o.type == golfObjectType.CustomWall))
        const collidingCorners = []

        for (const wallObject of walledObjects) {
            for (const corner of wallObject.corners) {
                const distance = corner.distance(this.pos)
                if (distance < this.radius) {
                    collidingCorners.push({
                        type: "corner",
                        distance, point: corner
                    })
                }
            }
        }

        return collidingCorners
    }

    _getCollidingWalls(board) {
        const walledObjects = board.course.phones
            .concat(board.objects.filter(o => o.type == golfObjectType.CustomWall))
        const collidingWalls = []
        
        const epsilon = 0.01
        for (let wallObject of walledObjects) {
            for (let [p1, p2] of wallObject.walls) {
                const {distance, closestPoint} = this._distanceToWall(p1, p2, this.pos)
                if (distance <= this.radius) {
                    // we need to check wether the closestPoint of the wall is
                    // on a connecting part between devices. We check by testing
                    // wether the closestPoint is 'inside' (including boundary)
                    // of multiple phones.
                    // Due to inaccurate coordinates, we need to check wether
                    // the device box contains the point up to an epsilon
                    // (due to floating point and wishy washy calculations)

                    let overlapCount = 0
                    for (const box of board.course.phones) {
                        const boxDist = box.distanceToPos(closestPoint)
                        if (boxDist < epsilon) {
                            overlapCount++
                            if (overlapCount > 1) {
                                break
                            }
                        }
                    }

                    if (overlapCount < 2) {
                        collidingWalls.push({
                            points: [p1, p2], distance,
                            type: "wall"
                        })
                    }
                }
            }
        }

        return collidingWalls
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
            return {distance: closestPoint.distance(point), closestPoint}
        }
    }

    _isInCustomWall(pos, board) {
        return board.objects.filter(o => o.type == golfObjectType.CustomWall)
            .some(o => o.intersects(pos))
    }

    _reflectAtWall(p1, p2, dir) {
        const wallDir = p2.sub(p1)
        const wallNormal = new Vector2d(-wallDir.y, wallDir.x)
        const angleDifference = dir.angle - wallNormal.angle
        return dir.rotate(-angleDifference * 2).scale(-1)
    }

    _getIntersectingObjects(board, objectType=null) {
        return board.objects.filter(o => {
            return o.intersects(this.pos) && (
                objectType == null || o.type == objectType
            )
        })
    }

    readyToCollide(board) {
        return !this.inHole && board.startPos.distance(this.pos) > 2 * this.radius
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

                // reset immobileTickCount for both
                ball.immobileTickCount = 0
                this.immobileTickCount = 0

                if (window.AudioPlayer) {
                    window.AudioPlayer.play(AudioSprite.Bonk)
                }
            }
        }
    }

    updatePhysics(board) {
        const stepCount = Math.max(Math.ceil(this.vel.length / 10), 1)
        let isUnderAcceleration = false

        // add gravity from current phone
        if (board.deviceGravityEnabled && this.isMoving() && !this.inHole) {
            for (let i = 0; i < board.course.phones.length; i++) {
                if (board.course.phones[i].containsPos(this.pos)) {
                    const gravity = board.course.phones[i].gravity
                        .rotate(board.course.phones[i].angle)
                    if (!gravity) break
                    if (gravity.length > 0) {
                        this.vel.iadd(gravity)
                        isUnderAcceleration = true
                    }
                    break
                }
            }
        }

        if (this.isMoving() && !this.inHole) {
            const gravityBoxes = this._getIntersectingObjects(board, golfObjectType.GravityBox)
            for (const box of gravityBoxes) {
                const gravity = Vector2d.fromAngle(box.angle - Math.PI / 2).scale(0.5)
                this.vel.iadd(gravity)
                isUnderAcceleration = true
            }
        }

        if (this.isMoving() && this.vel.length < 0.3 && !isUnderAcceleration) {
            this.vel.iscale(0)
        }

        this.vel.iscale(0.97)
        this.vel.iscale(1 / stepCount)
        for (let i = 0; i < stepCount; i++) {
            this.physicsStep(board)
        }
        this.vel.iscale(stepCount)

        // check if ball has moved from lastImmobilePos significantly.
        // (signifacntly = more than it's own radius)
        // if yes, reset the immobilecounter, else increse it.
        // after the immobilecounter reaches a certain threashold,
        // we set the velocity to 0, meaning that no gravity will be
        // applied anymore. We do this to prevent ball bouncing
        // indefinitely under influence of semi-constant gravity 

        if (this.pos.distance(this.lastImmobilePos) > this.radius) {
            this.immobileTickCount = 0
            this.lastImmobilePos = this.pos.copy()
        } else {
            this.immobileTickCount++
        }

        // aprox. 2 seconds before it's considered stuck
        if (this.immobileTickCount > 60 * 2 && this.isMoving()) {
            this.vel.iscale(0)
        }

        if (!board.course.containsPos(this.pos) ||
            board.objects.filter(o => o.type == golfObjectType.CustomWall)
                .some(o => o.intersects(this.pos))) {
            // if the ball is out of bounds too long,
            // something went horribly wrong and we reset
            // him to the start
            
            this.outOfBoundsTickCount++
            if (this.outOfBoundsTickCount > 10) {
                this.resetPos(board.startPos)
                this.outOfBoundsTickCount = 0
            }
        } else {
            this.outOfBoundsTickCount = 0
        }

        if (this.isMoving()) {
            // if the ball is moving for more than
            // ~10 seconds, we stop it. causes for 
            // this could be gravity box loops
            // or other things that are too difficult
            // to prevent or detect, and this solves the 
            // ball from moving indefinitely
            // and thus the turn never ending.
            this.movingTickCount++
            if (this.movingTickCount > 60 * 10) {
                this.vel.iscale(0)
            }
        } else {
            this.movingTickCount = 0
        }
    }

    resetPos(startPos) {
        this.pos = startPos.copy()
        this.vel.iscale(0)
        this.angle = 0
    }

    physicsStep(board) {
        let madeWallCollision = false

        this.pos.iadd(this.vel)

        const inLava = board.objects.filter(o => o.type == golfObjectType.Lava)
            .some(o => o.intersects(this.pos))

        if (inLava && !this.inHole) {
            if (window.AudioPlayer) {
                window.AudioPlayer.play(AudioSprite.Lava)
            }

            return this.resetPos(board.startPos)
        }

        const collidingObjects = this._getCollidingCorners(board).concat(this._getCollidingWalls(board))
        collidingObjects.sort((a, b) => a.distance - b.distance)

        if (collidingObjects.length > 0) {
            if (collidingObjects[0].type == "corner") {
                const collidingCorner = collidingObjects[0].point

                // corner collisions solved using quick mafs
                // https://gamedev.stackexchange.com/questions/10911/a-ball-hits-the-corner-where-will-it-deflect
                const cornerDir = this.pos.sub(collidingCorner)
                const collisionStrength = -2 * this.vel.dot(cornerDir) / cornerDir.squaredLength
                
                this.pos.isub(this.vel)
                this.vel.iadd(cornerDir.scale(collisionStrength))
                this.pos.iadd(this.vel.scale(0.95))

                board.spawnParticleExplosion(collidingCorner)

                madeWallCollision = true
            } else {
                for (const [p1, p2] of collidingObjects.filter(o => o.type == "wall").map(o => o.points)) {
                    this.pos.isub(this.vel)
                    this.vel = this._reflectAtWall(p1, p2, this.vel)
                    this.pos.iadd(this.vel.scale(0.8))
                    const { closestPoint } = this._distanceToWall(p1, p2, this.pos)
                    board.spawnParticleExplosion(closestPoint, {speedFactor: this.vel.length / 5})
                }
            }

            madeWallCollision = true
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

                if (window.AudioPlayer) {
                    window.AudioPlayer.play(AudioSprite.WinSound)
                }
            }
        }

        if (this.inHole) {
            this.radius = Math.max(0, this.radius - 0.13)
            this.pos = this.pos.lerp(endPos, 0.1)
            this.rotationAngle += 0.4
            this.vel.iscale(0.8)
        } else {
            this.rotationAngle += this.vel.length / 40
        }

        if (madeWallCollision && window.AudioPlayer) {
            window.AudioPlayer.randomNote({
                volume: Math.min(this.vel.length / 10 * 0.9 + 0.1, 1.)
            })
        }
    }

    translate(point) {
        this.pos.iadd(point)
    }

    scale(scalar) {
        this.radius *= scalar
        this.pos.iscale(scalar)
    }

    rotate(angle) {
        this.pos.irotate(angle)
        this.angle += angle
    }

}

class Board {

    static physicsTimestep = 17 // approximately 60 fps

    constructor(course, objects, balls, physicsTime, ballCollisionEnabled, deviceGravityEnabled, particlesEnabled, particles) {
        this.course = course ?? new Course()
        this.objects = objects ?? []
        this.balls = balls ?? []
        this.particles = particles ?? []
        this.physicsTime = physicsTime ?? Date.now()

        this.ballCollisionEnabled = ballCollisionEnabled ?? true
        this.deviceGravityEnabled = deviceGravityEnabled ?? true
        this.particlesEnabled = particlesEnabled ?? true

        // the following properties will not be
        // exported and thus not sent to clients
        // (as they are only useful for host)

        this.constructionLineBuffer = []
        this.courseHistory = [this.course.copy()]
        
        this.physicsStepCount = 0
        this.physicsStepEvents = []
    }

    resetConfig() {
        this.balls = []
        this.objects = []
        this.course.reset()
        this.courseHistory = [this.course.copy()]
    }

    addPhysicsEvent(callback, relativeStepIndex) {
        this.physicsStepEvents.push([this.physicsStepCount + relativeStepIndex, callback])
    }

    spawnParticleExplosion(pos, {color=undefined, speedFactor=1, numParticles=30}={}) {
        const plusminus = Math.ceil(numParticles * 0.3)
        numParticles += Math.round((Math.random() - 0.5) * 2 * plusminus)

        for (let i = 0; i < numParticles; i++) {
            const speed = Math.random() * 0.5 + 2
            const angle = i / numParticles * Math.PI * 2
            const vel = Vector2d.fromAngle(angle).scale(speed).scale(speedFactor)
            const particle = new Particle(pos.copy(), vel, color)
            this.particles.push(particle)
        }
    }

    clearPhysicsEvents() {
        this.physicsStepEvents.splice(0, this.physicsStepEvents.length)
    }

    get movableThings() {
        return this.objects.concat(this.balls).concat([this.course])
    }

    translate(point) {
        for (const thing of this.movableThings) {
            thing.translate(point)
        }
    }

    rotate(angle) {
        for (const thing of this.movableThings) {
            thing.rotate(angle)
        }
    }

    scale(scalar) {
        for (const thing of this.movableThings) {
            thing.scale(scalar)
        }
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

    intersectObject(pos) {
        // iterate backwards because of drawing order
        for (let i = this.objects.length - 1; i >= 0; i--) {
            if (this.objects[i].intersects(pos)) {
                return this.objects[i]
            }
        }
        return null
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
        for (const particle of this.particles) {
            particle.updatePhysics(this)
        }

        this.particles = this.particles.filter(p => p.alive)

        this.physicsTime += Board.physicsTimestep
    }

    updatePhysics(maxTime=Date.now(), maxSteps=500) {
        let stepCount = 0
        while (stepCount < maxSteps && this.physicsTime < maxTime) {
            this.physicsStep()
            this.physicsStepCount++
            stepCount++

            for (const [eventIndex, callback] of this.physicsStepEvents) {
                if (eventIndex == this.physicsStepCount) {
                    callback()
                }
            }

            this.physicsStepEvents = this.physicsStepEvents.filter(([i, _]) => i > this.physicsStepCount)
        }
    }

    spawnBall({
        spriteUrl = "random"
    }={}) {
        if (!this.startPos) {
            throw new Error("StartPos must be set before spawning ball")
        }

        if (spriteUrl == "random") {
            spriteUrl = AllBallSprites[Math.floor(Math.random() * AllBallSprites.length)]
        }

        const ball = new Ball(
            this.startPos.copy(), new Vector2d(0, 0),
            false, 18, spriteUrl, 0, true,
            Math.random().toString().slice(2), 0
        )

        this.balls.push(ball)
        return ball
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
            ballCollisionEnabled: this.ballCollisionEnabled,
            deviceGravityEnabled: this.deviceGravityEnabled,
            particlesEnabled: this.particlesEnabled,
            particles: this.particles.map(p => p.toObject())
        }
    }

    static fromObject(obj) {
        return new Board(
            Course.fromObject(obj.course),
            obj.objects.map(o => GolfObject.fromObject(o)),
            obj.balls.map(b => Ball.fromObject(b)),
            obj.physicsTime, obj.ballCollisionEnabled,
            obj.deviceGravityEnabled, obj.particlesEnabled,
            obj.particles?.map(p => Particle.fromObject(p))
        )
    }

    get currPhoneIndex() {
        return Math.max(1, this.course.phones.length)
    }

    parseConstructionLines() {
        this.constructionLineBuffer = this.constructionLineBuffer
            .filter(c => Date.now() - c.timestamp < 2500)
        
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
        
        if (a.deviceIndex < this.currPhoneIndex) {
            // delete all existing connections (after and including the one we are modifying)
            while (this.course.phones.length > parseInt(a.deviceIndex) && this.courseHistory.length > 1) {
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
        this.course.addLine(new PhoneConnectionLine(b.line.startPos, b.line.endPos))
        this.courseHistory.push(this.course.copy())

        return true
    }

    copy() {
        return Board.fromObject(this.toObject())
    }

}