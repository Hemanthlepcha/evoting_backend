import { Router } from "express";
import candidateRoutes from "./candidate.routes.js";
import voteRoutes from "./vote.routes.js";
import electionRoutes from "./election.routes.js";
import resultsRoutes from "./results.routes.js";

const router = Router();

// Combine all route modules
router.use(candidateRoutes);
router.use(voteRoutes);
router.use(electionRoutes);
router.use(resultsRoutes);

export default router;
