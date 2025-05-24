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

  navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: 'always',
      displaySurface: 'monitor'
    },
    audio: false,
    systemAudio: 'include'
  }).then(stream => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus',
      videoBitsPerSecond: 2500000 // 2.5 Mbps
    });
    
    const chunks = [];

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = async function(e) {
      const blobFile = new Blob(chunks, { type: 'video/webm' });
      const base64 = await fetchBlob(URL.createObjectURL(blobFile));

      // Save the base64 video to local storage
      chrome.storage.local.set({ latestRecording: base64 });

      // Create instant replay tab
      chrome.tabs.create({ 
        url: chrome.runtime.getURL('instant_replay.html')
      });

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
      
      // Close recording tab
      window.close();
    };

    mediaRecorder.start(1000); // Capture chunks every second

    // Switch back to original tab
    chrome.tabs.update(message.body.currentTab.id, { 
      active: true, 
      selected: true 
    });
  }).catch(error => {
    console.error('Error accessing media devices:', error);
  });
});