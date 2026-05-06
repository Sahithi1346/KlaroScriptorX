import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  ShadingType,
  ImageRun,
} from "docx";
import type { ParsedDoc, Block } from "./docParser";
import type { TemplateSpec } from "./templates";

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "888888" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function blockToParagraphs(
  block: Block,
  font: string,
  size: number,
  headingSize: number,
  lineSpacing: number,
): (Paragraph | Table)[] {
  const spacing = { line: lineSpacing, after: 120 };

  switch (block.type) {
    case "paragraph":
      return [
        new Paragraph({
          spacing,
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: block.text, font, size })],
        }),
      ];
    case "list":
      return block.items.map(
        (it) =>
          new Paragraph({
            spacing,
            bullet: block.ordered ? undefined : { level: 0 },
            numbering: block.ordered ? { reference: "numbers", level: 0 } : undefined,
            children: [new TextRun({ text: it, font, size })],
          }),
      );
    case "table": {
      const cols = Math.max(1, block.rows[0]?.length || 1);
      const colWidth = Math.floor(9000 / cols);
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: block.rows.map(
            (row, ri) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      borders: cellBorders,
                      width: { size: 100 / cols, type: WidthType.PERCENTAGE },
                      margins: { top: 80, bottom: 80, left: 120, right: 120 },
                      shading: ri === 0 ? { fill: "EEEEEE", type: ShadingType.CLEAR } : undefined,
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: cell, font, size, bold: ri === 0 })],
                        }),
                      ],
                    }),
                ),
              }),
          ),
        }),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
      ];
    }
    case "figure": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const children: any[] = [];
      if (block.src) {
        try {
          const base64Data = block.src.split(",")[1];
          if (base64Data) {
            children.push(
              new ImageRun({
                data: Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                transformation: { width: 450, height: 300 },
              } as any),
            );
          }
        } catch (e) {
          console.error("Failed to embed image in DOCX", e);
        }
      }
      children.push(
        new TextRun({
          text: block.caption || "[Figure]",
          italics: true,
          font,
          size,
          break: children.length > 0 ? 1 : 0,
        }),
      );
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing,
          children,
        }),
      ];
    }
    case "heading":
      return [
        new Paragraph({
          heading:
            block.level === 1
              ? HeadingLevel.HEADING_1
              : block.level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: block.text, bold: true, font, size: headingSize })],
        }),
      ];
    case "reference":
      return [
        new Paragraph({
          spacing,
          children: [new TextRun({ text: block.text, font, size })],
        }),
      ];
  }
}

export async function generateDocx(
  parsed: ParsedDoc,
  spec: TemplateSpec,
  options: { fontFamily: string; fontSize: string; hasBorders: boolean },
): Promise<Blob> {
  const font = options.fontFamily || spec.font;
  const bodySizePt = parseInt(options.fontSize);
  const bodySize = bodySizePt * 2; // docx uses half-points
  const titleSize = spec.titleSize; // Keep template defaults for title/heading relative to body or fixed
  const headingSize = spec.headingSize;

  const titlePara = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: parsed.title, bold: true, font, size: titleSize })],
  });

  const authorPara = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: parsed.authors.join(", "), font, size: bodySize + 2 })],
  });

  const affilPara = parsed.affiliations.length
    ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: parsed.affiliations.join(" • "),
            italics: true,
            font,
            size: bodySize - 2,
          }),
        ],
      })
    : null;

  const abstractParas = parsed.abstract
    ? [
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: "Abstract", bold: true, font, size: headingSize })],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: spec.lineSpacing, after: 120 },
          children: [new TextRun({ text: parsed.abstract, italics: true, font, size: bodySize })],
        }),
      ]
    : [];

  const keywordsPara = parsed.keywords.length
    ? new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({ text: "Keywords: ", bold: true, font, size: bodySize }),
          new TextRun({ text: parsed.keywords.join(", "), font, size: bodySize }),
        ],
      })
    : null;

  const bodyChildren: (Paragraph | Table)[] = [];
  for (const section of parsed.sections) {
    bodyChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: section.heading, bold: true, font, size: headingSize })],
      }),
    );
    for (const block of section.blocks) {
      bodyChildren.push(...blockToParagraphs(block, font, bodySize, headingSize, spec.lineSpacing));
    }
  }

  const refsChildren: Paragraph[] = parsed.references.length
    ? [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 120 },
          children: [new TextRun({ text: "References", bold: true, font, size: headingSize })],
        }),
        ...parsed.references.map(
          (r, i) =>
            new Paragraph({
              spacing: { line: spec.lineSpacing, after: 80 },
              children: [
                new TextRun({
                  text: spec.refStyle === "numbered" ? `[${i + 1}] ${r}` : r,
                  font,
                  size: bodySize,
                }),
              ],
            }),
        ),
      ]
    : [];

  const doc = new Document({
    creator: "KlaroScriptorX",
    title: parsed.title,
    styles: {
      default: { document: { run: { font, size: bodySize } } },
    },
    numbering: {
      config: [
        {
          reference: "numbers",
          levels: [
            {
              level: 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              format: "decimal" as any,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: {
              top: spec.margin,
              right: spec.margin,
              bottom: spec.margin,
              left: spec.margin,
            },
            borders: options.hasBorders
              ? {
                  pageBorderTop: {
                    style: BorderStyle.DOUBLE,
                    size: 12,
                    color: "444444",
                    space: 24,
                  },
                  pageBorderBottom: {
                    style: BorderStyle.DOUBLE,
                    size: 12,
                    color: "444444",
                    space: 24,
                  },
                  pageBorderLeft: {
                    style: BorderStyle.DOUBLE,
                    size: 12,
                    color: "444444",
                    space: 24,
                  },
                  pageBorderRight: {
                    style: BorderStyle.DOUBLE,
                    size: 12,
                    color: "444444",
                    space: 24,
                  },
                }
              : undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          column: spec.columns === 2 ? { count: 2, space: 432, equalWidth: true } : undefined,
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: parsed.title.slice(0, 60),
                    italics: true,
                    font,
                    size: bodySize - 4,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Page ", font, size: bodySize - 4 }),
                  new TextRun({ children: [PageNumber.CURRENT], font, size: bodySize - 4 }),
                ],
              }),
            ],
          }),
        },
        children: [
          titlePara,
          authorPara,
          ...(affilPara ? [affilPara] : []),
          ...abstractParas,
          ...(keywordsPara ? [keywordsPara] : []),
          ...bodyChildren,
          ...refsChildren,
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
