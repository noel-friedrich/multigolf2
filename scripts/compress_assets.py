from pathlib import Path
import subprocess, os

img_output_size = 15

for svg_path in Path("assets").rglob("*.svg"):
    svg_file_relative = str(svg_path)
    png_file_relative = "assets\\compressed\\" + svg_file_relative.split("\\", 1)[1]
    png_file_relative = png_file_relative[:-4] + ".png"

    current_dir = os.getcwd()
    
    # Construct absolute paths for input SVG and output PNG files
    svg_file = os.path.join(current_dir, svg_file_relative)
    png_file = os.path.join(current_dir, png_file_relative)

    print("Writing", png_file_relative)
    command = ["inkscape", "-z", "--export-type=png", f"--export-filename={png_file}", svg_file,
               "--export-width", str(img_output_size), "--export-height", str(img_output_size),
               "--export-background-opacity=0"]
    subprocess.run(command, check=True)