import glob, os
from pathlib import Path

ignore_folders = {"api", "tiktoks", "CNAME", "manifest.json", "README.md", "scripts", "assets"}
ignore_all = True

service_worker_path = "service_worker.js"

def build_service_worker():
    files_to_cache = []

    index_files = glob.glob("./**", recursive=True)
    for file_path in index_files:
        if os.path.isdir(file_path):
            continue
        path = Path(file_path)
        if len(path.parts) > 0 and path.parts[0] in ignore_folders:
            continue
        files_to_cache.append(file_path)

    with open(service_worker_path, "r", encoding="utf-8") as file:
        before_file_content = file.read()
        lines = before_file_content.split("\n")
        start_index = None
        end_index = None
        for i, line in enumerate(lines):
            if line == "// INSERT CACHE URLS HERE":
                start_index = i
            elif line == "// UNTIL HERE":
                end_index = i
        if start_index is None or end_index is None or start_index > end_index:
            print(f"[{service_worker_path}] Couldn't find start and end of cache")
            return
        for i in range(start_index, end_index - 1):
            del lines[start_index + 1]

        for file_path in files_to_cache:
            if not ignore_all:
                clean_path = str(file_path).replace("\\", "/")[2:]
                code_line = f"    {clean_path!r},"
                lines.insert(start_index + 1, code_line)
        
        after_file_content = "\n".join(lines)

        if before_file_content != after_file_content:
            with open(service_worker_path, "w", encoding="utf-8") as writefile:
                writefile.write(after_file_content)
            print(f"made changes to {service_worker_path}")

if __name__ == "__main__":
    build_service_worker()