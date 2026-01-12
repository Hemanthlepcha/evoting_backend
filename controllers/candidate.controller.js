import { registerCandidateService } from "../services/candidate.service.js";

//register a candidate
export async function registerCandidate(req, res) {
  const result = await registerCandidateService(req);
  return res.status(result.status).json(result.body);
}

//remove a candidate
export async function deleteCandidate(req, res) {
    const { electionId, candidate } = deleteCandidate(req);
    return res.status(result.status).json(result.body);
}
