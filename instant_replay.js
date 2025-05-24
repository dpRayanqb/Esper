document.addEventListener("DOMContentLoaded", function () {
  const video = document.getElementById("replay-video");
  const playButton = document.getElementById("playButton");
  const metaUrl = document.getElementById("metaUrl");
  const metaTime = document.getElementById("metaTime");
  const metaSize = document.getElementById("metaSize");
  const errorMarkers = new Set(); // Store error timestamps

  // Load latest screen recording and logs
  function loadLatestRecording() {
    chrome.storage.local.get(["latestRecording", "capturedLogs", "capturedNetwork"], (result) => {
      const { latestRecording, capturedLogs, capturedNetwork } = result;
      
      if (!latestRecording) {
        console.log("No recent recording found.");
        return;
      }

      // Set video src
      video.src = latestRecording;
      video.load();

      // Display captured logs
      if (capturedLogs) {
        capturedLogs.forEach(log => {
          logToConsoleTab(log.message, log.type);
          if (log.type === 'error') {
            errorMarkers.add(log.timestamp / 1000); // Convert to seconds
          }
        });
      }

      // Display captured network requests
      if (capturedNetwork) {
        capturedNetwork.forEach(request => {
          logNetworkActivity(
            request.method,
            request.url,
            request.status,
            request.duration,
            request.timestamp / 1000 // Convert to seconds
          );
          if (request.status >= 400) {
            errorMarkers.add(request.timestamp / 1000);
          }
        });
      }

      updateVideoMarkers();
    });

    async function testInternetSpeed() {
      return new Promise((resolve) => {
        const image = new Image();
        const imageSizeBytes = 500000;
        const startTime = performance.now();

        image.onload = () => {
          const endTime = performance.now();
          const durationSeconds = (endTime - startTime) / 1000;
          const bitsLoaded = imageSizeBytes * 8;
          const speedMbps = (bitsLoaded / durationSeconds / 1024 / 1024).toFixed(2);
          resolve(`${speedMbps} Mbps`);
        };

        image.onerror = () => resolve("Unable to test");
        image.src = `https://picsum.photos/200/300?t=${Date.now()}`;
      });
    }

    testInternetSpeed().then(speed => {
      document.getElementById("metaSpeed").textContent = speed;
    });
  }

  playButton.addEventListener("click", () => {
    playButton.style.display = "none";
    video.style.display = "block";
    video.play();
  });

  function setMetadata() {
    metaUrl.textContent = window.location.href;
    metaTime.textContent = new Date().toLocaleString();
    metaSize.textContent = `${window.innerWidth}x${window.innerHeight}`;
  }

  // Add error marker to video timeline
  function addErrorMarker(timestamp) {
    errorMarkers.add(timestamp);
    updateVideoMarkers();
  }

  // Update video timeline markers
  function updateVideoMarkers() {
    const timeline = document.createElement('div');
    timeline.className = 'video-timeline';
    timeline.style.position = 'relative';
    timeline.style.height = '20px';
    timeline.style.backgroundColor = '#f0f0f0';
    timeline.style.marginTop = '10px';
    timeline.style.borderRadius = '4px';
    timeline.style.overflow = 'hidden';

    errorMarkers.forEach(timestamp => {
      const marker = document.createElement('div');
      marker.className = 'error-marker';
      marker.style.position = 'absolute';
      marker.style.left = `${(timestamp / video.duration) * 100}%`;
      marker.style.top = '0';
      marker.style.width = '4px';
      marker.style.height = '100%';
      marker.style.backgroundColor = 'red';
      marker.style.cursor = 'pointer';
      
      marker.title = `Error at ${new Date(timestamp * 1000).toISOString().substr(11, 8)}`;
      
      marker.addEventListener('click', () => {
        video.currentTime = timestamp;
      });
      
      timeline.appendChild(marker);
    });

    const existingTimeline = document.querySelector('.video-timeline');
    if (existingTimeline) {
      existingTimeline.replaceWith(timeline);
    } else {
      video.parentElement.appendChild(timeline);
    }
  }

  // Network logging with timestamps
  function logNetworkActivity(method, url, status, duration) {
    const logContainer = document.getElementById("network-logs");
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry ${status >= 400 ? 'error' : ''}`;
    
    const timestamp = new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3 
    });
    
    logEntry.innerHTML = `
      <div class="log-header">
        <span class="log-timestamp">${timestamp}</span>
        <span class="log-type ${status >= 400 ? 'text-danger' : ''}">${method}</span>
      </div>
      <div class="log-message">
        ${url} [${status}] - ${duration}ms
      </div>
    `;

    if (status >= 400) {
      addErrorMarker(video.currentTime);
    }

    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // Console logging with timestamps
  function logToConsoleTab(message, type = "log") {
    const logContainer = document.getElementById("console-logs");
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3 
    });
    
    let displayMessage = message;
    if (typeof message === 'object') {
      try {
        displayMessage = JSON.stringify(message, null, 2);
      } catch (e) {
        displayMessage = message.toString();
      }
    }

    logEntry.innerHTML = `
      <div class="log-header">
        <span class="log-timestamp">${timestamp}</span>
        <span class="log-type ${type === 'error' ? 'text-danger' : ''}">${type}</span>
      </div>
      <div class="log-message">${displayMessage}</div>
    `;

    if (type === 'error') {
      addErrorMarker(video.currentTime);
    }

    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // Override console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  console.log = function(...args) {
    originalConsole.log.apply(console, args);
    logToConsoleTab(args.join(' '), 'log');
  };

  console.error = function(...args) {
    originalConsole.error.apply(console, args);
    logToConsoleTab(args.join(' '), 'error');
  };

  console.warn = function(...args) {
    originalConsole.warn.apply(console, args);
    logToConsoleTab(args.join(' '), 'warn');
  };

  console.info = function(...args) {
    originalConsole.info.apply(console, args);
    logToConsoleTab(args.join(' '), 'info');
  };

  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const startTime = performance.now();
    try {
      const response = await originalFetch.apply(this, args);
      const duration = (performance.now() - startTime).toFixed(2);
      logNetworkActivity(
        args[1]?.method || 'GET',
        args[0],
        response.status,
        duration
      );
      return response;
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2);
      logNetworkActivity(
        args[1]?.method || 'GET',
        args[0],
        'ERROR',
        duration
      );
      throw error;
    }
  };

  // Intercept XHR requests
  const XHR = XMLHttpRequest.prototype;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;

  XHR.open = function(method, url) {
    this._method = method;
    this._url = url;
    this._startTime = performance.now();
    return originalOpen.apply(this, arguments);
  };

  XHR.send = function() {
    this.addEventListener('loadend', () => {
      const duration = (performance.now() - this._startTime).toFixed(2);
      logNetworkActivity(
        this._method,
        this._url,
        this.status || 'ERROR',
        duration
      );
    });
    return originalSend.apply(this, arguments);
  };

  // Initialize
  loadLatestRecording();
  setMetadata();

  // Tab switching logic
  document.querySelectorAll("#sideTabs .nav-link").forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelectorAll("#sideTabs .nav-link").forEach(l => l.classList.remove("active"));
      this.classList.add("active");

      document.querySelectorAll("#tabContents .tab-pane").forEach(pane => {
        pane.classList.remove("active");
        pane.style.display = "none";
      });

      const selectedTab = this.getAttribute("data-tab");
      const selectedTabContent = document.getElementById(selectedTab);
      selectedTabContent.classList.add("active");
      selectedTabContent.style.display = "block";
    });
  });

  // Test logging
  console.log("Instant replay viewer initialized");
  console.info("System information loaded");
});