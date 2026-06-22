import { Elysia } from "elysia";
import { requireAppRole } from "../auth/session";
import {
  getDailySummaryPdfForBuilding,
  sendDailySummaryReports,
} from "../utils/dailySummary";
import { resolveBuildingIdForUserEmail } from "./shared/community";

export const reportRoutes = new Elysia()
  .get("/reports/daily-summary/pdf", async ({ headers, query, set }) => {
    const session = await requireAppRole(headers.authorization, ["admin"]);
    const buildingId = await resolveBuildingIdForUserEmail(session.email);
    const file = await getDailySummaryPdfForBuilding(
      buildingId,
      typeof query.date === "string" ? query.date : undefined,
    );

    if (!file) {
      set.status = 404;
      return "No se encontro el edificio para generar el reporte.";
    }

    set.headers["content-type"] = "application/pdf";
    set.headers["content-disposition"] = `attachment; filename="${file.filename}"`;

    return file.pdf;
  })
  .post("/reports/daily-summary/send", async ({ headers, body }) => {
    const session = await requireAppRole(headers.authorization, ["admin"]);
    const buildingId = await resolveBuildingIdForUserEmail(session.email);
    const payload = body as { date?: string } | undefined;

    return {
      results: await sendDailySummaryReports({
        buildingId,
        force: true,
        attachPdf: true,
        reportDate: payload?.date,
      }),
    };
  });
