class Ball {

    constructor(pos, vel, inHole, radius, spriteUrl, kicks, active, uid, rotationAngle, lastImmobilePos, immobileTickCount, objectMemory, generallyAbleToCollide) {
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

        this.objectMemory = objectMemory ?? new Map() // {objectUid => dynamicMap<key, value>}
        this.generallyAbleToCollide = generallyAbleToCollide ?? true

        // the following properties will not be saved
        // and synced across devices
        this.outOfBoundsTickCount = 0
        this.movingTickCount = 0
    }

    toObject() {
        return {
            p: this.pos.toObject(),
            v: this.vel.toObject(),
            i: this.inHole,
            r: this.radius,
            s: this.spriteUrl,
            k: this.kicks,
            a: this.active,
            u: this.uid,
            ro: this.rotationAngle,
            l: this.lastImmobilePos,
            im: this.immobileTickCount,
            o: Array.from(this.objectMemory.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
            g: this.generallyAbleToCollide
        }
    }

    static fromObject(obj) {
        return new Ball(
            Vector2d.fromObject(obj.p),
            Vector2d.fromObject(obj.v),
            obj.i,
            obj.r,
            obj.s,
            obj.k,
            obj.a,
            obj.u,
            obj.ro,
            obj.l,
            obj.im,
            (obj.o !== undefined) ? new Map(obj.o.map(([k, v]) => [k, new Map(v)])) : new Map(),
            obj.g
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
            return {distance: p1.distance(point), closestPoint: p1.copy()}
        } else if (d > 1) {
            return {distance: p2.distance(point), closestPoint: p2.copy()}
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
        if (!this.readyToCollide(board) || !this.generallyAbleToCollide) {
            return
        }
        
        for (let ball of board.balls) {
            if (ball.uid == this.uid) {
                continue
            }

            if (!ball.readyToCollide(board) || !ball.generallyAbleToCollide) {
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
        this.rotationAngle = 0
        this.generallyAbleToCollide = true
    }

    interactWithLava(board, object) {
        if (!this.inHole) {
            if (window.AudioPlayer) {
                window.AudioPlayer.play(AudioSprite.Lava)
            }

            board.spawnParticleExplosion(this.pos,
                {forceSpeed: this.vel.length, color: "#f9480a"})

            return this.resetPos(board.startPos)
        }
    }

    interactWithCannon(board, object) {
        const objectData = this.getObjectMemory(object.uid)
        
        let cannonProgress = 0
        if (objectData.has("progress")) {
            cannonProgress = objectData.get("progress")
        } else {
            objectData.set("progress", cannonProgress)
        }

        const shootDir = Vector2d.fromAngle(object.angle + Math.PI / 2)
        const bellyPos = object.pos.add(shootDir.scale(-object.size.max() * 0.17))
        const nozzlePos = object.pos.add(shootDir.scale(object.size.max() * 0.37))

        const desiredPos = cannonProgress < 30 ? bellyPos
                           : cannonProgress < 100 ? bellyPos.interpolate(nozzlePos, (cannonProgress - 30) / 70)
                           : nozzlePos

        if (cannonProgress > 30 && cannonProgress < 100) {
            this.rotationAngle += 0.05
        }

        // rotation of cannon
        this.rotationAngle += 0.02244

        this.pos.iinterpolate(desiredPos, Math.min(cannonProgress / 50, 1))
        this.vel.iscale(0)

        this.generallyAbleToCollide = false

        if (cannonProgress >= 140) {
            this.vel.setVector2d(shootDir.scale(object.size.max() / 2))
            this.pos.iadd(shootDir.scale(object.size.max() / 2))
            this.resetObjectMemory(object.uid)

            for (let i = 0; i < 20; i++) {
                const particle = new Particle(nozzlePos.copy())
                particle.vel = shootDir.scale(10 + Math.random() * 10)
                particle.vel.irotate(Math.random() * 0.4 - 0.2)
                particle.color = "black"
                board.particles.push(particle)
            }

            if (window.AudioPlayer) {
                window.AudioPlayer.play(AudioSprite.Cannon)
            }

            this.generallyAbleToCollide = true
        }

        objectData.set("progress", cannonProgress + 1)
    }

    getObjectMemory(objectUid) {
        if (!this.objectMemory.has(objectUid)) {
            this.objectMemory.set(objectUid, new Map())
        }
        const objectData = this.objectMemory.get(objectUid)
        objectData.set("expire-count", 100)
        return objectData
    }

    resetObjectMemory(objectUid) {
        if (this.objectMemory.has(objectUid)) {
            this.objectMemory.delete(objectUid)
        }
    }

    updateObjectMemories() {
        for (const [objectUid, objectData] of this.objectMemory.entries()) {
            if (objectData.has("expire-count")) {
                const count = objectData.get("expire-count")
                objectData.set("expire-count", count - 1)
                if (count <= 1) {
                    this.objectMemory.delete(objectUid)
                }
            }
        }
    }

    interactStepWithObject(board, object) {
        switch(object.type) {
            case golfObjectType.Lava:
                return this.interactWithLava(board, object)
            case golfObjectType.Cannon:
                return this.interactWithCannon(board, object)
        }
    }

    physicsStep(board) {
        let madeWallCollision = false

        this.pos.iadd(this.vel)

        const touchingObjects = board.objects.filter(o => o.intersects(this.pos))
        for (const object of touchingObjects) {
            this.interactStepWithObject(board, object)
        }
        this.updateObjectMemories()

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

                madeWallCollision = true
            } else {
                for (const [p1, p2] of collidingObjects.filter(o => o.type == "wall").map(o => o.points)) {
                    this.pos.isub(this.vel)
                    this.vel = this._reflectAtWall(p1, p2, this.vel)
                    this.pos.iadd(this.vel.scale(0.8))
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