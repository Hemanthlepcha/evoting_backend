import {
  endElectionService,
  getAllElectionsService,
} from "../services/election.service.js";

//End an election
export const endElection = async (req, res) => {
  const result = await endElectionService(req.body);
  res.status(result.status).json(result.body);
};

//Get all elections
export const getAllElections = async (req, res) => {
  const result = await getAllElectionsService();
  res.status(result.status).json(result.body);
};
