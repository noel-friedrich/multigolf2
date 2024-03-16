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

    constructor(type, pos, size, angle, uid) {
        this.type = type
        this.pos = pos ?? new Vector2d(0, 0)
        this.size = size ?? new Vector2d(40, 40)
        this.angle = angle ?? 0
        this.uid = uid ?? Math.random().toString().slice(2)
    }

    toObject() {
        return {
            type: this.type,
            pos: this.pos.toObject(),
            size: this.size.toObject(),
            angle: this.angle,
            uid: this.uid,
        }
    }

    static fromObject(obj) {
        return new GolfObject(
            obj.type, Vector2d.fromObject(obj.pos),
            Vector2d.fromObject(obj.size), obj.angle, obj.uid
        )
    }

    get sprite() {
        return golfObjectTypeSpriteMap[this.type]
    }

}

const allGolfObjects = Object.values(golfObjectType).map(type => {
    return {type, description: golfObjectTypeDescriptionMap[type]}
})