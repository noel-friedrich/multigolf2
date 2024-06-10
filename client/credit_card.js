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
    
    const biggerButton = document.getElementById("cc-bigger-button")
    const smallerButton = document.getElementById("cc-smaller-button")
    
    let creditCardPixelHeight = 500
    // official credit card size: 2.125in * 3.375in
    const creditCardPixelWidth = () => creditCardPixelHeight * 2.125 / 3.375

    if (localStorage.getItem("credit-card-px-height") != null) {
        creditCardPixelHeight = localStorage.getItem("credit-card-px-height")
    }

    window.creditCardPixelHeight = creditCardPixelHeight
    
    function drawCreditCard() {
        creditCardCanvas.height = creditCardPixelHeight
        creditCardCanvas.width = creditCardCanvas.clientWidth
        creditCardCanvas.style.height = creditCardCanvas.height + "px"
        context.drawImage(creditCardImg, 0, 0, creditCardPixelWidth(), creditCardPixelHeight)
    }

    function updateCreditCardSize(increment) {
        const height = creditCardPixelHeight + increment
        creditCardPixelHeight = Math.max(100, Math.min(1000, height))
        
        localStorage.setItem("credit-card-px-height", creditCardPixelHeight)
        window.creditCardPixelHeight = creditCardPixelHeight
    }

    biggerButton.addEventListener("click", () => {
        updateCreditCardSize(10)
        drawCreditCard()
    })

    smallerButton.addEventListener("click", () => {
        updateCreditCardSize(-10)
        drawCreditCard()
    })

    window.addEventListener("resize", drawCreditCard)
    
    drawCreditCard()
}

loadCreditCardSizing()