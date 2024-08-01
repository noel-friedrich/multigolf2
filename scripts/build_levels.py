import os, json

level_packs_dir = "assets/level-packs"
levels_all_packs_file = "mono/level-data/all-packs.json"
levels_mono_packs_dir = "mono/level-data/packs"

def build_levels():
    level_pack_dirs = os.listdir(level_packs_dir)
    level_packs = []
    for level_pack_dir in level_pack_dirs:
        level_files = os.listdir(os.path.join(level_packs_dir, level_pack_dir))
        config_file = os.path.join(level_packs_dir, level_pack_dir, "config.json")
        with open(config_file, "r", encoding="utf-8") as file:
            config_data = json.load(file)
        level_datas = []
        for level_file in level_files:
            if not level_file.endswith(".muglf"):
                continue
            level_file_path = os.path.join(level_packs_dir, level_pack_dir, level_file)
            with open(level_file_path, "r", encoding="utf-8") as file:
                level_datas.append(json.load(file))

        config_data["num_levels"] = len(level_datas)

        level_packs.append({
            "config": config_data,
            "levels": [{
                    "gameState": level_data,
                    "difficulty": "easy",
                    "id": i + 1
                } for i, level_data in enumerate(level_datas)]
        })
    
    with open(levels_all_packs_file, "w", encoding="utf-8") as file:
        json.dump([l["config"] for l in level_packs], file)

    for file in os.listdir(levels_mono_packs_dir):
        os.remove(os.path.join(levels_mono_packs_dir, file))
    
    for level_pack in level_packs:
        level_pack_path = os.path.join(levels_mono_packs_dir, level_pack["config"]["id"] + ".json")
        with open(level_pack_path, "w", encoding="utf-8") as file:
            json.dump(level_pack, file)

if __name__ == "__main__":
    build_levels()