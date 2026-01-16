import { Router } from "express";
import { authMiddleware } from "../auth/auth.js";
import { getVotesByElection,
  getGeographicalResults,
  getPublicResult,
  getDemkhongResults } from "../controllers/results.controller.js";

const router = Router();

//Get detailed votes by election with location and gender breakdown. /api/votesByElection
router.get("/votesByElection", authMiddleware, getVotesByElection);

// GET public results for an election.  /api/public-result/:electionId
router.get("/public-result/:electionId", getPublicResult);

// Get geographical area results. /api/geographicalResults
router.get("/geographicalResults", authMiddleware, getGeographicalResults);



// GET Legacy endpoint for backward compatibility. /api/demkhongResults
router.get("/demkhongResults", authMiddleware, getDemkhongResults);

export default router;
