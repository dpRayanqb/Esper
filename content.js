// Store for captured logs and network requests
let capturedLogs = [];
let capturedNetwork = [];
let recordingStartTime;

// Intercept console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

// Override console methods
console.log = function(...args) {
  const timestamp = Date.now() - recordingStartTime;
  capturedLogs.push({ type: 'log', message: args.join(' '), timestamp });
  originalConsole.log.apply(console, args);
};

console.error = function(...args) {
  const timestamp = Date.now() - recordingStartTime;
  capturedLogs.push({ type: 'error', message: args.join(' '), timestamp });
  originalConsole.error.apply(console, args);
};

console.warn = function(...args) {
  const timestamp = Date.now() - recordingStartTime;
  capturedLogs.push({ type: 'warn', message: args.join(' '), timestamp });
  originalConsole.warn.apply(console, args);
};

console.info = function(...args) {
  const timestamp = Date.now() - recordingStartTime;
  capturedLogs.push({ type: 'info', message: args.join(' '), timestamp });
  originalConsole.info.apply(console, args);
};

// Intercept fetch requests
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const startTime = Date.now();
  const timestamp = startTime - recordingStartTime;
  
  try {
    const response = await originalFetch.apply(this, args);
    const duration = Date.now() - startTime;
    
    capturedNetwork.push({
      method: args[1]?.method || 'GET',
      url: args[0],
      status: response.status,
      duration,
      timestamp
    });
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    capturedNetwork.push({
      method: args[1]?.method || 'GET',
      url: args[0],
      status: 'ERROR',
      duration,
      timestamp
    });
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
  this._startTime = Date.now();
  return originalOpen.apply(this, arguments);
};

XHR.send = function() {
  this.addEventListener('loadend', () => {
    const duration = Date.now() - this._startTime;
    const timestamp = this._startTime - recordingStartTime;
    
    capturedNetwork.push({
      method: this._method,
      url: this._url,
      status: this.status || 'ERROR',
      duration,
      timestamp
    });
  });
  return originalSend.apply(this, arguments);
};

// Listen for recording start
chrome.runtime.onMessage.addListener((request) => {
  if (request.name === 'startRecording') {
    recordingStartTime = Date.now();
    capturedLogs = [];
    capturedNetwork = [];
  }
});

// Listen for recording end
chrome.runtime.onMessage.addListener((request) => {
  if (request.name === 'endedRecording') {
    // Store the captured logs and network requests
    chrome.storage.local.set({
      capturedLogs,
      capturedNetwork
    });

    // Create a new video element and show it in an overlay div
    const video = document.createElement('video');
    video.src = request.body.base64;
    video.controls = true;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.maxWidth = '600px';
    video.style.maxHeight = '600px';

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backdropFilter = 'blur(5px)';
    overlay.style.zIndex = 999999;

    overlay.appendChild(video);
    document.body.appendChild(overlay);
  }
});