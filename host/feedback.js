const feedbackForms = document.querySelectorAll(".feedback-form")

for (const formContainer of feedbackForms) {
    const textarea = formContainer.querySelector("textarea")
    const submitButton = formContainer.querySelector("button")

    let busy = false
    submitButton.addEventListener("click", async () => {
        const feedbackText = textarea.value

        if (feedbackText.length == 0 || busy) {
            return
        }
        
        if (feedbackText.length > 1000) {
            return alert(Text.FeedbackTooLong)
        }

        buse = true
        const formData = new FormData()
        formData.append("message", feedbackText)
        const response = await fetch("https://www.noel-friedrich.de/multigolf2/api/give_feedback.php", {
            method: "POST", body: formData })

        const data = await response.json()
        if (data.ok) {
            const successText = document.createElement("p")
            successText.classList.add("success")
            successText.textContent = Text.ThanksForFeedback
            formContainer.appendChild(successText)
        } else {
            const errorText = document.createElement("p")
            errorText.classList.add("error")
            errorText.textContent = data.error
            formContainer.appendChild(errorText)
        }

        textarea.remove()
        submitButton.remove()
    })
}