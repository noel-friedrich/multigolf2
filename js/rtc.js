const dataMessageType = {
    PING: "ping",
    GAMESTATE: "gamestate",
    CONSTRUCTION_LINE: "construction_line",
    PLACE_START: "place_start",
    PLACE_END: "place_end",
    REQUEST_DIMENSIONS: "request_dimensions",
    SEND_DIMENSIONS: "send_dimensions",
    KICK_BALL: "kick_ball"
}

class DataMessage {

    constructor(type, data, createTime) {
        this.type = type
        this.data = data ?? {}
        this.createTime = createTime ?? Date.now()
    }

    toString() {
        return JSON.stringify({
            type: this.type,
            data: this.data,
            createTime: this.createTime
        })
    }

    static fromObject(obj) {
        return new DataMessage(obj.type, obj.data, obj.createTime)
    }

    static fromString(jsonString) {
        return DataMessage.fromObject(JSON.parse(jsonString))
    }

    static Ping() {
        return new DataMessage(dataMessageType.PING)
    }

}

const rtcDataType = {
    Offer: "offer",
    Answer: "answer",
    HostCandidate: "host-candidate",
    AnswerCandidate: "answer-candidate",
}

class RtcBase {

    // ms between pings to host to make sure that connection
    // is still active. Used by both host & clients
    static pingPeriod = 3000

    getSignalsApi = "https://www.noel-friedrich.de/multigolf2/api/get_signals.php"
    sendSignalApi = "https://www.noel-friedrich.de/multigolf2/api/send_signal.php"
    clientUrl = "https://multi.golf/client/index.html"

    static checkForSignalsInterval = 1000
    static clientTimeoutPeriod = 20 * 1000
    static hostTimeoutPeriod = 2 * 60 * 1000
    
    initDatachannelListeners() {
        this.dataChannel.onopen = (e) => {
            this.logFunction("✅ DataChannel opened")
            this.dataChannelOpen = true
        }

        this.dataChannel.onmessage = (e) => {
            this.onDataMessage(e)
        }

        this.dataChannel.onclose = (e) => {
            this.logFunction("❌ DataChannel closed")
            this.dataChannelOpen = false
        }
    }

    constructor({
        logFunction = () => {},
        onDataMessage = () => {},
        onClientUrlAvailable = () => {},
        index = -1,
    }={}) {
        this.logFunction = logFunction
        this.onDataMessage = onDataMessage
        this.onClientUrlAvailable = onClientUrlAvailable
        
        this.processedSignalIds = new Set()
        this.dataChannelOpen = false
        this.signalingUid = null
        this.index = index

        // list of free STUN servers: https://gist.github.com/zziuni/3741933
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                {"urls": "stun:stun.stunprotocol.org:3478"},
                {"urls": "stun:stun.l.google.com:19302"},
            ]})
        
        this.dataChannel = this.peerConnection.createDataChannel("chat", {
            negotiated: true, id: 0})

        this.initDatachannelListeners()
    }

    sendMessage(message) {
        if (message instanceof DataMessage) {
            message = message.toString()
        }

        if (this.dataChannelOpen) {
            this.dataChannel.send(message)
            return true
        } else {
            return false
        }
    }

    async uploadToServer(type, data, objectName) {
        try {
            let apiUrl = this.sendSignalApi
            apiUrl += `?type=${encodeURIComponent(type)}`
            apiUrl += `&uid=${encodeURIComponent(this.signalingUid)}`
            apiUrl += `&data=${encodeURIComponent(JSON.stringify(data))}`
            const response = await fetch(apiUrl)
            const textResponse = await response.text()
    
            if (textResponse == "worked like a charm") {
                this.logFunction(`✅ ${objectName} successfully sent.`)
                return true
            } else {
                throw new Error(`Unknown Server Response: ${textResponse}`)
            }
        } catch (err) {
            this.logFunction(`⚠️ Couldn't upload ${objectName}: ${err.message}`)
            throw err
        }
    }

    async getFromServer(type) {
        try {
            let apiUrl = this.getSignalsApi
            apiUrl += `?uid=${encodeURIComponent(this.signalingUid)}`
            const response = await fetch(apiUrl)
            let rows = await response.json()

            rows = rows.filter(r => !this.processedSignalIds.has(r.id))

            if (type !== undefined) {
                rows = rows.filter(r => r.type == type)
            }

            for (let row of rows) {
                row.data = JSON.parse(row.data)
                this.processedSignalIds.add(row.id)
            }

            return rows
        } catch (err) {
            this.logFunction(`❌ Couldn't fetch Server: ${err.message}`)
            throw err
        }
    }

    async waitUntil(func, name, {
        timeout = 60000,
        checkIntervalMs = 100,
    }={}) {
        const startWaitTime = Date.now()
        while (true) {
            const timeElapsed = Date.now() - startWaitTime
            if (timeElapsed > timeout) {
                throw new Error(`❌ Timeout while waiting for ${name}`)
            }

            if (func()) {
                return
            }

            await new Promise(resolve => setTimeout(resolve, checkIntervalMs))
        }
    }

    async checkForUpdates(untilFunc, handleUpdate, objectName, {
        checkInterval = RtcBase.checkForSignalsInterval,
        timeoutPeriod = RtcBase.hostTimeoutPeriod,
    }) {
        const startTime = Date.now()
        while (!untilFunc()) {
            const updates = await this.getFromServer()
            for (let update of updates) {
                handleUpdate(update)
            }

            const timeElapsed = Date.now() - startTime
            if (timeElapsed > timeoutPeriod) {
                throw new Error(`❌ Timeout while waiting for ${objectName}`)
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval))
        }
    }   

}

class RtcHost extends RtcBase {

    pingMs() {
        return this.lastDataMessageTime - this.lastDataMessage.createTime
    }

    statusColor() {
        let circleColor = "green"
        if (!this.lastDataMessageTime) {
            circleColor = "red"
        } else if (Date.now() - this.lastDataMessageTime > RtcBase.pingPeriod * 2) {
            circleColor = "red"
        } else if (Date.now() - this.lastDataMessageTime > RtcBase.pingPeriod + 500) {
            circleColor = "orange"
        }

        if (this.lastDataMessage && circleColor == "green") {
            let pingMs = this.lastDataMessageTime - this.lastDataMessage.createTime

            // phone clocks are very out of sync
            if (pingMs > 5000) {
                circleColor = "orange"
            }
        }

        return circleColor
    }

    generateSignalingUid() {
        return crypto.randomUUID()
    }

    makeClientUrl() {
        return this.clientUrl + `?uid=${encodeURIComponent(this.signalingUid)}`
    }

    async start() {
        this.logFunction("Starting Connection Process...")

        this.signalingUid = this.generateSignalingUid()

        this.lastDataMessage = null
        this.lastDataMessageTime = null

        this.dataChannel.addEventListener("message", (e) => {
            this.lastDataMessage = DataMessage.fromString(e.data)
            this.lastDataMessageTime = Date.now()
        })

        this.onClientUrlAvailable(this.makeClientUrl())
        this.logFunction("✅ Created QR Code Target")

        this.peerConnection.addEventListener("icecandidateerror", event => {
            this.logFunction(`⚠️ ICE candidate error: ${event.errorText}`)
        })

        this.peerConnection.addEventListener("icecandidate", event => {
            if (event.candidate == null) return
            this.uploadToServer(rtcDataType.HostCandidate, {
                candidate: event.candidate
            }, "Ice Candidate")
        })

        const offer = await this.peerConnection.createOffer()
        await this.peerConnection.setLocalDescription(offer)
        this.uploadToServer(rtcDataType.Offer, {
            sdp: this.peerConnection.localDescription
        }, "Connection Offer")

        await this.checkForUpdates(
            () => this.dataChannelOpen,
            async (signal, abort) => {
                if (signal.type == rtcDataType.AnswerCandidate) {
                    const candidate = new RTCIceCandidate(signal.data.candidate)
                    this.peerConnection.addIceCandidate(candidate)
                }

                if (signal.type == rtcDataType.Answer) {
                    if (this.peerConnection.signalingState != "have-local-offer") {
                        return
                    }

                    const description = new RTCSessionDescription(signal.data.sdp)
                    await this.peerConnection.setRemoteDescription(description)

                    if (signal.data.sdp.type == "offer") {
                        const answer = await this.peerConnection.createAnswer()
                        await this.peerConnection.setLocalDescription(answer)

                        // client needs to realise that this answer is coming from the 
                        // server and not himself, so mask it to be an "rtcDataType.Offer"
                        this.uploadToServer(rtcDataType.Offer, {
                            sdp: this.peerConnection.localDescription
                        }, "Connection Answer")
                    }
                }
            },
            "RTC Answer",
            {timeoutPeriod: RtcBase.hostTimeoutPeriod}
        )
    }

}

class RtcClient extends RtcBase {

    async start(signalingUid) {
        this.logFunction("Starting Connection Process...")

        this.answerSdp = null
        this.offerSdp = null
        this.signalingUid = signalingUid

        this.peerConnection.addEventListener("icecandidateerror", event => {
            this.logFunction(`⚠️ ICE candidate error: ${event.errorText}`)
        })

        this.peerConnection.addEventListener("icecandidate", event => {
            if (event.candidate == null) return
            this.uploadToServer(rtcDataType.AnswerCandidate, {
                candidate: event.candidate
            }, "Ice Candidate")
        })

        await this.checkForUpdates(
            () => this.dataChannelOpen,
            async (signal) => {
                if (signal.type == rtcDataType.HostCandidate) {
                    const candidate = new RTCIceCandidate(signal.data.candidate)
                    this.peerConnection.addIceCandidate(candidate)
                }

                if (signal.type == rtcDataType.Offer) {
                    const description = new RTCSessionDescription(signal.data.sdp)
                    await this.peerConnection.setRemoteDescription(description)

                    if (signal.data.sdp.type == "offer") {
                        const answer = await this.peerConnection.createAnswer()
                        await this.peerConnection.setLocalDescription(answer)
                        this.uploadToServer(rtcDataType.Answer, {
                            sdp: this.peerConnection.localDescription
                        }, "Connection Answer")
                    }
                }
            },
            "RTC Offer",
            {timeoutPeriod: RtcBase.clientTimeoutPeriod}
        )
    }

}