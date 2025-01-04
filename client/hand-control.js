import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

let handLandmarker = null

class HandControls {

    constructor(minimumImageDelay) {
        this.videoElement = null
        this.landmarker = null
        this.cameraActive = false
        this.lastVideoTime = null
        this.isDragging = false

        this.isLoading = false

        this.notSeenCount = 0
        this.dragPrepareCount = 0
        this.dragEndCount = 0

        // number of pictures to confirm before
        // a drag event is started/ended
        this.volatilityResistance = 5

        this.onNonDragMoves = []
        this.onDragStarts = []
        this.onDragMoves = []
        this.onDragEnds = []
        this.onClicks = []

        this.lastImageTime = 0
        this.minimumImageDelay = minimumImageDelay ?? 0
    }

    initVideoElement() {
        if (this.videoElement !== null) {
            this.videoElement.remove()
        }

        this.videoElement = document.createElement("video")
        this.videoElement.setAttribute("autoplay", "true")
        this.videoElement.setAttribute("playsinline", "true")
        this.videoElement.style.display = "none"
        document.body.appendChild(this.videoElement)
    }

    get hasLoaded() {
        return this.landmarker !== null
    }

    async load() {
        if (this.hasLoaded || this.isLoading) {
            return
        }

        this.isLoading = true

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        )
    
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        })
    
        console.log("Loaded HandLandmaker!")
        this.isLoading = false
    }

    hasCamera() {
        return !!navigator.mediaDevices?.getUserMedia
    }

    calc3dDistance(p1, p2) {
        return Math.sqrt(
            (p1.x - p2.x) ** 2
            + (p1.y - p2.y) ** 2
            + (p1.z - p2.z) ** 2
        )
    }

    getAverage3dPos(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            z: (p1.z + p2.z) / 2,
        }
    }

    onClick(listener) {
        this.onClicks.push(listener)
    }

    onNonDragMove(listener) {
        this.onNonDragMoves.push(listener)
    }

    onDragStart(listener) {
        this.onDragStarts.push(listener)
    }

    onDragMove(listener) {
        this.onDragMoves.push(listener)
    }

    onDragEnd(listener) {
        this.onDragEnds.push(listener)
    }

    triggerEvent(listeners, ...args) {
        for (const listener of listeners) {
            listener(...args)
        }
    }

    startCamera() {
        return new Promise(async (resolve, reject) => {
            if (!this.hasCamera()) {
                reject("No Camera found")
            }

            if (this.cameraActive) {
                reject("Camera already active")
            }

            this.cameraActive = true
            if (!this.hasLoaded) {
                await this.load()
            }

            this.initVideoElement()
    
            let isClosed = false
            let lastPosition = null
    
            const loop = async () => {
                resolve()

                const currMs = performance.now()
                const results = this.landmarker.detectForVideo(this.videoElement, currMs)
                if (results.landmarks.length > 0) {
                    this.notSeenCount = 0
    
                    // see following link for reference to marker indeces
                    // https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker#configurations_options
                    const landmarks = results.landmarks[0]
                    const thumbTip = landmarks[4]
                    const indexFingerTip = landmarks[8]
                    const indexFingerBase = landmarks[5]
                    const wrist = landmarks[0]
    
                    const handSizeDist = this.calc3dDistance(wrist, indexFingerBase)
                    const thumbIndexDist = this.calc3dDistance(thumbTip, indexFingerTip)
    
                    // we consider hand closed if thumb and index finger (nearly) touch
                    const handIsClosed = thumbIndexDist < handSizeDist * 0.33
    
                    const cursorPos = this.getAverage3dPos(indexFingerTip, thumbTip)
                    const handScreenPos = new Vector2d(1 - cursorPos.x, cursorPos.y)
                        .scaleX(window.innerWidth).scaleY(window.innerHeight)
    
                    if (lastPosition !== null && handIsClosed && !isClosed) {
                        this.triggerEvent(this.onClicks, handScreenPos)
                    }
    
                    if (this.isDragging) {
                        if (handIsClosed) {
                            this.triggerEvent(this.onDragMoves, handScreenPos)
                            this.dragEndCount = 0
                        } else {
                            this.dragEndCount++
                        }
    
                        if (this.dragEndCount >= this.volatilityResistance) {
                            this.isDragging = false
                            this.triggerEvent(this.onDragEnds, handScreenPos)
                        }
                    } else {
                        this.triggerEvent(this.onNonDragMoves, handScreenPos)
    
                        if (handIsClosed) {
                            this.dragPrepareCount++
                        } else {
                            this.dragPrepareCount = 0
                        }
    
                        if (this.dragPrepareCount >= this.volatilityResistance) {
                            this.isDragging = true
                            this.triggerEvent(this.onDragStarts, handScreenPos)
                        }
                    }
    
                    lastPosition = cursorPos
                    isClosed = handIsClosed
                } else {
                    this.notSeenCount++
                    this.dragPrepareCount = 0
    
                    isClosed = false
                    lastPosition = null
    
                    if (this.isDragging && this.notSeenCount >= this.volatilityResistance) {
                        this.isDragging = false
                        this.triggerEvent(this.onDragEnds, null)
                    }
                }
    
                const waitTimeBeforeNext = this.minimumImageDelay - (Date.now() - this.lastImageTime)
                if (waitTimeBeforeNext > 0) {
                    await new Promise(resolve => setTimeout(resolve, waitTimeBeforeNext))
                }
    
                this.lastImageTime = Date.now()
    
                if (this.cameraActive) {
                    window.requestAnimationFrame(loop)
                } else {
                    videoStream.getTracks().forEach(t => t.stop())
                }
            }
            
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: true
            })
            
            this.videoElement.srcObject = videoStream
            this.videoElement.addEventListener("loadeddata", loop)
        })
    }

    stopCamera() {
        this.cameraActive = false
    }

}

const handControls = new HandControls(150)
window.handControls = handControls