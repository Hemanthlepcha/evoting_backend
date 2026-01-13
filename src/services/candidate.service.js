import { ELECTION_TYPES } from "../election/election.constants.js";
import {
  normalizeElectionType,
  detectElectionType,
} from "../election/election.type.js";
import {
  buildLocationString,
  validateLocation,
} from "../election/election.location.js";
import { logger } from "../utils/logger.js";
import { contract } from "../utils/contract.js";

//POST /api/register
export async function registerCandidateService(req) {
  const { electionId, candidate, location, electionType } = req.body;

  let locationString;
  let detectedElectionType;

  try {
    if (location) {
      detectedElectionType = electionType
        ? normalizeElectionType(electionType)
        : detectElectionType(location);

      if (!detectedElectionType) {
        return {
          status: 400,
          body: {
            error: "Cannot determine election type from location",
            hint:
              "Provide electionType or include demkhong/gewog/chiwog/thromde in location",
          },
        };
      }

      const validation = validateLocation(location, detectedElectionType);
      if (!validation.isValid) {
        return {
          status: 400,
          body: {
            error:
              "Required Location details are missing for candidate registration",
            missingFields: validation.missingFields,
            requiredFields: validation.requiredFields,
          },
        };
      }

      locationString = buildLocationString(location, detectedElectionType);
    } else if (req.body.demkhong) {
      locationString = req.body.demkhong;
      detectedElectionType = ELECTION_TYPES.NA;
      logger.info(`Using legacy demkhong format for candidate: ${candidate}`);
    } else {
      return {
        status: 400,
        body: {
          error: "Missing location information",
          hint: "Provide either 'location' object or 'demkhong' field",
        },
      };
    }

    if (!electionId || !candidate) {
      return {
        status: 400,
        body: {
          error:
            "Missing required fields: electionId and candidate are required",
        },
      };
    }

    const tx = await contract.registerCandidate(
      electionId,
      candidate,
      locationString
    );
    await tx.wait();

    logger.info(
      `Candidate registered: ${candidate} | Type: ${detectedElectionType} | Location: ${locationString} | Tx: ${tx.hash}`
    );

    return {
      status: 200,
      body: {
        message: "Candidate registered successfully",
        candidate,
        electionType: detectedElectionType,
        location: locationString,
        txHash: tx.hash,
      },
    };
  } catch (err) {
    if (err.message.includes("Candidate already registered")) {
      return {
        status: 409,
        body: {
          error: "Candidate already registered",
          details: `The candidate '${candidate}' is already registered for this election`,
        },
      };
    }

    if (err.message.includes("Not the owner")) {
      return {
        status: 403,
        body: {
          error: "Unauthorized",
          details: "Only contract owner can register candidates",
        },
      };
    }

    if (err.message.includes("Election does not exist")) {
      return {
        status: 404,
        body: {
          error: "Election not found",
          details: `Election with ID '${electionId}' does not exist`,
        },
      };
    }

    logger.error(`Error registering candidate: ${err.message}`);

    return {
      status: 500,
      body: {
        error: "Internal server error",
        details:
          "Failed to register candidate. Please try again later.",
      },
    };
  }
}

//DELETE /api/remove
export async function deleteCandidate(req) {
  const { electionId, candidate } = req.body;

  if (!electionId || !candidate) {
    return res
      .status(400)
      .json({ error: "Missing required fields: electionId or candidate" });
  }

  try {
    const tx = await contract.removeCandidate(electionId, candidate);
    await tx.wait();
    logger.info(`Candidate removed: ${candidate}, txHash: ${tx.hash}`);
    res.json({ message: "Candidate removed", txHash: tx.hash });
  } catch (err) {
    if (err.message.includes("Candidate not registered")) {
      logger.warn(`Candidate not found: ${candidate}`);
      return res.status(404).json({
        error: "Candidate not found",
        details: `Candidate '${candidate}' is not registered for this election`,
      });
    }
    if (err.message.includes("Not the owner")) {
      logger.warn(`Unauthorized candidate removal attempt: ${candidate}`);
      return res.status(403).json({
        error: "Unauthorized",
        details: "Only contract owner can remove candidates",
      });
    }
    if (err.message.includes("Election does not exist")) {
      return res.status(404).json({
        error: "Election not found",
        details: `Election with ID '${electionId}' does not exist`,
      });
    }
    logger.error(`Error removing candidate: ${err.message}`);
    res.status(500).json({
      error: "Internal server error",
      details: "Failed to remove candidate. Please try again later.",
    });
  }
};
