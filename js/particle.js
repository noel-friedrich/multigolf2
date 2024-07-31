const PARTICLE_MAX_TICKS = 30

class Particle {

    constructor(pos, vel, color, radius, ticksAlive) {
        this.pos = pos ?? new Vector2d(0, 0)
        this.vel = vel ?? new Vector2d(0, 0)
        this.color = color ?? "white"
        this.radius = radius ?? 5
        this.ticksAlive = 0
        this.alive = true
    }

    die() {
        this.alive = false
    }

    get opacity() {
        return Math.max(1 - this.ticksAlive / PARTICLE_MAX_TICKS, 0)
    }

    updatePhysics(board) {
        if (!this.alive) {
            return
        }

        this.pos.iadd(this.vel)
        if (!board.course.containsPos(this.pos)) {
            this.die()
        }

        if (this.ticksAlive > PARTICLE_MAX_TICKS) {
            this.die()
        }

        this.ticksAlive++
    }

    toObject() {
        return {
            p: this.pos.toObject(),
            v: this.vel.toObject(),
            c: this.color,
            r: this.radius,
            t: this.ticksAlive
        }
    }

    static fromObject(obj) {
        return new Particle(
            Vector2d.fromObject(obj.p),
            Vector2d.fromObject(obj.v),
            obj.c, obj.r, obj.t
        )
    }

}