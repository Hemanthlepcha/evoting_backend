import {
  endElectionService,
  getAllElectionsService,
} from "../services/election.service.js";

//End an election
export async function endElection(req, res) {
  const result = await endElectionService(req.body);
  return res.status(result.status).json(result.body);
}

//Get all elections
export async function getAllElections(req, res) {
  const result = await getAllElectionsService();
  return res.status(result.status).json(result.body);
}
