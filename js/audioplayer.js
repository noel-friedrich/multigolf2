class AudioPlayer {

    static spriteAudioMap = {}
    static spriteIndexMap = {}

    static soundsEnabled = true
    static speechEnabled = true

    static loadAudio(src) {
        return new Promise(resolve => {
            const element = document.createElement("audio")
            element.addEventListener("canplaythrough", resolve)
    
            element.style.display = "none"
            element.preload = "true"
            element.src = src
            document.body.appendChild(element)

            this.spriteAudioMap[src].push(element)
        })
    }    
    
    static hasLoaded = false
    static async load() {
        if (this.hasLoaded) {
            return
        }

        for (const src of Object.values(AudioSprite)) {
            this.spriteAudioMap[src] = []
            this.spriteIndexMap[src] = 0
        }

        // make 5 audios per source to allow playing
        // in quick repetition (and simultaneously)
        const promises = []
        for (let i = 0; i < 5; i++) {
            promises.push(...Object.values(AudioSprite).map(s => this.loadAudio(s)))
        }

        await Promise.all(promises)

        this.hasLoaded = true
    }

    static play(sprite, {volume=1.}={}) {
        if (!this.soundsEnabled || !this.hasLoaded) {
            return
        }

        if (!this.spriteAudioMap[sprite]) {
            return
        }

        this.load()
        const audios = this.spriteAudioMap[sprite]
        const index = (this.spriteIndexMap[sprite]++) % audios.length
        const audio = audios[index]

        if (!audio) {
            return
        }
        
        audio.volume = volume
        return audio.play()
    }

    static randomNote({volume=1.}={}) {
        const index = Math.floor(Math.random() * allNoteSprites.length)
        return this.play(allNoteSprites[index], {volume: volume})
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