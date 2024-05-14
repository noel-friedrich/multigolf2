const golfObjectType = {
    Start: "Start",
    Hole: "Hole",
    Lava: "Lava",
    Eraser: "Eraser",
    DuellHole1: "Hole 1",
    DuellHole2: "Hole 2",
    CustomWall: "Extra Wall"
}

const golfObjectTypeSpriteMap = {
    [golfObjectType.Start]: Sprite.Start,
    [golfObjectType.Hole]: Sprite.Hole,
    [golfObjectType.Lava]: Sprite.Lava,
    [golfObjectType.Eraser]: Sprite.Eraser,
    [golfObjectType.DuellHole1]: Sprite.DuellHole1,
    [golfObjectType.DuellHole2]: Sprite.DuellHole2,
    [golfObjectType.CustomWall]: Sprite.CustomWall,
}

const golfObjectTypeDescriptionMap = {
    [golfObjectType.Start]: "Place where all balls start",
    [golfObjectType.Hole]: "Goal that all balls must reach",
    [golfObjectType.Lava]: "Balls touching Lava are reset to the start",
    [golfObjectType.Eraser]: "Erase placed Objects",
    [golfObjectType.DuellHole1]: "Goal that <duell-player-1> has to reach",
    [golfObjectType.DuellHole2]: "Goal that <duell-player-2> has to reach",
    [golfObjectType.CustomWall]: "A wall that balls will bounce off"
}

class GolfObject {

    constructor(type, pos, size, angle, uid, resizable) {
        this.type = type
        this.pos = pos ?? new Vector2d(0, 0)
        this.size = size ?? new Vector2d(40, 40)
        this.angle = angle ?? 0
        this.uid = uid ?? Math.random().toString().slice(2)
        this.resizable = resizable ?? false

        // local attribute, won't be exported
        // may be replaced with a function that returns
        // wether to give the option to place this object,
        // e.g. for duell ends which only make sense
        // when playing a duell
        this.visibility = () => true
    }

    get topLeftPos() {
        return this.pos.sub(this.size.scale(0.5).rotate(this.angle))
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

    get walls() {
        const corners = this.corners
        return [
            [corners[0], corners[1]],
            [corners[1], corners[2]],
            [corners[2], corners[3]],
            [corners[3], corners[0]],
        ]
    }

    get dragCorner() {
        return this.pos.sub(this.size.scale(0.6).rotate(this.angle))
    }

    intersects(point) {
        const topLeft = this.topLeftPos.rotate(-this.angle)
        const rotatedPoint = point.rotate(-this.angle)

        return (
            topLeft.x <= rotatedPoint.x && rotatedPoint.x <= (topLeft.x + this.size.x) &&
            topLeft.y <= rotatedPoint.y && rotatedPoint.y <= (topLeft.y + this.size.y)
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

    setVisibility(func) {
        this.visibility = func
        return this
    }

    get description() {
        return golfObjectTypeDescriptionMap[this.type]
    }

}

const placableObjects = [
    new GolfObject(golfObjectType.Start),
    new GolfObject(golfObjectType.Hole).setVisibility(gs => gs.mode != gameMode.Duell),
    new GolfObject(golfObjectType.Lava).setSize(new Vector2d(80, 80)).setResizable(true),
    new GolfObject(golfObjectType.CustomWall).setSize(new Vector2d(120, 40)).setResizable(true),
    new GolfObject(golfObjectType.Eraser),
    new GolfObject(golfObjectType.DuellHole1).setVisibility(gs => gs.mode == gameMode.Duell),
    new GolfObject(golfObjectType.DuellHole2).setVisibility(gs => gs.mode == gameMode.Duell),
]