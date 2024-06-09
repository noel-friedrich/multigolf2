import re

templates = {
"default_head": """<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="$description$">
    <meta charset="UTF-8">
    <title>$title$</title>
    <link rel="icon" type="image/svg" href="$base-path$assets/logo/favicon.ico" />
    <link rel="stylesheet" href="$base-path$style.css">
    <link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Quicksand">
</head>""",
"default_header": """<header> 
    <img src="$base-path$assets/logo/logo.svg" class="logo" alt="Multigolf Logo">
    <a href="$base-path$">Multigolf</a>
    <div class="link-island">
        <a href="$base-path$host/">Start Game</a>
        <a href="$base-path$join/">Join Game</a>
        <a href="$base-path$about/">About</a>
        <a href="$base-path$faq/">FAQ</a>
        <a href="$base-path$contact/">Contact</a>
    </div>
    <div class="hamburger-icon" tabindex="0">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
    </div>
</header>

<div class="header-drop-menu">
    <a href="$base-path$host/">Start a Game</a>
    <a href="$base-path$join/">Join a Game</a>
    <a href="$base-path$about/">What is Multigolf?</a>
    <a href="$base-path$faq/">FAQ & Help</a>
    <a href="$base-path$contact/">Contact</a>
</div>

<script>
    {
        const header = document.querySelector("header")
        const hamburger = document.querySelector(".hamburger-icon")
        const headerDropMenu = document.querySelector(".header-drop-menu")

        hamburger.onclick = () => {
            header.classList.toggle("expanded")
            hamburger.classList.toggle("x")
            headerDropMenu.classList.toggle("visible")
        }
    }
</script>""",

"default_footer": """<footer>
<div class="link-grid">

    <div class="link-group">
        <div class="group-header">Game</div>
        <a class="group-item" href="$base-path$host">Start a Game</a>
        <a class="group-item" href="$base-path$join">Join a Game</a>
    </div>
    <div class="link-group">
        <div class="group-header">Info</div>
        <a class="group-item" href="$base-path$about">About Multigolf</a>
        <a class="group-item" href="$base-path$faq">FAQ</a>
        <a class="group-item" href="$base-path$contact">Contact Me</a>
    </div>
    <div class="link-group">
        <div class="group-header">Legal</div>
        <a class="group-item" href="$base-path$impressum">Impressum</a>
        <a class="group-item" href="$base-path$data-privacy">Data Privacy</a>
    </div>
    <div class="link-group">
        <div class="group-header">Socials</div>
        <a class="group-item" href="https://www.instagram.com/multi.golf/">Instagram (Multigolf)</a>
        <a class="group-item" href="https://www.instagram.com/noel.friedrich/">Instagram (Noel)</a>
        <a class="group-item" href="https://noel-friedrich.de">Website (Noel)</a>
    </div>
</div>
<hr>
<div class="footer-text">
    Made by Noel Friedrich
    <button class="theme-changer" id="change-style-a">Change Theme</button>
</div>
</footer>

<script>
document.getElementById("change-style-a").onclick = event => {
    const styles = ["light", "dark"]
    const currStyle = localStorage.getItem("style") || "light"
    const nextIndex = (styles.indexOf(currStyle) + 1) % styles.length
    localStorage.setItem("style", styles[nextIndex])
    document.body.dataset.style = localStorage.getItem("style") || "light"

    event.preventDefault()
}
</script>""",

"default_js": """<script>
    {
        if (localStorage.getItem("style") == null) {
            const prefersDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
            if (prefersDarkMode) {
                localStorage.setItem("style", "dark")
            } else {
                localStorage.setItem("style", "light")
            }
        }

        document.body.dataset.style = localStorage.getItem("style") || "light"

        // replace CSS "100vh" with actual inner height in px
        // (-1 to prevent inaccuracies in some browsers)
        const updateInnerHeight = () => {
            document.body.style.setProperty("--full-height", `${window.innerHeight - 1}px`)
        }
        updateInnerHeight()
        addEventListener("resize", updateInnerHeight)
    }
</script>"""
}

def make_js_imports(js_imports, file_dict):
    out = ""
    version = file_dict["js_version"] if "js_version" in file_dict else 0
    base = file_dict["base-path"]
    for js_import in js_imports:
        out += f"<script src=\"{base}{js_import}?v{version}\"></script>\n"
    return out[:-1]

SET_regex = r"^[\s\t]*<!--\s*SET\s+([a-zA-Z0-9_\.]+)\s*=\s*([a-zA-Z0-9_\s\|\.\:\;]+?)\s*-->[\s\t]*$"
BEGIN_regex = r"^[\s\t]*<!--\s*BEGIN\s+([a-zA-Z0-9_\.]+)\s*-->[\s\t]*$"
END_regex = r"^([\s\t]*)<!--\s*END\s*-->[\s\t]*$"
JS_IMPORT_regex = r"^[\s\t]*<!--\s*JS_IMPORT\s+([a-zA-Z0-9_\.\/]+)\s*-->[\s\t]*$"

def handle_file(file_path: str):
    file_dict = {}
    js_imports = []
    insert_info = {"start_line": None, "name": None, "found": False}
    new_lines = []

    directory_depth = file_path.count('\\')
    file_dict["base-path"] = "../" * (directory_depth - 1)

    with open(file_path, "r", encoding="utf-8") as file:
        lines = file.read().split("\n")
        for i, line in enumerate(lines):
            add_line = True
            SET_search = re.search(SET_regex, line)
            BEGIN_search = re.search(BEGIN_regex, line)
            END_search = re.search(END_regex, line)
            JS_IMPORT_search = re.search(JS_IMPORT_regex, line)

            if (SET_search):
                key, value = SET_search.group(1), SET_search.group(2)
                file_dict[key] = value
            elif (BEGIN_search):
                insert_info["found"] = True
                insert_info["name"] = BEGIN_search.group(1)
                insert_info["start_line"] = i
            elif (END_search and insert_info["found"]):
                indent, name = END_search.group(1), insert_info["name"]
                if (name in templates):
                    template = templates[name]
                    for key, value in file_dict.items():
                        template = template.replace(f"${key}$", value)
                    template_lines = template.split("\n")
                    new_lines.extend([indent + l for l in template_lines])
                elif name == "js_imports":
                    template_lines = make_js_imports(js_imports, file_dict).split("\n")
                    new_lines.extend([indent + l for l in template_lines])
                insert_info["found"] = False
            elif (JS_IMPORT_search):
                js_imports.append(JS_IMPORT_search.group(1))
            elif (insert_info["found"]):
                add_line = False

            if add_line:
                new_lines.append(line)

        if insert_info["found"]:
            # the last BEGIN wasn't followed by an END
            # then revert changes
            print(f"unmatched BEGIN in {file_path}")
            new_lines = lines  
        elif new_lines != lines:
            print(f"made changes in {file_path}")

        with open(file_path, "w", encoding="utf-8") as file:
            file.write("\n".join(new_lines))

import glob

index_files = glob.glob("./**/index.html", recursive=True)
for file_path in index_files:
    handle_file(file_path)