"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  assessmentQuestions,
  getVisibleQuestions,
  validateQuestion,
} from "@/data/questions";
import type {
  AnswerValue,
  QuestionConfig,
  QuestionnaireAnswers,
  RetrofitAssessmentResult,
} from "@/types";
import QuestionCard from "./QuestionCard";
import AssessmentReview from "./AssessmentReview";
import AssessmentResults from "./AssessmentResults";

const DRAFT_STORAGE_KEY = "retrofit_ai_session_draft";
const DEFAULT_ANSWERS: QuestionnaireAnswers = { floorAreaUnit: "sqft" };

interface DraftState {
  answers: QuestionnaireAnswers;
  currentIndex: number;
  isComplete: boolean;
  result: RetrofitAssessmentResult | null;
}

const draftListeners = new Set<() => void>();

function notifyDraftListeners() {
  draftListeners.forEach((listener) => listener());
}

function subscribeDraft(listener: () => void) {
  draftListeners.add(listener);
  return () => {
    draftListeners.delete(listener);
  };
}

function getDraftSnapshot(): string | null {
  try {
    return sessionStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerDraftSnapshot(): string | null {
  return null;
}

function writeDraft(draft: DraftState) {
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage quota or privacy-mode errors
  }
  notifyDraftListeners();
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
  notifyDraftListeners();
}

function sanitizeAnswers(
  raw: unknown,
  questions: QuestionConfig[]
): QuestionnaireAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_ANSWERS };
  }

  const allowedKeys = new Set<string>();
  for (const q of questions) {
    allowedKeys.add(q.id);
    if (q.unitField) allowedKeys.add(q.unitField);
  }

  const sanitized: QuestionnaireAnswers = { ...DEFAULT_ANSWERS };
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowedKeys.has(key)) continue;
    if (typeof value === "string") {
      sanitized[key] = value;
    } else if (
      Array.isArray(value) &&
      value.every((item) => typeof item === "string")
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function parseDraft(
  raw: string | null,
  questions: QuestionConfig[]
): DraftState {
  if (!raw) {
    return {
      answers: { ...DEFAULT_ANSWERS },
      currentIndex: 0,
      isComplete: false,
      result: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DraftState>;
    const answers = sanitizeAnswers(parsed.answers, questions);
    const visible = getVisibleQuestions(questions, answers);
    const currentIndex =
      typeof parsed.currentIndex === "number" &&
      Number.isInteger(parsed.currentIndex)
        ? Math.max(0, Math.min(parsed.currentIndex, visible.length))
        : 0;

    return {
      answers,
      currentIndex,
      isComplete: Boolean(parsed.isComplete),
      result: parsed.result && typeof parsed.result === "object" ? parsed.result : null,
    };
  } catch {
    return {
      answers: { ...DEFAULT_ANSWERS },
      currentIndex: 0,
      isComplete: false,
      result: null,
    };
  }
}

interface RetrofitFormProps {
  questions?: QuestionConfig[];
}

export default function RetrofitForm({
  questions = assessmentQuestions,
}: RetrofitFormProps) {
  const rawDraft = useSyncExternalStore(
    subscribeDraft,
    getDraftSnapshot,
    getServerDraftSnapshot
  );
  const draft = parseDraft(rawDraft, questions);
  const { answers, currentIndex, isComplete, result } = draft;

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

  const visibleQuestions = getVisibleQuestions(questions, answers);
  const totalQuestions = visibleQuestions.length;
  const safeIndex = Math.min(currentIndex, totalQuestions);
  const isReviewStep = safeIndex === totalQuestions;
  const currentQuestion = isReviewStep ? null : visibleQuestions[safeIndex];

  const scrollToFormTop = () => {
    formTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const resetAssessment = () => {
    setError(null);
    clearDraft();
    scrollToFormTop();
  };

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    setError(null);
    const nextAnswers: QuestionnaireAnswers = {
      ...answers,
      [questionId]: value,
    };

    if (questionId === "foundationType" && value === "Slab-on-grade") {
      nextAnswers.basementInsulation = "";
    }

    if (questionId === "yearBuilt" && value !== "Enter exact year") {
      nextAnswers.exactYear = "";
    }

    if (questionId === "firstPriority" && value === answers.secondPriority) {
      nextAnswers.secondPriority = "";
    }

    writeDraft({
      answers: nextAnswers,
      currentIndex: safeIndex,
      isComplete,
      result: null,
    });
  };

  const nextQuestion = () => {
    if (currentQuestion) {
      const validationError = validateQuestion(
        currentQuestion,
        answers[currentQuestion.id]
      );
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setError(null);
    if (safeIndex < totalQuestions) {
      writeDraft({
        answers,
        currentIndex: safeIndex + 1,
        isComplete: false,
        result,
      });
      scrollToFormTop();
    }
  };

  const skipOptionalQuestion = () => {
    if (
      currentQuestion &&
      !currentQuestion.required &&
      safeIndex < totalQuestions
    ) {
      setError(null);
      writeDraft({
        answers,
        currentIndex: safeIndex + 1,
        isComplete: false,
        result,
      });
      scrollToFormTop();
    }
  };

  const previousQuestion = () => {
    if (safeIndex > 0) {
      setError(null);
      writeDraft({
        answers,
        currentIndex: safeIndex - 1,
        isComplete: false,
        result,
      });
      scrollToFormTop();
    }
  };

  const jumpToQuestion = (questionId: string) => {
    const index = visibleQuestions.findIndex((q) => q.id === questionId);
    if (index !== -1) {
      setError(null);
      writeDraft({
        answers,
        currentIndex: index,
        isComplete: false,
        result,
      });
      scrollToFormTop();
    }
  };

  const completeAssessment = async () => {
    const firstInvalidIndex = visibleQuestions.findIndex(
      (q) => validateQuestion(q, answers[q.id]) !== null
    );

    if (firstInvalidIndex !== -1) {
      const invalidQuestion = visibleQuestions[firstInvalidIndex];
      writeDraft({
        answers,
        currentIndex: firstInvalidIndex,
        isComplete: false,
        result: null,
      });
      setError(validateQuestion(invalidQuestion, answers[invalidQuestion.id]));
      scrollToFormTop();
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const data = (await response.json()) as
        | RetrofitAssessmentResult
        | { error?: string };

      if (!response.ok) {
        const message =
          "error" in data && data.error
            ? data.error
            : "Unable to complete assessment. Please try again.";
        setError(message);
        return;
      }

      writeDraft({
        answers,
        currentIndex: safeIndex,
        isComplete: true,
        result: data as RetrofitAssessmentResult,
      });
      scrollToFormTop();
    } catch {
      setError(
        "Network error while generating your retrofit assessment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete && result) {
    return (
      <div ref={formTopRef} className="scroll-mt-28">
        <AssessmentResults
          result={result}
          onReviewAnswers={() => {
            writeDraft({
              answers,
              currentIndex: totalQuestions,
              isComplete: false,
              result,
            });
            scrollToFormTop();
          }}
          onStartOver={resetAssessment}
        />
      </div>
    );
  }

  if (isComplete) {
    return (
      <div
        ref={formTopRef}
        className="mx-auto mt-8 w-full max-w-[440px] scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md sm:p-8"
      >
        <h2 className="font-saira text-2xl font-bold text-rc-navy">
          Assessment Complete
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Your results session expired. Review your answers and submit again to
          generate your retrofit plan.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              writeDraft({
                answers,
                currentIndex: totalQuestions,
                isComplete: false,
                result: null,
              });
              scrollToFormTop();
            }}
            className="w-full rounded-xl bg-rc-navy px-6 py-3.5 font-semibold text-white transition hover:bg-[#404660]"
          >
            Review My Answers
          </button>
          <button
            type="button"
            onClick={resetAssessment}
            className="w-full rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-rc-navy transition hover:bg-slate-100"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = ((safeIndex + 1) / (totalQuestions + 1)) * 100;

  const excludedValues =
    currentQuestion?.excludeSelectedFrom &&
    typeof answers[currentQuestion.excludeSelectedFrom] === "string" &&
    answers[currentQuestion.excludeSelectedFrom] !== ""
      ? [answers[currentQuestion.excludeSelectedFrom] as string]
      : [];

  return (
    <div
      ref={formTopRef}
      className={`mx-auto mt-8 flex w-full scroll-mt-28 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6 ${
        isReviewStep ? "max-w-lg" : "min-h-[540px] max-w-[440px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-rc-navy">
          {currentQuestion ? currentQuestion.section : "Assessment Summary"}
        </span>

        <div className="flex shrink-0 items-center gap-3">
          {(safeIndex > 0 || Object.keys(answers).length > 1) && (
            <button
              type="button"
              onClick={resetAssessment}
              className="text-xs font-medium text-slate-400 underline hover:text-rc-red"
            >
              Reset
            </button>
          )}

          <span className="text-xs font-semibold text-slate-500">
            {isReviewStep
              ? "Final Review"
              : `${safeIndex + 1} / ${totalQuestions}`}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-rc-red transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Body: single QuestionCard or Review */}
      <div className="mt-6 flex-1">
        {isReviewStep || !currentQuestion ? (
          <AssessmentReview
            questions={questions}
            answers={answers}
            onEditQuestion={jumpToQuestion}
          />
        ) : (
          <QuestionCard
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            unitValue={
              currentQuestion.unitField &&
              typeof answers[currentQuestion.unitField] === "string"
                ? (answers[currentQuestion.unitField] as string)
                : currentQuestion.defaultUnit
            }
            excludedValues={excludedValues}
            error={error}
            onChange={(value) => updateAnswer(currentQuestion.id, value)}
            onUnitChange={(unit) => {
              if (currentQuestion.unitField) {
                updateAnswer(currentQuestion.unitField, unit);
              }
            }}
            onUnknown={skipOptionalQuestion}
            onEnterSubmit={nextQuestion}
          />
        )}
      </div>

      {/* Navigation */}
      {isReviewStep && error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-rc-red"
        >
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={previousQuestion}
          disabled={safeIndex === 0 || isSubmitting}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-rc-navy transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        {isReviewStep ? (
          <button
            type="button"
            onClick={completeAssessment}
            disabled={isSubmitting}
            className="flex-[2] rounded-xl bg-rc-red px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Analyzing Home..." : "Complete Assessment"}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextQuestion}
            className="flex-[2] rounded-xl bg-rc-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#404660]"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
