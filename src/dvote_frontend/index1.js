const form = document.getElementById("form");
const submitBtn = document.getElementById("submit-btn");
const voiceBtn = document.getElementById("voiceBtn");
const langBtn = document.getElementById("langBtn");
const langDropdown = document.querySelector(".lang-dropdown");
let currentLang = "en";
let recognition;
let isListening = false;
let spokenNumbers = "";
let isSpeaking = false;
let listenerTimeout;
let greetingTimeout;

// Language selector functionality
langBtn.addEventListener("click", () => {
    langDropdown.classList.toggle("show");
});

document.addEventListener("click", (e) => {
    if (!e.target.closest(".language-selector")) {
        langDropdown.classList.remove("show");
    }
});

document.querySelectorAll(".lang-option").forEach((option) => {
    option.addEventListener("click", (e) => {
        currentLang = e.target.dataset.lang;
        langDropdown.classList.remove("show");
        updateUIForLanguage();
    });
});

// Voice recognition setup
voiceBtn.addEventListener("click", startVoiceAssistant);

function startVoiceAssistant() {
    if (!("webkitSpeechRecognition" in window)) {
        alert("Speech recognition is not supported in your browser.");
        return;
    }

    // Reset any existing state
    spokenNumbers = "";
    isListening = false;
    isSpeaking = false;
    
    // Clear any existing timeouts
    if (listenerTimeout) clearTimeout(listenerTimeout);
    if (greetingTimeout) clearTimeout(greetingTimeout);

    // Initialize recognition
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentLang === "en" ? "en-US" : "hi-IN";

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        processSpokenNumbers(transcript);
    };

    recognition.onend = () => {
        isListening = false;
        voiceBtn.textContent = "🎤 Start Voice Input";
    };

    // Start the greeting immediately
    speakGreeting();
}

function speakGreeting() {
    if (isSpeaking) return;
    
    isSpeaking = true;
    const greeting =
        currentLang === "en"
            ? "Welcome to the voting system. Please speak your 12-digit Aadhaar number slowly, with a small pause between each digit."
            : "मतदान प्रणाली में आपका स्वागत है। कृपया अपना 12 अंकों का आधार नंबर धीरे-धीरे बोलें, प्रत्येक अंक के बीच थोड़ा विराम देकर।";

    const speech = new SpeechSynthesisUtterance(greeting);
    speech.lang = currentLang === "en" ? "en-US" : "hi-IN";
    
    speech.onend = () => {
        isSpeaking = false;
        // Start listening after 8 seconds from greeting start
        greetingTimeout = setTimeout(() => {
            startListening();
        }, 500);
    };
    
    window.speechSynthesis.speak(speech);
}

function startListening() {
    if (isListening) return;
    
    isListening = true;
    voiceBtn.textContent = "🎤 Listening...";
    recognition.start();

    // Stop listening after 10 seconds
    listenerTimeout = setTimeout(() => {
        if (isListening) {
            recognition.stop();
            isListening = false;
            voiceBtn.textContent = "🎤 Start Voice Input";
            
            // If not enough numbers were spoken, show error
            if (spokenNumbers.length < 12) {
                alert(
                    currentLang === "en"
                        ? "Please try speaking your Aadhaar number again."
                        : "कृपया अपना आधार नंबर फिर से बोलें।"
                );
            }
        }
    }, 10000);
}

function processSpokenNumbers(transcript) {
    const numbers = transcript.match(/\d/g);
    if (numbers) {
        numbers.forEach((num) => {
            if (spokenNumbers.length < 12) {
                spokenNumbers += num;
                const aadharInput = document.getElementById("aadhar");
                if (aadharInput) {
                    aadharInput.value = spokenNumbers;
                }
            }
        });

        if (spokenNumbers.length === 12) {
            // Clear timeouts and stop listening
            if (listenerTimeout) clearTimeout(listenerTimeout);
            if (greetingTimeout) clearTimeout(greetingTimeout);
            recognition.stop();
            form.dispatchEvent(new Event("submit"));
        }
    }
}

function updateUIForLanguage() {
    const labels = {
        en: {
            aadhar: "Enter your Aadhaar Number:",
            submit: "Submit",
            voice: "Start Voice Input",
        },
        hi: {
            aadhar: "अपना आधार नंबर दर्ज करें:",
            submit: "जमा करें",
            voice: "वॉइस इनपुट शुरू करें",
        },
    };

    document.querySelector('label[for="aadhar"]').textContent =
        labels[currentLang].aadhar;
    submitBtn.textContent = labels[currentLang].submit;
    voiceBtn.textContent = labels[currentLang].voice;
}

// Existing form submission logic
form.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Disable button to prevent multiple submissions
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying...";

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });

    const number = data.aadhar;

    try {
        const response = await fetch(`http://localhost:3000/check/${number}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            // Update local storage
            localStorage.setItem("formData", JSON.stringify({ num: number }));
            
            // Show verification popup using the proper function
            window.showVerificationPopup();

            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = labels[currentLang].submit;
        } else {
            alert(
                currentLang === "en"
                    ? "Invalid Aadhaar number. Please try again."
                    : "अमान्य आधार नंबर। कृपया पुनः प्रयास करें।"
            );
            submitBtn.disabled = false;
            submitBtn.textContent = labels[currentLang].submit;
        }
    } catch (error) {
        console.error("Network error:", error);
        submitBtn.disabled = false;
        submitBtn.textContent = labels[currentLang].submit;
    }
}); 