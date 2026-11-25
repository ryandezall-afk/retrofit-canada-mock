"use client";

import { useRef, useState } from "react";
import {
  assessmentQuestions,
  getVisibleQuestions,
  validateQuestion,
} from "@/data/questions";
import type { AnswerValue, QuestionConfig, QuestionnaireAnswers } from "@/types";
import QuestionCard from "./QuestionCard";
import AssessmentReview from "./AssessmentReview";

interface RetrofitFormProps {
  questions?: QuestionConfig[];
}

export default function RetrofitForm({
  questions = assessmentQuestions,
}: RetrofitFormProps) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    floorAreaUnit: "sqft",
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

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

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    setError(null);
    setAnswers((prev) => {
      const next: QuestionnaireAnswers = { ...prev, [questionId]: value };

      if (questionId === "foundationType" && value === "Slab-on-grade") {
        next.basementInsulation = "";
      }

      if (questionId === "yearBuilt" && value !== "Enter exact year") {
        next.exactYear = "";
      }

      if (questionId === "firstPriority" && value === prev.secondPriority) {
        next.secondPriority = "";
      }

      return next;
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
      setCurrentIndex(safeIndex + 1);
      scrollToFormTop();
    }
  };

  const skipOptionalQuestion = () => {
    if (currentQuestion && !currentQuestion.required && safeIndex < totalQuestions) {
      setError(null);
      setCurrentIndex(safeIndex + 1);
      scrollToFormTop();
    }
  };

  const previousQuestion = () => {
    if (safeIndex > 0) {
      setError(null);
      setCurrentIndex(safeIndex - 1);
      scrollToFormTop();
    }
  };

  const jumpToQuestion = (questionId: string) => {
    const index = visibleQuestions.findIndex((q) => q.id === questionId);
    if (index !== -1) {
      setError(null);
      setCurrentIndex(index);
      scrollToFormTop();
    }
  };

  const completeAssessment = () => {
    const firstInvalidIndex = visibleQuestions.findIndex(
      (q) => validateQuestion(q, answers[q.id]) !== null
    );

    if (firstInvalidIndex !== -1) {
      const invalidQuestion = visibleQuestions[firstInvalidIndex];
      setCurrentIndex(firstInvalidIndex);
      setError(validateQuestion(invalidQuestion, answers[invalidQuestion.id]));
      scrollToFormTop();
      return;
    }

    // Prototype only. No backend or AI request is made.
    setError(null);
    setIsComplete(true);
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

        <button
          type="button"
          onClick={() => {
            setIsComplete(false);
            setCurrentIndex(totalQuestions);
            scrollToFormTop();
          }}
          className="mt-6 w-full rounded-xl bg-rc-navy px-6 py-3.5 font-semibold text-white transition hover:bg-[#404660]"
        >
          Review My Answers
        </button>
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

        <span className="shrink-0 text-xs font-semibold text-slate-500">
          {isReviewStep
            ? "Final Review"
            : `${safeIndex + 1} / ${totalQuestions}`}
        </span>
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
