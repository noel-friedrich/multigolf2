const canvas = document.getElementById("interactive-background")
const context = canvas.getContext("2d")

const randomColor = () => `hsl(${Math.floor(Math.random() * 360)}deg, 100%, 80%)`
const screenCenter = () => new Vector2d(window.innerWidth / 2, window.innerHeight / 2)
const mousePos = new Vector2d(window.innerWidth / 2, window.innerHeight / 2)

addEventListener("mousemove", event => {
    mousePos.x = event.clientX
    mousePos.y = event.clientY
})

const balls = Array.from({length: 30}).map(() => {
    const radius = Math.random() * 10 + 25
    return {
        color: randomColor(),
        pos: Vector2d.fromFunc(Math.random)
            .scaleX(window.innerWidth).scaleY(window.innerHeight),
        radius: radius,
        vel: Vector2d.random().scale(0.5),
        mass: Math.PI * radius * radius
    }
})

function drawBall(ball) {
    context.beginPath()
    context.arc(ball.pos.x, ball.pos.y, ball.radius, 0, 2 * Math.PI, false)
    context.fillStyle = ball.color
    context.fill()
    context.lineWidth = 5
    context.strokeStyle = "black"
    context.stroke()
}

function render() {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    for (let ball of balls) {
        drawBall(ball)
    }
}

function updatePhysics(deltaTime) {
    for (let ball of balls) {
        ball.pos.iadd(ball.vel.scale(deltaTime))
        ball.vel.iscale(0.995)
        const deltaVector = mousePos.sub(ball.pos)
        const gravityStrength = 0.25 * ball.mass / Math.max(deltaVector.squaredLength, 150 ** 2)
        ball.vel.iadd(deltaVector.normalized.scale(gravityStrength))

        if (ball.pos.distanceSquared(screenCenter()) > Math.max(window.innerHeight, window.innerWidth) ** 2 * 0.6) {
            ball.vel = deltaVector.normalized.scale(0.5).add(Vector2d.random().scale(0.3))
        }
    }
}

function createPush(pos) {
    for (let ball of balls) {
        const deltaVector = pos.sub(ball.pos)
        const gravityStrength = 0.1 * ball.mass / Math.max(deltaVector.length, 150)
        ball.vel.iadd(deltaVector.normalized.scale(-gravityStrength))
    }
}


addEventListener("click", event => {
    createPush(new Vector2d(event.clientX, event.clientY))
})

let lastFrameTime = performance.now()

function loop() {
    render()

    updatePhysics(performance.now() - lastFrameTime)
    lastFrameTime = performance.now()

    window.requestAnimationFrame(loop)
}

loop()