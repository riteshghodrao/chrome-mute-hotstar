let lastVastSeenTime  = null;
let vastActive        = false;
let muteTriggered     = false;
let autoMuteEnabled   = true;

// config keys, defaults & limits
const CONFIG = {
  defaults: {
    muteDelay:         8000,   // 8s
    inactivityTimeout: 24000   // 24s
  },
  limits: {
    muteDelay:         { min: 2000,  max: 15000 },
    inactivityTimeout: { min: 8000,  max: 60000 }
  }
};

let muteDelay, inactivityTimeout;

// clamp utility
function clamp(val, {min, max}) {
  return Math.min(max, Math.max(min, val));
}

// load & validate settings
function loadSettings() {
  chrome.storage.sync.get(CONFIG.defaults, items => {
    muteDelay         = clamp(items.muteDelay,         CONFIG.limits.muteDelay);
    inactivityTimeout = clamp(items.inactivityTimeout, CONFIG.limits.inactivityTimeout);
    console.log('🔧 Settings:', { muteDelay, inactivityTimeout });
  });
}

// update in‑memory when user changes options
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.muteDelay) {
    muteDelay = clamp(changes.muteDelay.newValue, CONFIG.limits.muteDelay);
  }
  if (changes.inactivityTimeout) {
    inactivityTimeout = clamp(changes.inactivityTimeout.newValue, CONFIG.limits.inactivityTimeout);
  }
});

// initial load
loadSettings();

function notifyContentScript(tabId, message) {
  chrome.tabs.sendMessage(tabId, message);
}

// listen for toggles & logs (unchanged)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "setAutoMute")   autoMuteEnabled = msg.value;
  if (msg.type === "getAutoMute")   return sendResponse({ value: autoMuteEnabled });
  if (msg.type === "logAction") {
    chrome.storage.local.get(["logs"], ({logs=[]}) => {
      logs.unshift(`${msg.timestamp} - ${msg.action}`);
      chrome.storage.local.set({ logs: logs.slice(0,10) });
    });
  }
  if (msg.type === "getLogs") {
    chrome.storage.local.get(["logs"], ({logs=[]}) => {
      sendResponse({ logs });
    });
    return true;
  }
});

// watch for VAST calls
chrome.webRequest.onCompleted.addListener(details => {
  if (!autoMuteEnabled) return;
  const urlPattern = "https://service.hotstar.com/blaze/hs-in/vast/api/v1/vast?";
  if (details.url.startsWith(urlPattern)) {
    lastVastSeenTime = Date.now();
    if (!vastActive) {
      vastActive = true;
      setTimeout(() => {
        muteTriggered = true;
        notifyContentScript(details.tabId, { action: "mute" });
      }, muteDelay);
    }
  }
}, { urls: ["<all_urls>"] });

// unmute after inactivityTimeout
setInterval(() => {
  if (!autoMuteEnabled || !vastActive || !lastVastSeenTime) return;
  if (Date.now() - lastVastSeenTime > inactivityTimeout && muteTriggered) {
    chrome.tabs.query({}, tabs => {
      for (let {id} of tabs) notifyContentScript(id, { action: "unmute" });
    });
    vastActive    = false;
    muteTriggered = false;
    lastVastSeenTime = null;
  }
}, 2000);

// ensure all tabs start unmuted
chrome.tabs.query({}, tabs => {
  for (let {id, url} of tabs) {
    if (!url.startsWith("http")) continue;
    chrome.tabs.sendMessage(id, { action: "unmute" }, () => {
      if (chrome.runtime.lastError) {
        console.warn("No content script in tab", id);
      }
    });
  }
});
