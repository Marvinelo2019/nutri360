import {
  PDFDocument,
  StandardFonts,
  cmyk,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = 29;

export class PdfLayoutError extends Error {}

export type MealPlanPdfInput = {
  organization: {
    name: string;
    brandColor: string;
    phone: string | null;
    logoBytes?: Uint8Array;
    logoMime?: "image/png" | "image/jpeg";
  };
  patientName: string;
  plan: {
    name: string;
    startsOn: string | null;
    endsOn: string | null;
    targetEnergyKcal: number | null;
    targetProteinG: number | null;
    targetCarbohydrateG: number | null;
    targetFatG: number | null;
    instructions: string | null;
  };
  meals: Array<{
    name: string;
    suggestedTime: string | null;
    items: Array<{
      foodName: string;
      quantity: number;
      unit: string;
      guidance: string | null;
    }>;
  }>;
};

export function parseHexColor(hex: string): RGB {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return parseHexColor("#2D6A4F");
  return rgb(
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255,
  );
}

function safeText(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, "");
}

export function wrapPdfText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const paragraphs = safeText(text).split(/\r?\n/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
        continue;
      }
      let fragment = "";
      for (const character of word) {
        if (font.widthOfTextAtSize(fragment + character, size) > maxWidth) {
          lines.push(fragment);
          fragment = character;
        } else fragment += character;
      }
      line = fragment;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("es-GT", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function measureMeal(
  meal: MealPlanPdfInput["meals"][number],
  regular: PDFFont,
  bold: PDFFont,
) {
  let height = 31;
  if (!meal.items.length) return height + 21;
  for (const item of meal.items) {
    const primary = `${formatQuantity(item.quantity)} ${item.unit} - ${item.foodName}`;
    height += wrapPdfText(primary, bold, 9.4, CONTENT_WIDTH - 28).length * 12;
    if (item.guidance)
      height +=
        wrapPdfText(item.guidance, regular, 8.2, CONTENT_WIDTH - 28).length *
        10;
    height += 8;
  }
  return height + 3;
}

function measureInstructions(text: string | null, regular: PDFFont) {
  if (!text) return 62;
  return 42 + wrapPdfText(text, regular, 9, CONTENT_WIDTH - 28).length * 12;
}

export function selectMealPageSplit(
  mealHeights: number[],
  pageOneCapacity: number,
  pageTwoCapacity: number,
) {
  if (!mealHeights.length)
    throw new PdfLayoutError("El plan no contiene tiempos de comida.");
  const splits =
    mealHeights.length === 1
      ? [1]
      : mealHeights.slice(0, -1).map((_, index) => index + 1);
  const candidates = splits
    .map((split) => ({
      split,
      first: mealHeights.slice(0, split).reduce((sum, value) => sum + value, 0),
      second: mealHeights.slice(split).reduce((sum, value) => sum + value, 0),
    }))
    .filter(
      ({ first, second }) =>
        first <= pageOneCapacity && second <= pageTwoCapacity,
    )
    .sort(
      (left, right) =>
        Math.abs(left.first / pageOneCapacity - left.second / pageTwoCapacity) -
        Math.abs(
          right.first / pageOneCapacity - right.second / pageTwoCapacity,
        ),
    );
  if (!candidates[0])
    throw new PdfLayoutError(
      "El contenido no cabe de forma legible en dos páginas. Reduce indicaciones o alimentos antes de generar el PDF.",
    );
  return candidates[0].split;
}

function drawHeader(
  page: PDFPage,
  input: MealPlanPdfInput,
  bold: PDFFont,
  regular: PDFFont,
  brand: RGB,
  logo: PDFImage | null,
  continuation = false,
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 12,
    width: PAGE_WIDTH,
    height: 12,
    color: brand,
  });
  let textX = MARGIN;
  if (logo) {
    const scale = Math.min(50 / logo.width, 40 / logo.height);
    page.drawImage(logo, {
      x: MARGIN,
      y: PAGE_HEIGHT - 76,
      width: logo.width * scale,
      height: logo.height * scale,
    });
    textX += 64;
  }
  page.drawText(safeText(input.organization.name), {
    x: textX,
    y: PAGE_HEIGHT - 48,
    size: 14,
    font: bold,
    color: brand,
  });
  if (input.organization.phone)
    page.drawText(safeText(input.organization.phone), {
      x: textX,
      y: PAGE_HEIGHT - 64,
      size: 8.5,
      font: regular,
      color: cmyk(0, 0, 0, 0.55),
    });
  if (continuation)
    page.drawText("PLAN ALIMENTICIO - CONTINUACIÓN", {
      x: PAGE_WIDTH - MARGIN - 186,
      y: PAGE_HEIGHT - 50,
      size: 8,
      font: bold,
      color: cmyk(0, 0, 0, 0.48),
    });
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 88 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 88 },
    thickness: 0.8,
    color: cmyk(0, 0, 0, 0.12),
  });
}

function drawFooter(page: PDFPage, regular: PDFFont, pageNumber: number) {
  page.drawLine({
    start: { x: MARGIN, y: FOOTER_Y + 14 },
    end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_Y + 14 },
    thickness: 0.6,
    color: cmyk(0, 0, 0, 0.12),
  });
  page.drawText("Documento clínico privado", {
    x: MARGIN,
    y: FOOTER_Y,
    size: 7.5,
    font: regular,
    color: cmyk(0, 0, 0, 0.5),
  });
  page.drawText(`${pageNumber} / 2`, {
    x: PAGE_WIDTH - MARGIN - 20,
    y: FOOTER_Y,
    size: 7.5,
    font: regular,
    color: cmyk(0, 0, 0, 0.5),
  });
}

function drawMeal(
  page: PDFPage,
  meal: MealPlanPdfInput["meals"][number],
  y: number,
  regular: PDFFont,
  bold: PDFFont,
  brand: RGB,
) {
  page.drawRectangle({
    x: MARGIN,
    y: y - 22,
    width: CONTENT_WIDTH,
    height: 24,
    color: rgb(0.955, 0.97, 0.962),
  });
  page.drawText(safeText(meal.name), {
    x: MARGIN + 12,
    y: y - 14,
    size: 10,
    font: bold,
    color: brand,
  });
  if (meal.suggestedTime)
    page.drawText(meal.suggestedTime.slice(0, 5), {
      x: PAGE_WIDTH - MARGIN - 42,
      y: y - 14,
      size: 8.5,
      font: bold,
      color: brand,
    });
  let cursor = y - 36;
  if (!meal.items.length) {
    page.drawText("Sin alimentos indicados.", {
      x: MARGIN + 14,
      y: cursor,
      size: 8.5,
      font: regular,
      color: cmyk(0, 0, 0, 0.5),
    });
    return y - measureMeal(meal, regular, bold);
  }
  for (const item of meal.items) {
    const primary = `${formatQuantity(item.quantity)} ${item.unit} - ${item.foodName}`;
    for (const line of wrapPdfText(primary, bold, 9.4, CONTENT_WIDTH - 28)) {
      page.drawText(line, {
        x: MARGIN + 14,
        y: cursor,
        size: 9.4,
        font: bold,
        color: cmyk(0, 0, 0, 0.82),
      });
      cursor -= 12;
    }
    if (item.guidance) {
      for (const line of wrapPdfText(
        item.guidance,
        regular,
        8.2,
        CONTENT_WIDTH - 28,
      )) {
        page.drawText(line, {
          x: MARGIN + 14,
          y: cursor,
          size: 8.2,
          font: regular,
          color: cmyk(0, 0, 0, 0.55),
        });
        cursor -= 10;
      }
    }
    cursor -= 8;
  }
  return y - measureMeal(meal, regular, bold);
}

async function embedLogo(document: PDFDocument, input: MealPlanPdfInput) {
  if (!input.organization.logoBytes || !input.organization.logoMime)
    return null;
  try {
    return input.organization.logoMime === "image/png"
      ? await document.embedPng(input.organization.logoBytes)
      : await document.embedJpg(input.organization.logoBytes);
  } catch {
    return null;
  }
}

export async function buildMealPlanPdf(input: MealPlanPdfInput) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const brand = parseHexColor(input.organization.brandColor);
  const logo = await embedLogo(document, input);
  const pageOne = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const pageTwo = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const instructionHeight = measureInstructions(
    input.plan.instructions,
    regular,
  );
  const mealHeights = input.meals.map((meal) =>
    measureMeal(meal, regular, bold),
  );
  const split = selectMealPageSplit(mealHeights, 475, 650 - instructionHeight);

  document.setTitle(safeText(input.plan.name));
  document.setAuthor(safeText(input.organization.name));
  document.setCreator("Nutri360");
  document.setProducer("Nutri360");

  drawHeader(pageOne, input, bold, regular, brand, logo);
  drawHeader(pageTwo, input, bold, regular, brand, logo, true);
  drawFooter(pageOne, regular, 1);
  drawFooter(pageTwo, regular, 2);

  pageOne.drawText("PLAN ALIMENTICIO", {
    x: MARGIN,
    y: 718,
    size: 8.5,
    font: bold,
    color: brand,
  });
  pageOne.drawText(safeText(input.patientName), {
    x: MARGIN,
    y: 688,
    size: 21,
    font: bold,
    color: cmyk(0, 0, 0, 0.88),
  });
  pageOne.drawText(safeText(input.plan.name), {
    x: MARGIN,
    y: 668,
    size: 10,
    font: regular,
    color: cmyk(0, 0, 0, 0.55),
  });
  pageOne.drawText(
    `Vigencia: ${formatDate(input.plan.startsOn)} a ${formatDate(input.plan.endsOn)}`,
    { x: MARGIN, y: 649, size: 8.5, font: regular, color: cmyk(0, 0, 0, 0.52) },
  );

  const metrics = [
    ["Energía", input.plan.targetEnergyKcal, "kcal"],
    ["Proteína", input.plan.targetProteinG, "g"],
    ["Carbohidratos", input.plan.targetCarbohydrateG, "g"],
    ["Grasas", input.plan.targetFatG, "g"],
  ] as const;
  const cardWidth = (CONTENT_WIDTH - 18) / 4;
  metrics.forEach(([label, value, unit], index) => {
    const x = MARGIN + index * (cardWidth + 6);
    pageOne.drawRectangle({
      x,
      y: 588,
      width: cardWidth,
      height: 48,
      color: rgb(0.97, 0.975, 0.972),
    });
    pageOne.drawText(label, {
      x: x + 9,
      y: 619,
      size: 7.2,
      font: regular,
      color: cmyk(0, 0, 0, 0.5),
    });
    pageOne.drawText(value === null ? "-" : `${value} ${unit}`, {
      x: x + 9,
      y: 599,
      size: 10.5,
      font: bold,
      color: cmyk(0, 0, 0, 0.82),
    });
  });

  let cursor = 569;
  for (const meal of input.meals.slice(0, split))
    cursor = drawMeal(pageOne, meal, cursor, regular, bold, brand);

  cursor = 725;
  for (const meal of input.meals.slice(split))
    cursor = drawMeal(pageTwo, meal, cursor, regular, bold, brand);

  cursor -= 4;
  pageTwo.drawRectangle({
    x: MARGIN,
    y: cursor - instructionHeight + 8,
    width: CONTENT_WIDTH,
    height: instructionHeight,
    borderColor: rgb(0.82, 0.86, 0.83),
    borderWidth: 0.8,
  });
  pageTwo.drawText("INDICACIONES GENERALES", {
    x: MARGIN + 14,
    y: cursor - 16,
    size: 8.5,
    font: bold,
    color: brand,
  });
  let instructionY = cursor - 35;
  const instructionLines = input.plan.instructions
    ? wrapPdfText(input.plan.instructions, regular, 9, CONTENT_WIDTH - 28)
    : ["Sin indicaciones generales adicionales."];
  for (const line of instructionLines) {
    pageTwo.drawText(line, {
      x: MARGIN + 14,
      y: instructionY,
      size: 9,
      font: regular,
      color: cmyk(0, 0, 0, 0.72),
    });
    instructionY -= 12;
  }

  return document.save();
}
