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

class RtcBase {

    // ms between pings to host to make sure that connection
    // is still active. Used by both host & clients
    static pingPeriod = 3000

    // period before host device gives up
    static offerGracePeriod = 120000

    // period before client device gives up
    static answerGracePeriod = 20000

    getSdpUrl = "https://www.noel-friedrich.de/multigolf2/api/get_sdp.php"
    sendSdpUrl = "https://www.noel-friedrich.de/multigolf2/api/send_sdp.php"
    clientUrl = "https://noel-friedrich.de/multigolf2/client/index.html"

    // period of time to wait after receiving a new
    // ICE candidate to wait for a new one generating
    candidateMaxInterval = 2000

    checkForAnswerInterval = 2000
    
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
        
        this.dataChannelOpen = false
        this.signalingUid = null
        this.index = index

        // list of free STUN servers: https://gist.github.com/zziuni/3741933
        this.peerConnection = new RTCPeerConnection({
            iceServers: [{urls: "stun:stun.l.google.com:19302"}]})
        
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
        this.peerConnection.onicecandidate = ({candidate}) => {
            this.lastCandidateTime = Date.now()
            this.offerSdp = this.peerConnection.localDescription.sdp
        }

        this.logFunction("Starting Connection Process...")

        this.signalingUid = this.generateSignalingUid()
        this.offerSdp = null
        this.answerSdp = null
        this.lastCandidateTime = null
        this.sentOffer = false

        this.lastDataMessage = null
        this.lastDataMessageTime = null

        this.dataChannel.addEventListener("message", (e) => {
            this.lastDataMessageTime = Date.now()
            this.lastDataMessage = DataMessage.fromString(e.data)
        })

        this.onClientUrlAvailable(this.makeClientUrl())

        await this.createOffer()
        await this.uploadOffer()

        await this.waitForAnswer()
        await this.processAnswer()
        this.logFunction("Initiating Datachannel...")

        await this.waitForDatachannelToOpen()
    }

    async updateAnswerSdp() {
        try {
            let apiUrl = this.getSdpUrl
            apiUrl += `?uid=${encodeURIComponent(this.signalingUid)}`
            const response = await fetch(apiUrl)
            let answers = await response.json()

            answers = answers.filter(a => a.type == "answer")
    
            if (answers.length >= 1) {
                this.logFunction("✅ Connection Answer received.")
                this.answerSdp = answers[0].sdp // if there are more than
                // one answer, ignore the rest and handle first

                return true
            } else {
                return false
            }
        } catch (err) {
            this.logFunction("⚠️ Couldn't fetch Answer Server")
            throw err
        }
    }

    async waitForAnswer() {
        this.logFunction("Waiting for Connection Answer...")

        let startTime = Date.now()
        while (!await this.updateAnswerSdp()) {
            await new Promise(resolve => setTimeout(resolve, this.checkForAnswerInterval))

            if (Date.now() - startTime > RtcBase.offerGracePeriod) {
                throw new Error("Timeout. Couldn't establish a connection. Please try again.")
            }
        }
    }

    async waitForDatachannelToOpen() {
        this.logFunction("Waiting for Datachannel to open...")
        
        let startTime = Date.now()
        while (!this.dataChannelOpen) {
            await new Promise(resolve => setTimeout(resolve, 100))

            if (Date.now() - startTime > RtcBase.answerGracePeriod) {
                throw new Error("Timeout. Couldn't connect with device. Try again in a bit?")
            }
        }
    }

    async uploadOffer() {
        this.logFunction("Uploading Connection Offer...")

        try {
            let apiUrl = this.sendSdpUrl + "?type=offer"
            apiUrl += `&uid=${encodeURIComponent(this.signalingUid)}`
            apiUrl += `&sdp=${encodeURIComponent(this.offerSdp)}`
            const response = await fetch(apiUrl)
            const textResponse = await response.text()
    
            if (textResponse == "worked like a charm") {
                this.logFunction("✅ Connection Offer successfully sent.")
                return true
            } else {
                throw new Error(`Unknown Answer: ${textResponse}`)
            }
        } catch (err) {
            this.logFunction("⚠️ Couldn't upload Connection Offer.")
            throw err
        }
    }

    async createOffer() {
        this.logFunction("Creating Offer...")
        const offer = await this.peerConnection.createOffer()
        await this.peerConnection.setLocalDescription(offer)

        while (this.lastCandidateTime == null || Date.now() - this.lastCandidateTime < this.candidateMaxInterval) {
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        this.logFunction("✅ Offer successfully created.")
    }

    async processAnswer() {
        if (this.peerConnection.signalingState != "have-local-offer") {
            return
        }
    
        this.peerConnection.setRemoteDescription({
            type: "answer",
            sdp: this.answerSdp
        })
    }

}

class RtcClient extends RtcBase {

    async start(signalingUid) {
        this.peerConnection.onicecandidate = ({candidate}) => {
            this.lastCandidateTime = Date.now()
            this.answerSdp = this.peerConnection.localDescription.sdp
        }

        this.answerSdp = null
        this.offerSdp = null
        this.signalingUid = signalingUid

        await this.waitForOffer()
        await this.processOffer()
        await this.uploadAnswer()
        await this.waitForDatachannelToOpen()
    }

    async updateOfferSdp() {
        try {
            let apiUrl = this.getSdpUrl
            apiUrl += `?uid=${encodeURIComponent(this.signalingUid)}`
            const response = await fetch(apiUrl)
            let answers = await response.json()

            answers = answers.filter(a => a.type == "offer")
    
            if (answers.length >= 1) {
                this.logFunction("✅ Connection Offer received.")
                this.offerSdp = answers[0].sdp // if there are more than
                // one answer, ignore the rest and handle first

                return true
            } else {
                return false
            }
        } catch (err) {
            this.logFunction("⚠️ Couldn't fetch Offer Server")
            throw err
        }
    }

    async uploadAnswer() {
        this.logFunction("Uploading Connection Answer...")

        try {
            let apiUrl = this.sendSdpUrl + "?type=answer"
            apiUrl += `&uid=${encodeURIComponent(this.signalingUid)}`
            apiUrl += `&sdp=${encodeURIComponent(this.answerSdp)}`
            const response = await fetch(apiUrl)
            const textResponse = await response.text()
    
            if (textResponse == "worked like a charm") {
                this.logFunction("✅ Connection Answer successfully sent.")
                return true
            } else {
                throw new Error(`Unknown Answer: ${textResponse}`)
            }
        } catch (err) {
            this.logFunction("⚠️ Couldn't upload Connection Answer.")
            throw err
        }
    }

    async processOffer() {
        await this.peerConnection.setRemoteDescription({
            type: "offer",
            sdp: this.offerSdp
        })
    
        this.logFunction("Creating Answer...")
        const answer = await this.peerConnection.createAnswer()
        await this.peerConnection.setLocalDescription(answer)

        while (this.lastCandidateTime == null || Date.now() - this.lastCandidateTime < this.candidateMaxInterval) {
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        this.logFunction("✅ Answer successfully created.")
    }

    async waitForOffer() {
        this.logFunction("Waiting for Connection Offer...")

        let startTime = Date.now()
        while (!await this.updateOfferSdp()) {
            await new Promise(resolve => setTimeout(resolve, this.checkForAnswerInterval))

            if (Date.now() - startTime > RtcBase.answerGracePeriod) {
                throw new Error("Timeout. Couldn't connect: try generating a new QR code and rescanning.")
            }
        }
    }

    async waitForDatachannelToOpen() {
        if (this.dataChannelOpen) return
        this.logFunction("Waiting for Datachannel to open...")
        
        let startTime = Date.now()
        while (!this.dataChannelOpen) {
            await new Promise(resolve => setTimeout(resolve, 100))

            if (Date.now() - startTime > RtcBase.answerGracePeriod) {
                throw new Error("Timeout. Couldn't connect: try generating a new QR code and rescanning.")
            }
        }
    }

}