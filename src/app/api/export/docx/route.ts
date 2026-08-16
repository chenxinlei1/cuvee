import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/types";
import { canDownloadReport, recordReportAccess, writeAuditLog } from "@/lib/auth/db";
import { clientIp } from "@/lib/auth/request-security";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

export const runtime = "nodejs";
const Body = z.object({
  markdown: z.string().min(1).max(80_000),
  reportId: z.string().uuid().optional(),
});
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "D9DDE3" };

function runs(text: string): TextRun[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? new TextRun({ text: part.slice(2, -2), bold: true })
        : new TextRun(part),
    );
}

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((x) => x.trim());
}

function markdownBlocks(markdown: string): Array<Paragraph | Table> {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output: Array<Paragraph | Table> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] ?? "").trim();
    if (!line) continue;

    if (line.startsWith("|") && (lines[i + 1]?.trim().startsWith("|") ?? false)) {
      const data: string[][] = [];
      while (i < lines.length && (lines[i]?.trim().startsWith("|") ?? false)) {
        const row = cells(lines[i] ?? "");
        if (!row.every((x) => /^:?-{3,}:?$/.test(x))) data.push(row);
        i += 1;
      }
      i -= 1;
      output.push(
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          rows: data.map(
            (row, rowIndex) =>
              new TableRow({
                tableHeader: rowIndex === 0,
                children: row.map(
                  (cell) =>
                    new TableCell({
                      width: {
                        size: Math.floor(9360 / Math.max(row.length, 1)),
                        type: WidthType.DXA,
                      },
                      margins: { top: 100, bottom: 100, left: 120, right: 120 },
                      shading:
                        rowIndex === 0 ? { fill: "F2F4F7", type: ShadingType.CLEAR } : undefined,
                      borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: cell, bold: rowIndex === 0, size: 20 })],
                        }),
                      ],
                    }),
                ),
              }),
          ),
        }),
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level =
        heading[1]?.length === 1
          ? HeadingLevel.TITLE
          : heading[1]?.length === 2
            ? HeadingLevel.HEADING_1
            : HeadingLevel.HEADING_2;
      output.push(new Paragraph({ heading: level, children: runs(heading[2] ?? "") }));
      continue;
    }
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      output.push(
        new Paragraph({
          numbering: { reference: "report-numbering", level: 0 },
          children: runs(numbered[1] ?? ""),
        }),
      );
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      output.push(new Paragraph({ bullet: { level: 0 }, children: runs(bullet[1] ?? "") }));
      continue;
    }
    output.push(new Paragraph({ children: runs(line) }));
  }
  return output;
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user, "report:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  if (parsed.data.reportId) {
    if (!(await canDownloadReport(user, parsed.data.reportId)))
      return NextResponse.json({ error: "Download permission required" }, { status: 403 });
  } else if (!hasPermission(user, "analysis:run"))
    return NextResponse.json({ error: "Report ID required" }, { status: 403 });

  const word = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22, color: "202124" },
          paragraph: { spacing: { after: 140, line: 276 } },
        },
      },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Arial", size: 42, bold: true },
          paragraph: { spacing: { after: 240 }, keepNext: true },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Arial", size: 30, bold: true, color: "7A2238" },
          paragraph: { spacing: { before: 280, after: 120 }, keepNext: true },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Arial", size: 25, bold: true, color: "7A2238" },
          paragraph: { spacing: { before: 220, after: 100 }, keepNext: true },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "report-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: markdownBlocks(parsed.data.markdown),
      },
    ],
  });
  const buffer = await Packer.toBuffer(word);
  if(parsed.data.reportId) await Promise.all([recordReportAccess({reportId:parsed.data.reportId,userId:user.id,action:"download",ipAddress:clientIp(request),userAgent:request.headers.get("user-agent")??undefined}),writeAuditLog(user.id,"report.download","report",parsed.data.reportId)]);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": 'attachment; filename="wine-signals-report.docx"',
    },
  });
}
