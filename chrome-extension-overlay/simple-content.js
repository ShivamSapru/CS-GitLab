// simple-content.js - Content script for subtitle display
console.log('Caption display script loaded');

let userSettings = {
  showOriginal: true,
  targetLanguage: 'hi'
};

// Create resizable and draggable caption display
function createRealCaptionDisplay() {
  const existing = document.getElementById('real-caption-display');
  if (existing) existing.remove();
  
  const container = document.createElement('div');
  container.id = 'real-caption-display';
  container.style.cssText = `
    position: fixed !important;
    bottom: 80px !important;
    left: 20px !important;
    background: rgba(0, 0, 0, 0.9) !important;
    color: white !important;
    padding: 20px !important;
    border-radius: 12px !important;
    font-size: 18px !important;
    font-family: Arial, sans-serif !important;
    max-width: 600px !important;
    min-width: 400px !important;
    z-index: 2147483647 !important;
    border: 3px solid #4CAF50 !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.8) !important;
    backdrop-filter: blur(10px) !important;
    resize: both !important;
    overflow: auto !important;
  `;
  
  container.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 15px; color: #4CAF50; display: flex; align-items: center;">
      <span style="margin-left: 8px;">Live Captions</span>
    </div>
    <div id="real-caption-text" style="min-height: 60px; line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px;">
      Waiting for real captions...
    </div>
  `;
  
  // Make draggable
  let isDragging = false;
  const header = container.firstElementChild;
  header.style.cursor = 'move';
  
  header.onmousedown = (e) => {
    isDragging = true;
    let startX = e.clientX - container.offsetLeft;
    let startY = e.clientY - container.offsetTop;
    
    document.onmousemove = (e) => {
      if (isDragging) {
        container.style.left = (e.clientX - startX) + 'px';
        container.style.top = (e.clientY - startY) + 'px';
      }
    };
    
    document.onmouseup = () => {
      isDragging = false;
      document.onmousemove = null;
    };
  };
  
  document.body.appendChild(container);
  console.log('Created caption display container');
  return container;
}

// Handle caption messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.type || message.action);
  
  // Handle settings updates from popup
  if (message.type === 'SETTINGS_UPDATED') {
    userSettings = { ...userSettings, ...message.settings };
    console.log('Settings updated:', userSettings);
    return;
  }
  
  // Create display when capture starts
  if (message.type === 'CAPTURE_STARTED') {
    createRealCaptionDisplay();
    console.log('Caption display activated');
  }
  
  // Handle caption updates from platform scrapers
  if (message.action === 'updateCaption' && message.text && message.text.length > 5) {
    console.log('Caption received:', message.platform, '-', message.text);
    
    let textDiv = document.getElementById('real-caption-text');
    if (!textDiv) {
      createRealCaptionDisplay();
      textDiv = document.getElementById('real-caption-text');
    }
    
    if (textDiv) {
      // Clear previous content
      textDiv.innerHTML = '';
      
      // Show original text only if setting is enabled
      if (userSettings.showOriginal) {
        const originalDiv = document.createElement('div');
        originalDiv.style.cssText = `
          margin-bottom: 12px;
          color: white;
          padding: 10px;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          border-left: 4px solid #2196F3;
          font-size: 16px;
        `;
        originalDiv.innerHTML = `
          <strong>Original (${message.platform}):</strong><br>
          <span style="margin-left: 20px;">${message.text}</span>
        `;
        textDiv.appendChild(originalDiv);
      }
      
      // Add timestamp
      const timestampDiv = document.createElement('div');
      timestampDiv.style.cssText = `
        font-size: 12px;
        color: #ccc;
        margin-bottom: 10px;
      `;
      timestampDiv.innerHTML = `
        ${new Date().toLocaleTimeString()} • Source: Real ${message.platform} captions
      `;
      textDiv.appendChild(timestampDiv);
      
      console.log('Displayed caption from', message.platform, '(Original shown:', userSettings.showOriginal, ')');
      
      // Get translation for the caption
      chrome.runtime.sendMessage({
        type: 'TRANSLATE_TEXT',
        text: message.text,
        targetLanguage: userSettings.targetLanguage || 'hi'
      }, (response) => {
        if (response && response.success && response.translatedText !== message.text) {
          const translationDiv = document.createElement('div');
          translationDiv.style.cssText = `
            margin-top: 12px;
            color: #90EE90;
            font-style: italic;
            padding: 10px;
            background: rgba(0,255,0,0.1);
            border-radius: 8px;
            border-left: 4px solid #FF9800;
            font-size: 16px;
          `;
          translationDiv.innerHTML = `
            <strong>Hindi Translation:</strong><br>
            <span style="margin-left: 20px;">${response.translatedText}</span>
          `;
          textDiv.appendChild(translationDiv);
          console.log('Added translation');
        }
      });
    }
    return;
  }
  
  // Handle processed caption updates from background
  if (message.type === 'REAL_CAPTION_UPDATE') {
    console.log('Processed caption:', message.originalText);
    
    let textDiv = document.getElementById('real-caption-text');
    if (!textDiv) {
      createRealCaptionDisplay();
      textDiv = document.getElementById('real-caption-text');
    }
    
    if (textDiv) {
      textDiv.innerHTML = '';
      
      // Show original only if setting is enabled
      if (userSettings.showOriginal) {
        const originalDiv = document.createElement('div');
        originalDiv.style.cssText = `
          margin-bottom: 12px;
          color: white;
          padding: 10px;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          border-left: 4px solid #2196F3;
          font-size: 16px;
        `;
        originalDiv.innerHTML = `
          <strong>Original (${message.platform}):</strong><br>
          <span style="margin-left: 20px;">${message.originalText}</span>
        `;
        textDiv.appendChild(originalDiv);
      }
      
      // Always show translation
      const translationDiv = document.createElement('div');
      translationDiv.style.cssText = `
        margin-top: 12px;
        color: #90EE90;
        font-style: italic;
        padding: 10px;
        background: rgba(0,255,0,0.1);
        border-radius: 8px;
        border-left: 4px solid #FF9800;
        font-size: 16px;
      `;
      translationDiv.innerHTML = `
        <strong>Translation:</strong><br>
        <span style="margin-left: 20px;">${message.translatedText}</span>
      `;
      textDiv.appendChild(translationDiv);
      
      // Add timestamp
      const timestampDiv = document.createElement('div');
      timestampDiv.style.cssText = `
        font-size: 12px;
        color: #ccc;
        margin-top: 10px;
      `;
      timestampDiv.innerHTML = `
        ${new Date(message.timestamp).toLocaleTimeString()} • Source: Real ${message.platform} captions
      `;
      textDiv.appendChild(timestampDiv);
      
      console.log('Displayed processed caption with translation (Original shown:', userSettings.showOriginal, ')');
    }
  }
  
  // Remove display when capture stops
  if (message.type === 'CAPTURE_STOPPED') {
    const container = document.getElementById('real-caption-display');
    if (container) container.remove();
    console.log('Caption display removed');
  }
});

console.log('Caption display ready!');