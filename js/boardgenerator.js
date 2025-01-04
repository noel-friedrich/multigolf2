class BoardGenerator {

    constructor(screenSizes) {
        this.screenSizes = screenSizes
    }

    generateLinearCourse() {
        const phones = this.screenSizes.map(size => {
            return PhoneCoordinates.fromWidthHeight(size.x, size.y)
        })

        const course = new Course([phones.shift()])
        
        while (phones.length) {
            const prevPhone = course.phones.slice(-1)[0]
            const phone = phones.shift()

            const bottomMidX = (prevPhone.bottomLeft.x + prevPhone.bottomRight.x) / 2
            const topMidX = (phone.topLeft.x + phone.topRight.x) / 2
            phone.translate(new Vector2d(bottomMidX - topMidX, prevPhone.maxXY.y))
            course.addPhone(phone)
        }

        return course
    }

    getConnectingLines(prevPhone, phone) {
        return [
            // upper corners
            new PhoneConnectionLine(
                new Vector2d(0, 0),
                new Vector2d(Math.min(prevPhone.size.x, phone.size.x), 0)
            ),
            new PhoneConnectionLine(
                new Vector2d(prevPhone.size.x, 0),
                new Vector2d(prevPhone.size.x, Math.min(phone.size.y, prevPhone.size.y))
            ),
            new PhoneConnectionLine(
                new Vector2d(Math.max(prevPhone.maxXY.x - phone.maxXY.x, 0), prevPhone.size.y),
                new Vector2d(prevPhone.size.x, prevPhone.size.y)
            ),
            new PhoneConnectionLine(
                new Vector2d(0, Math.max(0, prevPhone.maxXY.y - phone.maxXY.y)),
                new Vector2d(0, prevPhone.size.y)
            ),

            // lower corners
            new PhoneConnectionLine(
                new Vector2d(Math.max(prevPhone.maxXY.x - phone.maxXY.x, 0), 0),
                new Vector2d(prevPhone.size.x, 0)
            ),
            new PhoneConnectionLine(
                new Vector2d(prevPhone.size.x, Math.max(0, prevPhone.maxXY.y - phone.maxXY.y)),
                new Vector2d(prevPhone.size.x, prevPhone.size.y)
            ),
            new PhoneConnectionLine(
                new Vector2d(0, prevPhone.size.y),
                new Vector2d(Math.min(prevPhone.size.x, phone.size.x), prevPhone.size.y)
            ),
            new PhoneConnectionLine(
                new Vector2d(0, 0),
                new Vector2d(0, Math.min(phone.size.y, prevPhone.size.y))
            ),

            // middles
            new PhoneConnectionLine(
                new Vector2d(Math.max(prevPhone.minXY.x + prevPhone.maxXY.x - phone.minXY.x - phone.maxXY.x, 0) / 2, 0),
                new Vector2d(prevPhone.size.x - Math.max(prevPhone.minXY.x + prevPhone.maxXY.x - phone.minXY.x - phone.maxXY.x, 0) / 2, 0)
            ),
            new PhoneConnectionLine(
                new Vector2d(prevPhone.size.x, Math.max(prevPhone.minXY.y + prevPhone.maxXY.y - phone.minXY.y - phone.maxXY.y, 0) / 2),
                new Vector2d(prevPhone.size.x, prevPhone.size.y - Math.max(prevPhone.minXY.y + prevPhone.maxXY.y - phone.minXY.y - phone.maxXY.y, 0) / 2)
            ),
            new PhoneConnectionLine(
                new Vector2d(Math.max(prevPhone.minXY.x + prevPhone.maxXY.x - phone.minXY.x - phone.maxXY.x, 0) / 2, prevPhone.size.y),
                new Vector2d(prevPhone.size.x - Math.max(prevPhone.minXY.x + prevPhone.maxXY.x - phone.minXY.x - phone.maxXY.x, 0) / 2, prevPhone.size.y)
            ),
            new PhoneConnectionLine(
                new Vector2d(0, Math.max(prevPhone.minXY.y + prevPhone.maxXY.y - phone.minXY.y - phone.maxXY.y, 0) / 2),
                new Vector2d(0, prevPhone.size.y - Math.max(prevPhone.minXY.y + prevPhone.maxXY.y - phone.minXY.y - phone.maxXY.y, 0) / 2)
            ),
        ]
    }

    getPhoneAlignOptions(prevPhone, phone) {
        return [
            // upper corners
            new Vector2d(0, -phone.size.y),
            new Vector2d(prevPhone.size.x, 0),
            new Vector2d(prevPhone.maxXY.x - phone.maxXY.x, prevPhone.size.y),
            new Vector2d(-phone.size.x, prevPhone.maxXY.y - phone.maxXY.y),

            // lower corners
            new Vector2d(prevPhone.maxXY.x - phone.maxXY.x, -phone.size.y),
            new Vector2d(prevPhone.size.x, prevPhone.maxXY.y - phone.maxXY.y),
            new Vector2d(0, prevPhone.size.y),
            new Vector2d(-phone.size.x, 0),

            // middles
            new Vector2d(
                (prevPhone.minXY.x + prevPhone.maxXY.x
                    - phone.minXY.x - phone.maxXY.x) / 2,
                -phone.size.y
            ),
            new Vector2d(
                prevPhone.size.x,
                (prevPhone.minXY.y + prevPhone.maxXY.y
                    - phone.minXY.y - phone.maxXY.y) / 2,
            ),
            new Vector2d(
                (prevPhone.minXY.x + prevPhone.maxXY.x
                    - phone.minXY.x - phone.maxXY.x) / 2,
                prevPhone.size.y
            ),
            new Vector2d(
                -phone.size.x,
                (prevPhone.minXY.y + prevPhone.maxXY.y
                    - phone.minXY.y - phone.maxXY.y) / 2,
            ),
        ]
    }

    getStartHolePositions(phone) {
        return [
            // upper corners
            new Vector2d(0, phone.size.y / 4),
            new Vector2d(-phone.size.x / 4, 0),
            new Vector2d(0, -phone.size.y / 4),
            new Vector2d(phone.size.x / 4, 0),

            // lower corners
            new Vector2d(0, phone.size.y / 4),
            new Vector2d(-phone.size.x / 4, 0),
            new Vector2d(0, -phone.size.y / 4),
            new Vector2d(phone.size.x / 4, 0),

            // middles
            new Vector2d(0, phone.size.y / 4),
            new Vector2d(-phone.size.x / 4, 0),
            new Vector2d(0, -phone.size.y / 4),
            new Vector2d(phone.size.x / 4, 0)
        ]
    }

    generateRandomCourse({linear=false}={}) {
        let phones = this.screenSizes.map(size => {
            return PhoneCoordinates.fromWidthHeight(size.x, size.y)
        })
        let course = new Course([phones.shift()])
        course.alignOptions = []
        
        let phoneTries = 0
        let totalTries = 0
        while (phones.length) {
            const prevPhone = course.phones.slice(-1)[0]
            const phone = phones.shift()

            if ((!linear && Math.random() < 0.5) || (linear && phone.size.x > phone.size.y)) {
                phone.rotate(Math.PI / 2)
            }
            
            phone.translate(prevPhone.minXY.sub(phone.minXY))
            
            const translateOptions = this.getPhoneAlignOptions(prevPhone, phone)
            let alignOption = Math.floor(Math.random() * translateOptions.length)
            if (linear) alignOption = 10
            course.alignOptions.push(alignOption)

            const lineOptions = this.getConnectingLines(prevPhone, phone)
            course.addLine(lineOptions[alignOption].translate(phone.minXY))

            phone.translate(translateOptions[alignOption])
            course.addPhone(phone)

            const previousPhones = course.phones.slice(0, -2)
            const overlapsPrevious = previousPhones.some(p => {
                return p.hasOverlap(phone)
            })
            
            if (overlapsPrevious) {
                // undo last phone addition
                phones.unshift(course.phones.pop())
                course.alignOptions.pop()
                course.lines.pop()

                phoneTries++
            } else {
                phoneTries = 0
            }

            if (phoneTries > 20) {
                phones = this.screenSizes.map(size => {
                    return PhoneCoordinates.fromWidthHeight(size.x, size.y)
                })
                course.alignOptions = []
                course.phones = [phones.shift()]
                course.lines = []
                phoneTries = 0
                totalTries++
            }

            if (totalTries > 10000) {
                throw new Error("Couldn't generate course [too many tries]")
            }
        }

        for (const line of course.lines) {
            line.color = line.getRandomColor()
        }

        return course
    }

    placeStartAndHole(board) {
        const start = defaultObjects[golfObjectType.Start].copy()
        const hole = defaultObjects[golfObjectType.Hole].copy()

        if (board.course.phones.length > 1) {
            const firstAlignOption = board.course.alignOptions[0]
            let lastAlignOption = board.course.alignOptions.slice(-1)[0]
            lastAlignOption = Math.floor(lastAlignOption / 4) * 4 + ((lastAlignOption + 2) % 4)

            const translateStartOptions = this.getStartHolePositions(board.course.phones[0])
            const translateHoleOptions = this.getStartHolePositions(board.course.phones.slice(-1)[0])

            const firstMiddle = calcAveragePos(board.course.phones[0].points)
            const lastMiddle = calcAveragePos(board.course.phones.slice(-1)[0].points)

            start.setPos(firstMiddle.add(translateStartOptions[firstAlignOption]))
            hole.setPos(lastMiddle.add(translateHoleOptions[lastAlignOption]))
        } else {
            const middle = calcAveragePos(board.course.phones[0].points)
            const delta = middle.sub(board.course.phones[0].corners[0]).scale(0.6)
            start.setPos(middle.sub(delta))
            hole.setPos(middle.add(delta))
        }
        
        board.objects.push(start, hole)
    }

    generate() {
        const board = new Board()
        board.course = this.generateRandomCourse({linear: Math.random() < 0.1})
        this.placeStartAndHole(board)
        return board
    }

    static async placeObjectsRandomly(board, {
        objectType = golfObjectType.Lava,
        maxTries = 10,
        numObjects = 3
    }={}) {
        function kickAllBallsRandom() {
            for (const ball of board.balls) {
                const speed = 100 + Math.random() * 50
                const angle = Math.random() * Math.PI * 2
                const dir = Vector2d.fromAngle(angle).scale(speed)
                ball.kick(dir)
            }
        }

        async function testWithBalls({
            numBalls = 100,
            numKicks = board.course.phones.length * 2,
            stepsPerKick = 100
        }={}) {
            if (!board.startPos || board.endPositions.length == 0) {
                return true
            }

            const prevBallCollisionEnabled = board.ballCollisionEnabled
            board.ballCollisionEnabled = false

            let balls = []
            for (let i = 0; i < numBalls; i++) {
                const ball = board.spawnBall()
                balls.push(ball)
            }

            for (let n = 0; n < numKicks; n++) {
                board.addPhysicsEvent(kickAllBallsRandom, n * stepsPerKick + 1)
            }

            for (let i = 0; i < numKicks; i++) {
                board.simulateStepsEfficiently(stepsPerKick)
                await new Promise(resolve => setTimeout(resolve, 0))
            }

            board.ballCollisionEnabled = prevBallCollisionEnabled

            const success = balls.some(b => b.inHole)
            const ballUids = balls.map(b => b.uid)
            board.balls = board.balls.filter(b => !ballUids.includes(b.uid))

            return success
        }

        function getRandomCoursePos() {
            // choose a random phone weighted by its area
            let randomPhone = undefined
            const areaSum = board.course.phones.reduce((p, c) => p + c.area, 0)
            const r = Math.random() * areaSum
            let cumulativeSum = 0
            for (const phone of board.course.phones) {
                cumulativeSum += phone.area
                if (cumulativeSum >= r) {
                    randomPhone = phone
                    break
                }
            }
            console.assert(randomPhone !== undefined)

            return randomPhone.randomPosInside()
        }

        for (let i = 0; i < maxTries; i++) {
            const addedObjectUids = []
            for (let i = 0; i < numObjects; i++) {
                const randomLava = GolfObject.makeDefault(objectType)
                randomLava.setPos(getRandomCoursePos())
                randomLava.setAngle(Math.random() * 2 * Math.PI)
                randomLava.setSize(randomLava.size.scale(0.8 + Math.random() * 0.4))
                board.objects.push(randomLava)
                
                addedObjectUids.push(randomLava.uid)
            }

            return true
            
            // the following was old, board simulation was just annoying...
            if (await testWithBalls()) {
                return true
            } else {
                board.objects = board.objects.filter(o => !addedObjectUids.includes(o.uid))
            }
        }
        return false
    }

}