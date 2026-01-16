import { contract, logger } from "../utils/contract.js";
import {
  parseLocationString,
  buildLocationString,
  getRequiredLocationFields,
} from "../election/election.location.js";
import { getLocationLabel, normalizeElectionType } from "../election/election.type.js";

/**
 * Get detailed votes by election with location and gender breakdown
 * GET /api/votesByElection
 * Query params: electionId, electionType (optional), location filters (optional)
 * Requires authentication
 */
export const getVotesByElectionService = async (electionId) => {
    try {
        console.log(`Fetching votes for election: ${electionId}`);

        const [
            candidates,
            demkhongs,
            candidateVotes,
            totalVotes,
            totalMale,
            totalFemale
        ] = await contract.getCandidateVotesAndTotalElectionVotes(electionId);

        const results = candidates.map((candidate, index) => ({
            candidate,
            demkhong: demkhongs[index],
            votes: candidateVotes[index].toString(),
        }));

        logger.info(`Admin fetched results for election: ${electionId}`);

        return {
            results,
            totalVotes: totalVotes.toString(),
            totalMale: totalMale.toString(),
            totalFemale: totalFemale.toString()
        };
    } catch (err) {
        throw err; // important: propagate original error
    }
};

/**
 * Fetch public results after election ends
 * Get public results for an election
 * GET /api/public-result/:electionId
 * Query params: electionType (optional)
 * No authentication required
 */
export const getPublicResultService = async (electionId) => {
    try {
        const isEnded = await contract.isElectionEnded(electionId);

        if (!isEnded) {
            logger.warn(`Public result request denied - election not ended: ${electionId}`);
            return { status: 403, body: { message: "Election is not yet ended." } };
        }

        const [candidates, demkhongs, candidateVotes, totalVotes, totalMale, totalFemale] =
            await contract.getCandidateVotesAndTotalElectionVotes(electionId);

        const results = candidates.map((candidate, index) => ({
            candidate,
            demkhong: demkhongs[index],
            votes: candidateVotes[index].toString(),
        }));

        logger.info(`Public results fetched for election: ${electionId}`);

        return {
            status: 200,
            body: {
                results,
                totalVotes: totalVotes.toString(),
                totalMale: totalMale.toString(),
                totalFemale: totalFemale.toString()
            }
        };

    } catch (err) {
        throw err;
    }
};

/**
 * Fetch geographical results (demkhong)
 * Get geographical area results
 * GET /api/geographicalResults
 * Query params: electionId, electionType (optional)
 * Requires authentication
 */
export async function getGeographicalResultsService(query) {
  const { electionId, electionType } = query;

  if (!electionId) return { status: 400, body: { error: "electionId query parameter is required" } };

  try {
    const normalizedType = electionType ? normalizeElectionType(electionType) : null;

    const [locationStrings, totalVotesByLocation, maleByLocation, femaleByLocation] =
      await contract.getDemkhongResults(electionId);

    const results = locationStrings.map((loc, i) => {
      const locationDetails = normalizedType ? parseLocationString(loc, normalizedType) : { location: loc };
      const locationLabel = normalizedType ? getLocationLabel(normalizedType) : "Location";
      return {
        location: loc,
        locationDetails,
        [locationLabel.toLowerCase()]: loc,
        totalVotes: totalVotesByLocation[i].toString(),
        maleVotes: maleByLocation[i].toString(),
        femaleVotes: femaleByLocation[i].toString(),
      };
    });

    return { status: 200, body: { results, electionType: normalizedType || "unknown", locationLabel: normalizedType ? getLocationLabel(normalizedType) : "Location" } };
  } catch (err) {
    if (err.message.includes("Election does not exist")) return { status: 404, body: { error: "Election not found", electionId } };
    if (err.message.includes("Not the owner")) return { status: 403, body: { error: "Unauthorized", electionId } };
    logger.error(`Error fetching geographical results: ${err.message}`);
    return { status: 500, body: { error: "Internal server error", electionId } };
  }
}

/**
 * Legacy endpoint for backward compatibility
 * GET /api/demkhongResults
 * Query params: electionId, electionType (optional)
 * Requires authentication
 */
export const getDemkhongResultsService = async (electionId) => {
    try {
        const [demkhongs, totalVotesByDemkhong, maleByDemkhong, femaleByDemkhong] =
            await contract.getDemkhongResults(electionId);

        const results = demkhongs.map((demkhong, index) => ({
            demkhong,
            totalVotes: totalVotesByDemkhong[index].toString(),
            maleVotes: maleByDemkhong[index].toString(),
            femaleVotes: femaleByDemkhong[index].toString()
        }));

        logger.info(`Fetched constituency results for election: ${electionId}`);

        return {
            status: 200,
            body: { results }
        };

    } catch (err) {
        throw err; 
    }
};

