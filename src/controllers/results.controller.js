import {
  getVotesByElectionService,
  getGeographicalResultsService,
  getPublicResultsService,
} from "../services/results.service.js";

//Get detailed votes by election with location and gender breakdown. /api/votesByElection
export async function getVotesByElection(req, res) {
  const result = await getVotesByElectionService(req.query);
  return res.status(result.status).json(result.body);
}

// Get geographical area results. /api/geographicalResults
export async function getGeographicalResults(req, res) {
  const result = await getGeographicalResultsService(req.query);
  return res.status(result.status).json(result.body);
}
// GET /api/public-result/:electionId
export async function getPublicResults(req, res) {
  const result = await getPublicResultsService(req.params, req.query);
  return res.status(result.status).json(result.body);
}

// GET /api/demkhongResults
export async function getDemkhongResultsService(req, res) {
  const result = await getDemkhongResultsService(req.params, req.query);
  return res.status(result.status).json(result.body);
}