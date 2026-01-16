import { endElectionService, getAllElectionsService } from "../services/election.service.js";
import { logger } from "../utils/contract.js";

//End an election
export const endElection = async (req, res) => {
    const { electionId } = req.body;

    if (!electionId) {
        return res.status(400).json({
            error: "Missing required field: electionId"
        });
    }

    try {
        const tx = await endElectionService(electionId);

        res.json({
            message: "Election ended",
            txHash: tx.hash
        });

    } catch (err) {
        if (err.message.includes("Election does not exist")) {
            return res.status(404).json({
                error: "Election does not exist"
            });
        }

        if (err.message.includes("Not the owner")) {
            logger.warn(`Unauthorized election end attempt: ${electionId}`);
            return res.status(403).json({
                message: "Unauthorized: Only contract owner can end elections"
            });
        }

        logger.error(`Error ending election: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

//Get all elections
export const getAllElections = async (req, res) => {
    try {
        const elections = await getAllElectionsService();

        res.json({ elections });

    } catch (err) {
        if (err.message.includes("Not the owner")) {
            logger.warn(`Unauthorized elections fetch attempt`);
            return res.status(403).json({
                message: "Unauthorized: Only contract owner can view elections"
            });
        }

        logger.error(`Error fetching elections: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

