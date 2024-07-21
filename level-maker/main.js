const levelCanvas = document.querySelector("#level-canvas")
const levelContext = levelCanvas.getContext("2d")
const objectList = document.querySelector("#object-list")
const mainElement = document.querySelector("main")
const objectTypeSelect = document.querySelector("#object-type-select")

const levelSize = new Vector2d(360, 640) // 16 / 9
const canvasAspectRatio = levelSize.x / levelSize.y

function updateEditorLayout() {
    const editorContainer = document.querySelector(".level-maker-container")
    const canvasHeight = window.screen.availHeight * 0.7
    const canvasWidth = canvasHeight * canvasAspectRatio

    levelCanvas.style.width = canvasWidth + "px"
    levelCanvas.style.height = canvasHeight + "px"
    editorContainer.style.gridTemplateColumns = `${canvasWidth}px 1fr`
    editorContainer.style.height = canvasHeight + "px"
}

document.addEventListener("resize", updateEditorLayout)
updateEditorLayout()

function makeGameState(templateState=null) {
    const course = new Course([PhoneCoordinates.fromWidthHeight(levelSize.x, levelSize.y)])

    const board = new Board(course, [
        GolfObject.makeDefault(golfObjectType.Start)
            .setPos(new Vector2d(levelSize.x / 2, levelSize.y * 3 / 4)),
        GolfObject.makeDefault(golfObjectType.Hole)
            .setPos(new Vector2d(levelSize.x / 2, levelSize.y / 4)),
    ])

    let gameState = new GameState(gamePhase.PlayingSandbox, gameMode.Sandbox, board, [], 1)

    if (templateState) {
        gameState = templateState
    }

    gameState.getReferenceCanvas = () => levelCanvas
    gameState.phase = gamePhase.Placing
    gameState.deviceIndex = 1

    return gameState
}   

let gameState = makeGameState()
const editingState = {
    focusedObject: null,
    draggingObject: null,
    draggingOffset: null
}

mainElement.onclick = event => {
    if (event.target.dataset.onclickunfocus) {
        editingState.focusedObject = null
        updateAllHtml()
    }
}

function updateLevelCanvas() {
    Renderer.render(gameState, levelContext, editingState, {preventScrolling: false})
}

function updateObjectSelection() {
    for (const objectTable of objectList.querySelectorAll(".object-table")) {
        if (objectTable.dataset.uid == editingState.focusedObject?.uid) {
            objectTable.classList.add("selected")
        } else {
            objectTable.classList.remove("selected")
        }
    }
}

function updateObjectList() {
    function makeObjectTable(object) {
        const table = document.createElement("div")
        table.classList.add("object-table")
        table.dataset.uid = object.uid

        function addAttribute(keyText, valueText, {
            editable = false,
            type = null,
            set = () => {},
        }={}) {
            const key = document.createElement("div")
            const val = document.createElement(editable ? "input" : "div")

            key.classList.add("key")
            val.classList.add("val")

            key.textContent = keyText

            if (editable) {
                val.value = valueText
            } else {
                val.textContent = valueText
            }

            const markCorrect = () => val.style.color = "black"
            const markIncorrect = () => val.style.color = "red"

            if (editable && type == "number") {
                val.type = "number"

                val.addEventListener("input", () => {
                    const value = parseFloat(val.value)
                    if (isNaN(value)) {
                        markIncorrect()
                    } else {
                        markCorrect()
                        set(value)
                        updateLevelCanvas()
                    }
                })
            }   

            if (editable && type == "Vector2d") {
                val.addEventListener("input", () => {
                    try {
                        const value = Vector2d.fromString(val.value)
                        markCorrect()
                        set(value)
                        updateLevelCanvas()
                    } catch {
                        markIncorrect()
                    }
                })
            }

            table.appendChild(key)
            table.appendChild(val)
        }

        function addButton(text, onClick) {
            const button = document.createElement("button")
            button.textContent = text
            button.addEventListener("click", onClick)
            table.appendChild(button)
        }

        addAttribute("type", object.type)
        addAttribute("pos", object.pos.toString(),
            {editable: true, type: "Vector2d", set: v => object.pos.setVector2d(v)})
        addAttribute("size", object.size.toString(),
            {editable: object.resizable, type: "Vector2d", set: v => object.size.setVector2d(v)})
        addAttribute("angle (°)", object.angle / Math.PI * 180,
            {editable: true, type: "number", set: v => object.angle = v / 180 * Math.PI})
        
        addButton("Delete", () => {
            gameState.board.objects = gameState.board.objects.filter(o => o.uid != object.uid)
            updateObjectList()
            updateLevelCanvas()
        })

        addButton("Move Up", () => {
            let index = null
            for (let i = 0; i < gameState.board.objects.length; i++) {
                if (gameState.board.objects[i].uid == object.uid) {
                    index = i
                }
            }

            if (index === null || index === 0) {
                return
            }

            editingState.focusedObject = object

            const temp = gameState.board.objects[index - 1]
            gameState.board.objects[index - 1] = gameState.board.objects[index]
            gameState.board.objects[index] = temp
            updateObjectList()
            updateObjectSelection()
        })

        table.addEventListener("click", () => {
            editingState.focusedObject = object
            updateLevelCanvas()
            updateObjectSelection()
        })

        return table
    }

    for (const objectTable of objectList.querySelectorAll(".object-table")) {
        objectTable.remove()
    }

    for (const object of gameState.board.objects) {
        const objectTable = makeObjectTable(object)
        objectList.appendChild(objectTable)
    }

    updateObjectSelection()
}

function initObjectTypeSelect() {
    for (const type of Object.values(defaultObjects).map(o => o.type)) {
        const option = document.createElement("option")
        option.value = type
        option.textContent = type
        objectTypeSelect.appendChild(option)
    }
}

initObjectTypeSelect()

function addObject() {
    const startExists = !!gameState.board.objects.find(o => o.type == golfObjectType.Start)

    if (objectTypeSelect.value == golfObjectType.Start && startExists) {
        return alert("There can only be one start")
    }

    const object = GolfObject.makeDefault(objectTypeSelect.value)
    object.pos = levelSize.scale(0.5)
    gameState.board.objects.push(object)
    editingState.focusedObject = object
    updateAllHtml()
}

function updateAllHtml() {
    updateObjectList()
    updateLevelCanvas()
    updateObjectSelection()
}

levelCanvas.onclick = event => {
    const screenPos = Vector2d.fromEvent(event, levelCanvas)
    const boardPos = gameState.screenPosToBoardPos(screenPos)
    const hitObject = gameState.board.intersectObject(boardPos)
    if (hitObject) {
        editingState.focusedObject = hitObject
    } else {
        editingState.focusedObject = null
    }

    updateAllHtml()
}

function onEventDown(event) {
    const screenPos = Vector2d.fromEvent(event, levelCanvas)
    const boardPos = gameState.screenPosToBoardPos(screenPos)
    const hitObject = gameState.board.intersectObject(boardPos)

    if (!hitObject) {
        return
    }

    const objectOffset = hitObject.pos.sub(boardPos)
    if (hitObject) {
        editingState.draggingObject = hitObject
        editingState.draggingOffset = objectOffset
        editingState.focusedObject = hitObject
    }
}

const snapValue = (currValue, values, epsilon=10) => {
    for (let val of values) {
        if (Math.abs(val - currValue) < epsilon) {
            return val
        }
    }
    return currValue
}

function clampObjectPos(pos) {
    const xValues = [
        0, levelSize.x / 4, levelSize.x / 2, levelSize.x * 3 / 4
    ]
    const yValues = [
        0, levelSize.y / 8, levelSize.y / 4, levelSize.y * 3 / 8 ,
        levelSize.y / 2, levelSize.y * 5 / 8, levelSize.y * 3 / 4,
        levelSize.y * 7 / 8, levelSize.y
    ]

    return new Vector2d(snapValue(pos.x, xValues), snapValue(pos.y, yValues))
}

function onEventMove(event) {
    if (!editingState.draggingObject) {
        return
    }

    const screenPos = Vector2d.fromEvent(event, levelCanvas)
    const boardPos = gameState.screenPosToBoardPos(screenPos)
    if (editingState.draggingOffset) {
        boardPos.iadd(editingState.draggingOffset)
    }

    const newObjectPos = clampObjectPos(boardPos.round())
    editingState.draggingObject.pos.setVector2d(newObjectPos)
    updateLevelCanvas()
    updateObjectList()

    event.preventDefault()
}

function onEventUp(event) {
    editingState.draggingObject = null
    editingState.draggingOffset = null
}

levelCanvas.addEventListener("mousedown", onEventDown)
levelCanvas.addEventListener("mousemove", onEventMove)
levelCanvas.addEventListener("mouseup", onEventUp)
levelCanvas.addEventListener("touchstart", onEventDown)
levelCanvas.addEventListener("touchmove", onEventMove)
levelCanvas.addEventListener("touchend", onEventUp)

async function main() {
    await Renderer.load()
    updateLevelCanvas()
    updateObjectList()
    loadFromLocalStorage()
}

function download(filename, text) {
    var element = document.createElement("a")
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text))
    element.setAttribute("download", filename)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
}

function save() {
    const str = JSON.stringify(gameState.toObject())
    const name = prompt("Level Name")
    if (name === null) return
    download(`${name}.muglf`, str)
}

function loadFromLocalStorage() {
    const str = localStorage.getItem("level-maker-temp")
    if (str) {
        const obj = JSON.parse(str)
        gameState = makeGameState(GameState.fromObject(obj))
        updateAllHtml()
    }
}

function saveToLocalStorage() {
    const str = JSON.stringify(gameState.toObject())
    localStorage.setItem("level-maker-temp", str)
}

async function fileFromUpload(fileType=null) {
    return new Promise(async (resolve, reject) => {
        let input = document.createElement("input")
        input.setAttribute("type", "file")
        if (fileType)
            input.setAttribute("accept", fileType)
        input.click()

        input.onchange = function(event) {
            if (!input.value.length) {
                reject()
                return
            }
            let fileReader = new FileReader()
            let fileName = input.files[0].name
            fileReader.onload = function(event) {
                resolve({name: fileName, content: event.target.result})
            }
            fileReader.readAsText(input.files[0])
        }

        document.body.onfocus = () => {
            setTimeout(() => {
                if (!input.value.length)
                    reject()
            }, 1000)
        }  
    })
}

async function load() {
    const result = await fileFromUpload("muglf")
    if (!result) return

    const {name, content} = result
    try {
        const obj = JSON.parse(content)
        gameState = makeGameState(GameState.fromObject(obj))
        updateAllHtml()
    } catch (e) {
        console.error(e)
        alert("File loading failed.")
    }
}

async function test() {
    saveToLocalStorage()
    window.open("../level/?id=editor&ja", "_blank").focus()
}

function reset() {
    if (confirm("Are you sure you want to reset the level?")) {
        localStorage.removeItem("level-maker-temp")
        gameState = makeGameState()
        setTimeout(() => location.reload(), 50)
    }
}

setInterval(() => {
    saveToLocalStorage()
}, 1000)

main()