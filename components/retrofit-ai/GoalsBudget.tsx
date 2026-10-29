
"use client";

export interface GoalsBudgetAnswers {
  firstPriority: string;
  secondPriority: string;
  budget: string;
  financing: string;
  timeline: string;
}

interface GoalsBudgetProps {
  answers: GoalsBudgetAnswers;
  onChange: (answers: GoalsBudgetAnswers) => void;
}

const priorityOptions = [
  "Lowering monthly utility bills",
  "Improving indoor comfort",
  "Replacing aging or failing equipment",
  "Reducing greenhouse gas emissions",
  "Preparing for solar panels or EV charging",
];

const budgetOptions = [
  "Low / DIY focus (Under $2,000)",
  "Moderate ($2,000–$10,000)",
  "Substantial retrofit ($10,000–$25,000)",
  "Deep retrofit ($25,000+)",
  "Zero-down / Grant-covered options only",
  "I'm not sure yet",
];

const financingOptions = [
  "Yes, I'm interested",
  "Maybe / Tell me more",
  "No, I prefer cash or other financing",
  "I'm not sure",
];

const timelineOptions = [
  "Immediately (within 1–3 months)",
  "This year (3–12 months)",
  "Longer-term planning (1–3 years)",
  "I'm not sure",
];

export default function GoalsBudget({
  answers,
  onChange,
}: GoalsBudgetProps) {
  const updateAnswer = (
    field: keyof GoalsBudgetAnswers,
    value: string
  ) => {
    onChange({ ...answers, [field]: value });
  };

  const updatePriority = (
    field: "firstPriority" | "secondPriority",
    value: string
  ) => {
    // Prevent the same priority being ranked twice.
    if (
      field === "firstPriority" &&
      value === answers.secondPriority
    ) {
      onChange({
        ...answers,
        firstPriority: value,
        secondPriority: "",
      });
    } else if (
      field === "secondPriority" &&
      value === answers.firstPriority
    ) {
      onChange({
        ...answers,
        firstPriority: "",
        secondPriority: value,
      });
    } else {
      onChange({ ...answers, [field]: value });
    }
  };

  return (
    <div className="mt-6 space-y-8">
      <p className="text-slate-600">
        Finally, tell us what matters most to you. Your goals,
        budget, and timeline will help our future AI advisor
        prioritize retrofit recommendations that fit your needs.
      </p>

      {/* Priority ranking */}
      <fieldset className="space-y-5">
        <legend className="font-semibold text-[#2e3249]">
          What are your top priorities for retrofitting?
        </legend>

        <p className="text-sm text-slate-500">
          Choose your first and second priorities.
          You can leave the second priority blank.
        </p>

        <div>
          <label
            htmlFor="firstPriority"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            #1 — Most important priority
          </label>

          <select
            id="firstPriority"
            value={answers.firstPriority}
            onChange={(event) =>
              updatePriority("firstPriority", event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
          >
            <option value="">Select your top priority</option>
            {priorityOptions.map((option) => (
              <option
                key={option}
                value={option}
                disabled={option === answers.secondPriority}
              >
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="secondPriority"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            #2 — Second most important priority
          </label>

          <select
            id="secondPriority"
            value={answers.secondPriority}
            onChange={(event) =>
              updatePriority("secondPriority", event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
          >
            <option value="">Select your second priority (optional)</option>
            {priorityOptions.map((option) => (
              <option
                key={option}
                value={option}
                disabled={option === answers.firstPriority}
              >
                {option}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Budget */}
      <div>
        <label
          htmlFor="budget"
          className="mb-2 block font-semibold text-[#2e3249]"
        >
          What is your anticipated budget for home upgrades?
        </label>

        <p className="mb-3 text-sm text-slate-500">
          Choose the range that best represents what you
          are comfortable spending.
        </p>

        <select
          id="budget"
          value={answers.budget}
          onChange={(event) =>
            updateAnswer("budget", event.target.value)
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
        >
          <option value="">Select a budget range</option>
          {budgetOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Financing */}
      <div>
        <label
          htmlFor="financing"
          className="mb-2 block font-semibold text-[#2e3249]"
        >
          Are you interested in low-interest financing
          or municipal clean energy loans?
        </label>

        <p className="mb-3 text-sm text-slate-500">
          Some programs, such as Clean Energy Improvement
          Programs (CEIP), may offer financing for eligible
          property upgrades. Availability depends on location
          and program requirements.
        </p>

        <select
          id="financing"
          value={answers.financing}
          onChange={(event) =>
            updateAnswer("financing", event.target.value)
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
        >
          <option value="">Select an answer</option>
          {financingOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div>
        <label
          htmlFor="timeline"
          className="mb-2 block font-semibold text-[#2e3249]"
        >
          When are you planning to start your upgrades?
        </label>

        <select
          id="timeline"
          value={answers.timeline}
          onChange={(event) =>
            updateAnswer("timeline", event.target.value)
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
        >
          <option value="">Select a timeline</option>
          {timelineOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Future AI explanation */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <h4 className="font-semibold text-[#2e3249]">
          How will your goals influence the results?
        </h4>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The completed AI advisor will use your priorities,
          available budget, financing preferences, and timeline
          to recommend suitable upgrades. It will also consider
          your expected time in the home when evaluating
          long-term value and estimated payback periods.
        </p>
      </div>
    </div>
  );
}
