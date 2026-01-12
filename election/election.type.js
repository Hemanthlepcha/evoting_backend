import { ELECTION_TYPES }  from "./election.constants.js";

/**
 * Normalize election type to uppercase and handle variations
 */
export function normalizeElectionType(type) {
  if (!type) return null;

  const normalized = type.toUpperCase().trim();

  // Map common variations to standard types
  const variations = {
    NATIONAL_ASSEMBLY: "NA",
    NATIONALASSEMBLY: "NA",
    NATIONAL_COUNCIL: "NC",
    NATIONALCOUNCIL: "NC",
    TSHOGPA: "C_TSHOGPA",
    CHIWOG_TSHOGPA: "C_TSHOGPA",
    CHIWOGTSHOGPA: "C_TSHOGPA",
    THROMPON: "THROMPOEN",
    THROMPON_TSHOGPA: "T_TSHOGPA",
    THROMPONTSHOGPA: "T_TSHOGPA",
    THROMPOEN_TSHOGPA: "T_TSHOGPA",
    THROMPOENTSHOGPA: "T_TSHOGPA",
  };

  // Check if it's a variation
  if (variations[normalized]) {
    return variations[normalized];
  }

  // Check if it's already a valid type
  if (Object.values(ELECTION_TYPES).includes(normalized)) {
    return normalized;
  }

  return null;
}

/**
 * Detect election type from location object
 */
export function detectElectionType(location) {
  if (location.demkhong) {
    return ELECTION_TYPES.NA;
  } else if (location.dzongkhag && location.thromde) {
    // Both THROMPOEN and T_TSHOGPA use dzongkhag + thromde
    // Cannot auto-detect between them - electionType must be explicitly provided
    return null;
  } else if (location.chiwog) {
    return ELECTION_TYPES.C_TSHOGPA;
  } else if (location.gewog) {
    // Could be GUP or MANGMI, default to GUP
    return ELECTION_TYPES.GUP;
  } else if (location.dzongkhag && Object.keys(location).length === 1) {
    // Only dzongkhag = National Council
    return ELECTION_TYPES.NC;
  }
  return null;
}

/**
 * Get location label for display (e.g., "Demkhong", "Gewog", "Chiwog")
 */
export function getLocationLabel(electionType) {
  const normalized = normalizeElectionType(electionType);

  switch (normalized) {
    case ELECTION_TYPES.NA:
      return "Demkhong";
    case ELECTION_TYPES.NC:
      return "Dzongkhag";
    case ELECTION_TYPES.GUP:
    case ELECTION_TYPES.MANGMI:
      return "Gewog";
    case ELECTION_TYPES.C_TSHOGPA:
      return "Chiwog";
    case ELECTION_TYPES.THROMPOEN:
      return "Thromde";
    case ELECTION_TYPES.T_TSHOGPA:
      return "Thromde";
    default:
      return "Location";
  }
}