// Voice monitoring functionality
let voiceRecognition = null;
let isMonitoring = false;
let threatCount = 0;
const threateningWords = [
    'kill', 'murder', 'attack', 'bomb', 'gun', 'weapon', 'violence', 'danger',
    'terror', 'terrorist', 'hate', 'death', 'harm', 'hurt', 'injure', 'assault',
    'mustvote', 'havetovote', 'nochoice', 'onlyoption', 'orelse',
    'votehim', 'voteher', 'votethisteam', 'voteforus', 'voteforthem',
    'voteorelse', 'voteorsuffer', 'voteorfaceconsequences',

    //'consequences', 'you will regret it', 'we are watching', 'be smart',
    //'do the right thing', 'support us', 'remember whose in charge',
    //'betrayal', 'obligation', 'respect', 'honor', 'trust', 'we helped you',
    //'disappointed', 'you dont want trouble', 'you are not safe', 'you will pay',
    //'you will regret', 'you will be sorry', 'you will pay the price',
    //'you will pay the consequences', 'you will pay the ultimate price',    

    //'vote against', 'vote wrong', 'vote differently', 'vote another way',
    //'vote or die', 'vote or else', 'vote or suffer', 'vote or face',
    //'vote or pay', 'vote or regret', 'vote or consequences',
    //'vote or punishment', 'vote or retaliation', 'vote or revenge'
];

// Function to check if a word is a real threat
function isRealThreat(word, transcript) {
    // Convert to lowercase for case-insensitive comparison
    const lowerTranscript = transcript.toLowerCase();
    const lowerWord = word.toLowerCase();
    
    // Check for exact word match with word boundaries
    const wordRegex = new RegExp(`\\b${lowerWord}\\b`, 'i');
    if (!wordRegex.test(lowerTranscript)) {
        return false;
    }
    
    // Check for common false positives with improved patterns
    const falsePositives = {
        'kill': ['skill', 'kiln', 'kilogram', 'killing time', 'killing it', 'killing me'],
        'gun': ['begun', 'gunner', 'gunnery', 'gunpowder', 'gunning for'],
        'bomb': ['bombay', 'bombastic', 'bombarded', 'bombing the test'],
        'hate': ['hateful', 'hater', 'hate crime', 'hate speech'],
        'death': ['deathly', 'deathbed', 'death penalty', 'death rate'],
        'vote': ['vote of confidence', 'vote of thanks', 'vote of appreciation'],
        'attack': ['heart attack', 'panic attack', 'attack of nerves'],
        'harm': ['harmless', 'harmony', 'harmful', 'harm reduction'],
        'hurt': ['hurt feelings', 'hurt pride', 'hurt ego']
    };
    
    // Check for false positives with context
    if (falsePositives[word]) {
        for (const falsePositive of falsePositives[word]) {
            const falsePositiveRegex = new RegExp(`\\b${falsePositive}\\b`, 'i');
            if (falsePositiveRegex.test(lowerTranscript)) {
                return false;
            }
        }
    }
    
    // Check for context around the word
    const contextRegex = new RegExp(`\\b(?:don't|do not|should not|must not|never)\\s+${lowerWord}\\b`, 'i');
    if (contextRegex.test(lowerTranscript)) {
        return false; // Negative context often indicates non-threatening usage
    }
    
    return true;
}

// Function to initialize voice recognition
function initializeVoiceRecognition() {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error('Speech recognition not supported in this browser');
        return false;
    }

    try {
        voiceRecognition = new SpeechRecognition();
        voiceRecognition.continuous = true;
        voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'en-US';

        voiceRecognition.onstart = function() {
            console.log('Voice recognition started');
            isMonitoring = true;
        };

        voiceRecognition.onend = function() {
            console.log('Voice recognition ended');
            if (isMonitoring) {
                // Restart recognition if it ended unexpectedly
                setTimeout(() => {
                    if (voiceRecognition && isMonitoring) {
                        voiceRecognition.start();
                    }
                }, 1000);
            }
        };

        voiceRecognition.onresult = function(event) {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');

            // Check for threatening words with improved accuracy
            threateningWords.forEach(word => {
                if (isRealThreat(word, transcript)) {
                    console.log(`Threatening word detected: ${word}`);
                    threatCount++;
                    showThreatAlert(word, threatCount);
                }
            });
        };

        voiceRecognition.onerror = function(event) {
            console.error('Voice recognition error:', event.error);
            if (event.error === 'not-allowed') {
                console.error('Microphone access denied');
                showPermissionError();
            } else if (isMonitoring) {
                // Attempt to restart recognition if there's an error
                setTimeout(() => {
                    if (voiceRecognition && isMonitoring) {
                        voiceRecognition.start();
                    }
                }, 1000);
            }
        };

        return true;
    } catch (error) {
        console.error('Error initializing voice recognition:', error);
        return false;
    }
}

// Function to show threat alert
function showThreatAlert(threateningWord, count) {
    // Stop voice monitoring if this is the 4th threat
    if (count >= 4) {
        if (voiceRecognition && isMonitoring) {
            voiceRecognition.stop();
            isMonitoring = false;
        }

        // Create and show final warning popup
        const popup = document.createElement('div');
        popup.className = 'threat-alert-popup';
        popup.innerHTML = `
            <div class="threat-alert-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Security Alert</h3>
                <p>Multiple threatening words detected (${count} times)</p>
                <p>You will be logged out in 2 seconds for security reasons.</p>
            </div>
        `;
        document.body.appendChild(popup);

        // Remove popup and redirect after 2 seconds
        setTimeout(() => {
            popup.remove();
            // Clear any stored data
            localStorage.clear();
            // Redirect to index page
            window.location.href = "index.html";
        }, 2000);
    } else {
        // Show warning for first three threats
        const popup = document.createElement('div');
        popup.className = 'threat-alert-popup';
        popup.innerHTML = `
            <div class="threat-alert-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Security Warning</h3>
                <p>Threatening word detected: "${threateningWord}"</p>
                <p>Warning ${count} of 3. Please maintain a respectful environment.</p>
            </div>
        `;
        document.body.appendChild(popup);

        // Remove popup after 3 seconds
        setTimeout(() => {
            popup.remove();
        }, 3000);
    }
}

// Function to show permission error
function showPermissionError() {
    const popup = document.createElement('div');
    popup.className = 'threat-alert-popup';
    popup.innerHTML = `
        <div class="threat-alert-content">
            <i class="fas fa-microphone-slash"></i>
            <h3>Microphone Access Required</h3>
            <p>Please enable microphone access to continue.</p>
            <p>Click the microphone icon in your browser's address bar to allow access.</p>
        </div>
    `;
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.remove();
    }, 5000);
}

// Function to start voice monitoring
function startVoiceMonitoring() {
    if (!voiceRecognition) {
        if (!initializeVoiceRecognition()) {
            showPermissionError();
            return;
        }
    }
    
    if (voiceRecognition && !isMonitoring) {
        // Request microphone permission
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                voiceRecognition.start();
                isMonitoring = true;
                threatCount = 0; // Reset threat count when starting new monitoring
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                showPermissionError();
            });
    }
}

// Function to stop voice monitoring
function stopVoiceMonitoring() {
    if (voiceRecognition && isMonitoring) {
        voiceRecognition.stop();
        isMonitoring = false;
        threatCount = 0; // Reset threat count when stopping monitoring
    }
}

// Export functions
window.startVoiceMonitoring = startVoiceMonitoring;
window.stopVoiceMonitoring = stopVoiceMonitoring; 