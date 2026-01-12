import { ELECTION_TYPES } from "./election.constants.js";
import { normalizeElectionType } from "./election.type.js";

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