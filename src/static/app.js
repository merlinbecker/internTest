// Global variables
let stream = null;
let eventCounter = 0;
let deferredPrompt = null;
let currentFacingMode = 'user'; // 'user' for front camera, 'environment' for back camera
let availableCameras = [];

// Audio recording variables
let audioStream = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimer = null;
let recordedAudioBlob = null;

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

// New function for combobox navigation
function switchToTab(tabName) {
    // Hide all tab panels
    const tabPanels = document.getElementsByClassName("tab-panel");
    for (let i = 0; i < tabPanels.length; i++) {
        tabPanels[i].classList.remove("active");
    }
    
    // Show selected tab panel
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add("active");
    }
    
    // Log the tab change event
    logEvent('Navigation', `Switched to: ${tabName} via combobox`);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('PWA App loaded');
    displayRequestInfo();
    setupEventListeners();
    setupPWAFeatures();
    setupR1ResponseHandler();
    
    // Set default selection in combobox
    const navigationSelect = document.getElementById('navigationSelect');
    if (navigationSelect) {
        navigationSelect.value = 'requestTab';
    }
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
    
    // Add initial message
    logEvent('System', 'Event capturing gestartet...');
    
    // Generic event listener for ALL events
    const allEventTypes = [
        // Keyboard
        'keydown', 'keyup', 'keypress',
        // Mouse
        'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'contextmenu', 'wheel',
        // Touch
        'touchstart', 'touchend', 'touchmove', 'touchcancel',
        // Pointer
        'pointerdown', 'pointerup', 'pointermove', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'pointercancel',
        // Gesture
        'gesturestart', 'gesturechange', 'gestureend',
        // Focus
        'focus', 'blur', 'focusin', 'focusout',
        // Form
        'input', 'change', 'submit', 'reset', 'select',
        // Window
        'load', 'unload', 'beforeunload', 'resize', 'scroll', 'orientationchange',
        // Drag
        'drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop',
        // Media
        'play', 'pause', 'ended', 'volumechange', 'loadstart', 'loadend', 'progress', 'canplay', 'canplaythrough',
        // Custom/Hardware events that might exist
        'devicemotion', 'deviceorientation', 'deviceproximity', 'devicelight', 'compassneedscalibration',
        'gamepadconnected', 'gamepaddisconnected',
        'visibilitychange', 'pagehide', 'pageshow',
        // Battery
        'chargingchange', 'chargingtimechange', 'dischargingtimechange', 'levelchange',
        // Network
        'online', 'offline',
        // Storage
        'storage', 'beforeinstallprompt', 'appinstalled'
    ];
    
    let eventCounter = 0;
    
    // Add generic listeners for all event types
    allEventTypes.forEach(eventType => {
        document.addEventListener(eventType, function(event) {
            eventCounter++;
            
            // Filter high-frequency events
            const highFrequencyEvents = ['mousemove', 'pointermove', 'devicemotion', 'deviceorientation', 'scroll', 'touchmove'];
            if (highFrequencyEvents.includes(eventType) && eventCounter % 30 !== 0) {
                return;
            }
            
            // Capture detailed event information
            let details = `Type: ${eventType}`;
            
            // Add specific details based on event type
            if (event.key !== undefined) {
                details += ` | Key: ${event.key} | Code: ${event.code} | KeyCode: ${event.keyCode}`;
            }
            
            if (event.clientX !== undefined && event.clientY !== undefined) {
                details += ` | Pos: (${event.clientX}, ${event.clientY})`;
            }
            
            if (event.button !== undefined) {
                details += ` | Button: ${event.button}`;
            }
            
            if (event.deltaX !== undefined || event.deltaY !== undefined) {
                details += ` | Delta: X${Math.round(event.deltaX)} Y${Math.round(event.deltaY)}`;
            }
            
            if (event.touches && event.touches.length > 0) {
                details += ` | Touches: ${event.touches.length}`;
            }
            
            if (event.target && event.target.tagName) {
                details += ` | Target: ${event.target.tagName}`;
            }
            
            // Log any additional properties that might be hardware-specific
            const specialProps = ['which', 'charCode', 'location', 'repeat', 'ctrlKey', 'altKey', 'shiftKey', 'metaKey'];
            specialProps.forEach(prop => {
                if (event[prop] !== undefined && event[prop] !== false && event[prop] !== 0) {
                    details += ` | ${prop}: ${event[prop]}`;
                }
            });
            
            logEvent('Event', details);
        }, { passive: true, capture: true });
    });
    
    // Also listen for any unknown events on window object
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        // Log any new event types we haven't seen before
        if (!allEventTypes.includes(type) && !type.startsWith('_')) {
            logEvent('New Event Type', `Discovered: ${type}`);
            allEventTypes.push(type);
        }
        return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Try to capture any hardware-specific events
    const hardwareEventTypes = [
        'hardwarebutton', 'volumeup', 'volumedown', 'camerakey', 'menukey', 'homekey', 'backkey',
        'powerkey', 'searchkey', 'rabbit', 'r1button', 'custombutton1', 'custombutton2',
        'physicalkeypress', 'hardwarekeydown', 'hardwarekeyup',
        // Rabbit R1 specific events from the code
        'scrollUp', 'scrollDown', 'sideClick', 'longPressStart', 'longPressEnd',
        'wheelUp', 'wheelDown', 'wheelClick', 'wheelLongPress',
        // Plugin and R1 specific
        'onPluginMessage', 'PluginMessage', 'R1Event', 'CreationEvent'
    ];
    
    hardwareEventTypes.forEach(eventType => {
        try {
            // Listen on document
            document.addEventListener(eventType, function(event) {
                logEvent('Hardware Doc', `${eventType}: ${JSON.stringify(event, null, 2)}`);
            }, { passive: true, capture: true });
            
            // Listen on window
            window.addEventListener(eventType, function(event) {
                logEvent('Hardware Win', `${eventType}: ${JSON.stringify(event, null, 2)}`);
            }, { passive: true, capture: true });
        } catch (e) {
            // Silently ignore if event type is not supported
        }
    });

    // Special Rabbit R1 hardware event listeners based on the code
    try {
        // Scroll wheel events
        window.addEventListener('scrollUp', function(event) {
            logEvent('R1 Scroll', `Scroll UP detected: ${JSON.stringify(event)}`);
        });
        
        window.addEventListener('scrollDown', function(event) {
            logEvent('R1 Scroll', `Scroll DOWN detected: ${JSON.stringify(event)}`);
        });
        
        // Side button click
        window.addEventListener('sideClick', function(event) {
            logEvent('R1 Button', `Side CLICK detected: ${JSON.stringify(event)}`);
        });
        
        // Long press events
        window.addEventListener('longPressStart', function(event) {
            logEvent('R1 LongPress', `Long press START: ${JSON.stringify(event)}`);
        });
        
        window.addEventListener('longPressEnd', function(event) {
            logEvent('R1 LongPress', `Long press END: ${JSON.stringify(event)}`);
        });
        
        // Check for PluginMessageHandler
        if (typeof PluginMessageHandler !== 'undefined') {
            logEvent('R1 Detect', 'PluginMessageHandler detected - Running on R1!');
            
            // Override onPluginMessage if it exists
            const originalOnPluginMessage = window.onPluginMessage;
            window.onPluginMessage = function(data) {
                logEvent('R1 Plugin', `Plugin message: ${JSON.stringify(data)}`);
                if (originalOnPluginMessage) {
                    originalOnPluginMessage(data);
                }
            };
        }
        
        // Check for CreationStorage
        if (typeof window.creationStorage !== 'undefined') {
            logEvent('R1 Storage', 'CreationStorage detected - R1 storage available!');
        }
        
    } catch (e) {
        logEvent('R1 Error', `Error setting up R1 events: ${e.message}`);
    }

    // Test function to manually trigger R1 events (for debugging)
    window.testR1Events = function() {
        const r1Events = ['scrollUp', 'scrollDown', 'sideClick', 'longPressStart'];
        r1Events.forEach(eventType => {
            try {
                const event = new Event(eventType);
                window.dispatchEvent(event);
                logEvent('R1 Test', `Manually triggered: ${eventType}`);
            } catch (e) {
                logEvent('R1 Test Error', `Failed to trigger ${eventType}: ${e.message}`);
            }
        });
    };
    
    // Log initial R1 detection info
    setTimeout(() => {
        const r1Features = {
            hasPluginMessageHandler: typeof PluginMessageHandler !== 'undefined',
            hasCreationStorage: typeof window.creationStorage !== 'undefined',
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            maxTouchPoints: navigator.maxTouchPoints
        };
        logEvent('R1 Info', `Device info: ${JSON.stringify(r1Features)}`);
    }, 1000);
    
    // Page visibility for power button detection
    document.addEventListener('visibilitychange', function() {
        logEvent('System', `Screen ${document.hidden ? 'OFF' : 'ON'} - Possible power button`);
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
    
    // Insert new entry at the top (prepend)
    eventLog.insertBefore(logEntry, eventLog.firstChild);
    
    // Keep only last 3 entries
    while (eventLog.children.length > 3) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

// Clear event log
function clearEventLog() {
    const eventLog = document.getElementById('eventLog');
    eventLog.innerHTML = '';
    // Add initial message as first entry
    logEvent('System', 'Event log cleared...');
}

// Camera functions
async function startCamera() {
    try {
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('MEDIA_DEVICES_NOT_SUPPORTED: Ihr Browser unterstützt keine Kamera-API');
        }

        // Enumerate available cameras first
        await enumerateAndCheckCameras();

        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: currentFacingMode
            },
            audio: false
        };
        
        logEvent('Camera', `Requesting camera access (${currentFacingMode})...`);
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        const video = document.getElementById('video');
        const placeholder = document.getElementById('cameraPlaceholder');
        const switchBtn = document.getElementById('switchCameraBtn');
        
        if (!video || !placeholder) {
            throw new Error('VIDEO_ELEMENTS_NOT_FOUND: Video-Elemente nicht gefunden');
        }
        
        video.srcObject = stream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        
        // Show switch button if multiple cameras are available
        if (switchBtn && availableCameras.length > 1) {
            switchBtn.style.display = 'inline-block';
        }
        
        // Check if cameraStatus element exists before using it
        const cameraStatus = document.getElementById('cameraStatus');
        if (cameraStatus) {
            cameraStatus.className = 'status-indicator status-active';
        }
        
        logEvent('Camera', `Kamera erfolgreich gestartet (${currentFacingMode})`);
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        
        let userMessage = 'Unbekannter Kamera-Fehler';
        let technicalDetails = `${error.name}: ${error.message}`;
        
        // Specific error handling based on error type
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            userMessage = 'BERECHTIGUNG VERWEIGERT: Kamera-Zugriff wurde blockiert. Bitte erlauben Sie den Kamera-Zugriff in den Browser-Einstellungen.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            userMessage = 'KEINE KAMERA GEFUNDEN: Keine Kamera am Gerät erkannt. Überprüfen Sie die Hardware-Verbindung.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            userMessage = 'KAMERA BLOCKIERT: Kamera wird bereits von einer anderen Anwendung verwendet.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            userMessage = 'KAMERA INKOMPATIBEL: Die angeforderte Auflösung wird nicht unterstützt.';
        } else if (error.name === 'NotSupportedError') {
            userMessage = 'BROWSER INKOMPATIBEL: Ihr Browser unterstützt die Kamera-API nicht.';
        } else if (error.name === 'SecurityError') {
            userMessage = 'SICHERHEITSFEHLER: Kamera-Zugriff aus Sicherheitsgründen blockiert (HTTPS erforderlich).';
        } else if (error.message.includes('MEDIA_DEVICES_NOT_SUPPORTED')) {
            userMessage = 'API NICHT VERFÜGBAR: MediaDevices API nicht verfügbar.';
        } else if (error.message.includes('VIDEO_ELEMENTS_NOT_FOUND')) {
            userMessage = 'UI FEHLER: Video-Elemente nicht gefunden.';
        }
        
        logEvent('Camera Error', `${userMessage} | Technical: ${technicalDetails}`);
        alert(`🚫 KAMERA-FEHLER:\n\n${userMessage}\n\nTechnische Details:\n${technicalDetails}\n\nFehler-Code: ${error.name || 'UNKNOWN'}`);
    }
}

// Enumerate available cameras
async function enumerateAndCheckCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        
        logEvent('Camera', `Verfügbare Kameras: ${availableCameras.length}`);
        
        availableCameras.forEach((camera, index) => {
            const label = camera.label || `Kamera ${index + 1}`;
            logEvent('Camera Info', `${index + 1}: ${label} (ID: ${camera.deviceId.substring(0, 8)}...)`);
        });
        
        return availableCameras;
    } catch (error) {
        console.error('Error enumerating cameras:', error);
        logEvent('Camera Error', `Kamera-Auflistung fehlgeschlagen: ${error.message}`);
        return [];
    }
}

// Switch between front and back camera
async function switchCamera() {
    try {
        if (!stream) {
            alert('🚫 KAMERA-WECHSEL-FEHLER:\n\nKeine aktive Kamera zum Wechseln. Starten Sie zuerst die Kamera.');
            return;
        }
        
        if (availableCameras.length < 2) {
            alert('🚫 KAMERA-WECHSEL-FEHLER:\n\nNur eine Kamera verfügbar. Kamera-Wechsel nicht möglich.');
            return;
        }
        
        // Switch facing mode
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        
        logEvent('Camera', `Wechsele zu ${currentFacingMode === 'user' ? 'Front' : 'Rück'}kamera...`);
        
        // Stop current stream
        stream.getTracks().forEach(track => track.stop());
        
        // Start new stream with switched camera
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: currentFacingMode
            },
            audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        const video = document.getElementById('video');
        if (video) {
            video.srcObject = stream;
        }
        
        const cameraType = currentFacingMode === 'user' ? 'Frontkamera' : 'Rückkamera';
        logEvent('Camera', `Erfolgreich zu ${cameraType} gewechselt`);
        
    } catch (error) {
        console.error('Error switching camera:', error);
        
        let userMessage = 'Unbekannter Kamera-Wechsel-Fehler';
        
        if (error.name === 'OverconstrainedError') {
            userMessage = 'KAMERA NICHT VERFÜGBAR: Die gewünschte Kamera ist nicht verfügbar oder unterstützt die Auflösung nicht.';
            // Revert to previous facing mode
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        } else if (error.name === 'NotFoundError') {
            userMessage = 'KAMERA NICHT GEFUNDEN: Die gewünschte Kamera wurde nicht gefunden.';
        } else if (error.name === 'NotReadableError') {
            userMessage = 'KAMERA BLOCKIERT: Die gewünschte Kamera wird von einer anderen App verwendet.';
        }
        
        logEvent('Camera Switch Error', `${userMessage} | Technical: ${error.message}`);
        alert(`🚫 KAMERA-WECHSEL-FEHLER:\n\n${userMessage}\n\nTechnische Details:\n${error.message}\n\nFehler-Code: ${error.name || 'UNKNOWN'}`);
        
        // Try to restart with original camera
        try {
            await startCamera();
        } catch (restartError) {
            logEvent('Camera Error', `Neustart nach Wechsel-Fehler fehlgeschlagen: ${restartError.message}`);
        }
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        
        const video = document.getElementById('video');
        const placeholder = document.getElementById('cameraPlaceholder');
        const switchBtn = document.getElementById('switchCameraBtn');
        
        if (video && placeholder) {
            video.style.display = 'none';
            placeholder.style.display = 'flex';
        }
        
        // Hide switch button when camera is stopped
        if (switchBtn) {
            switchBtn.style.display = 'none';
        }
        
        const cameraStatus = document.getElementById('cameraStatus');
        if (cameraStatus) {
            cameraStatus.className = 'status-indicator status-inactive';
        }
        
        logEvent('Camera', 'Kamera gestoppt');
    }
}

function takePhoto() {
    try {
        if (!stream) {
            alert('🚫 FOTO-FEHLER:\n\nKamera ist nicht aktiv. Bitte starten Sie zuerst die Kamera.');
            return;
        }
        
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        
        if (!video || !canvas) {
            throw new Error('VIDEO_CANVAS_NOT_FOUND: Video oder Canvas Element nicht gefunden');
        }
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            throw new Error('VIDEO_NOT_READY: Video-Stream ist noch nicht bereit');
        }
        
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('CANVAS_CONTEXT_FAILED: 2D-Kontext konnte nicht erstellt werden');
        }
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0);
        
        // Convert to blob and create image
        canvas.toBlob(function(blob) {
            if (!blob) {
                alert('🚫 FOTO-FEHLER:\n\nBild konnte nicht erstellt werden. Blob-Erstellung fehlgeschlagen.');
                return;
            }
            
            try {
                const url = URL.createObjectURL(blob);
                const img = document.createElement('img');
                img.src = url;
                img.style.maxWidth = '100%';
                img.style.border = '2px solid #2196F3';
                img.style.borderRadius = '4px';
                img.style.marginTop = '10px';
                
                const photoContainer = document.getElementById('photoContainer');
                if (!photoContainer) {
                    throw new Error('PHOTO_CONTAINER_NOT_FOUND: Foto-Container nicht gefunden');
                }
                
                photoContainer.innerHTML = '';
                photoContainer.appendChild(img);
                
                logEvent('Camera', `Foto aufgenommen - ${canvas.width}x${canvas.height}px`);
                
                // Clean up blob URL after image loads
                img.onload = function() {
                    URL.revokeObjectURL(url);
                };
                
            } catch (displayError) {
                console.error('Error displaying photo:', displayError);
                alert(`🚫 FOTO-ANZEIGE-FEHLER:\n\nFoto wurde aufgenommen, konnte aber nicht angezeigt werden.\n\nTechnische Details:\n${displayError.message}`);
            }
        }, 'image/jpeg', 0.95);
        
    } catch (error) {
        console.error('Error taking photo:', error);
        
        let userMessage = 'Unbekannter Foto-Fehler';
        
        if (error.message.includes('VIDEO_CANVAS_NOT_FOUND')) {
            userMessage = 'UI-FEHLER: Video- oder Canvas-Element nicht verfügbar.';
        } else if (error.message.includes('VIDEO_NOT_READY')) {
            userMessage = 'VIDEO NICHT BEREIT: Warten Sie, bis die Kamera vollständig geladen ist.';
        } else if (error.message.includes('CANVAS_CONTEXT_FAILED')) {
            userMessage = 'RENDER-FEHLER: 2D-Canvas-Kontext nicht verfügbar.';
        } else if (error.message.includes('PHOTO_CONTAINER_NOT_FOUND')) {
            userMessage = 'UI-FEHLER: Foto-Anzeigebereich nicht gefunden.';
        }
        
        logEvent('Photo Error', `${userMessage} | Technical: ${error.message}`);
        alert(`🚫 FOTO-FEHLER:\n\n${userMessage}\n\nTechnische Details:\n${error.message}\n\nFehler-Typ: ${error.name || 'UNKNOWN'}`);
    }
}

// Microphone recording functions
async function startRecording() {
    try {
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('MEDIA_DEVICES_NOT_SUPPORTED: Ihr Browser unterstützt keine Mikrofon-API');
        }

        // Check MediaRecorder support
        if (!window.MediaRecorder) {
            throw new Error('MEDIA_RECORDER_NOT_SUPPORTED: MediaRecorder API nicht unterstützt');
        }

        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100
            },
            video: false
        };
        
        logEvent('Microphone', 'Requesting microphone access...');
        audioStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Reset audio chunks
        audioChunks = [];
        
        // Create MediaRecorder
        const options = {
            mimeType: 'audio/webm;codecs=opus'
        };
        
        // Fallback for different browsers
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/mp4';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = '';
                }
            }
        }
        
        mediaRecorder = new MediaRecorder(audioStream, options);
        
        // Event handlers
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            // Create blob from recorded chunks
            const mimeType = mediaRecorder.mimeType || 'audio/webm';
            recordedAudioBlob = new Blob(audioChunks, { type: mimeType });
            
            // Update UI
            updateAudioUI();
            
            logEvent('Microphone', `Aufnahme beendet - ${formatFileSize(recordedAudioBlob.size)}`);
        };
        
        mediaRecorder.onerror = function(event) {
            console.error('MediaRecorder error:', event.error);
            logEvent('Microphone Error', `Recording error: ${event.error}`);
        };
        
        // Start recording
        mediaRecorder.start(100); // Collect data every 100ms
        recordingStartTime = Date.now();
        
        // Start timer
        startRecordingTimer();
        
        // Update UI
        updateRecordingUI(true);
        
        logEvent('Microphone', 'Audio-Aufnahme gestartet');
        
    } catch (error) {
        console.error('Error starting audio recording:', error);
        handleMicrophoneError(error);
    }
}

function stopRecording() {
    try {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        
        // Stop timer
        stopRecordingTimer();
        
        // Update UI
        updateRecordingUI(false);
        
        logEvent('Microphone', 'Audio-Aufnahme gestoppt');
        
    } catch (error) {
        console.error('Error stopping audio recording:', error);
        logEvent('Microphone Error', `Stop error: ${error.message}`);
    }
}

function playRecording() {
    try {
        if (!recordedAudioBlob) {
            alert('🚫 WIEDERGABE-FEHLER:\n\nKeine Aufnahme verfügbar. Nehmen Sie zuerst Audio auf.');
            return;
        }
        
        const audioPlayback = document.getElementById('audioPlayback');
        if (!audioPlayback) {
            throw new Error('AUDIO_ELEMENT_NOT_FOUND: Audio-Element nicht gefunden');
        }
        
        // Create URL for blob and set as source
        const audioUrl = URL.createObjectURL(recordedAudioBlob);
        audioPlayback.src = audioUrl;
        audioPlayback.style.display = 'block';
        
        // Play audio
        audioPlayback.play().catch(error => {
            console.error('Error playing audio:', error);
            alert(`🚫 WIEDERGABE-FEHLER:\n\nAudio konnte nicht abgespielt werden.\n\nTechnische Details:\n${error.message}`);
        });
        
        // Clean up URL when audio ends
        audioPlayback.onended = function() {
            URL.revokeObjectURL(audioUrl);
        };
        
        logEvent('Microphone', 'Audio-Wiedergabe gestartet');
        
    } catch (error) {
        console.error('Error playing recording:', error);
        alert(`🚫 WIEDERGABE-FEHLER:\n\nAudio konnte nicht abgespielt werden.\n\nTechnische Details:\n${error.message}`);
    }
}

function downloadRecording() {
    try {
        if (!recordedAudioBlob) {
            alert('🚫 DOWNLOAD-FEHLER:\n\nKeine Aufnahme verfügbar. Nehmen Sie zuerst Audio auf.');
            return;
        }
        
        const url = URL.createObjectURL(recordedAudioBlob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const extension = mediaRecorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `audio_recording_${timestamp}.${extension}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        logEvent('Microphone', `Audio-Download: ${a.download}`);
        
    } catch (error) {
        console.error('Error downloading recording:', error);
        alert(`🚫 DOWNLOAD-FEHLER:\n\nDownload fehlgeschlagen.\n\nTechnische Details:\n${error.message}`);
    }
}

// Helper functions for microphone
function updateRecordingUI(isRecording) {
    const startBtn = document.getElementById('startRecordBtn');
    const stopBtn = document.getElementById('stopRecordBtn');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const micStatus = document.getElementById('microphoneStatus');
    
    if (isRecording) {
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-block';
        if (recordingIndicator) recordingIndicator.style.display = 'block';
        if (micStatus) micStatus.style.display = 'none';
    } else {
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
        if (recordingIndicator) recordingIndicator.style.display = 'none';
        if (micStatus) micStatus.style.display = 'block';
    }
}

function updateAudioUI() {
    const playBtn = document.getElementById('playRecordBtn');
    const downloadBtn = document.getElementById('downloadRecordBtn');
    const audioInfo = document.getElementById('audioInfo');
    
    if (recordedAudioBlob) {
        if (playBtn) playBtn.style.display = 'inline-block';
        if (downloadBtn) downloadBtn.style.display = 'inline-block';
        
        if (audioInfo) {
            const duration = recordedAudioBlob.size > 0 ? 'Verfügbar' : 'Leer';
            const size = formatFileSize(recordedAudioBlob.size);
            const mimeType = mediaRecorder ? mediaRecorder.mimeType : 'Unknown';
            audioInfo.innerHTML = `
                <p><strong>Aufnahme:</strong> ${duration}</p>
                <p><strong>Größe:</strong> ${size}</p>
                <p><strong>Format:</strong> ${mimeType}</p>
            `;
        }
    } else {
        if (playBtn) playBtn.style.display = 'none';
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (audioInfo) audioInfo.innerHTML = '<p>Keine Aufnahme verfügbar</p>';
    }
}

function startRecordingTimer() {
    const recordingTimeElement = document.getElementById('recordingTime');
    
    recordingTimer = setInterval(() => {
        if (recordingStartTime) {
            const elapsed = Date.now() - recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            if (recordingTimeElement) {
                recordingTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }, 1000);
}

function stopRecordingTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    recordingStartTime = null;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function handleMicrophoneError(error) {
    let userMessage = 'Unbekannter Mikrofon-Fehler';
    let technicalDetails = `${error.name}: ${error.message}`;
    
    // Specific error handling
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        userMessage = 'BERECHTIGUNG VERWEIGERT: Mikrofon-Zugriff wurde blockiert. Bitte erlauben Sie den Mikrofon-Zugriff in den Browser-Einstellungen.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        userMessage = 'KEIN MIKROFON GEFUNDEN: Kein Mikrofon am Gerät erkannt. Überprüfen Sie die Hardware-Verbindung.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        userMessage = 'MIKROFON BLOCKIERT: Mikrofon wird bereits von einer anderen Anwendung verwendet.';
    } else if (error.name === 'SecurityError') {
        userMessage = 'SICHERHEITSFEHLER: Mikrofon-Zugriff aus Sicherheitsgründen blockiert (HTTPS erforderlich).';
    } else if (error.message.includes('MEDIA_DEVICES_NOT_SUPPORTED')) {
        userMessage = 'API NICHT VERFÜGBAR: MediaDevices API nicht verfügbar.';
    } else if (error.message.includes('MEDIA_RECORDER_NOT_SUPPORTED')) {
        userMessage = 'AUFNAHME NICHT UNTERSTÜTZT: MediaRecorder API nicht verfügbar.';
    }
    
    logEvent('Microphone Error', `${userMessage} | Technical: ${technicalDetails}`);
    alert(`🚫 MIKROFON-FEHLER:\n\n${userMessage}\n\nTechnische Details:\n${technicalDetails}\n\nFehler-Code: ${error.name || 'UNKNOWN'}`);
}

// R1 Agent Communication - Vereinfacht
function analyzePluginMessageHandler() {
    const output = document.getElementById('pluginOutput');
    if (!output) return;
    
    let result = '';
    const timestamp = new Date().toLocaleString('de-DE');
    
    result += `🔍 LAUFZEIT-ANALYSE: window.PluginMessageHandler\n`;
    result += `⏰ ${timestamp}\n`;
    result += '='.repeat(60) + '\n\n';
    
    // Check if PluginMessageHandler exists
    if (typeof window.PluginMessageHandler === 'undefined') {
        result += '❌ window.PluginMessageHandler ist NICHT definiert\n\n';
        
        // Search for similar objects
        result += '🔍 Suche nach ähnlichen Objekten im window:\n';
        result += '-'.repeat(40) + '\n';
        
        const windowProps = Object.getOwnPropertyNames(window);
        const relevantProps = windowProps.filter(prop => 
            prop.toLowerCase().includes('plugin') || 
            prop.toLowerCase().includes('message') ||
            prop.toLowerCase().includes('handler')
        );
        
        if (relevantProps.length > 0) {
            relevantProps.forEach(prop => {
                try {
                    const value = window[prop];
                    result += `📦 window.${prop}: ${typeof value}\n`;
                    if (typeof value === 'object' && value !== null) {
                        result += `   └─ Constructor: ${value.constructor?.name || 'Unknown'}\n`;
                    }
                } catch (e) {
                    result += `📦 window.${prop}: [Zugriff verweigert]\n`;
                }
            });
        } else {
            result += 'Keine ähnlichen Objekte gefunden\n';
        }
        
        output.textContent = result;
        return;
    }
    
    // Object exists - analyze it
    const handler = window.PluginMessageHandler;
    result += `✅ window.PluginMessageHandler gefunden!\n`;
    result += `📋 Type: ${typeof handler}\n`;
    result += `🏗️ Constructor: ${handler.constructor?.name || 'Unknown'}\n\n`;
    
    // Get all own properties
    result += '📊 EIGENE EIGENSCHAFTEN:\n';
    result += '-'.repeat(30) + '\n';
    
    const ownProps = Object.getOwnPropertyNames(handler);
    if (ownProps.length === 0) {
        result += 'Keine eigenen Eigenschaften gefunden\n';
    } else {
        ownProps.forEach(prop => {
            try {
                const value = handler[prop];
                const type = typeof value;
                
                result += `📌 ${prop}: ${type}\n`;
                
                if (type === 'function') {
                    // Function details
                    result += `   ├─ Länge: ${value.length} Parameter\n`;
                    
                    // Try to get function source (first 100 chars)
                    try {
                        const funcStr = value.toString();
                        const signature = funcStr.match(/^[^{]*/)[0].trim();
                        result += `   ├─ Signatur: ${signature}\n`;
                        
                        if (funcStr.length > 200) {
                            result += `   └─ Body: ${funcStr.substring(0, 100)}...\n`;
                        } else {
                            result += `   └─ Body: ${funcStr}\n`;
                        }
                    } catch (e) {
                        result += `   └─ Source: [Nicht verfügbar]\n`;
                    }
                } else if (type === 'object' && value !== null) {
                    result += `   ├─ Constructor: ${value.constructor?.name || 'Unknown'}\n`;
                    if (Array.isArray(value)) {
                        result += `   └─ Array-Länge: ${value.length}\n`;
                    } else {
                        const objKeys = Object.keys(value);
                        result += `   └─ Keys: [${objKeys.join(', ')}]\n`;
                    }
                } else {
                    result += `   └─ Wert: ${JSON.stringify(value)}\n`;
                }
                
            } catch (e) {
                result += `📌 ${prop}: [Zugriff verweigert - ${e.message}]\n`;
            }
        });
    }
    
    // Get prototype properties
    result += '\n🧬 PROTOTYPE-EIGENSCHAFTEN:\n';
    result += '-'.repeat(35) + '\n';
    
    try {
        const proto = Object.getPrototypeOf(handler);
        if (proto && proto !== Object.prototype) {
            const protoProps = Object.getOwnPropertyNames(proto);
            protoProps.forEach(prop => {
                if (prop !== 'constructor') {
                    try {
                        const value = proto[prop];
                        result += `🔗 ${prop}: ${typeof value}\n`;
                    } catch (e) {
                        result += `🔗 ${prop}: [Zugriff verweigert]\n`;
                    }
                }
            });
        } else {
            result += 'Keine speziellen Prototype-Eigenschaften\n';
        }
    } catch (e) {
        result += `Prototype-Analyse fehlgeschlagen: ${e.message}\n`;
    }
    
    // Check for common methods
    result += '\n🎯 METHODENTEST:\n';
    result += '-'.repeat(20) + '\n';
    
    const commonMethods = ['postMessage', 'send', 'emit', 'dispatch', 'call'];
    commonMethods.forEach(method => {
        if (typeof handler[method] === 'function') {
            result += `✅ ${method}() - Verfügbar\n`;
        } else {
            result += `❌ ${method}() - Nicht gefunden\n`;
        }
    });
    
    // Try to get all enumerable properties
    result += '\n📝 ENUMERABLE PROPERTIES:\n';
    result += '-'.repeat(30) + '\n';
    
    try {
        for (let key in handler) {
            try {
                const value = handler[key];
                result += `🔑 ${key}: ${typeof value}\n`;
            } catch (e) {
                result += `🔑 ${key}: [Enumeration-Fehler]\n`;
            }
        }
    } catch (e) {
        result += `Enumeration fehlgeschlagen: ${e.message}\n`;
    }
    
    // Object inspection using Object methods
    result += '\n🔬 OBJECT-INSPEKTION:\n';
    result += '-'.repeat(25) + '\n';
    
    try {
        result += `📋 Object.keys(): [${Object.keys(handler).join(', ')}]\n`;
        result += `📋 Object.getOwnPropertyNames(): [${Object.getOwnPropertyNames(handler).join(', ')}]\n`;
        result += `📋 Object.getOwnPropertyDescriptors():\n`;
        
        const descriptors = Object.getOwnPropertyDescriptors(handler);
        for (let [key, desc] of Object.entries(descriptors)) {
            result += `   ${key}: {\n`;
            result += `     writable: ${desc.writable}\n`;
            result += `     enumerable: ${desc.enumerable}\n`;
            result += `     configurable: ${desc.configurable}\n`;
            if (desc.value !== undefined) {
                result += `     value: ${typeof desc.value}\n`;
            }
            result += `   }\n`;
        }
    } catch (e) {
        result += `Object-Inspektion fehlgeschlagen: ${e.message}\n`;
    }
    
    result += '\n' + '='.repeat(60) + '\n';
    
    output.textContent = result;
    logEvent('Plugin Analysis', 'PluginMessageHandler Laufzeit-Analyse durchgeführt');
}

function analyzePostMessageAPI() {
    const output = document.getElementById('pluginOutput');
    if (!output) return;
    
    let result = '';
    const timestamp = new Date().toLocaleString('de-DE');
    
    result += `📡 POSTMESSAGE API ANALYSE\n`;
    result += `⏰ ${timestamp}\n`;
    result += '='.repeat(50) + '\n\n';
    
    // Check standard postMessage availability
    result += '🔍 STANDARD POSTMESSAGE API:\n';
    result += '-'.repeat(30) + '\n';
    result += `✅ window.postMessage: ${typeof window.postMessage}\n`;
    
    if (typeof window.postMessage === 'function') {
        result += `📋 Function length: ${window.postMessage.length} Parameter\n`;
        
        try {
            const funcStr = window.postMessage.toString();
            if (funcStr.includes('[native code]')) {
                result += `📋 Type: Native Browser API\n`;
            } else {
                result += `📋 Type: Custom Implementation\n`;
                result += `📋 Source: ${funcStr.substring(0, 200)}...\n`;
            }
        } catch (e) {
            result += `📋 Source: [Nicht verfügbar]\n`;
        }
    }
    
    // Context Analysis
    result += '\n🏗️ KONTEXT-ANALYSE:\n';
    result += '-'.repeat(25) + '\n';
    result += `📍 In iframe: ${window !== window.top}\n`;
    result += `📍 Has parent: ${window.parent !== window}\n`;
    result += `📍 Frame element: ${window.frameElement ? 'Ja' : 'Nein'}\n`;
    
    if (window.frameElement) {
        result += `📍 Frame ID: ${window.frameElement.id || 'Keine'}\n`;
        result += `📍 Frame Name: ${window.frameElement.name || 'Keine'}\n`;
        result += `📍 Frame Source: ${window.frameElement.src || 'Keine'}\n`;
    }
    
    result += `📍 Origin: ${window.location.origin}\n`;
    result += `📍 Protocol: ${window.location.protocol}\n`;
    
    // Message targets analysis
    result += '\n🎯 VERFÜGBARE MESSAGE-TARGETS:\n';
    result += '-'.repeat(35) + '\n';
    
    const targets = [
        { name: 'window.parent', obj: window.parent },
        { name: 'window.top', obj: window.top },
        { name: 'window.opener', obj: window.opener },
        { name: 'window', obj: window }
    ];
    
    targets.forEach(({name, obj}) => {
        if (obj) {
            const isSame = obj === window;
            result += `📤 ${name}: ${isSame ? 'self' : 'available'}\n`;
            if (!isSame && typeof obj.postMessage === 'function') {
                result += `   └─ postMessage: ✅ verfügbar\n`;
            }
        } else {
            result += `📤 ${name}: ❌ nicht verfügbar\n`;
        }
    });
    
    // Check for any Rabbit R1 specific patterns
    result += '\n🐰 RABBIT R1 SPEZIFISCHE ANALYSE:\n';
    result += '-'.repeat(35) + '\n';
    
    // Look for R1-related properties in various scopes
    const r1Props = [];
    
    // Check window
    Object.getOwnPropertyNames(window).forEach(prop => {
        if (prop.toLowerCase().includes('r1') || 
            prop.toLowerCase().includes('rabbit') ||
            prop.toLowerCase().includes('plugin')) {
            r1Props.push(`window.${prop}: ${typeof window[prop]}`);
        }
    });
    
    // Check document
    if (typeof document !== 'undefined') {
        Object.getOwnPropertyNames(document).forEach(prop => {
            if (prop.toLowerCase().includes('r1') || 
                prop.toLowerCase().includes('rabbit') ||
                prop.toLowerCase().includes('plugin')) {
                r1Props.push(`document.${prop}: ${typeof document[prop]}`);
            }
        });
    }
    
    // Check navigator
    if (typeof navigator !== 'undefined') {
        Object.getOwnPropertyNames(navigator).forEach(prop => {
            if (prop.toLowerCase().includes('r1') || 
                prop.toLowerCase().includes('rabbit') ||
                prop.toLowerCase().includes('plugin')) {
                r1Props.push(`navigator.${prop}: ${typeof navigator[prop]}`);
            }
        });
    }
    
    if (r1Props.length > 0) {
        result += 'Gefundene R1-relevante Properties:\n';
        r1Props.forEach(prop => result += `🔗 ${prop}\n`);
    } else {
        result += 'Keine R1-spezifischen Properties gefunden\n';
    }
    
    // Event listener analysis
    result += '\n📡 MESSAGE EVENT LISTENER:\n';
    result += '-'.repeat(30) + '\n';
    
    // Check if we can see existing listeners (limited in browsers)
    result += '✅ Message Listener ist aktiv\n';
    result += '📝 Überwacht alle eingehenden postMessage Events\n';
    result += '🎯 Filtert nach R1-relevanten Nachrichten\n';
    
    // Check for potential message formats
    result += '\n📋 ERKANNTE MESSAGE-FORMATE:\n';
    result += '-'.repeat(35) + '\n';
    result += 'Standard postMessage Targets:\n';
    result += '• window.parent.postMessage(data, "*")\n';
    result += '• window.top.postMessage(data, origin)\n';
    result += '• window.opener.postMessage(data, "*")\n\n';
    
    result += 'Mögliche R1 Message Struktur:\n';
    result += '{\n';
    result += '  "type": "R1_PLUGIN_MESSAGE",\n';
    result += '  "message": "email content",\n';
    result += '  "useLLM": true,\n';
    result += '  "wantsR1Response": true,\n';
    result += '  "wantsJournalEntry": false\n';
    result += '}\n\n';
    
    // Security info
    result += '🔒 SICHERHEITS-HINWEISE:\n';
    result += '-'.repeat(25) + '\n';
    result += '• PostMessage sendet an alle Origins (*)\n';
    result += '• Empfänger sollte Origin validieren\n';
    result += '• Daten werden JSON-serialisiert\n';
    result += '• Cross-Origin-Communication möglich\n';
    
    result += '\n' + '='.repeat(50) + '\n';
    
    output.textContent += '\n\n' + result;
    output.scrollTop = output.scrollHeight;
    
    logEvent('Plugin Analysis', 'PostMessage API analysiert');
}

function testPluginMessage() {
    const output = document.getElementById('pluginOutput');
    if (!output) return;
    
    let result = '\n📤 R1 AGENT COMMUNICATION TEST\n';
    result += '='.repeat(40) + '\n\n';
    
    const timestamp = new Date().toLocaleString('de-DE');
    
    // Setup response handler first
    setupR1ResponseHandler();
    
    // Test: Send German instruction to R1 agent
    if (typeof window.PluginMessageHandler !== 'undefined') {
        try {
            const germanInstruction = {
                message: 'Hallo R1 Agent! Bitte führe eine einfache Aktion auf Deutsch aus. Erkläre mir kurz, was du gerade machst oder antworte mit einem freundlichen Gruß.',
                useLLM: true,
                wantsR1Response: true,
                wantsJournalEntry: false
            };
            
            result += '🎯 SENDE DEUTSCHE ANWEISUNG AN R1 AGENT:\n';
            result += '-'.repeat(35) + '\n';
            result += JSON.stringify(germanInstruction, null, 2) + '\n\n';
            
            // Send message to R1 agent
            window.PluginMessageHandler.postMessage(JSON.stringify(germanInstruction));
            result += '✅ Nachricht erfolgreich an R1 Agent gesendet!\n';
            result += '⏳ Warte auf LLM-Antwort vom R1...\n';
            result += '👂 onPluginMessage Handler ist aktiv\n\n';
            
            logEvent('R1 Agent', 'Deutsche Anweisung gesendet');
            
        } catch (error) {
            result += `❌ FEHLER beim Senden an R1 Agent:\n${error.message}\n\n`;
            logEvent('R1 Agent Error', `Fehler: ${error.message}`);
        }
    } else {
        result += '❌ PluginMessageHandler nicht verfügbar!\n';
        result += '💡 Teste alternative postMessage Methoden...\n\n';
        
        // Fallback: Try standard postMessage with R1 format
        try {
            const fallbackMessage = {
                type: 'R1_PLUGIN_MESSAGE',
                message: 'Hallo R1! Bitte antworte auf Deutsch.',
                useLLM: true,
                wantsR1Response: true,
                wantsJournalEntry: false,
                timestamp: Date.now()
            };
            
            // Try different targets
            if (window.parent !== window) {
                window.parent.postMessage(fallbackMessage, '*');
                result += '📤 Fallback-Nachricht an parent gesendet\n';
            }
            if (window.top !== window) {
                window.top.postMessage(fallbackMessage, '*');
                result += '📤 Fallback-Nachricht an top gesendet\n';
            }
            
        } catch (e) {
            result += `❌ Fallback fehlgeschlagen: ${e.message}\n`;
        }
    }
    
    result += `\n⏰ Test gestartet: ${timestamp}\n`;
    result += '📡 Überwache Antworten für 30 Sekunden...\n';
    
    // Append to existing content
    output.textContent += result;
    output.scrollTop = output.scrollHeight;
    
    logEvent('R1 Communication', 'R1 Agent Test durchgeführt');
}

// Setup R1 response handler based on discovered code pattern
function setupR1ResponseHandler() {
    // Implement the onPluginMessage handler pattern from the code
    if (!window.onPluginMessage) {
        window.onPluginMessage = function(messageEvent) {
            console.log("Received plugin message:", messageEvent);
            
            const timestamp = new Date().toLocaleString('de-DE');
            logEvent('R1 Response', `Antwort erhalten: ${JSON.stringify(messageEvent)}`);
            
            const output = document.getElementById('pluginOutput');
            if (output) {
                let responseText = '';
                
                // Extract response using the pattern from discovered code
                if (messageEvent.data) {
                    try {
                        const parsedData = typeof messageEvent.data === "string" ? 
                            JSON.parse(messageEvent.data) : messageEvent.data;
                        responseText = parsedData.response || parsedData.message || JSON.stringify(parsedData);
                    } catch (e) {
                        responseText = messageEvent.data;
                    }
                } else if (messageEvent.message) {
                    responseText = messageEvent.message;
                }
                
                if (responseText) {
                    let displayText = `\n🎉 R1 AGENT ANTWORT ERHALTEN (${timestamp}):\n`;
                    displayText += '='.repeat(45) + '\n';
                    displayText += `📝 Antwort: ${responseText}\n`;
                    displayText += `📊 Type: ${typeof messageEvent.data}\n`;
                    displayText += `🔍 Raw Data: ${JSON.stringify(messageEvent, null, 2)}\n`;
                    displayText += '='.repeat(45) + '\n\n';
                    
                    output.textContent += displayText;
                    output.scrollTop = output.scrollHeight;
                    
                    // Handle the AI response (simplified version)
                    handleR1AIResponse(responseText);
                }
            }
        };
        
        logEvent('R1 Handler', 'onPluginMessage Handler eingerichtet');
    }
}

// Handle R1 AI Response
function handleR1AIResponse(responseText) {
    // Log the AI response
    logEvent('R1 AI Response', `LLM Antwort: ${responseText}`);
    
    // Show a user-friendly notification
    if (responseText && responseText.length > 0) {
        // You could add more sophisticated handling here
        console.log('R1 Agent Antwort:', responseText);
        
        // Optional: Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('R1 Agent Antwort', {
                body: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''),
                icon: '/src/static/icon-192.png'
            });
        }
    }
}

function clearPluginOutput() {
    const output = document.getElementById('pluginOutput');
    if (output) {
        output.textContent = 'Output gelöscht - Bereit für neue Analyse...';
        logEvent('Plugin', 'Output gelöscht');
    }
}

// Plugin message listener (if available)
function setupPluginMessageListener() {
    // Setup R1 response handler
    setupR1ResponseHandler();
    
    // Enhanced message listener for both PluginMessageHandler and standard postMessage
    if (typeof window.addEventListener === 'function') {
        
        // Standard postMessage listener (complementary to onPluginMessage)
        window.addEventListener('message', function(event) {
            const timestamp = new Date().toLocaleString('de-DE');
            
            logEvent('PostMessage Received', `Origin: ${event.origin}, Data: ${JSON.stringify(event.data)}`);
            
            const output = document.getElementById('pluginOutput');
            if (output) {
                let messageInfo = `\n📥 POSTMESSAGE EMPFANGEN (${timestamp}):\n`;
                messageInfo += '-'.repeat(40) + '\n';
                messageInfo += `🌐 Origin: ${event.origin}\n`;
                messageInfo += `📍 Source: ${event.source === window ? 'self' : event.source === window.parent ? 'parent' : 'other'}\n`;
                
                if (event.data) {
                    messageInfo += `📦 Data Type: ${typeof event.data}\n`;
                    if (typeof event.data === 'object') {
                        messageInfo += `📋 Data: ${JSON.stringify(event.data, null, 2)}\n`;
                    } else {
                        messageInfo += `📋 Data: ${event.data}\n`;
                    }
                } else {
                    messageInfo += `📋 Data: [empty]\n`;
                }
                
                // Check if it looks like an R1 response
                if (event.data && typeof event.data === 'object') {
                    if (event.data.type === 'R1_PLUGIN_MESSAGE' || 
                        event.data.message || 
                        event.data.response ||
                        event.data.useLLM !== undefined ||
                        event.data.wantsR1Response !== undefined) {
                        messageInfo += `🎯 VERDACHT: R1 Plugin Message!\n`;
                        
                        // Try to trigger onPluginMessage handler manually if it exists
                        if (typeof window.onPluginMessage === 'function') {
                            try {
                                window.onPluginMessage(event);
                                messageInfo += `🔄 onPluginMessage Handler aufgerufen\n`;
                            } catch (e) {
                                messageInfo += `❌ onPluginMessage Fehler: ${e.message}\n`;
                            }
                        }
                    }
                }
                
                messageInfo += '\n';
                
                output.textContent += messageInfo;
                output.scrollTop = output.scrollHeight;
            }
        });
        
        // Listen for any potential PluginMessageHandler responses
        if (typeof window.PluginMessageHandler !== 'undefined') {
            // Try to hook into potential response mechanisms
            const originalPostMessage = window.PluginMessageHandler.postMessage;
            if (originalPostMessage) {
                window.PluginMessageHandler.postMessage = function(...args) {
                    logEvent('PluginMessageHandler', `Sending: ${JSON.stringify(args)}`);
                    return originalPostMessage.apply(this, args);
                };
            }
        }
        
        logEvent('Plugin Listener', 'Enhanced message listeners mit R1 Handler aktiviert');
    }
}

// R1 Agent Communication - Vereinfacht
function sendTestMessage() {
    const output = document.getElementById('pluginOutput');
    if (!output) return;
    
    const timestamp = new Date().toLocaleString('de-DE');
    
    // Get checkbox state
    const wantsLLMResponseCheckbox = document.getElementById('wantsLLMResponseCheckbox');
    const wantsResponse = wantsLLMResponseCheckbox ? wantsLLMResponseCheckbox.checked : true;
    
    let result = `🚀 R1 AGENT TEST GESTARTET\n`;
    result += `⏰ ${timestamp}\n`;
    result += '='.repeat(50) + '\n\n';
    
    // Setup response handler
    setupR1ResponseHandler();
    
    // Send message to R1 agent
    if (typeof window.PluginMessageHandler !== 'undefined') {
        try {
            const message = {
                message: 'Hallo R1 Agent! Bitte antworte auf Deutsch mit einer kurzen, freundlichen Nachricht.',
                useLLM: true,
                wantsR1Response: wantsResponse,
                wantsJournalEntry: false
            };
            
            result += '📤 SENDE NACHRICHT AN R1 AGENT:\n';
            result += '-'.repeat(35) + '\n';
            result += `Nachricht: "${message.message}"\n`;
            result += `Parameter:\n`;
            result += `  - useLLM: ${message.useLLM}\n`;
            result += `  - wantsR1Response: ${message.wantsR1Response} ${wantsResponse ? '✅' : '❌'}\n`;
            result += `  - wantsJournalEntry: ${message.wantsJournalEntry}\n\n`;
            
            // Send to R1
            window.PluginMessageHandler.postMessage(JSON.stringify(message));
            
            result += '✅ Nachricht erfolgreich gesendet!\n';
            
            if (wantsResponse) {
                result += '⏳ Warte auf LLM-Antwort...\n\n';
            } else {
                result += '📝 Keine LLM-Antwort erwartet (wantsR1Response: false)\n\n';
            }
            
            logEvent('R1 Test', `Test-Nachricht gesendet (wantsR1Response: ${wantsResponse})`);
            
        } catch (error) {
            result += `❌ FEHLER beim Senden:\n`;
            result += `${error.message}\n\n`;
            logEvent('R1 Error', `Fehler: ${error.message}`);
        }
    } else {
        result += '❌ PluginMessageHandler nicht verfügbar!\n';
        result += 'Läuft vermutlich nicht auf echtem R1 Gerät.\n\n';
        logEvent('R1 Test', 'PluginMessageHandler nicht verfügbar');
    }
    
    output.textContent = result;
    output.scrollTop = output.scrollHeight;
}

// Setup R1 response handler
function setupR1ResponseHandler() {
    if (!window.onPluginMessage) {
        window.onPluginMessage = function(messageEvent) {
            console.log("R1 Plugin Message empfangen:", messageEvent);
            
            const timestamp = new Date().toLocaleString('de-DE');
            const output = document.getElementById('pluginOutput');
            
            if (output) {
                let responseText = '';
                
                // Extract response from message
                if (messageEvent.data) {
                    try {
                        const parsedData = typeof messageEvent.data === "string" ? 
                            JSON.parse(messageEvent.data) : messageEvent.data;
                        responseText = parsedData.response || parsedData.message || JSON.stringify(parsedData);
                    } catch (e) {
                        responseText = messageEvent.data;
                    }
                } else if (messageEvent.message) {
                    responseText = messageEvent.message;
                }
                
                if (responseText) {
                    let responseDisplay = `\n🎉 LLM ANTWORT ERHALTEN (${timestamp}):\n`;
                    responseDisplay += '='.repeat(50) + '\n';
                    responseDisplay += `📝 ${responseText}\n`;
                    responseDisplay += '='.repeat(50) + '\n\n';
                    
                    // Add raw data for debugging
                    responseDisplay += `🔍 RAW DATA:\n`;
                    responseDisplay += `${JSON.stringify(messageEvent, null, 2)}\n\n`;
                    
                    output.textContent += responseDisplay;
                    output.scrollTop = output.scrollHeight;
                    
                    logEvent('R1 Response', `LLM Antwort: ${responseText}`);
                }
            }
        };
        
        logEvent('R1 Handler', 'Response Handler aktiviert');
    }
}

function clearPluginOutput() {
    const output = document.getElementById('pluginOutput');
    if (output) {
        output.textContent = 'Output gelöscht - Bereit für neuen R1 Agent Test...';
        logEvent('R1 Test', 'Output gelöscht');
    }
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