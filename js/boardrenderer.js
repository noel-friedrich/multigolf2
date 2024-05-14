class BoardRenderer {

    static async load() {
        
    }

    static render(board, context) {
        const canvas = context.canvas
        canvas.style.display = "block"
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight

        const screenCourse = board.course.copy()

        // rotate if more efficient
        let maxX = Math.max(...screenCourse.phones.map(p => p.points.map(c => c.x)).flat())
        let maxY = Math.max(...screenCourse.phones.map(p => p.points.map(c => c.y)).flat())
        if (maxX < maxY) {
            screenCourse.rotate(Math.PI / 2)
        }

        // move to strictly positive coords
        let minX = Math.min(...screenCourse.phones.map(p => p.points.map(c => c.x)).flat())
        let minY = Math.min(...screenCourse.phones.map(p => p.points.map(c => c.y)).flat())
        screenCourse.translate(new Vector2d(-minX, -minY))

        // scale so that everything is in screen
        // (I'm too tired to solve this directly so we solve this through
        //  step-by-step optimization until we reach the goal)
        // (this part doesn't have to be _that_ efficient)
        // (the approach is converging exponentially, so should be fine)
        while (maxX == undefined || maxX > canvas.width || maxY > canvas.height) {
            screenCourse.scale(0.95 ** 2)
            maxX = Math.max(...screenCourse.phones.map(p => p.points.map(c => c.x)).flat())
            maxY = Math.max(...screenCourse.phones.map(p => p.points.map(c => c.y)).flat())
            screenCourse.scale(0.95 ** -1)
        }
        screenCourse.scale(0.95)

        const calcAveragePos = (vecs) => {
            return vecs.reduce((p,c) => p.add(c), new Vector2d(0,0)).scale(1 / vecs.length)
        }

        // move to middle
        const averagePos = calcAveragePos([new Vector2d(0, 0), new Vector2d(maxX, maxY)])
        screenCourse.translate(new Vector2d(canvas.width / 2, canvas.height / 2).sub(averagePos))

        for (let i = 0; i < screenCourse.phones.length; i++) {
            const phone = screenCourse.phones[i]
            context.moveTo(phone.points[0].x, phone.points[0].y)
            for (let point of phone.points.slice(1)) {
                context.lineTo(point.x, point.y)
            }
            context.lineTo(phone.points[0].x, phone.points[0].y)
            
            context.fillStyle = "#79ffb6"
            context.strokeStyle = "black"
            context.lineWidth = 2
            context.lineCap = "round"

            context.fill()
            context.stroke()
        }

        for (let i = 0; i < screenCourse.phones.length; i++) {
            const phone = screenCourse.phones[i]
            const averagePos = calcAveragePos(phone.points)
            context.font = `${canvas.height * 0.1}px Arial`
            context.textBaseline = "middle"
            context.textAlign = "center"
            context.fillStyle = "black"
            context.save()
            context.translate(averagePos.x, averagePos.y)
            context.rotate(phone.angle)
            context.fillText((i + 1).toString(), 0, 0)
            context.restore()
        }
    }

}