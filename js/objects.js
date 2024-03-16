const golfObjectType = {
    Start: "start",
    Hole: "hole",
    Lava: "lava",
    Eraser: "eraser",
}

const golfObjectTypeSpriteMap = {
    [golfObjectType.Start]: Sprite.Start,
    [golfObjectType.Hole]: Sprite.Hole,
    [golfObjectType.Lava]: Sprite.Lava,
    [golfObjectType.Eraser]: Sprite.Eraser
}

const golfObjectTypeDescriptionMap = {
    [golfObjectType.Start]: "Place where all balls start",
    [golfObjectType.Hole]: "Goal that all balls must reach",
    [golfObjectType.Lava]: "Balls touching Lava are reset to the start",
    [golfObjectType.Eraser]: "Erase placed Objects"
}

class GolfObject {

    constructor(type, pos, size, angle, uid, resizable) {
        this.type = type
        this.pos = pos ?? new Vector2d(0, 0)
        this.size = size ?? new Vector2d(40, 40)
        this.angle = angle ?? 0
        this.uid = uid ?? Math.random().toString().slice(2)
        this.resizable = resizable ?? false
    }

    get topLeftPos() {
        return this.pos.sub(this.size.scale(0.5))
    }

    get relativeCorners() {
        const halfSize = this.size.scale(0.5)
        return [
            halfSize.scale(-1),
            halfSize.scaleY(-1),
            halfSize,
            halfSize.scaleX(-1)
        ].map(v => v.rotate(this.angle))
    }

    get corners() {
        return this.relativeCorners.map(c => c.add(this.pos))
    }

    get dragCorner() {
        return this.pos.sub(this.size.scale(0.6).rotate(this.angle))
    }

    intersects(point) {
        const topLeft = this.topLeftPos
        topLeft.irotate(-this.angle)
        point.irotate(-this.angle)

        return (
            topLeft.x <= point.x && point.x <= (topLeft.x + this.size.x) &&
            topLeft.y <= point.y && point.y <= (topLeft.y + this.size.y)
        )
    }

    get radius() {
        // returns minimum radius of cirlce with origin
        // at this.pos that contains all corners of object
        // (all corners have same distance per definition)
        return this.topLeftPos.distance(this.pos)
    }

    set radius(newRadius) {
        this.size = this.size.normalized.scale(newRadius * 2)
    }

    toObject() {
        return {
            type: this.type,
            pos: this.pos.toObject(),
            size: this.size.toObject(),
            angle: this.angle,
            uid: this.uid,
            resizable: this.resizable
        }
    }

    static fromObject(obj) {
        return new GolfObject(
            obj.type, Vector2d.fromObject(obj.pos),
            Vector2d.fromObject(obj.size), obj.angle, obj.uid,
            obj.resizable
        )
    }

    get sprite() {
        return golfObjectTypeSpriteMap[this.type]
    }

    copy() {
        return GolfObject.fromObject(this.toObject())
    }

    setResizable(val) {
        this.resizable = val
        return this 
    }

    setSize(size) {
        this.size = size
        return this
    }

    get description() {
        return golfObjectTypeDescriptionMap[this.type]
    }

}

const placableObjects = [
    new GolfObject(golfObjectType.Start),
    new GolfObject(golfObjectType.Hole),
    new GolfObject(golfObjectType.Lava).setSize(new Vector2d(80, 80)).setResizable(true),
    new GolfObject(golfObjectType.Eraser),
]