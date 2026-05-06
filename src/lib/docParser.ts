import mammoth from "mammoth";

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "figure"; src: string; caption?: string }
  | { type: "reference"; text: string };

export interface ParsedDoc {
  title: string;
  authors: string[];
  affiliations: string[];
  abstract: string;
  keywords: string[];
  sections: { heading: string; blocks: Block[] }[];
  references: string[];
  figures: { src: string; caption?: string }[];
  tables: string[][][];
  rawHtml: string;
}

const REF_HEADINGS = /^(references|bibliography|works cited)$/i;
const ABSTRACT_HEADING = /^abstract$/i;
const KEYWORDS_HEADING = /^(keywords|key words|index terms)\s*[:-]?/i;

export async function parseDocx(file: File): Promise<ParsedDoc> {
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => p.subtitle:fresh",
        "p[style-name='Author'] => p.author:fresh",
      ],
    },
  );

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement;
  const nodes = Array.from(root.children);

  let title = "";
  const authors: string[] = [];
  const affiliations: string[] = [];
  let abstract = "";
  let keywords: string[] = [];
  const sections: { heading: string; blocks: Block[] }[] = [];
  const references: string[] = [];
  const figures: { src: string; caption?: string }[] = [];
  const tables: string[][][] = [];

  let mode: "front" | "abstract" | "body" | "refs" = "front";
  let currentSection: { heading: string; blocks: Block[] } | null = null;

  const pushBlock = (b: Block) => {
    if (!currentSection) {
      currentSection = { heading: "Introduction", blocks: [] };
      sections.push(currentSection);
    }
    currentSection.blocks.push(b);
  };

  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || "").trim();
    if (!text && tag !== "table" && tag !== "img") continue;

    // Title detection: first H1 or first non-empty paragraph in long-ish format
    if (
      !title &&
      (tag === "h1" || (mode === "front" && tag === "p" && text.length < 200 && i < 3))
    ) {
      title = text;
      continue;
    }

    // Improved front matter and section detection
    if (mode === "front" && tag === "p") {
      // Handle cases where multiple labels are merged into one paragraph
      // e.g. "Author: John Doe Affiliation: Uni X Abstract: This paper..."
      const mergedPattern =
        /(author(?:s)?|affiliation(?:s)?|abstract|keyword(?:s)?|index terms)\s*:/gi;
      if (mergedPattern.test(text)) {
        const matches = Array.from(text.matchAll(mergedPattern));
        for (let m = 0; m < matches.length; m++) {
          const start = matches[m].index!;
          const end = m + 1 < matches.length ? matches[m + 1].index! : text.length;
          const label = matches[m][1].toLowerCase();
          const value = text.slice(start + matches[m][0].length, end).trim();

          if (label.startsWith("author")) {
            authors.push(
              ...value
                .split(/[,;]| and /i)
                .map((s) => s.trim())
                .filter(Boolean),
            );
          } else if (label.startsWith("affiliation")) {
            affiliations.push(value);
          } else if (label.startsWith("abstract")) {
            abstract = value;
            mode = "abstract";
          } else if (label.startsWith("keyword") || label === "index terms") {
            keywords.push(
              ...value
                .split(/[,;]/)
                .map((s) => s.trim())
                .filter(Boolean),
            );
          }
        }
        if (authors.length || affiliations.length || abstract) continue;
      }

      // Fallback heuristics for unlabeled content
      if (
        /@/.test(text) ||
        (/^[A-Z][a-z]+ [A-Z]/.test(text) && text.length < 250 && authors.length < 3)
      ) {
        const parts = text
          .split(/[,;]| and /i)
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length && /[A-Z][a-z]+/.test(parts[0])) {
          authors.push(...parts.filter((p) => /^[A-Z]/.test(p) && p.length < 80));
          continue;
        }
      }
      if (/university|institute|department|laboratory|college/i.test(text)) {
        affiliations.push(text);
        continue;
      }
    }

    // Abstract heading
    if (tag.startsWith("h") && ABSTRACT_HEADING.test(text)) {
      mode = "abstract";
      continue;
    }
    if (mode === "abstract" && tag === "p") {
      if (KEYWORDS_HEADING.test(text)) {
        keywords = text
          .replace(KEYWORDS_HEADING, "")
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
        mode = "body";
        continue;
      }
      abstract += (abstract ? " " : "") + text;
      continue;
    }

    // References section
    if (tag.startsWith("h") && REF_HEADINGS.test(text)) {
      mode = "refs";
      continue;
    }
    if (mode === "refs") {
      if (tag === "p" || tag === "li") {
        references.push(text);
      } else if (tag === "ol" || tag === "ul") {
        Array.from(el.querySelectorAll("li")).forEach((li) =>
          references.push((li.textContent || "").trim()),
        );
      }
      continue;
    }

    // Headings
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const level = parseInt(tag[1]) as 1 | 2 | 3;
      currentSection = { heading: text, blocks: [] };
      sections.push(currentSection);
      mode = "body";
      continue;
    }

    // Tables
    if (tag === "table") {
      const rows: string[][] = Array.from(el.querySelectorAll("tr")).map((tr) =>
        Array.from(tr.querySelectorAll("th,td")).map((c) => (c.textContent || "").trim()),
      );
      tables.push(rows);
      pushBlock({ type: "table", rows });
      mode = mode === "front" ? "body" : mode;
      continue;
    }

    // Lists
    if (tag === "ul" || tag === "ol") {
      const items = Array.from(el.querySelectorAll("li")).map((li) =>
        (li.textContent || "").trim(),
      );
      pushBlock({ type: "list", ordered: tag === "ol", items });
      continue;
    }

    // Figures (images)
    const img = tag === "img" ? el : el.querySelector?.("img");
    if (img) {
      const src = (img as HTMLImageElement).getAttribute("src") || "";
      const caption = /^(figure|fig\.)/i.test(text) ? text : undefined;
      figures.push({ src, caption });
      pushBlock({ type: "figure", src, caption });
      continue;
    }

    // Paragraph
    if (tag === "p") {
      // Caption detection
      if (/^(figure|fig\.|table)\s*\d/i.test(text) && currentSection?.blocks.length) {
        const last = currentSection.blocks[currentSection.blocks.length - 1];
        if (last.type === "figure" && !last.caption) last.caption = text;
      }
      pushBlock({ type: "paragraph", text });
      mode = mode === "front" ? "body" : mode;
    }
  }

  if (!title) title = "Untitled Manuscript";
  if (!authors.length) authors.push("Unknown Author");

  return {
    title,
    authors,
    affiliations,
    abstract,
    keywords,
    sections,
    references,
    figures,
    tables,
    rawHtml: html,
  };
}
