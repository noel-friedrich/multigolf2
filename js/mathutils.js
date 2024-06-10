class Vector2d {

    constructor(x, y) {
        this.x = x
        this.y = y
    }

    static get zero() {
        return new Vector2d(0, 0)
    }

    static fromFunc(f) {
        return new Vector2d(f(0), f(1))
    }

    static fromObject(obj) {
        if (obj == null) return null
        if (obj.x == undefined || obj.y == undefined) {
            throw new Error(`Vector object must have x and y properties`)
        }
        
        return new Vector2d(obj.x, obj.y)
    }

    toObject() {
        return {
            x: this.x,
            y: this.y
        }
    }

    copy() {
        return new Vector2d(this.x, this.y)
    }

    add(v) {
        return new Vector2d(this.x + v.x, this.y + v.y)
    }

    iadd(v) {
        this.x += v.x
        this.y += v.y
    }

    sub(v) {
        return new Vector2d(this.x - v.x, this.y - v.y)
    }

    isub(v) {
        this.x -= v.x
        this.y -= v.y
    }

    mul(v) {
        return new Vector2d(this.x * v.x, this.y * v.y)
    }

    imul(v) {
        this.x *= v.x
        this.y *= v.y
    }

    div(v) {
        return new Vector2d(this.x / v.x, this.y / v.y)
    }

    idiv(v) {
        this.x /= v.x
        this.y /= v.y
    }

    get length() {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    get squaredLength() {
        return this.x * this.x + this.y * this.y
    }

    get normalized() {
        let m = this.length
        return new Vector2d(this.x / m, this.y / m)
    }
    
    scale(x) {
        return new Vector2d(this.x * x, this.y * x)
    }

    scaleX(x) {
        return new Vector2d(this.x * x, this.y)
    }

    scaleY(y) {
        return new Vector2d(this.x, this.y * y)
    }

    iscaleX(x) {
        this.x *= x
    }

    iscaleY(y) {
        this.y *= y
    }

    lerp(v, t) {
        let delta = v.sub(this)
        return this.add(delta.scale(t))
    }

    dot(v) {
        return this.x * v.x + this.y * v.y
    }

    iscale(x) {
        this.x *= x
        this.y *= x
    }

    distance(v) {
        return this.sub(v).length
    }

    distanceSquared(v) {
        return this.sub(v).squaredLength
    }

    cross(v) {
        return this.x * v.y - this.y * v.x
    }

    static fromAngle(angle) {
        return new Vector2d(Math.cos(angle), Math.sin(angle))
    }

    static fromPolar(mag, angle) {
        return new Vector2d(mag * Math.cos(angle), mag * Math.sin(angle))
    }

    static fromArray(arr) {
        return new Vector2d(arr[0], arr[1])
    }

    set(x, y) {
        this.x = x
        this.y = y
    }

    addX(x) {
        return new Vector2d(this.x + x, this.y)
    }

    addY(y) {
        return new Vector2d(this.x, this.y + y)
    }

    rotate(angle) {
        let x = this.x * Math.cos(angle) - this.y * Math.sin(angle)
        let y = this.x * Math.sin(angle) + this.y * Math.cos(angle)
        return new Vector2d(x, y)
    }

    irotate(angle) {
        let x = this.x * Math.cos(angle) - this.y * Math.sin(angle)
        let y = this.x * Math.sin(angle) + this.y * Math.cos(angle)
        this.x = x
        this.y = y
    }

    static random() {
        let direction = Math.random() * Math.PI * 2
        return Vector2d.fromAngle(direction)
    }

    get angle() {
        return Math.atan2(this.y, this.x)
    }

    angleDifference(v) {
        return angleDifference(this.angle, v.angle)
    }

    angleTo(v) {
        return Math.atan2(v.y - this.y, v.x - this.x)
    }

    equals(v) {
        return this.x == v.x && this.y == v.y
    }

    map(f) {
        return new Vector2d(f(this.x), f(this.y))
    }

    product() {
        return this.x * this.y
    }

    get array() {
        return [this.x, this.y]
    }

    get min() {
        return Math.min(...this.array)
    }

    get max() {
        return Math.max(...this.array)
    }

    toArray() {
        return [this.x, this.y]
    }
    
    normalizeToCanvas(canvas) {
        return new Vector2d(
            this.x / canvas.width,
            this.y / canvas.height
        )
    }

    static fromTouchEvent(event, element) {
        let x = 0, y = 0

        if (event.touches && event.touches[0]) {
            x = event.touches[0].clientX
            y = event.touches[0].clientY
        } else if (event.originalEvent && event.originalEvent.changedTouches[0]) {
            x = event.originalEvent.changedTouches[0].clientX
            y = event.originalEvent.changedTouches[0].clientY
        } else if (event.clientX && event.clientY) {
            x = event.clientX
            y = event.clientY
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            x = event.changedTouches[0].clientX
            y = event.changedTouches[0].clientY
        }

        const rect = element.getBoundingClientRect()
        return new Vector2d(x - rect.left, y - rect.top)
    }

    clampX(clampValues, maxDelta) {
        const newVector = this.copy()
        for (let clampValue of clampValues) {
            if (Math.abs(newVector.x - clampValue) <= maxDelta) {
                newVector.x = clampValue
            }
        }
        return newVector
    }

    clampY(clampValues, maxDelta) {
        const newVector = this.copy()
        for (let clampValue of clampValues) {
            if (Math.abs(newVector.y - clampValue) <= maxDelta) {
                newVector.y = clampValue
            }
        }
        return newVector
    }

    min() {
        return Math.min(this.x, this.y)
    }

    max() {
        return Math.max(this.x, this.y)
    }

}

function calcLineIntersection(s1, e1, s2, e2) {
    // get intersection point between two lines defined each
    // by start and end position (start n, end n)
    // algorithm found on https://paulbourke.net/geometry/pointlineplane/

    const denominator = (e2.y - s2.y)*(e1.x - s1.x) - (e2.x - s2.x)*(e1.y - s1.y)
    if (denominator == 0) {
        return null
    }

    const ua = ((e2.x - s2.x) * (s1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x)) / denominator
    const ub = ((e1.x - s1.x) * (s1.y - s2.y) - (e1.y - s1.y) * (s1.x - s2.x)) / denominator

    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return null
    return new Vector2d(
        s1.x + ua * (e1.x - s1.x),
        s1.y + ua * (e1.y - s1.y),
    )
}

function calcAveragePos(vecs) {
    return vecs.reduce((p,c) => p.add(c), new Vector2d(0,0)).scale(1 / vecs.length)
}