const checkbox           = document.getElementById("autoMuteToggle");
const muteInput          = document.getElementById("muteDelay");
const inactivityInput    = document.getElementById("inactivityTimeout");
const saveBtn            = document.getElementById("saveSettings");
const logList            = document.getElementById("logList");

// Defaults & limits
const defaults = {
  muteDelay:         8,
  inactivityTimeout: 24
};
const limits = {
  muteDelay:         { min: 2,  max: 15 },
  inactivityTimeout: { min: 8,  max: 34 }
};

function clamp(val, {min, max}) {
  return Math.min(max, Math.max(min, val));
}

// Restore everything on load
function restore() {
  // 1) get autoMuteEnabled
  chrome.runtime.sendMessage({ type: "getAutoMute" }, res => {
    checkbox.checked = res.value;
  });

  // 2) get timing settings
  chrome.storage.sync.get(defaults, items => {
    muteInput.value       = clamp(items.muteDelay, limits.muteDelay);
    inactivityInput.value = clamp(items.inactivityTimeout, limits.inactivityTimeout);
  });

  // 3) load logs
  chrome.runtime.sendMessage({ type: "getLogs" }, res => {
    const logs = res.logs || [];
    logList.innerHTML = "";
    logs.forEach(log => {
      const li = document.createElement("li");
      li.textContent = log;
      logList.appendChild(li);
    });
  });
}

// Toggle auto‑mute
checkbox.addEventListener("change", () => {
  chrome.runtime.sendMessage({
    type:  "setAutoMute",
    value: checkbox.checked
  });
});

// Save new delay settings
saveBtn.addEventListener("click", () => {
  const md = clamp(parseInt(muteInput.value, 10), limits.muteDelay);
  const it = clamp(parseInt(inactivityInput.value, 10), limits.inactivityTimeout);

  chrome.storage.sync.set({ muteDelay: md, inactivityTimeout: it }, () => {
    saveBtn.textContent = "Saved!";
    saveBtn.disabled = true;
    setTimeout(() => {
      saveBtn.textContent = "Save Settings";
      saveBtn.disabled = false;
    }, 1200);
  });
});

// on‑load
document.addEventListener("DOMContentLoaded", restore);
