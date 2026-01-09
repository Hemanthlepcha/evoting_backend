import { Router } from "express";
import {
  normalizeElectionType,
  detectElectionType,
  validateLocation,
  buildLocationString,
  ELECTION_TYPES,
} from "../../utils/electionTypes.js";
import { contract, logger } from "../utils.js";

const router = Router();

/**
 * Register a candidate
 * POST /api/register
 */
router.post("/register", async (req, res) => {
  const { electionId, candidate, location, electionType } = req.body;

  let locationString;
  let detectedElectionType;

  try {
    if (location) {
      detectedElectionType = electionType
        ? normalizeElectionType(electionType)
        : detectElectionType(location);

      if (!detectedElectionType) {
        return res.status(400).json({
          error: "Cannot determine election type from location",
          hint: "Provide electionType or include demkhong/gewog/chiwog/thromde in location",
        });
      }

      const validation = validateLocation(location, detectedElectionType);
      if (!validation.isValid) {
        return res.status(400).json({
          error: `Required Location details are missing for candidate registration`,
          missingFields: validation.missingFields,
          requiredFields: validation.requiredFields,
        });
      }

      locationString = buildLocationString(location, detectedElectionType);
    } else if (req.body.demkhong) {
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
      return res.status(409).json({
        error: "Candidate already registered",
        details: `The candidate '${candidate}' is already registered for this election`,
      });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized candidate registration attempt: ${candidate}`);
      return res.status(403).json({
        error: "Unauthorized",
        details: "Only contract owner can register candidates",
      });
    }
    if (err.message.includes("Election does not exist")) {
      return res.status(404).json({
        error: "Election not found",
        details: `Election with ID '${electionId}' does not exist`,
      });
    }
    logger.error(`Error registering candidate: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to register candidate. Please try again later.",
    });
  }
});

/**
 * Remove a candidate
 * DELETE /api/remove
 */
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
      return res.status(404).json({
        error: "Candidate not found",
        details: `Candidate '${candidate}' is not registered for this election`,
      });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized candidate removal attempt: ${candidate}`);
      return res.status(403).json({
        error: "Unauthorized",
        details: "Only contract owner can remove candidates",
      });
    }
    if (err.message.includes("Election does not exist")) {
      return res.status(404).json({
        error: "Election not found",
        details: `Election with ID '${electionId}' does not exist`,
      });
    }
    logger.error(`Error removing candidate: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to remove candidate. Please try again later.",
    });
  }
});

export default router;
