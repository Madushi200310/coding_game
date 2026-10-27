// ============================================================
//  BUG HUNT — fix broken code to defeat bugs
//  Each level: a bug monster + broken code. Fix it = victory.
// ============================================================

const levels = [
  {
    emoji: "🐛",
    name: "The Broken Counter",
    title: "Bug #1 — Type Mismatch",
    prompt: 'The bug wants <code>count</code> to be the number <code>1</code>, but adding <code>"1"</code> (a string) glues text instead of doing math. Fix the code.',
    broken: `let count = 0;\ncount = count + "1";`,
    vars: ["count"],
    expected: { count: 1 },
    hints: [
      'Look closely at the quotes around "1".',
      'A string plus a number makes text, not math. "0" + 1 = "01".',
      'Remove the quotes: count + 1'
    ],
    taunt: "Ha! That's not 1, that's text! 🐛"
  },
  {
    emoji: "🐜",
    name: "The Wrong Operator",
    title: "Bug #2 — Wrong Math",
    prompt: 'The bug swapped an operator. <code>total</code> should be <code>15</code>, not <code>5</code>. Find and fix the wrong symbol.',
    broken: `let total = 10 - 5;`,
    vars: ["total"],
    expected: { total: 15 },
    hints: [
      '10 - 5 is 5. You need 15.',
      '10 + 5 is 15. Which character should change?',
      'Change - to +'
    ],
    taunt: "Wrong direction, human! 🐜"
  },
  {
    emoji: "🪲",
    name: "The Typo",
    title: "Bug #3 — Misspelled Name",
    prompt: 'A variable name got misspelled, so the code crashes. Fix the typo so <code>greeting</code> becomes <code>"Hello, Alex"</code>.',
    broken: `let name = "Alex";\nlet greeting = "Hello, " + nmae;`,
    vars: ["greeting"],
    expected: { greeting: "Hello, Alex" },
    hints: [
      'Read every variable name character by character.',
      'nmae is not the same as name — letters are swapped.',
      'Change nmae to name'
    ],
    taunt: "Can't read? That variable doesn't exist! 🪲"
  },
  {
    emoji: "🦗",
    name: "The String Trap",
    title: "Bug #4 — Number in Disguise",
    prompt: '<code>total</code> should be the number <code>110</code>, but it becomes <code>"10010"</code> — text glued together. One pair of quotes is the culprit.',
    broken: `let price = "100";\nlet tax = 10;\nlet total = price + tax;`,
    vars: ["total"],
    expected: { total: 110 },
    hints: [
      'If the answer looks like glued text, a number is secretly a string.',
      'Look at price = "100" — those quotes make it text.',
      'Remove the quotes around 100'
    ],
    taunt: "10010? That's not a number, that's a barcode! 🦗"
  },
  {
    emoji: "🐞",
    name: "The Off-By-One",
    title: "Bug #5 — Wrong Index",
    prompt: 'Arrays start counting at <code>0</code>, not <code>1</code>. The bug wants <code>first</code> to be <code>"apple"</code>. Fix the index.',
    broken: `let fruits = ["apple", "banana"];\nlet first = fruits[1];`,
    vars: ["first"],
    expected: { first: "apple" },
    hints: [
      'The first item in an array is not at position 1.',
      'JavaScript counts from 0.',
      'Change fruits[1] to fruits[0]'
    ],
    taunt: "Banana? You call that first? 🐞"
  }
];

// ---------- State ----------
const $ = (id) => document.getElementById(id);
const MAX_HP = 30;
const MAX_HEARTS = 3;

let current = 0;
let xp = 0;
let hearts = MAX_HEARTS;
let hintIndex = 0;
let solved = false;

// ---------- Save / load ----------
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("bugHuntProgress") || "{}");
    if (Number.isInteger(saved.current)) current = Math.min(saved.current, levels.length - 1);
    if (Number.isFinite(saved.xp)) xp = saved.xp;
  } catch (e) { /* ignore */ }
}
function save() {
  localStorage.setItem("bugHuntProgress", JSON.stringify({ current, xp }));
}

// ---------- Run learner's code ----------
function runCode(userCode, level) {
  try {
    const fn = new Function(
      "'use strict';\n" + userCode + "\nreturn {" + level.vars.join(", ") + "};"
    );
    return { ok: true, values: fn() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function compare(values, level) {
  for (const key of Object.keys(level.expected)) {
    const got = values ? values[key] : undefined;
    if (JSON.stringify(got) !== JSON.stringify(level.expected[key])) {
      return `expected ${key} to be ${JSON.stringify(level.expected[key])}, but got ${JSON.stringify(got)}`;
    }
  }
  return null;
}

// ---------- UI helpers ----------
function renderHearts() {
  $("hearts").textContent = "❤️".repeat(hearts) + "🖤".repeat(MAX_HEARTS - hearts);
}

function renderHp(hp) {
  const pct = Math.max(0, Math.min(100, (hp / MAX_HP) * 100));
  const fill = $("hpFill");
  fill.style.width = pct + "%";
  fill.className = "hp-fill" + (pct <= 25 ? " critical" : pct <= 50 ? " low" : "");
  $("hpText").textContent = Math.max(0, hp);
}

function feedback(text, type) {
  const el = $("feedback");
  el.textContent = text;
  el.className = type || "";
}

function updateLineCount() {
  const n = $("code").value.split("\n").length;
  $("lineCount").textContent = n + (n === 1 ? " line" : " lines");
}

// ---------- Render a level ----------
function renderLevel() {
  const level = levels[current];
  solved = false;
  hearts = MAX_HEARTS;
  hintIndex = 0;

  $("bugNum").textContent = current + 1;
  $("xp").textContent = xp;
  renderHearts();

  $("monsterEmoji").textContent = level.emoji;
  $("monsterEmoji").className = "monster";
  $("monsterName").textContent = level.name;
  renderHp(MAX_HP);

  $("title").textContent = level.title;
  $("prompt").innerHTML = level.prompt;

  $("code").value = level.broken;
  updateLineCount();

  $("check").classList.remove("hidden");
  $("hint").classList.remove("hidden");
  $("next").classList.add("hidden");
  feedback("", "");
}

// ---------- Events ----------
$("code").addEventListener("input", updateLineCount);

$("check").addEventListener("click", () => {
  if (solved) return;
  const level = levels[current];
  const result = runCode($("code").value, level);

  // --- Code crashed ---
  if (!result.ok) {
    const monster = $("monsterEmoji");
    monster.classList.add("shake");
    setTimeout(() => monster.classList.remove("shake"), 400);
    feedback("💥 " + result.error + " — " + level.taunt, "bad");
    loseHeart();
    return;
  }

  // --- Wrong output ---
  const problem = compare(result.values, level);
  if (problem) {
    const monster = $("monsterEmoji");
    monster.classList.add("shake");
    setTimeout(() => monster.classList.remove("shake"), 400);
    feedback("❌ " + problem + " — " + level.taunt, "bad");
    loseHeart();
    return;
  }

  // --- Victory! ---
  solved = true;
  $("monsterEmoji").classList.add("dead");
  renderHp(0);
  feedback("⚔️ CRITICAL HIT! Bug defeated! (+50 XP)", "good");
  xp += 50;
  $("xp").textContent = xp;
  save();
  $("check").classList.add("hidden");
  $("hint").classList.add("hidden");
  $("next").classList.remove("hidden");
});

function loseHeart() {
  hearts--;
  renderHearts();
  if (hearts <= 0) {
    setTimeout(() => {
      feedback("💨 The bug escaped! Hearts restored — try again, you've got this.", "bad");
      hearts = MAX_HEARTS;
      renderHearts();
    }, 900);
  }
}

$("hint").addEventListener("click", () => {
  const level = levels[current];
  if (hintIndex < level.hints.length) {
    feedback("💡 Hint " + (hintIndex + 1) + "/" + level.hints.length + ": " + level.hints[hintIndex], "hint");
    hintIndex++;
  } else {
    feedback("💡 That's all the hints for this bug. You're close!", "hint");
  }
});

$("next").addEventListener("click", () => {
  if (current < levels.length - 1) {
    current++;
    save();
    renderLevel();
  } else {
    // All bugs squashed
    $("monsterEmoji").textContent = "🏆";
    $("monsterEmoji").className = "monster";
    $("monsterName").textContent = "All bugs squashed!";
    $("title").textContent = "🎉 You win!";
    $("prompt").textContent = "You defeated all " + levels.length + " bugs. Your final score: " + xp + " XP.";
    $("code").parentElement.classList.add("hidden");
    $("check").classList.add("hidden");
    $("hint").classList.add("hidden");
    $("next").classList.add("hidden");
    feedback("More bugs coming soon…", "good");
  }
});

// ---------- Start ----------
load();
renderLevel();