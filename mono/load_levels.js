const levelpacksContainer = document.querySelector("#level-packs")
const levelCompleteLocalStorageKey = "monogolf-completed-levels"
const levelHighscoreLocalStorageKey = packId => `mono-highscore-${packId}`

function getUnlockedLevels() {
    const item = localStorage.getItem(levelCompleteLocalStorageKey)
    if (!item) return new Set()
    const ids = item.toString().split(",")
        .map(n => n.trim())
    return new Set(ids)
}

function getHighscore(packId) {
    return localStorage.getItem(levelHighscoreLocalStorageKey(packId))
}

function setHighscore(packId, score) {
    localStorage.setItem(levelHighscoreLocalStorageKey(packId), score)
}

function unlockLevel(packId, id) {
    const unlocked = getUnlockedLevels()
    unlocked.add(`${packId}:${id}`)
    const str = Array.from(unlocked).join(",")
    localStorage.setItem(levelCompleteLocalStorageKey, str)
}

function resetUnlockedLevels() {
    localStorage.removeItem(levelCompleteLocalStorageKey)
}

function hasUnlockedLevel(packId, id) {
    if (id <= 1) return true
    const completed = getUnlockedLevels()
    return completed.has(`${packId}:${id}`)
}

async function loadLevelData(path) {
    const response = await fetch(path)
    const data = await response.json()
    return data
}

function makeLevelPackHtml(levelPackConfig) {
    // <div class="level-pack">
    //     <div class="header">
    //         <h2>Starter Hills</h2>
    //         <p class="difficulty">Medium</p>
    //     </div>
    //     <p class="description">
    //         Fun and creative levels for new Multigolfers
    //     </p>
    //     <p class="author">
    //         Noel Friedrich
    //     </p>
    //     <div class="levels-container"></div>
    //     <button>Start Challenge</button>
    // </div>

    const levelPackContainer = document.createElement("div")
    const header = document.createElement("div")
    const headerH2 = document.createElement("h2")
    const difficulty = document.createElement("p")
    const description = document.createElement("p")
    const author = document.createElement("p")
    const levelsContainer = document.createElement("div")
    const startChallengeButton = document.createElement("a")
    const highscoreText = document.createElement("p")

    levelPackContainer.classList.add("level-pack")
    header.classList.add("header")
    difficulty.classList.add("difficulty")
    description.classList.add("description")
    author.classList.add("author")
    levelsContainer.classList.add("levels-container")
    startChallengeButton.classList.add("linkbutton")
    highscoreText.classList.add("highscore-text")

    const highscore = getHighscore(levelPackConfig.id)

    const lang = document.documentElement.lang
    headerH2.textContent = levelPackConfig.name[lang]
    difficulty.textContent = levelPackConfig["difficulty-name"][lang]
    description.textContent = levelPackConfig.description[lang]
    author.textContent = levelPackConfig.author
    startChallengeButton.textContent = Text.StartChallenge
    highscoreText.textContent = Text.YourPackHighscore(levelPackConfig.name[lang], highscore)

    startChallengeButton.href = `../level?pack=${encodeURIComponent(levelPackConfig.id)}&challenge=true&id=1`

    for (let i = 0; i < levelPackConfig.num_levels; i++) {
        const element = document.createElement("a")
        element.classList.add("level")
        if (hasUnlockedLevel(levelPackConfig.id, i + 1)) {
            element.classList.add("completed")
            element.href = `../level?pack=${encodeURIComponent(levelPackConfig.id)}&id=${encodeURIComponent(i + 1)}`
        }

        element.dataset.difficulty = levelPackConfig.difficulty
        element.textContent = i + 1
        levelsContainer.appendChild(element)
    }

    header.appendChild(headerH2)
    header.appendChild(difficulty)
    levelPackContainer.appendChild(header)
    levelPackContainer.appendChild(description)
    levelPackContainer.appendChild(author)
    levelPackContainer.appendChild(levelsContainer)
    levelPackContainer.appendChild(startChallengeButton)

    if (highscore !== null) {
        levelPackContainer.appendChild(highscoreText)
    }

    return levelPackContainer
}

async function updateHtmlLevels() {
    const levelPackConfigs = await loadLevelData("level-data/all-packs.json")

    for (const levelPackConfig of levelPackConfigs) {
        const levelPackContainer = makeLevelPackHtml(levelPackConfig)
        levelpacksContainer.appendChild(levelPackContainer)
    }
}