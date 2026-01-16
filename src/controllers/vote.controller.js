import { castVoteService, checkVotedService } from "../services/vote.service.js";
import { logger } from "../utils/contract.js";

//Cast a vote. /api/vote
export const castVote = async (req, res) => {
  const result = await castVoteService(req.body);
  res.status(result.status).json(result.body);
};


//Check if a user has voted.  /api/checkVoted
export const checkVoted = async (req, res) => {
  const { electionId, uid } = req.query;

  if (!electionId || !uid) {
    return res.status(400).json({
      error: "Both electionId and VoterID are required",
    });
  }

  try {
    const hasVoted = await checkVotedService(electionId, uid);

    res.json({ voted: hasVoted });
  } catch (err) {
    if (err.message.includes("Not the owner")) {
      logger.warn(
        `Unauthorized vote check attempt: electionId=${electionId}, uid=${uid}`
      );
      return res.status(403).json({
        error: "Unauthorized",
        details: "Only contract owner can check vote status",
      });
    }

    if (err.message.includes("Election does not exist")) {
      return res.status(404).json({
        error: "Election not found",
        details: `Election with ID '${electionId}' does not exist`,
      });
    }

    logger.error(`Error checking vote status: ${err.message}`);
    return res.status(500).json({
      error: "Internal server error",
      details: "Failed to check vote status. Please try again later.",
    });
  }
};

