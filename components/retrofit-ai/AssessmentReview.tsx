"use client";

import { getVisibleQuestions } from "@/data/questions";
import type { QuestionConfig, QuestionnaireAnswers } from "@/types";

interface AssessmentReviewProps {
  questions: QuestionConfig[];
  answers: QuestionnaireAnswers;
  onEditQuestion: (questionId: string) => void;
}

function formatReviewValue(
  question: QuestionConfig,
  answers: QuestionnaireAnswers
): string {
  if (
    question.id === "basementInsulation" &&
    answers.foundationType === "Slab-on-grade"
  ) {
    return "Not applicable";
  }

  const raw = answers[question.id];
  if (Array.isArray(raw)) {
    return raw.length > 0 ? raw.join(", ") : "Not provided";
  }

  const text = raw ?? "";
  if (!text) return "Not provided";

  if (question.id === "floorArea") {
    const unit = answers.floorAreaUnit === "sqm" ? "sq. m." : "sq. ft.";
    return `${text} ${unit}`;
  }

  if (question.prefix === "$" && question.suffix?.startsWith("CAD")) {
    return `$${text} CAD`;
  }

  return text;
}

export default function AssessmentReview({
  questions,
  answers,
  onEditQuestion,
}: AssessmentReviewProps) {
  const visibleQuestions = getVisibleQuestions(questions, answers).filter(
    // Year built shows the exact year when "Enter exact year" is selected
    (q) =>
      !(q.id === "yearBuilt" && answers.yearBuilt === "Enter exact year")
  );

  const groupedSections = visibleQuestions.reduce<
    { title: string; items: QuestionConfig[] }[]
  >((groups, question) => {
    const existing = groups.find((g) => g.title === question.section);
    if (existing) {
      existing.items.push(question);
    } else {
      groups.push({ title: question.section, items: [question] });
    }
    return groups;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-saira text-2xl font-semibold text-rc-navy">
          Review Your Answers
        </h3>
        <p className="mt-2 text-slate-600">
          Review your assessment before continuing. Click Edit on any section
          or answer to jump back and change it.
        </p>
      </div>

      {groupedSections.map((section) => (
        <div
          key={section.title}
          className="rounded-xl border border-slate-200 p-5"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <h4 className="font-saira text-lg font-bold text-rc-navy">
              {section.title}
            </h4>

            <button
              type="button"
              onClick={() => onEditQuestion(section.items[0].id)}
              className="shrink-0 text-sm font-semibold text-rc-red hover:underline"
            >
              Edit section
            </button>
          </div>

          <dl className="divide-y divide-slate-100">
            {section.items.map((question) => (
              <div
                key={question.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <dt className="text-sm text-slate-500">
                    {question.reviewLabel}
                  </dt>
                  <dd className="mt-1 break-words font-medium text-rc-navy">
                    {formatReviewValue(question, answers)}
                  </dd>
                </div>

                <button
                  type="button"
                  onClick={() => onEditQuestion(question.id)}
                  className="shrink-0 text-xs font-medium text-slate-400 hover:text-rc-red hover:underline"
                >
                  Edit
                </button>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <h4 className="font-semibold text-rc-navy">Prototype Assessment</h4>

        <p className="mt-2 text-sm text-slate-600">
          This is a demonstration of the homeowner questionnaire. No AI
          analysis, rebate eligibility checks, or energy calculations are
          performed yet. Your answers are currently held in browser memory and
          are not submitted to a server.
        </p>
      </div>
    </div>
  );
}
