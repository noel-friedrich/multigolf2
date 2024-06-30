updateHtmlSection(gameState.phase)

const noSleep = new NoSleep()

document.addEventListener("click", function enableNoSleep() {
    document.removeEventListener("click", enableNoSleep, false)
    noSleep.enable()
}, false)

async function main() {
    await BoardRenderer.load()
    window.AudioPlayer = AudioPlayer
    window.AudioPlayer.load()
    
    document.querySelector("#loading-indicator").style.display = "none"
}

main()
