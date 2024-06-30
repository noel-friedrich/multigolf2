class AudioPlayer {

    static spriteAudioMap = {}
    static soundsEnabled = true

    static plopIndex = 0
    static plopAudios = []

    static hasLoaded = false
    static async load() {
        if (this.hasLoaded) {
            return
        }

        for (const src of Object.values(AudioSprite)) {
            this.spriteAudioMap[src] = new Audio(src)
        }

        for (let i = 0; i < 10; i++) {
            this.plopAudios.push(new Audio(AudioSprite.Plop))
        }

        this.hasLoaded = true
    }

    static play(sprite) {
        if (!this.soundsEnabled) {
            return
        }

        if (sprite == AudioSprite.Plop) {
            this.plopAudios[(this.plopIndex++) % this.plopAudios.length].play()
        } else if (this.spriteAudioMap[sprite]) {
            this.load()
            this.spriteAudioMap[sprite].play()
        }
    }

    static plop() {
        this.play(AudioSprite.Plop)
    }

}