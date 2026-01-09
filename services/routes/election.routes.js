import { Router } from "express";
import { contract, logger } from "../utils.js";
import { authMiddleware } from "../../auth/auth.js";

const router = Router();

/**
 * End an election
 * POST /api/end
 * Requires authentication
 */
router.post("/end", authMiddleware, async (req, res) => {
  const { electionId } = req.body;

  if (!electionId) {
    return res
      .status(400)
      .json({ error: "Missing required field: electionId" });
  }

  try {
    const tx = await contract.endElection(electionId);
    await tx.wait();
    logger.info(`Election ended: ${electionId}, txHash: ${tx.hash}`);
    res.json({ message: "Election ended", txHash: tx.hash });
  } catch (err) {
    if (err.message.includes("Election does not exist")) {
      return res.status(404).json({
        error: "Election not found",
        details: `Election with ID '${electionId}' does not exist`,
      });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized election end attempt: ${electionId}`);
      return res.status(403).json({
        error: "Unauthorized",
        details: "Only contract owner can end elections",
      });
    }
    logger.error(`Error ending election: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to end election. Please try again later.",
    });
  }
});

/**
 * Get all elections
 * GET /api/elections
 * Requires authentication
 */
router.get("/elections", authMiddleware, async (req, res) => {
  try {
    const elections = await contract.getAllElections();
    logger.info(`Fetched all elections: ${elections.length} elections`);
    res.json({ elections });
  } catch (err) {
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized elections fetch attempt`);
      return res.status(403).json({
        error: "Unauthorized",
        details: "Only contract owner can view elections",
      });
    }
    logger.error(`Error fetching elections: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to fetch elections. Please try again later.",
    });
  }
});

export default router;
