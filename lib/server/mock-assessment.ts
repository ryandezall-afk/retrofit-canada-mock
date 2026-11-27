import { getFallbackRebates, getMatchingRebatesAsync } from "@/lib/rebates";
import type { ValidatedAssessmentInput } from "@/lib/validation/assessment";
import type {
  MatchedCaseStudySummary,
  RetrofitAssessmentResult,
  RetrofitUpgradeRecommendation,
} from "@/types";

export const ASSESSMENT_DISCLAIMER =
  "All costs, annual utility savings, payback periods, and energy reductions shown here are illustrative estimates for early planning only and do not replace an on-site EnerGuide evaluation by a registered Energy Advisor.";

export const getMatchingRebates = getFallbackRebates;

function estimateBaselineAnnualCost(input: ValidatedAssessmentInput): number {
  const { answers } = input;
  const directAnnual = Number(answers.annualEnergyCost);
  if (Number.isFinite(directAnnual) && directAnnual > 0) {
    return Math.round(directAnnual);
  }

  const elec = Number(answers.electricityBill);
  const gas = Number(answers.winterGasBill);
  if (
    (Number.isFinite(elec) && elec > 0) ||
    (Number.isFinite(gas) && gas > 0)
  ) {
    const annualElec = Number.isFinite(elec) && elec > 0 ? elec * 12 : 1400;
    const annualGas = Number.isFinite(gas) && gas > 0 ? gas * 7.5 : 1500;
    return Math.round(annualElec + annualGas);
  }

  const area = Number(answers.floorArea);
  const sqFt =
    Number.isFinite(area) && area > 0
      ? answers.floorAreaUnit === "sqm"
        ? area * 10.764
        : area
      : 1650;

  // Baseline heating/energy factor grounded in Calgary pre-1980 benchmark (~$1.20-$1.55/sq ft total)
  return Math.round(sqFt * 1.45);
}

export async function buildMockAssessmentResult(params: {
  input: ValidatedAssessmentInput;
  matchedCaseStudies: MatchedCaseStudySummary[];
  cacheMeta: RetrofitAssessmentResult["cacheMeta"];
  fallbackReason?: string;
}): Promise<RetrofitAssessmentResult> {
  const { input, matchedCaseStudies, cacheMeta, fallbackReason } = params;
  const { answers, province } = input;
  const baselineCost = estimateBaselineAnnualCost(input);

  const recommendations: RetrofitUpgradeRecommendation[] = [];

  // 1. Always follow Envelope-First Retrofit Roadmap: Air Sealing first if drafts or older home
  const drafts = String(answers.drafts ?? "");
  const hasDrafts =
    drafts.includes("Noticeable") ||
    drafts.includes("Occasional") ||
    drafts.includes("not sure");

  recommendations.push({
    rank: 1,
    title: "Whole-Home Air Sealing & Weatherstripping",
    category: "Air Sealing",
    priorityLabel: hasDrafts ? "High Impact" : "Recommended",
    rationale: hasDrafts
      ? "You reported noticeable or possible drafts. Following Retrofit Canada's envelope-first sequence, sealing air leaks cuts heat loss immediately and ensures future heating equipment isn't oversized."
      : "Blower-door guided air sealing is the highest return-on-investment first step before upgrading mechanical equipment.",
    estimatedCostMin: 1200,
    estimatedCostMax: 3500,
    estimatedAnnualSavingsMin: Math.round(baselineCost * 0.08),
    estimatedAnnualSavingsMax: Math.round(baselineCost * 0.12),
    estimatedPaybackYears: "4–8 years",
    energyReductionRange: "8%–12%",
    eligibleRebates: ["Canada Greener Homes Loan", `${province} Efficiency Rebates`],
    source: "sample_data",
  });

  // 2. Attic Insulation
  const attic = String(answers.atticInsulation ?? "");
  if (!attic.includes("Well insulated")) {
    recommendations.push({
      rank: 2,
      title: "Attic Insulation Upgrade to R-60 (RSI 10.5)",
      category: "Insulation",
      priorityLabel:
        attic.includes("Original") || attic.includes("Low")
          ? "High Impact"
          : "Recommended",
      rationale:
        "Topping up attic insulation (such as blown cellulose after air sealing the attic plane) significantly reduces winter heat loss and lowers ice-damming risk.",
      estimatedCostMin: 2800,
      estimatedCostMax: 5200,
      estimatedAnnualSavingsMin: Math.round(baselineCost * 0.12),
      estimatedAnnualSavingsMax: Math.round(baselineCost * 0.18),
      estimatedPaybackYears: "5–9 years",
      energyReductionRange: "12%–18%",
      eligibleRebates: ["Canada Greener Homes Loan", `${province} Clean Energy / Rebates`],
      source: "sample_data",
    });
  }

  // 3. Space Heating / Cold-Climate Heat Pump
  const heatingEquipment = String(answers.heatingEquipment ?? "");
  const heatingAge = String(answers.heatingAge ?? "");
  const isAlreadyHeatPump = heatingEquipment.toLowerCase().includes("heat pump");
  const isAgingHeating =
    heatingAge.includes("11–15") || heatingAge.includes("16–20");

  if (!isAlreadyHeatPump) {
    recommendations.push({
      rank: recommendations.length + 1,
      title: "Cold-Climate Air-Source Heat Pump (Rated to -30°C)",
      category: "Heating & Cooling",
      priorityLabel: isAgingHeating ? "High Impact" : "Recommended",
      rationale: isAgingHeating
        ? `Your existing ${heatingEquipment.toLowerCase()} is ${heatingAge}, making it an ideal candidate to transition to a cold-climate heat pump that provides both high-efficiency heating and summer cooling.`
        : `Replacing or pairing your ${String(answers.heatingFuel ?? "current").toLowerCase()} heating system with a cold-climate heat pump cuts carbon emissions and prepares your home for net-zero operation.`,
      estimatedCostMin: 12000,
      estimatedCostMax: 20000,
      estimatedAnnualSavingsMin: Math.round(baselineCost * 0.22),
      estimatedAnnualSavingsMax: Math.round(baselineCost * 0.35),
      estimatedPaybackYears: "10–15 years",
      energyReductionRange: "25%–35%",
      eligibleRebates: [
        "Canada Greener Homes Loan",
        province === "AB" ? "CEIP Alberta" : `${province} Rebate Programs`,
      ],
      source: "sample_data",
    });
  }

  // 4. Basement / Foundation Insulation if uninsulated or unknown
  const foundation = String(answers.foundationType ?? "");
  const basementIns = String(answers.basementInsulation ?? "");
  if (
    foundation !== "Slab-on-grade" &&
    (basementIns === "Uninsulated" || basementIns === "Unknown")
  ) {
    recommendations.push({
      rank: recommendations.length + 1,
      title: "Basement Wall & Rim Joist Continuous Insulation",
      category: "Insulation",
      priorityLabel: "Recommended",
      rationale:
        "Uninsulated foundation walls and rim joists are major sources of conductive heat loss and cold basement floors in Canadian winters.",
      estimatedCostMin: 4500,
      estimatedCostMax: 9500,
      estimatedAnnualSavingsMin: Math.round(baselineCost * 0.08),
      estimatedAnnualSavingsMax: Math.round(baselineCost * 0.14),
      estimatedPaybackYears: "9–14 years",
      energyReductionRange: "8%–14%",
      eligibleRebates: ["Canada Greener Homes Loan"],
      source: "sample_data",
    });
  }

  // 5. Windows or Electrical readiness
  const windows = String(answers.windowType ?? "");
  if (
    windows.includes("Single pane") ||
    windows.includes("Original") ||
    windows.includes("Older double")
  ) {
    recommendations.push({
      rank: recommendations.length + 1,
      title: "ENERGY STAR Triple-Pane Window Upgrade",
      category: "Windows & Doors",
      priorityLabel: "Future Readiness",
      rationale:
        "Upgrading older windows reduces cold perimeter drafts and interior condensation, improving comfort when paired with envelope air sealing.",
      estimatedCostMin: 8000,
      estimatedCostMax: 18000,
      estimatedAnnualSavingsMin: Math.round(baselineCost * 0.06),
      estimatedAnnualSavingsMax: Math.round(baselineCost * 0.12),
      estimatedPaybackYears: "14–22 years",
      energyReductionRange: "6%–12%",
      eligibleRebates: ["Canada Greener Homes Loan"],
      source: "sample_data",
    });
  }

  // 6. Electrical panel readiness if 60A/100A
  const panel = String(answers.electricalPanel ?? "");
  if (panel.includes("60 Amp") || panel.includes("100 Amp")) {
    recommendations.push({
      rank: recommendations.length + 1,
      title: "200-Amp Electrical Service & Panel Readiness Assessment",
      category: "Electrical & Solar",
      priorityLabel: "Future Readiness",
      rationale: `With a ${panel} service, verify load capacity or use smart load-management before adding a heat pump, heat pump water heater, or EV charger.`,
      estimatedCostMin: 2500,
      estimatedCostMax: 5500,
      estimatedAnnualSavingsMin: 0,
      estimatedAnnualSavingsMax: 150,
      estimatedPaybackYears: "Enabling upgrade",
      energyReductionRange: "Enables electrification",
      eligibleRebates: ["CEIP / Bundled Deep Retrofit Loan"],
      source: "sample_data",
    });
  }

  const finalRecs = recommendations.slice(0, 5).map((rec, idx) => ({
    ...rec,
    rank: idx + 1,
  }));

  const totalSavingsMin = finalRecs.reduce(
    (sum, r) => sum + r.estimatedAnnualSavingsMin,
    0
  );
  const totalSavingsMax = finalRecs.reduce(
    (sum, r) => sum + r.estimatedAnnualSavingsMax,
    0
  );

  const staying = String(answers.stayingDuration ?? "");
  const readiness =
    staying === "Under 2 years"
      ? "Short-Horizon Quick Wins Recommended"
      : "Strong Candidate for Phased Deep Retrofit";

  const financingAnswer =
    typeof answers.financing === "string" ? answers.financing : undefined;

  return {
    assessmentId: `mock-${Date.now()}`,
    createdAt: new Date().toISOString(),
    mode: "mock",
    modelUsed: "mock-retrofit-advisor-v1",
    fallbackReason,
    propertySummary: {
      postalFsa: input.postalFsa,
      province: input.province,
      homeType: input.homeType,
      yearBuiltLabel: input.yearBuiltLabel,
      floorAreaLabel: input.floorAreaLabel,
      heatingFuel: input.heatingFuel,
      budget: input.budget,
    },
    overallReadiness: readiness,
    executiveSummary: `Based on your ${input.yearBuiltLabel} ${input.homeType.toLowerCase()} in ${input.province} (${input.postalFsa}) heated primarily with ${input.heatingFuel}, your strongest near-term path follows Retrofit Canada's envelope-first sequence: tighten air leaks and attic insulation first, then plan mechanical electrification aligned with your "${input.budget}" budget.`,
    estimatedBaselineAnnualCost: baselineCost,
    estimatedAnnualSavingsMin: Math.min(totalSavingsMin, Math.round(baselineCost * 0.55)),
    estimatedAnnualSavingsMax: Math.min(totalSavingsMax, Math.round(baselineCost * 0.72)),
    recommendations: finalRecs,
    rebates: await getMatchingRebatesAsync(province, financingAnswer),
    matchedCaseStudies,
    cacheMeta,
    disclaimer: ASSESSMENT_DISCLAIMER,
  };
}
