// ============================================================
// KINGDOM TOURNAMENT CHATBOT
// ============================================================

(function() {

const BOT_NAME = "Sir Chatsworth";

const KB = {
  schedule: "The Battle Schedule: Day I — Sir Arthur vs Sir Lancelot at Noon. Day II — Sir Ragnar vs Sir Leon at Sunset. The Grand Final — Champion vs Champion at Nightfall.",
  warriors: "Our legendary warriors are: Sir Arthur (Grandmaster), Sir Lancelot (Elite Knight), Sir Ragnar (Champion), Sir Leon (Warrior), Sir Cedric (Knight), Sir Darius (Fighter), Sir Valen (Guardian), Sir Orion (Defender), and Sir Magnus (Elite).",
  leaderboard: "Visit the Leaderboard page to see current rankings and submit your score. Powered by LootLocker cloud technology!",
  contact: "You can send a royal message via the Messenger page. Our tournament grounds are shown on the map.",
  prize: "The Grand Champion earns the Royal Crown, eternal glory, and 1000 gold coins!",
  rules: "Rules: Honor above all. No poison blades. Battles are decided by points. The highest scorer advances to the Final.",
  location: "The tournament is held at the Kingdom Grand Arena. Visit the Messenger page to see our location on the map.",
  hello: "Hail, brave soul! I am Sir Chatsworth, your royal tournament guide. Ask me about the schedule, warriors, prizes, or rules!",
};

function getReply(msg) {
  const m = msg.toLowerCase();
  if (/\b(hi|hello|hey|hail|greet)\b/.test(m))         return KB.hello;
  if (/schedule|day|match|battle|fight|time/.test(m))   return KB.schedule;
  if (/warrior|knight|player|sir|who/.test(m))          return KB.warriors;
  if (/leaderboard|rank|score|top|best/.test(m))        return KB.leaderboard;
  if (/contact|message|messenger|email|reach/.test(m))  return KB.contact;
  if (/prize|reward|win|trophy|crown|gold/.test(m))     return KB.prize;
  if (/rule|regulation|how.*work|allowed/.test(m))      return KB.rules;
  if (/location|where|map|place|address/.test(m))       return KB.location;
  return "I'm afraid I don't have that knowledge, noble visitor. Try asking about the schedule, warriors, prizes, rules, or location!";
}

// ── INJECT STYLES ────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  #chatbot-bubble {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    width: 52px; height: 52px; background: #5c0000;
    border: 2px solid gold; border-radius: 50%;
    cursor: pointer; font-size: 24px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 18px rgba(255,215,0,0.4);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  #chatbot-bubble:hover {
    transform: scale(1.1);
    box-shadow: 0 0 28px rgba(255,215,0,0.7);
  }
  #chatbot-window {
    position: fixed; bottom: 90px; right: 24px; z-index: 9999;
    width: 320px; background: #0f0f0f;
    border: 2px solid gold; border-radius: 8px;
    font-family: Georgia, serif; color: #f5e6c8;
    display: none; flex-direction: column;
    box-shadow: 0 0 30px rgba(255,215,0,0.3);
    overflow: hidden;
  }
  #chatbot-window.open { display: flex; }
  #chatbot-header {
    background: linear-gradient(#1a1a1a, #000);
    border-bottom: 2px solid gold;
    padding: 12px 16px;
    display: flex; align-items: center; justify-content: space-between;
  }
  #chatbot-header span { color: gold; font-size: 15px; letter-spacing: 1px; }
  #chatbot-close {
    color: gold; cursor: pointer; font-size: 18px;
    background: none; border: none; padding: 0; line-height: 1;
  }
  #chatbot-messages {
    flex: 1; overflow-y: auto; padding: 14px;
    max-height: 300px; display: flex; flex-direction: column; gap: 10px;
  }
  .chat-msg {
    max-width: 85%; padding: 9px 12px;
    border-radius: 8px; font-size: 13px; line-height: 1.5;
    animation: fadeUp 0.2s ease;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .chat-msg.bot {
    background: #1a1a1a; border: 1px solid gold; color: #f5e6c8;
    align-self: flex-start;
  }
  .chat-msg.user {
    background: #5c0000; border: 1px solid gold; color: #f5e6c8;
    align-self: flex-end;
  }
  .chat-typing { color: gold; font-size: 12px; padding: 4px 14px; min-height: 18px; }
  #chatbot-input-row {
    display: flex; border-top: 2px solid gold;
  }
  #chatbot-input {
    flex: 1; padding: 10px 12px;
    background: #0f0f0f; border: none; outline: none;
    color: #f5e6c8; font-family: Georgia, serif; font-size: 13px;
  }
  #chatbot-send {
    padding: 10px 16px;
    background: #5c0000; border: none; border-left: 1px solid gold;
    color: gold; cursor: pointer; font-size: 16px;
  }
  #chatbot-send:hover { background: gold; color: #000; }
`;
document.head.appendChild(style);

// ── INJECT HTML ──────────────────────────────────────────────
const html = `
  <div id="chatbot-bubble" title="Chat with Sir Chatsworth">⚔</div>
  <div id="chatbot-window">
    <div id="chatbot-header">
      <span>⚔ ${BOT_NAME}</span>
      <button id="chatbot-close" title="Close">✕</button>
    </div>
    <div id="chatbot-messages"></div>
    <div class="chat-typing" id="chatbot-typing"></div>
    <div id="chatbot-input-row">
      <input id="chatbot-input" type="text" placeholder="Ask a question..." maxlength="200">
      <button id="chatbot-send">➤</button>
    </div>
  </div>
`;
const wrapper = document.createElement("div");
wrapper.innerHTML = html;
document.body.appendChild(wrapper);

// ── LOGIC ────────────────────────────────────────────────────
const bubble   = document.getElementById("chatbot-bubble");
const win      = document.getElementById("chatbot-window");
const closeBtn = document.getElementById("chatbot-close");
const messages = document.getElementById("chatbot-messages");
const input    = document.getElementById("chatbot-input");
const sendBtn  = document.getElementById("chatbot-send");
const typing   = document.getElementById("chatbot-typing");

bubble.addEventListener("click", () => {
  win.classList.toggle("open");
  if (win.classList.contains("open") && messages.children.length === 0) {
    addMessage("bot", "Hail, brave visitor! I am Sir Chatsworth. Ask me about the schedule, warriors, prizes, rules, or location!");
  }
});
closeBtn.addEventListener("click", () => win.classList.remove("open"));

sendBtn.addEventListener("click", send);
input.addEventListener("keydown", e => { if (e.key === "Enter") send(); });

function send() {
  const text = input.value.trim();
  if (!text) return;
  addMessage("user", text);
  input.value = "";
  typing.textContent = "Sir Chatsworth is thinking...";
  setTimeout(() => {
    typing.textContent = "";
    addMessage("bot", getReply(text));
  }, 700);
}

function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = "chat-msg " + role;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// ── THEME TOGGLE LOGIC ────────────────────────────────────────
window.ktToggleTheme = function() {
  const currentTheme = localStorage.getItem('kt_theme');
  let newTheme = 'light';
  if (currentTheme === 'light') {
    newTheme = 'dark';
  }
  
  localStorage.setItem('kt_theme', newTheme);
  applyGlobalTheme(newTheme);
  updateBtn(newTheme === 'light');
};

function applyGlobalTheme(theme) {
  // Clear all theme classes
  document.body.classList.remove('light-mode', 'forest-mode', 'gold-theme-mode');
  document.documentElement.style.cssText = '';

  if (theme === 'light') {
    document.body.classList.add('light-mode');
    document.documentElement.style.cssText = 'background:#f5ead8';
  } else if (theme === 'forest') {
    document.body.classList.add('forest-mode');
    document.documentElement.style.cssText = 'background:#051405';
  } else if (theme === 'gold-theme') {
    document.body.classList.add('gold-theme-mode');
    document.documentElement.style.cssText = 'background:#1a1405';
  }
}

function updateBtn(isLight) {
  const btn = document.getElementById('ktThemeBtn');
  if (!btn) return;
  const icon = btn.querySelector('.t-icon');
  const label = btn.querySelector('.t-label');
  if (isLight) {
    if (icon) icon.textContent = '☀️';
    if (label) label.textContent = 'DARK MODE';
  } else {
    if (icon) icon.textContent = '🌙';
    if (label) label.textContent = 'LIGHT MODE';
  }
}

// ── DYNAMIC AUTHENTICATED NAVIGATION ──────────────────────────
function renderNavigation() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const token = localStorage.getItem('kt_token');
  const userStr = localStorage.getItem('kt_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const theme = localStorage.getItem('kt_theme') || 'dark';

  let html = `
    <a href="index.html">Home</a>
    <a href="tournament.html">Tournament</a>
    <a href="players.html">Warriors</a>
    <a href="Leaderboard.html">Leaderboard</a>
    <a href="contact.html">Messenger</a>
  `;

  if (token && user) {
    html += `<a href="profile.html">Profile</a>`;
    if (user.role === 'admin') {
      html += `<a href="admin.html">Admin</a>`;
    }
    html += `<a href="#" onclick="logoutEvent(event)" style="color:#ff5555; font-weight:bold;">Logout</a>`;
  } else {
    html += `
      <a href="signin.html">Sign In</a>
      <a href="signup.html">Sign Up</a>
    `;
  }

  const icon = theme === 'light' ? '☀️' : '🌙';
  const label = theme === 'light' ? 'DARK MODE' : 'LIGHT MODE';
  html += `
    <button class="theme-toggle-btn" id="ktThemeBtn" onclick="ktToggleTheme()" type="button">
      <span class="t-icon">${icon}</span> <span class="t-label">${label}</span>
    </button>
  `;

  nav.innerHTML = html;
}

window.logoutEvent = function(e) {
  e.preventDefault();
  localStorage.removeItem('kt_token');
  localStorage.removeItem('kt_user');
  localStorage.removeItem('kt_theme');
  alert('Dispatched from the guild halls. Farewell, brave traveler!');
  window.location.href = 'index.html';
};

// Sync navigation and themes on page load
const initialTheme = localStorage.getItem('kt_theme') || 'dark';
applyGlobalTheme(initialTheme);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    renderNavigation();
    updateBtn(initialTheme === 'light');
  });
} else {
  renderNavigation();
  updateBtn(initialTheme === 'light');
}

})();
