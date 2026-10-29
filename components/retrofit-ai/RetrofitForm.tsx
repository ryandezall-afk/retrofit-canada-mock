
"use client";

import { useState } from "react";

import SuitabilityCheck, {
  type SuitabilityAnswers,
} from "./SuitabilityCheck";

import PropertyInformation, {
  type PropertyAnswers,
} from "./PropertyInformation";

import BuildingEnvelope, {
  type EnvelopeAnswers,
} from "./BuildingEnvelope";

import HeatingCooling, {
  type HeatingCoolingAnswers,
} from "./HeatingCooling";

import EnergyComfort, {
  type EnergyComfortAnswers,
} from "./EnergyComfort";

import GoalsBudget, {
  type GoalsBudgetAnswers,
} from "./GoalsBudget";

import AssessmentReview from "./AssessmentReview";

const steps = [
  "Retrofit Suitability Check",
  "Property Information",
  "Insulation & Building Envelope",
  "Heating & Cooling",
  "Energy & Comfort",
  "Goals & Budget",
  "Review Your Answers",
];

export default function RetrofitForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const [suitabilityAnswers, setSuitabilityAnswers] =
    useState<SuitabilityAnswers>({
      stayingDuration: "",
      relocationRisk: "",
      sellingPlans: "",
      homeCondition: "",
      plannedRepairs: [],
      motivation: "",
    });

  const [propertyAnswers, setPropertyAnswers] =
    useState<PropertyAnswers>({
      postalCode: "",
      ownership: "",
      homeType: "",
      yearBuilt: "",
      exactYear: "",
      floorArea: "",
      floorAreaUnit: "sqft",
      storeys: "",
    });

  const [envelopeAnswers, setEnvelopeAnswers] =
    useState<EnvelopeAnswers>({
      foundationType: "",
      basementInsulation: "",
      atticInsulation: "",
      wallStructure: "",
      windowType: "",
      drafts: "",
    });

  const [heatingCoolingAnswers, setHeatingCoolingAnswers] =
    useState<HeatingCoolingAnswers>({
      heatingFuel: "",
      heatingEquipment: "",
      heatingAge: "",
      coolingSystem: "",
      waterHeating: "",
      electricalPanel: "",
    });

  const [energyComfortAnswers, setEnergyComfortAnswers] =
    useState<EnergyComfortAnswers>({
      electricityBill: "",
      winterGasBill: "",
      annualEnergyCost: "",
      comfortIssues: [],
      secondaryHeating: "",
    });

  const [goalsBudgetAnswers, setGoalsBudgetAnswers] =
    useState<GoalsBudgetAnswers>({
      firstPriority: "",
      secondPriority: "",
      budget: "",
      financing: "",
      timeline: "",
    });

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((previous) => previous + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((previous) => previous - 1);
    }
  };

  const editStep = (step: number) => {
    setCurrentStep(step);
  };

  const completeAssessment = () => {
    // Prototype only. No backend or AI request is made.
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
          ✓
        </div>

        <h2 className="mt-6 font-saira text-3xl font-bold text-[#2e3249]">
          Assessment Complete!
        </h2>

        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-600">
          You've completed the Retrofit Canada homeowner
          assessment prototype.
        </p>

        <div className="mx-auto mt-8 max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-6 text-left">
          <h3 className="font-semibold text-[#2e3249]">
            What happens in the completed application?
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The AI Retrofit Advisor will analyze your home's
            characteristics, your future plans, and your
            renovation priorities to identify potentially
            suitable upgrades.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Recommendations will eventually include estimated
            costs, energy savings, payback periods, and
            applicable funding opportunities where available.
          </p>

          <p className="mt-3 text-sm font-medium text-slate-600">
            Prototype only — no assessment has been submitted
            or analyzed by AI.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsComplete(false);
            setCurrentStep(6);
          }}
          className="mt-8 rounded-lg bg-[#2e3249] px-6 py-3 font-semibold text-white transition hover:bg-[#404660]"
        >
          Review My Answers
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-saira text-xl font-bold text-[#2e3249]">
          Home Energy Assessment
        </h2>

        <span className="text-sm font-medium text-slate-500">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-red-600 transition-all duration-300"
          style={{
            width: `${((currentStep + 1) / steps.length) * 100}%`,
          }}
        />
      </div>

      {/* Current step */}
      <div className="mt-10 min-h-[250px]">
        <h3 className="font-saira text-2xl font-semibold text-[#2e3249]">
          {steps[currentStep]}
        </h3>

        {currentStep === 0 ? (
          <SuitabilityCheck
            answers={suitabilityAnswers}
            onChange={setSuitabilityAnswers}
          />
        ) : currentStep === 1 ? (
          <PropertyInformation
            answers={propertyAnswers}
            onChange={setPropertyAnswers}
          />
        ) : currentStep === 2 ? (
          <BuildingEnvelope
            answers={envelopeAnswers}
            onChange={setEnvelopeAnswers}
          />
        ) : currentStep === 3 ? (
          <HeatingCooling
            answers={heatingCoolingAnswers}
            onChange={setHeatingCoolingAnswers}
          />
        ) : currentStep === 4 ? (
          <EnergyComfort
            answers={energyComfortAnswers}
            onChange={setEnergyComfortAnswers}
          />
        ) : currentStep === 5 ? (
          <GoalsBudget
            answers={goalsBudgetAnswers}
            onChange={setGoalsBudgetAnswers}
          />
        ) : (
          <AssessmentReview
            suitability={suitabilityAnswers}
            property={propertyAnswers}
            envelope={envelopeAnswers}
            heatingCooling={heatingCoolingAnswers}
            energyComfort={energyComfortAnswers}
            goalsBudget={goalsBudgetAnswers}
            onEdit={editStep}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={previousStep}
          disabled={currentStep === 0}
          className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-[#2e3249] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        {currentStep === steps.length - 1 ? (
          <button
            type="button"
            onClick={completeAssessment}
            className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Complete Assessment
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            className="rounded-lg bg-[#2e3249] px-6 py-3 font-semibold text-white transition hover:bg-[#404660]"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
