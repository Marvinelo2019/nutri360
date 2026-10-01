import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  PdfLayoutError,
  buildMealPlanPdf,
  parseHexColor,
  selectMealPageSplit,
  wrapPdfText,
  type MealPlanPdfInput,
} from "./pdf-renderer";

const input: MealPlanPdfInput = {
  organization: {
    name: "Clínica Nutrición Integral",
    brandColor: "#2D6A4F",
    phone: "+50255555555",
  },
  patientName: "María López",
  plan: {
    name: "Plan de mantenimiento",
    startsOn: "2026-10-01",
    endsOn: "2026-10-15",
    targetEnergyKcal: 1800,
    targetProteinG: 100,
    targetCarbohydrateG: 220,
    targetFatG: 55,
    instructions: "Tomar agua y respetar los horarios indicados.",
  },
  meals: ["Desayuno", "Refacción", "Almuerzo", "Merienda", "Cena"].map(
    (name, index) => ({
      name,
      suggestedTime: `${String(7 + index * 3).padStart(2, "0")}:00:00`,
      items: [
        {
          foodName: "Avena con banano",
          quantity: 1,
          unit: "taza",
          guidance: "Preparar sin azúcar añadida.",
        },
      ],
    }),
  ),
};

describe("meal plan PDF renderer", () => {
  it("creates an exact two-page PDF with Spanish characters", async () => {
    const bytes = await buildMealPlanPdf(input);
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(2);
    expect(bytes.byteLength).toBeGreaterThan(2_000);
  });

  it("wraps long text inside a measured width", async () => {
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);
    const lines = wrapPdfText(
      "Una recomendación suficientemente larga para ocupar más de una línea",
      font,
      10,
      140,
    );
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => font.widthOfTextAtSize(line, 10) <= 140)).toBe(
      true,
    );
  });

  it("rejects content that cannot fit legibly", () => {
    expect(() => selectMealPageSplit([600, 600], 475, 500)).toThrow(
      PdfLayoutError,
    );
  });

  it("falls back to the Nutri360 green for invalid colors", () => {
    expect(parseHexColor("invalid")).toEqual(parseHexColor("#2D6A4F"));
  });
});
