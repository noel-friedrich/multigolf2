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
    
    let creditCardPixelHeight = 400
    window.creditCardPixelHeight = 400
    // official credit card size: 2.125in * 3.375in
    const creditCardPixelWidth = () => creditCardPixelHeight * 2.125 / 3.375
    
    function drawCreditCard() {
        creditCardCanvas.height = creditCardPixelHeight
        creditCardCanvas.width = creditCardCanvas.clientWidth
        creditCardCanvas.style.height = creditCardCanvas.height + "px"
        context.drawImage(creditCardImg, 0, 0, creditCardPixelWidth(), creditCardPixelHeight)
    }

    biggerButton.addEventListener("click", () => {
        if (creditCardPixelHeight >= 1000) return
        creditCardPixelHeight += 10
        window.creditCardPixelHeight = creditCardPixelHeight
        drawCreditCard()
    })

    smallerButton.addEventListener("click", () => {
        if (creditCardPixelHeight <= 100) return
        creditCardPixelHeight -= 10
        window.creditCardPixelHeight = creditCardPixelHeight
        drawCreditCard()
    })

    window.addEventListener("resize", drawCreditCard)
    
    drawCreditCard()
}

loadCreditCardSizing()