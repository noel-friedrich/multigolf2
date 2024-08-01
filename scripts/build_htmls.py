import re, os, glob, random, hashlib

minified_dir = "js/minified"

def minify_js(code):
    lines = code.split("\n")
    lines = [line.strip() for line in lines]
    lines = [line for line in lines if line != ""]
    lines = [line for line in lines if not line.startswith("//")]

    is_collapseable = lambda line: re.match(r"^[\(\)\{\}\s\]\[\=]+$", line)

    for i in range(10):
        # for i, line in enumerate(lines):
        #     if is_collapseable(line) and i > 0:
        #         lines[i - 1] += line
        #         lines[i] = ""
            
        lines = [line.strip() for line in lines]
        lines = [line for line in lines if line != ""]
        
    code = "\n".join(lines)
    return code

def clear_minified_files():
    for file in os.listdir(minified_dir):
        os.remove(f"{minified_dir}/{file}")

def make_minified_file(js_imports, file_dict):
    content = ""

    for js_file in js_imports:
        with open(js_file, "r", encoding="utf-8") as file:
            content += minify_js(file.read()) + "\n"

    name = "j"
    name += hashlib.sha256(content.encode('utf-8')).hexdigest()[0:16]
    name += ".min.js"
    path = f"{minified_dir}/{name}"

    with open(path, "w", encoding="utf-8") as file:
        file.write(content)

    return file_dict["base-path"] + path

def get_templates(dir):
    files = os.listdir(dir)
    templates = {}
    for file_name in files:
        path = f"{dir}/{file_name}"
        if "." in file_name:
            name = file_name[::-1].split(".", 1)[1][::-1]
        else:
            name = file_name
        with open(path, "r", encoding="utf-8") as file:
            templates[name] = file.read()
    return templates

def make_js_imports(js_imports, file_dict):
    out = ""
    version = file_dict["js_version"] if "js_version" in file_dict else 0
    base = file_dict["base-path"]
    for js_import in js_imports:
        out += f"<script src=\"{base}{js_import}?v{version}\"></script>\n"
    return out[:-1]

SET_regex = r"^[\s\t]*<!--\s*SET\s+([a-zA-Z0-9_\.]+)\s*=\s*([a-zA-Z0-9_\-\s\|\.\:\;\/\\]+?)\s*-->[\s\t]*$"
BEGIN_regex = r"^[\s\t]*<!--\s*BEGIN\s+([a-zA-Z0-9_\.]+)\s*-->[\s\t]*$"
END_regex = r"^([\s\t]*)<!--\s*END\s*-->[\s\t]*$"
JS_IMPORT_regex = r"^[\s\t]*<!--\s*JS_IMPORT\s+([a-zA-Z0-9_\.\/\\\-]+)\s*-->[\s\t]*$"

def handle_file(file_path: str):
    file_dict = {}
    js_imports = []
    insert_info = {"start_line": None, "name": None, "found": False}
    new_lines = []

    directory_depth = file_path.count('\\')
    file_dict["base-path"] = "../" * (directory_depth - 1)
    file_dict["logo_name"] = "multigolf"

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
                    if "js_minify" in file_dict and file_dict["js_minify"] == "true":
                        minified_file = make_minified_file(js_imports, file_dict)
                        js_version = file_dict["js_version"] if "js_version" in file_dict else 0
                        template_lines = [f"<script src=\"{minified_file}?v{js_version}\"></script>"]
                        new_lines.extend([indent + l for l in template_lines])
                    else:
                        template_lines = make_js_imports(js_imports, file_dict).split("\n")
                        new_lines.extend([indent + l for l in template_lines])
                else:
                    print(f"[{file_path}] unknown template: \"{name}\"")
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

template_dir = "scripts/templates"
templates = get_templates(template_dir)

def build_htmls():
    clear_minified_files()

    for file in os.listdir(template_dir):
        handle_file(f"{template_dir}/{file}")

    index_files = glob.glob("./**/index.html", recursive=True)
    for file_path in index_files:
        handle_file(file_path)
    handle_file("404.html")

if __name__ == "__main__":
    build_htmls()
