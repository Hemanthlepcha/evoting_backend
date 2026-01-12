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
export async function getVotesByElectionService(query) {
  let {
    electionId,
    electionType,
    dzongkhag,
    gewog,
    chiwog,
    demkhong,
    thromde,
  } = query;

  if (!electionId) {
    return { status: 400, body: { error: "electionId query parameter is required" } };
  }

  try {
    logger.info(`Fetching votes for election: ${electionId}`);

    // Normalize election type if provided
    if (electionType) electionType = normalizeElectionType(electionType);

    // Validate location filters
    const providedFields = [];
    if (dzongkhag) providedFields.push("dzongkhag");
    if (gewog) providedFields.push("gewog");
    if (chiwog) providedFields.push("chiwog");
    if (demkhong) providedFields.push("demkhong");
    if (thromde) providedFields.push("thromde");

    if (electionType && providedFields.length > 0) {
      const requiredFields = getRequiredLocationFields(electionType);
      const invalidFields = providedFields.filter((field) => !requiredFields.includes(field));

      if (invalidFields.length > 0) {
        return {
          status: 400,
          body: {
            error: "The location filter you provided doesn't match this election type",
            message: `You're searching for a ${electionType} election, but some location fields are invalid`,
            providedFields: invalidFields,
            requiredFields,
            hint: `Use only these fields: ${requiredFields.join(", ")}`,
          },
        };
      }
    }

    // Fetch raw data from contract
    const [
      candidates,
      locationStrings,
      candidateVotes,
      totalVotes,
      totalMale,
      totalFemale,
    ] = await contract.getCandidateVotesAndTotalElectionVotes(electionId);

    if (candidates.length === 0) {
      return {
        status: 404,
        body: {
          error: "No candidates found",
          details: `No candidates are registered for election '${electionId}'`,
          results: [],
          totalVotes: "0",
          totalMale: "0",
          totalFemale: "0",
        },
      };
    }

    // Build results
    let results = await Promise.all(
      candidates.map(async (candidate, index) => {
        const locationStr = locationStrings[index];
        let locationDetails = electionType
          ? parseLocationString(locationStr, electionType)
          : { location: locationStr };

        const [pollingStations, votesPerStation] =
          await contract.getCandidatePollingStationVotes(electionId, candidate);

        const votesByPollingStation = {};
        pollingStations.forEach((ps, idx) => {
          const count = votesPerStation[idx];
          if (count > 0n) votesByPollingStation[ps] = count.toString();
        });

        const [maleVotes, femaleVotes] = await contract.getCandidateGenderVotes(electionId, candidate);

        return {
          candidate,
          location: locationStr,
          locationDetails,
          ps_votes: votesByPollingStation,
          totalVotes: candidateVotes[index].toString(),
          totalMale: maleVotes.toString(),
          totalFemale: femaleVotes.toString(),
        };
      })
    );

    // Apply location filtering
    let filterLocationString = null;
    if (dzongkhag || gewog || chiwog || demkhong || thromde) {
      const filterLocation = { dzongkhag, gewog, chiwog, demkhong, thromde };
      Object.keys(filterLocation).forEach(
        (key) => filterLocation[key] === undefined && delete filterLocation[key]
      );
      filterLocationString = electionType ? buildLocationString(filterLocation, electionType) : null;
      if (filterLocationString) {
        results = results.filter((r) => r.location.startsWith(filterLocationString));
      }
    }

    // Recalculate totals
    let filteredTotalVotes = 0;
    let filteredTotalMale = 0;
    let filteredTotalFemale = 0;
    if (results.length > 0) {
      results.forEach((r) => {
        filteredTotalVotes += parseInt(r.totalVotes);
        filteredTotalMale += parseInt(r.totalMale);
        filteredTotalFemale += parseInt(r.totalFemale);
      });
    }

    // Polling station breakdown
    let pollingStationBreakdown = {};
    try {
      const [pollingStations, maleVotesPS, femaleVotesPS, totalVotesPS] =
        await contract.getPollingStationGenderBreakdown(electionId);

      pollingStations.forEach((ps, index) => {
        pollingStationBreakdown[ps] = {
          maleVote: parseInt(maleVotesPS[index].toString()),
          femaleVote: parseInt(femaleVotesPS[index].toString()),
          totalVote: parseInt(totalVotesPS[index].toString()),
        };
      });
    } catch (err) {
      logger.error(`Error fetching polling station breakdown: ${err.message}`);
    }

    return {
      status: 200,
      body: {
        results,
        ps: pollingStationBreakdown,
        totalVotes: filteredTotalVotes.toString(),
        totalMale: filteredTotalMale.toString(),
        totalFemale: filteredTotalFemale.toString(),
        electionType: electionType || "unknown",
        filteredBy: filterLocationString || null,
      },
    };
  } catch (err) {
    if (err.message.includes("Election ID does not exist")) {
      return { status: 404, body: { error: "Election not found", electionId } };
    }
    if (err.message.includes("Not the owner")) {
      return { status: 403, body: { error: "Unauthorized", electionId } };
    }
    logger.error(`Error fetching votesByElection: ${err.message}`);
    return { status: 500, body: { error: "Internal server error", electionId } };
  }
}

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
 * Fetch public results
 * Get public results for an election
 * GET /api/public-result/:electionId
 * Query params: electionType (optional)
 * No authentication required
 */
export async function getPublicResultsService(params, query) {
  const { electionId } = params;
  const { electionType } = query;

  if (!electionId) return { status: 400, body: { error: "electionId is required" } };

  try {
    const normalizedType = electionType ? normalizeElectionType(electionType) : null;

    const [
      candidates,
      locationStrings,
      candidateVotes,
      totalVotes,
      totalMale,
      totalFemale,
    ] = await contract.getCandidateVotesAndTotalElectionVotes(electionId);

    const results = await Promise.all(
      candidates.map(async (candidate, index) => {
        const loc = locationStrings[index];
        const locationDetails = normalizedType ? parseLocationString(loc, normalizedType) : { location: loc };

        const [pollingStations, votesPerStation] =
          await contract.getCandidatePollingStationVotes(electionId, candidate);

        const votesByPollingStation = {};
        pollingStations.forEach((ps, idx) => {
          votesByPollingStation[ps] = votesPerStation[idx].toString();
        });

        const [maleVotes, femaleVotes] = await contract.getCandidateGenderVotes(electionId, candidate);

        return {
          candidate,
          location: loc,
          locationDetails,
          demkhong: loc,
          votes: votesByPollingStation,
          totalVotes: candidateVotes[index].toString(),
          totalMale: maleVotes.toString(),
          totalFemale: femaleVotes.toString(),
        };
      })
    );

    let pollingStationBreakdown = {};
    try {
      const [pollingStations, maleVotesPS, femaleVotesPS, totalVotesPS] =
        await contract.getPollingStationGenderBreakdown(electionId);

      pollingStations.forEach((ps, index) => {
        pollingStationBreakdown[ps] = {
          maleVote: parseInt(maleVotesPS[index].toString()),
          femaleVote: parseInt(femaleVotesPS[index].toString()),
          totalVote: parseInt(totalVotesPS[index].toString()),
        };
      });
    } catch (err) {
      logger.error(`Error fetching polling station breakdown: ${err.message}`);
    }

    return { status: 200, body: { results, ps: pollingStationBreakdown, totalVotes: totalVotes.toString(), totalMale: totalMale.toString(), totalFemale: totalFemale.toString() } };
  } catch (err) {
    if (err.message.includes("Election ID does not exist")) return { status: 404, body: { error: "Election not found" } };
    logger.error(`Error fetching public results: ${err.message}`);
    return { status: 500, body: { error: "Internal server error" } };
  }
}


/**
 * Legacy endpoint for backward compatibility
 * GET /api/demkhongResults
 * Query params: electionId, electionType (optional)
 * Requires authentication
 */
export async function getDemkhongResultsService(query) {
  const { electionId, electionType } = query;

  if (!electionId) {
    return res
      .status(400)
      .json({ error: "electionId query parameter is required" });
  }

  try {
    // Normalize election type if provided
    if (electionType) {
      electionType = normalizeElectionType(electionType);
    }

    const [
      locationStrings,
      totalVotesByLocation,
      maleByLocation,
      femaleByLocation,
    ] = await contract.getDemkhongResults(electionId);

    const results = locationStrings.map((locationStr, index) => {
      let locationDetails = {};

      if (electionType) {
        locationDetails = parseLocationString(locationStr, electionType);
      } else {
        locationDetails = { location: locationStr };
      }

      return {
        location: locationStr,
        locationDetails,
        demkhong: locationStr, // backward compatibility
        totalVotes: totalVotesByLocation[index].toString(),
        maleVotes: maleByLocation[index].toString(),
        femaleVotes: femaleByLocation[index].toString(),
      };
    });

    logger.info(`Fetched geographical results for election: ${electionId}`);
    res.json({ results });
  } catch (err) {
    if (err.message.includes("Election does not exist")) {
      return res.status(404).json({
        error: "Election not found",
        details: `Election with ID '${electionId}' does not exist`,
        electionId,
      });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(
        `Unauthorized geographical results fetch attempt: ${electionId}`
      );
      return res.status(403).json({
        error: "Unauthorized",
        details: "Only contract owner can view geographical results",
      });
    }
    logger.error(`Error fetching geographical results: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to fetch geographical results. Please try again later.",
      electionId,
    });
  }
};
