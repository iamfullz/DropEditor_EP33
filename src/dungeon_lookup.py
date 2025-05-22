import re

DUNGEON_FILES = [
    "src/cont_msg.dec",
    "src/cont2_msg.dec",
    "src/cont3_msg.dec"
]

def load_dungeon_names():
    lookup = {}
    pattern = re.compile(r'<msg id="(\d+)"[^>]*?name="(.+?)"')

    for path in DUNGEON_FILES:
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    match = pattern.search(line)
                    if match:
                        id_val, name = match.groups()
                        lookup[id_val] = name
        except FileNotFoundError:
            continue  # ha valamelyik fájl hiányzik, átugorjuk

    return lookup

ALL_DUNGEONS = load_dungeon_names()

def get_dungeon_name(dungeon_id):
    return ALL_DUNGEONS.get(str(dungeon_id), "")
