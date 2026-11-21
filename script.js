const passwordInput = document.getElementById("password");
const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");
const strengthTrack = document.getElementById("strengthTrack");
const toggleBtn = document.getElementById("toggleBtn");
const checkBtn = document.getElementById("checkBtn");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const HISTORY_KEY = "passguard-check-history";
const MAX_HISTORY = 8;

const rules = {
  length: value => value.length >= 12,
  upper: value => /[A-Z]/.test(value),
  lower: value => /[a-z]/.test(value),
  number: value => /[0-9]/.test(value),
  symbol: value => /[^A-Za-z0-9]/.test(value),
  noSpaces: value => !/\s/.test(value)
};

function analysePassword(value) {
  const results = Object.entries(rules).map(([name, test]) => [name, test(value)]);
  const passed = results.filter(([, ok]) => ok).length;
  // A long password is important; the score also rewards variety and avoids
  // calling a short password strong just because it uses many character types.
  let score = passed;
  if (value.length >= 16) score += 1;
  if (value.length >= 20) score += 1;
  if (value.length < 8) score = Math.min(score, 2);

  let level = "Weak";
  if (passed >= 5 && value.length >= 12 && score >= 6) level = "Strong";
  else if (passed >= 3 && value.length >= 8) level = "Medium";

  const suggestions = [];
  if (value.length < 12) suggestions.push("Use at least 12 characters; 16 or more is even better.");
  if (!rules.upper(value)) suggestions.push("Add an uppercase letter, such as A or M.");
  if (!rules.lower(value)) suggestions.push("Include lowercase letters.");
  if (!rules.number(value)) suggestions.push("Add at least one number.");
  if (!rules.symbol(value)) suggestions.push("Include a symbol such as !, @, # or %.");
  if (!rules.noSpaces(value)) suggestions.push("Remove spaces or use a deliberate passphrase consistently.");
  if (/(.)\1{2,}/.test(value)) suggestions.push("Avoid repeating the same character three or more times.");
  if (/password|123456|qwerty|admin|letmein/i.test(value)) suggestions.push("Avoid common words or predictable sequences.");
  if (suggestions.length === 0) suggestions.push("Great checklist result. Make sure this password is unique to one account.");

  return { results, passed, level, suggestions };
}

function renderAnalysis() {
  const value = passwordInput.value;
  const analysis = analysePassword(value);

  analysis.results.forEach(([name, passed]) => {
    const item = document.querySelector(`[data-rule="${name}"]`);
    item.classList.toggle("met", Boolean(value) && passed);
    item.querySelector(".rule-icon").textContent = value && passed ? "✓" : "○";
  });
  document.getElementById("criteriaCount").textContent = `${value ? analysis.passed : 0}/6 met`;

  if (!value) {
    strengthBar.style.width = "0%";
    strengthBar.style.background = "var(--purple)";
    strengthText.textContent = "Not checked yet";
    strengthText.className = "strength-label neutral";
    strengthTrack.setAttribute("aria-valuenow", "0");
    document.getElementById("suggestionTitle").textContent = "A little guidance goes a long way";
    document.getElementById("suggestionText").textContent = "Enter a password to see tailored suggestions for making it stronger.";
    return analysis;
  }

  const percent = analysis.level === "Strong" ? 100 : analysis.level === "Medium" ? 62 : 28;
  const color = analysis.level === "Strong" ? "var(--mint)" : analysis.level === "Medium" ? "#ffc477" : "#ff8d9a";
  strengthBar.style.width = `${percent}%`;
  strengthBar.style.background = color;
  strengthText.textContent = `${analysis.level} password`;
  strengthText.className = `strength-label ${analysis.level.toLowerCase()}`;
  strengthTrack.setAttribute("aria-valuenow", String(percent));
  document.getElementById("suggestionTitle").textContent = analysis.level === "Strong" ? "Looking good — keep it unique" : "Try these improvements";
  document.getElementById("suggestionText").textContent = analysis.suggestions.slice(0, 3).join(" ");
  return analysis;
}

function readHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = readHistory();
  historyCount.textContent = String(history.length);
  clearHistoryBtn.hidden = history.length === 0;

  if (!history.length) {
    historyList.innerHTML = '<div class="empty-history"><span>⌁</span><p>Your checked results will<br>appear here.</p></div>';
    return;
  }

  historyList.replaceChildren();
  history.forEach(entry => {
    const row = document.createElement("div");
    row.className = "history-item";

    const meta = document.createElement("div");
    meta.className = "history-meta";
    const mask = document.createElement("span");
    mask.className = "history-mask";
    mask.textContent = entry.mask || "••••••••";
    const date = document.createElement("span");
    date.className = "history-date";
    date.textContent = new Date(entry.checkedAt).toLocaleString();
    meta.append(mask, date);

    const grade = document.createElement("span");
    grade.className = `history-grade ${String(entry.level).toLowerCase()}`;
    grade.textContent = entry.level;

    row.append(meta, grade);
    historyList.append(row);
  });
}

passwordInput.addEventListener("input", renderAnalysis);

toggleBtn.addEventListener("click", () => {
  const showing = passwordInput.type === "password";
  passwordInput.type = showing ? "text" : "password";
  toggleBtn.textContent = showing ? "Hide" : "Show";
  toggleBtn.setAttribute("aria-label", showing ? "Hide password" : "Show password");
});

checkBtn.addEventListener("click", () => {
  const value = passwordInput.value;
  if (!value) {
    document.getElementById("suggestionTitle").textContent = "Enter a password first";
    document.getElementById("suggestionText").textContent = "Type a password above, then select Check & save result.";
    passwordInput.focus();
    return;
  }

  const analysis = renderAnalysis();
  const history = readHistory();
  history.unshift({
    // Intentionally store no password, reversible value, or password hash.
    mask: "••••••••",
    level: analysis.level,
    checkedAt: new Date().toISOString()
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  renderHistory();

  const original = checkBtn.innerHTML;
  checkBtn.textContent = "✓ Result saved on this device";
  window.setTimeout(() => { checkBtn.innerHTML = original; }, 1800);
});

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

renderAnalysis();
renderHistory();
