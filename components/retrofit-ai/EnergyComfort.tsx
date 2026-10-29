
"use client";

export interface EnergyComfortAnswers {
  electricityBill: string;
  winterGasBill: string;
  annualEnergyCost: string;
  comfortIssues: string[];
  secondaryHeating: string;
}

interface EnergyComfortProps {
  answers: EnergyComfortAnswers;
  onChange: (answers: EnergyComfortAnswers) => void;
}

const comfortOptions = [
  "Certain rooms are too cold in winter or too hot in summer",
  "Drafts along exterior walls or floors",
  "Excessive window condensation in winter",
  "Ice damming or large icicles on the roof edge",
  "High indoor humidity or musty odors",
  "No issues / Comfortable year-round",
];

const secondaryHeatingOptions = [
  "Gas fireplace",
  "Wood stove / Fireplace",
  "Electric space heaters",
  "None",
  "I'm not sure",
];

export default function EnergyComfort({
  answers,
  onChange,
}: EnergyComfortProps) {
  const updateAnswer = (
    field: keyof EnergyComfortAnswers,
    value: string
  ) => {
    onChange({ ...answers, [field]: value });
  };

  const toggleComfortIssue = (issue: string) => {
    const noIssues = "No issues / Comfortable year-round";

    let updated: string[];

    if (answers.comfortIssues.includes(issue)) {
      updated = answers.comfortIssues.filter(
        (item) => item !== issue
      );
    } else if (issue === noIssues) {
      updated = [noIssues];
    } else {
      updated = [
        ...answers.comfortIssues.filter(
          (item) => item !== noIssues
        ),
        issue,
      ];
    }

    onChange({
      ...answers,
      comfortIssues: updated,
    });
  };

  return (
    <div className="mt-6 space-y-8">
      <p className="text-slate-600">
        Your energy bills and everyday comfort can provide
        useful clues about your home's energy efficiency.
        These questions are optional, and estimates are fine.
      </p>

      {/* Utility bills */}
      <fieldset className="space-y-5">
        <legend className="font-semibold text-[#2e3249]">
          What are your approximate energy costs?
        </legend>

        <p className="text-sm text-slate-500">
          Enter any costs you know in Canadian dollars.
          You can leave the others blank.
        </p>

        <div>
          <label
            htmlFor="electricityBill"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Average monthly electricity bill (CAD)
          </label>

          <input
            id="electricityBill"
            type="number"
            min="0"
            step="0.01"
            value={answers.electricityBill}
            onChange={(event) =>
              updateAnswer("electricityBill", event.target.value)
            }
            placeholder="e.g., 150"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="winterGasBill"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Average monthly natural gas bill during winter (CAD)
          </label>

          <input
            id="winterGasBill"
            type="number"
            min="0"
            step="0.01"
            value={answers.winterGasBill}
            onChange={(event) =>
              updateAnswer("winterGasBill", event.target.value)
            }
            placeholder="e.g., 250"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="annualEnergyCost"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Total annual energy cost (CAD) — if known
          </label>

          <input
            id="annualEnergyCost"
            type="number"
            min="0"
            step="0.01"
            value={answers.annualEnergyCost}
            onChange={(event) =>
              updateAnswer("annualEnergyCost", event.target.value)
            }
            placeholder="e.g., 3600"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
          />
        </div>
      </fieldset>

      {/* Comfort issues */}
      <fieldset>
        <legend className="font-semibold text-[#2e3249]">
          Do you experience any of these comfort or durability issues?
        </legend>

        <p className="mb-4 mt-2 text-sm text-slate-500">
          Select all that apply.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {comfortOptions.map((issue) => (
            <label
              key={issue}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={answers.comfortIssues.includes(issue)}
                onChange={() => toggleComfortIssue(issue)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
              />

              <span>{issue}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Secondary heating */}
      <div>
        <label
          htmlFor="secondaryHeating"
          className="mb-2 block font-semibold text-[#2e3249]"
        >
          Do you regularly use a secondary heat source?
        </label>

        <p className="mb-3 text-sm text-slate-500">
          For example, a fireplace or portable heater
          in addition to your primary heating system.
        </p>

        <select
          id="secondaryHeating"
          value={answers.secondaryHeating}
          onChange={(event) =>
            updateAnswer("secondaryHeating", event.target.value)
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
        >
          <option value="">Select an answer</option>

          {secondaryHeatingOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Information box */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <h4 className="font-semibold text-[#2e3249]">
          Why does this matter?
        </h4>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Energy costs help establish a baseline for estimating
          potential savings and payback periods. Comfort issues
          may also reveal opportunities for insulation,
          air sealing, ventilation, or heating improvements.
          Actual recommendations will require further analysis.
        </p>
      </div>
    </div>
  );
}
