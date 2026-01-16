import {
  getVotesByElectionService,
  getGeographicalResultsService,
  getPublicResultService,
  getDemkhongResultsService
} from "../services/results.service.js";
import { logger } from "../utils/contract.js";

//Get detailed votes by election with location and gender breakdown. /api/votesByElection


export const getVotesByElection = async (req, res) => {
    const { electionId } = req.query;

    if (!electionId) {
        return res.status(400).json({
            error: "electionId query parameter is required"
        });
    }

    try {
        const data = await getVotesByElectionService(electionId);
        res.json(data);

    } catch (err) {
        if (err.message.includes("Election ID does not exist")) {
            logger.warn(`Election not found: ${electionId}`);
            return res.status(404).json({
                error: "Election ID does not exist",
                electionId,
                results: []
            });
        }

        if (err.message.includes("Not the owner")) {
            logger.warn(`Unauthorized results fetch attempt: ${electionId}`);
            return res.status(403).json({
                message: "Unauthorized: Only contract owner can view detailed results"
            });
        }

        logger.error(`Error fetching all vote counts: ${err.message}`);
        res.status(400).json({
            error: "Error fetching election results",
            electionId,
            results: []
        });
    }
};

// GET /api/public-result/:electionId
export const getPublicResult = async (req, res) => {
    const { electionId } = req.params;

    try {
        const result = await getPublicResultService(electionId);

        if (result.status !== 200) {
            return res.status(result.status).json(result.body);
        }

        res.json(result.body);

    } catch (err) {
        if (err.message.includes("Election ID does not exist")) {
            return res.status(404).json({ error: "Election does not exist" });
        }

        logger.error(`Error fetching public results: ${err.message}`);
        res.status(400).json({ error: "Error fetching election results" });
    }
};

// Get geographical area results. /api/geographicalResults
export async function getGeographicalResults(req, res) {
  const result = await getGeographicalResultsService(req.query);
  return res.status(result.status).json(result.body);
}



// GET /api/demkhongResults
export const getDemkhongResults = async (req, res) => {
    const { electionId } = req.query;

    if (!electionId) {
        return res.status(400).json({ error: "electionId query parameter is required" });
    }

    try {
        const result = await getDemkhongResultsService(electionId);

        res.status(result.status).json(result.body);

    } catch (err) {
        if (err.message.includes("Election does not exist")) {
            return res.status(404).json({
                error: "Election ID does not exist",
                electionId,
                results: []
            });
        }

        if (err.message.includes("Not the owner")) {
            logger.warn(`Unauthorized constituency results fetch attempt: ${electionId}`);
            return res.status(403).json({
                message: "Unauthorized: Only contract owner can view constituency results"
            });
        }

        logger.error(`Error fetching constituency results: ${err.message}`);
        res.status(400).json({
            error: "Error fetching constituency results",
            electionId,
            results: []
        });
    }
};
