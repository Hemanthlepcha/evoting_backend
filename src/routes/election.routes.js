import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getAllElections, endElection } from "../controllers/election.controller.js";

const router = Router();

// End an election.   /api/end
router.post("/end", authMiddleware, endElection);

// Get all elections.   /api/elections
router.get("/elections", authMiddleware, getAllElections);

export default router;
