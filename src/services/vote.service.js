import { contract, hashUid, logger } from "../utils/contract.js";

/**
 * Cast a vote
 * POST /api/vote
 * Requires authentication
 */
export const castVoteService = async (body) => {
  const { electionId, uid, candidate, gender, pollingStation } = body;

  if (!electionId || !uid || !candidate || !gender || !pollingStation) {
    return {
      status: 400,
      body: {
        error:
          "Missing required fields: electionId, uid, candidate, gender, or pollingStation",
      },
    };
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

    return {
      status: 200,
      body: {
        message: "Vote cast successfully",
        txHash: tx.hash,
        txStatus,
        pollingStation,
        explorerLink: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      },
    };
  } catch (err) {
    if (err.message.includes("Already voted in this election")) {
      return {
        status: 409,
        body: {
          error: "Already voted",
          details: "You have already cast your vote in this election",
        },
      };
    }

    if (err.message.includes("Candidate not registered")) {
      return {
        status: 404,
        body: {
          error: "Candidate not found",
          details: `Candidate '${candidate}' is not registered for this election`,
        },
      };
    }

    if (err.message.includes("Invalid gender string")) {
      return {
        status: 400,
        body: {
          error: "Invalid gender",
          details: "Gender must be 'Male' or 'Female'",
        },
      };
    }

    if (err.message.includes("Election does not exist")) {
      return {
        status: 404,
        body: {
          error: "Election not found",
          details: `Election with ID '${electionId}' does not exist`,
        },
      };
    }

    if (err.message.includes("Not the owner")) {
      return {
        status: 403,
        body: {
          error: "Unauthorized",
          details: "Only contract owner can cast votes",
        },
      };
    }

    logger.error(`Error casting vote: ${err.message}`);
    return {
      status: 500,
      body: {
        error: "Internal server error",
        details: "Failed to cast vote. Please try again later.",
      },
    };
  }
};


/**
 * Check if a user has voted
 * GET /api/checkVoted
 * Requires authentication
 */
export const checkVotedService = async (electionId, uid) => {
  const hashedUid = hashUid(uid);

  const hasVoted = await contract.hasUserVoted(
    electionId,
    hashedUid
  );

  return hasVoted;
};
