import { getMatchingRebatesAsync } from "@/lib/rebates";
import {
  ASSESSMENT_DISCLAIMER,
  buildMockAssessmentResult,
} from "@/lib/server/mock-assessment";
import type { CaseStudyPromptDetail } from "@/lib/server/case-study-context";
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
    supportingCaseStudyIds?: string[];
  }>;
  nextSteps?: string[];
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
  rawList: GeminiStructuredPayload["recommendations"],
  matchedCaseStudies: MatchedCaseStudySummary[]
): RetrofitUpgradeRecommendation[] {
  const titleById = new Map(matchedCaseStudies.map((cs) => [cs.id, cs.title]));
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
      // Keep only ids we actually sent, so the model can't cite case studies that don't exist
      supportingCaseStudies: Array.isArray(item.supportingCaseStudyIds)
        ? Array.from(new Set(item.supportingCaseStudyIds))
            .filter((id) => titleById.has(id))
            .map((id) => ({ id, title: titleById.get(id) as string }))
        : [],
      source: "ai_estimate",
    };
  });
}


const CATEGORY_ENUM = Array.from(VALID_CATEGORIES);
const PRIORITY_ENUM = Array.from(VALID_PRIORITIES);

const RECOMMENDATION_FIELDS = [
  "rank",
  "title",
  "category",
  "priorityLabel",
  "rationale",
  "supportingCaseStudyIds",
  "estimatedCostMin",
  "estimatedCostMax",
  "estimatedAnnualSavingsMin",
  "estimatedAnnualSavingsMax",
  "estimatedPaybackYears",
  "energyReductionRange",
  "eligibleRebates",
];

const TOP_LEVEL_FIELDS = [
  "overallReadiness",
  "executiveSummary",
  "estimatedBaselineAnnualCost",
  "estimatedAnnualSavingsMin",
  "estimatedAnnualSavingsMax",
  "recommendations",
  "nextSteps",
];

/** Gemini structured-output schema: the model must return exactly this shape. */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    overallReadiness: { type: "STRING" },
    executiveSummary: { type: "STRING" },
    estimatedBaselineAnnualCost: { type: "NUMBER" },
    estimatedAnnualSavingsMin: { type: "NUMBER" },
    estimatedAnnualSavingsMax: { type: "NUMBER" },
    recommendations: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "OBJECT",
        properties: {
          rank: { type: "INTEGER" },
          title: { type: "STRING" },
          category: { type: "STRING", enum: CATEGORY_ENUM },
          priorityLabel: { type: "STRING", enum: PRIORITY_ENUM },
          rationale: { type: "STRING" },
          supportingCaseStudyIds: { type: "ARRAY", items: { type: "STRING" } },
          estimatedCostMin: { type: "NUMBER" },
          estimatedCostMax: { type: "NUMBER" },
          estimatedAnnualSavingsMin: { type: "NUMBER" },
          estimatedAnnualSavingsMax: { type: "NUMBER" },
          estimatedPaybackYears: { type: "STRING" },
          energyReductionRange: { type: "STRING" },
          eligibleRebates: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: RECOMMENDATION_FIELDS,
        propertyOrdering: RECOMMENDATION_FIELDS,
      },
    },
    nextSteps: { type: "ARRAY", items: { type: "STRING" }, maxItems: 5 },
  },
  required: TOP_LEVEL_FIELDS,
  propertyOrdering: TOP_LEVEL_FIELDS,
};

const SYSTEM_INSTRUCTION = [
  "You are the Retrofit Canada AI Advisor. You write a phased deep-retrofit plan for one Canadian homeowner.",
  "",
  "How to work:",
  "1. Read homeownerAnswers to understand the home as it is today: envelope (attic, walls, basement, windows, drafts), mechanical systems (heating fuel, equipment and its age, cooling, hot water, electrical panel), bills, comfort problems, budget, timeline and goals.",
  "2. Compare it with comparableCaseStudies. These are real, completed Canadian retrofits from Retrofit Canada's database. Each may include a beforeAndAfter table (insulation, airtightness, heating, energy use before and after), the upgrades that were done, and lessons learned. Find the ones whose BEFORE state looks most like this home, and use what those projects did and achieved to choose, order and size the upgrades.",
  "3. Follow Retrofit Canada's Envelope-First method: air sealing and insulation before replacing or sizing heating and cooling, unless equipment is failing or a safety issue makes it urgent. Respect the homeowner's budget, timeline and how long they plan to stay.",
  "",
  "Rules:",
  "- Return 3 to 5 recommendations in the order the homeowner should do them (rank 1 = first).",
  "- In each rationale, say what in the homeowner's answers points to this upgrade and what a comparable case study did or achieved, naming it (for example: like the 1985 Calgary home, which went from R30 to R60 in the attic). Keep each rationale to 2-4 sentences.",
  "- supportingCaseStudyIds must only contain id values from comparableCaseStudies. Use an empty list if none apply. Never write ids like rc-1 in any text field; refer to case studies by name.",
  "- The case studies do not include project costs. Cost and savings figures are your own realistic CAD estimates for this home's province and size; never present them as coming from a case study.",
  "- eligibleRebates must only contain names from availableRebates. Do not invent programs or dollar amounts.",
  "- nextSteps: 3 to 5 short, concrete actions in order (for example: Book a pre-retrofit EnerGuide evaluation).",
  "- If an answer is \"I'm not sure\", say what the homeowner should check instead of guessing.",
  "- Plain, friendly language for a homeowner. No markdown.",
].join("\n");

export async function generateRetrofitAssessment(params: {
  input: ValidatedAssessmentInput;
  matchedCaseStudies: MatchedCaseStudySummary[];
  caseStudyDetails?: CaseStudyPromptDetail[];
  cacheMeta: RetrofitAssessmentResult["cacheMeta"];
  forceMock?: boolean;
}): Promise<RetrofitAssessmentResult> {
  const { input, matchedCaseStudies, caseStudyDetails = [], cacheMeta, forceMock } = params;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 55000;
  const envForceMock = process.env.USE_MOCK_ASSESSMENT === "true";
  // "minimal" | "low" | "medium" | "high"; empty = the model's default
  const thinkingLevel = process.env.GEMINI_THINKING_LEVEL?.trim() ?? "low";

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
  // From the Supabase rebate_programs table (falls back to a built-in list)
  const rebates = await getMatchingRebatesAsync(input.province, financingAnswer);
  const detailById = new Map(caseStudyDetails.map((d) => [d.id, d]));

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
    comparableCaseStudies: matchedCaseStudies.map((cs) => {
      const detail = detailById.get(cs.id);
      return {
        id: cs.id,
        title: cs.title,
        location: cs.city ?? cs.province,
        houseType: cs.houseType,
        yearBuilt: cs.yearBuilt,
        retrofitType: cs.retrofitType,
        performanceLevel: cs.performanceLevel,
        whyItMatched: cs.matchReasons,
        energyUseGjPerYear:
          cs.beforeGj !== undefined || cs.afterGj !== undefined
            ? { before: cs.beforeGj ?? null, after: cs.afterGj ?? null }
            : null,
        energyReductionPercent: cs.energyReductionPercent ?? null,
        summary: cs.summary ?? null,
        ...(detail
          ? {
              projectInfo: detail.projectInfo,
              ownerPriorities: detail.priorities,
              upgradesDone: detail.upgradesDone,
              beforeAndAfter: detail.beforeAndAfter,
              narrative: detail.narrative,
            }
          : {}),
      };
    }),
    availableRebates: rebates.map((r) => ({
      name: r.name,
      level: r.level,
      summary: r.summary,
      estimatedValue: r.estimatedValue,
      eligibilityNotes: r.eligibilityNotes,
    })),
  };

  const userPrompt = `Write the retrofit plan for this home. Data:\n${JSON.stringify(promptContext, null, 2)}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header instead of ?key= so the key never ends up in URL logs
        "x-goog-api-key": apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          // Less "thinking" = much faster replies; the plan is grounded in the data we send.
          ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Gemini API returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`
      );
    }

    const geminiJson = (await response.json()) as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      }>;
    };

    const candidate = geminiJson.candidates?.[0];
    const rawText = (candidate?.content?.parts ?? [])
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim();
    if (!rawText) {
      throw new Error(
        `Gemini API returned an empty response (finishReason: ${candidate?.finishReason ?? "unknown"}).`
      );
    }

    const parsed = JSON.parse(rawText) as GeminiStructuredPayload;
    const recommendations = normalizeGeminiRecommendations(
      parsed.recommendations,
      matchedCaseStudies
    );
    if (recommendations.length === 0) {
      throw new Error("Gemini response contained no valid recommendations.");
    }

    const savingsMin = Math.max(
      100,
      Math.round(Number(parsed.estimatedAnnualSavingsMin) || 400)
    );

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
      estimatedAnnualSavingsMin: savingsMin,
      estimatedAnnualSavingsMax: Math.max(
        savingsMin,
        Math.round(Number(parsed.estimatedAnnualSavingsMax) || 950)
      ),
      recommendations,
      nextSteps: Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps
            .filter((s): s is string => typeof s === "string" && s.trim() !== "")
            .map((s) => s.trim())
            .slice(0, 5)
        : [],
      rebates,
      matchedCaseStudies,
      cacheMeta,
      disclaimer: ASSESSMENT_DISCLAIMER,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gemini API error";
    // Full reason goes to the server log only; the homeowner sees a plain message.
    console.error("[advisor] Gemini call failed; serving mock assessment.", message);

    return await buildMockAssessmentResult({
      input,
      matchedCaseStudies,
      cacheMeta,
      fallbackReason:
        "The AI advisor is unavailable right now, so this is a rule-based estimate. Please try again later.",
    });
  }
}
