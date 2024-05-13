const header = document.querySelector("header")
const hamburger = document.querySelector(".hamburger-icon")
const headerDropMenu = document.querySelector(".header-drop-menu")

hamburger.onclick = () => {
    header.classList.toggle("expanded")
    hamburger.classList.toggle("x")
    headerDropMenu.classList.toggle("visible")
}