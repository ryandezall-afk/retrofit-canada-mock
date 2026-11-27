import { NextRequest, NextResponse } from "next/server";
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

  const assessment = await generateRetrofitAssessment({
    input: validation.data,
    matchedCaseStudies: matches,
    cacheMeta,
    forceMock: Boolean(payload.useMock),
  });

  return NextResponse.json(assessment, { status: 200 });
}
