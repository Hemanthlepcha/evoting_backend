/**
 * Election Types Configuration
 * Defines the different types of elections and their geographical hierarchies
 */

export const ELECTION_TYPES = {
  NATIONAL_ASSEMBLY: "NATIONAL_ASSEMBLY",
  NATIONAL_COUNCIL: "NATIONAL_COUNCIL",
  GUP: "GUP",
  MANGMI: "MANGMI",
  TSHOGPA: "TSHOGPA",
  THROMPON: "THROMPON",
  THROMPON_TSHOGPA: "THROMPON_TSHOGPA",
};

/**
 * Normalize election type to uppercase and handle variations
 */
export function normalizeElectionType(type) {
  if (!type) return null;

  const normalized = type.toUpperCase().trim();

  // Map common variations to standard types
  const variations = {
    NC: "NATIONAL_COUNCIL",
    NATIONALCOUNCIL: "NATIONAL_COUNCIL",
    NA: "NATIONAL_ASSEMBLY",
    NATIONALASSEMBLY: "NATIONAL_ASSEMBLY",
    THROMPOEN: "THROMPON",
    THROMPOENTSHOGPA: "THROMPON_TSHOGPA",
    THROMPOEN_TSHOGPA: "THROMPON_TSHOGPA",
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
 * Get required location fields for each election type
 */
export function getRequiredLocationFields(electionType) {
  const normalized = normalizeElectionType(electionType);

  switch (normalized) {
    case ELECTION_TYPES.NATIONAL_ASSEMBLY:
      return ["dzongkhag", "demkhong"];
    case ELECTION_TYPES.NATIONAL_COUNCIL:
      return ["dzongkhag"];
    case ELECTION_TYPES.GUP:
    case ELECTION_TYPES.MANGMI:
      return ["dzongkhag", "gewog"];
    case ELECTION_TYPES.TSHOGPA:
      return ["dzongkhag", "gewog", "chewog"];
    case ELECTION_TYPES.THROMPON:
    case ELECTION_TYPES.THROMPON_TSHOGPA:
      return ["throm"];
    default:
      return [];
  }
}

/**
 * Build hierarchical location string from location object
 * Format: "Dzongkhag/Gewog/Chewog" or "Dzongkhag/Demkhong" etc.
 */
export function buildLocationString(location, electionType) {
  const parts = [];
  const normalized = normalizeElectionType(electionType);

  switch (normalized) {
    case ELECTION_TYPES.NATIONAL_ASSEMBLY:
      if (location.dzongkhag) parts.push(location.dzongkhag);
      if (location.demkhong) parts.push(location.demkhong);
      break;
    case ELECTION_TYPES.NATIONAL_COUNCIL:
      if (location.dzongkhag) parts.push(location.dzongkhag);
      break;
    case ELECTION_TYPES.GUP:
    case ELECTION_TYPES.MANGMI:
      if (location.dzongkhag) parts.push(location.dzongkhag);
      if (location.gewog) parts.push(location.gewog);
      break;
    case ELECTION_TYPES.TSHOGPA:
      if (location.dzongkhag) parts.push(location.dzongkhag);
      if (location.gewog) parts.push(location.gewog);
      if (location.chewog) parts.push(location.chewog);
      break;
    case ELECTION_TYPES.THROMPON:
    case ELECTION_TYPES.THROMPON_TSHOGPA:
      if (location.throm) parts.push(location.throm);
      break;
    default:
      // Fallback: use whatever is provided
      if (location.dzongkhag) parts.push(location.dzongkhag);
      if (location.gewog) parts.push(location.gewog);
      if (location.chewog) parts.push(location.chewog);
      if (location.demkhong) parts.push(location.demkhong);
      if (location.throm) parts.push(location.throm);
  }

  return parts.join("/");
}

/**
 * Parse location string back into object
 */
export function parseLocationString(locationStr, electionType) {
  const parts = locationStr.split("/");
  const normalized = normalizeElectionType(electionType);

  switch (normalized) {
    case ELECTION_TYPES.NATIONAL_ASSEMBLY:
      return {
        dzongkhag: parts[0] || "",
        demkhong: parts[1] || "",
      };
    case ELECTION_TYPES.NATIONAL_COUNCIL:
      return {
        dzongkhag: parts[0] || "",
      };
    case ELECTION_TYPES.GUP:
    case ELECTION_TYPES.MANGMI:
      return {
        dzongkhag: parts[0] || "",
        gewog: parts[1] || "",
      };
    case ELECTION_TYPES.TSHOGPA:
      return {
        dzongkhag: parts[0] || "",
        gewog: parts[1] || "",
        chewog: parts[2] || "",
      };
    case ELECTION_TYPES.THROMPON:
    case ELECTION_TYPES.THROMPON_TSHOGPA:
      return {
        throm: parts[0] || "",
      };
    default:
      return { location: locationStr };
  }
}

/**
 * Detect election type from location object
 */
export function detectElectionType(location) {
  if (location.demkhong) {
    return ELECTION_TYPES.NATIONAL_ASSEMBLY;
  } else if (location.throm) {
    return ELECTION_TYPES.THROMPON;
  } else if (location.chewog) {
    return ELECTION_TYPES.TSHOGPA;
  } else if (location.gewog) {
    // Could be GUP or MANGMI, default to GUP
    return ELECTION_TYPES.GUP;
  } else if (location.dzongkhag && Object.keys(location).length === 1) {
    // Only dzongkhag = National Council
    return ELECTION_TYPES.NATIONAL_COUNCIL;
  }
  return null;
}

/**
 * Validate location object has required fields for election type
 */
export function validateLocation(location, electionType) {
  const requiredFields = getRequiredLocationFields(electionType);
  const missingFields = requiredFields.filter((field) => !location[field]);

  return {
    isValid: missingFields.length === 0,
    missingFields,
    requiredFields,
  };
}

/**
 * Get location label for display (e.g., "Demkhong", "Gewog", "Chewog")
 */
export function getLocationLabel(electionType) {
  const normalized = normalizeElectionType(electionType);

  switch (normalized) {
    case ELECTION_TYPES.NATIONAL_ASSEMBLY:
      return "Demkhong";
    case ELECTION_TYPES.NATIONAL_COUNCIL:
      return "Dzongkhag";
    case ELECTION_TYPES.GUP:
    case ELECTION_TYPES.MANGMI:
      return "Gewog";
    case ELECTION_TYPES.TSHOGPA:
      return "Chewog";
    case ELECTION_TYPES.THROMPON:
    case ELECTION_TYPES.THROMPON_TSHOGPA:
      return "Throm";
    default:
      return "Location";
  }
}
