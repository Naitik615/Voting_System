import { dvote_backend } from "../declarations/dvote_backend";

window.addEventListener("load", async () => {
    async function getResults() {
        let result;
        if (!dvote_backend) {
            console.error("Error: dvote_backend is not initialized");
          } else {
            // Proceed with calling addCandidate
            result = await dvote_backend.getResults();
          }
        console.log("Results from blockchain:", result);
    }

    getResults();

    // optional: button to trigger adding manually from frontend
    document.getElementById("addButton").addEventListener("click", async () => {
        try {
            const response = await fetch("http://localhost:3700/get_data");
            const data = await response.json();
            console.log(data);
            alert("✅ Data fetched and candidates added successfully!");
        } catch (error) {
            console.error("❌ Error:", error);
        }
    });
});