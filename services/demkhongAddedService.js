import { JsonRpcProvider, Wallet, Contract } from "ethers";
import "dotenv/config";
import crypto from "crypto";
import { Router } from "express";
import { authMiddleware } from "./auth.js";
import fs from "fs";
import { logger } from "../utils/logger.js";
import {
  ELECTION_TYPES,
  buildLocationString,
  parseLocationString,
  detectElectionType,
  validateLocation,
  getLocationLabel,
  normalizeElectionType,
  getRequiredLocationFields,
} from "../utils/electionTypes.js";

const abiData = JSON.parse(fs.readFileSync("./abi/demkhongAbi.json", "utf-8"));
const abi = abiData.abi; // Extract the abi array from the object
const router = Router();
router.use(authMiddleware);

const provider = new JsonRpcProvider(process.env.AMOY_RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;

const contract = new Contract(contractAddress, abi, wallet);

function hashUid(uid) {
  const secretUid = process.env.SECRET_PHRASE + uid;
  return crypto.createHash("sha256").update(secretUid).digest("hex");
}

// Register a candidate
router.post("/register", async (req, res) => {
  const { electionId, candidate, location, electionType } = req.body;

  // Support both old format (demkhong) and new format (location object)
  let locationString;
  let detectedElectionType;

  try {
    if (location) {
      // New format: location object with dzongkhag, gewog, chiwog, demkhong, or thromde
      detectedElectionType = electionType
        ? normalizeElectionType(electionType)
        : detectElectionType(location);

      if (!detectedElectionType) {
        return res.status(400).json({
          error: "Cannot determine election type from location",
          hint: "Provide electionType or include demkhong/gewog/chiwog/thromde in location",
        });
      }

      // Validate location has required fields
      const validation = validateLocation(location, detectedElectionType);
      if (!validation.isValid) {
        return res.status(400).json({
          error: `Missing required location fields for ${detectedElectionType}`,
          missingFields: validation.missingFields,
          requiredFields: validation.requiredFields,
        });
      }

      locationString = buildLocationString(location, detectedElectionType);
    } else if (req.body.demkhong) {
      // Backward compatibility: old format with just demkhong
      locationString = req.body.demkhong;
      detectedElectionType = ELECTION_TYPES.NA;
      logger.info(`Using legacy demkhong format for candidate: ${candidate}`);
    } else {
      return res.status(400).json({
        error: "Missing location information",
        hint: "Provide either 'location' object or 'demkhong' field",
      });
    }

    if (!electionId || !candidate) {
      return res.status(400).json({
        error: "Missing required fields: electionId and candidate are required",
      });
    }

    const tx = await contract.registerCandidate(
      electionId,
      candidate,
      locationString
    );
    await tx.wait();

    logger.info(
      `Candidate registered: ${candidate} | Type: ${detectedElectionType} | Location: ${locationString} | Tx: ${tx.hash}`
    );

    res.json({
      message: "Candidate registered successfully",
      candidate,
      electionType: detectedElectionType,
      location: locationString,
      txHash: tx.hash,
    });
  } catch (err) {
    if (err.message.includes("Candidate already registered")) {
      logger.warn(`Candidate already registered: ${candidate}`);
      return res.status(409).json({ message: "Candidate Already Registered" });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized candidate registration attempt: ${candidate}`);
      return res.status(403).json({
        message: "Unauthorized: Only contract owner can register candidates",
      });
    }
    logger.error(`Error registering candidate: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// Remove a candidate
router.delete("/remove", async (req, res) => {
  const { electionId, candidate } = req.body;

  if (!electionId || !candidate) {
    return res
      .status(400)
      .json({ error: "Missing required fields: electionId or candidate" });
  }

  try {
    const tx = await contract.removeCandidate(electionId, candidate);
    await tx.wait();
    logger.info(`Candidate removed: ${candidate}, txHash: ${tx.hash}`);
    res.json({ message: "Candidate removed", txHash: tx.hash });
  } catch (err) {
    if (err.message.includes("Candidate not registered")) {
      logger.warn(`Candidate not found: ${candidate}`);
      return res.status(404).json({ error: "Candidate not registered" });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized candidate removal attempt: ${candidate}`);
      return res.status(403).json({
        message: "Unauthorized: Only contract owner can remove candidates",
      });
    }
    if (err.message.includes("Election does not exist")) {
      return res.status(404).json({ error: "Election does not exist" });
    }
    logger.error(`Error removing candidate: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// Cast a vote
router.post("/vote", async (req, res) => {
  const { electionId, uid, candidate, gender, pollingStation } = req.body;

  if (!electionId || !uid || !candidate || !gender || !pollingStation) {
    return res.status(400).send({
      error:
        "Missing required fields: electionId, uid, candidate, gender, or pollingStation",
    });
  }

  try {
    const hashedUid = hashUid(uid);
    const tx = await contract.vote(
      electionId,
      hashedUid,
      candidate,
      gender,
      pollingStation
    );
    const receipt = await tx.wait();

    const txStatus = receipt.status === 1 ? "success" : "fail";
    logger.info(
      `Vote cast | Tx: ${tx.hash} | Status: ${txStatus} | Polling Station: ${pollingStation}`
    );

    res.send({
      message: "Vote cast successfully",
      txHash: tx.hash,
      txStatus,
      pollingStation,
      explorerLink: `https://amoy.polygonscan.com/tx/${tx.hash}`,
    });
  } catch (err) {
    logger.error(`Error casting vote: ${err.message}`);
    if (err.message.includes("Already voted in this election")) {
      res
        .status(409)
        .send({ error: "You have already voted in this election." });
    } else if (err.message.includes("Candidate not registered")) {
      res
        .status(404)
        .send({ error: "Candidate is not registered for this election." });
    } else if (err.message.includes("Invalid gender string")) {
      res
        .status(400)
        .send({ error: "Invalid gender. Use 'Male' or 'Female'." });
    } else if (err.message.includes("Election does not exist")) {
      res.status(404).send({ error: "Election does not exist." });
    } else if (err.message.includes("Not the owner")) {
      res
        .status(403)
        .send({ error: "Unauthorized: Only contract owner can cast votes" });
    } else {
      res.status(400).send({ error: err.message });
    }
  }
});

// End election
router.post("/end", async (req, res) => {
  const { electionId } = req.body;

  if (!electionId) {
    return res
      .status(400)
      .json({ error: "Missing required field: electionId" });
  }

  try {
    const tx = await contract.endElection(electionId);
    await tx.wait();
    logger.info(`Election ended: ${electionId}, txHash: ${tx.hash}`);
    res.json({ message: "Election ended", txHash: tx.hash });
  } catch (err) {
    if (err.message.includes("Election does not exist")) {
      return res.status(404).json({ error: "Election does not exist" });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized election end attempt: ${electionId}`);
      return res.status(403).json({
        message: "Unauthorized: Only contract owner can end elections",
      });
    }
    logger.error(`Error ending election: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// Read all elections
router.get("/elections", async (req, res) => {
  try {
    const elections = await contract.getAllElections();
    logger.info(`Fetched all elections: ${elections.length} elections`);
    res.json({ elections });
  } catch (err) {
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized elections fetch attempt`);
      return res.status(403).json({
        message: "Unauthorized: Only contract owner can view elections",
      });
    }
    logger.error(`Error fetching elections: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// Admin-only result view with enhanced data
router.get("/votesByElection", async (req, res) => {
  let {
    electionId,
    electionType,
    dzongkhag,
    gewog,
    chiwog,
    demkhong,
    thromde,
  } = req.query;

  if (!electionId) {
    return res
      .status(400)
      .json({ error: "electionId query parameter is required" });
  }

  try {
    console.log(`Fetching votes for election: ${electionId}`);

    // Normalize election type if provided
    if (electionType) {
      electionType = normalizeElectionType(electionType);

      // Validate that provided location fields match the election type
      const providedFields = [];
      if (dzongkhag) providedFields.push("dzongkhag");
      if (gewog) providedFields.push("gewog");
      if (chiwog) providedFields.push("chiwog");
      if (demkhong) providedFields.push("demkhong");
      if (thromde) providedFields.push("thromde");

      if (providedFields.length > 0) {
        // Check if provided fields are valid for this election type
        const requiredFields = getRequiredLocationFields(electionType);
        const invalidFields = providedFields.filter(
          (field) => !requiredFields.includes(field)
        );

        if (invalidFields.length > 0) {
          return res.status(400).json({
            error:
              "The location filter you provided doesn't match this election type",
            message: `You're searching for a ${electionType} election, but the location fields you provided are not valid for this type`,
            providedFields: invalidFields,
            requiredFields: requiredFields,
            hint: `Please use only these location fields: ${requiredFields.join(
              ", "
            )}`,
          });
        }
      }
    }

    const [
      candidates,
      locationStrings,
      candidateVotes,
      totalVotes,
      totalMale,
      totalFemale,
    ] = await contract.getCandidateVotesAndTotalElectionVotes(electionId);

    // If no candidates found
    if (candidates.length === 0) {
      return res.json({
        results: [],
        totalVotes: "0",
        totalMale: "0",
        totalFemale: "0",
        message: `No candidates found for election: ${electionId}`,
      });
    }

    // Detect election type from first candidate's location if not provided
    let detectedElectionType = null;
    if (!electionType && locationStrings.length > 0) {
      const firstLocationStr = locationStrings[0];
      const parts = firstLocationStr.split("/");

      // Detect based on structure: count parts and check patterns
      if (parts.length === 1) {
        detectedElectionType = ELECTION_TYPES.NC; // Only dzongkhag
      } else if (parts.length === 2) {
        // Could be NA (dzongkhag/demkhong), GUP/MANGMI (dzongkhag/gewog),
        // THROMPOEN (dzongkhag/thromde), or T_TSHOGPA (dzongkhag/thromde)
        // We can't distinguish between these without more context
        detectedElectionType = null; // User must provide electionType
      } else if (parts.length === 3) {
        detectedElectionType = ELECTION_TYPES.C_TSHOGPA; // dzongkhag/gewog/chiwog
      }

      if (detectedElectionType) {
        electionType = detectedElectionType;
      }
    }

    // If electionType is provided, validate that candidates match this structure
    if (electionType && locationStrings.length > 0) {
      const expectedPartCount = getRequiredLocationFields(electionType).length;
      const firstCandidatePartCount = locationStrings[0].split("/").length;

      if (expectedPartCount !== firstCandidatePartCount) {
        return res.status(400).json({
          error: "Election type does not match",
          message: `The election '${electionId}' is not a ${electionType} election. Please check your election ID or election type.`,
          hint: "Make sure you're using the correct election ID for the type of election you want to view",
        });
      }
    }

    // Build filter location string based on provided query params
    let filterLocationString = null;
    if (dzongkhag || gewog || chiwog || demkhong || thromde) {
      const filterLocation = {
        dzongkhag,
        gewog,
        chiwog,
        demkhong,
        thromde,
      };

      // Remove undefined values
      Object.keys(filterLocation).forEach(
        (key) => filterLocation[key] === undefined && delete filterLocation[key]
      );

      if (electionType && Object.keys(filterLocation).length > 0) {
        filterLocationString = buildLocationString(
          filterLocation,
          electionType
        );
      }
    }

    // Fetch polling station breakdown for each candidate
    let allResults = await Promise.all(
      candidates.map(async (candidate, index) => {
        const locationStr = locationStrings[index];
        let locationDetails = {};

        if (electionType) {
          locationDetails = parseLocationString(locationStr, electionType);
        } else {
          // If electionType not provided, include raw location string
          locationDetails = { location: locationStr };
        }

        // Get polling station breakdown for this candidate
        const [pollingStations, votesPerStation] =
          await contract.getCandidatePollingStationVotes(electionId, candidate);

        // Convert to object format: { "PS1": "12", "PS2": "29" }
        const votesByPollingStation = {};
        pollingStations.forEach((ps, idx) => {
          votesByPollingStation[ps] = votesPerStation[idx].toString();
        });

        return {
          candidate,
          location: locationStr,
          locationDetails,
          votes: votesByPollingStation,
          totalVotes: candidateVotes[index].toString(),
        };
      })
    );

    // Filter results based on location if filterLocationString is provided
    let results = allResults;
    if (filterLocationString) {
      results = allResults.filter((result) => {
        // Check if candidate's location starts with the filter location
        // This allows hierarchical filtering (dzongkhag filters all gewogs within it, etc.)
        return result.location.startsWith(filterLocationString);
      });

      logger.info(
        `Filtered results for election: ${electionId}, location: ${filterLocationString}, found: ${results.length} candidates`
      );

      // If no results match the filter, return specific message
      if (results.length === 0) {
        return res.status(404).json({
          results: [],
          totalVotes: "0",
          totalMale: "0",
          totalFemale: "0",
          message: "No results found for the location you specified",
          hint: "There are no candidates registered for this location. Please check if you entered the correct location details.",
          searchedLocation: filterLocationString,
        });
      }
    }

    // Recalculate totals based on filtered results
    let filteredTotalVotes = 0;
    let filteredTotalMale = 0;
    let filteredTotalFemale = 0;

    if (filterLocationString && results.length > 0) {
      // For filtered results, we need to get gender breakdown from the smart contract
      // by calling getDemkhongResults which provides location-specific gender data
      try {
        const [
          locationStringsGender,
          totalVotesByLocation,
          maleByLocation,
          femaleByLocation,
        ] = await contract.getDemkhongResults(electionId);

        // Find matching locations and sum up gender votes
        locationStringsGender.forEach((locStr, index) => {
          if (locStr.startsWith(filterLocationString)) {
            filteredTotalVotes += parseInt(
              totalVotesByLocation[index].toString()
            );
            filteredTotalMale += parseInt(maleByLocation[index].toString());
            filteredTotalFemale += parseInt(femaleByLocation[index].toString());
          }
        });
      } catch (err) {
        logger.error(
          `Error fetching gender breakdown for filtered location: ${err.message}`
        );
        // Fallback: just calculate total votes from results
        results.forEach((result) => {
          filteredTotalVotes += parseInt(result.totalVotes);
        });
      }
    } else {
      filteredTotalVotes = totalVotes;
      filteredTotalMale = totalMale;
      filteredTotalFemale = totalFemale;
    }

    logger.info(`Admin fetched results for election: ${electionId}`);

    res.json({
      results,
      totalVotes: filteredTotalVotes.toString(),
      totalMale: filteredTotalMale.toString(),
      totalFemale: filteredTotalFemale.toString(),
      electionType: electionType || "unknown",
      filteredBy: filterLocationString || null,
    });
  } catch (err) {
    if (err.message.includes("Election ID does not exist")) {
      logger.warn(`Election not found: ${electionId}`);
      return res.status(404).json({
        error: "Election ID does not exist",
        electionId,
        results: [],
      });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized results fetch attempt: ${electionId}`);
      return res.status(403).json({
        message: "Unauthorized: Only contract owner can view detailed results",
      });
    }
    logger.error(`Error fetching all vote counts: ${err.message}`);
    res.status(400).json({
      error: "Error fetching election results",
      electionId,
      results: [],
    });
  }
});

// Get geographical area results (demkhong/gewog/chiwog/thromde)
router.get("/geographicalResults", async (req, res) => {
  let { electionId, electionType } = req.query;

  if (!electionId) {
    return res
      .status(400)
      .json({ error: "electionId query parameter is required" });
  }

  try {
    // Normalize election type if provided
    if (electionType) {
      electionType = normalizeElectionType(electionType);
    }

    const [
      locationStrings,
      totalVotesByLocation,
      maleByLocation,
      femaleByLocation,
    ] = await contract.getDemkhongResults(electionId);

    const results = locationStrings.map((locationStr, index) => {
      let locationDetails = {};
      let locationLabel = "Location";

      if (electionType) {
        locationDetails = parseLocationString(locationStr, electionType);
        locationLabel = getLocationLabel(electionType);
      } else {
        locationDetails = { location: locationStr };
      }

      return {
        location: locationStr,
        locationDetails,
        [locationLabel.toLowerCase()]: locationStr, // backward compatibility
        totalVotes: totalVotesByLocation[index].toString(),
        maleVotes: maleByLocation[index].toString(),
        femaleVotes: femaleByLocation[index].toString(),
      };
    });

    logger.info(
      `Fetched geographical results for election: ${electionId} (Type: ${
        electionType || "unknown"
      })`
    );
    res.json({
      results,
      electionType: electionType || "unknown",
      locationLabel: electionType ? getLocationLabel(electionType) : "Location",
    });
  } catch (err) {
    if (err.message.includes("Election does not exist")) {
      return res.status(404).json({
        error: "Election ID does not exist",
        electionId,
        results: [],
      });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(
        `Unauthorized geographical results fetch attempt: ${electionId}`
      );
      return res.status(403).json({
        message:
          "Unauthorized: Only contract owner can view geographical results",
      });
    }
    logger.error(`Error fetching geographical results: ${err.message}`);
    res.status(400).json({
      error: "Error fetching geographical results",
      electionId,
      results: [],
    });
  }
});

// Legacy endpoint for backward compatibility
router.get("/demkhongResults", async (req, res) => {
  // Redirect to the new geographicalResults endpoint
  req.query.electionType = req.query.electionType || ELECTION_TYPES.NA;
  return geographicalResultsHandler(req, res);
});

// Helper function to avoid code duplication
async function geographicalResultsHandler(req, res) {
  let { electionId, electionType } = req.query;

  if (!electionId) {
    return res
      .status(400)
      .json({ error: "electionId query parameter is required" });
  }

  try {
    // Normalize election type if provided
    if (electionType) {
      electionType = normalizeElectionType(electionType);
    }

    const [
      locationStrings,
      totalVotesByLocation,
      maleByLocation,
      femaleByLocation,
    ] = await contract.getDemkhongResults(electionId);

    const results = locationStrings.map((locationStr, index) => {
      let locationDetails = {};

      if (electionType) {
        locationDetails = parseLocationString(locationStr, electionType);
      } else {
        locationDetails = { location: locationStr };
      }

      return {
        location: locationStr,
        locationDetails,
        demkhong: locationStr, // backward compatibility
        totalVotes: totalVotesByLocation[index].toString(),
        maleVotes: maleByLocation[index].toString(),
        femaleVotes: femaleByLocation[index].toString(),
      };
    });

    logger.info(`Fetched geographical results for election: ${electionId}`);
    res.json({ results });
  } catch (err) {
    if (err.message.includes("Election does not exist")) {
      return res.status(404).json({
        error: "Election ID does not exist",
        electionId,
        results: [],
      });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(
        `Unauthorized geographical results fetch attempt: ${electionId}`
      );
      return res.status(403).json({
        message:
          "Unauthorized: Only contract owner can view geographical results",
      });
    }
    logger.error(`Error fetching geographical results: ${err.message}`);
    res.status(400).json({
      error: "Error fetching geographical results",
      electionId,
      results: [],
    });
  }
}

// Public result (only if ended)
router.get("/public-result/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;
    let { electionType } = req.query;

    // const isEnded = await contract.isElectionEnded(electionId);
    // if (!isEnded) {
    //   logger.warn(
    //     `Public result request denied - election not ended: ${electionId}`
    //   );
    //   return res.status(403).json({ message: "Election is not yet ended." });
    // }

    // Normalize election type if provided
    if (electionType) {
      electionType = normalizeElectionType(electionType);
    }

    const [
      candidates,
      locationStrings,
      candidateVotes,
      totalVotes,
      totalMale,
      totalFemale,
    ] = await contract.getCandidateVotesAndTotalElectionVotes(electionId);

    // Fetch polling station breakdown for each candidate
    const results = await Promise.all(
      candidates.map(async (candidate, index) => {
        const locationStr = locationStrings[index];
        let locationDetails = {};

        if (electionType) {
          locationDetails = parseLocationString(locationStr, electionType);
        } else {
          locationDetails = { location: locationStr };
        }

        // Get polling station breakdown for this candidate
        const [pollingStations, votesPerStation] =
          await contract.getCandidatePollingStationVotes(electionId, candidate);

        // Convert to object format: { "PS1": "12", "PS2": "29" }
        const votesByPollingStation = {};
        pollingStations.forEach((ps, idx) => {
          votesByPollingStation[ps] = votesPerStation[idx].toString();
        });

        return {
          candidate,
          location: locationStr,
          locationDetails,
          demkhong: locationStr, // backward compatibility
          votes: votesByPollingStation,
          totalVotes: candidateVotes[index].toString(),
        };
      })
    );

    logger.info(`Public results fetched for election: ${electionId}`);
    res.json({
      results,
      totalVotes: totalVotes.toString(),
      totalMale: totalMale.toString(),
      totalFemale: totalFemale.toString(),
    });
  } catch (err) {
    if (err.message.includes("Election ID does not exist")) {
      return res.status(404).json({ error: "Election does not exist" });
    }
    logger.error(`Error fetching public results: ${err.message}`);
    res.status(400).json({ error: "Error fetching election results" });
  }
});

// Check if a user has voted
router.get("/checkVoted", async (req, res) => {
  const { electionId, uid } = req.query;

  if (!electionId || !uid) {
    return res
      .status(400)
      .send({ error: "Both electionId and VoterID are required" });
  }

  try {
    const hasVoted = await contract.hasUserVoted(electionId, hashUid(uid));
    res.send({ voted: hasVoted });
  } catch (err) {
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized vote check attempt: ${electionId}, ${uid}`);
      return res.status(403).send({
        error: "Unauthorized: Only contract owner can check vote status",
      });
    }
    logger.error(`Error checking vote status: ${err.message}`);
    res.status(400).send({ error: "Error checking vote status" });
  }
});

export default router;
