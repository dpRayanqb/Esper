let instantReplayEnabled = true; // Default: enabled

// Function to open instant_replay.html if enabled
function openInstantReplayIfAllowed() {
  if (instantReplayEnabled) {
    chrome.tabs.create({ url: chrome.runtime.getURL("instant_replay.html") });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startRecordingButton');
  const instantReplayBtn = document.getElementById('instantReplayButton');
  const countdownDisplay = document.getElementById('countdownDisplay');
  const adminLink = document.getElementById("adminLink");
  const screenshotButton = document.getElementById("screenshotButton");

  // ✅ Start Recording Button with Countdown
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
          countdownDisplay.textContent = '';
          startBtn.disabled = false;

          // 🚀 Start recording after countdown
          chrome.runtime.sendMessage({ name: 'startRecording' });
        }
      }, 1000);
    });
  }

  // Instant Replay Button — opens page instantly
  if (instantReplayBtn) {
    instantReplayBtn.addEventListener('click', () => {
      countdownDisplay.textContent = ''; // Clear previous text
      openInstantReplayIfAllowed(); // Open replay immediately
    });
  }

  // Admin Link
  if (adminLink) {
    adminLink.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("admin.html") });
    });
  }

  // Screenshot Button
  if (screenshotButton) {
    screenshotButton.addEventListener("click", () => {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, function (dataUrl) {
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
