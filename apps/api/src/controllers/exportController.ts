import { Request, Response } from "express";
import { ExportService } from "../services/exportService";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";

const exportService = new ExportService(prisma);

// Exports indicator data as CSV
export const exportCSV = asyncHandler(async (req: Request, res: Response) => {
  const { indicatorId } = req.params;
  const { filters } = req.body;

  const indicator = await prisma.indicator.findUnique({
    where: { id: parseInt(indicatorId) },
  });

  if (!indicator) {
    return res.status(404).json({ error: "Indicator not found" });
  }

  // Templates are removed, use standard export
  const template = null;

  // Generate CSV
  const csv = await exportService.generateCSV(
    indicator.id,
    template,
    filters || {},
  );

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `indicator_${indicatorId}_${timestamp}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

// Previews export with first 10 rows
export const previewExport = asyncHandler(
  async (req: Request, res: Response) => {
    const { indicatorId } = req.params;
    const { filters } = req.body;

    const indicator = await prisma.indicator.findUnique({
      where: { id: parseInt(indicatorId) },
    });

    if (!indicator) {
      return res.status(404).json({ error: "Indicator not found" });
    }

    // Templates are removed
    const template = null;

    const preview = await exportService.generatePreview(
      indicator.id,
      template,
      filters || {},
    );

    res.json({ preview });
  },
);
