import { Router } from "express";
import {
  getGeographicalResults,
  getPublicResult,
  getVotesByElection,
} from "../controllers/results.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

//Get detailed votes by election with location and gender breakdown. /api/votesByElection
router.get("/votesByElection", authMiddleware, getVotesByElection);

// GET public results for an election.  /api/public-result/:electionId
router.get("/public-result/:electionId", getPublicResult);

// Get geographical area results. /api/geographicalResults
router.get("/geographicalResults", authMiddleware, getGeographicalResults);

// GET Legacy endpoint for backward compatibility. /api/demkhongResults
router.get("/demkhongResults", authMiddleware, (req, res, next) => {
  // Default electionType to NA for legacy demkhong
  req.query.electionType = req.query.electionType || ELECTION_TYPES.NA;
  return getGeographicalResults(req, res, next);
});

export default router;
