import { castVoteService, checkVotedService } from "../services/vote.service.js";

//Cast a vote. /api/vote
export async function castVote(req, res) {
  const result = await castVoteService(req.body);
  return res.status(result.status).json(result.body);
}

//Check if a user has voted.  /api/checkVoted
export async function checkVoted(req, res) {
  const result = await checkVotedService(req.query);
  return res.status(result.status).json(result.body);
}
