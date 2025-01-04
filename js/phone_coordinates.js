class ConstructionLine {

    constructor(startPos, endPos) {
        this.startPos = startPos
        this.endPos = endPos
    }

    get start() {
        return this.startPos
    }

    get end() {
        return this.endPos
    }

    static fromObject(obj) {
        return new ConstructionLine(
            Vector2d.fromObject(obj.start),
            Vector2d.fromObject(obj.end)
        )
    }

    toObject() {
        return {
            start: this.startPos.toObject(),
            end: this.endPos.toObject()
        }
    }

}

class PhoneCoordinates {

    constructor(topLeft, topRight, bottomLeft, bottomRight, angle, scalar, gravity) {
        this.topLeft = topLeft
        this.topRight = topRight
        this.bottomLeft = bottomLeft
        this.bottomRight = bottomRight
        this.angle = angle ?? 0
        this.scalar = scalar ?? 1

        // gravity isn't adjusted for rotations and when read must be
        // rotated according to the device rotation in course
        // (this is because it's adjusted constantly throughout
        //  the game and would be a hassle to rotate before)
        this.gravity = gravity ?? new Vector2d(0, 0)
    }

    static fromWidthHeight(width, height) {
        return new PhoneCoordinates(
            new Vector2d(0, 0),
            new Vector2d(width, 0),
            new Vector2d(0, height),
            new Vector2d(width, height),
            0, 1,
            new Vector2d(0, 0)
        )
    }

    toObject() {
        return {
            coords: [
                this.topLeft.toObject(),
                this.topRight.toObject(),
                this.bottomLeft.toObject(),
                this.bottomRight.toObject(),
            ],
            angle: this.angle,
            scalar: this.scalar,
            gravity: this.gravity.toObject()
        }
    }

    static fromObject(obj) {
        return new PhoneCoordinates(
            ...obj.coords.map(coord => Vector2d.fromObject(coord)),
            obj.angle,
            obj.scalar,
            Vector2d.fromObject(obj.gravity)
        )
    }

    get points() {
        return [this.topLeft, this.topRight, this.bottomRight, this.bottomLeft]
    }

    get midPos() {
        return this.topLeft.add(this.bottomRight).scale(0.5)
    }

    randomPosInside() {
        const x = Math.random()
        const y = Math.random()

        return this.topLeft.add(this.topRight.sub(this.topLeft).scale(x))
            .add(this.bottomLeft.sub(this.topLeft).scale(y))
    }

    scale(scalar) {
        this.scalar *= scalar
        for (let vec of this.points) {
            vec.iscale(scalar)
        }
    }

    rotate(angle) {
        this.angle += angle
        for (let vec of this.points) {
            vec.irotate(angle)
        }
    }

    translate(point) {
        for (let vec of this.points) {
            vec.iadd(point)
        }
    }

    copy() {
        return PhoneCoordinates.fromObject(this.toObject())
    }

    get width() {
        // unrotated width
        const rotated1 = this.topLeft.rotate(-this.angle)
        const rotated2 = this.topRight.rotate(-this.angle)
        return rotated2.x - rotated1.x
    }

    get height() {
        // unrotated height
        const rotated1 = this.topLeft.rotate(-this.angle)
        const rotated2 = this.bottomLeft.rotate(-this.angle)
        return rotated2.y - rotated1.y
    }

    get area() {
        return this.size.x * this.size.y
    }

    creditCardScalingFactor(screenSize) {
        return this.height / screenSize.y
    }

    screenPosToBoardPos(screenPos, screenSize) {
        const scaledScreenPos = screenPos.copy()
        scaledScreenPos.iscaleX(this.width / screenSize.x)
        scaledScreenPos.iscaleY(this.height / screenSize.y)
        const pos = scaledScreenPos.rotate(this.angle)
        return this.topLeft.add(pos.scale(this.scalar))
    }

    boardPosToScreenPos(boardPos, screenSize) {
        const relativePos = boardPos.sub(this.topLeft).scale(1 / this.scalar)
        const rawScreenPos = relativePos.rotate(-this.angle)
        rawScreenPos.iscaleX(screenSize.x / this.width)
        rawScreenPos.iscaleY(screenSize.y / this.height)
        return rawScreenPos
    }

    containsPos(pos) {
        // assuming that this.angle is multiple of 90° (Math.PI / 2)
        const minX = Math.min(this.topLeft.x, this.bottomRight.x)
        const minY = Math.min(this.topLeft.y, this.bottomRight.y)
        const maxX = Math.max(this.topLeft.x, this.bottomRight.x)
        const maxY = Math.max(this.topLeft.y, this.bottomRight.y)
        return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY
    }

    distanceToPos(pos) {
        // assuming that this.angle is multiple of 90° (Math.PI / 2)
        const minX = Math.min(this.topLeft.x, this.bottomRight.x)
        const minY = Math.min(this.topLeft.y, this.bottomRight.y)
        const maxX = Math.max(this.topLeft.x, this.bottomRight.x)
        const maxY = Math.max(this.topLeft.y, this.bottomRight.y)
        const dx = Math.max(minX - pos.x, 0, pos.x - maxX)
        const dy = Math.max(minY - pos.y, 0, pos.y - maxY)
        return Math.sqrt(dx * dx + dy * dy)
    }

    get walls() {
        return [
            [this.points[0], this.points[1]],
            [this.points[1], this.points[2]],
            [this.points[2], this.points[3]],
            [this.points[3], this.points[0]],
        ]
    }

    get corners() {
        return this.points
    }

    get minXY() {
        return new Vector2d(
            Math.min(this.topLeft.x, this.bottomRight.x),
            Math.min(this.topLeft.y, this.bottomRight.y)
        )
    }

    get maxXY() {
        return new Vector2d(
            Math.max(this.topLeft.x, this.bottomRight.x),
            Math.max(this.topLeft.y, this.bottomRight.y)
        )
    }

    get minXmaxY() {
        return new Vector2d(
            Math.min(this.topLeft.x, this.bottomRight.x),
            Math.max(this.topLeft.y, this.bottomRight.y)
        )
    }

    get maxXminY() {
        return new Vector2d(
            Math.max(this.topLeft.x, this.bottomRight.x),
            Math.min(this.topLeft.y, this.bottomRight.y)
        )
    }

    get size() {
        return this.maxXY.sub(this.minXY)
    }

    hasOverlap(other) {
        for (const [p1, p2] of this.walls) {
            for (const [p3, p4] of other.walls) {
                const intersection = calcLineIntersection(p1, p2, p3, p4)
                if (intersection) return true
            }
        }
        return false
    }

    getOverlap(other) {
        const wallIntersections = []
        for (const [p1, p2] of this.walls) {
            for (const [p3, p4] of other.walls) {
                const intersection = calcLineIntersection(p1, p2, p3, p4)
                if (!intersection) continue
                wallIntersections.push(intersection)
            }
        }

        // find unique intersection points by combining
        // wallIntersections and insidePoints and 
        // adjusting for inaccuracies error using an epsilon
        const uniqueIntersections = []
        const epsilon = 0.1
        
        const insidePoints = this.points.filter(p => other.distanceToPos(p) < epsilon)
            .concat(other.points.filter(p => this.distanceToPos(p) < epsilon))
        
        for (const point of wallIntersections.concat(insidePoints)) {
            let foundSimilar = false
            for (const other of uniqueIntersections) {
                if (point.distance(other) < epsilon) {
                    foundSimilar = true
                    break
                }
            }
            if (!foundSimilar) {
                uniqueIntersections.push(point)
            }
        }

        if (uniqueIntersections.length == 4) {
            // we found an overlap!
            const minXY = new Vector2d(
                Math.min(...uniqueIntersections.map(p => p.x)),
                Math.min(...uniqueIntersections.map(p => p.y)),
            )
            const maxXY = new Vector2d(
                Math.max(...uniqueIntersections.map(p => p.x)),
                Math.max(...uniqueIntersections.map(p => p.y)),
            )
            const size = maxXY.sub(minXY)
            return new PhoneCoordinates(
                minXY, minXY.addX(size.x),
                minXY.addY(size.y), maxXY
            )
        } else {
            return null
        }
    }

}

let previousHue = null
class PhoneConnectionLine {

    getRandomColor() {
        const hue = Math.round(Math.random() * 360)
        
        // Avoid green-ish hues to avoid confusion with board color
        if (hue > 65 && hue < 185) {
            return this.getRandomColor()
        }

        const hueDiff = (a, b) => Math.abs((a - b + 540) % 360 - 180)
        if (previousHue !== null && hueDiff(hue, previousHue) < 60) {
            return this.getRandomColor()
        }

        previousHue = hue

        return `hsl(${hue}deg 100% 50%)`
    }

    constructor(start, end, color="random") {
        this.start = start ?? new Vector2d(0, 0)
        this.end = end ?? new Vector2d(1, 0)

        if (color == "random") {
            this.color = this.getRandomColor()
        } else {
            this.color = color
        }
    }

    get length() {
        return this.start.distance(this.end)
    }

    get points() {
        return [this.start, this.end]
    }

    translate(vec) {
        this.start.iadd(vec)
        this.end.iadd(vec)
        return this
    }

    rotate(angle) {
        for (let vec of this.points) {
            vec.irotate(angle)
        }
    }

    scale(scalar) {
        for (let vec of this.points) {
            vec.iscale(scalar)
        }
    }

    static fromObject(obj) {
        return new PhoneConnectionLine(
            Vector2d.fromObject(obj.start),
            Vector2d.fromObject(obj.end),
            obj.color
        )
    }

    toObject() {
        return {
            start: this.start.toObject(),
            end: this.end.toObject(),
            color: this.color
        }
    }

}

class Course {

    constructor(phones, lines) {
        this.phones = phones ?? []
        this.lines = lines ?? []
    }

    reset() {
        this.phones = []
        this.lines = []
    }

    toObject() {
        return {
            phones: this.phones.map(p => p.toObject()),
            lines: this.lines.map(l => l.toObject()),
        }
    }

    static fromObject(obj) {
        return new Course(
            obj.phones.map(p => PhoneCoordinates.fromObject(p)),
            obj.lines?.map(l => PhoneConnectionLine.fromObject(l))
        )
    }

    copy() {
        return Course.fromObject(this.toObject())
    }

    scale(scalar) {
        this.phones.forEach(p => p.scale(scalar))
        this.lines.forEach(l => l.scale(scalar))
    }

    rotate(angle) {
        this.phones.forEach(p => p.rotate(angle))
        this.lines.forEach(l => l.rotate(angle))
    }

    translate(point) {
        this.phones.forEach(p => p.translate(point))
        this.lines.forEach(l => l.translate(point))
    }

    addPhone(phone) {
        this.phones.push(phone)
    }

    addLine(line) {
        this.lines.push(line)
    }

    containsPos(pos) {
        return this.phones.some(p => p.containsPos(pos))
    }

    getOverlaps() {
        const overlaps = []
        for (let i = 0; i < this.phones.length; i++) {
            for (let j = 0; j < this.phones.length; j++) {
                if (i >= j) continue
                const overlap = this.phones[i].getOverlap(this.phones[j])
                if (overlap) {
                    overlaps.push(overlap)
                }
            }
        }
        return overlaps
    }

}