"""Original pixel art drawn as reusable PDF appearance streams."""

PALETTE = {
    "k": "203037", "w": "fff4d5", "r": "ba483f", "o": "f08b4b",
    "y": "ffd168", "b": "458b9e", "c": "92d9c7", "g": "408256",
    "l": "8aba65", "d": "3d6054", "s": "7d8183", "v": "a57ab3",
    "p": "e6a69b",
}

MONSTERS = {
    "Cindlet": (
        ".......o......", "......oyo.....", ".....oyyok....", "....koyyok....",
        "...kkookkk....", "..krooooork...", ".krokwokwook..",
        ".koooooooook..", "..koyyyyook.o.", "...krrrork.oyo", "..kkokokkkoook",
        "..kk...kk.kkk.",
    ),
    "Rillfin": (
        "......bcc.....", ".....bbcck....", "....kbbccck...", "...kcccccccc..",
        "..kcbkwccccck.", ".kbbckwccbbbk.", "kcbccccbbbbbkk", ".kkcbbbcccckyk",
        "...kkbbbkkkkyk", "....kbbbkkkyyk", ".....kkk..kkk.",
    ),
    "Bramblet": (
        ".....g....g...", "....glg..glg..", "....gllggllg..", ".....gllllg...",
        "..kgggglgggk..", ".kglllllllgk..", ".klwklwklgk...", ".kllkllklgk...",
        "..klllllgkk...", "...kggggrk....", "..kglkggglk...", "..kkk.kkkkk...",
    ),
    "Flintback": (
        ".....kkk......", "....ksssk.....", "...kwswsskk...", "..kssssskssk..",
        "..kskswsswssk.", ".kkssssssskssk", "kcskskskskkkkk",
        "kkskscskscssk.", ".kkkkkkkkkkk..", "..kssk.kssk...", "..kkkk.kkkk...",
    ),
    "Voltwing": (
        "kv..........vk", "kvy........yvk", ".kvy..kk..yvk.", ".kvyykyykyyvk.",
        "..kvykwkyyvk..", "...kvykyyvk...", "....koyyok....", ".....kook.....",
        "......kykk....", ".....kyk......", "......kyk.....", ".......kk.....",
    ),
}

PERSON = (
    "....kkkk....", "...krrrrk...", "..krrrrrrk..", "...kkkkkk...",
    "...kpkpkk...", "...kppppk...", "....kkkk....", "...kbbbk....",
    "..kpbbbbpk..", "..kpbbbbpk..", "...kkkkkk...", "...k.k.kk...",
)

TILE_NAMES = {
    "#": "wall", "=": "road", ".": "ground", "T": "tree",
    "~": "water", '"': "grass", "%": "house", "+": "gate",
}
NPC_COLORS = {"healer": "w", "guide": "c", "ranger": "g", "miner": "y", "warden": "v"}


def pixels(rows, scale, x, y, palette=PALETTE):
    commands = []
    for row_index, row in enumerate(reversed(rows)):
        for column, pixel in enumerate(row):
            if pixel == ".":
                continue
            commands.append(rect(palette[pixel], x + column * scale, y + row_index * scale, scale, scale))
    return commands


def rect(color, x, y, width, height):
    rgb = " ".join(f"{int(color[i:i+2], 16) / 255:.3f}" for i in (0, 2, 4))
    return f"{rgb} rg {x} {y} {width} {height} re f"


def tile_art(kind):
    ground = "a8c681"
    fills = {
        "wall": "36474c", "road": "e3c793", "water": "529baf",
        "grass": "7ca365", "house": "b75c4c", "gate": "e3c793",
        "cave": "a5a397", "cave_grass": "8f9b88",
    }
    details = {
        "ground": [("97b66f", 3, 4, 2, 1), ("b6d08d", 14, 11, 3, 1)],
        "road": [("cfb27f", 4, 4, 3, 1), ("f3d9a5", 13, 9, 3, 1)],
        "cave": [("8b8c87", 2, 6, 4, 1), ("bbb7a8", 14, 12, 3, 1)],
        "wall": [("506268", 1, 2, 10, 4), ("526168", 12, 8, 8, 5),
                 ("68787b", 2, 12, 8, 2), ("293a40", 0, 0, 21, 1)],
        "water": [("8bd1c9", 2, 3, 7, 1), ("367b96", 9, 6, 10, 1),
                  ("9bd7c7", 12, 11, 7, 1)],
        "tree": [("82aa64", 1, 0, 19, 3), ("665744", 9, 1, 3, 7),
                 ("345e43", 3, 4, 15, 7), ("418056", 5, 7, 11, 6),
                 ("62a16b", 7, 9, 5, 5), ("97bf72", 8, 11, 4, 2)],
        "grass": [("436f50", i, 3 + i % 3, 2, 6) for i in (2, 7, 12, 17)],
        "cave_grass": [("527764", i, 3 + i % 3, 2, 6) for i in (2, 7, 12, 17)],
        "house": [("743f3e", 0, 0, 21, 2), ("d57758", 0, 12, 21, 2),
                  ("e68f65", 3, 6, 15, 2), ("a44943", 5, 2, 3, 10)],
        "gate": [("6a5447", 1, 1, 3, 14), ("6a5447", 17, 1, 3, 14),
                 ("b4183f", 4, 6, 13, 5), ("ffcf68", 9, 6, 3, 5)],
    }
    return [rect(fills.get(kind, ground), 0, 0, 21, 15)] + [
        rect(*shape) for shape in details[kind]
    ]


def actor_art(kind):
    if kind == "sample":
        return [rect("67432a", 7, 3, 7, 8), rect("e18d3d", 8, 4, 5, 6),
                rect("ffdd80", 9, 7, 3, 4)]
    palette = PALETTE.copy()
    if kind in NPC_COLORS:
        palette["r"] = palette[NPC_COLORS[kind]]
    marker = {
        "up": (10, 13), "down": (10, 0), "left": (3, 6), "right": (17, 6),
    }.get(kind)
    shapes = [rect("72855d", 5, 0, 11, 2)] + pixels(PERSON, 1, 5, 1, palette)
    if marker:
        shapes.append(rect("fff4d5", *marker, 2, 2))
    return shapes


def portrait_art(kind):
    rows = MONSTERS[kind]
    return [rect("b5ca8f", 3, 4, 88, 54), rect("a8bf83", 7, 7, 80, 48),
            rect("8aab72", 17, 7, 60, 3)] + pixels(rows, 4, 19, 8)


def health_art(filled):
    shapes = [rect("354f41", 0, 0, 134, 8)]
    color = "c85a42" if filled <= 3 else "d4a23f" if filled <= 6 else "65a558"
    for index in range(10):
        shapes.append(rect(color if index < filled else "66806a", 3 + index * 13, 2, 11, 4))
    return shapes


def polygon(color, points):
    rgb = " ".join(f"{int(color[i:i+2], 16) / 255:.3f}" for i in (0, 2, 4))
    first, *rest = points
    return (f"{rgb} rg {first[0]} {first[1]} m "
            + " ".join(f"{x} {y} l" for x, y in rest) + " h f")


def arena_art(kind):
    sky, far, mid, floor, lit, card = {
        "meadow": ("aacbc2", "83ae9d", "628d79", "95b983", "b9cc90", "e0e9ba"),
        "cave": ("8798b2", "657690", "4d6481", "798a9f", "a0abbe", "d9deeb"),
        "summit": ("c5afd0", "a08db8", "776e9c", "8c8cb2", "bfb6d0", "e7dbef"),
    }[kind]
    art = [rect(sky, 0, 0, 399, 134)]
    if kind == "cave":
        for x, depth in ((13, 34), (65, 41), (122, 20), (227, 37), (306, 32), (392, 42)):
            art.append(polygon(far, [(x-12,134),(x+11,134),(x,134-depth)]))
        for x,y in ((219,66),(310,24),(31,43),(244,87)):
            art += [polygon("b7d3da", [(x-7,y),(x,y+15),(x+7,y+3)]), rect("dae7dc",x-1,y+4,2,6)]
    else:
        art.append(polygon(lit, [(259,94),(272,94),(280,102),(280,115),
                                 (272,123),(259,123),(251,115),(251,102)]))
        art += [polygon(far, [(0,50),(0,84),(44,111),(77,89),(111,109),
                              (165,78),(209,113),(239,90),(276,103),(333,78),(399,106),(399,50)]),
                polygon(mid, [(0,40),(0,69),(53,78),(110,65),(188,82),
                              (265,68),(302,85),(399,65),(399,40)])]
    art.append(polygon(floor, [(0,0),(0,53),(136,80),(399,87),(399,0)]))
    for x, y, w in ((4,17,34),(120,16,48),(208,60,25),(169,31,32),(284,73,47),(343,9,32)):
        art.append(rect(lit, x, y, w, 2))
    for x, y, w in ((24,11,114),(262,63,116)):
        art += [polygon(mid, [(x,y+3),(x+13,y),(x+w-13,y),(x+w,y+3),
                              (x+w,y+12),(x+w-13,y+16),(x+13,y+16),(x,y+12)]),
                polygon(lit, [(x+5,y+8),(x+16,y+5),(x+w-16,y+5),(x+w-5,y+8),
                              (x+w-16,y+13),(x+16,y+13)])]
    for x, y in ((0, 86), (198, 21)):
        art += [rect(mid, x, y, 196, 42), rect(card, x, y+2, 196, 40)]
    return art


def combat_sprite(kind, facing_left=False):
    rows = MONSTERS[kind]
    if facing_left:
        rows = tuple(row[::-1] for row in rows)
    return pixels(rows, 5, 10, 4)


EFFECT_COLORS = {
    "Neutral": "f4d7a9", "Ember": "ff7a4b", "Tide": "5dbadd",
    "Grove": "80c260", "Stone": "c8a383", "Spark": "f4bf4a",
}


def trail_art(kind, reverse):
    color = EFFECT_COLORS[kind]
    paths = {
        "Neutral": [(0,9),(47,18),(84,34),(54,15),(13,5)],
        "Ember": [(0,5),(25,9),(18,16),(46,14),(55,25),(73,34),(85,23),(68,12),(38,5)],
        "Tide": [(0,8),(31,11),(48,20),(57,31),(73,32),(85,23),(70,20),(58,9),(24,5)],
        "Grove": [(0,8),(27,10),(49,23),(73,29),(85,24),(66,18),(43,12),(30,6)],
        "Stone": [(10,8),(41,12),(60,25),(77,27),(85,19),(74,11),(47,8),(24,4)],
        "Spark": [(0,8),(39,22),(31,12),(65,33),(58,22),(86,29),(67,12),(73,19),(42,6),(46,14)],
    }
    points = paths[kind]
    transform = lambda x, y: (86-x, 37-y) if reverse else (x, y)
    return [polygon(color, [transform(x, y) for x, y in points]),
            polygon("fff4d5", [transform(x, y) for x, y in ((22,9),(74,25),(49,12))])]

def impact_art(kind):
    color = EFFECT_COLORS[kind]
    return [
        polygon("584653", [(23,33),(5,61),(34,48),(48,69),(54,47),(77,53),
                           (60,33),(74,16),(48,20),(37,2),(31,22),(6,15)]),
        polygon(color, [(28,33),(12,55),(36,44),(47,63),(51,43),(69,48),
                        (55,33),(68,20),(46,25),(37,9),(33,26),(14,20)]),
        polygon("fff4d5", [(37,39),(46,51),(46,39),(58,40),(49,32),
                           (55,24),(44,29),(37,18),(37,31),(27,29)]),
        rect(color, 3, 30, 8, 3), rect("fff4d5", 69, 62, 6, 4),
        rect(color, 16, 5, 5, 5), rect(color, 74, 36, 6, 3),
    ]
