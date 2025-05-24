document.addEventListener("DOMContentLoaded", function () {
  const video = document.getElementById("replay-video");
  const playButton = document.getElementById("playButton");
  const videoTime = document.getElementById("videoTime");
  const metaUrl = document.getElementById("metaUrl");
  const metaTime = document.getElementById("metaTime");
  const metaSize = document.getElementById("metaSize");

  // Load latest screen recording
  function loadLatestRecording() {
    
    chrome.storage.local.get("latestRecording", (result) => {
  const base64Video = result.latestRecording;
  if (!base64Video) {
    videoTime.innerText = "No recent recording found.";
    return;
  }

  // Set video src
  video.src = base64Video;
  video.load();

 
});


    async function getSystemInfo() {
       const x = document.getElementById("demo");

    const fetchLocation = () => {
      return new Promise((resolve) => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude.toFixed(4);
              const lon = position.coords.longitude.toFixed(4);
              resolve(`Latitude: ${lat}<br>Longitude: ${lon}`);
            },
            (error) => {
              console.warn("Geolocation error:", error.message);
              resolve("Permission denied or unavailable");
            }
          );
        } else {
          resolve("Geolocation is not supported by this browser.");
        }
      });
    };



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

          image.src = `https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg?t=${Date.now()}`;
        });
      };

      const location = await fetchLocation();
      const internetSpeed = await testInternetSpeed();

      document.getElementById("metaUrl").textContent = window.location.href;
      document.getElementById("metaTime").textContent = new Date().toLocaleString();
      document.getElementById("metaOS").textContent = navigator.platform;
      document.getElementById("metaBrowser").textContent = `${navigator.userAgent}`;
      document.getElementById("metaSize").textContent = `${window.innerWidth}x${window.innerHeight}`;
      document.getElementById("metaLocation").textContent = location;
      document.getElementById("metaSpeed").textContent = internetSpeed;
    }

    document.addEventListener("DOMContentLoaded", getSystemInfo);
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

      if (selectedTab === "network") {
        fetchNetworkLogs();
      }
    });
  });

  function fetchNetworkLogs() {
    fetch()
      .then(response => response.json())
      .then(logs => {
        networkLogsContainer.innerHTML = '';
        logs.forEach(log => {
          const logEntry = document.createElement("div");
          logEntry.className = "log-entry";
          const timestamp = new Date(log.timestamp).toLocaleTimeString();
          logEntry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span class="log-type">:</span>
            <span class="log-message">${log.message}</span>
          `;
          networkLogsContainer.appendChild(logEntry);
        });
      })
      .catch(error => {
        console.error("Failed to fetch network logs:", error);
      });
  }

  function logNetworkActivity(message) {
    const logContainer = document.getElementById("network-logs");
    const logEntry = document.createElement("div");
    logEntry.className = "log-entry";
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    logEntry.innerHTML = `
      <span class="log-timestamp">${timestamp}</span>
      <span class="log-type">:</span>
      <span class="log-message">${message}</span>
    `;
    logContainer.appendChild(logEntry);
  }

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const startTime = performance.now();
    try {
      const response = await originalFetch.apply(this, args);
      const duration = (performance.now() - startTime).toFixed(2);
      logNetworkActivity(`${args[0]} [${response.status}] - ${duration}ms`);
      return response;
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2);
      logNetworkActivity(`${args[0]} [FETCH ERROR] - ${duration}ms`);
      throw error;
    }
  };

  (function () {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this._method = method;
      this._url = url;
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      const startTime = performance.now();
      this.addEventListener("loadend", () => {
        const duration = (performance.now() - startTime).toFixed(2);
        logNetworkActivity(`${this._method} ${this._url} [${this.status}] - ${duration}ms`);
      });
      return originalSend.apply(this, arguments);
    };
  })();

  function logToConsoleTab(message, type = "log") {
    const logContainer = document.getElementById("console-logs");
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const words = message.split(/\s+/);
    const preview = words.slice(0, 5).join(" ") + (words.length > 5 ? "..." : "");
    const fullMessage = message.replace(/\n/g, "<br>");
    logEntry.innerHTML = `
      <span class="log-timestamp">${timestamp}</span>
      <span class="log-type">:</span>
      <span class="log-message">${preview}</span>
      <div class="log-details">${fullMessage}</div>
    `;
    logEntry.addEventListener("click", () => {
      logEntry.classList.toggle("expanded");
    });
    logContainer.appendChild(logEntry);
  }

  const originalConsoleError = console.error;
  console.error = function (...args) {
    originalConsoleError.apply(console, args);
    logToConsoleTab(args.join(" "), "error");
  };

  window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorMsg = `${msg} at ${url}:${lineNo}:${columnNo}`;
    logToConsoleTab(errorMsg, "error");
  };


  document.addEventListener("visibilitychange", function () {
    const isVisible = document.visibilityState === "visible";
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentURL = window.location.href;
    const actionText = isVisible ? "Tab became visible:" : "Tab became hidden:";
    const dotClass = isVisible ? "visible" : "hidden";

    const logHTML = `
      <div class="log-entry">
        <span class="time">${time}</span>
        <span class="dot ${dotClass}">:</span>
        <span class="text-action">${actionText} 
          <a href="${currentURL}" target="_blank">${currentURL}</a>
        </span>
      </div>
    `;

    const logContainer = document.getElementById("actionLogs");
    if (logContainer) {
      logContainer.insertAdjacentHTML("beforeend", logHTML);
    }
  });
  const aiDebugTab = document.getElementById("ai-debug");
  if (aiDebugTab) {
    aiDebugTab.innerHTML = "";

    const aiMessages = document.createElement("div");
    aiMessages.id = "ai-messages";
    aiMessages.style.maxHeight = "400px";
    aiMessages.style.overflowY = "auto";
    aiMessages.style.marginBottom = "10px";

    const inputContainer = document.createElement("div");
    inputContainer.style.display = "flex";
    inputContainer.style.marginTop = "10px";

    const aiInput = document.createElement("input");
    aiInput.type = "text";
    aiInput.id = "aiInput";
    aiInput.placeholder = "Ask anything or paste some code to fix...";
    aiInput.style.flex = "1";
    aiInput.style.padding = "8px";

    const aiSendBtn = document.createElement("button");
    aiSendBtn.id = "aiSendBtn";
    aiSendBtn.textContent = "➤";
    aiSendBtn.style.padding = "8px";

    inputContainer.appendChild(aiInput);
    inputContainer.appendChild(aiSendBtn);
    aiDebugTab.appendChild(aiMessages);
    aiDebugTab.appendChild(inputContainer);

    const apiKey = "YOUR-OPENAI-API-KEY"; 

    function appendAIMessage(text, sender) {
      const messageDiv = document.createElement("div");
      messageDiv.className = sender;
      messageDiv.style.marginBottom = "10px";
      messageDiv.style.textAlign = sender === "user" ? "right" : "left";
      messageDiv.innerHTML = `
        <div style="display: inline-block; background: ${sender === "user" ? "#cce5ff" : "#e2d5f5"}; padding: 8px 12px; border-radius: 12px; max-width: 80%;">
          ${text.replace(/\n/g, "<br>")}
        </div>
      `;
      aiMessages.appendChild(messageDiv);
      aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    async function sendAIMessage() {
      const userText = aiInput.value.trim();
      if (!userText) return;

      appendAIMessage(userText, "user");
      aiInput.value = "";

      appendAIMessage("Typing...", "bot");

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userText }]
          })
        });

        const data = await response.json();
        const aiText = data.choices[0].message.content.trim();

        aiMessages.lastChild.remove();
        appendAIMessage(aiText, "bot");

      } catch (error) {
        console.error(error);
        aiMessages.lastChild.remove();
        appendAIMessage("Error contacting AI server.", "bot");
      }
    }

    aiSendBtn.addEventListener("click", sendAIMessage);
    aiInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        sendAIMessage();
      }
    });
  }
  
});
