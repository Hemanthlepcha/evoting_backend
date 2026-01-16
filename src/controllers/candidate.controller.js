import { registerCandidateService, removeCandidateService } from "../services/candidate.service.js";
import { logger } from "../utils/contract.js";

//register a candidate
export const registerCandidate = async (req, res) => {
    const { electionId, candidate, demkhong } = req.body;

    if (!electionId || !candidate || !demkhong) {
        return res.status(400).json({
            error: "Missing required fields: electionId, candidate, or demkhong"
        });
    }

    try {
        const tx = await registerCandidateService(
            electionId,
            candidate,
            demkhong
        );

        res.json({
            message: "Candidate registered",
            txHash: tx.hash
        });

    } catch (err) {
        if (err.message.includes("Candidate already registered")) {
            logger.warn(`Candidate already registered: ${candidate}`);
            return res.status(409).json({
                message: "Candidate Already Registered"
            });
        }

        if (err.message.includes("Not the owner")) {
            logger.warn(`Unauthorized candidate registration attempt: ${candidate}`);
            return res.status(403).json({
                message: "Unauthorized: Only contract owner can register candidates"
            });
        }

        logger.error(`Error registering candidate: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

//remove a candidate
export const removeCandidate = async (req, res) => {
    const { electionId, candidate } = req.body;

    if (!electionId || !candidate) {
        return res.status(400).json({
            error: "Missing required fields: electionId or candidate"
        });
    }

    try {
        const tx = await removeCandidateService(
            electionId,
            candidate
        );

        res.json({
            message: "Candidate removed",
            txHash: tx.hash
        });

    } catch (err) {
        if (err.message.includes("Candidate not registered")) {
            logger.warn(`Candidate not found: ${candidate}`);
            return res.status(404).json({
                error: "Candidate not registered"
            });
        }

        if (err.message.includes("Not the owner")) {
            logger.warn(`Unauthorized candidate removal attempt: ${candidate}`);
            return res.status(403).json({
                message: "Unauthorized: Only contract owner can remove candidates"
            });
        }

        if (err.message.includes("Election does not exist")) {
            return res.status(404).json({
                error: "Election does not exist"
            });
        }

        logger.error(`Error removing candidate: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

