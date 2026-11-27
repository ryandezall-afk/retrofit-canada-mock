import { getMatchingRebatesAsync } from "@/lib/rebates";
import {
  ASSESSMENT_DISCLAIMER,
  buildMockAssessmentResult,
} from "@/lib/server/mock-assessment";
import type { ValidatedAssessmentInput } from "@/lib/validation/assessment";
import type {
  MatchedCaseStudySummary,
  RetrofitAssessmentResult,
  RetrofitUpgradeRecommendation,
} from "@/types";

interface GeminiStructuredPayload {
  overallReadiness?: string;
  executiveSummary?: string;
  estimatedBaselineAnnualCost?: number;
  estimatedAnnualSavingsMin?: number;
  estimatedAnnualSavingsMax?: number;
  recommendations?: Array<{
    rank?: number;
    title?: string;
    category?: RetrofitUpgradeRecommendation["category"];
    priorityLabel?: RetrofitUpgradeRecommendation["priorityLabel"];
    rationale?: string;
    estimatedCostMin?: number;
    estimatedCostMax?: number;
    estimatedAnnualSavingsMin?: number;
    estimatedAnnualSavingsMax?: number;
    estimatedPaybackYears?: string;
    energyReductionRange?: string;
    eligibleRebates?: string[];
  }>;
}

const VALID_CATEGORIES = new Set<RetrofitUpgradeRecommendation["category"]>([
  "Air Sealing",
  "Insulation",
  "Heating & Cooling",
  "Windows & Doors",
  "Water Heating",
  "Electrical & Solar",
]);

const VALID_PRIORITIES = new Set<RetrofitUpgradeRecommendation["priorityLabel"]>([
  "High Impact",
  "Recommended",
  "Future Readiness",
]);

function normalizeGeminiRecommendations(
  rawList: GeminiStructuredPayload["recommendations"]
): RetrofitUpgradeRecommendation[] {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  return rawList.slice(0, 5).map((item, idx) => {
    const costMin = Math.max(0, Math.round(Number(item.estimatedCostMin) || 1500));
    const costMax = Math.max(
      costMin,
      Math.round(Number(item.estimatedCostMax) || costMin + 2500)
    );
    const savMin = Math.max(
      0,
      Math.round(Number(item.estimatedAnnualSavingsMin) || 150)
    );
    const savMax = Math.max(
      savMin,
      Math.round(Number(item.estimatedAnnualSavingsMax) || savMin + 200)
    );

    const category =
      item.category && VALID_CATEGORIES.has(item.category)
        ? item.category
        : "Insulation";
    const priorityLabel =
      item.priorityLabel && VALID_PRIORITIES.has(item.priorityLabel)
        ? item.priorityLabel
        : "Recommended";

    return {
      rank: idx + 1,
      title: (item.title ?? `Retrofit Upgrade ${idx + 1}`).trim(),
      category,
      priorityLabel,
      rationale: (
        item.rationale ??
        "Recommended based on your home envelope, mechanical profile, and Retrofit Canada best practices."
      ).trim(),
      estimatedCostMin: costMin,
      estimatedCostMax: costMax,
      estimatedAnnualSavingsMin: savMin,
      estimatedAnnualSavingsMax: savMax,
      estimatedPaybackYears: (item.estimatedPaybackYears ?? "6–12 years").trim(),
      energyReductionRange: (item.energyReductionRange ?? "10%–20%").trim(),
      eligibleRebates: Array.isArray(item.eligibleRebates)
        ? item.eligibleRebates.filter((r): r is string => typeof r === "string")
        : [],
      source: "ai_estimate",
    };
  });
}

export async function generateRetrofitAssessment(params: {
  input: ValidatedAssessmentInput;
  matchedCaseStudies: MatchedCaseStudySummary[];
  cacheMeta: RetrofitAssessmentResult["cacheMeta"];
  forceMock?: boolean;
}): Promise<RetrofitAssessmentResult> {
  const { input, matchedCaseStudies, cacheMeta, forceMock } = params;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const envForceMock = process.env.USE_MOCK_ASSESSMENT === "true";

  if (forceMock || envForceMock || !apiKey) {
    const reason = forceMock
      ? "Mock assessment mode requested."
      : envForceMock
        ? "USE_MOCK_ASSESSMENT=true is enabled."
        : "GEMINI_API_KEY is not configured; using mock retrofit assessment fallback.";

    return await buildMockAssessmentResult({
      input,
      matchedCaseStudies,
      cacheMeta,
      fallbackReason: reason,
    });
  }

  const financingAnswer =
    typeof input.answers.financing === "string"
      ? input.answers.financing
      : undefined;
  const availableRebates = await getMatchingRebatesAsync(
    input.province,
    financingAnswer
  );

  const promptContext = {
    homeownerAnswers: input.answers,
    derivedProperty: {
      postalFsa: input.postalFsa,
      province: input.province,
      homeType: input.homeType,
      yearBuilt: input.yearBuiltLabel,
      floorArea: input.floorAreaLabel,
      heatingFuel: input.heatingFuel,
      budget: input.budget,
    },
    matchedRetrofitCanadaCaseStudies: matchedCaseStudies.map((cs) => ({
      id: cs.id,
      title: cs.title,
      province: cs.province,
      houseType: cs.houseType,
      yearBuilt: cs.yearBuilt,
      retrofitType: cs.retrofitType,
      performanceLevel: cs.performanceLevel,
      beforeGj: cs.beforeGj ?? null,
      afterGj: cs.afterGj ?? null,
      energyReductionPercent: cs.energyReductionPercent ?? null,
      netCost: cs.netCost ?? null,
      annualUtilitySavings: cs.annualUtilitySavings ?? null,
      summary: cs.summary ?? null,
    })),
    availableRebates,
  };

  const systemInstruction = [
    "You are the Retrofit Canada AI Advisor.",
    "Follow Retrofit Canada's Envelope-First methodology (air sealing & insulation before mechanical sizing).",
    "Ground your recommendations strictly in the supplied homeownerAnswers, matchedRetrofitCanadaCaseStudies, and availableRebates.",
    "Do NOT invent external case study IDs or unverified grant dollar amounts.",
    "All costs and savings must be realistic Canadian dollar (CAD) estimates.",
    "Return valid JSON only matching the requested schema.",
  ].join(" ");

  const userPrompt = `Analyze this Canadian home profile and return JSON with fields:
{
  "overallReadiness": string,
  "executiveSummary": string,
  "estimatedBaselineAnnualCost": number,
  "estimatedAnnualSavingsMin": number,
  "estimatedAnnualSavingsMax": number,
  "recommendations": [
    {
      "rank": number,
      "title": string,
      "category": "Air Sealing" | "Insulation" | "Heating & Cooling" | "Windows & Doors" | "Water Heating" | "Electrical & Solar",
      "priorityLabel": "High Impact" | "Recommended" | "Future Readiness",
      "rationale": string,
      "estimatedCostMin": number,
      "estimatedCostMax": number,
      "estimatedAnnualSavingsMin": number,
      "estimatedAnnualSavingsMax": number,
      "estimatedPaybackYears": string,
      "energyReductionRange": string,
      "eligibleRebates": string[]
    }
  ]
}

Input data:
${JSON.stringify(promptContext, null, 2)}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(18000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned HTTP ${response.status}`);
    }

    const geminiJson = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rawText =
      geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!rawText) {
      throw new Error("Gemini API returned an empty response.");
    }

    const parsed = JSON.parse(rawText) as GeminiStructuredPayload;
    const recommendations = normalizeGeminiRecommendations(parsed.recommendations);
    if (recommendations.length === 0) {
      throw new Error("Gemini response contained no valid recommendations.");
    }

    return {
      assessmentId: `gem-${Date.now()}`,
      createdAt: new Date().toISOString(),
      mode: "gemini",
      modelUsed: model,
      propertySummary: {
        postalFsa: input.postalFsa,
        province: input.province,
        homeType: input.homeType,
        yearBuiltLabel: input.yearBuiltLabel,
        floorAreaLabel: input.floorAreaLabel,
        heatingFuel: input.heatingFuel,
        budget: input.budget,
      },
      overallReadiness:
        parsed.overallReadiness?.trim() || "Ready for Phased Retrofit Planning",
      executiveSummary:
        parsed.executiveSummary?.trim() ||
        "Prioritized retrofit roadmap generated from your home profile and matched Retrofit Canada case studies.",
      estimatedBaselineAnnualCost: Math.max(
        500,
        Math.round(Number(parsed.estimatedBaselineAnnualCost) || 2600)
      ),
      estimatedAnnualSavingsMin: Math.max(
        100,
        Math.round(Number(parsed.estimatedAnnualSavingsMin) || 400)
      ),
      estimatedAnnualSavingsMax: Math.max(
        200,
        Math.round(Number(parsed.estimatedAnnualSavingsMax) || 950)
      ),
      recommendations,
      rebates: availableRebates,
      matchedCaseStudies,
      cacheMeta,
      disclaimer: ASSESSMENT_DISCLAIMER,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gemini API error";

    return await buildMockAssessmentResult({
      input,
      matchedCaseStudies,
      cacheMeta,
      fallbackReason: `Gemini API unavailable (${message}); served mock assessment fallback.`,
    });
  }
}
