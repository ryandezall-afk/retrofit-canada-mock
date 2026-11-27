import { NextRequest, NextResponse } from "next/server";

// Gemini can take a while to write a full plan; allow up to 60s on Vercel.
export const maxDuration = 60;
import { getCaseStudyDetailsForPrompt } from "@/lib/server/case-study-context";
import { generateRetrofitAssessment } from "@/lib/server/gemini-advisor";
import { findMatchingCaseStudies } from "@/lib/server/retrofit-canada-api";
import { validateAssessmentSubmission } from "@/lib/validation/assessment";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const payload =
    body && typeof body === "object" && "answers" in body
      ? (body as { answers: unknown; useMock?: boolean })
      : { answers: body, useMock: false };

  const validation = validateAssessmentSubmission(payload.answers);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.message,
        fieldErrors: validation.errors,
      },
      { status: 400 }
    );
  }

  // Match against Retrofit Canada's case studies (read from Supabase, cached in memory for an hour)
  const { matches, cacheMeta } = await findMatchingCaseStudies(
    validation.data.answers,
    4
  );

  // Full before/after specs, upgrades and lessons for those matches, so Gemini can compare
  // the homeowner's answers against what similar homes actually did.
  const caseStudyDetails = await getCaseStudyDetailsForPrompt(
    matches.map((m) => m.slug).filter((slug): slug is string => Boolean(slug))
  );

  const assessment = await generateRetrofitAssessment({
    input: validation.data,
    matchedCaseStudies: matches,
    caseStudyDetails,
    cacheMeta,
    forceMock: Boolean(payload.useMock),
  });

  return NextResponse.json(assessment, { status: 200 });
}
