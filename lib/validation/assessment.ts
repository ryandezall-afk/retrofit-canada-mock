import {
  assessmentQuestions,
  getVisibleQuestions,
  validateQuestion,
} from "@/data/questions";
import { inferProvinceFromPostalCode } from "@/lib/server/retrofit-canada-api";
import type { QuestionnaireAnswers } from "@/types";

export interface ValidatedAssessmentInput {
  answers: QuestionnaireAnswers;
  postalFsa: string;
  province: string;
  yearBuiltLabel: string;
  floorAreaLabel: string;
  homeType: string;
  heatingFuel: string;
  budget: string;
}

export function extractPostalFsa(postalCode?: string): string {
  const clean = (postalCode ?? "").replace(/\s+/g, "").toUpperCase();
  return clean.slice(0, 3);
}

export function sanitizeAssessmentAnswers(
  raw: unknown
): QuestionnaireAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const allowedKeys = new Set<string>();
  for (const q of assessmentQuestions) {
    allowedKeys.add(q.id);
    if (q.unitField) allowedKeys.add(q.unitField);
  }

  const sanitized: QuestionnaireAnswers = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowedKeys.has(key)) continue;

    if (typeof value === "string") {
      sanitized[key] = value.trim();
    } else if (
      Array.isArray(value) &&
      value.every((item) => typeof item === "string")
    ) {
      sanitized[key] = value.map((item) => item.trim()).filter(Boolean);
    }
  }

  if (!sanitized.floorAreaUnit) {
    sanitized.floorAreaUnit = "sqft";
  }

  return sanitized;
}

export function validateAssessmentSubmission(rawAnswers: unknown):
  | { ok: true; data: ValidatedAssessmentInput }
  | { ok: false; errors: Record<string, string>; message: string } {
  const answers = sanitizeAssessmentAnswers(rawAnswers);
  const visibleQuestions = getVisibleQuestions(assessmentQuestions, answers);
  const errors: Record<string, string> = {};

  for (const question of visibleQuestions) {
    const err = validateQuestion(question, answers[question.id]);
    if (err) {
      errors[question.id] = err;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
      message: "Please complete all required assessment fields before submitting.",
    };
  }

  const fullPostal =
    typeof answers.postalCode === "string" ? answers.postalCode : "";
  const postalFsa = extractPostalFsa(fullPostal);
  const province = inferProvinceFromPostalCode(fullPostal);

  // Strip full 6-character postal code before downstream AI/storage use (POC-4)
  const privacySafeAnswers: QuestionnaireAnswers = {
    ...answers,
    postalCode: postalFsa,
  };

  const yearBuiltLabel =
    answers.yearBuilt === "Enter exact year" &&
    typeof answers.exactYear === "string" &&
    answers.exactYear
      ? answers.exactYear
      : typeof answers.yearBuilt === "string" && answers.yearBuilt
        ? answers.yearBuilt
        : "Not specified";

  const floorAreaRaw =
    typeof answers.floorArea === "string" ? answers.floorArea : "";
  const floorUnit = answers.floorAreaUnit === "sqm" ? "sq. m." : "sq. ft.";
  const floorAreaLabel = floorAreaRaw
    ? `${floorAreaRaw} ${floorUnit}`
    : "Not specified";

  return {
    ok: true,
    data: {
      answers: privacySafeAnswers,
      postalFsa,
      province,
      yearBuiltLabel,
      floorAreaLabel,
      homeType:
        typeof answers.homeType === "string" && answers.homeType
          ? answers.homeType
          : "Residential home",
      heatingFuel:
        typeof answers.heatingFuel === "string" && answers.heatingFuel
          ? answers.heatingFuel
          : "Not specified",
      budget:
        typeof answers.budget === "string" && answers.budget
          ? answers.budget
          : "Not specified",
    },
  };
}
