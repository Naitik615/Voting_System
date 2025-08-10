// DOM Elements
const verificationPopup = document.getElementById('verificationPopup');
const closePopup = document.getElementById('closePopup');
const videoElement = document.getElementById('videoElement');
const gestureImage = document.getElementById('gestureImage');
const gestureDescription = document.getElementById('gestureDescription');
const statusMessage = document.getElementById('statusMessage');
const startVerification = document.getElementById('startVerification');
const cancelVerification = document.getElementById('cancelVerification');
const timerDisplay = document.getElementById('timerDisplay');

// State variables
let stream = null;
let currentGesture = null;
let verificationInProgress = false;
let verificationInterval = null;
let timeoutTimer = null;
let timeLeft = 10;

// Initialize popup
function showVerificationPopup() {
    verificationPopup.style.display = 'flex';
    initializeCamera();
    timeLeft = 10;
    updateTimerDisplay();
}

function hideVerificationPopup() {
    verificationPopup.style.display = 'none';
    stopCamera();
    resetVerification();
    clearTimeout(timeoutTimer);
}

// Timer functions
function updateTimerDisplay() {
    if (timerDisplay) {
        timerDisplay.textContent = `Time remaining: ${timeLeft} seconds`;
    }
}

function startTimeoutTimer() {
    timeoutTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timeoutTimer);
            clearInterval(verificationInterval);
            showStatus('Time limit exceeded. Please try again.', 'error');
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
        }
    }, 1000);
}

// Camera handling
async function initializeCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
    } catch (error) {
        showStatus('Error accessing camera: ' + error.message, 'error');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// Gesture handling
async function getNewGesture() {
    try {
        const response = await fetch('http://localhost:5000/get_gesture');
        const data = await response.json();
        
        currentGesture = data;
        gestureImage.src = `data:image/jpeg;base64,${data.gesture_image}`;
        gestureDescription.textContent = data.gesture_description;
        
        return data;
    } catch (error) {
        showStatus('Error getting gesture: ' + error.message, 'error');
        return null;
    }
}

// Verification process
async function startVerificationProcess() {
    if (verificationInProgress) return;
    
    verificationInProgress = true;
    startVerification.disabled = true;
    statusMessage.textContent = '';
    timeLeft = 10;
    updateTimerDisplay();
    startTimeoutTimer();
    
    // Get initial gesture
    await getNewGesture();
    
    // Start verification interval
    verificationInterval = setInterval(async () => {
        try {
            // Capture frame and send for verification
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            canvas.getContext('2d').drawImage(videoElement, 0, 0);
            const frameData = canvas.toDataURL('image/jpeg').split(',')[1];
            
            const response = await fetch('http://localhost:5000/capture', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    frame: frameData,
                    gesture: currentGesture.name
                })
            });
            
            const result = await response.json();
            
            if (result.verified) {
                clearInterval(verificationInterval);
                clearInterval(timeoutTimer);
                showStatus('Verification successful!', 'success');
                setTimeout(() => {
                    window.location.href = "index2.html";
                }, 2000);
            } else {
                showStatus(result.message || 'Verification failed. Please try again.', 'error');
                await getNewGesture();
            }
        } catch (error) {
            showStatus('Error during verification: ' + error.message, 'error');
        }
    }, 2000);
}

function resetVerification() {
    if (verificationInterval) {
        clearInterval(verificationInterval);
        verificationInterval = null;
    }
    if (timeoutTimer) {
        clearInterval(timeoutTimer);
        timeoutTimer = null;
    }
    verificationInProgress = false;
    startVerification.disabled = false;
    statusMessage.textContent = '';
    currentGesture = null;
    timeLeft = 10;
    updateTimerDisplay();
}

// Status display
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + (type === 'success' ? 'status-success' : 'status-error');
}

// Event listeners
closePopup.addEventListener('click', hideVerificationPopup);
cancelVerification.addEventListener('click', hideVerificationPopup);
startVerification.addEventListener('click', startVerificationProcess);

// Export the showVerificationPopup function
window.showVerificationPopup = showVerificationPopup; 