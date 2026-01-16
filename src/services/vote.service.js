import { contract, hashUid, logger } from "../utils/contract.js";

/**
 * Cast a vote
 * POST /api/vote
 * Requires authentication
 */
export const voteService = async (electionId, uid, candidate, gender) => {
    try {
        const hashedUid = hashUid(uid);

        const tx = await contract.vote(
            electionId,
            hashedUid,
            candidate,
            gender
        );

        const receipt = await tx.wait();
        const txStatus = receipt.status === 1 ? "success" : "fail";

        logger.info(`Vote cast | Tx: ${tx.hash} | Status: ${txStatus}`);

        return {
            tx,
            txStatus
        };
    } catch (err) {
        throw err; // rethrow exactly
    }
};


/**
 * Check if a user has voted
 * GET /api/checkVoted
 * Requires authentication
 */
export const checkVotedService = async (electionId, uid) => {
    try {
        const hashedUid = hashUid(uid);

        const hasVoted = await contract.hasUserVoted(
            electionId,
            hashedUid
        );

        return hasVoted;
    } catch (err) {
        throw err; 
    }
};
