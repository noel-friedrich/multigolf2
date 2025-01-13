function updateHtmlSection(phase) {
    for (let section of document.querySelectorAll("main > section[data-phase]")) {
        if (section.dataset.phase == phase) {
            section.style.display = "grid"
            section.classList.add("visible")
        } else {
            section.style.display = "none"
            section.classList.remove("visible")
        }
    }

    const fillPlaceholders = (attr, value) => {
        for (let element of document.querySelectorAll("[data-fill]")) {
            if (element.dataset.fill == attr) {
                element.textContent = value
            }
        }
    }
}

function onHeaderClick(section) {
    updateHtmlSection(section)

    const header = document.querySelector("header")
    if (header?.classList.contains("expanded")) {
        const hamburger = header?.querySelector(".hamburger-icon")
        hamburger?.click()
    }
}

updateHtmlSection("credit-card")

window.updateHtmlSection = updateHtmlSection
window.onHeaderClick = onHeaderClick