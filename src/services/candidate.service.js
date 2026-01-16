import { logger } from "../utils/logger.js";
import { contract } from "../utils/contract.js";

//POST /api/register
export const registerCandidateService = async (electionId, candidate, demkhong) => {
    try {
        const tx = await contract.registerCandidate(electionId, candidate, demkhong);
        await tx.wait();

        logger.info(
            `Candidate registered: ${candidate} in ${demkhong}, txHash: ${tx.hash}`
        );

        return tx;
    } catch (err) {
        throw err; 
    }
};

//DELETE /api/remove
export const removeCandidateService = async (electionId, candidate) => {
    try {
        const tx = await contract.removeCandidate(electionId, candidate);
        await tx.wait();

        logger.info(
            `Candidate removed: ${candidate}, txHash: ${tx.hash}`
        );

        return tx;
    } catch (err) {
        throw err; 
    }
};

