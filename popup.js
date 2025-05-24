document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startRecordingButton');
  const instantReplayBtn = document.getElementById('instantReplayButton');
  const countdownDisplay = document.getElementById('countdownDisplay');
  const adminLink = document.getElementById("adminLink");
  const screenshotButton = document.getElementById("screenshotButton");

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      let count = 3;
      startBtn.disabled = true;

      const interval = setInterval(() => {
        if (count > 0) {
          countdownDisplay.textContent = `Recording starts in ${count}...`;
          count--;
        } else {
          clearInterval(interval);
          countdownDisplay.textContent = 'Recording...';
          startBtn.disabled = false;
          chrome.runtime.sendMessage({ name: 'startRecording' });
        }
      }, 1000);
    });
  }

  if (instantReplayBtn) {
    instantReplayBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("instant_replay.html") });
    });
  }

  if (adminLink) {
    adminLink.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("admin.html") });
    });
  }

  if (screenshotButton) {
    screenshotButton.addEventListener("click", () => {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, function(dataUrl) {
        if (chrome.runtime.lastError) {
          alert("Screenshot failed: " + chrome.runtime.lastError.message);
          return;
        }
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "screenshot.png";
        a.click();
      });
    });
  }
});