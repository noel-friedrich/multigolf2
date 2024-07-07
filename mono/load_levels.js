const levelsContainer = document.querySelector("#levels-container")

const levels = []

const levelCompleteLocalStorageKey = "monogolf-completed-levels"

function getCompletedLevels() {
    const item = localStorage.getItem(levelCompleteLocalStorageKey)
    if (!item) return new Set()
    const ids = item.toString().split(",")
        .map(n => parseInt(n))
        .filter(n => Number.isInteger(n))
    return new Set(ids)
}

function completeLevel(id) {
    const completed = getCompletedLevels()
    completed.add(id)
    const str = Array.from(completed).join(",")
    localStorage.setItem(levelCompleteLocalStorageKey, str)
}

function resetCompletedLevels() {
    localStorage.removeItem(levelCompleteLocalStorageKey)
}

function hasUnlockedLevel(id) {
    const completed = getCompletedLevels()
    const numericId = parseInt(id)
    return completed.has(numericId) || completed.has(numericId - 1)
}

function hasCompletedLevel(id) {
    return getCompletedLevels().has(parseInt(id))
}

async function loadLevels(path) {
    const response = await fetch(path)
    const data = await response.json()
    for (const levelData of data) {
        levels.push(levelData)
    }
}

function updateHtmlLevels() {
    // remove existing levels
    for (const element of levelsContainer.querySelectorAll(".level")) {
        element.remove()
    }

    // (re)add (new) levels
    let i = 0
    for (const level of levels) {
        const element = document.createElement("a")
        element.classList.add("level")
        if (i == 0 || hasUnlockedLevel(level.id)) {
            element.classList.add("completed")
            element.href = `../level?id=${encodeURIComponent(level.id)}`
        }

        element.dataset.difficulty = level.difficulty
        element.textContent = level.id
        levelsContainer.appendChild(element)
        i++
    }
}