var MonsterGame = (function (doc) {
    "use strict";

    var width = 48;
    var height = 32;
    var viewWidth = 19;
    var viewHeight = 11;
    var directions = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]};
    var terrain = {"#": "wall", "=": "road", ".": "ground", "T": "tree", "~": "water",
        '"': "grass", "%": "house", "+": "gate"};
    var graphics = Object.create(null);
    var visible = Object.create(null);
    var map = [];
    var fields = [];
    var previous = [];
    var status = doc.getField("status");
    var previousStatus;
    var player;
    var state;
    var notice;
    var dialogue;
    var caches;
    var cleared;
    var grassSteps;
    var signal;
    var pendingHits = [];
    var animation;
    var animationId = 0;
    var survey;

    for (var i = 0; i < 18; i++) fields.push(doc.getField("row" + i));

    function fill(x1, y1, x2, y2, tile) {
        for (var y = y1; y <= y2; y++) {
            for (var x = x1; x <= x2; x++) map[y][x] = tile;
        }
    }

    function createMap() {
        for (var y = 0; y < height; y++) map.push([]);
        fill(0, 0, width - 1, height - 1, "#");
        fill(1, 19, 12, 30, ".");
        fill(12, 23, 15, 27, ".");
        fill(15, 15, 30, 30, ".");
        fill(30, 22, 39, 27, ".");
        fill(35, 13, 39, 22, ".");
        fill(25, 4, 39, 14, ".");
        fill(41, 3, 46, 12, ".");
        fill(40, 8, 40, 8, "+");

        fill(2, 20, 4, 22, "%");
        fill(8, 20, 11, 22, "%");
        fill(2, 27, 4, 29, "~");
        fill(16, 16, 18, 20, "T");
        fill(19, 19, 24, 23, '"');
        fill(25, 16, 28, 21, "T");
        fill(17, 27, 22, 29, '"');
        fill(24, 26, 27, 28, "T");
        fill(29, 28, 30, 30, "T");
        fill(31, 26, 35, 27, '"');
        fill(35, 16, 36, 20, "~");
        fill(26, 5, 30, 6, '"');
        fill(26, 10, 32, 12, '"');
        fill(32, 5, 33, 7, "#");
        fill(34, 10, 36, 11, "#");
        fill(42, 4, 45, 4, "%");
        fill(42, 11, 45, 11, "%");

        fill(3, 25, 37, 25, "=");
        fill(37, 8, 37, 25, "=");
        fill(28, 8, 39, 8, "=");
        fill(41, 8, 45, 8, "=");
        fill(23, 16, 23, 28, "=");
        fill(23, 16, 30, 16, "=");
        fill(28, 13, 28, 16, "=");
    }

    var people = [
        {x: 6, y: 23, icon: "healer", name: "Healer Iona"},
        {x: 10, y: 24, icon: "guide", name: "Guide Lark"},
        {x: 33, y: 24, icon: "ranger", name: "Ranger Sable"},
        {x: 29, y: 9, icon: "miner", name: "Miner Mica"},
        {x: 44, y: 7, icon: "warden", name: "Warden Orin"}
    ];
    var sample = {x: 31, y: 6};
    var supplies = [
        {x: 5, y: 27, tonics: 2, capsules: 1},
        {x: 25, y: 22, tonics: 1, capsules: 3},
        {x: 34, y: 9, tonics: 2, capsules: 2}
    ];

    function area(x, y) {
        if (x >= 40) return "Summit Court";
        if (y <= 14) return "Flint Cave";
        if (x >= 31) return "Slate Route";
        if (x >= 15) return "Bracken Forest";
        if (x >= 12) return "Fern Route";
        return "Alder Village";
    }

    function entityAt(list, x, y) {
        return list.find(function (item) { return item.x === x && item.y === y; });
    }

    function tileAt(x, y) {
        return map[y] && map[y][x] || "#";
    }

    function explorationView() {
        var lines = [area(player.x, player.y)];
        while (lines.length < 14) lines.push("");
        if (state === "DIALOGUE") return lines.concat([dialogue[0], dialogue[1], dialogue[2]]);
        var step = directions[player.facing];
        var person = entityAt(people, player.x + step[0], player.y + step[1]);
        return lines.concat([person ? "A  " + person.name : notice]);
    }

    function drawGraphics() {
        var wanted = Object.create(null);
        if (state === "EXPLORATION" || state === "DIALOGUE") {
            var left = Math.max(0, Math.min(player.x - 9, width - viewWidth));
            var top = Math.max(0, Math.min(player.y - 5, height - viewHeight));
            for (var row = 0; row < viewHeight; row++) {
                for (var col = 0; col < viewWidth; col++) {
                    var x = left + col, y = top + row;
                    var index = row * viewWidth + col;
                    var tile = tileAt(x, y);
                    var kind = terrain[tile];
                    if (tile === "+" && cleared.ranger) kind = "road";
                    if (area(x, y) === "Flint Cave" && tile === ".") kind = "cave";
                    if (area(x, y) === "Flint Cave" && tile === '"') kind = "cave_grass";
                    wanted["tile_" + index + "_" + kind] = true;
                    var person = entityAt(people, x, y);
                    if (person) wanted["actor_" + index + "_" + person.icon] = true;
                    if (survey === 1 && x === sample.x && y === sample.y) {
                        wanted["actor_" + index + "_sample"] = true;
                    }
                    if (x === player.x && y === player.y) {
                        wanted["actor_" + index + "_" + player.facing] = true;
                    }
                }
            }
        } else if (state === "TITLE") wanted["portrait_profile_" + species[selected].name] = true;
        else if (state === "PARTY") wanted["portrait_profile_" + party[selected].kind.name] = true;
        else if (state === "BATTLE") {
            wanted["arena_" + battle.arena] = true;
            var hit = animation && animation.hits[Math.floor(animation.frame / 4)];
            var frame = animation ? animation.frame % 4 : -1;
            ["foe", "ally"].forEach(function (side) {
                var monster = side === "foe" ? enemy() : active();
                var hp = presentedHP(side, monster);
                var attacking = hit && hit.attacker === side;
                var pose = "idle";
                if (attacking && frame === 0) pose = "wind";
                if (attacking && frame === 1) {
                    pose = "lunge";
                    wanted["trail_" + side + "_" + hit.element] = true;
                }
                if (hit && !attacking && frame === 2) {
                    pose = "recoil";
                    wanted["impact_" + side + "_" + hit.element] = true;
                }
                if (hp || pose === "recoil") wanted["fighter_" + side + "_" + pose + "_" + monster.kind.name] = true;
                wanted["health_" + side + "_" + healthSegments(monster, hp)] = true;
            });
        }
        Object.keys(visible).forEach(function (field) {
            if (!wanted[field]) graphics[field].display = 1;
        });
        Object.keys(wanted).forEach(function (field) {
            if (!visible[field]) {
                if (!graphics[field]) graphics[field] = doc.getField(field);
                graphics[field].display = 0;
            }
        });
        visible = wanted;
    }

    var species = [
        {name: "Cindlet", type: "Ember", hp: 23, atk: 8, def: 5,
            moves: [["Coal Jab", 4], ["Kiln Flare", 8, "Ember"]]},
        {name: "Rillfin", type: "Tide", hp: 25, atk: 6, def: 6,
            moves: [["Tail Flick", 4], ["Rill Surge", 8, "Tide"]]},
        {name: "Bramblet", type: "Grove", hp: 27, atk: 6, def: 7,
            moves: [["Burr Roll", 4], ["Briar Lash", 8, "Grove"]]},
        {name: "Flintback", type: "Stone", hp: 25, atk: 7, def: 8,
            moves: [["Shell Ram", 4], ["Shale Arc", 8, "Stone"]]},
        {name: "Voltwing", type: "Spark", hp: 21, atk: 9, def: 5,
            moves: [["Quill Cut", 4], ["Static Dive", 8, "Spark"]]}
    ];
    var strong = {Ember: "Grove", Grove: "Stone", Stone: "Spark", Spark: "Tide", Tide: "Ember"};
    var party, lead, bag, selected, battle;

    function newMonster(index, level) {
        var kind = species[index];
        return {kind: kind, level: level, xp: 0, hp: kind.hp + level * 3};
    }

    function maxHP(monster) { return monster.kind.hp + monster.level * 3; }
    function attack(monster) { return monster.kind.atk + monster.level; }
    function defense(monster) { return monster.kind.def + monster.level; }
    function xpTarget(monster) { return 7 + monster.level * 2; }
    function active() { return party[lead]; }
    function enemy() { return battle.enemies[battle.index]; }

    function reset() {
        player = {x: 6, y: 25, facing: "up"};
        caches = [];
        grassSteps = 0;
        survey = 0;
        cleared = {ranger: false, warden: false};
        party = [];
        lead = 0;
        bag = {tonics: 4, capsules: 5};
        selected = 0;
        battle = null;
        state = "TITLE";
        notice = "";
    }

    function menuItem(label, index) {
        return (selected === index ? " > " : "   ") + label;
    }

    function choose(action, count) {
        if (action === "up" || action === "left") selected = (selected + count - 1) % count;
        if (action === "down" || action === "right") selected = (selected + 1) % count;
    }

    function presentedHP(side, monster) {
        if (animation) {
            for (var i = 0; i < animation.hits.length; i++) {
                var hit = animation.hits[i];
                if (hit.attacker !== side && animation.frame < i * 4 + 2) return hit.before;
            }
        }
        return monster.hp;
    }

    function healthSegments(monster, hp) {
        return Math.ceil(10 * hp / maxHP(monster));
    }

    function health(monster, side) {
        return "HP " + presentedHP(side, monster) + "/" + maxHP(monster);
    }

    function scheduleFrame() {
        if (typeof app === "undefined" || typeof app.setTimeOut !== "function") {
            animation = null;
            return;
        }
        try {
            app.setTimeOut("MonsterGame.frame(" + animation.id + ")", animation.frame % 4 === 2 ? 145 : 95);
        } catch (error) {
            animation = null;
        }
    }

    function advanceFrame(id) {
        if (!animation || animation.id !== id) return;
        animation.frame++;
        if (animation.frame >= animation.hits.length * 4) animation = null;
        else scheduleFrame();
        render();
    }

    function description(monster) {
        return monster.kind.name + " Lv" + monster.level + " / " + monster.kind.type;
    }

    function titleView() {
        var kind = species[selected];
        return ["Choose a partner", "", "", "", "",
            menuItem("Cindlet", 0), "", menuItem("Rillfin", 1), "", menuItem("Bramblet", 2), "",
            kind.type + "  /  " + kind.moves[1][0], "", "", "", "A  Start"];
    }

    function missionsView() {
        function mark(done) { return done ? "[x] " : "[ ] "; }
        return ["Missions", "", "",
            mark(cleared.ranger) + "Beat Sable for a court pass",
            mark(cleared.warden) + "Defeat Orin at Summit Court", "",
            "",
            mark(party.length >= 2) + "Capture a wild monster",
            mark(caches.length === supplies.length) + "Find supply caches  " + caches.length + "/" + supplies.length,
            mark(party.length === species.length) + "Collect every species  " + party.length + "/" + species.length,
            mark(survey === 3) + (survey === 2 ? "Bring the shard to Mica" :
                survey === 1 ? "Find the shard in Flint Cave" :
                survey === 3 ? "Flint Cave survey complete" : "Ask Mica about the cave survey")];
    }

    function inventoryView() {
        return ["Menu", "", "",
            menuItem("Missions", 0), "",
            menuItem("Party", 1), "",
            menuItem("Tonic  x" + bag.tonics, 2),
            "", "Capsules  x" + bag.capsules, "", notice];
    }

    function partyList() {
        return party.map(function (monster, index) {
            var label = monster.kind.name + " Lv" + monster.level + "   ";
            return menuItem(label + (monster.hp ? monster.hp + "/" + maxHP(monster) : "Fainted") +
                (index === lead ? "  (lead)" : ""), index);
        });
    }

    function partyView() {
        var monster = party[selected];
        return ["Party", "", ""]
            .concat(partyList(), ["", description(monster), "ATK " + attack(monster) +
                "  DEF " + defense(monster) + "  XP " + monster.xp + "/" + xpTarget(monster),
                monster.kind.moves[0][0] + " / " + monster.kind.moves[1][0], ""],
                [notice, "A  Set lead"]);
    }

    function battleView() {
        var foe = enemy(), ally = active();
        var lines = [battle.name, "",
            " " + description(foe), " " + health(foe, "foe"), "", "", "",
            " ".repeat(28) + ally.kind.name + " Lv" + ally.level,
            " ".repeat(28) + health(ally, "ally"), "", "", ""];
        if (animation) {
            var hit = animation.hits[Math.floor(animation.frame / 4)];
            return lines.concat(["", hit.move]);
        }
        if (battle.mode === "message") return lines.concat(battle.messages, ["", "A Continue"]);
        if (battle.mode === "moves") return lines.concat(["",
            menuItem(ally.kind.moves[0][0] + " / Neutral", 0),
            menuItem(ally.kind.moves[1][0] + " / " + ally.kind.type, 1)]);
        if (battle.mode === "items") return lines.concat(["",
            menuItem("Tonic    x" + bag.tonics, 0), menuItem("Capsule  x" + bag.capsules, 1),
            battle.note]);
        if (battle.mode === "switch" || battle.mode === "forced") {
            return lines.concat(partyList(), [battle.note]);
        }
        return lines.concat([menuItem("Fight", 0), menuItem("Pack", 1),
            menuItem("Switch", 2), menuItem("Retreat", 3), battle.note]);
    }

    function screen() {
        if (state === "TITLE") return titleView();
        if (state === "INVENTORY") return inventoryView();
        if (state === "MISSIONS") return missionsView();
        if (state === "PARTY") return partyView();
        if (state === "BATTLE") return battleView();
        if (state === "VICTORY") return ["Summit Champion", "", "",
            "Summit crest earned.", "", "A  Return to court"];
        if (state === "GAME_OVER") return ["Party fainted", "", "", "A  Return to village"];
        return explorationView();
    }

    function startBattle(name, lineup, trainer) {
        var region = area(player.x, player.y);
        var arena = region === "Summit Court" ? "summit" : region === "Flint Cave" ? "cave" : "meadow";
        signal = "encounter";
        grassSteps = 0;
        battle = {
            name: name, trainer: trainer, arena: arena, index: 0, enemies: lineup.map(function (entry) {
                return newMonster(entry[0], entry[1]);
            }),
            participants: [lead], mode: "root", note: ""
        };
        state = "BATTLE";
        selected = 0;
    }

    function wildEncounter() {
        var region = area(player.x, player.y);
        var pool = region === "Flint Cave" ? [3, 4, 0] :
            region === "Slate Route" ? [4, 1, 3] : [2, 1, 0];
        var level = region === "Flint Cave" ? 5 : region === "Slate Route" ? 4 : 3;
        startBattle("Wild encounter", [[pool[Math.floor(Math.random() * pool.length)], level]], "");
    }

    function heal(monster) {
        if (!bag.tonics || monster.hp === maxHP(monster)) return false;
        bag.tonics--;
        monster.hp = Math.min(maxHP(monster), monster.hp + 26);
        return true;
    }

    function recoverParty() {
        party.forEach(function (monster) { monster.hp = maxHP(monster); });
    }

    function battleMessage(lines, after) {
        battle.mode = "message";
        battle.messages = lines;
        battle.after = after;
        if (pendingHits.length) {
            animation = {hits: pendingHits, frame: 0, id: ++animationId};
            pendingHits = [];
            scheduleFrame();
        }
    }

    function battleMenu(mode) {
        battle.mode = mode;
        battle.note = "";
        selected = 0;
    }

    function strike(attacker, defender, move) {
        var advantage = strong[move[2]] === defender.kind.type;
        var resisted = !!move[2] &&
            (strong[defender.kind.type] === move[2] || defender.kind.type === move[2]);
        var base = Math.max(2, move[1] + Math.floor(attack(attacker) * 0.65) -
            Math.floor(defense(defender) * 0.55));
        var damage = Math.max(1, Math.round(base * (advantage ? 1.5 : resisted ? 0.65 : 1)));
        pendingHits.push({
            attacker: attacker === active() ? "ally" : "foe",
            element: move[2] || "Neutral",
            move: attacker.kind.name + "  /  " + move[0],
            before: defender.hp
        });
        defender.hp = Math.max(0, defender.hp - damage);
        var message = attacker.kind.name + " " + move[0] + ": " + damage + " HP";
        return message + (advantage ? "!" : resisted ? " (resisted)" : "");
    }

    function retaliate(lines) {
        var foe = enemy();
        var move = foe.kind.moves[Math.random() < 0.55 ? 0 : 1];
        lines.push(strike(foe, active(), move));
        var next = "root";
        if (!active().hp) {
            lines.push(active().kind.name + " fainted.");
            next = party.some(function (monster) { return monster.hp > 0; }) ? "forced" : "lose";
        }
        battleMessage(lines, next);
    }

    function awardXP() {
        var levelUps = [];
        battle.participants.forEach(function (index) {
            var member = party[index];
            member.xp += 5 + enemy().level * 2;
            while (member.xp >= xpTarget(member)) {
                member.xp -= xpTarget(member);
                member.level++;
                if (member.hp) member.hp += 3;
                levelUps.push(member.kind.name + " Lv" + member.level);
            }
        });
        return levelUps.length ? "Level up: " + levelUps.join(", ") : "Participants earned experience.";
    }

    function useMove() {
        signal = "hit";
        var lines = [strike(active(), enemy(), active().kind.moves[selected])];
        if (enemy().hp) return retaliate(lines);
        lines.push(enemy().kind.name + " fainted.", awardXP());
        battleMessage(lines, battle.index + 1 < battle.enemies.length ? "next" : "win");
    }

    function useBattleItem() {
        if (selected === 0) {
            if (!heal(active())) battle.note = "No tonic available or HP already full.";
            else retaliate(["You used a tonic."]);
            return;
        }
        var foe = enemy();
        if (battle.trainer) battle.note = "Trainer monsters cannot be captured.";
        else if (party.some(function (member) { return member.kind === foe.kind; })) {
            battle.note = "That species is already in your party.";
        } else if (!bag.capsules) battle.note = "No capsules left.";
        else {
            bag.capsules--;
            var fraction = foe.hp / maxHP(foe);
            var chance = fraction <= 0.25 ? 1 : 0.25 + 0.70 * (1 - fraction);
            if (Math.random() < chance) {
                party.push(foe);
                signal = "reward";
                if (party.length === 2) bag.tonics += 2;
                battleMessage(["Captured " + foe.kind.name + "!"], "caught");
            } else retaliate([foe.kind.name + " broke free!"]);
        }
    }

    function endBattle(message) {
        battle = null;
        state = "EXPLORATION";
        notice = message;
    }

    function advanceBattle() {
        var after = battle.after;
        if (after === "lose") state = "GAME_OVER";
        else if (after === "next") {
            battle.index++;
            battle.participants = [lead];
            battleMenu("root");
        } else if (after === "caught") endBattle(party.length === 2 ? "First capture complete! +2 tonics." : "New species logged.");
        else if (after === "win") {
            signal = "reward";
            if (battle.trainer === "ranger") {
                cleared.ranger = true;
                bag.tonics += 3;
                bag.capsules += 2;
                recoverParty();
                endBattle("");
                talk("Ranger Sable", "You earned the court pass and supplies.",
                    "I healed your team. Head north to the cave.");
            } else if (battle.trainer === "warden") {
                cleared.warden = true;
                endBattle("You hold the summit crest.");
                state = "VICTORY";
            } else endBattle("Wild encounter won.");
        } else battleMenu(after);
    }

    function battleInput(action) {
        var mode = battle.mode;
        if (mode === "message") {
            if (action === "a") advanceBattle();
            return;
        }
        if (action === "b" && mode !== "root" && mode !== "forced") return battleMenu("root");
        choose(action, mode === "root" ? 4 : mode === "switch" || mode === "forced" ? party.length : 2);
        if (action !== "a") return;
        if (mode === "moves") useMove();
        else if (mode === "items") useBattleItem();
        else if (mode === "switch" || mode === "forced") {
            if (!party[selected].hp || selected === lead) battle.note = "Choose a healthy reserve.";
            else {
                lead = selected;
                if (!battle.participants.includes(lead)) battle.participants.push(lead);
                if (mode === "forced") battleMenu("root");
                else retaliate(["Go, " + active().kind.name + "!"]);
            }
        } else if (selected < 3) battleMenu(["moves", "items", "switch"][selected]);
        else if (battle.trainer) battle.note = "Finish the trainer match.";
        else endBattle("You retreated safely.");
    }

    function render() {
        drawGraphics();
        var lines = screen();
        fields.forEach(function (field, index) {
            var value = (lines[index] || "").slice(0, 48);
            if (previous[index] !== value) {
                field.value = value;
                previous[index] = value;
            }
        });
        var value = state === "EXPLORATION" ?
            active().kind.name + "  Lv" + active().level + "   " + active().hp + "/" + maxHP(active()) + " HP" :
            state === "BATTLE" && battle.mode === "forced" ? "Choose a replacement" : "";
        if (previousStatus !== value) {
            status.value = value;
            previousStatus = value;
        }
    }

    function talk(name, first, second) {
        dialogue = [name, first, second || ""];
        state = "DIALOGUE";
    }

    function interact() {
        var step = directions[player.facing];
        var x = player.x + step[0], y = player.y + step[1];
        var person = entityAt(people, x, y);
        var cache = entityAt(supplies, x, y);
        if (!cache || caches.includes(cache)) cache = entityAt(supplies, player.x, player.y);
        if (person === people[0]) {
            recoverParty();
            bag.capsules = Math.max(bag.capsules, 3);
            talk(person.name, "Team healed. I keep spare capsules here.",
                "Check the dry tile just east of the pond.");
        } else if (person === people[1]) talk(person.name, "Follow the road east to Ranger Sable.",
            "Check the clearing east of the forest grass.");
        else if (person === people[2]) {
            if (cleared.ranger) talk(person.name, "You have the pass. Head north to the cave.");
            else startBattle("Ranger Sable", [[2, 4], [3, 4]], "ranger");
        } else if (person === people[3]) {
            if (survey === 0) {
                survey = 1;
                talk(person.name, "Find the amber shard in the north chamber.",
                    "Bring it back to finish my cave survey.");
            } else if (survey === 2) {
                survey = 3;
                signal = "reward";
                bag.tonics += 2;
                bag.capsules += 3;
                talk(person.name, "Survey complete! +2 tonics, +3 capsules.",
                    "Check north of the low wall for supplies.");
            } else if (survey === 1) talk(person.name, "Look near the north chamber's rock wall.");
            else talk(person.name, "Check the floor north of the low wall.");
        }
        else if (person === people[4]) {
            if (cleared.warden) talk(person.name, "The summit crest is yours, champion.");
            else startBattle("Warden Orin", [[1, 5], [4, 5], [0, 6]], "warden");
        } else if (survey === 1 && ((sample.x === x && sample.y === y) ||
            (sample.x === player.x && sample.y === player.y))) {
            survey = 2;
            signal = "reward";
            talk("AMBER SHARD", "Take the shard back to Miner Mica.");
        } else if (cache && !caches.includes(cache)) {
            caches.push(cache);
            signal = "reward";
            bag.tonics += cache.tonics;
            bag.capsules += cache.capsules;
            talk("HIDDEN CACHE", "+" + cache.tonics + " tonic, +" + cache.capsules + " capsule.",
                caches.length + "/" + supplies.length + " caches recovered");
        } else notice = "Nothing to examine here.";
    }

    function move(action) {
        player.facing = action;
        var step = directions[action];
        var x = player.x + step[0], y = player.y + step[1];
        var tile = tileAt(x, y);
        if (tile === "+" && !cleared.ranger) notice = "Ranger Sable holds the court pass.";
        else if ("#T~%".includes(tile) || entityAt(people, x, y)) notice = "The way is blocked.";
        else {
            player.x = x;
            player.y = y;
            notice = "";
            if (tile === '"' && (++grassSteps >= 6 || Math.random() < 0.22)) wildEncounter();
        }
    }

    function press(action) {
        if (animation) {
            if (action === "a") {
                animation = null;
                render();
            }
            return;
        }
        signal = "tap";
        if (state === "TITLE") {
            choose(action, 3);
            if (action === "a") {
                party.push(newMonster(selected, 5));
                state = "EXPLORATION";
                notice = "Follow the road east to Ranger Sable.";
            }
        } else if (state === "DIALOGUE") {
            if (action === "a" || action === "b") state = "EXPLORATION";
        } else if (state === "BATTLE") battleInput(action);
        else if (state === "VICTORY") {
            if (action === "a") state = "EXPLORATION";
        } else if (state === "GAME_OVER") {
            if (action === "a") {
                player = {x: 6, y: 25, facing: "up"};
                grassSteps = 0;
                recoverParty();
                bag.tonics = Math.max(bag.tonics, 2);
                bag.capsules = Math.max(bag.capsules, 3);
                endBattle("Party revived. Your mission log is intact.");
            }
        } else if (state === "INVENTORY") {
            choose(action, 3);
            if (action === "b" || action === "menu") {
                state = "EXPLORATION";
                notice = "";
            } else if (action === "a") {
                notice = "";
                if (selected === 0) state = "MISSIONS";
                else if (selected === 1) {
                    state = "PARTY";
                    selected = lead;
                } else notice = heal(active()) ? "Tonic used." : "No tonic or HP already full.";
            }
        } else if (state === "MISSIONS") {
            if (action === "b" || action === "menu") {
                state = "INVENTORY";
                selected = 0;
            }
        } else if (state === "PARTY") {
            choose(action, party.length);
            if (action === "b" || action === "menu") {
                state = "INVENTORY";
                selected = 1;
                notice = "";
            } else if (action === "a") {
                if (party[selected].hp) {
                    lead = selected;
                    notice = active().kind.name + " is your lead.";
                } else notice = "That monster has fainted.";
            }
        } else if (directions[action]) move(action);
        else if (action === "a") interact();
        else if (action === "menu") {
            selected = 0;
            notice = "";
            state = "INVENTORY";
        }
        render();
        return signal;
    }

    createMap();
    reset();
    render();
    return {press: press, frame: advanceFrame};
})(this);
