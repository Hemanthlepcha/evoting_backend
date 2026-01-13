import { Router } from "express";
import { registerCandidate, deleteCandidate } from "../controllers/candidate.controller.js";

const router = Router();

//Register a candidate.  /api/register
router.post("/register", registerCandidate);

// Remove a candidate.  /api/remove
router.delete("/remove", deleteCandidate);

export default router;
