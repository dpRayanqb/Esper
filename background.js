const startRecording = async () => {
  // Get current tab to focus back after recording
  const [currentTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

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
      
      // Start recording after tab is ready
      chrome.tabs.sendMessage(tabId, {
        name: 'startRecordingOnBackground',
        body: {
          currentTab: currentTab
        }
      });
    }
  });
};

// Listen for startRecording message from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.name === 'startRecording') {
    startRecording();
  }
});