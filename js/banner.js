function registerBanner({texts=[], context=null, spacingPx=30}={}) {
    if (context == null || texts.length == 0) return

    const canvas = context.canvas

    let textBlocks = []

    function spawnTextblock(addToBlocks=true) {
        const text = texts[Math.floor(Math.random() * texts.length)]
        const width = context.measureText(text).width
        const block = {text, x: -width, width, hasSpawnedNeighbor: false}
        if (addToBlocks) {
            textBlocks.push(block)
        }
        return block
    }

    function initialSpawnTextblocks() {
        spawnTextblock()
        let x = spacingPx
        while (x <= canvas.width) {
            const block = spawnTextblock()
            block.x = x
            x += block.width + spacingPx
            block.hasSpawnedNeighbor = true
        }
    }

    function updateTextblocks() {
        if (textBlocks.length < 1) {
            spawnTextblock()
        }

        for (let i = 0; i < textBlocks.length; i++) {
            const block = textBlocks[i]
            block.x += 1

            if (!block.hasSpawnedNeighbor && block.x >= spacingPx) {
                spawnTextblock()
                block.hasSpawnedNeighbor = true
            }
        }

        textBlocks = textBlocks.filter(block => block.x <= canvas.width)
    }

    function render() {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight

        const bodyStyle = getComputedStyle(document.body)
        const textColor = bodyStyle.getPropertyValue("--banner-foreground")

        context.font = `${canvas.height * 0.6}px serif`
        context.fillStyle = textColor
        context.textAlign = "left"
        context.textBaseline = "hanging"

        for (const block of textBlocks) {
            context.fillText(block.text, block.x, 12)
        }
    }

    render()
    initialSpawnTextblocks()

    function update() {
        render()
        updateTextblocks()
        window.requestAnimationFrame(update)
    }

    window.requestAnimationFrame(update)
}