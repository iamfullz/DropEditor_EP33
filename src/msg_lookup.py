import re

from src.dungeon_lookup import get_dungeon_name

MSG_FILE_PATH = "src/cabal_msg.dec"

def load_messages(path=MSG_FILE_PATH):
    lookup = {}
    pattern = re.compile(r'<msg id="(.+?)" cont="(.*?)"\s*/>')

    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            match = pattern.search(line)
            if match:
                msg_id, text = match.groups()
                lookup[msg_id] = text
    return lookup

ALL_MESSAGES = load_messages()

def get_text_description(column, value):
    value = str(value).strip()

    key = None

    if column == "SpeciesIdx":
        key = f"monster{value}"
    elif column == "ItemKind":
        try:
            num = int(value)

            # Meghatározzuk a lekérdezési kulcsot
            if num >= 33554432:
                item_id = num % 4096
                key = f"item{item_id+33554432}"
            else:
                item_id = num % 4096
                key = f"item{item_id}"

            # Bind típusok meghatározása (függetlenül attól, hogy nagy vagy kicsi)
            flags = []
            if (num // 4096) & 8576:
                flags.append("Character Bind")
            elif (num // 4096) & 8320:
                flags.append("Character Bind when equipped")
            elif (num // 4096) & 8193:
                flags.append("Account Bind")
            elif (num // 4096) & 384:
                flags.append("Character Bind")
            elif (num // 4096) & 128:
                flags.append("Character Bind when equipped")
            elif (num // 4096) & 1:
                flags.append("Account Bind")

            # Szöveges érték kiolvasása
            if key in ALL_MESSAGES:
                desc = ALL_MESSAGES[key]
                if flags:
                    desc += f" ({', '.join(flags)})"
                return desc

        except ValueError:
            pass
    elif column == "DungeonID":
        return get_dungeon_name(value)
    elif column == "WorldIdx":
        key = f"world{value}"

    if key and key in ALL_MESSAGES:
        return ALL_MESSAGES[key]

    return ""
