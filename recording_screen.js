const fetchBlob = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const base64 = await convertBlobToBase64(blob);
  return base64;
};

const convertBlobToBase64 = (blob) => {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result;
      resolve(base64data);
    };
  });
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.name !== 'startRecordingOnBackground') {
    return;
  }

  // Automatically get the primary display
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: 'screen:0', // This selects the primary display
      }
    }
  }).then(stream => {
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    // Store network and console logs
    const logs = {
      network: [],
      console: [],
      actions: []
    };

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = async function(e) {
      const blobFile = new Blob(chunks, { type: "video/webm" });
      const base64 = await fetchBlob(URL.createObjectURL(blobFile));

      // Save the recording data and logs
      chrome.storage.local.set({ 
        latestRecording: base64,
        recordingLogs: logs,
        recordingTimestamp: new Date().toISOString()
      });

      // Open the instant replay page
      chrome.tabs.create({ 
        url: chrome.runtime.getURL("instant_replay.html")
      });

      stream.getTracks().forEach(track => track.stop());
      window.close();
    };

    mediaRecorder.start();

    // Listen for console logs
    const originalConsole = { ...console };
    console = new Proxy(console, {
      get: (target, prop) => {
        if (['log', 'error', 'warn', 'info'].includes(prop)) {
          return (...args) => {
            logs.console.push({
              type: prop,
              message: args.join(' '),
              timestamp: new Date().toISOString()
            });
            originalConsole[prop](...args);
          };
        }
        return target[prop];
      }
    });

    // Monitor network requests
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const startTime = performance.now();
      try {
        const response = await originalFetch.apply(this, args);
        logs.network.push({
          url: args[0],
          status: response.status,
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString()
        });
        return response;
      } catch (error) {
        logs.network.push({
          url: args[0],
          error: error.message,
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    };
  });
});