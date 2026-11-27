/**
 * Dropdown options from Retrofit Canada's data dictionary (GET /api/v1/properties, 27 Nov 2026).
 * Used to group answers the owner typed themselves under "Other" in the list filters, and as
 * the official answer lists to reuse when finalizing our questionnaire.
 * If Retrofit Canada adds options, refresh these from /properties.
 */

/** locationProvince: "Province or Territory" */
export const PROVINCES = [
  "AB",
  "BC",
  "SK",
  "ON",
  "MB",
  "NB",
  "NL",
  "NS",
  "PE",
  "QC",
  "NT",
  "NU",
  "YT",
] as const;

/** houseType: "Type of Building" */
export const HOUSE_TYPES = [
  "Single-Family Bungalow (incl. 1.5 Story)",
  "Single-Family 2+ Stories",
  "Single-Family Split-Level",
  "Single-Family Bi-Level",
  "Row/Townhouse",
  "Duplex or Semi-Detached",
  "Triplex",
  "Apartment",
  "Mobile Home",
  "Manufactured Home",
] as const;

/** structureType: "Building Structure" */
export const STRUCTURE_TYPES = [
  "Wood-Framed",
  "Steel-Framed",
  "Post and Beam",
  "Insulated Concrete Form",
  "Structural Insulated Panel",
] as const;

/** foundationType: "Foundation Type" */
export const FOUNDATION_TYPES = [
  "Concrete (Full Basement)",
  "Concrete (Crawl Space)",
  "Preserved Wood (Full Basement)",
  "Preserved Wood (Crawl Space)",
  "Slab-on-Grade",
] as const;

/** climateZone: "Climate Zone" */
export const CLIMATE_ZONES = [
  "4",
  "5",
  "6",
  "7a",
  "7b",
  "8",
] as const;

/** retrofitType: "Retrofit Type" */
export const RETROFIT_TYPES = [
  "Envelope",
  "Mechanical",
  "Envelope and Mechanical",
] as const;

/** retrofitPhasing: "Staged Retrofit?" */
export const RETROFIT_PHASING = [
  "Yes",
  "No",
] as const;

/** performanceLevel: "Performance Level" */
export const PERFORMANCE_LEVELS = [
  "Net Zero",
  "Net-Zero Ready",
] as const;

/** retrofitStatus: "Retrofit Status" */
export const RETROFIT_STATUSES = [
  "Complete",
  "In Progress",
  "Planned",
] as const;

/** projectPriority1: "Project Priority 1" */
export const PROJECT_PRIORITIES = [
  "Use non-toxic materials",
  "Reduce Energy Consumption",
  "Achieve Net Zero or Net Zero Ready",
  "Increase Thermal Comfort",
  "Improve Indoor Air Quality",
  "Reduce GHG Emissions",
  "Repair and/or Renew Exterior",
  "Improve Home Value",
  "Modernize Home and Living Space",
  "Improved Resiliency",
] as const;
