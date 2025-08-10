const express = require("express");
const cors = require("cors");
const { connectToDb, getDb } = require("./db.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 4000;

// Configure file upload storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

let db;

connectToDb((err) => {
  if (!err) {
    app.listen(port, () => {
      console.log("✅ Server is listening on port 4000");
    });
    db = getDb();
  } else {
    console.log("❌ Error connecting to database:", err);
  }
});

// POST /elections — handle form submission and image upload
app.post("/elections", upload.array("candidatePhotos"), (req, res) => {
  try {
    const formData = JSON.parse(req.body.data);
    const files = req.files;
    
    // Get the server base URL for absolute photo URLs
    const serverBaseUrl = `${req.protocol}://${req.get('host')}`;
    
    let fileIndex = 0;
    const locations = formData.locations.map((location) => {
      const candidates = location.candidates.map((candidate) => {
        const photoFile = files[fileIndex];
        fileIndex++;
        
        // Store both relative and absolute URLs for the photo
        const relativePath = photoFile ? `/uploads/${photoFile.filename}` : null;
        const absoluteUrl = photoFile ? `${serverBaseUrl}/uploads/${photoFile.filename}` : null;
        
        return {
          name: candidate.name,
          photoRelativePath: relativePath,
          photoUrl: absoluteUrl,
          photoFilename: photoFile ? photoFile.filename : null
        };
      });

      return {
        pinCode: location.pinCode,
        locationName: location.locationName,
        candidates: candidates,
      };
    });

    const electionData = {
      electionDuration: formData.electionDuration,
      locations: locations,
      createdAt: new Date(),
    };

    // Insert election into ELECTIONS collection
    db.collection("ELECTIONS").insertOne(electionData)
      .then(async (result) => {
        // Create VOTES collection entries
        const voteEntries = [];
        locations.forEach((location) => {
          location.candidates.forEach((candidate) => {
            voteEntries.push({
              location: location.locationName,
              candidate: candidate.name,
              votes: 0, // Initialize vote count as 0
              candidatePhotoUrl: candidate.photoUrl // Store the photo URL in votes collection too
            });
          });
        });
        
        // Optional: Insert vote entries if needed
        /* Uncomment if you want to create vote entries
        if (voteEntries.length > 0) {
          await db.collection("VOTES").insertMany(voteEntries);
        }
        */

        res.status(201).json({
          message: "Election and votes created successfully",
          electionId: result.insertedId,
          photoUrls: locations.flatMap(location => 
            location.candidates.map(candidate => candidate.photoUrl)
          )
        });
      })
      .catch((err) => {
        console.error("❌ Error inserting election data:", err);
        res.status(500).json({ error: "Failed to save election data" });
      });
  } catch (error) {
    console.error("❌ Error processing election data:", error);
    res.status(400).json({ error: "Invalid data format" });
  }
});

// GET /elections — fetch all elections
app.get("/elections", (req, res) => {
  db.collection("ELECTIONS").find().toArray()
    .then((elections) => {
      res.status(200).json(elections);
    })
    .catch((err) => {
      console.error("❌ Error fetching elections:", err);
      res.status(500).json({ error: "Failed to fetch elections" });
    });
});

// NEW ENDPOINT: GET candidate photos by election ID
app.get("/elections/:id/photos", (req, res) => {
  const { ObjectId } = require('mongodb');
  const electionId = req.params.id;
  
  try {
    const objectId = new ObjectId(electionId);
    
    db.collection("ELECTIONS").findOne({ _id: objectId })
      .then((election) => {
        if (!election) {
          return res.status(404).json({ error: "Election not found" });
        }
        
        // Extract all photo URLs from the election
        const photoData = election.locations.flatMap(location => 
          location.candidates.map(candidate => ({
            locationName: location.locationName,
            candidateName: candidate.name,
            photoUrl: candidate.photoUrl,
            photoPath: candidate.photoRelativePath
          }))
        );
        
        res.status(200).json(photoData);
      })
      .catch((err) => {
        console.error("❌ Error fetching election photos:", err);
        res.status(500).json({ error: "Failed to fetch election photos" });
      });
  } catch (error) {
    console.error("❌ Invalid election ID format:", error);
    res.status(400).json({ error: "Invalid election ID format" });
  }
});