
"use client";

export interface HeatingCoolingAnswers {
  heatingFuel: string;
  heatingEquipment: string;
  heatingAge: string;
  coolingSystem: string;
  waterHeating: string;
  electricalPanel: string;
}

interface HeatingCoolingProps {
  answers: HeatingCoolingAnswers;
  onChange: (answers: HeatingCoolingAnswers) => void;
}

const questions = [
  {
    id: "heatingFuel",
    question: "What is your home's primary heating fuel source?",
    description:
      "Select the energy source used to heat most of your home.",
    options: [
      "Natural Gas",
      "Electricity",
      "Heating Oil",
      "Propane",
      "Wood / Pellet",
      "Other",
      "I'm not sure",
    ],
  },
  {
    id: "heatingEquipment",
    question: "What type of heating equipment is currently installed?",
    description:
      "If you have multiple systems, select the one used most often.",
    options: [
      "Forced-air furnace",
      "Hydronic boiler (radiators / in-floor)",
      "Baseboard electric heaters",
      "Heat pump (central ducted)",
      "Heat pump (ductless mini-splits)",
      "Other",
      "I'm not sure",
    ],
  },
  {
    id: "heatingAge",
    question: "Approximately how old is your heating system?",
    description:
      "An estimate is fine. Older equipment may offer opportunities for efficiency improvements.",
    options: [
      "Under 5 years",
      "5–10 years",
      "11–15 years",
      "16–20+ years",
      "I'm not sure",
    ],
  },
  {
    id: "coolingSystem",
    question: "How do you cool your home during summer?",
    description:
      "Select the primary cooling method used in your home.",
    options: [
      "Central Air Conditioning",
      "Ductless mini-split heat pump",
      "Window / Portable A/C units",
      "No active cooling / Fans only",
      "I'm not sure",
    ],
  },
  {
    id: "waterHeating",
    question: "How do you heat your domestic hot water?",
    description:
      "This refers to the equipment providing hot water for showers, sinks, and appliances.",
    options: [
      "Standard gas tank (atmospheric vent)",
      "Power-vented gas tank",
      "Standard electric resistance tank",
      "Tankless / On-demand gas",
      "Heat pump water heater (hybrid)",
      "Other",
      "I'm not sure",
    ],
  },
  {
    id: "electricalPanel",
    question: "What is your home's main electrical service capacity?",
    description:
      "You may find this information on your electrical panel or utility documents. Do not remove the panel cover.",
    options: [
      "60 Amp (older)",
      "100 Amp",
      "200 Amp",
      "Other",
      "I'm not sure",
    ],
  },
] as const;

export default function HeatingCooling({
  answers,
  onChange,
}: HeatingCoolingProps) {
  const updateAnswer = (
    field: keyof HeatingCoolingAnswers,
    value: string
  ) => {
    onChange({ ...answers, [field]: value });
  };

  return (
    <div className="mt-6 space-y-8">
      <p className="text-slate-600">
        Heating, cooling, and hot water systems are important
        factors in your home's overall energy use. These
        questions will help identify potential equipment
        upgrades and energy-saving opportunities.
      </p>

      {questions.map((item) => (
        <div key={item.id}>
          <label
            htmlFor={item.id}
            className="mb-2 block font-medium text-[#2e3249]"
          >
            {item.question}
          </label>

          <p className="mb-3 text-sm text-slate-500">
            {item.description}
          </p>

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

      {/* Future AI functionality notice */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <h4 className="font-semibold text-[#2e3249]">
          Not sure about your equipment?
        </h4>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          That's completely fine. In a future version,
          you'll be able to upload photos of equipment
          labels or nameplates to help identify your
          heating and hot water systems automatically.
          For now, select "I'm not sure" whenever needed.
        </p>
      </div>
    </div>
  );
}
