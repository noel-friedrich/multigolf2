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
        this.particlesEnabled = particlesEnabled ?? false

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

    spawnParticleExplosion(pos, {color=undefined, forceSpeed=undefined, numParticles=50, radius=undefined}={}) {
        if (!this.particlesEnabled) {
            return
        }

        const plusminus = Math.ceil(numParticles * 0.3)
        numParticles += Math.round((Math.random() - 0.5) * 2 * plusminus)
        const angleStep = 1 / numParticles * Math.PI * 2

        for (let i = 0; i < numParticles; i++) {
            let speed = forceSpeed ?? 2
            speed *= 0.7 + Math.random() * 0.6

            const angle = (i + Math.random()) * angleStep
            const vel = Vector2d.fromAngle(angle).scale(speed)
            const particle = new Particle(pos.copy(), vel, color, radius)
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

    updateObjectPhysics() {
        for (const object of this.objects.filter(o => o.type == golfObjectType.Cannon)) {
            object.angle += 0.02
        }
    }

    physicsStep() {
        for (const ball of this.balls) {
            ball.updatePhysics(this)
        }

        for (const particle of this.particles) {
            particle.updatePhysics(this)
        }

        this.updateObjectPhysics()

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

        // if the device lags more than 10 seconds behind, catching up to normal
        // time will take too long to make sense. It was probably doing nothing anyways. (hopefully)
        if (Math.abs(this.physicsTime - maxTime) > 10 * 1000) {
            this.physicsTime = maxTime
        }
    }

    simulateStepsEfficiently(numSteps, {
        disableParticles = true
    }={}) {
        const prevParticlesEnabled = this.particlesEnabled
        if (disableParticles) {
            this.particlesEnabled = false
        }

        for (let i = 0; i < numSteps; i++) {
            this.physicsStep()
            this.physicsStepCount++

            for (const [eventIndex, callback] of this.physicsStepEvents) {
                if (eventIndex == this.physicsStepCount) {
                    callback()
                }
            }

            this.physicsStepEvents = this.physicsStepEvents.filter(([i, _]) => i > this.physicsStepCount)
        }

        this.particlesEnabled = prevParticlesEnabled 
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