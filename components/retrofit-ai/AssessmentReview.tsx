
"use client";

import type { SuitabilityAnswers } from "./SuitabilityCheck";
import type { PropertyAnswers } from "./PropertyInformation";
import type { EnvelopeAnswers } from "./BuildingEnvelope";
import type { HeatingCoolingAnswers } from "./HeatingCooling";
import type { EnergyComfortAnswers } from "./EnergyComfort";
import type { GoalsBudgetAnswers } from "./GoalsBudget";

interface AssessmentReviewProps {
  suitability: SuitabilityAnswers;
  property: PropertyAnswers;
  envelope: EnvelopeAnswers;
  heatingCooling: HeatingCoolingAnswers;
  energyComfort: EnergyComfortAnswers;
  goalsBudget: GoalsBudgetAnswers;
  onEdit: (step: number) => void;
}

interface ReviewSectionProps {
  title: string;
  step: number;
  fields: {
    label: string;
    value: string | string[];
  }[];
  onEdit: (step: number) => void;
}

function ReviewSection({
  title,
  step,
  fields,
  onEdit,
}: ReviewSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="font-saira text-lg font-bold text-[#2e3249]">
          {title}
        </h3>

        <button
          type="button"
          onClick={() => onEdit(step)}
          className="shrink-0 text-sm font-semibold text-red-600 hover:underline"
        >
          Edit
        </button>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const displayValue = Array.isArray(field.value)
            ? field.value.join(", ")
            : field.value;

          return (
            <div key={field.label}>
              <dt className="text-sm text-slate-500">
                {field.label}
              </dt>

              <dd className="mt-1 break-words font-medium text-[#2e3249]">
                {displayValue || "Not provided"}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export default function AssessmentReview({
  suitability,
  property,
  envelope,
  heatingCooling,
  energyComfort,
  goalsBudget,
  onEdit,
}: AssessmentReviewProps) {
  const sections = [
    {
      title: "Retrofit Suitability",
      step: 0,
      fields: [
        { label: "Expected time in home", value: suitability.stayingDuration },
        { label: "Relocation risk", value: suitability.relocationRisk },
        { label: "Selling plans", value: suitability.sellingPlans },
        { label: "Home condition", value: suitability.homeCondition },
        { label: "Planned repairs", value: suitability.plannedRepairs },
        { label: "Main motivation", value: suitability.motivation },
      ],
    },
    {
      title: "Property Information",
      step: 1,
      fields: [
        { label: "Postal code", value: property.postalCode },
        { label: "Ownership", value: property.ownership },
        { label: "Home type", value: property.homeType },
        {
          label: "Year built",
          value:
            property.yearBuilt === "Enter exact year"
              ? property.exactYear
              : property.yearBuilt,
        },
        {
          label: "Heated floor area",
          value: property.floorArea
            ? `${property.floorArea} ${
                property.floorAreaUnit === "sqft" ? "sq. ft." : "sq. m."
              }`
            : "",
        },
        { label: "Storeys", value: property.storeys },
      ],
    },
    {
      title: "Insulation & Building Envelope",
      step: 2,
      fields: [
        { label: "Foundation", value: envelope.foundationType },
        {
          label: "Basement insulation",
          value:
            envelope.foundationType === "Slab-on-grade"
              ? "Not applicable"
              : envelope.basementInsulation,
        },
        { label: "Attic insulation", value: envelope.atticInsulation },
        { label: "Exterior walls", value: envelope.wallStructure },
        { label: "Windows", value: envelope.windowType },
        { label: "Drafts", value: envelope.drafts },
      ],
    },
    {
      title: "Heating & Cooling",
      step: 3,
      fields: [
        { label: "Heating fuel", value: heatingCooling.heatingFuel },
        { label: "Heating equipment", value: heatingCooling.heatingEquipment },
        { label: "Heating system age", value: heatingCooling.heatingAge },
        { label: "Cooling system", value: heatingCooling.coolingSystem },
        { label: "Water heating", value: heatingCooling.waterHeating },
        { label: "Electrical panel", value: heatingCooling.electricalPanel },
      ],
    },
    {
      title: "Energy & Comfort",
      step: 4,
      fields: [
        {
          label: "Monthly electricity bill",
          value: energyComfort.electricityBill
            ? `$${energyComfort.electricityBill} CAD`
            : "",
        },
        {
          label: "Winter gas bill",
          value: energyComfort.winterGasBill
            ? `$${energyComfort.winterGasBill} CAD`
            : "",
        },
        {
          label: "Annual energy cost",
          value: energyComfort.annualEnergyCost
            ? `$${energyComfort.annualEnergyCost} CAD`
            : "",
        },
        { label: "Comfort issues", value: energyComfort.comfortIssues },
        { label: "Secondary heating", value: energyComfort.secondaryHeating },
      ],
    },
    {
      title: "Goals & Budget",
      step: 5,
      fields: [
        { label: "First priority", value: goalsBudget.firstPriority },
        { label: "Second priority", value: goalsBudget.secondPriority },
        { label: "Budget", value: goalsBudget.budget },
        { label: "Financing interest", value: goalsBudget.financing },
        { label: "Upgrade timeline", value: goalsBudget.timeline },
      ],
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      <p className="text-slate-600">
        Review your assessment before continuing.
        You can return to any section to change your answers.
      </p>

      {sections.map((section) => (
        <ReviewSection
          key={section.step}
          title={section.title}
          step={section.step}
          fields={section.fields}
          onEdit={onEdit}
        />
      ))}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <h4 className="font-semibold text-[#2e3249]">
          Prototype Assessment
        </h4>

        <p className="mt-2 text-sm text-slate-600">
          This is a demonstration of the homeowner questionnaire.
          No AI analysis, rebate eligibility checks, or
          energy calculations are performed yet.
          Your answers are currently held in browser memory
          and are not submitted to a server.
        </p>
      </div>
    </div>
  );
}
