import { strFromU8, unzipSync } from "fflate";
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { AwaitedMonthlyReport } from "./workbook-types";
import { createMonthlyReportWorkbook } from "./workbook";

function fixture(): AwaitedMonthlyReport {
  return {
    month: "2026-10",
    organization: {
      id: "organization-id",
      name: "Clínica Nutri360",
      slug: "clinica-nutri360",
      brand_color: "#376B4B",
      timezone: "America/Guatemala",
      currency: "GTQ",
    },
    summary: {
      appointmentCount: 2,
      completedCount: 1,
      noShowCount: 1,
      cancelledCount: 0,
      noShowRate: 0.5,
      paidCentavos: 85_000,
      pendingCentavos: 20_000,
      packageSalesCount: 1,
      sessionsSold: 4,
      sessionsConsumed: 1,
    },
    appointments: [
      {
        id: "appointment-id",
        organization_id: "organization-id",
        patient_id: "patient-id",
        professional_user_id: "professional-id",
        starts_at: "2026-10-06T15:00:00.000Z",
        ends_at: "2026-10-06T16:00:00.000Z",
        modality: "in_person",
        status: "completed",
        booking_source: "staff",
        created_by: "professional-id",
        privacy_consent_accepted_at: null,
        privacy_consent_version: null,
        created_at: "2026-10-01T00:00:00.000Z",
        updated_at: "2026-10-01T00:00:00.000Z",
        patientName: '=HYPERLINK("https://invalid.test","Paciente")',
        professionalName: "Lic. Ana",
      },
      {
        id: "no-show-appointment-id",
        organization_id: "organization-id",
        patient_id: "patient-2-id",
        professional_user_id: "professional-id",
        starts_at: "2026-10-07T15:00:00.000Z",
        ends_at: "2026-10-07T16:00:00.000Z",
        modality: "video",
        status: "no_show",
        booking_source: "staff",
        created_by: "professional-id",
        privacy_consent_accepted_at: null,
        privacy_consent_version: null,
        created_at: "2026-10-01T00:00:00.000Z",
        updated_at: "2026-10-01T00:00:00.000Z",
        patientName: "Paciente Dos",
        professionalName: "Lic. Ana",
      },
    ],
    payments: [],
    packages: [],
  } as AwaitedMonthlyReport;
}

function workbookFiles() {
  return unzipSync(createMonthlyReportWorkbook(fixture()));
}

describe("createMonthlyReportWorkbook", () => {
  it("creates an Excel ZIP with the four expected worksheets", () => {
    const bytes = createMonthlyReportWorkbook(fixture());
    const files = unzipSync(bytes);
    const workbook = strFromU8(files["xl/workbook.xml"]);

    if (process.env.REPORT_WORKBOOK_OUTPUT) {
      writeFileSync(process.env.REPORT_WORKBOOK_OUTPUT, bytes);
    }

    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
    expect(workbook).toContain('name="Resumen"');
    expect(workbook).toContain('name="Citas"');
    expect(workbook).toContain('name="Pagos"');
    expect(workbook).toContain('name="Paquetes"');
  });

  it("keeps summary values auditable with formulas", () => {
    const summary = strFromU8(workbookFiles()["xl/worksheets/sheet1.xml"]);

    expect(summary).toContain("COUNTA(Citas!A5:A6)");
    expect(summary).toContain("COUNTIF(Citas!E5:E6,&quot;Atendida&quot;)");
    expect(summary).toContain("B8/(B7+B8)");
    expect(summary).toContain("SUMIF(Pagos!E5:E5");
  });

  it("writes user-controlled text as inline strings and excludes sensitive columns", () => {
    const files = workbookFiles();
    const appointments = strFromU8(files["xl/worksheets/sheet2.xml"]);
    const allSheets = [1, 2, 3, 4]
      .map((id) => strFromU8(files[`xl/worksheets/sheet${id}.xml`]))
      .join("\n")
      .toLowerCase();

    expect(appointments).toContain(
      "=HYPERLINK(&quot;https://invalid.test&quot;,&quot;Paciente&quot;)",
    );
    expect(appointments).not.toContain(
      '<f>HYPERLINK("https://invalid.test","Paciente")</f>',
    );
    expect(allSheets).not.toContain("teléfono");
    expect(allSheets).not.toContain("correo");
    expect(allSheets).not.toContain("diagnóstico");
  });
});
