import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { castVote, checkVoted } from "../controllers/vote.controller.js";

const router = Router();

//Cast a vote. /api/vote
router.post("/vote", authMiddleware, castVote);

//Check if a user has voted.  /api/checkVoted
router.get("/checkVoted", authMiddleware, checkVoted);

export default router;
