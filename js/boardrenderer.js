class BoardRenderer {

    static spriteImgMap = {}

    static async loadImg(src) {
        return new Promise(resolve => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.src = src
        })
    }

    static async load() {
        for (let sprite of Object.values(Sprite)) {
            this.spriteImgMap[sprite] = await this.loadImg(sprite)
        }
    }
    
    static drawSprite(context, centerPos, size, sprite, {
        angle = 0,
        imageSmoothing = false
    }={}) {
        const img = this.spriteImgMap[sprite]
        if (!img) {
            throw new Error(`Unknown Sprite: ${sprite}`)
        }

        context.imageSmoothingEnabled = imageSmoothing // as some sprites may be very small in size

        context.save()
        context.translate(centerPos.x, centerPos.y)
        context.rotate(angle)
        context.drawImage(img, -size.x / 2, -size.y / 2, size.x, size.y)
        context.restore()
    }

    static drawCustomWall(context, corners) {
        context.beginPath()
        context.moveTo(corners[0].x, corners[0].y)
        for (let i = 0; i < corners.length; i++) {
            const index = (i + 1) % corners.length
            context.lineTo(corners[index].x, corners[index].y)
        }

        context.strokeStyle = "black"
        context.fillStyle = "white"
        context.lineWidth = 1
        context.lineCap = "round"

        context.fill()
        context.stroke()
    }

    static render(board, context) {
        const canvas = context.canvas
        canvas.style.display = "block"
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight

        const screenBoard = board.copy()
        
        // rotate if more efficient
        let minX = Math.min(...screenBoard.course.phones.map(p => p.points.map(c => c.x)).flat())
        let minY = Math.min(...screenBoard.course.phones.map(p => p.points.map(c => c.y)).flat())
        let maxX = Math.max(...screenBoard.course.phones.map(p => p.points.map(c => c.x)).flat())
        let maxY = Math.max(...screenBoard.course.phones.map(p => p.points.map(c => c.y)).flat())
        if ((maxX - minX) < (maxY - minY)) {
            screenBoard.rotate(Math.PI / -2)
        }

        // move to strictly positive coords
        minX = Math.min(...screenBoard.course.phones.map(p => p.points.map(c => c.x)).flat())
        minY = Math.min(...screenBoard.course.phones.map(p => p.points.map(c => c.y)).flat())
        screenBoard.translate(new Vector2d(-minX, -minY))

        // scale so that everything is in screen
        // (I'm too tired to solve this directly so we solve this through
        //  step-by-step optimization until we reach the goal)
        // (this part doesn't have to be _that_ efficient)
        // (the approach is converging exponentially, so should be fine)
        while (maxX == undefined || maxX > canvas.width || maxY > canvas.height) {
            screenBoard.scale(0.95 ** 2)
            maxX = Math.max(...screenBoard.course.phones.map(p => p.points.map(c => c.x)).flat())
            maxY = Math.max(...screenBoard.course.phones.map(p => p.points.map(c => c.y)).flat())
            screenBoard.scale(0.95 ** -1)
        }
        screenBoard.scale(0.95)

        // move to middle
        const averagePos = calcAveragePos([new Vector2d(0, 0), new Vector2d(maxX, maxY)])
        screenBoard.translate(new Vector2d(canvas.width / 2, canvas.height / 2).sub(averagePos))

        let minOverlapIndex = screenBoard.course.phones.length
        const overlaps = screenBoard.course.getOverlaps()
        screenBoard.course.phones.push(...overlaps)

        for (let i = 0; i < screenBoard.course.phones.length; i++) {
            context.beginPath()
            const phone = screenBoard.course.phones[i]
            context.moveTo(phone.points[0].x, phone.points[0].y)
            for (let point of phone.points.slice(1)) {
                context.lineTo(point.x, point.y)
            }
            context.lineTo(phone.points[0].x, phone.points[0].y)
            
            context.strokeStyle = "black"
            context.lineWidth = 2
            context.lineCap = "round"

            if (i >= minOverlapIndex) {
                context.fillStyle = "rgba(255, 0, 0, 1)"
            } else {
                context.fillStyle = "#79ffb6"
            }

            context.fill()
            context.stroke()
        }

        for (let i = 0; i < minOverlapIndex; i++) {
            const phone = screenBoard.course.phones[i]
            const averagePos = calcAveragePos(phone.points)
            context.font = `${Math.max(phone.size.x, phone.size.y) * 0.2}px Arial`
            context.textBaseline = "middle"
            context.textAlign = "center"
            context.fillStyle = "black"
            context.save()
            context.translate(averagePos.x, averagePos.y)
            context.rotate(phone.angle)
            context.fillText((i + 1).toString(), 0, 0)
            context.restore()
        }

        for (const obj of screenBoard.objects) {
            if (obj.type == golfObjectType.CustomWall) {
                this.drawCustomWall(context, obj.corners)
            } else {
                this.drawSprite(context, obj.pos, obj.size, obj.sprite, {angle: obj.angle})
            }
        }
    }

}