import { strToU8, zipSync } from "fflate";

import {
  appointmentModalityLabels,
  appointmentStatusLabels,
} from "../appointments/presentation";
import { patientPackageStateLabels } from "../packages/presentation";
import {
  paymentMethodLabels,
  paymentStatusLabels,
} from "../payments/presentation";

import type { AwaitedMonthlyReport } from "./workbook-types";

type Cell =
  | { type: "string"; value: string; style?: number }
  | { type: "number"; value: number; style?: number }
  | {
      type: "formula";
      formula: string;
      cached: number | string;
      style?: number;
    }
  | { type: "blank"; style?: number };

const text = (value: string, style = 3): Cell => ({
  type: "string",
  value,
  style,
});
const number = (value: number, style = 4): Cell => ({
  type: "number",
  value,
  style,
});
const formula = (value: string, cached: number | string, style = 4): Cell => ({
  type: "formula",
  formula: value,
  cached,
  style,
});

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function excelSerial(date: Date) {
  return date.getTime() / 86_400_000 + 25_569;
}

function dateOnlySerial(value: string) {
  return excelSerial(new Date(`${value}T00:00:00.000Z`));
}

function clinicDateTimeSerial(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, Number(part.value)]),
  );
  return excelSerial(
    new Date(
      Date.UTC(
        values.year,
        values.month - 1,
        values.day,
        values.hour,
        values.minute,
        values.second,
      ),
    ),
  );
}

function cellXml(cell: Cell, row: number, column: number) {
  const reference = `${columnName(column)}${row}`;
  const style = ` s="${cell.style ?? 0}"`;
  if (cell.type === "blank") return `<c r="${reference}"${style}/>`;
  if (cell.type === "string")
    return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`;
  if (cell.type === "formula") {
    const cached =
      typeof cell.cached === "number"
        ? String(cell.cached)
        : escapeXml(cell.cached);
    const cachedType = typeof cell.cached === "number" ? "" : ' t="str"';
    return `<c r="${reference}"${style}${cachedType}><f>${escapeXml(cell.formula)}</f><v>${cached}</v></c>`;
  }
  return `<c r="${reference}"${style}><v>${cell.value}</v></c>`;
}

function sheetXml({
  rows,
  widths,
  freezeRow,
  autoFilter,
}: {
  rows: Cell[][];
  widths: number[];
  freezeRow?: number;
  autoFilter?: string;
}) {
  const rowXml = rows
    .map(
      (cells, index) =>
        `<row r="${index + 1}"${index === 1 ? ' ht="22" customHeight="1"' : ""}>${cells
          .map((cell, column) => cellXml(cell, index + 1, column))
          .join("")}</row>`,
    )
    .join("");
  const columnXml = widths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
    )
    .join("");
  const pane = freezeRow
    ? `<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${freezeRow}" topLeftCell="A${freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}<cols>${columnXml}</cols><sheetData>${rowXml}</sheetData>${autoFilter ? `<autoFilter ref="${autoFilter}"/>` : ""}<pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
}

function header(values: string[]) {
  return values.map((value) => text(value, 2));
}

function detailRows(
  title: string,
  context: string,
  headers: string[],
  data: Cell[][],
) {
  return [
    headers.map((): Cell => ({ type: "blank" })),
    [text(title, 1)],
    [text(context, 8)],
    header(headers),
    ...data,
  ];
}

function safeBrandColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value.slice(1).toUpperCase()
    : "376B4B";
}

function workbookStyles(brandColor: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="4"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd h:mm AM/PM"/><numFmt numFmtId="166" formatCode="&quot;Q&quot;#,##0.00"/><numFmt numFmtId="167" formatCode="0.0%"/></numFmts>
  <fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><color rgb="FF1F2937"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Arial"/></font></fonts>
  <fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${brandColor}"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F1EB"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border/><border><bottom style="thin"><color rgb="FFD7DED9"/></bottom></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="9">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="167" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

export function createMonthlyReportWorkbook(report: AwaitedMonthlyReport) {
  const monthLabel = new Intl.DateTimeFormat("es-GT", {
    month: "long",
    year: "numeric",
    timeZone: report.organization.timezone,
  }).format(new Date(`${report.month}-01T12:00:00Z`));
  const context = `${report.organization.name} · ${monthLabel}`;
  const appointmentEnd = Math.max(5, report.appointments.length + 4);
  const paymentEnd = Math.max(5, report.payments.length + 4);
  const packageEnd = Math.max(5, report.packages.length + 4);

  const summaryRows: Cell[][] = [
    [text("")],
    [text("Reporte mensual de operaciones", 1)],
    [text(context, 8)],
    [text("")],
    header(["Indicador", "Resultado", "Definición"]),
    [
      text("Citas del mes"),
      formula(
        `COUNTA(Citas!A5:A${appointmentEnd})`,
        report.summary.appointmentCount,
      ),
      text("Todas las citas con inicio local en el mes"),
    ],
    [
      text("Citas completadas"),
      formula(
        `COUNTIF(Citas!E5:E${appointmentEnd},"Atendida")`,
        report.summary.completedCount,
      ),
      text("Estado atendida"),
    ],
    [
      text("Ausencias"),
      formula(
        `COUNTIF(Citas!E5:E${appointmentEnd},"No asistió")`,
        report.summary.noShowCount,
      ),
      text("Estado no asistió"),
    ],
    [
      text("Tasa de ausencias"),
      formula(
        'IF((B7+B8)=0,"",B8/(B7+B8))',
        report.summary.noShowRate ?? "",
        8,
      ),
      text("Ausencias / (completadas + ausencias)"),
    ],
    [
      text("Canceladas"),
      formula(
        `COUNTIF(Citas!E5:E${appointmentEnd},"Cancelada")`,
        report.summary.cancelledCount,
      ),
      text("No se incluyen en la tasa"),
    ],
    [
      text("Ingresos pagados"),
      formula(
        `SUMIF(Pagos!E5:E${paymentEnd},"Pagado",Pagos!F5:F${paymentEnd})`,
        report.summary.paidCentavos / 100,
        5,
      ),
      text("Pagos efectivos del mes"),
    ],
    [
      text("Saldo pendiente"),
      formula(
        `SUMIF(Pagos!E5:E${paymentEnd},"Pendiente",Pagos!F5:F${paymentEnd})`,
        report.summary.pendingCentavos / 100,
        5,
      ),
      text("Pagos pendientes registrados en el mes"),
    ],
    [
      text("Paquetes vendidos"),
      formula(
        `COUNTIF(Paquetes!H5:H${packageEnd},"Sí")`,
        report.summary.packageSalesCount,
      ),
      text("Compras con fecha dentro del mes"),
    ],
    [
      text("Sesiones vendidas"),
      formula(
        `SUMIF(Paquetes!H5:H${packageEnd},"Sí",Paquetes!D5:D${packageEnd})`,
        report.summary.sessionsSold,
      ),
      text("Sesiones incluidas en paquetes vendidos"),
    ],
    [
      text("Sesiones consumidas"),
      formula(
        `SUM(Paquetes!E5:E${packageEnd})`,
        report.summary.sessionsConsumed,
      ),
      text("Consumos activos ligados a citas del mes"),
    ],
  ];

  const appointmentRows = detailRows(
    "Citas",
    context,
    ["Fecha y hora", "Paciente", "Profesional", "Modalidad", "Estado"],
    report.appointments.map((appointment) => [
      number(
        clinicDateTimeSerial(
          appointment.starts_at,
          report.organization.timezone,
        ),
        7,
      ),
      text(appointment.patientName),
      text(appointment.professionalName),
      text(appointmentModalityLabels[appointment.modality]),
      text(appointmentStatusLabels[appointment.status]),
    ]),
  );
  const paymentRows = detailRows(
    "Pagos",
    context,
    [
      "Fecha efectiva",
      "Paciente",
      "Concepto",
      "Método",
      "Estado",
      "Monto (GTQ)",
    ],
    report.payments.map((payment) => [
      number(
        clinicDateTimeSerial(
          payment.paid_at ?? payment.created_at,
          report.organization.timezone,
        ),
        6,
      ),
      text(payment.patientName),
      text(payment.concept),
      text(paymentMethodLabels[payment.method]),
      text(paymentStatusLabels[payment.status]),
      number(payment.amount_centavos / 100, 5),
    ]),
  );
  const packageRows = detailRows(
    "Paquetes",
    context,
    [
      "Fecha de compra",
      "Paciente",
      "Paquete",
      "Sesiones vendidas",
      "Sesiones consumidas en mes",
      "Saldo actual",
      "Estado",
      "Vendido en mes",
      "Precio (GTQ)",
    ],
    report.packages.map((patientPackage) => [
      number(dateOnlySerial(patientPackage.purchased_on), 6),
      text(patientPackage.patientName),
      text(patientPackage.package_name_snapshot),
      number(patientPackage.total_sessions),
      number(patientPackage.sessionsConsumedInMonth),
      number(patientPackage.remainingSessions),
      text(patientPackageStateLabels[patientPackage.displayState]),
      text(patientPackage.soldInSelectedMonth ? "Sí" : "No"),
      number(patientPackage.price_centavos / 100, 5),
    ]),
  );

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${[1, 2, 3, 4].map((id) => `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    ),
    "docProps/core.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Reporte mensual Nutri360</dc:title><dc:creator>Nutri360</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`,
    ),
    "docProps/app.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Nutri360</Application><TitlesOfParts><vt:vector size="4" baseType="lpstr"><vt:lpstr>Resumen</vt:lpstr><vt:lpstr>Citas</vt:lpstr><vt:lpstr>Pagos</vt:lpstr><vt:lpstr>Paquetes</vt:lpstr></vt:vector></TitlesOfParts></Properties>`,
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/><sheet name="Citas" sheetId="2" r:id="rId2"/><sheet name="Pagos" sheetId="3" r:id="rId3"/><sheet name="Paquetes" sheetId="4" r:id="rId4"/></sheets><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    "xl/styles.xml": strToU8(
      workbookStyles(safeBrandColor(report.organization.brand_color)),
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      sheetXml({ rows: summaryRows, widths: [28, 18, 48] }),
    ),
    "xl/worksheets/sheet2.xml": strToU8(
      sheetXml({
        rows: appointmentRows,
        widths: [22, 26, 26, 18, 18],
        freezeRow: 4,
        autoFilter: `A4:E${appointmentEnd}`,
      }),
    ),
    "xl/worksheets/sheet3.xml": strToU8(
      sheetXml({
        rows: paymentRows,
        widths: [16, 26, 28, 18, 16, 18],
        freezeRow: 4,
        autoFilter: `A4:F${paymentEnd}`,
      }),
    ),
    "xl/worksheets/sheet4.xml": strToU8(
      sheetXml({
        rows: packageRows,
        widths: [16, 26, 28, 18, 24, 16, 16, 16, 18],
        freezeRow: 4,
        autoFilter: `A4:I${packageEnd}`,
      }),
    ),
  };
  return zipSync(files, { level: 6 });
}
