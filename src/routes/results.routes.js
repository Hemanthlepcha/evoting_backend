import { Router } from "express";
import { authMiddleware } from "../auth/auth.js";
import { getVotesByElection, getGeographicalResults, getPublicResult } from "../controllers/results.controller.js";

const router = Router();

//Get detailed votes by election with location and gender breakdown. /api/votesByElection
router.get("/votesByElection", authMiddleware, getVotesByElection);

// GET public results for an election.  /api/public-result/:electionId
router.get("/public-result/:electionId", getPublicResult);

// Get geographical area results. /api/geographicalResults
router.get("/geographicalResults", authMiddleware, getGeographicalResults);

// GET Legacy endpoint for backward compatibility. /api/demkhongResults
router.get("/demkhongResults", (req, res, next) => {
  // Default electionType to NA for legacy demkhong
  req.query.electionType = req.query.electionType || ELECTION_TYPES.NA;
  return getGeographicalResults(req, res, next);
});

export default router;
