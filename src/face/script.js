const express = require('express');
const axios = require('axios');
const path = require('path');

class FaceRecognitionService {
    constructor() {
        this.pythonServiceUrl = 'http://127.0.0.1:5000';
    }

    async verifyFace() {
        try {
            const response = await axios.post(`${this.pythonServiceUrl}/capture`);
            return response.data;
        } catch (error) {
            console.error('Error contacting face recognition service:', error.message);
            return { verified: false, error: error.message };
        }
    }
}

// Create Express app
const app = express();
const port = 3000;
const faceService = new FaceRecognitionService();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/verify', async (req, res) => {
    const result = await faceService.verifyFace();
    res.json(result);
});

// Start server
app.listen(port, () => {
    console.log(`Face recognition service running at http://localhost:${port}`);
});

// Export the service for use in other parts of your application
module.exports = { FaceRecognitionService };

