# MONSTER.pdf — Summit Circuit

Open `monster.pdf` directly in Chromium's built-in PDF viewer and use the controls overlaid near the lower corners. The game runs from the PDF file offline. Closing or reopening it starts a new session.

## Build

Requires Python 3.10+.

```sh
python3 -m pip install 'reportlab>=4,<6' 'pypdf>=6,<7'
python3 generate.py
```

The generator writes `monster.pdf` beside its sources and checks the page count, form widgets, appearances, and JavaScript actions. `game.js` contains the embedded game. [DoomPDF](https://github.com/ading2210/doompdf) is the reference for initializing a game on page open, handling pushbutton events, and rendering through text fields.

## Play

- Click the D-pad to move or select an option. Click **A** to confirm, talk to the person ahead of you, or search the tile ahead. Click **B** to go back. **Menu** opens your pack and party during exploration.
- Pick one of three starters in Alder Village. Follow the east road through Bracken Forest to Ranger Sable on Slate Route. Win her court pass, head north through Flint Cave, and challenge Warden Orin in Summit Court.
- Enter tall grass to find wild monsters. Weaken a monster with a neutral move, then select a capsule under **Pack**. Your party can hold one of each of the five species. Tonics restore HP, and Healer Iona in Alder Village restores the whole party and replenishes capsules.
- Switch party members to play to their type strengths. Ember beats Grove, Grove beats Stone, Stone beats Spark, Spark beats Tide, and Tide beats Ember.

The tile graphics, people, monster portraits, and HP bars are original pixel art defined in `artwork.py`. The PDF stores them as shared widget appearances. The game updates only the tiles, sprites, and text that changed.

## Browser verification

Tested in the built-in PDF viewer of Chromium 141.0.7390.37, opening the PDF from disk with HTTP and HTTPS requests blocked. The page count is checked on every build.

The Chromium playthrough covered starter selection, village healing, camera scrolling, a wild capture, party inspection, both trainer wins, and a return to exploration after victory. A separate JavaScript run exercised all three starters, capture failure, a forced party replacement, and a restart after defeat.

## Missions

Open **Menu → Missions** to track trainer wins, captures and supply caches. Speak to Miner Mica in Flint Cave to start the amber shard survey. If your party faints, press **A** to return to Alder Village with your monsters and mission progress intact.

## Landscape play

Turn your device sideways and use Fit Page to keep the thin bezel and both sets of overlaid controls in view.
The single-page PDF requires a viewer that executes embedded JavaScript and
form button actions. Desktop Chromium 141 was verified. Native Android and
iOS PDF viewers have not been verified.

## Battle arena

The arena changes with the region. Attacks play a wind-up, an elemental trail,
and a hit reaction before the turn summary appears. Press **A** during the
animation to skip to the summary. The round pad moves and selects, **A**
confirms, **B** backs out, and **Start** opens the field menu.
