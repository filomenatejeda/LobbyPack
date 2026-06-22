import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../db/pool";
import { sendLobbyPackEmail } from "./email";

type BuildingSummaryRow = RowDataPacket & {
  id: string;
  building_name: string;
  contact_email: string;
  daily_summary: number;
};

type ReportRecipientRow = RowDataPacket & {
  email: string;
};

type ReportParcelRow = RowDataPacket & {
  id: string;
  department_address: string;
  resident_name: string;
  business_name: string;
  event_time: string;
};

type ReportIssueRow = RowDataPacket & {
  id: string;
  id_parcel: string;
  department_address: string;
  issue_description: string;
  created_at: string;
};

type ReportCountRow = RowDataPacket & {
  total: number;
};

type DailySummaryResult = {
  buildingId: string;
  buildingName: string;
  reportDate: string;
  recipientCount: number;
  sentCount: number;
  skipped: boolean;
  reason?: string;
};

type DailySummaryReport = {
  building: BuildingSummaryRow;
  reportDate: string;
  receivedParcels: ReportParcelRow[];
  claimedParcels: ReportParcelRow[];
  issues: ReportIssueRow[];
  pendingTotal: number;
};

let isSchedulerStarted = false;
let isSchedulerRunning = false;

function getReportDate() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });
}

function normalizeReportDate(reportDate?: string) {
  if (!reportDate) {
    return getReportDate();
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
    throw new Error("La fecha del reporte debe usar formato YYYY-MM-DD.");
  }

  return reportDate;
}

function formatReportDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);

  return parsedDate.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

function formatReportTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });
}

function buildParcelLines(rows: ReportParcelRow[]) {
  if (rows.length === 0) {
    return "Sin movimientos.";
  }

  return rows
    .slice(0, 20)
    .map(
      (row) =>
        `- ${row.id} · ${row.department_address} · ${row.resident_name} · ${row.business_name} · ${formatReportTime(row.event_time)}`,
    )
    .join("\n");
}

function buildIssueLines(rows: ReportIssueRow[]) {
  if (rows.length === 0) {
    return "Sin reclamos ingresados.";
  }

  return rows
    .slice(0, 20)
    .map(
      (row) =>
        `- ${row.id} · ${row.id_parcel} · ${row.department_address} · ${formatReportTime(row.created_at)} · ${row.issue_description}`,
    )
    .join("\n");
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfText(value: string, maxLength: number) {
  const words = sanitizePdfText(value).split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;

    if (nextLine.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.length > 0 ? lines : [""];
}

function createPdfDocument() {
  const pages: string[] = [];
  let content = "";
  let y = 780;

  const addPage = () => {
    if (content) {
      pages.push(content);
    }

    content = "";
    y = 780;
  };

  const ensureSpace = (height: number) => {
    if (y - height < 48) {
      addPage();
    }
  };

  const text = (
    value: string,
    x: number,
    size = 10,
    options?: { bold?: boolean; color?: [number, number, number] },
  ) => {
    const [r, g, b] = options?.color ?? [0.22, 0.18, 0.15];
    const font = options?.bold ? "F2" : "F1";
    content += `${r} ${g} ${b} rg BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET\n`;
    y -= size + 7;
  };

  const wrappedText = (
    value: string,
    x: number,
    size = 10,
    maxLength = 80,
    options?: { bold?: boolean; color?: [number, number, number] },
  ) => {
    for (const line of wrapPdfText(value, maxLength)) {
      text(line, x, size, options);
    }
  };

  const rect = (
    x: number,
    rectY: number,
    width: number,
    height: number,
    color: [number, number, number],
  ) => {
    content += `${color[0]} ${color[1]} ${color[2]} rg ${x} ${rectY} ${width} ${height} re f\n`;
  };

  const section = (title: string) => {
    ensureSpace(44);
    y -= 8;
    rect(40, y - 12, 515, 30, [0.93, 0.96, 0.9]);
    y += 4;
    text(title, 56, 13, { bold: true, color: [0.32, 0.45, 0.27] });
    y -= 6;
  };

  const finish = () => {
    if (content) {
      pages.push(content);
    }

    const objects: string[] = [];
    const addObject = (value: string) => {
      objects.push(value);
      return objects.length;
    };

    const fontRegular = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const fontBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const pageObjectIds: number[] = [];
    const pageContents = pages.map((page) =>
      addObject(`<< /Length ${page.length} >>\nstream\n${page}endstream`),
    );
    const pagesObjectId = objects.length + pages.length + 1;

    for (const contentId of pageContents) {
      pageObjectIds.push(
        addObject(
          `<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`,
        ),
      );
    }

    const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
    const pagesId = addObject(`<< /Type /Pages /Kids [${kids}] /Count ${pageObjectIds.length} >>`);
    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];

    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

    for (const offset of offsets.slice(1)) {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new TextEncoder().encode(pdf);
  };

  return {
    ensureSpace,
    finish,
    rect,
    section,
    text,
    wrappedText,
    get y() {
      return y;
    },
    set y(value: number) {
      y = value;
    },
  };
}

function uniqueEmails(rows: ReportRecipientRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => row.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ),
  );
}

export async function ensureDailySummaryReportTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS DailySummaryReports (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      building_id VARCHAR(64) NOT NULL,
      report_date DATE NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      recipient_count INT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_daily_summary_report (building_id, report_date)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `);
}

async function listDailySummaryBuildings(buildingId?: string) {
  const [rows] = await pool.query<BuildingSummaryRow[]>(
    `
      SELECT
        b.id,
        b.building_name,
        b.contact_email,
        COALESCE(bp.daily_summary, TRUE) AS daily_summary
      FROM Buildings b
      LEFT JOIN BuildingPreferences bp ON bp.building_id = b.id
      WHERE (? IS NULL OR b.id = ?)
      ORDER BY b.building_name
    `,
    [buildingId ?? null, buildingId ?? null],
  );

  return rows;
}

async function getDailySummaryRecipients(buildingId: string, contactEmail: string) {
  const [rows] = await pool.query<ReportRecipientRow[]>(
    `
      SELECT ? AS email
      UNION
      SELECT u.email
      FROM Users u
      INNER JOIN Concierges c ON c.user_id = u.id
      WHERE c.building_id = ?
      UNION
      SELECT u.email
      FROM Users u
      INNER JOIN Admins a ON a.user_id = u.id
      WHERE LOWER(u.email) = LOWER(?)
    `,
    [contactEmail, buildingId, contactEmail],
  );

  return uniqueEmails(rows);
}

async function wasDailySummarySent(buildingId: string, reportDate: string) {
  const [rows] = await pool.query<ReportCountRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM DailySummaryReports
      WHERE building_id = ?
        AND report_date = ?
    `,
    [buildingId, reportDate],
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function markDailySummarySent(
  buildingId: string,
  reportDate: string,
  recipientCount: number,
) {
  await pool.query(
    `
      INSERT INTO DailySummaryReports (building_id, report_date, recipient_count)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        sent_at = CURRENT_TIMESTAMP,
        recipient_count = VALUES(recipient_count)
    `,
    [buildingId, reportDate, recipientCount],
  );
}

async function buildDailySummaryReport(
  building: BuildingSummaryRow,
  reportDate: string,
): Promise<DailySummaryReport> {
  const [receivedParcels] = await pool.query<ReportParcelRow[]>(
    `
      SELECT
        p.id,
        COALESCE(p.delivery_department_address, r.department_address, '') AS department_address,
        COALESCE(p.parcel_recipient_name, r.resident_name, '') AS resident_name,
        b.business_name,
        p.pending_date AS event_time
      FROM Parcels p
      LEFT JOIN Residents r ON r.user_id = p.id_resident
      INNER JOIN Businesses b ON b.id = p.id_business
      WHERE p.building_id = ?
        AND DATE(p.pending_date) = ?
      ORDER BY p.pending_date DESC
    `,
    [building.id, reportDate],
  );
  const [claimedParcels] = await pool.query<ReportParcelRow[]>(
    `
      SELECT
        p.id,
        COALESCE(p.delivery_department_address, r.department_address, '') AS department_address,
        COALESCE(cr.resident_name, cc.concierge_name, ca.admin_name, claimed_user.email, p.parcel_recipient_name, r.resident_name, '') AS resident_name,
        b.business_name,
        p.claimed_date AS event_time
      FROM Parcels p
      LEFT JOIN Residents r ON r.user_id = p.id_resident
      LEFT JOIN Users claimed_user ON claimed_user.id = p.claimed_by_user_id
      LEFT JOIN Residents cr ON cr.user_id = claimed_user.id
      LEFT JOIN Concierges cc ON cc.user_id = claimed_user.id
      LEFT JOIN Admins ca ON ca.user_id = claimed_user.id
      INNER JOIN Businesses b ON b.id = p.id_business
      WHERE p.building_id = ?
        AND p.claimed_date IS NOT NULL
        AND DATE(p.claimed_date) = ?
      ORDER BY p.claimed_date DESC
    `,
    [building.id, reportDate],
  );
  const [issues] = await pool.query<ReportIssueRow[]>(
    `
      SELECT
        i.id,
        i.id_parcel,
        COALESCE(p.delivery_department_address, r.department_address, '') AS department_address,
        i.issue_description,
        i.created_at
      FROM Issues i
      INNER JOIN Parcels p ON p.id = i.id_parcel
      LEFT JOIN Residents r ON r.user_id = p.id_resident
      WHERE p.building_id = ?
        AND DATE(i.created_at) = ?
      ORDER BY i.created_at DESC
    `,
    [building.id, reportDate],
  );
  const [pendingCountRows] = await pool.query<ReportCountRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM Parcels
      WHERE building_id = ?
        AND parcel_status = 'pending'
    `,
    [building.id],
  );

  return {
    building,
    reportDate,
    receivedParcels,
    claimedParcels,
    issues,
    pendingTotal: Number(pendingCountRows[0]?.total ?? 0),
  };
}

function buildDailySummaryEmail(report: DailySummaryReport) {
  const reportDateLabel = formatReportDate(report.reportDate);
  const subject = `Resumen diario LobbyPack - ${report.building.building_name} - ${reportDateLabel}`;
  const text = [
    `Resumen diario de ${report.building.building_name}`,
    reportDateLabel,
    "",
    `Paquetes recepcionados hoy: ${report.receivedParcels.length}`,
    buildParcelLines(report.receivedParcels),
    "",
    `Paquetes retirados hoy: ${report.claimedParcels.length}`,
    buildParcelLines(report.claimedParcels),
    "",
    `Reclamos ingresados hoy: ${report.issues.length}`,
    buildIssueLines(report.issues),
    "",
    `Paquetes pendientes al cierre: ${report.pendingTotal}`,
    "",
    "LobbyPack",
  ].join("\n");

  return { subject, text };
}

export function createDailySummaryPdf(report: DailySummaryReport) {
  const pdf = createPdfDocument();
  const reportDateLabel = formatReportDate(report.reportDate);

  pdf.rect(0, 0, 595, 842, [0.97, 0.96, 0.93]);
  pdf.text("LobbyPack", 48, 26, { bold: true, color: [0.32, 0.45, 0.27] });
  pdf.text("Resumen diario", 48, 21, { bold: true, color: [0.22, 0.18, 0.15] });
  pdf.text(report.building.building_name, 48, 13, { color: [0.38, 0.31, 0.25] });
  pdf.text(reportDateLabel, 48, 11, { color: [0.38, 0.31, 0.25] });
  pdf.y -= 12;

  const statsY = pdf.y - 72;
  const statCards = [
    ["Recepcionados", String(report.receivedParcels.length)],
    ["Retirados", String(report.claimedParcels.length)],
    ["Reclamos", String(report.issues.length)],
    ["Pendientes", String(report.pendingTotal)],
  ];

  statCards.forEach(([label, value], index) => {
    const x = 48 + index * 125;
    pdf.rect(x, statsY, 110, 62, [1, 1, 0.98]);
    pdf.y = statsY + 38;
    pdf.text(value, x + 14, 22, { bold: true, color: [0.32, 0.45, 0.27] });
    pdf.text(label, x + 14, 9, { color: [0.38, 0.31, 0.25] });
  });

  pdf.y = statsY - 18;

  const addParcelRows = (rows: ReportParcelRow[]) => {
    if (rows.length === 0) {
      pdf.text("Sin movimientos.", 56, 10, { color: [0.42, 0.38, 0.34] });
      return;
    }

    rows.slice(0, 18).forEach((row) => {
      pdf.ensureSpace(34);
      pdf.wrappedText(
        `${row.id} · ${row.department_address} · ${row.resident_name} · ${row.business_name} · ${formatReportTime(row.event_time)}`,
        56,
        10,
        88,
      );
      pdf.y -= 2;
    });
  };

  pdf.section("Paquetes recepcionados");
  addParcelRows(report.receivedParcels);
  pdf.section("Paquetes retirados");
  addParcelRows(report.claimedParcels);
  pdf.section("Reclamos ingresados");

  if (report.issues.length === 0) {
    pdf.text("Sin reclamos ingresados.", 56, 10, { color: [0.42, 0.38, 0.34] });
  } else {
    report.issues.slice(0, 18).forEach((issue) => {
      pdf.ensureSpace(46);
      pdf.wrappedText(
        `${issue.id} · ${issue.id_parcel} · ${issue.department_address} · ${formatReportTime(issue.created_at)}`,
        56,
        10,
        88,
        { bold: true },
      );
      pdf.wrappedText(issue.issue_description, 56, 9, 96, {
        color: [0.42, 0.38, 0.34],
      });
      pdf.y -= 2;
    });
  }

  return pdf.finish();
}

export async function getDailySummaryPdfForBuilding(buildingId: string, reportDateValue?: string) {
  await ensureDailySummaryReportTable();
  const reportDate = normalizeReportDate(reportDateValue);
  const buildings = await listDailySummaryBuildings(buildingId);
  const building = buildings[0];

  if (!building) {
    return null;
  }

  const report = await buildDailySummaryReport(building, reportDate);

  return {
    filename: `resumen-diario-${sanitizePdfText(building.building_name).replace(/\s+/g, "-").toLowerCase()}-${reportDate}.pdf`,
    pdf: createDailySummaryPdf(report),
  };
}

export async function sendDailySummaryReports(options?: {
  buildingId?: string;
  force?: boolean;
  attachPdf?: boolean;
  reportDate?: string;
}) {
  await ensureDailySummaryReportTable();

  const reportDate = normalizeReportDate(options?.reportDate);
  const buildings = await listDailySummaryBuildings(options?.buildingId);
  const results: DailySummaryResult[] = [];

  for (const building of buildings) {
    if (!building.daily_summary && !options?.force) {
      results.push({
        buildingId: building.id,
        buildingName: building.building_name,
        reportDate,
        recipientCount: 0,
        sentCount: 0,
        skipped: true,
        reason: "Resumen diario desactivado.",
      });
      continue;
    }

    if (!options?.force && (await wasDailySummarySent(building.id, reportDate))) {
      results.push({
        buildingId: building.id,
        buildingName: building.building_name,
        reportDate,
        recipientCount: 0,
        sentCount: 0,
        skipped: true,
        reason: "Resumen diario ya enviado hoy.",
      });
      continue;
    }

    const recipients = await getDailySummaryRecipients(
      building.id,
      building.contact_email,
    );

    if (recipients.length === 0) {
      results.push({
        buildingId: building.id,
        buildingName: building.building_name,
        reportDate,
        recipientCount: 0,
        sentCount: 0,
        skipped: true,
        reason: "No hay destinatarios configurados.",
      });
      continue;
    }

    const report = await buildDailySummaryReport(building, reportDate);
    const email = buildDailySummaryEmail(report);
    const pdf = options?.attachPdf ? createDailySummaryPdf(report) : null;
    const pdfFilename = `resumen-diario-${sanitizePdfText(building.building_name).replace(/\s+/g, "-").toLowerCase()}-${reportDate}.pdf`;
    const sendResults = await Promise.allSettled(
      recipients.map((recipient) =>
        sendLobbyPackEmail({
          to: recipient,
          subject: email.subject,
          text: email.text,
          ...(pdf
            ? {
                attachments: [
                  {
                    filename: pdfFilename,
                    content: Buffer.from(pdf).toString("base64"),
                  },
                ],
              }
            : {}),
        }),
      ),
    );
    const sentCount = sendResults.filter((result) => result.status === "fulfilled").length;

    if (sentCount > 0) {
      await markDailySummarySent(building.id, reportDate, recipients.length);
    }

    results.push({
      buildingId: building.id,
      buildingName: building.building_name,
      reportDate,
      recipientCount: recipients.length,
      sentCount,
      skipped: false,
    });
  }

  return results;
}

export function startDailySummaryScheduler() {
  if (isSchedulerStarted) {
    return;
  }

  isSchedulerStarted = true;

  const runScheduler = async () => {
    if (isSchedulerRunning) {
      return;
    }

    const currentHour = Number(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        hour12: false,
        timeZone: "America/Santiago",
      }),
    );
    const summaryHour = Number(process.env.DAILY_SUMMARY_HOUR ?? 20);

    if (currentHour < summaryHour) {
      return;
    }

    isSchedulerRunning = true;

    try {
      const results = await sendDailySummaryReports();
      const sentBuildings = results.filter((result) => !result.skipped && result.sentCount > 0);

      if (sentBuildings.length > 0) {
        console.info(`Resumen diario enviado para ${sentBuildings.length} comunidad(es).`);
      }
    } catch (error) {
      console.warn("No se pudo ejecutar el resumen diario automatico.", error);
    } finally {
      isSchedulerRunning = false;
    }
  };

  windowlessSetInterval(() => {
    void runScheduler();
  }, 15 * 60 * 1000);
  void runScheduler();
}

function windowlessSetInterval(callback: () => void, ms: number) {
  return setInterval(callback, ms);
}
