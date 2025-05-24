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

let mediaRecorder = null;
let recordingStream = null;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.name !== 'startRecordingOnBackground') {
    return;
  }

  try {
    // Request display media directly without using desktopCapture API
    recordingStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor',
        logicalSurface: true,
        cursor: 'always'
      },
      audio: false
    });

    // Create and configure MediaRecorder
    mediaRecorder = new MediaRecorder(recordingStream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });

    const chunks = [];
    const logs = {
      network: [],
      console: [],
      actions: []
    };

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      try {
        const blobFile = new Blob(chunks, { type: 'video/webm' });
        const base64 = await fetchBlob(URL.createObjectURL(blobFile));

        // Save recording data and logs
        await chrome.storage.local.set({
          latestRecording: base64,
          recordingLogs: logs,
          recordingTimestamp: new Date().toISOString()
        });

        // Open instant replay in new tab
        await chrome.tabs.create({
          url: chrome.runtime.getURL('instant_replay.html')
        });

        // Cleanup
        if (recordingStream) {
          recordingStream.getTracks().forEach(track => track.stop());
        }
        window.close();
      } catch (error) {
        console.error('Error in onstop handler:', error);
      }
    };

    // Start recording
    mediaRecorder.start(1000); // Capture chunks every second

    // Monitor console logs
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

  } catch (error) {
    console.error('Error starting recording:', error);
  }
});

// Cleanup on window unload
window.addEventListener('unload', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recordingStream) {
    recordingStream.getTracks().forEach(track => track.stop());
  }
});