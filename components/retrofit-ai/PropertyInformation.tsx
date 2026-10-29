
"use client";

export interface PropertyAnswers {
  postalCode: string;
  ownership: string;
  homeType: string;
  yearBuilt: string;
  exactYear: string;
  floorArea: string;
  floorAreaUnit: string;
  storeys: string;
}

interface PropertyInformationProps {
  answers: PropertyAnswers;
  onChange: (answers: PropertyAnswers) => void;
}

export default function PropertyInformation({
  answers,
  onChange,
}: PropertyInformationProps) {
  const updateAnswer = (
    field: keyof PropertyAnswers,
    value: string
  ) => {
    onChange({ ...answers, [field]: value });
  };

  const questions = [
    {
      id: "ownership",
      question: "Do you own or rent this property?",
      options: [
        "Homeowner",
        "Landlord",
        "Property Manager",
        "Tenant",
      ],
    },
    {
      id: "homeType",
      question: "What type of home is it?",
      options: [
        "Single-family detached",
        "Semi-detached / Duplex",
        "Row house / Townhome",
        "Mobile home",
        "Small multi-unit (low-rise multiplex)",
        "I'm not sure",
      ],
    },
    {
      id: "yearBuilt",
      question: "Approximately when was your home built?",
      options: [
        "Pre-1950",
        "1950–1969",
        "1970–1989",
        "1990–2005",
        "2006–Present",
        "Enter exact year",
        "I'm not sure",
      ],
    },
    {
      id: "storeys",
      question: "How many storeys does your home have?",
      options: [
        "1 Storey (Bungalow/Ranch)",
        "1.5 Storeys",
        "2 Storeys",
        "3 Storeys",
        "Split-level",
        "I'm not sure",
      ],
    },
  ] as const;

  return (
    <div className="mt-6 space-y-8">
      <p className="text-slate-600">
        Tell us a little about your property. This information
        helps establish your home's energy efficiency baseline
        and identify potentially applicable retrofit programs.
      </p>

      {/* Postal code */}
      <div>
        <label
          htmlFor="postalCode"
          className="mb-2 block font-medium text-[#2e3249]"
        >
          What is your property's postal code?
        </label>

        <input
          id="postalCode"
          type="text"
          value={answers.postalCode}
          onChange={(event) =>
            updateAnswer(
              "postalCode",
              event.target.value.toUpperCase()
            )
          }
          placeholder="e.g., T2N 1N4"
          maxLength={7}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
        />

        <p className="mt-2 text-sm text-slate-500">
          Used to estimate local climate conditions and
          identify relevant regional rebate programs.
        </p>
      </div>

      {/* Dropdown questions */}
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

          {/* Only show exact year when selected */}
          {item.id === "yearBuilt" &&
            answers.yearBuilt === "Enter exact year" && (
              <div className="mt-3">
                <label
                  htmlFor="exactYear"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Enter the year your home was built
                </label>

                <input
                  id="exactYear"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={answers.exactYear}
                  onChange={(event) =>
                    updateAnswer("exactYear", event.target.value)
                  }
                  placeholder="e.g., 1974"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
                />
              </div>
            )}
        </div>
      ))}

      {/* Heated floor area */}
      <div>
        <label
          htmlFor="floorArea"
          className="mb-2 block font-medium text-[#2e3249]"
        >
          What is your home's approximate heated floor area?
        </label>

        <p className="mb-3 text-sm text-slate-500">
          Exclude unfinished basement areas.
          An estimate is fine.
        </p>

        <div className="flex gap-3">
          <input
            id="floorArea"
            type="number"
            min="0"
            value={answers.floorArea}
            onChange={(event) =>
              updateAnswer("floorArea", event.target.value)
            }
            placeholder="e.g., 1800"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-slate-800 focus:border-red-600 focus:outline-none"
          />

          <select
            aria-label="Floor area unit"
            value={answers.floorAreaUnit}
            onChange={(event) =>
              updateAnswer("floorAreaUnit", event.target.value)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800"
          >
            <option value="sqft">sq. ft.</option>
            <option value="sqm">sq. m.</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => updateAnswer("floorArea", "")}
          className="mt-2 text-sm text-slate-500 underline hover:text-red-600"
        >
          I don't know
        </button>
      </div>
    </div>
  );
}
