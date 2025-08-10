document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const locationDisplay = document.getElementById('location');
    const evmContainer = document.querySelector('.evm-container');
    const castVoteBtn = document.getElementById('cast-vote-btn');
    const notaBtn = document.getElementById('nota-btn');
    const popupOverlay = document.querySelector('.popup-overlay');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const selectedPartyDisplay = document.getElementById('selected-party-name');
    const confirmationText = document.getElementById('confirmation-text');

    // State
    let selectedParty = null;
    let isNOTASelected = false;
    let locationName = ""; // Store location name for vote submission
    let hasAlreadyVoted = false; // Flag to track if user has already voted
    let candidatePhotos = {}; // Object to store candidate photos by name

    // Utility function to fetch data from the backend
    async function fetchData(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Network error:", error);
            return null;
        }
    }

    // Function to display location
    async function loc_dis() {
        const formData = JSON.parse(localStorage.getItem("formData"));
        const number = formData.num;
        const data = await fetchData(`http://localhost:3600/loc_name/${number}`);
        if (data) {
            locationName = data; // Store the location name for later use
            locationDisplay.innerText = data.toUpperCase();
            
            // Fetch candidate photos after getting location name
            await fetchCandidatePhotos(data);
        }
    }
    
    // Function to fetch candidate photos from our new backend API
    async function fetchCandidatePhotos(locationName) {
        try {
            // First get the election ID for the current election
            const electionsResponse = await fetch('http://localhost:4000/elections');
            if (!electionsResponse.ok) {
                throw new Error(`HTTP error! status: ${electionsResponse.status}`);
            }
            
            const elections = await electionsResponse.json();
            
            // Find the most recent election (or filter by location if needed)
            let currentElection = null;
            if (elections && elections.length > 0) {
                // Sort elections by creation date (newest first)
                const sortedElections = elections.sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
                
                // Find election with matching location
                currentElection = sortedElections.find(election => 
                    election.locations.some(loc => loc.locationName.toLowerCase() === locationName.toLowerCase())
                ) || sortedElections[0]; // Fallback to most recent if location not found
            }
            
            if (currentElection) {
                // Once we have the election, extract photos for this location
                const locationData = currentElection.locations.find(
                    loc => loc.locationName.toLowerCase() === locationName.toLowerCase()
                );
                
                if (locationData && locationData.candidates) {
                    // Create a mapping of candidate names to their photos
                    locationData.candidates.forEach(candidate => {
                        if (candidate.photoUrl) {
                            candidatePhotos[candidate.name] = candidate.photoUrl;
                        }
                    });
                    console.log("Loaded candidate photos:", candidatePhotos);
                }
            }
        } catch (error) {
            console.error("Error fetching candidate photos:", error);
        }
    }

    // Function to create candidate divs (modified to display photos)
    function createCandidateDivs(candidates) {
        evmContainer.innerHTML = ""; // Clear existing divs

        candidates.forEach((candidateObj, index) => {
            const candidateDiv = document.createElement("div");
            candidateDiv.classList.add("candidate");
            candidateDiv.setAttribute("data-party", candidateObj.name);
            
            // Create party info with name and party affiliation if available
            let partyInfo = candidateObj.name;
            if (candidateObj.party && candidateObj.party !== "Independent") {
                partyInfo += ` (${candidateObj.party})`;
            }
            
            // Check if we have a photo for this candidate
            const photoUrl = candidatePhotos[candidateObj.name];
            const photoHtml = photoUrl ? 
                `<img src="${photoUrl}" alt="${candidateObj.name}" class="party-symbol-img">` : 
                `<div class="party-symbol-text">${index + 1}</div>`;
            
            candidateDiv.innerHTML = `
                <div class="party-symbol">
                    ${photoHtml}
                </div>
                <div class="party-info">
                    <div class="party-name">${partyInfo}</div>
                </div>
                <div class="select-indicator"></div>
            `;
            
            // Only add click listeners if user hasn't voted yet
            if (!hasAlreadyVoted) {
                candidateDiv.addEventListener("click", () => handleCandidateSelection(candidateDiv, candidateObj.name));
            } else {
                candidateDiv.classList.add('disabled');
            }
            
            evmContainer.appendChild(candidateDiv);
        });
        
        // Add CSS for the candidate photos
        if (!document.getElementById('photo-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'photo-styles';
            styleEl.textContent = `
                .party-symbol {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background-color: #f0f0f0;
                    margin-right: 15px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                    border: 2px solid #ccc;
                }
                .party-symbol-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .party-symbol-text {
                    font-weight: bold;
                    color: var(--evm-gray);
                }
            `;
            document.head.appendChild(styleEl);
        }
    }

    // Handle candidate selection
    function handleCandidateSelection(candidateDiv, partyName) {
        // Prevent selection if already voted
        if (hasAlreadyVoted) {
            return;
        }
        
        // Deselect all candidates and NOTA
        document.querySelectorAll('.candidate').forEach(card => {
            card.classList.remove('selected');
        });
        notaBtn.classList.remove('selected');
        isNOTASelected = false;

        // Select the clicked candidate
        candidateDiv.classList.add('selected');
        selectedParty = partyName;
        castVoteBtn.disabled = false;
    }

    // Handle NOTA selection
    notaBtn.addEventListener('click', function() {
        // Prevent selection if already voted
        if (hasAlreadyVoted) {
            return;
        }
        
        // Deselect all candidates
        document.querySelectorAll('.candidate').forEach(card => {
            card.classList.remove('selected');
        });

        // Toggle NOTA selection
        if (isNOTASelected) {
            notaBtn.classList.remove('selected');
            selectedParty = null;
            castVoteBtn.disabled = true;
            isNOTASelected = false;
        } else {
            notaBtn.classList.add('selected');
            selectedParty = "NOTA";
            castVoteBtn.disabled = false;
            isNOTASelected = true;
        }
    });

    // Fetch and display candidates by number
    async function candidate() {
        const formData = JSON.parse(localStorage.getItem("formData"));
        const number = formData.num;
        const data = await fetchData(`http://localhost:3600/number/${number}`);
        if (data) {
            const candidates = Array.from({ length: data }, (_, i) => ({ name: `Party ${i + 1}` }));
            createCandidateDivs(candidates);
        }
    }

    // Fetch and display candidates by name
    async function name_can() {
        const formData = JSON.parse(localStorage.getItem("formData"));
        const number = formData.num;
        const data = await fetchData(`http://localhost:3600/name/${number}`);
        if (data) {
            createCandidateDivs(data);
        }
    }

    // Check if user has already voted - improved version
    async function checkVoteStatus() {
        const formData = JSON.parse(localStorage.getItem("formData"));
        const number = formData.num;
        try {
            const response = await fetch(`http://localhost:3600/check/${number}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const voteStatus = await response.text();
            hasAlreadyVoted = voteStatus === "1";
            
            if (hasAlreadyVoted) {
                // User has already voted, disable the entire interface
                disableVotingInterface();
                displayAlreadyVotedMessage();
            }
        } catch (error) {
            console.error("Error checking vote status:", error);
            // Handle error gracefully - could show a message or retry
        }
    }
    
    // Function to disable the voting interface
    function disableVotingInterface() {
        // Disable all candidate divs
        document.querySelectorAll('.candidate').forEach(card => {
            card.removeEventListener("click", handleCandidateSelection);
            card.classList.add('disabled');
        });
        
        // Disable NOTA button
        notaBtn.removeEventListener('click', handleCandidateSelection);
        notaBtn.classList.add('disabled');
        
        // Disable cast vote button
        castVoteBtn.disabled = true;
    }
    
    // Function to display already voted message
    function displayAlreadyVotedMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('already-voted-message');
        messageDiv.textContent = "You have already cast your vote for this election.";
        messageDiv.style.color = 'red';
        messageDiv.style.fontWeight = 'bold';
        messageDiv.style.padding = '10px';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.marginTop = '20px';
        
        // Insert the message before the EVM container
        evmContainer.parentNode.insertBefore(messageDiv, evmContainer);
    }

    // Handle cast vote button click
    castVoteBtn.addEventListener('click', function() {
        // Double-check that user hasn't already voted
        if (hasAlreadyVoted) {
            alert("You have already cast your vote. Multiple voting is not allowed.");
            return;
        }
        
        if (selectedParty) {
            // Show confirmation popup
            selectedPartyDisplay.textContent = selectedParty;
            confirmationText.textContent = selectedParty === "NOTA" 
                ? "Are you sure you want to select:" 
                : "Are you sure you want to vote for:";
            popupOverlay.style.display = 'flex';
        }
    });

    // Handle confirmation: Send vote data to the backend
    confirmBtn.addEventListener('click', async function() {
        popupOverlay.style.display = 'none';

        // Final check that user hasn't already voted
        if (hasAlreadyVoted) {
            alert("Your vote cannot be processed as you have already voted.");
            return;
        }

        if (selectedParty) {
            try {
                const formData = JSON.parse(localStorage.getItem("formData"));
                const voterID = formData.num;
                
                // Check one more time with the server if the user has already voted
                const checkResponse = await fetch(`http://localhost:3600/check/${voterID}`);
                if (!checkResponse.ok) {
                    throw new Error(`HTTP error! status: ${checkResponse.status}`);
                }
                
                const voteStatus = await checkResponse.text();
                if (voteStatus === "1") {
                    hasAlreadyVoted = true;
                    disableVotingInterface();
                    displayAlreadyVotedMessage();
                    alert("You have already cast your vote. Multiple voting is not allowed.");
                    return;
                }
                  
                // First, send the vote to backend
                const voteResponse = await fetch('http://localhost:3300/cast_vote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        locationName: locationName, // Use stored location name
                        partyName: selectedParty
                    })
                });

                if (!voteResponse.ok) {
                    throw new Error(`HTTP error! status: ${voteResponse.status}`);
                }

                // Success: show a success message
                const result = await voteResponse.json();
                console.log(result.message);
                
                // Update the vote check in the database
                const updateCheckResponse = await fetch(`http://localhost:3600/update_vote_check/${voterID}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ vote: "1" })
                });
                
                if (!updateCheckResponse.ok) {
                    console.warn("Vote recorded but vote check not updated");
                }

                // Update local state
                hasAlreadyVoted = true;
                disableVotingInterface();
                
                // Show success message to user
                alert("Thank you! Your vote has been successfully cast.");
                
                // Redirect to home page or thank you page after successful vote
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 2000);

            } catch (error) {
                console.error("Error while casting vote:", error);
                alert("There was an error casting your vote. Please try again.");
            }
        }

        // Reset the EVM
        resetEVM();
    });

    // Handle cancellation
    cancelBtn.addEventListener('click', function() {
        popupOverlay.style.display = 'none';
    });

    // Reset the EVM after voting
    function resetEVM() {
        document.querySelectorAll('.candidate').forEach(card => {
            card.classList.remove('selected');
        });
        notaBtn.classList.remove('selected');
        selectedParty = null;
        isNOTASelected = false;
        castVoteBtn.disabled = true;
    }

    // Initialize the page - reordered to check vote status first
    (async function initialize() {
        // First check if user has already voted
        await checkVoteStatus();
        
        // Then load location and photos
        await loc_dis();
        
        // Apply candidates only if needed
        if (!hasAlreadyVoted) {
            await candidate();
            await name_can();
            
            // Initialize voice monitoring
            if (window.startVoiceMonitoring) {
                window.startVoiceMonitoring();
            }
        } else {
            // Just fetch candidate info for display purposes, but will be disabled
            await name_can();
        }
    })();
});