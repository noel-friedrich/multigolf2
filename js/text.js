const Lang = {
    DE: "Deutsch",
    EN: "English",
    get() {
        return document.documentElement.lang == "en"
            ? Lang.EN : Lang.DE
    }
}

const Text = {
    ConnectionFailed: {
        [Lang.EN]: "Connection failed.",
        [Lang.DE]: "Verbindung fehlgeschlagen.",
    },
    TryingAgainInSeconds: seconds => ({
        [Lang.EN]: `⌛ Trying again in ${seconds} seconds.`,
        [Lang.DE]: `⌛ Versuche nochmal in ${seconds} sekunden`
    }),
    TryingAgainIn10: {
        [Lang.EN]: "⌛ Trying again in 10 seconds.",
        [Lang.DE]: "⌛ Versuche nochmal in 10 sekunden"
    },
    ConnectingToHost: {
        [Lang.EN]: "Connecting to Host...",
        [Lang.DE]: "Verbinde zu Server..."
    },
    ConnectedToHost: {
        [Lang.EN]: "Connected to Host.",
        [Lang.DE]: "Verbindung erfolgreich."
    },
    ConnectionEstablished: {
        [Lang.EN]: "✅ Connection established.",
        [Lang.DE]: "✅ Verbindung erfolgreich.",
    },
    ConnectionDied: {
        [Lang.EN]: "❌ Connection died",
        [Lang.DE]: "❌ Verbindung abgebrochen.",
    },
    CouldNotConnect: {
        [Lang.EN]: "❌ Could not connect to Host.",
        [Lang.DE]: "❌ Verbindung fehlgeschlagen.",
    },
    CreatedPool: poolUid => ({
        [Lang.EN]: `✅ Created Game (${poolUid})`,
        [Lang.DE]: `✅ Spiel erstellt (${poolUid})`
    }),
    InitializingPeerToPeer: {
        [Lang.EN]: "🫂 Initializing Peer-To-Peer...",
        [Lang.DE]: "🫂 Verbindung wird aufgebaut...",
    },
    SuccessfullySentObject: objName => ({
        [Lang.EN]: `✅ ${objName} successfully sent.`,
        [Lang.DE]: `✅ ${objName} gesendet.`,
    }),
    FailedSendingObject: (name, err) => ({
        [Lang.EN]: `⚠️ Couldn't upload ${name}: ${err}`,
        [Lang.EN]: `⚠️ Upload von ${name} fehlgeschlagen: ${err}`,
    }),
    CouldntFetchServer: err => ({
        [Lang.EN]: `❌ Couldn't fetch Server: ${err}`,
        [Lang.DE]: `❌ Server blöd: ${err}`,
    }),
    GoodConnection: {
        [Lang.EN]: "Good Connection",
        [Lang.DE]: "Gute Verbindung"
    },
    ConnectionBeingInitialized: {
        [Lang.EN]: "Connection is being initialized",
        [Lang.DE]: "Verbindung wird hergestellt"
    },
    ConnectionTimedOut: {
        [Lang.EN]: "Connecton timed out",
        [Lang.DE]: "Verbindung abgebrochen"
    },
    ConnectionIsSlow: pingMs => ({
        [Lang.EN]: `Connection is slow (${pingMs}ms Ping)`,
        [Lang.DE]: `Verbindung ist langsam (${pingMs}ms Ping)`
    }),
    ConnectionInvitation: {
        [Lang.EN]: "Connection Invitation",
        [Lang.DE]: "Verbindungs-Einladung"
    },
    RTCAnswer: {
        [Lang.EN]: "RTC Answer",
        [Lang.DE]: "RTC Antwort"
    },
    ConnectionAnswer: {
        [Lang.EN]: "Connection Answer",
        [Lang.DE]: "Verbindungs-Antwort"
    },
    PleaseEnterCode: {
        [Lang.EN]: "Please enter an ID.",
        [Lang.DE]: "Bitte gib eine ID ein.",
    },
    CodeMustBeCharsLong: numChars => ({
        [Lang.EN]: `ID must be ${numChars} characters long.`,
        [Lang.DE]: `ID muss ${numChars} Buchstaben lang sein.`
    }),
    IsServerDown: {
        [Lang.EN]: "Couldn't request site: Server down?",
        [Lang.DE]: "Server hat nicht geantwortet: Server down?"
    },
    UnknownID: {
        [Lang.EN]: "Unknown ID",
        [Lang.DE]: "Unbekannte ID"
    },
    MultigolfScoreboard: {
        [Lang.EN]: "Multigolf Scoreboard",
        [Lang.DE]: "Multigolf Ergebnisse"
    },
    ShareText: {
        [Lang.EN]: "Look! Scores! We played Multigolf! You should too!",
        [Lang.DE]: "Guck mal! Wir haben Multigolf gespielt!"
    },
    LeavingWarning: {
        [Lang.EN]: "You're in an active game of multigolf. Leaving this website will break the game!",
        [Lang.DE]: "Du bist in einem aktiven Multigolf-Spiel. Das Verlassen der Website beendet das Spiel!"
    },
    NameTooLong: name => ({
        [Lang.EN]: `Name "${name}..." is too long.`,
        [Lang.DE]: `Der Name "${name}..." ist zu lang.`,
    }),
    PleaseFillOutFields: {
        [Lang.EN]: "Please fill out all fields.",
        [Lang.DE]: "Bitte fülle alle Felder aus."
    },
    FilloutOneName: {
        [Lang.EN]: "Fill out at least one name to continue.",
        [Lang.DE]: "Bitte fülle mindestens einen Namen aus."
    },
    TwoPlayersSameName: {
        [Lang.EN]: "Two players cannot have the same name.",
        [Lang.DE]: "Es kann sich kein Name doppeln."
    },
    DeviceGravity: {
        [Lang.EN]: "Device Gravity",
        [Lang.DE]: "Gerät-Gravitation"
    },
    DeviceGravityDescription: {
        [Lang.EN]: "If enabled, phones that are tilted in real life will apply a gravity effect on balls.",
        [Lang.DE]: "Wenn aktiviert wird die Orientierung von Handys als Gravitation einberechnet."
    },
    DeviceGravityWarning: {
        [Lang.EN]: "Only works for phones with accelorometers.",
        [Lang.DE]: "Funktioniert nur für Handys mit Zugriff auf Beschleunigungssensor"
    },
    BallCollisions: {
        [Lang.EN]: "Ball Collisisions",
        [Lang.DE]: "Ball-Kollisionen"
    },
    BallCollisionsDescription: {
        [Lang.EN]: "If enabled, balls can kick each other. If disabled, balls will fly over each other.",
        [Lang.DE]: "Wenn aktiviert können Bälle sich gegenseitig schubsen."
    },
    Soundeffects: {
        [Lang.EN]: "Soundeffects",
        [Lang.DE]: "Soundeffekte"
    },
    SoundeffectsDescription: {
        [Lang.EN]: "If enabled, the host device will play sound effects when balls collide with something.",
        [Lang.DE]: "Wenn aktiviert spielen Soundeffekte auf dem Server-Gerät wenn Bälle mit etwas kollidieren."
    },
    ReadNames: {
        [Lang.EN]: "Read Names",
        [Lang.DE]: "Namen Vorlesen"
    },
    ReadNamesDescription: {
        [Lang.EN]: "If enabled, the host device will read the name of the player whose turn it is out loud.",
        [Lang.DE]: "Wenn aktiviert wird das Server-Gerät den Namen des aktiven Spielers vorlesen."
    },
    MaximumKicksPerRound: {
        [Lang.EN]: "Maximum Kicks per Round",
        [Lang.DE]: "Maximale Schläge pro Runde"
    },
    MaximumKicksPerRoundDescription: {
        [Lang.EN]: "Decide how many kicks each player can have per round before failing and getting a 2 point penalty.",
        [Lang.DE]: "Entscheide wieviele Schläge jede Spielerin bekommt, bevor sie 2 Strafpunkte bekommt."
    },
    OnceYouConnectPlayers: {
        [Lang.EN]: "Once you connect players, they will show up here.",
        [Lang.DE]: "Sobald du Geräte verbindest, tauchen sie hier auf."
    },
    DeviceNum: num => ({
        [Lang.EN]: `Device #${num}`,
        [Lang.DE]: `Gerät #${num}`,
    }),
    NoDevicesError: {
        [Lang.EN]: "You haven't connected any devices yet. Connect one and try again!",
        [Lang.DE]: "Du hast noch keine Geräte verbunden. Verbinde mindestens eines und versuche nochmal!"
    },
    CourseHasOverlap: {
        [Lang.EN]: "Your course has overlapping parts. Try reconnecting the phones in a different way and draw lines in the same directions on connecting phones. Do you still want to proceed?",
        [Lang.DE]: "Der Kurs hat überlappende Teile. Versuche, die Geräte neu miteinander zu verbinden. Willst du trotzdem weiter (nicht empfohlen)?"
    },
    NoStartYet: {
        [Lang.EN]: "You haven't placed a start yet. Place one and try again.",
        [Lang.DE]: "Dem Kurs fehlt ein Start. Platzier einen und probier nochmal."
    },
    NoHoleYet: {
        [Lang.EN]: "You haven't placed a hole yet. Place one and try again.",
        [Lang.DE]: "Dem Kurs fehlt ein Loch. Platzier eins und probier nochmal."
    },
    HaventPlacedHoleFor: name => ({
        [Lang.EN]: `You haven't placed a hole for ${name} yet.`,
        [Lang.DE]: `Du hast noch kein Loch für ${name} platziert.`
    }),
    ObjectStart: {
        [Lang.EN]: "Start",
        [Lang.DE]: "Start"
    },
    ObjectHole: {
        [Lang.EN]: "Hole",
        [Lang.DE]: "Loch"
    },
    ObjectLava: {
        [Lang.EN]: "Lava",
        [Lang.DE]: "Lava"
    },
    ObjectEraser: {
        [Lang.EN]: "Eraser",
        [Lang.DE]: "Radierer"
    },
    ObjectDuellHole: num => ({
        [Lang.EN]: `Hole ${num}`,
        [Lang.DE]: `Loch ${num}`,
    }),
    ObjectCustomWall: {
        [Lang.EN]: "Extra Wall",
        [Lang.DE]: "Extra Wand"
    },
    ObjectGravityBox: {
        [Lang.EN]: "Gravity Box",
        [Lang.DE]: "Gravitations-Box"
    },
    ObjectStartDescription: {
        [Lang.EN]: "Place where all balls start",
        [Lang.DE]: "Platz wo alle Bälle starten"
    },
    ObjectHoleDescription: {
        [Lang.EN]: "Goal that all balls must reach",
        [Lang.DE]: "Ziel welches alle Bälle erreichen müssen"
    },
    ObjectLavaDescription: {
        [Lang.EN]: "Balls falling into Lava are reset to the start",
        [Lang.DE]: "In Lava fallen = Zum Start zurück"
    },
    ObjectEraserDescriptiom: {
        [Lang.EN]: "Erase placed objects",
        [Lang.DE]: "Radiere platzierte Objekte"
    },
    ObjectDuellHoleDescription: playername => ({
        [Lang.EN]: `Goal that ${playername} has to reach`,
        [Lang.DE]: `Ziel das ${playername} erreichen muss`
    }),
    ObjectCustomWallDescription: {
        [Lang.EN]: "A wall that balls will bounce off",
        [Lang.DE]: "Eine Wand an der Bälle abprallen"
    },
    ObjectGravityBoxDescription: {
        [Lang.EN]: "Balls inside will experience gravity",
        [Lang.DE]: "Bälle werden in die Richtung geschubst"
    }
}

function getLangText(textObject) {
    return textObject[Lang.get()]
}

// convert every attribute of Text to a getter
// which returns the correct attribute depending on which
// language is currently chosen
for (const [key, val] of Object.entries(Text)) {
    if (typeof val === "function") {
        Text[key] = function () {
            return getLangText(val(...arguments))
        }
    } else {
        Object.defineProperty(Text, key, {
            get: () => getLangText(val)
        })
    }
}

Object.freeze(Text)