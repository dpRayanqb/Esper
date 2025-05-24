document.addEventListener("DOMContentLoaded", function () {
  const video = document.getElementById("replay-video");
  const playButton = document.getElementById("playButton");
  const metaUrl = document.getElementById("metaUrl");
  const metaTime = document.getElementById("metaTime");
  const metaSize = document.getElementById("metaSize");

  // Load latest screen recording
  function loadLatestRecording() {
    chrome.storage.local.get("latestRecording", (result) => {
      const base64Video = result.latestRecording;
      if (!base64Video) {
        console.log("No recent recording found.");
        return;
      }

      // Set video src
      video.src = base64Video;
      video.load();
    });

    async function getSystemInfo() {
      const testInternetSpeed = () => {
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
      };

      const internetSpeed = await testInternetSpeed();
      document.getElementById("metaSpeed").textContent = internetSpeed;
    }

    getSystemInfo();
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

  // Network logging
  function logNetworkActivity(method, url, status, duration) {
    const logContainer = document.getElementById("network-logs");
    const logEntry = document.createElement("div");
    logEntry.className = "log-entry";
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    logEntry.innerHTML = `
      <span class="log-timestamp">${timestamp}</span>
      <span class="log-type">:</span>
      <span class="log-message">${method} ${url} [${status}] - ${duration}ms</span>
    `;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // Console logging
  function logToConsoleTab(message, type = "log") {
    const logContainer = document.getElementById("console-logs");
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    let displayMessage = message;
    if (typeof message === 'object') {
      try {
        displayMessage = JSON.stringify(message, null, 2);
      } catch (e) {
        displayMessage = message.toString();
      }
    }

    logEntry.innerHTML = `
      <span class="log-timestamp">${timestamp}</span>
      <span class="log-type">:</span>
      <span class="log-message">${displayMessage}</span>
    `;
    
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
        this.status,
        duration
      );
    });
    return originalSend.apply(this, arguments);
  };

  // Test logging
  console.log("Instant replay viewer initialized");
  console.info("System information loaded");
});