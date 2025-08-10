// Voting timer functionality
let votingTimer = null;
let votingTimeLeft = 20;
let alertTimer = null;
let alertTimeLeft = 15;

// Add face monitor initialization
let faceMonitor = null;

// Function to update the timer display
function updateVotingTimerDisplay() {
    const timerDisplay = document.getElementById('voting-timer');
    if (timerDisplay) {
        timerDisplay.textContent = `Time remaining to vote: ${votingTimeLeft} seconds`;
        
        // Change color to red when time is running low
        if (votingTimeLeft <= 5) {
            timerDisplay.style.color = 'red';
        }
    }
}

// Function to start the voting timer
function startVotingTimer() {
    // Clear any existing timers
    if (votingTimer) {
        clearInterval(votingTimer);
    }
    
    votingTimeLeft = 20;
    updateVotingTimerDisplay();
    
    // Initialize and start face monitoring
    initializeFaceMonitor().then(() => {
        if (faceMonitor) {
            faceMonitor.startMonitoring();
        }
    });
    
    votingTimer = setInterval(() => {
        votingTimeLeft--;
        updateVotingTimerDisplay();
        
        if (votingTimeLeft <= 0) {
            clearInterval(votingTimer);
            // Stop face monitoring
            if (faceMonitor) {
                faceMonitor.stopMonitoring();
            }
            // Automatically cast NOTA vote
            castNOTAVote();
        }
    }, 1000);
}

// Function to cast NOTA vote
async function castNOTAVote() {
    try {
        const formData = JSON.parse(localStorage.getItem("formData"));
        const voterID = formData.num;
        const locationName = document.getElementById('location').textContent;
        
        // First, try to add NOTA as a candidate if it doesn't exist
        try {
            const response = await fetch('http://localhost:3300/add_nota', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    locationName: locationName
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to add NOTA candidate');
            }
        } catch (error) {
            console.error("Error adding NOTA candidate:", error);
        }
        
        // Now cast the vote
        const voteResponse = await fetch('http://localhost:3300/cast_vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                locationName: locationName,
                partyName: "NOTA"
            })
        });
        
        const updateCheckResponse = await fetch(`http://localhost:3600/update_vote_check/${voterID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vote: "1" })
        });
        
        if (voteResponse.ok) {
            alert("Your vote has been automatically cast as NOTA due to time limit.");
            window.location.href = "index.html";
        } else {
            throw new Error('Failed to cast NOTA vote');
        }
    } catch (error) {
        console.error("Error casting NOTA vote:", error);
        alert("Error casting vote. Please try again.");
    }
}

// Function to show initial alert
function showVotingAlert() {
    const formData = JSON.parse(localStorage.getItem("formData"));
    const username = formData.name || "Voter";
    
    if (confirm(`${username}, you have 20 seconds to cast your vote. If you don't vote within this time, your vote will be counted as NOTA. Click OK to proceed to voting.`)) {
        startVotingTimer();
    } else {
        // Start alert timer for redirect
        alertTimer = setInterval(() => {
            alertTimeLeft--;
            if (alertTimeLeft <= 0) {
                clearInterval(alertTimer);
                window.location.href = "index.html";
            }
        }, 1000);
    }
}

// Initialize the voting timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add timer display to the page
    const timerContainer = document.createElement('div');
    timerContainer.id = 'voting-timer';
    timerContainer.style.textAlign = 'center';
    timerContainer.style.fontSize = '1.2em';
    timerContainer.style.fontWeight = 'bold';
    timerContainer.style.margin = '10px 0';
    document.querySelector('.evm-machine').prepend(timerContainer);
    
    // Show the initial alert
    showVotingAlert();
});

async function initializeFaceMonitor() {
    try {
        faceMonitor = new FaceMonitor();
        await faceMonitor.initialize();
        // API key is now set from config.js
    } catch (error) {
        console.error('Failed to initialize face monitor:', error);
        // Continue without face monitoring if initialization fails
    }
}

// Modify stopVotingTimer to include face monitoring cleanup
function stopVotingTimer() {
    // ... existing code ...
    
    // Stop face monitoring
    if (faceMonitor) {
        faceMonitor.stopMonitoring();
    }
    
    // ... existing code ...
} 