"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  assessmentQuestions,
  getVisibleQuestions,
  validateQuestion,
} from "@/data/questions";
import type { AnswerValue, QuestionConfig, QuestionnaireAnswers } from "@/types";
import QuestionCard from "./QuestionCard";
import AssessmentReview from "./AssessmentReview";

const DRAFT_STORAGE_KEY = "retrofit_ai_session_draft";
const DEFAULT_ANSWERS: QuestionnaireAnswers = { floorAreaUnit: "sqft" };

interface DraftState {
  answers: QuestionnaireAnswers;
  currentIndex: number;
  isComplete: boolean;
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
    };
  } catch {
    return {
      answers: { ...DEFAULT_ANSWERS },
      currentIndex: 0,
      isComplete: false,
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
  const { answers, currentIndex, isComplete } = draft;

  const [error, setError] = useState<string | null>(null);
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

    writeDraft({ answers: nextAnswers, currentIndex: safeIndex, isComplete });
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
      writeDraft({ answers, currentIndex: safeIndex + 1, isComplete: false });
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
      writeDraft({ answers, currentIndex: safeIndex + 1, isComplete: false });
      scrollToFormTop();
    }
  };

  const previousQuestion = () => {
    if (safeIndex > 0) {
      setError(null);
      writeDraft({ answers, currentIndex: safeIndex - 1, isComplete: false });
      scrollToFormTop();
    }
  };

  const jumpToQuestion = (questionId: string) => {
    const index = visibleQuestions.findIndex((q) => q.id === questionId);
    if (index !== -1) {
      setError(null);
      writeDraft({ answers, currentIndex: index, isComplete: false });
      scrollToFormTop();
    }
  };

  const completeAssessment = () => {
    const firstInvalidIndex = visibleQuestions.findIndex(
      (q) => validateQuestion(q, answers[q.id]) !== null
    );

    if (firstInvalidIndex !== -1) {
      const invalidQuestion = visibleQuestions[firstInvalidIndex];
      writeDraft({
        answers,
        currentIndex: firstInvalidIndex,
        isComplete: false,
      });
      setError(validateQuestion(invalidQuestion, answers[invalidQuestion.id]));
      scrollToFormTop();
      return;
    }

    // Prototype only. No backend or AI request is made.
    setError(null);
    writeDraft({ answers, currentIndex: safeIndex, isComplete: true });
    scrollToFormTop();
  };

  if (isComplete) {
    return (
      <div
        ref={formTopRef}
        className="mx-auto mt-8 w-full max-w-[440px] scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md sm:p-8"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
          ✓
        </div>

        <h2 className="mt-6 font-saira text-2xl font-bold text-rc-navy sm:text-3xl">
          Assessment Complete!
        </h2>

        <p className="mx-auto mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
          You&apos;ve completed the Retrofit Canada homeowner assessment
          prototype.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
          <h3 className="font-semibold text-rc-navy">
            What happens in the completed application?
          </h3>

          <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
            The AI Retrofit Advisor will analyze your home&apos;s
            characteristics, your future plans, and your renovation priorities
            to identify potentially suitable upgrades.
          </p>

          <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
            Recommendations will eventually include estimated costs, energy
            savings, payback periods, and applicable funding opportunities where
            available.
          </p>

          <p className="mt-2.5 text-sm font-medium text-slate-600">
            Prototype only — no assessment has been submitted or analyzed by AI.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              writeDraft({
                answers,
                currentIndex: totalQuestions,
                isComplete: false,
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
      <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={previousQuestion}
          disabled={safeIndex === 0}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-rc-navy transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        {isReviewStep ? (
          <button
            type="button"
            onClick={completeAssessment}
            className="flex-[2] rounded-xl bg-rc-red px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Complete Assessment
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
