import os, json

levels_dir = "mono/levels"
levels_output_file = "mono/default_levels.json"

def build_levels():
    levels = []
    level_files = os.listdir(levels_dir)
    for i, level_filepath in enumerate(level_files):
        with open(f"{levels_dir}/{level_filepath}", "r") as file:
            gameState = json.load(file)
            levels.append({
                "id": i + 1,
                "gameState": gameState,
                "difficulty": "easy"
            })
    with open(levels_output_file, "r") as file:
        curr_data = json.load(file)
        if curr_data != levels:    
            with open(levels_output_file, "w") as file:
                json.dump(levels, file)
                print(f"Exported levels to {levels_output_file}")

if __name__ == "__main__":
    build_levels()