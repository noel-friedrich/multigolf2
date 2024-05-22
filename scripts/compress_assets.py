from pathlib import Path
import subprocess, os

img_output_size = 11

for svg_path in Path("assets").rglob("*.svg"):
    svg_file_relative = str(svg_path)
    png_file_relative = "assets\\compressed\\" + svg_file_relative.split("\\", 1)[1]
    png_file_relative = png_file_relative[:-4] + ".png"

    current_dir = os.getcwd()
    
    # Construct absolute paths for input SVG and output PNG files
    svg_file = os.path.join(current_dir, svg_file_relative)
    png_file = os.path.join(current_dir, png_file_relative)

    size = img_output_size
    transparent = True

    if svg_file_relative.endswith("grid.svg"):
        size = 100
        transparent = False

    print("Writing", png_file_relative)
    command = ["inkscape", "-z", "--export-type=png", f"--export-filename={png_file}", svg_file,
               "--export-width", str(size), "--export-height", str(size)]
    
    if transparent:
        command += ["--export-background-opacity=0"]
    else:
        command += ["--export-background-opacity=1"]

    subprocess.run(command, check=True)