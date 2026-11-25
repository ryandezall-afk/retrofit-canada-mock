"use client";

import { useState } from "react";
import { Check, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnswerValue, QuestionConfig, QuestionImage } from "@/types";

interface QuestionCardProps {
  question: QuestionConfig;
  value: AnswerValue | undefined;
  unitValue?: string;
  excludedValues?: string[];
  error?: string | null;
  onChange: (value: AnswerValue) => void;
  onUnitChange?: (unit: string) => void;
  onUnknown?: () => void;
  onEnterSubmit?: () => void;
  standalone?: boolean;
}

export default function QuestionCard({
  question,
  value,
  unitValue,
  excludedValues = [],
  error,
  onChange,
  onUnitChange,
  onUnknown,
  onEnterSubmit,
  standalone = false,
}: QuestionCardProps) {
  const [enlargedImage, setEnlargedImage] = useState<QuestionImage | null>(
    null
  );

  const examples = question.examples ?? [];
  const hasExamples = examples.length > 0;
  const stringValue = typeof value === "string" ? value : "";
  const arrayValue = Array.isArray(value) ? value : [];

  const handleMultiToggle = (optValue: string, exclusive?: boolean) => {
    if (arrayValue.includes(optValue)) {
      onChange(arrayValue.filter((item) => item !== optValue));
      return;
    }

    if (exclusive) {
      onChange([optValue]);
      return;
    }

    const exclusiveValues = new Set(
      (question.options ?? [])
        .filter((opt) => opt.exclusive)
        .map((opt) => opt.value)
    );

    onChange([
      ...arrayValue.filter((item) => !exclusiveValues.has(item)),
      optValue,
    ]);
  };

  return (
    <div
      className={cn(
        standalone &&
          "mx-auto w-full max-w-[440px] rounded-2xl border border-rc-light bg-white p-5 shadow-md sm:p-6"
      )}
    >
      {/* Question prompt & helper text */}
      <div>
        <h3 className="font-saira text-xl font-semibold leading-snug text-rc-navy sm:text-2xl">
          {question.prompt}
        </h3>

        {question.description && (
          <p className="mt-2 font-roboto text-sm leading-relaxed text-slate-600">
            {question.description}
          </p>
        )}
      </div>

      {/* Optional Reference / Example Pictures (stacked vertically for mobile) */}
      {hasExamples && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {examples.length === 1 ? "Example reference" : "Example references"}
          </p>

          <div
            className={cn(
              "grid gap-2.5",
              examples.length === 1
                ? "grid-cols-1"
                : examples.length === 3
                ? "grid-cols-3"
                : "grid-cols-2"
            )}
          >
            {examples.map((img, index) => (
              <button
                key={`${img.src}-${index}`}
                type="button"
                onClick={() => setEnlargedImage(img)}
                className="group overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition hover:border-rc-navy active:scale-[0.99]"
              >
                <div
                  className={cn(
                    "relative w-full overflow-hidden bg-slate-100",
                    examples.length === 1 ? "aspect-[16/10]" : "aspect-[4/3]"
                  )}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                  <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 p-1 text-white">
                    <Expand className="h-3 w-3" />
                  </span>
                </div>

                {img.caption && (
                  <p className="px-2 py-1.5 text-xs font-medium text-slate-700">
                    {img.caption}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Answer Controls (single-column thumb-friendly layout) */}
      <div className="mt-5">
        {question.type === "single_choice" && (
          <div
            className="space-y-2.5"
            role="radiogroup"
            aria-label={question.prompt}
          >
            {(question.options ?? []).map((option) => {
              const isExcluded = excludedValues.includes(option.value);
              const isSelected = stringValue === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isExcluded}
                  aria-pressed={isSelected}
                  onClick={() => onChange(option.value)}
                  className={cn(
                    "flex min-h-[50px] w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition active:scale-[0.99]",
                    isSelected
                      ? "border-rc-red bg-red-50/60 text-rc-navy ring-1 ring-rc-red"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                    isExcluded && "cursor-not-allowed opacity-40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                      isSelected
                        ? "border-rc-red bg-rc-red text-white"
                        : "border-slate-300 bg-white"
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </span>

                  {option.image && (
                    <img
                      src={option.image.src}
                      alt={option.image.alt}
                      className="h-11 w-14 shrink-0 rounded-md border border-slate-200 object-cover"
                    />
                  )}

                  <span className="font-roboto text-sm font-medium leading-snug">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {question.type === "multi_choice" && (
          <div
            className="space-y-2.5"
            role="group"
            aria-label={question.prompt}
          >
            {(question.options ?? []).map((option) => {
              const isSelected = arrayValue.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={() =>
                    handleMultiToggle(option.value, option.exclusive)
                  }
                  className={cn(
                    "flex min-h-[50px] w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition active:scale-[0.99]",
                    isSelected
                      ? "border-rc-red bg-red-50/60 text-rc-navy ring-1 ring-rc-red"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition",
                      isSelected
                        ? "border-rc-red bg-rc-red text-white"
                        : "border-slate-300 bg-white"
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </span>

                  {option.image && (
                    <img
                      src={option.image.src}
                      alt={option.image.alt}
                      className="h-11 w-14 shrink-0 rounded-md border border-slate-200 object-cover"
                    />
                  )}

                  <span className="font-roboto text-sm font-medium leading-snug">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {(question.type === "text" || question.type === "number") && (
          <div>
            <label htmlFor={question.id} className="sr-only">
              {question.prompt}
            </label>

            <div className="flex items-stretch gap-2.5">
              <div className="relative flex min-w-0 flex-1 items-center">
                {question.prefix && (
                  <span className="pointer-events-none absolute left-3.5 font-medium text-slate-500">
                    {question.prefix}
                  </span>
                )}

                <input
                  id={question.id}
                  type={question.type}
                  value={stringValue}
                  min={question.min}
                  max={question.max}
                  step={question.step}
                  maxLength={question.maxLength}
                  placeholder={question.placeholder}
                  onChange={(event) => {
                    const raw = event.target.value;
                    onChange(question.uppercase ? raw.toUpperCase() : raw);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && onEnterSubmit) {
                      event.preventDefault();
                      onEnterSubmit();
                    }
                  }}
                  className={cn(
                    "w-full rounded-xl border bg-white py-3.5 text-base text-slate-800 transition focus:outline-none focus:ring-1",
                    error
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-rc-red focus:ring-rc-red",
                    question.prefix ? "pl-8" : "pl-4",
                    question.suffix ? "pr-20" : "pr-4"
                  )}
                />

                {question.suffix && (
                  <span className="pointer-events-none absolute right-3.5 text-xs font-medium text-slate-500">
                    {question.suffix}
                  </span>
                )}
              </div>

              {question.unitOptions && question.unitOptions.length > 0 && (
                <select
                  aria-label={`${question.reviewLabel} unit`}
                  value={unitValue ?? question.defaultUnit ?? ""}
                  onChange={(event) => onUnitChange?.(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-3.5 text-sm font-medium text-slate-800 focus:border-rc-red focus:outline-none"
                >
                  {question.unitOptions.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {question.allowUnknown && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onUnknown?.();
            }}
            className="mt-4 inline-block text-sm font-medium text-slate-500 underline hover:text-rc-red"
          >
            {question.unknownLabel ?? "I don't know"}
          </button>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        )}
      </div>

      {/* Lightbox for enlarged example image */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={enlargedImage.alt}
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-lg overflow-hidden rounded-2xl bg-white p-3 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEnlargedImage(null)}
              aria-label="Close image preview"
              className="absolute right-3 top-3 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>

            <img
              src={enlargedImage.src}
              alt={enlargedImage.alt}
              className="max-h-[75vh] w-full rounded-xl object-contain"
            />

            {enlargedImage.caption && (
              <p className="mt-2 px-1 text-sm font-medium text-rc-navy">
                {enlargedImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
