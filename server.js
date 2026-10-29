const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database("game.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player TEXT NOT NULL,
    xp INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// ---------- Levels live ONLY on the server ----------
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

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- GET levels (answers stripped) ----------
app.get("/api/levels", (req, res) => {
  const safe = levels.map((l, i) => ({
    id: i,
    emoji: l.emoji,
    name: l.name,
    title: l.title,
    prompt: l.prompt,
    broken: l.broken,
    hints: l.hints,
    taunt: l.taunt
  }));
  res.json(safe);
});

// ---------- POST submit — runs learner code on the server ----------
app.post("/api/submit", (req, res) => {
  const { levelId, code } = req.body;
  const level = levels[levelId];
  if (!level) return res.status(400).json({ error: "Unknown level" });
  if (typeof code !== "string") return res.status(400).json({ error: "Code must be text" });

  try {
    const fn = new Function(
      "'use strict';\n" + code + "\nreturn {" + level.vars.join(", ") + "};"
    );
    const values = fn();

    for (const key of Object.keys(level.expected)) {
      const got = values[key];
      if (JSON.stringify(got) !== JSON.stringify(level.expected[key])) {
        return res.json({
          pass: false,
          reason: `expected ${key} to be ${JSON.stringify(level.expected[key])}, but got ${JSON.stringify(got)}`
        });
      }
    }
    return res.json({ pass: true });
  } catch (err) {
    return res.json({ pass: false, reason: err.message });
  }
});

// ---------- GET leaderboard ----------
app.get("/api/leaderboard", (req, res) => {
  const rows = db.prepare(
    "SELECT player, xp, created_at FROM scores ORDER BY xp DESC, created_at ASC LIMIT 10"
  ).all();
  res.json(rows);
});

// ---------- POST score ----------
app.post("/api/score", (req, res) => {
  const { player, xp } = req.body;
  if (typeof player !== "string" || !player.trim() || player.length > 20) {
    return res.status(400).json({ error: "Invalid player name" });
  }
  if (!Number.isInteger(xp) || xp < 0 || xp > 100000) {
    return res.status(400).json({ error: "Invalid xp" });
  }
  db.prepare("INSERT INTO scores (player, xp) VALUES (?, ?)").run(player.trim(), xp);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🐛 Bug Hunt at http://localhost:${PORT}`));