/**
 * Election Types Configuration
 * Defines the different types of elections and their geographical hierarchies
 */

export const ELECTION_TYPES = {
  NA: "NA", // National Assembly
  NC: "NC", // National Council
  GUP: "GUP", // Gup
  MANGMI: "MANGMI", // Mangmi
  C_TSHOGPA: "C_TSHOGPA", // Chiwog Tshogpa
  THROMPOEN: "THROMPOEN", // Thrompon
  T_TSHOGPA: "T_TSHOGPA", // Thrompon Tshogpa
};

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
 * Get required location fields for each election type
 */
export function getRequiredLocationFields(electionType) {
  const normalized = normalizeElectionType(electionType);

  switch (normalized) {
    case ELECTION_TYPES.NA:
      return ["dzongkhag", "demkhong"];
    case ELECTION_TYPES.NC:
      return ["dzongkhag"];
    case ELECTION_TYPES.GUP:
    case ELECTION_TYPES.MANGMI:
      return ["dzongkhag", "gewog"];
    case ELECTION_TYPES.C_TSHOGPA:
      return ["dzongkhag", "gewog", "chiwog"];
    case ELECTION_TYPES.THROMPOEN:
      return ["dzongkhag", "thromde"];
    case ELECTION_TYPES.T_TSHOGPA:
      return ["dzongkhag", "thromde"];
    default:
      return [];
  }
}
/**
 * Build hierarchical location string from location object
 * Format: "Dzongkhag/Gewog/Chiwog" or "Dzongkhag/Demkhong" etc.
 */
export function buildLocationString(location, electionType) {
  const parts = [];
  const normalized = normalizeElectionType(electionType);

  switch (normalized) {
    case ELECTION_TYPES.NA:
      if (location.dzongkhag) parts.push(location.dzongkhag);
      if (location.demkhong) parts.push(location.demkhong);
      break;
    case ELECTION_TYPES.NC:
      if (location.dzongkhag) parts.push(location.dzongkhag);
      break;
    case ELECTION_TYPES.GUP:
    case ELECTION_TYPES.MANGMI:
      if (location.dzongkhag) parts.push(location.dzongkhag);
      if (location.gewog) parts.push(location.gewog);
      break;
    case ELECTION_TYPES.C_TSHOGPA:
      if (location.dzongkhag) parts.push(location.dzongkhag);
      if (location.gewog) parts.push(location.gewog);
      if (location.chiwog) parts.push(location.chiwog);
      break;
    case ELECTION_TYPES.THROMPOEN:
      if (location.dzongkhag) parts.push(location.dzongkhag);
      if (location.thromde) parts.push(location.thromde);
      break;
    case ELECTION_TYPES.T_TSHOGPA:
      if (location.dzongkhag) parts.push(location.dzongkhag);
      if (location.thromde) parts.push(location.thromde);
      break;
    default:
      // Fallback: use whatever is provided
      if (location.dzongkhag) parts.push(location.dzongkhag);
      if (location.gewog) parts.push(location.gewog);
      if (location.chiwog) parts.push(location.chiwog);
      if (location.demkhong) parts.push(location.demkhong);
      if (location.thromde) parts.push(location.thromde);
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
    case ELECTION_TYPES.NA:
      return {
        dzongkhag: parts[0] || "",
        demkhong: parts[1] || "",
      };
    case ELECTION_TYPES.NC:
      return {
        dzongkhag: parts[0] || "",
      };
    case ELECTION_TYPES.GUP:
    case ELECTION_TYPES.MANGMI:
      return {
        dzongkhag: parts[0] || "",
        gewog: parts[1] || "",
      };
    case ELECTION_TYPES.C_TSHOGPA:
      return {
        dzongkhag: parts[0] || "",
        gewog: parts[1] || "",
        chiwog: parts[2] || "",
      };
    case ELECTION_TYPES.THROMPOEN:
      return {
        dzongkhag: parts[0] || "",
        thromde: parts[1] || "",
      };
    case ELECTION_TYPES.T_TSHOGPA:
      return {
        dzongkhag: parts[0] || "",
        thromde: parts[1] || "",
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
