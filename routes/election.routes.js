import { Router } from "express";
import { contract, logger } from "../utils/contract.js";
import { authMiddleware } from "../auth/auth.js";
import { getAllElections } from "../controllers/election.controller.js";
import { endElectionService } from "../services/election.service.js";

const router = Router();

// End an election.   /api/end
router.post("/end", authMiddleware, endElectionService);

// Get all elections.   /api/elections
router.get("/elections", authMiddleware, getAllElections);

export default router;
