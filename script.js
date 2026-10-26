const YEAR = new Date().getFullYear();
const COMMON = ["password", "123456", "qwerty", "admin", "letmein", "welcome"];
const ATTACKS = ["phishing", "ransomware", "malware", "ddos", "xss", "sqli", "botnet", "spoofing"];
const CIA = ["confidentiality", "integrity", "availability"];

const hasAny = (p, words) => words.some(w => p.toLowerCase().includes(w));
const digitSum = p => [...p].reduce((s, c) => s + (/\d/.test(c) ? +c : 0), 0);

const RULES = [
  { text: "Use at least 12 characters.", ok: p => p.length >= 12 },
  { text: "Use an uppercase and a lowercase letter.", ok: p => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { text: "Include a number.", ok: p => /\d/.test(p) },
  { text: "Include a special character: ! @ # $ % ^ & *", ok: p => /[!@#$%^&*]/.test(p) },
  { text: "Do not contain a common password: password, 123456, qwerty, admin, letmein, welcome.", ok: p => !hasAny(p, COMMON) },
  { text: "Include the default SSH port number.", ok: p => p.includes("22") },
  { text: "Include a type of attack: phishing, ransomware, malware, ddos, xss, sqli, botnet or spoofing.", ok: p => hasAny(p, ATTACKS) },
  { text: "Include one pillar of the CIA triad: confidentiality, integrity or availability.", ok: p => hasAny(p, CIA) },
  { text: `Include the current year (${YEAR}) so a leaked old password is useless.`, ok: p => p.includes(String(YEAR)) },
  { text: "Do not repeat any character three times in a row.", ok: p => !/(.)\1\1/.test(p) },
  { text: "All the digits in your password must add up to exactly 25.", ok: p => digitSum(p) === 25 },
];

const $ = id => document.getElementById(id);
const pw = $("pw");
let revealed = 1;
let stage = 1;
let code = "", expiresAt = 0, timer = null;

function evaluate() {
  const p = pw.value;
  while (revealed < RULES.length && RULES.slice(0, revealed).every(r => r.ok(p))) revealed++;

  const shown = RULES.slice(0, revealed).map(r => ({ text: r.text, pass: r.ok(p) }));
  shown.sort((a, b) => a.pass - b.pass); // failing rules first
  $("rules").innerHTML = shown
    .map(r => `<li class="${r.pass ? "ok" : "bad"}">${r.text}</li>`)
    .join("");

  const met = shown.filter(r => r.pass).length;
  $("count").textContent = `${met} of ${RULES.length} rules met`;

  if (stage === 1 && revealed === RULES.length && met === RULES.length) startMFA();
}

function startMFA() {
  stage = 2;
  pw.readOnly = true;
  $("mfa").hidden = false;
  $("phone").hidden = false;
  newCode();
  timer = setInterval(tick, 250);
  $("otp").focus();
}

function newCode() {
  code = String(Math.floor(100000 + Math.random() * 900000));
  expiresAt = Date.now() + 30000;
  $("code").textContent = code.slice(0, 3) + " " + code.slice(3);
}

function tick() {
  const left = expiresAt - Date.now();
  if (left <= 0) newCode();
  $("bar").style.width = Math.max(0, (expiresAt - Date.now()) / 300) + "%";
}

function fail(el, msg) {
  el.textContent = msg;
  const box = el.parentElement;
  box.classList.remove("shake");
  void box.offsetWidth;
  box.classList.add("shake");
}

$("mfa").addEventListener("submit", e => {
  e.preventDefault();
  if ($("otp").value.trim() === code) {
    stage = 3;
    $("mfa-msg").textContent = "";
    $("mfa").hidden = true;
    $("sms").hidden = false;
  } else {
    fail($("mfa-msg"), "Wrong or expired code. Check your phone for the current one.");
    $("otp").value = "";
  }
});

$("reply").addEventListener("click", () => {
  stage = 2;
  $("sms").hidden = true;
  $("mfa").hidden = false;
  $("otp").value = "";
  newCode();
  fail($("mfa-msg"), "That was social engineering. You gave an attacker your code and they logged in as you. Your session was revoked and a new code was issued. Verify again.");
});

$("report").addEventListener("click", () => {
  clearInterval(timer);
  $("phone").hidden = true;
  document.querySelector("main").hidden = true;
  $("win").hidden = false;
});

pw.addEventListener("input", evaluate);
evaluate();
