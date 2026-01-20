import { contract, logger } from "../utils/contract.js";
import { parseLocationString, buildLocationString, getRequiredLocationFields } from "../election/election.location.js";
import { getLocationLabel, normalizeElectionType } from "../election/election.type.js";

/**
 * Get detailed votes by election with location and gender breakdown
 * GET /api/votesByElection
 * Query params: electionId, electionType (optional), location filters (optional)
 * Requires authentication
 */
export const getVotesByElectionService = async ({
  electionId,
  electionType,
  dzongkhag,
  gewog,
  chiwog,
  demkhong,
  thromde,
}) => {
  try {
    // Normalize election type
    if (electionType) {
      electionType = normalizeElectionType(electionType);

      const providedFields = [
        dzongkhag && "dzongkhag",
        gewog && "gewog",
        chiwog && "chiwog",
        demkhong && "demkhong",
        thromde && "thromde",
      ].filter(Boolean);

      if (providedFields.length) {
        const required = getRequiredLocationFields(electionType);
        const invalid = providedFields.filter(
          (f) => !required.includes(f)
        );

        if (invalid.length) {
          throw {
            code: "BAD_REQUEST",
            payload: {
              error: "Location fields do not match election type",
              providedFields: invalid,
              requiredFields: required,
            },
          };
        }
      }
    }

    const [
      candidates,
      locationStrings,
      candidateVotes,
      totalVotes,
      totalMale,
      totalFemale,
    ] = await contract.getCandidateVotesAndTotalElectionVotes(electionId);

    if (!candidates.length) {
      throw {
        code: "NOT_FOUND",
        payload: {
          error: "No candidates found",
          results: [],
          totalVotes: "0",
          totalMale: "0",
          totalFemale: "0",
        },
      };
    }

    // Detect election type if missing
    if (!electionType && locationStrings.length) {
      const parts = locationStrings[0].split("/");
      if (parts.length === 1) electionType = ELECTION_TYPES.NC;
      if (parts.length === 3) electionType = ELECTION_TYPES.C_TSHOGPA;
    }

    // Build location filter
    let filterLocationString = null;
    const filterLocation = {
      dzongkhag,
      gewog,
      chiwog,
      demkhong,
      thromde,
    };

    Object.keys(filterLocation).forEach(
      (k) => filterLocation[k] === undefined && delete filterLocation[k]
    );

    if (electionType && Object.keys(filterLocation).length) {
      filterLocationString = buildLocationString(
        filterLocation,
        electionType
      );
    }

    // Candidate-level results
    let allResults = await Promise.all(
      candidates.map(async (candidate, index) => {
        const location = locationStrings[index];

        const locationDetails = electionType
          ? parseLocationString(location, electionType)
          : { location };

        const [ps, votesPS] =
          await contract.getCandidatePollingStationVotes(
            electionId,
            candidate
          );

        const psVotes = {};
        ps.forEach((p, i) => {
          if (votesPS[i] > 0n) psVotes[p] = votesPS[i].toString();
        });

        const [male, female] =
          await contract.getCandidateGenderVotes(
            electionId,
            candidate
          );

        return {
          candidate,
          location,
          locationDetails,
          ps_votes: psVotes,
          totalVotes: candidateVotes[index].toString(),
          totalMale: male.toString(),
          totalFemale: female.toString(),
        };
      })
    );

    // Apply location filter
    let results = filterLocationString
      ? allResults.filter((r) =>
          r.location.startsWith(filterLocationString)
        )
      : allResults;

    if (filterLocationString && !results.length) {
      throw {
        code: "NOT_FOUND",
        payload: {
          error: "No results found for given location",
          searchedLocation: filterLocationString,
          results: [],
        },
      };
    }

    // Polling station gender breakdown
    let pollingStationBreakdown = {};
    try {
      const [ps, malePS, femalePS, totalPS] =
        await contract.getPollingStationGenderBreakdown(electionId);

      ps.forEach((p, i) => {
        pollingStationBreakdown[p] = {
          maleVote: Number(malePS[i]),
          femaleVote: Number(femalePS[i]),
          totalVote: Number(totalPS[i]),
        };
      });
    } catch (err) {
      logger.warn("Polling station breakdown skipped");
    }

    return {
      results,
      ps: pollingStationBreakdown,
      totalVotes: filterLocationString ? undefined : totalVotes.toString(),
      totalMale: filterLocationString ? undefined : totalMale.toString(),
      totalFemale: filterLocationString
        ? undefined
        : totalFemale.toString(),
      electionType: electionType || "unknown",
      filteredBy: filterLocationString,
    };
  } catch (err) {
    if (err.message?.includes("Not the owner")) {
      throw {
        code: "UNAUTHORIZED",
        payload: {
          error: "Unauthorized",
          details: "Only contract owner can view results",
        },
      };
    }

    if (err.message?.includes("Election")) {
      throw {
        code: "NOT_FOUND",
        payload: {
          error: "Election not found",
          electionId,
        },
      };
    }

    throw err;
  }
};


/**
 * Fetch public results after election ends
 * Get public results for an election
 * GET /api/public-result/:electionId
 * Query params: electionType (optional)
 * No authentication required
 */
export const getPublicResultsService = async ({
  electionId,
  electionType,
}) => {
  try {
    // Normalize election type if provided
    if (electionType) {
      electionType = normalizeElectionType(electionType);
    }

    // OPTIONAL: Uncomment if public results must be restricted
    /*
    const isEnded = await contract.isElectionEnded(electionId);
    if (!isEnded) {
      throw {
        code: "FORBIDDEN",
        payload: { message: "Election is not yet ended." },
      };
    }
    */

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
        const locationStr = locationStrings[index];

        const locationDetails = electionType
          ? parseLocationString(locationStr, electionType)
          : { location: locationStr };

        const [pollingStations, votesPerStation] =
          await contract.getCandidatePollingStationVotes(
            electionId,
            candidate
          );

        const votesByPollingStation = {};
        pollingStations.forEach((ps, idx) => {
          votesByPollingStation[ps] = votesPerStation[idx].toString();
        });

        const [maleVotes, femaleVotes] =
          await contract.getCandidateGenderVotes(
            electionId,
            candidate
          );

        return {
          candidate,
          location: locationStr,
          locationDetails,
          demkhong: locationStr, // backward compatibility
          votes: votesByPollingStation,
          totalVotes: candidateVotes[index].toString(),
          totalMale: maleVotes.toString(),
          totalFemale: femaleVotes.toString(),
        };
      })
    );

    // Polling station gender breakdown
    let pollingStationBreakdown = {};
    try {
      const [ps, malePS, femalePS, totalPS] =
        await contract.getPollingStationGenderBreakdown(electionId);

      ps.forEach((station, index) => {
        pollingStationBreakdown[station] = {
          maleVote: Number(malePS[index]),
          femaleVote: Number(femalePS[index]),
          totalVote: Number(totalPS[index]),
        };
      });
    } catch (err) {
      logger.warn(
        `Polling station breakdown unavailable: ${err.message}`
      );
    }

    logger.info(`Public results fetched for election: ${electionId}`);

    return {
      results,
      ps: pollingStationBreakdown,
      totalVotes: totalVotes.toString(),
      totalMale: totalMale.toString(),
      totalFemale: totalFemale.toString(),
    };
  } catch (err) {
    if (err.message?.includes("Election ID does not exist")) {
      throw {
        code: "NOT_FOUND",
        payload: {
          error: "Election not found",
          details: `Election with ID '${electionId}' does not exist`,
        },
      };
    }

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
export const getGeographicalResultsService = async ({ electionId, electionType }) => {
  try {
    // Normalize election type if provided
    if (electionType) electionType = normalizeElectionType(electionType);

    // Fetch location-level results from contract
    const [
      locationStrings,
      totalVotesByLocation,
      maleByLocation,
      femaleByLocation
    ] = await contract.getDemkhongResults(electionId);

    const results = locationStrings.map((locationStr, index) => {
      let locationDetails = { location: locationStr };
      let locationLabel = "Location";

      if (electionType) {
        locationDetails = parseLocationString(locationStr, electionType);
        locationLabel = getLocationLabel(electionType);
      }

      return {
        location: locationStr,
        locationDetails,
        [locationLabel.toLowerCase()]: locationStr, // backward compatibility
        totalVotes: totalVotesByLocation[index].toString(),
        maleVotes: maleByLocation[index].toString(),
        femaleVotes: femaleByLocation[index].toString(),
      };
    });

    logger.info(`Fetched geographical results for election: ${electionId} (Type: ${electionType || "unknown"})`);

    return {
      results,
      electionType: electionType || "unknown",
      locationLabel: electionType ? getLocationLabel(electionType) : "Location"
    };
  } catch (err) {
    if (err.message.includes("Election does not exist")) {
      throw {
        code: "NOT_FOUND",
        payload: {
          error: "Election not found",
          details: `Election with ID '${electionId}' does not exist`,
          electionId,
        }
      };
    }
    if (err.message.includes("Not the owner")) {
      throw {
        code: "FORBIDDEN",
        payload: {
          error: "Unauthorized",
          details: "Only contract owner can view geographical results",
        }
      };
    }

    logger.error(`Error fetching geographical results: ${err.message}`);
    throw err;
  }
};

/**
 * Legacy endpoint for backward compatibility
 * GET /api/demkhongResults
 * Query params: electionId, electionType (optional)
 * Requires authentication
 */
/*export const getDemkhongResultsService = async (electionId) => {
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
};*/

// Helper function to avoid code duplication
async function geographicalResultsHandler(req, res) {
  let { electionId, electionType } = req.query;

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
}

