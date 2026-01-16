import { Router } from "express";
import { registerCandidate, removeCandidate } from "../controllers/candidate.controller.js";

const router = Router();

//Register a candidate.  /api/register
router.post("/register", registerCandidate);

// Remove a candidate.  /api/remove
router.delete("/remove", removeCandidate);

export default router;
