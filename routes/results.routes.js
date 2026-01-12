import { Router } from "express";
import { authMiddleware } from "../auth/auth.js";
import { getDemkhongResultsService, 
  getGeographicalResultsService, 
  getVotesByElectionService,
  getPublicResultsService } from "../services/results.service.js";

const router = Router();

//Get detailed votes by election with location and gender breakdown. /api/votesByElection
router.get("/votesByElection", authMiddleware, getVotesByElectionService);

// Get geographical area results. /api/geographicalResults
router.get("/geographicalResults", authMiddleware, getGeographicalResultsService);

// GET public results for an election.  /api/public-result/:electionId
router.get("/public-result/:electionId", getPublicResultsService);

// GET Legacy endpoint for backward compatibility. /api/demkhongResults
router.get("/demkhongResults", authMiddleware, getDemkhongResultsService);

export default router;
