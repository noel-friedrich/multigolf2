const Sprite = {
    // PIXELATED SPRITES:
    BallBlue:      "../assets/compressed/objects/balls/blue.png",
    BallCyan:      "../assets/compressed/objects/balls/cyan.png",
    BallLightblue: "../assets/compressed/objects/balls/light_blue.png",
    BallOrange:    "../assets/compressed/objects/balls/orange.png",
    BallPink:      "../assets/compressed/objects/balls/pink.png",
    BallRed:       "../assets/compressed/objects/balls/red.png",
    BallViolet:    "../assets/compressed/objects/balls/violet.png",
    BallWhite:     "../assets/compressed/objects/balls/white.png",
    BallYellow:    "../assets/compressed/objects/balls/yellow.png",
    BallRainbow:   "../assets/compressed/objects/balls/rainbow.png",
    Grid:          "../assets/compressed/objects/grid.png",
    Hole:          "../assets/compressed/objects/hole.png",
    Start:         "../assets/compressed/objects/start.png",
    DuellHole1:    "../assets/compressed/objects/duellHole1.png",
    DuellHole2:    "../assets/compressed/objects/duellHole2.png",
    Lava:          "../assets/compressed/objects/lava.png",
    Cannon:        "../assets/compressed/objects/cannon.png",
    GravityBox:    "../assets/compressed/objects/gravity-box.png",

    // NON PIXELATED SPRITES:
    /* BallBlue:      "../assets/objects/balls/blue.svg",
    BallCyan:      "../assets/objects/balls/cyan.svg",
    BallLightblue: "../assets/objects/balls/light_blue.svg",
    BallOrange:    "../assets/objects/balls/orange.svg",
    BallPink:      "../assets/objects/balls/pink.svg",
    BallRed:       "../assets/objects/balls/red.svg",
    BallViolet:    "../assets/objects/balls/violet.svg",
    BallWhite:     "../assets/objects/balls/white.svg",
    BallYellow:    "../assets/objects/balls/yellow.svg",
    BallRainbow:   "../assets/objects/balls/rainbow.svg",
    Grid:          "../assets/objects/grid.svg",
    Hole:          "../assets/objects/hole.svg",
    Start:         "../assets/objects/start.svg",
    DuellHole1:    "../assets/objects/duellHole1.svg",
    DuellHole2:    "../assets/objects/duellHole2.svg",
    Lava:          "../assets/objects/lava.svg",
    Cannon:        "../assets/objects/cannon.svg",
    GravityBox:    "../assets/objects/gravity-box.svg", */

    Eraser:        "../assets/objects/eraser.svg",
    ZoomIcon:      "../assets/zoom-icon.svg",
    CustomWall:    "../assets/objects/wall.svg",
}

const AudioSprite = {
    Plop: "../assets/audio/plop.mp3",
    WinSound: "../assets/audio/win_sound.mp3",
    Lava: "../assets/audio/lava.mp3",
    Bonk: "../assets/audio/bonk.mp3",
    Shot: "../assets/audio/shot.mp3",
    Cannon: "../assets/audio/cannon.mp3",
    Note1: "../assets/audio/notes/1.mp3",
    Note2: "../assets/audio/notes/2.mp3",
    Note3: "../assets/audio/notes/3.mp3",
    Note4: "../assets/audio/notes/4.mp3",
    Note5: "../assets/audio/notes/5.mp3",
    Note6: "../assets/audio/notes/6.mp3",
    Note7: "../assets/audio/notes/7.mp3",
    Note8: "../assets/audio/notes/8.mp3",
    Note9: "../assets/audio/notes/9.mp3",
}

const allNoteSprites = [
    AudioSprite.Note1,
    AudioSprite.Note2,
    AudioSprite.Note3,
    AudioSprite.Note4,
    AudioSprite.Note5,
    AudioSprite.Note6,
    AudioSprite.Note7,
    AudioSprite.Note8,
    AudioSprite.Note9
]

const AllBallSprites = [
    Sprite.BallBlue,
    Sprite.BallRed,
    Sprite.BallYellow,
    Sprite.BallPink,
    Sprite.BallOrange,
    Sprite.BallCyan,
    Sprite.BallViolet,
    Sprite.BallLightblue,
    Sprite.BallWhite,
]

function setSpritePath(prePath) {
    const spriteObjects = [Sprite, AudioSprite]
    const spriteLists = [allNoteSprites, AllBallSprites]

    for (const obj of spriteObjects) {
        for (const [key, value] of Object.entries(obj)) {
            obj[key] = prePath + value
        }
    }
    
    for (const lst of spriteLists) {
        for (let i = 0; i < lst.length; i++) {
            lst[i] = prePath + lst[i]
        }
    }

    try {
        golfObjectTypeSpriteMap = {
            [golfObjectType.Start]: Sprite.Start,
            [golfObjectType.Hole]: Sprite.Hole,
            [golfObjectType.Lava]: Sprite.Lava,
            [golfObjectType.Eraser]: Sprite.Eraser,
            [golfObjectType.DuellHole1]: Sprite.DuellHole1,
            [golfObjectType.DuellHole2]: Sprite.DuellHole2,
            [golfObjectType.CustomWall]: Sprite.CustomWall,
            [golfObjectType.GravityBox]: Sprite.GravityBox
        }        
    } catch (e) {
        console.log("Couldn't update golfObjectTypeSpriteMap")
        if (!(e instanceof ReferenceError)) {
            throw e
        }
    }

}