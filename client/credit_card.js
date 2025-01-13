async function loadCreditCardSizing() {
    async function loadImg(src) {
        return new Promise(resolve => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.src = src
            img.dataset.sprite = src
        })
    }

    const creditCardImg = await loadImg("../assets/objects/credit-card.svg")

    const creditCardCanvas = document.getElementById("credit-card-canvas")
    const context = creditCardCanvas.getContext("2d")

    const rangeInput = document.getElementById("cc-range")
    const rangeInputMinPx = 150
    const rangeInputMaxPx = 800

    const valueToRangeValue = v => (v - rangeInputMinPx) / (rangeInputMaxPx - rangeInputMinPx) * 1000
    const rangeValueToValue = v => v / 1000 * (rangeInputMaxPx - rangeInputMinPx) + rangeInputMinPx

    const minCreditCardHeight = 100
    const maxCreditCardHeight = 1000
    
    let creditCardPixelHeight = 500
    // official credit card size: 2.125in * 3.375in
    const creditCardPixelWidth = () => creditCardPixelHeight * 2.125 / 3.375

    if (localStorage.getItem("credit-card-px-height") != null) {
        const height = parseInt(localStorage.getItem("credit-card-px-height"))
        if (Number.isInteger(height) && height >= minCreditCardHeight && height <= maxCreditCardHeight) {
            creditCardPixelHeight = height
        }
        rangeInput.value = valueToRangeValue(height)
    }

    window.creditCardPixelHeight = creditCardPixelHeight
    
    function drawCreditCard() {
        creditCardCanvas.height = creditCardPixelHeight
        creditCardCanvas.width = creditCardCanvas.clientWidth
        creditCardCanvas.style.height = creditCardCanvas.height + "px"
        context.drawImage(creditCardImg, 0, 0, creditCardPixelWidth(), creditCardPixelHeight)
    }

    function updateCreditCardSize(height) {
        creditCardPixelHeight = Math.max(minCreditCardHeight, Math.min(maxCreditCardHeight, height))

        localStorage.setItem("credit-card-px-height", creditCardPixelHeight)
        window.creditCardPixelHeight = creditCardPixelHeight
    }

    rangeInput.addEventListener("input", () => {
        updateCreditCardSize(rangeValueToValue(rangeInput.value))
        drawCreditCard()
    })

    window.addEventListener("resize", drawCreditCard)
    
    drawCreditCard()
}

loadCreditCardSizing()