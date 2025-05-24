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

  chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window'],
    function (streamId) {
      if (streamId == null) {
        return;
      }

      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId,
          }
        }
      }).then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const chunks = [];

        mediaRecorder.ondataavailable = function(e) {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = async function(e) {
          const blobFile = new Blob(chunks, { type: "video/webm" });
          const base64 = await fetchBlob(URL.createObjectURL(blobFile));

          // Save the base64 video to local storage
          chrome.storage.local.set({ latestRecording: base64 });

          downloadVideo(blobFile);

        
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tabWhenRecordingStopped = tabs[0];

            chrome.tabs.sendMessage(tabWhenRecordingStopped.id, {
              name: 'endedRecording',
              body: { base64 }
            });

            window.close();
          });

          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
      }).finally(async () => {
        await chrome.tabs.update(message.body.currentTab.id, { active: true, selected: true })
      });
    })
    
});

function downloadVideo(blobFile) {
  const url = URL.createObjectURL(blobFile);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'recorded-video.webm';
  a.click();
  URL.revokeObjectURL(url); 
}
