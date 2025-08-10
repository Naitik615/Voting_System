// Face monitoring system for voting security
class FaceMonitor {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.isMonitoring = false;
        this.intervalId = null;
        this.alertContainer = null;
        this.alertSound = null;
        this.alertCount = 0;
        this.MAX_ALERTS = 3;
        this.API_KEY = window.config.OPENAI_API_KEY;
        this.API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
        this.lastFrame = null;
        this.maliciousCount = 0;
    }

    async initialize() {
        try {
            // Create video element
            this.video = document.createElement('video');
            this.video.autoplay = true;
            this.video.style.display = 'none';
            document.body.appendChild(this.video);

            // Create canvas for capturing frames
            this.canvas = document.createElement('canvas');
            this.canvas.style.display = 'none';
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');

            // Create alert container
            this.alertContainer = document.createElement('div');
            this.alertContainer.className = 'face-alert-container';
            document.body.appendChild(this.alertContainer);

            // Create alert sound
            this.alertSound = new Audio('alert-sound.mp3');

            // Get camera access
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = this.stream;
            await this.video.play();

            // Set canvas dimensions to match video
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            });

            console.log('Face monitoring system initialized');
        } catch (error) {
            console.error('Error initializing face monitor:', error);
            throw error;
        }
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this.alertCount = 0;

        // Capture and analyze frame every second
        this.intervalId = setInterval(async () => {
            try {
                // Capture frame
                this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                const imageData = this.canvas.toDataURL('image/jpeg', 0.8);

                // Analyze frame
                const result = await this.analyzeFrame(imageData);
                
                // Handle result
                if (result === 'malicious') {
                    this.handleMaliciousActivity();
                }
            } catch (error) {
                console.error('Error in face monitoring:', error);
            }
        }, 200);

        console.log('Face monitoring started');
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;
        this.isMonitoring = false;
        clearInterval(this.intervalId);
        
        // Clean up
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.video) {
            this.video.srcObject = null;
        }
        
        console.log('Face monitoring stopped');
    }

    async analyzeFrame(imageData) {
        try {
            // For testing, we'll use a simpler approach
            // Instead of sending the image, we'll generate a random result
            // This simulates the API response without actually making the call
            const randomResult = Math.random() < 0.95 ? 'safe' : 'malicious';
            
            // Log the result for testing purposes
            console.log(`Frame analysis result: ${randomResult}`);
            
            return randomResult;

            // Uncomment this code when you want to switch to the actual API
            /*
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo", // Using cheaper model for testing
                    messages: [
                        {
                            role: "user",
                            content: "Analyze this image for any signs of fear, crying, threats, or dangerous activity. Respond with only one word: 'safe' or 'malicious'."
                        }
                    ],
                    max_tokens: 10
                })
            });

            const data = await response.json();
            return data.choices[0].message.content.toLowerCase().trim();
            */
        } catch (error) {
            console.error('Error analyzing frame:', error);
            return 'safe'; // Default to safe on error
        }
    }

    handleMaliciousActivity() {
        this.maliciousCount++;
        
        if (this.maliciousCount >= 2) {
            this.stopMonitoring();
            
            const finalAlert = document.createElement('div');
            finalAlert.className = 'face-alert final-alert';
            finalAlert.textContent = '⚠️ Multiple suspicious activities detected! Redirecting to login...';
            this.alertContainer.appendChild(finalAlert);
            
            this.alertSound.play().catch(error => console.error('Error playing alert sound:', error));
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            
            return;
        }

        this.alertSound.play().catch(error => console.error('Error playing alert sound:', error));

        const alert = document.createElement('div');
        alert.className = 'face-alert';
        alert.textContent = `⚠️ Suspicious activity detected! (${this.maliciousCount}/2)`;
        
        this.alertContainer.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Add styles for alerts
const style = document.createElement('style');
style.textContent = `
    .face-alert-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
    }

    .face-alert {
        background-color: #ff4444;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        margin-bottom: 10px;
        animation: slideIn 0.5s ease-out;
    }

    .final-alert {
        background-color: #ff0000;
        font-weight: bold;
        animation: pulse 1s infinite;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
        100% {
            transform: scale(1);
        }
    }
`;
document.head.appendChild(style);

// Export the FaceMonitor class
window.FaceMonitor = FaceMonitor; 