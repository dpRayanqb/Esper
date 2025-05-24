const startRecording = async () => {
  // Get current tab to focus back after recording
  const [currentTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  // Ensure content script is ready before sending message
  try {
    // Send message to content script to prepare for recording
    await chrome.tabs.sendMessage(currentTab.id, { 
      name: 'startRecording'
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
  } catch (error) {
    // If content script is not ready, inject it and retry
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['content.js']
    });

    // Retry sending the message
    await chrome.tabs.sendMessage(currentTab.id, { 
      name: 'startRecording'
    });
  }
};

// Listen for startRecording message from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.name === 'startRecording') {
    startRecording();
  }
});