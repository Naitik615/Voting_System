import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { Actor, HttpAgent } from "@dfinity/agent";
import fetch from 'node-fetch';
import { idlFactory } from './src/declarations/dvote_backend/dvote_backend.did.js';

const app = express();
const port = 3300;

app.use(express.json());
app.use(cors());

// Create a custom actor creation function for Node.js
const createNodeActor = async (canisterId, options = {}) => {
  const agent = new HttpAgent({
    host: "http://localhost:4943", // Use your local replica address
    fetch,
    ...options.agentOptions
  });

  // Fetch root key for certificate validation during development
  if (process.env.DFX_NETWORK !== "ic") {
    await agent.fetchRootKey().catch(err => {
      console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
      console.error(err);
    });
  }

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
};

// Fetch candidates data from express server
async function fetchCandidates() {
  const response = await fetch('http://localhost:3700/candidates');
  const data = await response.json();
  return data.candidates;
}




// Add candidates to blockchain
async function addCandidatesToBlockchain(dvote_backend) {
  try {
    const candidates = await fetchCandidates();

    for (const [candidateName, locationName] of candidates) {
      // Safety check for missing data
      if (!candidateName || !locationName) {
        console.warn(`⚠️ Skipping due to missing data:`, { candidateName, locationName });
        continue;
      }

      // Check if addCandidate function is available on the actor
      if (dvote_backend.addCandidate) {
        await dvote_backend.addCandidate(candidateName, locationName);
        console.log(`✅ Added to blockchain: ${candidateName} at ${locationName}`);
      } else {
        console.error("❌ Error: addCandidate method not found on dvote_backend actor.");
      }
    }

  } catch (error) {
    console.error("❌ Error adding candidates to blockchain:", error);
  }
}

// Initialize the dvote_backend actor
const initializeActor = async () => {
  try {
    const dvote_backend = await createNodeActor(process.env.CANISTER_ID_DVOTE_BACKEND);

    // Check if dvote_backend is defined
    if (!dvote_backend) {
      console.error("❌ Error: dvote_backend actor is undefined. Please ensure the canister is correctly deployed.");
      process.exit(1);
    }

    app.listen(port, () => {
      console.log(`server running on ${port}`);
    });

    app.post('/cast_vote', (req, res) => {
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
        dvote_backend.vote(partyName, locationName);
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

    app.get("/get_res", async (req, res) => {
      try {
        // Call blockchain to get results - it's returning a Promise
        console.log("Calling blockchain getResults...");
        const blockchainData = await dvote_backend.getResults();
        
        // Log the actual data received for debugging
        console.log("Raw blockchain data after await:", blockchainData);
        
        // Process the data and convert BigInt to regular numbers
        const formattedData = convertBigIntToNumber(blockchainData);
        console.log("Formatted data:", formattedData);
        
        // Send parsed data to frontend
        res.status(200).json({ success: true, data: formattedData });
      } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({ success: false, error: error.toString() });
      }
    });
    
    // Helper function to convert BigInt values to regular numbers
    function convertBigIntToNumber(data) {
      if (Array.isArray(data)) {
        return data.map(item => {
          if (Array.isArray(item)) {
            // Format to match our expected output structure
            return {
              candidateId: Number(item[0]),
              candidateName: item[1],
              location: item[2],
              votes: Number(item[3])
            };
          } else if (typeof item === 'bigint') {
            return Number(item);
          } else if (typeof item === 'object' && item !== null) {
            return convertBigIntToNumber(item);
          }
          return item;
        });
      } else if (typeof data === 'bigint') {
        return Number(data);
      } else if (typeof data === 'object' && data !== null) {
        const result = {};
        for (const key in data) {
          result[key] = convertBigIntToNumber(data[key]);
        }
        return result;
      }
      return data;
    }
    
    // Helper function to parse blockchain data format
    function parseBlockchainData(dataString) {
      try {
        // Check if the input is already an array or object
        if (typeof dataString !== 'string') {
          console.log("Data is not a string, returning as is");
          return dataString;
        }
        
        // Example format: (vec {record {4; "pookiee ashish"; "haldwani"; 0}; record {2; "pookiee ashish"; "haldwani"; 0}; ...})
        
        // Regular expression to extract each record
        const recordRegex = /record\s*\{([^{}]+)\}/g;
        let match;
        const results = [];
        
        while ((match = recordRegex.exec(dataString)) !== null) {
          const recordContent = match[1];
          const parts = recordContent.split(';').map(part => part.trim());
          
          if (parts.length >= 4) {
            const candidateId = parseInt(parts[0]);
            // Remove quotes from the name and location
            const candidateName = parts[1].replace(/^"|"$/g, '');
            const location = parts[2].replace(/^"|"$/g, '');
            const votes = parseInt(parts[3]);
            
            results.push({
              candidateId,
              candidateName,
              location,
              votes
            });
          }
        }
        
        // If no records were found, try to handle it as JSON
        if (results.length === 0) {
          try {
            // Check if it's JSON data
            const jsonData = JSON.parse(dataString);
            return jsonData;
          } catch (jsonError) {
            console.error("Failed to parse as JSON:", jsonError);
            
            // Last resort: try to extract using simple string manipulation
            const simpleParse = [];
            const rows = dataString.split(';');
            
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i].trim();
              if (row.includes('{') && row.includes('}')) {
                const cleanRow = row.replace(/record\s*\{|\}|\{|\(/g, '').trim();
                const parts = cleanRow.split(';').map(part => part.trim());
                
                if (parts.length >= 3) {
                  simpleParse.push({
                    candidateId: parseInt(parts[0]) || 0,
                    candidateName: parts[1].replace(/^"|"$/g, '') || 'Unknown',
                    location: parts[2].replace(/^"|"$/g, '') || 'Unknown',
                    votes: parseInt(parts[3] || 0)
                  });
                }
              }
            }
            
            if (simpleParse.length > 0) {
              return simpleParse;
            }
          }
        }
        
        return results;
      } catch (error) {
        console.error("Error in parseBlockchainData:", error);
        // Return empty array instead of throwing to avoid breaking the response
        return [];
      }
    }
    // Add the /insert_blockchain endpoint
    app.get("/insert_blockchain", async (req, res) => {
      try {
        // Call addCandidatesToBlockchain
        await addCandidatesToBlockchain(dvote_backend);

        res.status(200).json({
          success: true,
          message: "Candidates successfully added to the blockchain!"
        });
      } catch (error) {
        console.error("❌ Error in /insert_blockchain:", error);
        res.status(500).json({
          error: "Internal Server Error",
          message: "Failed to insert candidates into the blockchain."
        });
      }
    });

    // Add the /add_nota endpoint
    app.post("/add_nota", async (req, res) => {
        try {
            const { locationName } = req.body;
            
            // Check if NOTA already exists for this location
            const results = await dvote_backend.getResults();
            const notaExists = results.some(result => 
                result[1] === "NOTA" && result[2] === locationName
            );
            
            if (!notaExists) {
                // Add NOTA as a candidate
                await dvote_backend.addCandidate("NOTA", locationName);
                console.log(`✅ Added NOTA candidate for location: ${locationName}`);
            }
            
            res.status(200).json({
                success: true,
                message: "NOTA candidate added successfully"
            });
        } catch (error) {
            console.error("❌ Error adding NOTA candidate:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to add NOTA candidate"
            });
        }
    });

  } catch (error) {
    console.error("Failed to initialize actor:", error);
  }
};

// Start the process
initializeActor();