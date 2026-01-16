import { voteService, checkVotedService } from "../services/vote.service.js";
import { logger } from "../utils/contract.js";

//Cast a vote. /api/vote
export const castVote = async (req, res) => {
    const { electionId, uid, candidate, gender } = req.body;

    if (!electionId || !uid || !candidate || !gender) {
        return res.status(400).send({
            error: "Missing required fields: electionId, uid, candidate, or gender"
        });
    }

    try {
        const { tx, txStatus } = await voteService(
            electionId,
            uid,
            candidate,
            gender
        );

        res.send({
            message: "Vote cast successfully",
            txHash: tx.hash,
            txStatus,
            explorerLink: `https://amoy.polygonscan.com/tx/${tx.hash}`
        });

    } catch (err) {
        logger.error(`Error casting vote: ${err.message}`);

        if (err.message.includes("Already voted in this election")) {
            res.status(409).send({
                error: "You have already voted in this election."
            });
        } else if (err.message.includes("Candidate not registered")) {
            res.status(404).send({
                error: "Candidate is not registered for this election."
            });
        } else if (err.message.includes("Invalid gender string")) {
            res.status(400).send({
                error: "Invalid gender. Use 'Male' or 'Female'."
            });
        } else if (err.message.includes("Election does not exist")) {
            res.status(404).send({
                error: "Election does not exist."
            });
        } else if (err.message.includes("Not the owner")) {
            res.status(403).send({
                error: "Unauthorized: Only contract owner can cast votes"
            });
        } else {
            res.status(400).send({ error: err.message });
        }
    }
};


//Check if a user has voted.  /api/checkVoted
export const checkVoted = async (req, res) => {
    const { electionId, uid } = req.query;

    if (!electionId || !uid) {
        return res.status(400).send({
            error: "Both electionId and VoterID are required"
        });
    }

    try {
        const hasVoted = await checkVotedService(
            electionId,
            uid
        );

        res.send({ voted: hasVoted });

    } catch (err) {
        if (err.message.includes("Not the owner")) {
            logger.warn(
                `Unauthorized vote check attempt: ${electionId}, ${uid}`
            );
            return res.status(403).send({
                error: "Unauthorized: Only contract owner can check vote status"
            });
        }

        logger.error(`Error checking vote status: ${err.message}`);
        res.status(400).send({
            error: "Error checking vote status"
        });
    }
};

