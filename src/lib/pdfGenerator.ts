import jsPDF from "jspdf";
import type { ParsedDoc } from "./docParser";
import type { TemplateSpec } from "./templates";

export function generatePdf(
  parsed: ParsedDoc,
  spec: TemplateSpec,
  options: { fontFamily: string; fontSize: string; hasBorders: boolean },
): Blob {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const font = options.fontFamily || "times";
  const bodySize = parseInt(options.fontSize);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 72;
  const colGap = 18;
  const colCount = spec.columns;
  const colWidth = (pageWidth - margin * 2 - colGap * (colCount - 1)) / colCount;

  let col = 0;
  let y = margin;
  let x = margin;

  const lineHeight = bodySize * (spec.lineSpacing / 240) * 1.15;
  let currentColTop = margin;

  const newPage = () => {
    pdf.addPage();
    y = margin;
    currentColTop = margin;
    col = 0;
    x = margin;
    addHeaderFooter();
    if (options.hasBorders) addPageBorder();
  };

  const nextCol = () => {
    col++;
    if (col >= colCount) {
      newPage();
    } else {
      x = margin + col * (colWidth + colGap);
      y = currentColTop;
    }
  };

  const addHeaderFooter = () => {
    pdf.setFont(font, "italic");
    pdf.setFontSize(8);
    pdf.text(parsed.title.slice(0, 60), pageWidth - margin, margin / 1.5, { align: "right" });
    pdf.setFont(font, "normal");
    pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth / 2, pageHeight - margin / 1.5, {
      align: "center",
    });
  };

  const addPageBorder = () => {
    const bMargin = 20;
    pdf.setDrawColor(68, 68, 68);
    pdf.setLineWidth(2);
    pdf.rect(bMargin, bMargin, pageWidth - bMargin * 2, pageHeight - bMargin * 2);
    pdf.setLineWidth(1);
    pdf.rect(
      bMargin + 3,
      bMargin + 3,
      pageWidth - (bMargin + 3) * 2,
      pageHeight - (bMargin + 3) * 2,
    );
  };

  const writeText = (
    text: string,
    opts: {
      size?: number;
      bold?: boolean;
      italic?: boolean;
      align?: "left" | "center" | "justify";
      spacingAfter?: number;
      fullWidth?: boolean;
    } = {},
  ) => {
    const size = opts.size ?? bodySize;
    const style = opts.bold
      ? opts.italic
        ? "bolditalic"
        : "bold"
      : opts.italic
        ? "italic"
        : "normal";
    pdf.setFont(font, style);
    pdf.setFontSize(size);
    const width = opts.fullWidth ? pageWidth - margin * 2 : colWidth;
    const lines = pdf.splitTextToSize(text, width);
    const lh = size * 1.25;
    for (const line of lines) {
      if (y + lh > pageHeight - margin) {
        if (opts.fullWidth) newPage();
        else nextCol();
      }
      const tx = opts.align === "center" ? (opts.fullWidth ? pageWidth / 2 : x + width / 2) : x;
      pdf.text(line, tx, y, { align: opts.align === "center" ? "center" : "left" });
      y += lh;
    }
    y += opts.spacingAfter ?? lineHeight * 0.3;
  };

  addHeaderFooter();
  if (options.hasBorders) addPageBorder();

  // Title (full width)
  writeText(parsed.title, {
    size: (spec.titleSize / 48) * (bodySize * 2),
    bold: true,
    align: "center",
    fullWidth: true,
    spacingAfter: 8,
  });
  writeText(parsed.authors.join(", "), {
    size: bodySize + 1,
    align: "center",
    fullWidth: true,
    spacingAfter: 4,
  });
  if (parsed.affiliations.length) {
    writeText(parsed.affiliations.join(" • "), {
      size: bodySize - 1,
      italic: true,
      align: "center",
      fullWidth: true,
      spacingAfter: 14,
    });
  }

  if (parsed.abstract) {
    writeText("Abstract", {
      size: (spec.headingSize / 24) * (bodySize * 1.5),
      bold: true,
      fullWidth: true,
    });
    writeText(parsed.abstract, { italic: true, fullWidth: true });
  }
  if (parsed.keywords.length) {
    writeText(`Keywords: ${parsed.keywords.join(", ")}`, { spacingAfter: 12, fullWidth: true });
  }

  // Reset to column flow
  currentColTop = y;
  col = 0;
  x = margin;

  for (const section of parsed.sections) {
    writeText(section.heading, {
      size: (spec.headingSize / 24) * (bodySize * 1.5),
      bold: true,
      spacingAfter: 4,
    });
    for (const block of section.blocks) {
      if (block.type === "paragraph") writeText(block.text);
      else if (block.type === "list")
        block.items.forEach((it, i) => writeText(`${block.ordered ? `${i + 1}.` : "•"} ${it}`));
      else if (block.type === "figure") {
        if (block.src) {
          try {
            pdf.addImage(block.src, "PNG", x, y, colWidth, colWidth * 0.75);
            y += colWidth * 0.75 + 5;
          } catch (e) {
            console.error("Failed to add image to PDF", e);
          }
        }
        writeText(block.caption || "[Figure]", { italic: true, align: "center" });
      } else if (block.type === "table" && block.rows.length > 0) {
        const cols = block.rows[0].length;
        const cw = colWidth / cols;
        const rowHeight = bodySize * 1.5;

        block.rows.forEach((row, ri) => {
          if (y + rowHeight > pageHeight - margin) {
            nextCol();
          }

          // Draw cell borders and text
          row.forEach((cell, ci) => {
            const cellX = x + ci * cw;
            pdf.setDrawColor(200);
            pdf.rect(cellX, y - rowHeight + 4, cw, rowHeight);

            pdf.setFont(font, ri === 0 ? "bold" : "normal");
            pdf.setFontSize(bodySize - 2);
            const text = pdf.splitTextToSize(cell.toString(), cw - 4);
            pdf.text(text, cellX + 2, y - 4);
          });
          y += rowHeight;
        });
        y += 10; // Extra spacing after table
      }
    }
  }

  if (parsed.references.length) {
    writeText("References", {
      size: (spec.headingSize / 24) * (bodySize * 1.5),
      bold: true,
      spacingAfter: 4,
    });
    parsed.references.forEach((r, i) => {
      writeText(spec.refStyle === "numbered" ? `[${i + 1}] ${r}` : r);
    });
  }

  return pdf.output("blob");
}
