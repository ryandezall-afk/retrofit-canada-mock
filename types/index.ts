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
