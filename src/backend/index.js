const express = require("express");
const { connectToDb, getDb } = require("./db-data.js");
const cors = require("cors");
const app = express();
const port = 3600;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Database connection
let db;
connectToDb((err) => {
    if (!err) {
        app.listen(port, () => {
            console.log(`✅ Server running on port ${port}`);
            console.log(`✅ MongoDB connected successfully`);
        });
        db = getDb();
    } else {
        console.error("❌ Database connection error:", err);
        process.exit(1); // Exit the process if we can't connect to the database
    }
});

// Middleware to check database connection
const checkDbConnection = (req, res, next) => {
    if (!db) {
        return res.status(503).json({ 
            error: "Service unavailable",
            message: "Database connection not established"
        });
    }
    next();
};

// Apply database connection check to all routes
app.use(checkDbConnection);

// Helper function to find location by pincode with caching
const locationCache = new Map(); // Simple in-memory cache
async function findLocationByPincode(pincode) {
    try {
        // Check cache first
        if (locationCache.has(pincode)) {
            console.log(`Cache hit for pincode: ${pincode}`);
            return locationCache.get(pincode);
        }

        console.log(`Looking up location for pincode: ${pincode}`);
        const election = await db.collection('ELECTIONS').findOne({
            "locations.pinCode": pincode
        });

        if (!election) {
            console.log(`No election found for pincode: ${pincode}`);
            return null;
        }

        const location = election.locations.find(loc => loc.pinCode === pincode);
        
        if (location) {
            // Store in cache for 5 minutes
            locationCache.set(pincode, location);
            setTimeout(() => locationCache.delete(pincode), 5 * 60 * 1000);
        }
        
        return location || null;
    } catch (err) {
        console.error("Error in findLocationByPincode:", err);
        throw err;
    }
}

// Get location name by Aadhaar ID
app.get("/loc_name/:id", async (req, res) => {
    try {
        const id = req.params.id;
        console.log(`Fetching location for Aadhaar ID: ${id}`);
        
        const aadhaarDoc = await db.collection('ADHAAR').findOne({ id });
        if (!aadhaarDoc) {
            console.log(`Aadhaar ID ${id} not found`);
            return res.status(404).json({ 
                error: "Not Found", 
                message: "Aadhaar ID not found" 
            });
        }

        console.log(`Found Aadhaar document with location: ${aadhaarDoc.location}`);
        const location = await findLocationByPincode(aadhaarDoc.location);
        
        if (!location) {
            console.log(`Location not found for pincode: ${aadhaarDoc.location}`);
            return res.status(404).json({ 
                error: "Not Found", 
                message: "Location not found for this Aadhaar ID" 
            });
        }

        console.log(`Sending location name: ${location.locationName}`);
        res.json(location.locationName);
    } catch (err) {
        console.error("Error in /loc_name endpoint:", err);
        res.status(500).json({ 
            error: "Internal Server Error",
            message: err.message 
        });
    }
});

// Get number of candidates by Aadhaar ID
app.get("/number/:id", async (req, res) => {
    try {
        const id = req.params.id;
        console.log(`Fetching candidate count for Aadhaar ID: ${id}`);
        
        const aadhaarDoc = await db.collection('ADHAAR').findOne({ id });
        if (!aadhaarDoc) {
            return res.status(404).json({ 
                error: "Not Found", 
                message: "Aadhaar ID not found" 
            });
        }

        const location = await findLocationByPincode(aadhaarDoc.location);
        if (!location) {
            return res.status(404).json({ 
                error: "Not Found", 
                message: "Location not found for this Aadhaar ID" 
            });
        }

        console.log(`Found ${location.candidates.length} candidates`);
        res.json(location.candidates.length);
    } catch (err) {
        console.error("Error in /number endpoint:", err);
        res.status(500).json({ 
            error: "Internal Server Error",
            message: err.message 
        });
    }
});

// Get candidate details by Aadhaar ID
app.get("/name/:id", async (req, res) => {
    try {
        const id = req.params.id;
        console.log(`Fetching candidates for Aadhaar ID: ${id}`);
        
        const aadhaarDoc = await db.collection('ADHAAR').findOne({ id });
        if (!aadhaarDoc) {
            return res.status(404).json({ 
                error: "Not Found", 
                message: "Aadhaar ID not found" 
            });
        }

        const location = await findLocationByPincode(aadhaarDoc.location);
        if (!location) {
            return res.status(404).json({ 
                error: "Not Found", 
                message: "Location not found for this Aadhaar ID" 
            });
        }

        // Format candidates data for frontend
        const candidates = location.candidates.map(candidate => ({
            name: candidate.name,
            photo: candidate.photo || null,
            id: candidate.id || null,
            party: candidate.party || "Independent"
        }));

        console.log(`Sending ${candidates.length} candidates`);
        res.json(candidates);
    } catch (err) {
        console.error("Error in /name endpoint:", err);
        res.status(500).json({ 
            error: "Internal Server Error",
            message: err.message 
        });
    }
});

// Check if voter has already voted
app.get("/check/:id", async (req, res) => {
    try {
        const id = req.params.id;
        console.log(`Checking vote status for ID: ${id}`);
        
        const voteCheckDoc = await db.collection('VOTE_CHECK').findOne({ id });
        
        if (!voteCheckDoc) {
            console.log(`No vote record found for ID: ${id}`);
            return res.status(200).send("0");
        }

        const hasVoted = voteCheckDoc.vote === "1";
        console.log(`Vote status for ${id}: ${hasVoted ? "Voted" : "Not voted"}`);
        res.status(200).send(hasVoted ? "1" : "0");
    } catch (err) {
        console.error("Error in /check endpoint:", err);
        res.status(500).json({ 
            error: "Internal Server Error",
            message: err.message 
        });
    }
});

// Cast vote endpoint
app.post("/cast_vote", async (req, res) => {
    const { locationName, partyName } = req.body;
  
    // Validate input
    if (!locationName || !partyName) {
        return res.status(400).json({ 
            error: "Bad Request", 
            message: "Both locationName and partyName are required" 
        });
    }

    try {
        console.log(`Casting vote for location: ${locationName}, party: ${partyName}`);
        
        // Use upsert operation to handle both cases: new vote or update existing vote
        const result = await db.collection("VOTES").updateOne(
            { location: locationName, candidate: partyName },
            { $inc: { votes: 1 } },
            { upsert: true }
        );
  
        if (result.matchedCount === 0 && result.upsertedCount === 0) {
            console.error("Failed to update or insert vote");
            return res.status(500).json({ 
                error: "Internal Server Error", 
                message: "Failed to process vote" 
            });
        }
        
        if (result.upsertedCount === 1) {
            console.log(`Created new vote record for ${locationName}, ${partyName}`);
        } else {
            console.log(`Updated existing vote record for ${locationName}, ${partyName}`);
        }
        
        res.status(200).json({ 
            success: true,
            message: "Vote successfully cast!" 
        });
    } catch (error) {
        console.error("❌ Error casting vote:", error);
        res.status(500).json({ 
            error: "Internal Server Error", 
            message: "Error processing vote" 
        });
    }
});

// Update voter status endpoint
app.post("/update_vote_check/:id", async (req, res) => {
    const id = req.params.id;
    const { vote } = req.body;
    
    if (!vote) {
        return res.status(400).json({ 
            error: "Bad Request", 
            message: "Vote status is required" 
        });
    }
    
    try {
        console.log(`Updating vote check status for ID: ${id}`);
        
        const result = await db.collection('VOTE_CHECK').updateOne(
            { id },
            { $set: { 
                vote,
                timestamp: new Date().toISOString() 
            }},
            { upsert: true }
        );
        
        console.log(`Vote check status updated for ${id}`);
        res.status(200).json({ 
            success: true,
            message: "Vote status updated successfully" 
        });
    } catch (err) {
        console.error("Error updating vote check status:", err);
        res.status(500).json({ 
            error: "Internal Server Error",
            message: err.message 
        });
    }
});

// Get vote counts (useful for reporting)
app.get("/vote_counts", async (req, res) => {
    try {
        const voteCounts = await db.collection('VOTES').find().toArray();
        res.status(200).json(voteCounts);
    } catch (err) {
        console.error("Error getting vote counts:", err);
        res.status(500).json({ 
            error: "Internal Server Error",
            message: err.message 
        });
    }
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "OK",
        dbConnected: !!db,
        timestamp: new Date().toISOString()
    });
});

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({ 
        error: "Not Found",
        message: "The requested resource was not found" 
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ 
        error: "Internal Server Error",
        message: process.env.NODE_ENV === 'development' ? err.message : "An unexpected error occurred"
    });
});

module.exports = app;