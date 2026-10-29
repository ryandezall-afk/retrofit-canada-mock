
"use client";

export interface SuitabilityAnswers {
  stayingDuration: string;
  relocationRisk: string;
  sellingPlans: string;
  homeCondition: string;
  plannedRepairs: string[];
  motivation: string;
}

interface SuitabilityCheckProps {
  answers: SuitabilityAnswers;
  onChange: (answers: SuitabilityAnswers) => void;
}

export default function SuitabilityCheck({
  answers,
  onChange,
}: SuitabilityCheckProps) {
  const questions = [
    {
      id: "stayingDuration",
      question: "How long do you expect to stay in this home?",
      options: [
        "Under 2 years",
        "2–5 years",
        "5–10 years",
        "10+ years",
        "I'm not sure",
      ],
    },
    {
      id: "relocationRisk",
      question: "Is there a possibility you may need to relocate?",
      options: [
        "No, unlikely",
        "Possibly",
        "Likely",
        "I'm not sure",
      ],
    },
    {
      id: "sellingPlans",
      question: "Are you considering selling this property?",
      options: [
        "Yes, within 2 years",
        "Yes, within 5 years",
        "No",
        "I'm not sure",
      ],
    },
    {
      id: "homeCondition",
      question: "What is the current condition of your home?",
      options: [
        "Good condition",
        "Minor repairs needed",
        "Major repairs needed",
        "I'm not sure",
      ],
    },
    {
      id: "motivation",
      question: "What is your main reason for considering a retrofit?",
      options: [
        "Lower energy bills",
        "Improve home comfort",
        "Replace aging equipment",
        "Reduce environmental impact",
        "Increase property value",
        "Other / Not sure",
      ],
    },
  ] as const;

  const updateAnswer = (
    id: Exclude<keyof SuitabilityAnswers, "plannedRepairs">,
    value: string
  ) => {
    onChange({ ...answers, [id]: value });
  };

  const toggleRepair = (repair: string) => {
    const updated = answers.plannedRepairs.includes(repair)
      ? answers.plannedRepairs.filter((item) => item !== repair)
      : [...answers.plannedRepairs, repair];

    onChange({ ...answers, plannedRepairs: updated });
  };

  return (
    <div className="mt-6 space-y-8">
      <p className="text-slate-600">
        Before assessing your home's energy efficiency, we'd like
        to understand your future plans and renovation goals.
        Your answers will help us evaluate which upgrades may
        make financial and practical sense.
      </p>

      {questions.map((item) => (
        <div key={item.id}>
          <label
            htmlFor={item.id}
            className="mb-2 block font-medium text-[#2e3249]"
          >
            {item.question}
          </label>

          <select
            id={item.id}
            value={answers[item.id]}
            onChange={(event) =>
              updateAnswer(item.id, event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
          >
            <option value="">Select an answer</option>
            {item.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ))}

      <fieldset>
        <legend className="mb-3 font-medium text-[#2e3249]">
          Are you planning any major home repairs?
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "Roof replacement",
            "Window replacement",
            "Heating system replacement",
            "Exterior siding replacement",
            "No major repairs planned",
            "Other / Not sure",
          ].map((repair) => (
            <label
              key={repair}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={answers.plannedRepairs.includes(repair)}
                onChange={() => toggleRepair(repair)}
                className="h-4 w-4 accent-red-600"
              />
              {repair}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <h4 className="font-semibold text-[#2e3249]">
          Your Retrofit Suitability
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          In the completed application, our AI will use these
          answers to evaluate whether major upgrades are
          worthwhile based on your expected time in the home,
          renovation plans, potential savings, and other factors.
          You can continue with the assessment regardless
          of your answers.
        </p>
      </div>
    </div>
  );
}
