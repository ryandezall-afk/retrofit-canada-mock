
"use client";

export interface EnvelopeAnswers {
  foundationType: string;
  basementInsulation: string;
  atticInsulation: string;
  wallStructure: string;
  windowType: string;
  drafts: string;
}

interface BuildingEnvelopeProps {
  answers: EnvelopeAnswers;
  onChange: (answers: EnvelopeAnswers) => void;
}

export default function BuildingEnvelope({
  answers,
  onChange,
}: BuildingEnvelopeProps) {
  const updateAnswer = (
    field: keyof EnvelopeAnswers,
    value: string
  ) => {
    onChange({ ...answers, [field]: value });
  };

  const questions = [
    {
      id: "foundationType",
      question: "What type of foundation or basement does your home have?",
      description:
        "This helps us understand potential heat loss through your foundation.",
      options: [
        "Full finished basement",
        "Full unfinished basement",
        "Crawlspace",
        "Slab-on-grade",
        "Combination",
        "I'm not sure",
      ],
    },
    {
      id: "atticInsulation",
      question: "What is the current condition of your attic insulation?",
      description:
        "An estimate is fine. You don't need to know the exact insulation rating.",
      options: [
        "Original / Never checked",
        "Low (less than 6 inches / joists visible)",
        "Moderate (6–12 inches)",
        "Well insulated (15+ inches / blown-in)",
        "Flat roof / Cathedral ceiling (no attic)",
        "I'm not sure",
      ],
    },
    {
      id: "wallStructure",
      question: "What type of exterior walls does your home have?",
      description:
        "This helps identify which wall insulation upgrades may be possible.",
      options: [
        "Wood frame (vinyl / aluminum / wood siding)",
        "Brick veneer",
        "Solid brick / Stone masonry",
        "Stucco",
        "Other",
        "I'm not sure",
      ],
    },
    {
      id: "windowType",
      question: "What best describes the windows in your home?",
      description:
        "Consider the age and style of most of your windows.",
      options: [
        "Original windows from when the home was built",
        "Single pane (wood / metal)",
        "Older double pane (no Low-E / argon)",
        "Modern double or triple pane (ENERGY STAR)",
        "Mixed / Some windows replaced",
        "I'm not sure",
      ],
    },
    {
      id: "drafts",
      question: "Do you notice drafts around windows, doors, or baseboards?",
      description:
        "Think about how your home feels during colder months.",
      options: [
        "Noticeable drafts in winter",
        "Occasional / Minor drafts",
        "Very airtight / No noticeable drafts",
        "I'm not sure",
      ],
    },
  ] as const;

  const showBasementQuestion =
    answers.foundationType !== "" &&
    answers.foundationType !== "Slab-on-grade";

  return (
    <div className="mt-6 space-y-8">
      <p className="text-slate-600">
        Your home's insulation and building envelope play an
        important role in energy efficiency. These questions
        help identify potential areas where heat may be escaping.
        Estimates are perfectly fine.
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
            onChange={(event) => {
              const value = event.target.value;

              if (
                item.id === "foundationType" &&
                value === "Slab-on-grade"
              ) {
                onChange({
                  ...answers,
                  foundationType: value,
                  basementInsulation: "",
                });
              } else {
                updateAnswer(item.id, value);
              }
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
          >
            <option value="">Select an answer</option>

            {item.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {/* Conditional basement question */}
          {item.id === "foundationType" &&
            showBasementQuestion && (
              <div className="mt-6 rounded-lg border-l-4 border-red-600 bg-slate-50 p-5">
                <label
                  htmlFor="basementInsulation"
                  className="mb-2 block font-medium text-[#2e3249]"
                >
                  Is your basement or crawlspace insulated?
                </label>

                <p className="mb-3 text-sm text-slate-500">
                  If you're unsure, select "I don't know."
                  Our future AI assessment can use estimated
                  values based on your home's characteristics.
                </p>

                <select
                  id="basementInsulation"
                  value={answers.basementInsulation}
                  onChange={(event) =>
                    updateAnswer(
                      "basementInsulation",
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
                >
                  <option value="">Select an answer</option>
                  <option value="Interior insulation">
                    Yes (interior framing / foam)
                  </option>
                  <option value="Exterior insulation">
                    Yes (exterior insulation)
                  </option>
                  <option value="Uninsulated">
                    Uninsulated concrete / stone
                  </option>
                  <option value="Unknown">
                    I don't know
                  </option>
                </select>
              </div>
            )}
        </div>
      ))}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <h4 className="font-semibold text-[#2e3249]">
          Why do we ask these questions?
        </h4>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The building envelope includes the walls, roof,
          windows, doors, and foundation that separate your
          home's interior from the outdoors.
          Understanding their condition helps identify
          opportunities to improve comfort and reduce
          unnecessary heat loss.
        </p>
      </div>
    </div>
  );
}
