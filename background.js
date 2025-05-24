const startRecording = async () => {
  // Create recording screen tab
  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL('recording_screen.html'),
    pinned: true,
    active: true,
  });

  // Wait for recording screen tab to be loaded
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === tab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      
      // Start recording after 3 seconds
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          name: 'startRecordingOnBackground'
        });
      }, 3000);
    }
  });
};

// Listen for startRecording message from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.name === 'startRecording') {
    startRecording();
  }
});