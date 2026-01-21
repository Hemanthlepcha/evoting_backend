import { Router } from "express";
import {
  registerCandidate,
  removeCandidate,
} from "../controllers/candidate.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

//Register a candidate.  /api/register
router.post("/register", authMiddleware, registerCandidate);

// Remove a candidate.  /api/remove
router.delete("/remove", authMiddleware, removeCandidate);

export default router;
