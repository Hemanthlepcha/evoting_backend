import {
  registerCandidateService,
  removeCandidateService,
} from "../services/candidate.service.js";

//register a candidate
export const registerCandidate = async (req, res) => {
  const result = await registerCandidateService(req.body);
  res.status(result.status).json(result.body);
};

//remove a candidate
export const removeCandidate = async (req, res) => {
  const result = await removeCandidateService(req.body);
  res.status(result.status).json(result.body);
};
