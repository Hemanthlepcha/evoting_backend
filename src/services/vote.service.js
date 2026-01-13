import { contract, hashUid, logger } from "../utils/contract.js";

/**
 * Cast a vote
 * POST /api/vote
 * Requires authentication
 */
export async function castVoteService(body) {
  const { electionId, uid, candidate, gender, pollingStation } = body;

  if (!electionId || !uid || !candidate || !gender || !pollingStation) {
    return res.status(400).send({
      error:
        "Missing required fields: electionId, uid, candidate, gender, or pollingStation",
    });
  }

  try {
    const hashedUid = hashUid(uid);
    const tx = await contract.vote(
      electionId,
      hashedUid,
      candidate,
      gender,
      pollingStation
    );
    const receipt = await tx.wait();

    const txStatus = receipt.status === 1 ? "success" : "fail";
    logger.info(
      `Vote cast | Tx: ${tx.hash} | Status: ${txStatus} | Polling Station: ${pollingStation}`
    );

    res.send({
      message: "Vote cast successfully",
      txHash: tx.hash,
      txStatus,
      pollingStation,
      explorerLink: `https://amoy.polygonscan.com/tx/${tx.hash}`,
    });
  } catch (err) {
    logger.error(`Error casting vote: ${err.message}`);
    if (err.message.includes("Already voted in this election")) {
      return res.status(409).json({
        error: "Already voted",
        details: "You have already cast your vote in this election",
      });
    } else if (err.message.includes("Candidate not registered")) {
      return res.status(404).json({
        error: "Candidate not found",
        details: `Candidate '${candidate}' is not registered for this election`,
      });
    } else if (err.message.includes("Invalid gender string")) {
      return res.status(400).json({
        error: "Invalid gender",
        details: "Gender must be 'Male' or 'Female'",
      });
    } else if (err.message.includes("Election does not exist")) {
      return res.status(404).json({
        error: "Election not found",
        details: `Election with ID '${electionId}' does not exist`,
      });
    } else if (err.message.includes("Not the owner")) {
      return res.status(403).json({
        error: "Unauthorized",
        details: "Only contract owner can cast votes",
      });
    } else {
      return res.status(500).json({
        error: "Internal server error",
        details: "Failed to cast vote. Please try again later.",
      });
    }
  }
};

/**
 * Check if a user has voted
 * GET /api/checkVoted
 * Requires authentication
 */
export async function checkVotedService(query) {
  const { electionId, uid } = query;

  if (!electionId || !uid) {
    return res
      .status(400)
      .send({ error: "Both electionId and VoterID are required" });
  }

  try {
    const hasVoted = await contract.hasUserVoted(electionId, hashUid(uid));
    res.send({ voted: hasVoted });
  } catch (err) {
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized vote check attempt: ${electionId}, ${uid}`);
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
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to check vote status. Please try again later.",
    });
  }
};