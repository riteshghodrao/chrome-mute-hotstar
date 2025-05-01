logMuteAction("Mute script loaded");

function isMuted() {
  const icon = document.querySelector(
    'button[data-testid="volume"] i[class*="volume"]'
  );
  if (!icon) return null;

  return icon.classList.contains("icon-volume-off-line");
}

function logMuteAction(action) {
  chrome.runtime.sendMessage({
    type: "logAction",
    action,
    timestamp: new Date().toLocaleTimeString(),
  });
}

function clickMuteButtonIfNeeded(mute) {
  const btn = document.querySelector('button[data-testid="volume"]');
  if (!btn) {
    console.error("🔍 Mute button not found");
    return;
  }

  const currentlyMuted = isMuted();

  if (mute && !currentlyMuted) {
    btn.click();
    logMuteAction("Muted");
  } else if (!mute && currentlyMuted) {
    btn.click();
    logMuteAction("Unmuted");
  } else {
    console.log("⚠️ No change needed");
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "mute") {
    clickMuteButtonIfNeeded(true);
  }

  if (msg.action === "unmute") {
    clickMuteButtonIfNeeded(false);
  }
});
