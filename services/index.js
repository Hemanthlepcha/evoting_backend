import { Router } from "express";
import candidateRoutes from "../routes/candidate.routes.js";
import voteRoutes from "../routes/vote.routes.js";
import electionRoutes from "../routes/election.routes.js";
import resultsRoutes from "../routes/results.routes.js";

const router = Router();

// Combine all route modules
router.use(candidateRoutes);
router.use(voteRoutes);
router.use(electionRoutes);
router.use(resultsRoutes);

export default router;
