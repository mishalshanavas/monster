"""Build the single-page MONSTER.pdf cartridge."""
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject, DecodedStreamObject, DictionaryObject, NameObject,
    NumberObject, TextStringObject,
)
from artwork import (
    MONSTERS, NPC_COLORS, TILE_NAMES, actor_art, arena_art, combat_sprite, health_art,
    impact_art, portrait_art, tile_art, trail_art,
)
from reportlab.lib.colors import HexColor
from reportlab.pdfgen.canvas import Canvas

ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT = 760, 424
DISPLAY_SCALE = 1.16
VIEW_WIDTH, VIEW_HEIGHT = 19, 11
CONTROLS = {
    "up": (54, 118, 52, 53),
    "left": (3, 65, 51, 53),
    "down": (54, 12, 52, 53),
    "right": (106, 65, 51, 53),
    "menu": (350, 13, 60, 49),
    "b": (619, 19, 60, 60),
    "a": (686, 68, 67, 67),
}


def display_rect(x, y, width, height):
    return (
        round(WIDTH / 2 + (x - 270) * DISPLAY_SCALE),
        round(HEIGHT - 16 + (y - 468) * DISPLAY_SCALE),
        round(width * DISPLAY_SCALE),
        round(height * DISPLAY_SCALE),
    )


def dictionary(**entries):
    return DictionaryObject({NameObject("/" + key): value for key, value in entries.items()})


def name(value):
    return NameObject("/" + value)


def numbers(*values):
    return ArrayObject([NumberObject(value) for value in values])


def script(source):
    return dictionary(S=name("JavaScript"), JS=TextStringObject(source))


def background():
    buffer = BytesIO()
    c = Canvas(buffer, pagesize=(WIDTH, HEIGHT), invariant=True)

    def fill(color, alpha=1):
        c.setFillColor(HexColor(color))
        c.setFillAlpha(alpha)

    def stroke(color, alpha=1):
        c.setStrokeColor(HexColor(color))
        c.setStrokeAlpha(alpha)

    ink = "#1d3d35"
    fill("#202e36")
    c.roundRect(0, 0, WIDTH, HEIGHT, 24, fill=1, stroke=0)
    fill("#4a5d62")
    c.roundRect(4, 4, WIDTH - 8, HEIGHT - 8, 20, fill=1, stroke=0)
    fill("#c8dca1")
    c.roundRect(7, 7, WIDTH - 14, HEIGHT - 14, 17, fill=1, stroke=0)

    # Controls sit on the same surface as the game, inside the thin bezel.
    pad_x, pad_y = 80, 91.5
    fill(ink, .10)
    stroke(ink, .22)
    c.setLineWidth(1)
    c.circle(pad_x, pad_y, 72, fill=1, stroke=1)
    fill(ink, .18)
    c.circle(pad_x, pad_y, 19, fill=1, stroke=1)

    for action, (x, y, w, h) in CONTROLS.items():
        cx, cy = x + w / 2, y + h / 2
        if action == "menu":
            fill(ink, .19)
            c.roundRect(cx - 25, cy - 5, 50, 10, 5, fill=1, stroke=0)
            fill(ink)
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(cx, cy - 16, "START")
            continue
        if action in ("a", "b"):
            accent = "#9b3e56" if action == "a" else "#584773"
            fill(accent, .24)
            stroke(accent, .68)
            c.circle(cx, cy, 28 if action == "a" else 25, fill=1, stroke=1)
            fill(ink)
            c.setFont("Helvetica-Bold", 22)
            c.drawCentredString(cx, cy - 7, action.upper())
            continue
        stroke(ink, .83)
        c.setLineCap(1)
        c.setLineJoin(1)
        c.setLineWidth(2.8)
        cx += {"left": 8, "right": -8}.get(action, 0)
        cy += {"up": -8, "down": 8}.get(action, 0)
        angle = {"up": 0, "left": 90, "down": 180, "right": 270}[action]
        c.saveState()
        c.translate(cx, cy)
        c.rotate(angle)
        path = c.beginPath()
        path.moveTo(-7, -3)
        path.lineTo(0, 4)
        path.lineTo(7, -3)
        c.drawPath(path)
        c.restoreState()
    c.showPage()
    c.save()
    return buffer

def build():
    writer = PdfWriter(clone_from=PdfReader(background()))
    writer.add_metadata({"/Title": "MONSTER.pdf — Summit Circuit"})
    page = writer.pages[0]
    writer.root_object[name("OpenAction")] = ArrayObject([page.indirect_reference, name("Fit")])
    annotations = ArrayObject()
    fields = ArrayObject()
    page[name("Annots")] = annotations

    font = writer._add_object(dictionary(
        Type=name("Font"), Subtype=name("Type1"), BaseFont=name("Courier")
    ))
    bold = writer._add_object(dictionary(
        Type=name("Font"), Subtype=name("Type1"), BaseFont=name("Courier-Bold")
    ))
    resources = dictionary(Font=dictionary(Mono=font, Head=bold))
    writer.root_object[name("AcroForm")] = writer._add_object(dictionary(
        Fields=fields, DR=resources, DA=TextStringObject("/Mono 12 Tf 0.10 0.20 0.15 rg")
    ))

    def widget(field, rect, value="", action=None):
        x, y, w, h = rect if action else display_rect(*rect)
        appearance = DecodedStreamObject()
        appearance.update(dictionary(
            Type=name("XObject"), Subtype=name("Form"), BBox=numbers(0, 0, w, h),
            Resources=resources,
        ))
        annotation = dictionary(
            Type=name("Annot"), Subtype=name("Widget"), T=TextStringObject(field),
            Rect=numbers(x, y, x + w, y + h), F=NumberObject(4),
            P=page.indirect_reference, BS=dictionary(W=NumberObject(0)),
            AP=dictionary(N=writer._add_object(appearance)),
        )
        if action:
            # The control is drawn on the page below its interactive hit region.
            appearance.set_data(b"q Q")
            annotation.update(dictionary(
                FT=name("Btn"), Ff=NumberObject(65536),
                AA=dictionary(U=script(f"MonsterGame.press('{action}');")),
                TU=TextStringObject({"menu": "Start, menu", "a": "A, confirm", "b": "B, back"}
                                    .get(action, action.capitalize())),
            ))
        else:
            font_name = "Head" if field == "row0" else "Mono"
            size = 19 if field == "row0" else 13 if field == "status" else 14
            style = f"/{font_name} {size} Tf 0.10 0.20 0.15 rg"
            appearance.set_data(f"BT {style} 2 3 Td ({value}) Tj ET".encode())
            annotation.update(dictionary(
                FT=name("Tx"), Ff=NumberObject(1 | 8388608), V=TextStringObject(value),
                DA=TextStringObject(style),
            ))
        ref = writer._add_object(annotation)
        annotations.append(ref)
        fields.append(ref)

    graphic_fields = set()

    def graphical_field(field, x, y, w, h, appearance):
        graphic_fields.add(field)
        x, y, w, h = display_rect(x, y, w, h)
        ref = writer._add_object(dictionary(
            Type=name("Annot"), Subtype=name("Widget"), T=TextStringObject(field),
            Rect=numbers(x, y, x+w, y+h), F=NumberObject(2), Ff=NumberObject(65537),
            FT=name("Btn"), P=page.indirect_reference, AP=dictionary(N=appearance),
        ))
        annotations.append(ref)
        fields.append(ref)

    def art_stream(commands, width, height):
        appearance = DecodedStreamObject()
        appearance.update(dictionary(
            Type=name("XObject"), Subtype=name("Form"), BBox=numbers(0, 0, width, height),
            Resources=dictionary(),
        ))
        appearance.set_data("\n".join(commands).encode("ascii"))
        return writer._add_object(appearance.flate_encode())

    terrains = {kind: art_stream(tile_art(kind), 21, 15)
                for kind in (*TILE_NAMES.values(), "cave", "cave_grass")}
    actors = {kind: art_stream(actor_art(kind), 21, 15)
              for kind in (*NPC_COLORS, "up", "down", "left", "right", "sample")}
    for family, artwork in (("tile", terrains), ("actor", actors)):
        for row in range(VIEW_HEIGHT):
            for col in range(VIEW_WIDTH):
                for kind, appearance in artwork.items():
                    graphical_field(f"{family}_{row * VIEW_WIDTH + col}_{kind}",
                                    70 + col * 21, 278 + (VIEW_HEIGHT - 1 - row) * 15, 21, 15, appearance)
    for arena in ("meadow", "cave", "summit"):
        graphical_field(f"arena_{arena}", 70, 308, 399, 134,
                        art_stream(arena_art(arena), 399, 134))
    positions = {"foe": (335, 367, -1), "ally": (100, 313, 1)}
    for kind in MONSTERS:
        graphical_field(f"portrait_profile_{kind}", 310, 316, 160, 108,
                        art_stream(portrait_art(kind), 94, 64))
        for side, (x, y, direction) in positions.items():
            sprite = art_stream(combat_sprite(kind, side == "foe"), 92, 65)
            for pose, dx, dy in (("idle", 0, 0), ("wind", -8, -2),
                                 ("lunge", 34, 10), ("recoil", -11, 5)):
                graphical_field(f"fighter_{side}_{pose}_{kind}",
                                x + dx * direction, y + dy, 92, 65, sprite)

    for element in ("Neutral", "Ember", "Tide", "Grove", "Stone", "Spark"):
        burst = art_stream(impact_art(element), 80, 70)
        for side, (x, y, _) in positions.items():
            graphical_field(f"impact_{side}_{element}", x + 1, y - 3, 80, 70, burst)
            graphical_field(f"trail_{side}_{element}", 215, 359, 86, 37,
                            art_stream(trail_art(element, side == "foe"), 86, 37))

    for filled in range(11):
        appearance = art_stream(health_art(filled), 134, 8)
        for slot, x, y in (("foe", 76, 399), ("ally", 274, 334)):
            graphical_field(f"health_{slot}_{filled}", x, y, 134, 8, appearance)

    for row in range(18):
        value = "Open in Chromium to play." if row == 2 else ""
        top = 447 - row * 13
        if row == 0 or row >= 14:
            top -= 4
        widget(f"row{row}", (68, top, 405, 21 if row == 0 else 13), value)
    widget("status", (68, 199, 405, 15))
    for action, rect in reversed(CONTROLS.items()):
        widget("button_" + action, rect, action=action)

    source = (ROOT / "game.js").read_text(encoding="utf-8")
    page[name("AA")] = dictionary(O=script(source))
    output = ROOT / "monster.pdf"
    with output.open("wb") as out:
        writer.write(out)
    verify(output, source, graphic_fields)


def verify(output, source, graphic_fields):
    reader = PdfReader(output)
    if len(reader.pages) != 1:
        raise ValueError("The cartridge must contain exactly one page")
    page = reader.pages[0]
    if page["/AA"]["/O"]["/JS"] != source:
        raise ValueError("Startup JavaScript is missing or incomplete")
    form = reader.trailer["/Root"]["/AcroForm"]
    if set(form["/Fields"]) != set(page["/Annots"]):
        raise ValueError("Form fields and page widgets differ")
    widgets = {ref.get_object()["/T"]: ref.get_object() for ref in page["/Annots"]}
    expected = {"status", *(f"row{i}" for i in range(18)),
                *("button_" + action for action in CONTROLS)}
    if widgets.keys() != expected | graphic_fields:
        raise ValueError("Display or control widgets are missing")
    for widget in widgets.values():
        if not widget["/AP"]["/N"].get_data():
            raise ValueError(f"Widget {widget['/T']} has no appearance")
    for action in CONTROLS:
        event = widgets["button_" + action]["/AA"]["/U"]
        if event["/JS"] != f"MonsterGame.press('{action}');":
            raise ValueError(f"Incorrect action for {action}")


if __name__ == "__main__":
    build()
