import { Router } from "express";
import { authMiddleware } from "../auth/auth.js";
import { castVoteService, checkVotedService } from "../services/vote.service.js";

const router = Router();

//Cast a vote. /api/vote
router.post("/vote", authMiddleware, castVoteService);

//Check if a user has voted.  /api/checkVoted
router.get("/checkVoted", authMiddleware, checkVotedService);

export default router;
