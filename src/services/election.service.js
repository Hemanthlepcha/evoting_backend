import { contract, logger } from "../utils/contract.js";

/**
 * End an election
 * POST /api/end
 * Requires authentication
 */
export const endElectionService = async (body) => {
  const { electionId } = body;

  if (!electionId) {
    return {
      status: 400,
      body: {
        error: "Missing required field: electionId",
      },
    };
  }

  try {
    const tx = await contract.endElection(electionId);
    await tx.wait();

    logger.info(`Election ended: ${electionId}, txHash: ${tx.hash}`);

    return {
      status: 200,
      body: {
        message: "Election ended",
        txHash: tx.hash,
      },
    };
  } catch (err) {
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
      logger.warn(`Unauthorized election end attempt: ${electionId}`);
      return {
        status: 403,
        body: {
          error: "Unauthorized",
          details: "Only contract owner can end elections",
        },
      };
    }

    logger.error(`Error ending election: ${err.message}`);
    return {
      status: 500,
      body: {
        error: "Internal server error",
        details: "Failed to end election. Please try again later.",
      },
    };
  }
};

/**
 * Get all elections
 * GET /api/elections
 * Requires authentication
 */
export const getAllElectionsService = async () => {
  try {
    const elections = await contract.getAllElections();
    logger.info(`Fetched all elections: ${elections.length} elections`);

    return {
      status: 200,
      body: { elections },
    };
  } catch (err) {
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized elections fetch attempt`);
      return {
        status: 403,
        body: {
          error: "Unauthorized",
          details: "Only contract owner can view elections",
        },
      };
    }

    logger.error(`Error fetching elections: ${err.message}`);
    return {
      status: 500,
      body: {
        error: "Internal server error",
        details: "Failed to fetch elections. Please try again later.",
      },
    };
  }
};
