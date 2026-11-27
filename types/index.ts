export type Province = 'AB' | 'BC' | 'ON' | 'NS' | 'QC' | 'SK' | 'MB' | 'All';

export type BuildingType = 
  | 'Single-family bungalow' 
  | 'Split-level' 
  | 'Row house / Townhome' 
  | 'Duplex' 
  | 'Heritage home' 
  | 'Low-rise multiplex'
  | 'All';

export type RetrofitType = 
  | 'Envelope & Mechanical' 
  | 'Envelope Only' 
  | 'Mechanical Only' 
  | 'Prefabricated Panelization'
  | 'All';

export type PerformanceLevel = 'Net-Zero' | 'Net-Zero Ready' | 'Deep Energy Reduction' | 'All';

export interface TechnicalSpecs {
  atticRsi: string;
  wallRsi: string;
  basementRsi: string;
  windows: string;
  spaceHeating: string;
  heatPumpCop?: string;
  backupHeating: string;
  domesticHotWater: string;
  ventilation: string;
  solarPvKwDc?: number;
}

export interface FinancialMetrics {
  totalGrossCost: number;
  grantRebatesTotal: number;
  netCost: number;
  annualUtilitySavings: number;
  fundingPrograms: string[];
}

export interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  location: string;
  city: string;
  province: 'AB' | 'BC' | 'ON' | 'NS' | 'QC' | 'SK' | 'MB';
  climateZone: string;
  vintage: string;
  buildingType: BuildingType;
  structure: string;
  floorAreaSqFt: number;
  floorAreaM2: number;
  retrofitType: RetrofitType;
  performanceLevel: PerformanceLevel;
  beforeGj: number;
  afterGj: number;
  energyReductionPercent: number;
  beforeAch50: number;
  afterAch50: number;
  airtightnessAch50Before?: number;
  airtightnessAch50After?: number;
  ghgReductionPercent: number;
  summary: string;
  story: string;
  lessonsLearned: string[];
  specs: TechnicalSpecs;
  financials: FinancialMetrics;
  contractor: string;
  energyAdvisor: string;
  imageUrl: string;
  galleryImages: string[];
}

export interface RoadmapStepData {
  stepNumber: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  keyActionItems: string[];
  tipsForSuccess: string[];
  commonPitfalls: string[];
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  date: string;
  author: string;
  category: string;
  readTime: string;
  imageUrl: string;
  excerpt: string;
  content: string;
}

export type QuestionType = "single_choice" | "multi_choice" | "text" | "number";

export type AnswerValue = string | string[];

export type QuestionnaireAnswers = Record<string, AnswerValue>;

export interface QuestionImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface QuestionOption {
  value: string;
  label: string;
  image?: QuestionImage;
  exclusive?: boolean;
}

export interface QuestionCondition {
  questionId: string;
  equals?: string;
  notEquals?: string;
  notIn?: string[];
}

export interface QuestionUnitOption {
  value: string;
  label: string;
}

export interface QuestionConfig {
  id: string;
  section: string;
  reviewLabel: string;
  prompt: string;
  description?: string;
  type: QuestionType;
  required?: boolean;
  allowUnknown?: boolean;
  unknownLabel?: string;
  options?: QuestionOption[];
  examples?: QuestionImage[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  uppercase?: boolean;
  prefix?: string;
  suffix?: string;
  unitField?: string;
  defaultUnit?: string;
  unitOptions?: QuestionUnitOption[];
  excludeSelectedFrom?: string;
  showIf?: QuestionCondition;
}

export type DataSourceTag =
  | "retrofit_canada_api"
  | "retrofit_canada_mock_api"
  | "sample_data"
  | "ai_estimate";

export interface MockCaseStudyRecord {
  id: string;
  externalId: number;
  title: string;
  slug: string;
  link: string;
  imageUrl: string;
  created: string;
  yearBuilt: number | null;
  province: string;
  city?: string;
  houseType: string;
  structureType: string;
  climateZone: string;
  retrofitPhasing: string;
  retrofitType: string;
  performanceLevel: string;
  team: string;
  beforeGj?: number;
  afterGj?: number;
  energyReductionPercent?: number;
  totalGrossCost?: number;
  grantRebatesTotal?: number;
  netCost?: number;
  annualUtilitySavings?: number;
  summary?: string;
  lessonsLearned?: string[];
  hasDetailedMetrics: boolean;
  source: DataSourceTag;
}

export interface MatchedCaseStudySummary {
  id: string;
  title: string;
  province: string;
  city?: string;
  houseType: string;
  yearBuilt: number | null;
  retrofitType: string;
  performanceLevel: string;
  link: string;
  imageUrl: string;
  beforeGj?: number;
  afterGj?: number;
  energyReductionPercent?: number;
  netCost?: number;
  annualUtilitySavings?: number;
  summary?: string;
  matchScore: number;
  matchReasons: string[];
  hasDetailedMetrics: boolean;
  source: DataSourceTag;
}

export interface RetrofitUpgradeRecommendation {
  rank: number;
  title: string;
  category:
    | "Air Sealing"
    | "Insulation"
    | "Heating & Cooling"
    | "Windows & Doors"
    | "Water Heating"
    | "Electrical & Solar";
  priorityLabel: "High Impact" | "Recommended" | "Future Readiness";
  rationale: string;
  estimatedCostMin: number;
  estimatedCostMax: number;
  estimatedAnnualSavingsMin: number;
  estimatedAnnualSavingsMax: number;
  estimatedPaybackYears: string;
  energyReductionRange: string;
  eligibleRebates: string[];
  source: DataSourceTag;
}

export interface RebateProgramMatch {
  id: string;
  name: string;
  level: "Federal" | "Provincial" | "Municipal" | "Utility";
  summary: string;
  estimatedValue: string;
  eligibilityNotes: string;
  url: string;
  status?: "active" | "waitlist" | "closed";
  lastVerifiedAt?: string;
  source?: "supabase" | "fallback";
}

export interface RetrofitAssessmentResult {
  assessmentId: string;
  createdAt: string;
  mode: "gemini" | "mock";
  modelUsed: string;
  fallbackReason?: string;
  propertySummary: {
    postalFsa: string;
    province: string;
    homeType: string;
    yearBuiltLabel: string;
    floorAreaLabel: string;
    heatingFuel: string;
    budget: string;
  };
  overallReadiness: string;
  executiveSummary: string;
  estimatedBaselineAnnualCost: number;
  estimatedAnnualSavingsMin: number;
  estimatedAnnualSavingsMax: number;
  recommendations: RetrofitUpgradeRecommendation[];
  rebates: RebateProgramMatch[];
  matchedCaseStudies: MatchedCaseStudySummary[];
  cacheMeta: {
    /** Where matched case studies came from: Supabase, filled monthly from Retrofit Canada's API. */
    provider: "retrofit_canada_supabase";
    cached: boolean;
    lastSyncedAt: string;
    upstreamPings: number;
    totalRecordsAvailable: number;
  };
  disclaimer: string;
}
