const dataMessageType = {
    PING: "ping",
    GAMESTATE: "gamestate",
    CONSTRUCTION_LINE: "construction_line",
    PLACE_OBJECT: "place_object",
    CHANGE_OBJECT: "change_object",
    REMOVE_OBJECT: "remove_object",
    REQUEST_DIMENSIONS: "request_dimensions",
    SEND_DIMENSIONS: "send_dimensions",
    KICK_BALL: "kick_ball",
    DEVICE_ORIENTATION: "device_orientation"
}

class DataMessage {

    constructor(type, data, createTime, receivedTime, hostTime) {
        this.type = type
        this.data = data ?? {}
        this.createTime = createTime ?? Date.now()

        this.hostTime = hostTime ?? null
        this.receivedTime = receivedTime ?? null
    }

    toString() {
        return JSON.stringify({
            type: this.type,
            data: this.data,
            createTime: this.createTime,
            receivedTime: this.receivedTime,
            hostTime: this.hostTime
        })
    }

    static fromObject(obj) {
        return new DataMessage(obj.type, obj.data, obj.createTime, obj.receivedTime, obj.hostTime)
    }

    static fromString(jsonString) {
        return DataMessage.fromObject(JSON.parse(jsonString))
    }

    static Ping(data={}) {
        return new DataMessage(dataMessageType.PING, data)
    }

}

const rtcDataType = {
    openPool: "open_pool",
    joinPool: "join_pool",
    Offer: "offer",
    Answer: "answer",
    HostCandidate: "host-candidate",
    AnswerCandidate: "answer-candidate",
}

// this api key has to be public anyways. this jumbling is just to prevent naive
// scanning bots to send me ridiculus emails every so often threatening something
// (this is just for funsies, please don't care.)

function getNotSoSecretMeteredApiKey() {
    let str = "fa94c40a3450effec69e410ae8d2b6e"
    const isPrime = n=>{
        if (n < 2) return false
        if (n === 2) return true
        if (n % 2 === 0) return false
        for (let i = 3; i <= Math.sqrt(n); i += 2) {
            if (n % i === 0) return false
        }
        return true
    }

    let count = 0
    for (let i = 0; true; i++) {
        if (isPrime(i)) {
            count++
            if (count == 5425) {
                str += i.toString()
                break
            }
        }
    }

    return str.split("").reverse().join("") 
}

const notSoSecretMeteredApiKey = getNotSoSecretMeteredApiKey()

class RtcBase {

    // ms between pings to host to make sure that connection
    // is still active. Used by both host & clients
    static pingPeriod = 3000

    closePoolApi = "https://www.noel-friedrich.de/multigolf2/api/close_pool.php"
    getSignalsApi = "https://www.noel-friedrich.de/multigolf2/api/get_signals.php"
    sendSignalApi = "https://www.noel-friedrich.de/multigolf2/api/send_signal.php"
    getIceServersApi = "https://multigolf2.metered.live/api/v1/turn/credentials?apiKey=" + notSoSecretMeteredApiKey

    static checkForSignalsInterval = 1000
    static clientTimeoutPeriod = 20 * 1000
    static hostTimeoutPeriod = 2 * 60 * 1000
    
    initDatachannelListeners() {
        this.dataChannel.onopen = (e) => {
            if (!this.alive) return
            this.logFunction("✅ Connection established.")
            this.dataChannelOpen = true
        }

        this.dataChannel.onmessage = (e) => {
            if (!this.alive) return
            const message = DataMessage.fromString(e.data)
            if (message.receivedTime === null) {
                message.receivedTime = Date.now()
            }
            
            this.lastDataMessage = message
            this.lastDataMessageTime = Date.now()
            this.onDataMessage(message)
        }

        this.dataChannel.onclose = (e) => {
            if (!this.alive) return
            this.logFunction("❌ Connection died")
            this.dataChannelOpen = false
            this.die()
            this.onDataClose()
        }
    }

    async init() {
        if (this.hasInitted) {
            return
        }

        if (new URLSearchParams(location.search).has("debug")) {
            this.logFunction("🫂 Initializing Peer-To-Peer...")
        }
        this.hasInitted = true

        const response = await fetch(this.getIceServersApi)
        const iceServers = await response.json()

        if (new URLSearchParams(location.search).has("debug")) {
            console.log("[DEBUG] received ice servers from api", iceServers)
        }

        iceServers.push({urls: "stun:stun.l.google.com:19302"})
        iceServers.push(...[{urls: 'stun:freeturn.net:5349'}, {urls: 'turns:freeturn.tel:5349', username: 'free', credential: 'free'}])

        this.peerConnection = new RTCPeerConnection({iceServers: iceServers})
        
        this.dataChannel = this.peerConnection.createDataChannel("chat", {
            negotiated: true, id: 0})

        this.initDatachannelListeners()
    }

    constructor({
        logFunction = () => {},
        onDataMessage = () => {},
        onDataClose = () => {},
        index = -1,
        poolUid = null,
    }={}) {
        this.logFunction = logFunction
        this.onDataMessage = onDataMessage
        this.onDataClose = onDataClose
        
        this.processedSignalIds = new Set()
        this.dataChannelOpen = false
        this.signalingUid = null
        this.hasInitted = false
        this.lastDataMessage = null
        this.lastDataMessageTime = null
        this.alive = true

        this.index = index
        this.poolUid = poolUid

        if (!poolUid) {
            throw new Error("PoolUid must be given to WebRTC Handler")
        }
    }

    die() {
        this.alive = false
    }

    sendMessage(message) {
        if (!this.alive) return
        
        if (message instanceof DataMessage) {
            if (this.delayMs !== undefined) {
                message.hostTime = Date.now() + this.delayMs
            }

            message = message.toString()
        }

        if (this.dataChannelOpen) {
            this.dataChannel.send(message)
            return true
        } else {
            return false
        }
    }

    async uploadToServer(type, data, objectName, logSuccess=true) {
        try {
            let apiUrl = this.sendSignalApi
            apiUrl += `?type=${encodeURIComponent(type)}`
            apiUrl += `&pool_uid=${encodeURIComponent(this.poolUid)}`
            apiUrl += `&uid=${encodeURIComponent(this.signalingUid)}`
            apiUrl += `&data=${encodeURIComponent(JSON.stringify(data))}`
            const response = await fetch(apiUrl)
            const textResponse = await response.text()
    
            if (textResponse == "worked like a charm") {
                if (logSuccess) {
                    this.logFunction(`✅ ${objectName} successfully sent.`)
                }
                return true
            } else {
                throw new Error(`Unknown Server Response: ${textResponse}`)
            }
        } catch (err) {
            this.logFunction(`⚠️ Couldn't upload ${objectName}: ${err.message}`)
            throw err
        }
    }

    async getFromServer(type, uid) {
        try {
            let apiUrl = this.getSignalsApi
            apiUrl += `?pool_uid=${encodeURIComponent(this.poolUid)}`
            const response = await fetch(apiUrl)
            let rows = await response.json()

            rows = rows.filter(r => !this.processedSignalIds.has(r.id))

            if (type !== undefined) {
                rows = rows.filter(r => r.type == type)
            }

            if (uid !== undefined) {
                rows = rows.filter(r => r.uid == uid)
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
                throw new Error(`Timeout while waiting for ${name}`)
            }

            if (!this.alive) {
                throw new Error(`Connection died while waiting for ${name}`)
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
            const updates = await this.getFromServer(undefined, this.signalingUid)

            if (!this.alive) {
                throw new Error(`Connection died while waiting for ${objectName}`)
            }

            for (let update of updates) {
                handleUpdate(update)
            }

            const timeElapsed = Date.now() - startTime
            if (timeElapsed > timeoutPeriod) {
                throw new Error(`Timeout while waiting for ${objectName}`)
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval))
        }
    }   

    generateSignalingUid() {
        return Math.random().toString().slice(2)
    }

}

class RtcHost extends RtcBase {

    getStatus() {
        let color = "green"
        let message = "Good Connection"

        if (!this.lastDataMessageTime) {
            color = "blue"
            message = "Connection is being initialized"
        } else if (Date.now() - this.lastDataMessageTime > RtcBase.pingPeriod * 2) {
            color = "red"
            message = "Connection timed out"
        }

        if (this.lastDataMessage && color == "green") {
            // phone clocks are very out of sync
            if (this.delayMs > 500) {
                color = "orange"
                message = `Connection is slow (${Math.round(this.delayMs * 2)}ms Ping)`
            }
        }

        return {color, message}
    }

    receivePing(pingMessage) {
        // return true when a change has been made so that 
        // potential GUI changes can be made

        this.receivedPing = pingMessage
        
        if (pingMessage.data.displaySize) {
            const before = this.clientDisplaySize ? this.clientDisplaySize.copy() : null
            this.clientDisplaySize = Vector2d.fromObject(pingMessage.data.displaySize)
            if (!before || before.x != this.clientDisplaySize.x || before.y != this.clientDisplaySize.y) {
                return true
            }
        }
        
        return false
    }

    async startPinging() {
        while (true) {
            const pingStartTime = Date.now()
            this.sendMessage(DataMessage.Ping({index: this.index}))

            this.receivedPing = null
            await this.waitUntil(() => this.receivedPing, "Pinging")
            
            const timeElapsed = this.receivedPing.receivedTime - pingStartTime

            // the time between host and client (pingTime) is approximated as
            // time delay between back and forth ping halved
            this.delayMs = timeElapsed / 2
            
            await new Promise(resolve => setTimeout(resolve, RtcBase.pingPeriod))
        }
    }

    async start(signalingUid) {
        this.delayMs = 0
        this.signalingUid = signalingUid
        this.clientDisplaySize = null

        await this.init()

        this.peerConnection.addEventListener("icecandidateerror", event => {
            if (!this.alive) return
            if (new URLSearchParams(location.search).has("debug")) {
                console.log(`[DEBUG] ICE candidate error: ${event.errorText}`)
            }
        })

        this.peerConnection.addEventListener("icecandidate", event => {
            if (!this.alive) return
            if (event.candidate == null) return
            this.uploadToServer(rtcDataType.HostCandidate, {
                candidate: event.candidate
            }, "Ice Candidate", false)
        })

        const offer = await this.peerConnection.createOffer()
        await this.peerConnection.setLocalDescription(offer)
        if (!this.alive) return

        this.uploadToServer(rtcDataType.Offer, {
            sdp: this.peerConnection.localDescription
        }, "Connection Offer", new URLSearchParams(location.search).has("debug"))

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

    getStatus() {
        let color = "green"
        let message = "Good Connection"

        if (!this.lastDataMessageTime) {
            color = "blue"
            message = "Connection is being initialized"
        } else if (Date.now() - this.lastDataMessageTime > RtcBase.pingPeriod * 2) {
            color = "red"
            message = "Connection timed out"
        }

        return {color, message}
    }

    async joinPool(deviceIndex) {
        await this.uploadToServer(rtcDataType.joinPool, {
            signalingUid: this.signalingUid, deviceIndex
        }, "Connection Invitation")
    }

    async start(deviceIndex=null) {
        await this.init()

        this.answerSdp = null
        this.offerSdp = null
        this.signalingUid = this.generateSignalingUid()

        await this.joinPool(deviceIndex)
        if (!this.alive) return

        this.peerConnection.addEventListener("icecandidateerror", event => {
            if (!this.alive) return
            if (new URLSearchParams(location.search).has("debug")) {
                console.log(`[DEBUG] ICE candidate error: ${event.errorText}`)
            }
        })

        this.peerConnection.addEventListener("icecandidate", event => {
            if (!this.alive) return
            if (event.candidate == null) return
            this.uploadToServer(rtcDataType.AnswerCandidate, {
                candidate: event.candidate
            }, "Ice Candidate", false)
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

class RtcHostManager {

    static checkForJoinsPeriod = 5000
    static clientUrl = "https://multi.golf/client/"
    static openPoolApi = "https://www.noel-friedrich.de/multigolf2/api/open_pool.php"

    constructor({
        logFunction = () => {},
        onDataMessage = () => {},
        onClientUrlAvailable = () => {},
    }={}) {
        this.logFunction = logFunction
        this.onDataMessage = onDataMessage
        this.onClientUrlAvailable = onClientUrlAvailable

        this.poolUid = null
        this.connections = []
        this.polling = false
    }

    makeConnection(deviceIndex) {
        const connection = new RtcHost({
            logFunction: (message) => {
                if (!connection.alive) {
                    return
                }
                this.logFunction(`[${connection.index}] ${message}`)
            },
            onDataMessage: (message) => {
                this.onDataMessage(message, connection)
            },
            poolUid: this.poolUid
        })

        if (deviceIndex != null && deviceIndex <= this.connections.length) {
            this.connections[deviceIndex - 1].die()
            this.connections[deviceIndex - 1] = connection
        } else {
            this.connections.push(connection)
        }

        this.sortConnections()
        return connection
    }

    sortConnections() {
        this.connections.sort((a, b) => {
            return a.randomOffset - b.randomOffset
        })

        for (let i = 0; i < this.connections.length; i++) {
            // index=0 is reserved for host (legacy)
            this.connections[i].index = i + 1
        }
    }

    async openPool() {
        const urlParams = new URLSearchParams(location.search)
        if (urlParams.has("debug") && urlParams.has("p")) {
            return urlParams.get("p")
        }

        const response = await fetch(RtcHostManager.openPoolApi)
        const jsonData = await response.json()
        return jsonData["pool_uid"]
    }

    makeClientUrl() {
        return RtcHostManager.clientUrl + `?p=${encodeURIComponent(this.poolUid)}`
    }

    async start() {
        this.poolUid = await this.openPool()
        this.onClientUrlAvailable(this.makeClientUrl())
        this.logFunction(`✅ Created Pool (${this.poolUid})`)

        // the baseConnection is just used to get updates from
        // the signalling server, not to form a peer-to-peer
        // webrtc connection with another device
        this.baseConnection = new RtcBase({poolUid: this.poolUid})
        
        this.startPolling()
    }

    async startPolling() {
        this.polling = true
        while (this.polling) {
            const updates = await this.baseConnection.getFromServer(rtcDataType.joinPool)
            for (let update of updates) {
                const deviceIndex = update.data.deviceIndex
                const signalingUid = update.data.signalingUid
                const connection = this.makeConnection(deviceIndex)
                connection.start(signalingUid).then(() => {
                    connection.startPinging()
                })
            }

            await new Promise(resolve => setTimeout(resolve, RtcHostManager.checkForJoinsPeriod))
        }
    }

    removeLostConnections() {
        this.connections = this.connections.filter(c => c.getStatus().color != "red")
    }

}