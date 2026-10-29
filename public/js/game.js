const API = "/api";
const $ = (id) => document.getElementById(id);
const MAX_HP = 30;
const MAX_HEARTS = 3;

let levels = [];
let current = 0;
let xp = 0;
let hearts = MAX_HEARTS;
let hintIndex = 0;
let solved = false;
let player = localStorage.getItem("bugHuntPlayer") || "";

// ---------- Player name ----------
function ensurePlayer() {
  if (!player) {
    player = (prompt("Enter your name for the leaderboard:", "Player") || "Player").trim().slice(0, 20) || "Player";
    localStorage.setItem("bugHuntPlayer", player);
  }
}

// ---------- Load levels from server ----------
async function loadLevels() {
  const res = await fetch(API + "/levels");
  levels = await res.json();
}

// ---------- UI helpers ----------
function renderHearts() {
  $("hearts").textContent = "❤️".repeat(hearts) + "🖤".repeat(MAX_HEARTS - hearts);
}

function renderHp(hp) {
  const pct = Math.max(0, Math.min(100, (hp / MAX_HP) * 100));
  $("hpFill").style.width = pct + "%";
  $("hpFill").className = "hp-fill" + (pct <= 25 ? " critical" : pct <= 50 ? " low" : "");
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
  $("player").textContent = player;
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

// ---------- Submit code to server ----------
async function submitCode(code) {
  const res = await fetch(API + "/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ levelId: current, code })
  });
  return res.json();
}

// ---------- Events ----------
$("code").addEventListener("input", updateLineCount);

$("check").addEventListener("click", async () => {
  if (solved) return;
  const level = levels[current];

  $("check").disabled = true;
  $("check").textContent = "⚔️ Attacking…";

  const result = await submitCode($("code").value);

  $("check").disabled = false;
  $("check").textContent = "⚔️ Attack with fix";

  if (!result.pass) {
    $("monsterEmoji").classList.add("shake");
    setTimeout(() => $("monsterEmoji").classList.remove("shake"), 400);
    feedback("❌ " + result.reason + " — " + level.taunt, "bad");
    hearts--;
    renderHearts();
    if (hearts <= 0) {
      setTimeout(() => {
        feedback("💨 The bug escaped! Hearts restored — try again.", "bad");
        hearts = MAX_HEARTS;
        renderHearts();
      }, 900);
    }
    return;
  }

  // Victory
  solved = true;
  $("monsterEmoji").classList.add("dead");
  renderHp(0);
  xp += 50;
  $("xp").textContent = xp;
  feedback("⚔️ CRITICAL HIT! Bug defeated! (+50 XP)", "good");
  $("check").classList.add("hidden");
  $("hint").classList.add("hidden");
  $("next").classList.remove("hidden");
});

$("hint").addEventListener("click", () => {
  const level = levels[current];
  if (hintIndex < level.hints.length) {
    feedback("💡 Hint " + (hintIndex + 1) + "/" + level.hints.length + ": " + level.hints[hintIndex], "hint");
    hintIndex++;
  } else {
    feedback("💡 That's all the hints for this bug. You're close!", "hint");
  }
});

$("next").addEventListener("click", async () => {
  if (current < levels.length - 1) {
    current++;
    renderLevel();
  } else {
    // Final level — submit score
    await fetch(API + "/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player, xp })
    });

    $("monsterEmoji").textContent = "🏆";
    $("monsterEmoji").className = "monster";
    $("monsterName").textContent = "All bugs squashed!";
    $("title").textContent = "🎉 You win, " + player + "!";
    $("prompt").textContent = "Final score: " + xp + " XP. Check the leaderboard below.";
    $("code").parentElement.classList.add("hidden");
    $("check").classList.add("hidden");
    $("hint").classList.add("hidden");
    $("next").classList.add("hidden");
    feedback("More bugs coming soon…", "good");
    loadLeaderboard();
  }
});

// ---------- Leaderboard ----------
async function loadLeaderboard() {
  try {
    const res = await fetch(API + "/leaderboard");
    const rows = await res.json();
    const list = $("leaderboardList");
    list.innerHTML = rows.length
      ? rows.map(r => `<li><b>${escapeHtml(r.player)}</b> — ${r.xp} XP</li>`).join("")
      : "<li>No scores yet. Be the first!</li>";
  } catch {
    $("leaderboardList").innerHTML = "<li>Could not load leaderboard.</li>";
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ---------- Start ----------
(async () => {
  ensurePlayer();
  await loadLevels();
  renderLevel();
  loadLeaderboard();
})();