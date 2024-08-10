class BoardStyling {

    constructor(gridSprite, customWallInner, customWallOuter, pullColor) {
        this.gridSprite = gridSprite ?? Sprite.Grid
        this.customWallInner = customWallInner ?? "white"
        this.customWallOuter = customWallOuter ?? "black"
        this.pullColor = pullColor ?? "rgba(0, 0, 0, 0.5)"
    }

    toObject() {
        return {
            g: this.gridSprite,
            i: this.customWallInner,
            o: this.customWallOuter,
            p: this.pullColor
        }
    }

    static fromObject(obj) {
        return new BoardStyling(
            obj.g, obj.i, obj.o, obj.p
        )
    }
    
}