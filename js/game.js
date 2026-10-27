// ---------- The levels ----------
const levels = [
  {
    title: "Your first variable",
    prompt: 'Create a variable called <code>greeting</code> set to the text <code>"hello"</code>.',
    vars: ["greeting"],
    expected: { greeting: "hello" }
  },
  {
    title: "Numbers",
    prompt: 'Create a variable called <code>score</code> set to the number <code>42</code>.',
    vars: ["score"],
    expected: { score: 42 }
  },
  {
    title: "Do some math",
    prompt: 'Create <code>total</code> by adding <code>10 + 15</code> — let the computer do the math!',
    vars: ["total"],
    expected: { total: 25 }
  },
  {
    title: "Join text together",
    prompt: 'Make <code>name</code> set to <code>"Alex"</code>, then <code>message</code> set to <code>"Hello, " + name</code>.',
    vars: ["name", "message"],
    expected: { name: "Alex", message: "Hello, Alex" }
  },
  {
    title: "Talk to the console",
    prompt: 'Use <code>console.log()</code> to print <code>Hello, world!</code>',
    logs: ["Hello, world!"]
  }
];

// ---------- State ----------
const $ = (id) => document.getElementById(id);
let current = 0;
let xp = 0;
let solved = false;

// ---------- Save / load progress ----------
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("codingGameProgress") || "{}");
    if (Number.isInteger(saved.current)) current = Math.min(saved.current, levels.length - 1);
    if (Number.isFinite(saved.xp)) xp = saved.xp;
  } catch (e) { /* ignore bad data */ }
}

function save() {
  localStorage.setItem("codingGameProgress", JSON.stringify({ current, xp }));
}

// ---------- Run the learner's code safely-ish ----------
function check(userCode, level) {
  const logs = [];
  const realLog = console.log;
  console.log = (...args) => logs.push(args.map(String).join(" "));

  try {
    let values = {};
    if (level.vars) {
      // Run their code, then return the variables we want to inspect
      const fn = new Function(
        "'use strict';\n" + userCode + "\nreturn {" + level.vars.join(", ") + "};"
      );
      values = fn();
    } else {
      new Function("'use strict';\n" + userCode)();
    }
    return { ok: true, values, logs };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    console.log = realLog; // always restore the real console
  }
}

function checkValues(result, level) {
  const expected = level.expected || {};
  for (const key of Object.keys(expected)) {
    const got = result.values ? result.values[key] : undefined;
    if (JSON.stringify(got) !== JSON.stringify(expected[key])) {
      return `expected ${key} to be ${JSON.stringify(expected[key])}, but got ${JSON.stringify(got)}`;
    }
  }
  if (level.logs && JSON.stringify(result.logs) !== JSON.stringify(level.logs)) {
    return `expected the console to show ${JSON.stringify(level.logs)}, but it showed ${JSON.stringify(result.logs)}`;
  }
  return null;
}

// ---------- UI ----------
function renderLevel() {
  const level = levels[current];
  solved = false;
  $("levelNum").textContent = current + 1;
  $("xp").textContent = xp;
  $("title").textContent = level.title;
  $("prompt").innerHTML = level.prompt;
  $("code").value = "";
  $("code").classList.remove("hidden");
  $("check").classList.remove("hidden");
  $("next").classList.add("hidden");
  $("feedback").textContent = "";
  $("feedback").className = "";
}

function feedback(text, type) {
  $("feedback").textContent = text;
  $("feedback").className = type;
}

// ---------- Events ----------
$("check").addEventListener("click", () => {
  const level = levels[current];
  const result = check($("code").value, level);

  if (!result.ok) {
    feedback("❌ " + result.error + " — check your code and try again.", "bad");
    return;
  }

  const problem = checkValues(result, level);
  if (problem) {
    feedback("❌ Not quite — " + problem, "bad");
    return;
  }

  feedback("✅ Correct! Nice work. (+20 XP)", "good");
  if (!solved) {
    solved = true;
    xp += 20;
    $("xp").textContent = xp;
    save();
  }
  $("next").classList.remove("hidden");
});

$("next").addEventListener("click", () => {
  if (current < levels.length - 1) {
    current++;
    save();
    renderLevel();
  } else {
    $("title").textContent = "🎉 You finished!";
    $("prompt").textContent = "You completed all " + levels.length + " levels. More coming soon!";
    $("code").classList.add("hidden");
    $("check").classList.add("hidden");
    $("next").classList.add("hidden");
    feedback("Total XP: " + xp, "good");
  }
});

// ---------- Start ----------
load();
renderLevel();