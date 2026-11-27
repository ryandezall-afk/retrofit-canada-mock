// TEST ONLY. Fictional case studies in the exact shape Retrofit Canada's API returns
// (GET /api/v1/caseStudies/lookup/{slug}), plus a fake API server for them.
// No real Retrofit Canada data is stored in the repo.

const PORTAL = "https://portal.retrofitcanada.com";
const img = (caseId, id, title) => ({
  id,
  title,
  image_path: `${PORTAL}/storage/caseStudy/${caseId}/images/test-${id}.jpg`,
  file_name: `photo-${id}.jpg`,
});

export function fictionalCaseStudies() {
  const team = {};
  for (let i = 1; i <= 9; i++) {
    team[`projectTeamName${i}`] = `Example Team Member ${i}`;
    team[`projectTeamRole${i}`] = i === 1 ? "Builder" : "";
    team[`projectTeamURL${i}`] = i === 1 ? "https://example.com" : "";
  }

  return [
    {
      id: 101,
      featured_image: img(101, 9001, "Front after"),
      urlSlug: "test-bungalow",
      isFeatured: 1,
      publish_date: "2025-02-18",
      created_at: "2025-02-12",
      caseStudyName: "Test bungalow goes net-zero",
      introDescription: "A fictional retrofit by [Example Builders](https://example.com), under budget.",
      locationCity: "Edmonton",
      locationProvince: "AB",
      locationCountry: "Canada",
      houseType: "Single-Family Bi-Level",
      yearBuilt: 1971,
      foundationType: "Concrete (Full Basement)",
      structureType: "Wood-Framed",
      totalFloorArea: 193.7,
      climateZone: "7a",
      climateHDD: 5120,
      retrofitStatus: "Complete",
      yearRetrofitComplete: 2023,
      retrofitType: "Envelope and Mechanical",
      retrofitPhasing: "No",
      homeGeometryChange: "No",
      performanceLevel: "Net Zero",
      ...team,
      projectPriority1: "Increase Thermal Comfort,Other",
      goalsDescribe: "We set three goals.\n\n- Cut energy use in half\n- Keep the house livable",
      envelopeImprovements: "Attic / Roof Internal Insulation,Foundation Walls Exterior Insulation",
      electricalImprovements: "Electrical Service Upgrade,Full Electrification",
      energyUpgrade1: "Enhanced insulation",
      whyRetrofitDescription:
        "Intro paragraph with a [link](https://example.com).\n\n### Envelope\r\nWalls got **8 inches** of cellulose.\n\n---\n\n* Attic topped up\n* New windows",
      lessonsLearnedDescription: "## Lessons Learned\n\nStart with an energy audit.",
      preBuildingCondition: "Original – Aesthetic Upgrades Only",
      postBuildingCondition: "Major Performance Upgrade",
      preCeilingIns: 'Original (7" fiberglass)',
      postCeilingIns: "",
      preAtticRvalue: 20.9,
      postAtticRvalue: 49.2,
      preACH: 4.08,
      postACH: "",
      preAmp: "100",
      postAmp: "200",
      preTotalAnnualConsumptionCalculated: 225.27,
      postTotalAnnualConsumptionCalculated: 56.47,
      preAnnualElectricityConsumptionCalculation: 7899,
      postAnnualElectricityConsumptionCalculation: 15687,
      preSpaceCoolingCalculated: 0,
      postSpaceCoolingCalculated: 2.82,
      preElecCarbon: 3459.756,
      postElecCarbon: -116.07,
      annualEnergySavings: 100.42,
      opCarbonSavings: 12.2,
      prePhotoData: [img(101, 9002, "Before - Front")],
      midPhotoData: [],
      postPhotoData: [img(101, 9003, "After - Front"), img(101, 9004, "After - Back")],
      drawingImageData: [img(101, 9005, "Wall section")],
      energyEvalBefore: [{ id: 508, title: "Pre Retrofit Energy Eval", image_path: `${PORTAL}/x.pdf`, file_name: "Pre Retrofit Audit.pdf" }],
      techDocument: [],
    },
    {
      id: 102,
      featured_image: img(102, 9101, "Front"),
      urlSlug: "Mixed-Case-Slug",
      isFeatured: 0,
      publish_date: "2024-05-08",
      created_at: "2024-05-01",
      caseStudyName: "Community centre feasibility study",
      introDescription: "A fictional feasibility study.",
      locationCity: "Halifax",
      locationProvince: "NS",
      houseType: "Part 3",
      yearBuilt: 1987,
      structureType: "Concrete Block",
      climateZone: "6",
      retrofitType: "Envelope",
      retrofitPhasing: "Yes",
      performanceLevel: "Net-Zero Ready",
      projectTeamName1: "Example Engineering",
      projectTeamRole1: "Mechanical Engineer",
      whyRetrofitDescription: "# Existing Building Details\r\n**Overview**\r\n\r\nA one-storey building.",
    },
    {
      id: 103,
      featured_image: null,
      urlSlug: "third-home",
      isFeatured: 0,
      publish_date: "2026-01-05",
      created_at: "2026-01-01",
      caseStudyName: "Another fictional home",
      introDescription: "Third test home.",
      locationCity: "Calgary",
      locationProvince: "AB",
      houseType: "Row/Townhouse",
      yearBuilt: "",
      climateZone: "7a",
      retrofitType: "Mechanical",
      retrofitPhasing: "No",
      performanceLevel: "",
    },
  ];
}

/**
 * A stand-in for https://portal.retrofitcanada.com/api/v1. `state.records` is what it serves;
 * `state.failSlug` makes that case study return HTTP 500; `state.calls` counts requests.
 */
export function createFakeRetrofitCanadaApi(state) {
  const base = "https://portal.retrofitcanada.com/api/v1";
  return async function fakeApi(url) {
    state.calls = (state.calls ?? 0) + 1;
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (url === `${base}/caseStudies`) {
      const list = state.records.map(({ id, urlSlug, caseStudyName, featured_image, publish_date, created_at, isFeatured }) => ({
        id, urlSlug, caseStudyName, featured_image, publish_date, created_at, isFeatured,
      }));
      return json(200, { data: { caseStudies: list } });
    }
    const match = url.match(/\/caseStudies\/lookup\/([^/?]+)$/);
    if (match) {
      const slug = decodeURIComponent(match[1]);
      if (slug === state.failSlug) return json(500, { error: "Server Error", message: "boom" });
      const record = state.records.find((r) => r.urlSlug === slug);
      return record ? json(200, { data: { caseStudy: record } }) : json(404, { error: "Not Found", message: "No case study" });
    }
    return json(404, { error: "Not Found", message: url });
  };
}
