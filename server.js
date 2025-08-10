// server.js
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3700;

app.use(cors());
app.use(express.json());

const uri = 'mongodb+srv://chessashishrautela:Ip9efAjfFziy4WYV@cluster0.3g8fqtt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Array to store candidates data [candidateName, locationName]
let candidatesArray = [];

async function fetchElectionData() {
    const client = await MongoClient.connect(uri);
    const db = client.db('VOTING');
    const electionDoc = await db.collection('ELECTIONS').findOne();
    await client.close();

    const tempArray = [];
    if (electionDoc && electionDoc.locations) {
        for (const location of electionDoc.locations) {
            for (const candidate of location.candidates) {
                tempArray.push([candidate.name, location.locationName]); // Storing candidate.name and locationName
            }
        }
    }
    return tempArray;
}

// API endpoint to fetch and prepare the data
app.get("/get_data", async (req, res) => {
    try {
        candidatesArray = await fetchElectionData();
        console.log(`✅ Candidates fetched: ${candidatesArray.length}`);
        res.json({ message: "✅ Candidates fetched successfully!", candidates: candidatesArray });
    } catch (err) {
        console.error("❌ Error fetching candidates:", err);
        res.status(500).json({ error: "Failed to fetch candidates" });
    }
});



// API to just return prepared candidates
app.get("/candidates", (req, res) => {
    res.json({ candidates: candidatesArray });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});