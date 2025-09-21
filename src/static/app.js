// Global variables
let stream = null;
let eventCounter = 0;
let deferredPrompt = null;

// Tab switching function
function openTab(evt, tabName) {
    // Declare all variables
    var i, tabpanels, tabbuttons;
    
    // Get all elements with class="tab-panel" and hide them
    tabpanels = document.getElementsByClassName("tab-panel");
    for (i = 0; i < tabpanels.length; i++) {
        tabpanels[i].classList.remove("active");
    }
    
    // Get all elements with class="tab-button" and remove the class "active"
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].classList.remove("active");
    }
    
    // Show the specific tab content and add an "active" class to the button that opened the tab
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
    
    // Log the tab change event
    logEvent('Navigation', `Tab switched to: ${tabName}`);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('PWA App loaded');
    displayRequestInfo();
    setupEventListeners();
    setupPWAFeatures();
});

// Display request information
function displayRequestInfo() {
    const requestDetailsElement = document.getElementById('requestDetails');
    if (window.requestInfo) {
        requestDetailsElement.textContent = JSON.stringify(window.requestInfo, null, 2);
    } else {
        requestDetailsElement.textContent = 'Request information not available';
    }
}

// Setup event listeners for keyboard and mouse
function setupEventListeners() {
    const eventLog = document.getElementById('eventLog');
    
    // Keyboard events
    document.addEventListener('keydown', function(event) {
        logEvent('Keyboard', `Key Down: ${event.key} (Code: ${event.code})`);
    });
    
    document.addEventListener('keyup', function(event) {
        logEvent('Keyboard', `Key Up: ${event.key} (Code: ${event.code})`);
    });
    
    // Mouse events
    document.addEventListener('click', function(event) {
        logEvent('Mouse', `Click at (${event.clientX}, ${event.clientY}) - Target: ${event.target.tagName}`);
    });
    
    document.addEventListener('mousemove', function(event) {
        // Log mouse movement less frequently to avoid spam
        if (eventCounter % 50 === 0) {
            logEvent('Mouse', `Move to (${event.clientX}, ${event.clientY})`);
        }
        eventCounter++;
    });
    
    document.addEventListener('mousedown', function(event) {
        logEvent('Mouse', `Mouse Down: Button ${event.button} at (${event.clientX}, ${event.clientY})`);
    });
    
    document.addEventListener('mouseup', function(event) {
        logEvent('Mouse', `Mouse Up: Button ${event.button} at (${event.clientX}, ${event.clientY})`);
    });
    
    // Touch events for mobile
    document.addEventListener('touchstart', function(event) {
        const touch = event.touches[0];
        logEvent('Touch', `Touch Start at (${touch.clientX}, ${touch.clientY})`);
    });
    
    document.addEventListener('touchend', function(event) {
        logEvent('Touch', 'Touch End');
    });
    
    // Scroll events
    document.addEventListener('scroll', function(event) {
        if (eventCounter % 20 === 0) {
            logEvent('Scroll', `Scroll position: ${window.scrollY}`);
        }
        eventCounter++;
    });
}

// Log events to the event log
function logEvent(type, details) {
    const eventLog = document.getElementById('eventLog');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.innerHTML = `
        <div class="timestamp">${timestamp}</div>
        <strong>${type}:</strong> ${details}
    `;
    
    eventLog.appendChild(logEntry);
    eventLog.scrollTop = eventLog.scrollHeight;
    
    // Keep only last 50 entries
    while (eventLog.children.length > 50) {
        eventLog.removeChild(eventLog.firstChild);
    }
}

// Clear event log
function clearEventLog() {
    const eventLog = document.getElementById('eventLog');
    eventLog.innerHTML = '<div class="log-entry">Event log cleared...</div>';
}

// Camera functions
async function startCamera() {
    try {
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('video');
        const placeholder = document.getElementById('cameraPlaceholder');
        
        video.srcObject = stream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        
        document.getElementById('cameraStatus').className = 'status-indicator status-active';
        
        logEvent('Camera', 'Kamera erfolgreich gestartet');
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        logEvent('Camera', `Fehler beim Zugriff auf Kamera: ${error.message}`);
        alert('Kamera konnte nicht gestartet werden. Bitte überprüfen Sie die Berechtigungen.');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        
        const video = document.getElementById('video');
        const placeholder = document.getElementById('cameraPlaceholder');
        
        video.style.display = 'none';
        placeholder.style.display = 'flex';
        
        document.getElementById('cameraStatus').className = 'status-indicator status-inactive';
        
        logEvent('Camera', 'Kamera gestoppt');
    }
}

function takePhoto() {
    if (!stream) {
        alert('Bitte starten Sie zuerst die Kamera');
        return;
    }
    
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0);
    
    // Convert to blob and create image
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.border = '2px solid #2196F3';
        img.style.borderRadius = '4px';
        img.style.marginTop = '10px';
        
        const photoContainer = document.getElementById('photoContainer');
        photoContainer.innerHTML = '';
        photoContainer.appendChild(img);
        
        logEvent('Camera', 'Foto aufgenommen');
    });
}

// PWA Features
function setupPWAFeatures() {
    // PWA Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        const installBtn = document.getElementById('installBtn');
        installBtn.style.display = 'inline-block';
        
        document.getElementById('installStatus').innerHTML = '📱 Installation verfügbar';
    });
    
    // Check if app is installed
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        document.getElementById('installStatus').innerHTML = '✓ App installiert';
        document.getElementById('installBtn').style.display = 'none';
        deferredPrompt = null;
    });
    
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.getElementById('installStatus').innerHTML = '✓ Als PWA gestartet';
        logEvent('PWA', 'App läuft als PWA');
    }
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                logEvent('PWA', 'Installation akzeptiert');
            } else {
                console.log('User dismissed the install prompt');
                logEvent('PWA', 'Installation abgelehnt');
            }
            deferredPrompt = null;
        });
    }
}

// Additional utility functions
function checkBrowserFeatures() {
    const features = {
        'Service Worker': 'serviceWorker' in navigator,
        'Camera/Media': 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        'Notifications': 'Notification' in window,
        'Geolocation': 'geolocation' in navigator,
        'Local Storage': 'localStorage' in window,
        'IndexedDB': 'indexedDB' in window
    };
    
    console.log('Browser Features:', features);
    return features;
}

// Initialize feature check
checkBrowserFeatures();