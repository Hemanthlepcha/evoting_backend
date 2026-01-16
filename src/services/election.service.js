import { contract, logger } from "../utils/contract.js";

/**
 * End an election
 * POST /api/end
 * Requires authentication
 */
export const endElectionService = async (electionId) => {
    try {
        const tx = await contract.endElection(electionId);
        await tx.wait();

        logger.info(
            `Election ended: ${electionId}, txHash: ${tx.hash}`
        );

        return tx;
    } catch (err) {
        throw err; 
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

        return elections;
    } catch (err) {
        throw err;
    }
};
