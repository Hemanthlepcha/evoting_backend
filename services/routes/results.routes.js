import { Router } from "express";
import {
  ELECTION_TYPES,
  parseLocationString,
  getLocationLabel,
  normalizeElectionType,
  buildLocationString,
  getRequiredLocationFields,
} from "../../utils/electionTypes.js";
import { contract, logger } from "../utils.js";
import { authMiddleware } from "../../auth/auth.js";

const router = Router();

/**
 * Get detailed votes by election with location and gender breakdown
 * GET /api/votesByElection
 * Query params: electionId, electionType (optional), location filters (optional)
 * Requires authentication
 */
router.get("/votesByElection", authMiddleware, async (req, res) => {
  let {
    electionId,
    electionType,
    dzongkhag,
    gewog,
    chiwog,
    demkhong,
    thromde,
  } = req.query;

  if (!electionId) {
    return res
      .status(400)
      .json({ error: "electionId query parameter is required" });
  }

  try {
    logger.info(`Fetching votes for election: ${electionId}`);

    // Normalize election type if provided
    if (electionType) {
      electionType = normalizeElectionType(electionType);

      // Validate that provided location fields match the election type
      const providedFields = [];
      if (dzongkhag) providedFields.push("dzongkhag");
      if (gewog) providedFields.push("gewog");
      if (chiwog) providedFields.push("chiwog");
      if (demkhong) providedFields.push("demkhong");
      if (thromde) providedFields.push("thromde");

      if (providedFields.length > 0) {
        // Check if provided fields are valid for this election type
        const requiredFields = getRequiredLocationFields(electionType);
        const invalidFields = providedFields.filter(
          (field) => !requiredFields.includes(field)
        );

        if (invalidFields.length > 0) {
          return res.status(400).json({
            error:
              "The location filter you provided doesn't match this election type",
            message: `You're searching for a ${electionType} election, but the location fields you provided are not valid for this type`,
            providedFields: invalidFields,
            requiredFields: requiredFields,
            hint: `Please use only these location fields: ${requiredFields.join(
              ", "
            )}`,
          });
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

    // If no candidates found
    if (candidates.length === 0) {
      return res.status(404).json({
        error: "No candidates found",
        details: `No candidates are registered for election '${electionId}'`,
        results: [],
        totalVotes: "0",
        totalMale: "0",
        totalFemale: "0",
      });
    }

    // Detect election type from first candidate's location if not provided
    let detectedElectionType = null;
    if (!electionType && locationStrings.length > 0) {
      const firstLocationStr = locationStrings[0];
      const parts = firstLocationStr.split("/");

      // Detect based on structure: count parts and check patterns
      if (parts.length === 1) {
        detectedElectionType = ELECTION_TYPES.NC; // Only dzongkhag
      } else if (parts.length === 2) {
        // Could be NA (dzongkhag/demkhong), GUP/MANGMI (dzongkhag/gewog),
        // THROMPOEN (dzongkhag/thromde), or T_TSHOGPA (dzongkhag/thromde)
        // We can't distinguish between these without more context
        detectedElectionType = null; // User must provide electionType
      } else if (parts.length === 3) {
        detectedElectionType = ELECTION_TYPES.C_TSHOGPA; // dzongkhag/gewog/chiwog
      }

      if (detectedElectionType) {
        electionType = detectedElectionType;
      }
    }

    // If electionType is provided, validate that candidates match this structure
    if (electionType && locationStrings.length > 0) {
      const expectedPartCount = getRequiredLocationFields(electionType).length;
      const firstCandidatePartCount = locationStrings[0].split("/").length;

      if (expectedPartCount !== firstCandidatePartCount) {
        return res.status(400).json({
          error: "Election type does not match",
          message: `The election '${electionId}' is not a ${electionType} election. Please check your election ID or election type.`,
          hint: "Make sure you're using the correct election ID for the type of election you want to view",
        });
      }
    }

    // Build filter location string based on provided query params
    let filterLocationString = null;
    if (dzongkhag || gewog || chiwog || demkhong || thromde) {
      const filterLocation = {
        dzongkhag,
        gewog,
        chiwog,
        demkhong,
        thromde,
      };

      // Remove undefined values
      Object.keys(filterLocation).forEach(
        (key) => filterLocation[key] === undefined && delete filterLocation[key]
      );

      if (electionType && Object.keys(filterLocation).length > 0) {
        filterLocationString = buildLocationString(
          filterLocation,
          electionType
        );
      }
    }

    // Fetch polling station breakdown for each candidate
    let allResults = await Promise.all(
      candidates.map(async (candidate, index) => {
        const locationStr = locationStrings[index];
        let locationDetails = {};

        if (electionType) {
          locationDetails = parseLocationString(locationStr, electionType);
        } else {
          // If electionType not provided, include raw location string
          locationDetails = { location: locationStr };
        }

        // Get polling station breakdown for this candidate
        const [pollingStations, votesPerStation] =
          await contract.getCandidatePollingStationVotes(electionId, candidate);

        // Convert to object format: { "PS1": "12", "PS2": "29" }
        const votesByPollingStation = {};

        pollingStations.forEach((ps, idx) => {
          const count = votesPerStation[idx];

          if (count > 0n) {
            // BigInt-safe check
            votesByPollingStation[ps] = count.toString();
          }
        });

        // Get gender breakdown for this candidate
        const [maleVotes, femaleVotes] = await contract.getCandidateGenderVotes(
          electionId,
          candidate
        );

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

    // Filter results based on location if filterLocationString is provided
    let results = allResults;
    if (filterLocationString) {
      results = allResults.filter((result) => {
        // Check if candidate's location starts with the filter location
        // This allows hierarchical filtering (dzongkhag filters all gewogs within it, etc.)
        return result.location.startsWith(filterLocationString);
      });

      logger.info(
        `Filtered results for election: ${electionId}, location: ${filterLocationString}, found: ${results.length} candidates`
      );

      // If no results match the filter, return specific message
      if (results.length === 0) {
        return res.status(404).json({
          error: "No results found for given location",
          results: [],
          totalVotes: "0",
          totalMale: "0",
          totalFemale: "0",
          hint: "There are no candidates registered for this location. Please check if you entered the correct location details.",
          searchedLocation: filterLocationString,
        });
      }
    }

    // Recalculate totals based on filtered results
    let filteredTotalVotes = 0;
    let filteredTotalMale = 0;
    let filteredTotalFemale = 0;

    if (filterLocationString && results.length > 0) {
      // For filtered results, we need to get gender breakdown from the smart contract
      // by calling getDemkhongResults which provides location-specific gender data
      try {
        const [
          locationStringsGender,
          totalVotesByLocation,
          maleByLocation,
          femaleByLocation,
        ] = await contract.getDemkhongResults(electionId);

        // Find matching locations and sum up gender votes
        locationStringsGender.forEach((locStr, index) => {
          if (locStr.startsWith(filterLocationString)) {
            filteredTotalVotes += parseInt(
              totalVotesByLocation[index].toString()
            );
            filteredTotalMale += parseInt(maleByLocation[index].toString());
            filteredTotalFemale += parseInt(femaleByLocation[index].toString());
          }
        });
      } catch (err) {
        logger.error(
          `Error fetching gender breakdown for filtered location: ${err.message}`
        );
        // Fallback: just calculate total votes from results
        results.forEach((result) => {
          filteredTotalVotes += parseInt(result.totalVotes);
        });
      }
    } else {
      filteredTotalVotes = totalVotes;
      filteredTotalMale = totalMale;
      filteredTotalFemale = totalFemale;
    }

    // Fetch polling station gender breakdown
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
      // Continue without polling station breakdown if it fails
    }

    logger.info(`Admin fetched results for election: ${electionId}`);

    res.json({
      results,
      ps: pollingStationBreakdown,
      totalVotes: filteredTotalVotes.toString(),
      totalMale: filteredTotalMale.toString(),
      totalFemale: filteredTotalFemale.toString(),
      electionType: electionType || "unknown",
      filteredBy: filterLocationString || null,
    });
  } catch (err) {
    if (err.message.includes("Election ID does not exist")) {
      logger.warn(`Election not found: ${electionId}`);
      return res.status(404).json({
        error: "Election not found",
        details: `Election with ID '${electionId}' does not exist`,
        electionId,
      });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized results fetch attempt: ${electionId}`);
      return res.status(403).json({
        error: "Unauthorized",
        details: "Only contract owner can view detailed results",
      });
    }
    logger.error(`Error fetching all vote counts: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to fetch election results. Please try again later.",
      electionId,
    });
  }
});

/**
 * Get geographical area results
 * GET /api/geographicalResults
 * Query params: electionId, electionType (optional)
 * Requires authentication
 */
router.get("/geographicalResults", authMiddleware, async (req, res) => {
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
      let locationLabel = "Location";

      if (electionType) {
        locationDetails = parseLocationString(locationStr, electionType);
        locationLabel = getLocationLabel(electionType);
      } else {
        locationDetails = { location: locationStr };
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

    logger.info(
      `Fetched geographical results for election: ${electionId} (Type: ${
        electionType || "unknown"
      })`
    );
    res.json({
      results,
      electionType: electionType || "unknown",
      locationLabel: electionType ? getLocationLabel(electionType) : "Location",
    });
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
});

/**
 * Legacy endpoint for backward compatibility
 * GET /api/demkhongResults
 * Query params: electionId, electionType (optional)
 * Requires authentication
 */
router.get("/demkhongResults", authMiddleware, async (req, res) => {
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
});

/**
 * Get public results for an election
 * GET /api/public-result/:electionId
 * Query params: electionType (optional)
 * No authentication required
 */
router.get("/public-result/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;
    let { electionType } = req.query;

    // Normalize election type if provided
    if (electionType) {
      electionType = normalizeElectionType(electionType);
    }

    const [
      candidates,
      locationStrings,
      candidateVotes,
      totalVotes,
      totalMale,
      totalFemale,
    ] = await contract.getCandidateVotesAndTotalElectionVotes(electionId);

    // Fetch polling station breakdown for each candidate
    const results = await Promise.all(
      candidates.map(async (candidate, index) => {
        const locationStr = locationStrings[index];
        let locationDetails = {};

        if (electionType) {
          locationDetails = parseLocationString(locationStr, electionType);
        } else {
          locationDetails = { location: locationStr };
        }

        // Get polling station breakdown for this candidate
        const [pollingStations, votesPerStation] =
          await contract.getCandidatePollingStationVotes(electionId, candidate);

        // Convert to object format: { "PS1": "12", "PS2": "29" }
        const votesByPollingStation = {};
        pollingStations.forEach((ps, idx) => {
          votesByPollingStation[ps] = votesPerStation[idx].toString();
        });

        // Get gender breakdown for this candidate
        const [maleVotes, femaleVotes] = await contract.getCandidateGenderVotes(
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

    // Fetch polling station gender breakdown
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
      // Continue without polling station breakdown if it fails
    }

    logger.info(`Public results fetched for election: ${electionId}`);
    res.json({
      results,
      ps: pollingStationBreakdown,
      totalVotes: totalVotes.toString(),
      totalMale: totalMale.toString(),
      totalFemale: totalFemale.toString(),
    });
  } catch (err) {
    if (err.message.includes("Election ID does not exist")) {
      return res.status(404).json({
        error: "Election not found",
        details: `Election with ID '${electionId}' does not exist`,
      });
    }
    logger.error(`Error fetching public results: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to fetch election results. Please try again later.",
    });
  }
});

export default router;
