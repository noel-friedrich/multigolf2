const golfObjectType = {
    Start: "Start",
    Hole: "Hole",
    Lava: "Lava",
    Cannon: "Cannon",
    Eraser: "Eraser",
    DuellHole1: "Hole 1",
    DuellHole2: "Hole 2",
    CustomWall: "Extra Wall",
    GravityBox: "Gravity Box"
}

let golfObjectTypeSpriteMap = {
    [golfObjectType.Start]: Sprite.Start,
    [golfObjectType.Hole]: Sprite.Hole,
    [golfObjectType.Lava]: Sprite.Lava,
    [golfObjectType.Cannon]: Sprite.Cannon,
    [golfObjectType.Eraser]: Sprite.Eraser,
    [golfObjectType.DuellHole1]: Sprite.DuellHole1,
    [golfObjectType.DuellHole2]: Sprite.DuellHole2,
    [golfObjectType.CustomWall]: Sprite.CustomWall,
    [golfObjectType.GravityBox]: Sprite.GravityBox
}

class GolfObject {

    static makeRandomUid() {
        return Math.random().toString().slice(2)   
    }

    constructor(type, pos, size, angle, uid, resizable) {
        this.type = type
        this.pos = pos ?? new Vector2d(0, 0)
        this.size = size ?? new Vector2d(40, 40)
        this.angle = angle ?? 0
        this.uid = uid ?? GolfObject.makeRandomUid()
        this.resizable = resizable ?? false

        // local attribute, won't be exported
        // may be replaced with a function that returns
        // wether to give the option to place this object,
        // e.g. for duell ends which only make sense
        // when playing a duell
        this.visibility = () => true
    }

    setPos(pos) {
        this.pos = pos
        return this
    }

    translate(point) {
        this.pos.iadd(point)
    }

    rotate(angle) {
        this.pos.irotate(angle)
        this.angle += angle
    }

    scale(scalar) {
        this.pos.iscale(scalar)
        this.size.iscale(scalar)
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

    getInnerCorners(innerCornerDistance) {
        const corners = this.corners
        const innerCorners = []
        for (let i = 0; i < corners.length; i++) {
            const prevCorner = corners[i > 0 ? i - 1 : corners.length - 1]
            const currCorner = corners[i]
            const nextCorner = corners[(i + 1) % corners.length]
            const prevDelta = prevCorner.sub(currCorner).normalized
            const nextDelta = nextCorner.sub(currCorner).normalized
            const innerNormDelta = prevDelta.add(nextDelta).normalized
            const innerPoint = currCorner.add(innerNormDelta.scale(innerCornerDistance))
            innerCorners.push(innerPoint)
        }
        return innerCorners
    }

    get dragCorner() {
        return this.getInnerCorners(-10)[0]
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
            t: this.type,
            p: this.pos.toObject(),
            s: this.size.toObject(),
            a: this.angle,
            u: this.uid,
            r: this.resizable
        }
    }

    static fromObject(obj) {
        return new GolfObject(
            obj.t ?? obj.type,
            Vector2d.fromObject(obj.p ?? obj.pos),
            Vector2d.fromObject(obj.s ?? obj.size),
            obj.a ?? obj.angle,
            obj.u ?? obj.uid,
            obj.r ?? obj.resizable
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

    setAngle(angle) {
        this.angle = angle
        return this
    }

    setVisibility(func) {
        this.visibility = func
        return this
    }

    get name() {
        switch (this.type) {
            case golfObjectType.Start:
                return Text.ObjectStart
            case golfObjectType.Hole:
                return Text.ObjectHole
            case golfObjectType.Lava:
                return Text.ObjectLava
            case golfObjectType.Cannon:
                return Text.ObjectCannon
            case golfObjectType.Eraser:
                return Text.ObjectEraser
            case golfObjectType.DuellHole1:
                return Text.ObjectDuellHole("1")
            case golfObjectType.DuellHole2:
                return Text.ObjectDuellHole("2")
            case golfObjectType.CustomWall:
                return Text.ObjectCustomWall
            case golfObjectType.GravityBox:
                return Text.ObjectGravityBox
        }
        return ""
    }

    get description() {
        switch (this.type) {
            case golfObjectType.Start:
                return Text.ObjectStartDescription
            case golfObjectType.Hole:
                return Text.ObjectHoleDescription
            case golfObjectType.Lava:
                return Text.ObjectLavaDescription
            case golfObjectType.Cannon:
                return Text.ObjectCannonDescription
            case golfObjectType.Eraser:
                return Text.ObjectEraserDescriptiom
            case golfObjectType.DuellHole1:
                return Text.ObjectDuellHoleDescription("<duell-player-1>")
            case golfObjectType.DuellHole2:
                return Text.ObjectDuellHoleDescription("<duell-player-2>")
            case golfObjectType.CustomWall:
                return Text.ObjectCustomWallDescription
            case golfObjectType.GravityBox:
                return Text.ObjectGravityBoxDescription
        }
        return ""
    }

    static makeDefault(type) {
        const obj = defaultObjects[type].copy()
        obj.uid = GolfObject.makeRandomUid()
        return obj
    }

}

const placableObjects = [
    new GolfObject(golfObjectType.Start),
    new GolfObject(golfObjectType.Hole).setVisibility(gs => gs.mode != gameMode.Duell),
    new GolfObject(golfObjectType.Lava).setSize(new Vector2d(80, 80)).setResizable(true),
    new GolfObject(golfObjectType.Cannon).setSize(new Vector2d(80, 80)),
    new GolfObject(golfObjectType.CustomWall).setSize(new Vector2d(120, 40)).setResizable(true),
    new GolfObject(golfObjectType.GravityBox).setSize(new Vector2d(80, 80)).setResizable(true),
    new GolfObject(golfObjectType.DuellHole1).setVisibility(gs => gs.mode == gameMode.Duell),
    new GolfObject(golfObjectType.DuellHole2).setVisibility(gs => gs.mode == gameMode.Duell),
    new GolfObject(golfObjectType.Eraser),
]

const defaultObjects = {
    [golfObjectType.Start]: placableObjects[0],
    [golfObjectType.Hole]: placableObjects[1],
    [golfObjectType.Lava]: placableObjects[2],
    [golfObjectType.Cannon]: placableObjects[3],
    [golfObjectType.CustomWall]: placableObjects[4],
    [golfObjectType.GravityBox]: placableObjects[5],
    [golfObjectType.DuellHole1]: placableObjects[6],
    [golfObjectType.DuellHole2]: placableObjects[7],
}