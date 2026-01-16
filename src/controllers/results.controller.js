import { getVotesByElectionService, getGeographicalResultsService, getPublicResultsService } from "../services/results.service.js";
import { logger } from "../utils/contract.js";

//Get detailed votes by election with location and gender breakdown. /api/votesByElection
export const getVotesByElection = async (req, res) => {
  const {
    electionId,
    electionType,
    dzongkhag,
    gewog,
    chiwog,
    demkhong,
    thromde,
  } = req.query;

  if (!electionId) {
    return res.status(400).json({
      error: "electionId query parameter is required",
    });
  }

  try {
    const result = await getVotesByElectionService({
      electionId,
      electionType,
      dzongkhag,
      gewog,
      chiwog,
      demkhong,
      thromde,
    });

    res.json(result);
  } catch (err) {
    if (err.code === "NOT_FOUND") {
      return res.status(404).json(err.payload);
    }

    if (err.code === "UNAUTHORIZED") {
      return res.status(403).json(err.payload);
    }

    if (err.code === "BAD_REQUEST") {
      return res.status(400).json(err.payload);
    }

    logger.error(`Error fetching votes: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to fetch election results. Please try again later.",
      electionId,
    });
  }
};

// GET /api/public-result/:electionId
export const getPublicResult = async (req, res) => {
  const { electionId } = req.params;
  let { electionType } = req.query;

  try {
    const data = await getPublicResultsService({
      electionId,
      electionType,
    });

    res.json(data);
  } catch (err) {
    if (err.code === "NOT_FOUND") {
      return res.status(404).json(err.payload);
    }

    if (err.code === "FORBIDDEN") {
      return res.status(403).json(err.payload);
    }

    logger.error(`Error fetching public results: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to fetch election results. Please try again later.",
    });
  }
};

// Get geographical area results. /api/geographicalResults
export const getGeographicalResults = async (req, res) => {
  const { electionId, electionType } = req.query;

  if (!electionId) {
    return res
      .status(400)
      .json({ error: "electionId query parameter is required" });
  }

  try {
    const data = await getGeographicalResultsService({ electionId, electionType });
    res.json(data);
  } catch (err) {
    if (err.code === "NOT_FOUND") {
      return res.status(404).json(err.payload);
    }
    if (err.code === "FORBIDDEN") {
      return res.status(403).json(err.payload);
    }

    logger.error(`Error fetching geographical results: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to fetch geographical results. Please try again later.",
      electionId,
    });
  }
};
