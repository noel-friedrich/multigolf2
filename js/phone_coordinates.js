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

    constructor(topLeft, topRight, bottomLeft, bottomRight, angle, scalar) {
        this.topLeft = topLeft
        this.topRight = topRight
        this.bottomLeft = bottomLeft
        this.bottomRight = bottomRight
        this.angle = angle
        this.scalar = scalar
    }

    static fromWidthHeight(width, height) {
        return new PhoneCoordinates(
            new Vector2d(0, 0),
            new Vector2d(width, 0),
            new Vector2d(0, height),
            new Vector2d(width, height),
            0, 1
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
            scalar: this.scalar
        }
    }

    static fromObject(obj) {
        return new PhoneCoordinates(
            ...obj.coords.map(coord => Vector2d.fromObject(coord)),
            obj.angle,
            obj.scalar
        )
    }

    get points() {
        return [this.topLeft, this.topRight, this.bottomRight, this.bottomLeft]
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

    screenPosToBoardPos(screenPos) {
        let pos = screenPos.rotate(this.angle)
        return this.topLeft.add(pos.scale(this.scalar))
    }

    boardPosToScreenPos(boardPos) {
        let pos = boardPos.sub(this.topLeft).scale(1 / this.scalar)
        return pos.rotate(-this.angle)
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

}

class Course {

    constructor(phones=[]) {
        this.phones = phones
    }

    toObject() {
        return {
            phones: this.phones.map(p => p.toObject())
        }
    }

    static fromObject(obj) {
        return new Course(obj.phones.map(p => PhoneCoordinates.fromObject(p)))
    }

    copy() {
        return Course.fromObject(this.toObject())
    }

    scale(scalar) {
        this.phones.forEach(p => p.scale(scalar))
    }

    rotate(angle) {
        this.phones.forEach(p => p.rotate(angle))
    }

    translate(point) {
        this.phones.forEach(p => p.translate(point))
    }

    addPhone(phone) {
        this.phones.push(phone)
    }

    containsPos(pos) {
        return this.phones.some(p => p.containsPos(pos))
    }

}