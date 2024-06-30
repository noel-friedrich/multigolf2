class AudioPlayer {

    static spriteAudioMap = {}
    static spriteIndexMap = {}

    static soundsEnabled = true
    static speechEnabled = true

    static makeAudio(src) {
        const element = document.createElement("audio")
        element.style.display = "none"
        element.preload = "true"
        element.src = src
        document.body.appendChild(element)
        return element
    }    
    
    static hasLoaded = false
    static async load() {
        if (this.hasLoaded) {
            return
        }

        for (const src of Object.values(AudioSprite)) {
            this.spriteAudioMap[src] = []
            this.spriteIndexMap[src] = 0

            // make 5 audios per source to allow playing
            // in quick repetition (and simultaneously)
            for (let i = 0; i < 5; i++) {
                this.spriteAudioMap[src].push(this.makeAudio(src))
            }
        }

        this.hasLoaded = true
    }

    static play(sprite) {
        if (!this.soundsEnabled) {
            return
        }

        if (this.spriteAudioMap[sprite]) {
            this.load()
            const audios = this.spriteAudioMap[sprite]
            const index = (this.spriteIndexMap[sprite]++) % audios.length
            return audios[index].play()
        }
    }

    static randomNote() {
        const index = Math.floor(Math.random() * allNoteSprites.length)
        return this.play(allNoteSprites[index])
    }

    static plop() {
        return this.play(AudioSprite.Plop)
    }

    static say(text, {rate = 1., lang="de-DE"}={}) {
        if (!this.speechEnabled || !window.speechSynthesis) {
            return
        }

        const message = new SpeechSynthesisUtterance()
        message.text = text
        message.rate = rate
        message.lang = lang
        window.speechSynthesis.speak(message)
    }

}