import { getMonthlyReport } from "@/features/reports/data";
import { reportMonthSchema } from "@/features/reports/schemas";
import { createMonthlyReportWorkbook } from "@/features/reports/workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const parsedMonth = reportMonthSchema.safeParse(
    new URL(request.url).searchParams.get("month"),
  );
  if (!parsedMonth.success) {
    return Response.json(
      { error: "Selecciona un mes válido." },
      { status: 400 },
    );
  }

  const report = await getMonthlyReport(parsedMonth.data);
  const workbook = createMonthlyReportWorkbook(report);
  const body = workbook.buffer.slice(
    workbook.byteOffset,
    workbook.byteOffset + workbook.byteLength,
  ) as ArrayBuffer;
  const filename = `reporte-${report.organization.slug}-${report.month}.xlsx`;

  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
