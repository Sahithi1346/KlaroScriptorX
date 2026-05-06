import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { saveAs } from "file-saver";
import { parseDocx, type ParsedDoc } from "@/lib/docParser";
import { TEMPLATES, type TemplateId } from "@/lib/templates";
import { generateDocx } from "@/lib/docxGenerator";
import { generatePdf } from "@/lib/pdfGenerator";

type Stage = "idle" | "parsing" | "ready" | "exporting";

export function ManuscriptStudio() {
  const [stage, setStage] = useState<Stage>("idle");
  const [parsed, setParsed] = useState<ParsedDoc | null>(null);
  const [fileName, setFileName] = useState("");
  const [template, setTemplate] = useState<TemplateId>("ieee");
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [fontSize, setFontSize] = useState("10");
  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [hasBorders, setHasBorders] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Please upload a .docx file (legacy .doc is not supported).");
      return;
    }
    try {
      setStage("parsing");
      setFileName(file.name);
      const result = await parseDocx(file);
      setParsed(result);
      setStage("ready");
    } catch (e: any) {
      setError(e?.message ?? "Failed to parse document.");
      setStage("idle");
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const exportDocx = async () => {
    if (!parsed) return;
    setStage("exporting");
    try {
      const blob = await generateDocx(parsed, TEMPLATES[template], {
        fontFamily,
        fontSize,
        hasBorders,
      });
      saveAs(blob, `${parsed.title.slice(0, 40).replace(/[^\w]+/g, "_")}_${template}.docx`);
    } finally {
      setStage("ready");
    }
  };

  const exportPdf = async () => {
    if (!parsed) return;
    setStage("exporting");
    try {
      const blob = generatePdf(parsed, TEMPLATES[template], { fontFamily, fontSize, hasBorders });
      saveAs(blob, `${parsed.title.slice(0, 40).replace(/[^\w]+/g, "_")}_${template}.pdf`);
    } finally {
      setStage("ready");
    }
  };

  const reset = () => {
    setParsed(null);
    setFileName("");
    setStage("idle");
    setError(null);
  };

  return (
    <section id="studio" className="mx-auto max-w-[1400px] px-6 py-16">
      <AnimatePresence>
        {stage === "idle" || stage === "parsing" ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              className={`paper-surface block cursor-pointer rounded-2xl border-2 border-dashed p-16 text-center transition-all ${
                drag ? "border-accent scale-[1.01]" : "border-rule"
              }`}
            >
              <input
                type="file"
                accept=".docx"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h2 className="font-display text-3xl text-balance">
                {stage === "parsing" ? "Reading your manuscript…" : "Drop your DOCX here"}
              </h2>
              <p className="mt-3 text-muted-foreground">
                {stage === "parsing"
                  ? `Analyzing ${fileName}`
                  : "or click to browse — we'll detect the title, authors, abstract, sections, tables, figures, and references."}
              </p>
              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            </label>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="relative z-10 flex flex-col bg-background rounded-3xl border border-rule shadow-2xl overflow-hidden min-h-[85vh]"
          >
            {/* Header for fixed studio */}
            <nav className="flex items-center justify-between border-b border-rule px-6 py-3 bg-card/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <img
                  src="/logo_transparent_v4.png?v=4"
                  className="h-8 w-8 object-contain"
                  alt="KlaroScriptorX Logo"
                />
                <div>
                  <h1 className="text-sm font-semibold leading-none">KlaroScriptor Studio</h1>
                  <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                    KlaroScriptorX Professional
                  </p>
                </div>
              </div>
            </nav>

            <div className="flex-1 overflow-hidden grid lg:grid-cols-[1fr_320px]">
              {/* Preview Scrollable */}
              <div className="overflow-y-auto bg-muted/30 p-8 flex justify-center">
                <article
                  className={`paper-surface mx-auto rounded-xl shadow-2xl transition-all ${
                    hasBorders ? "border-[12px] border-double border-accent/10" : ""
                  }`}
                  style={{
                    width: "100%",
                    maxWidth: "850px",
                    minHeight: "1100px",
                    fontFamily: fontFamily.includes(" ") ? `'${fontFamily}'` : fontFamily,
                    fontSize: `${fontSize}pt`,
                    columnCount: TEMPLATES[template].columns,
                    columnGap: "2.5rem",
                    lineHeight: (TEMPLATES[template].lineSpacing / 240) * 1.1,
                    textAlign: template === "apa" ? "left" : "justify",
                    padding: "2.5rem 3rem",
                  }}
                >
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                 #preview-content p { 
                   text-indent: ${template === "apa" ? "1.5rem" : "0"}; 
                   margin-bottom: ${template === "apa" ? "0" : "1em"};
                   line-height: ${template === "apa" ? "2" : "1.5"};
                 }
                 #preview-content .reference-item {
                   padding-left: ${template === "apa" ? "1.5rem" : "0"};
                   text-indent: ${template === "apa" ? "-1.5rem" : "0"};
                   margin-bottom: 0.75rem;
                 }
                 #preview-content h1, #preview-content h2, #preview-content h3 { 
                   text-indent: 0; 
                   line-height: 1.2;
                   margin-bottom: 1rem;
                   color: hsl(var(--foreground));
                   font-family: var(--font-display);
                 }
               `,
                    }}
                  />
                  <div id="preview-content">
                    {/* Structural Header Differences */}
                    {template === "ieee" && (
                      <header
                        className="border-b-2 border-double border-rule pb-10 text-center"
                        style={{ columnSpan: "all" }}
                      >
                        <h1 className="font-display text-[2.4em] leading-tight text-balance font-bold uppercase tracking-tight">
                          {parsed!.title}
                        </h1>
                        <div className="mt-8 flex flex-wrap justify-center gap-x-12 gap-y-4">
                          {parsed!.authors.map((author, idx) => (
                            <div key={idx} className="text-center">
                              <p className="text-[1.1em] font-bold">{author}</p>
                              <p className="max-w-[200px] text-[0.8em] italic text-muted-foreground leading-tight">
                                {parsed!.affiliations[idx] || parsed!.affiliations[0] || ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      </header>
                    )}

                    {template === "springer" && (
                      <header className="mb-10 text-center" style={{ columnSpan: "all" }}>
                        <h1 className="font-display text-[2em] font-bold leading-tight">
                          {parsed!.title}
                        </h1>
                        <p className="mt-4 text-[1.1em] font-medium tracking-wide">
                          {parsed!.authors.join(", ")}
                        </p>
                        <div className="mt-2 text-[0.9em] italic text-muted-foreground">
                          {parsed!.affiliations.map((aff, i) => (
                            <p key={i}>{aff}</p>
                          ))}
                        </div>
                      </header>
                    )}

                    {template === "apa" && (
                      <header className="mb-20 text-center" style={{ columnSpan: "all" }}>
                        <h1 className="font-display text-[1.5em] font-bold mb-10">
                          {parsed!.title}
                        </h1>
                        <div className="space-y-1">
                          {parsed!.authors.map((a, i) => (
                            <p key={i} className="text-[1.1em]">
                              {a}
                            </p>
                          ))}
                          <div className="pt-2 italic text-muted-foreground">
                            {parsed!.affiliations.join(", ")}
                          </div>
                        </div>
                        <div className="mt-16 border-t border-rule pt-8 text-left">
                          <p className="text-[0.9em] font-bold">Author Note</p>
                          <p className="text-[0.85em] text-muted-foreground">
                            This manuscript is prepared according to APA 7th edition guidelines.
                          </p>
                        </div>
                      </header>
                    )}

                    {parsed!.abstract && (
                      <div className="mt-8 mb-10" style={{ columnSpan: "all" }}>
                        <h3
                          className={`${template === "ieee" ? "font-bold italic uppercase" : "font-bold"} mb-2 text-[1.1em]`}
                        >
                          {template === "ieee"
                            ? "Abstract"
                            : template === "apa"
                              ? "Abstract"
                              : "Abstract."}
                        </h3>
                        <p className={`${template === "ieee" ? "font-bold" : ""} leading-relaxed`}>
                          {parsed!.abstract}
                        </p>
                      </div>
                    )}

                    <div className="mt-12 space-y-10">
                      {parsed!.sections.map((s, i) => (
                        <div key={i} style={{ breakInside: "avoid-column" }}>
                          <h2 className="font-display text-[1.4em] font-bold border-b border-rule pb-2 mb-4 uppercase tracking-wide">
                            {i + 1}. {s.heading}
                          </h2>
                          <div className="space-y-4 text-[1em] leading-relaxed">
                            {s.blocks.map((b, j) => {
                              if (b.type === "paragraph")
                                return (
                                  <p key={j} className="text-muted-foreground">
                                    {b.text}
                                  </p>
                                );
                              if (b.type === "list")
                                return (
                                  <ul key={j} className="list-disc pl-5 text-muted-foreground">
                                    {b.items.map((it, k) => (
                                      <li key={k}>{it}</li>
                                    ))}
                                  </ul>
                                );
                              if (b.type === "table")
                                return (
                                  <div
                                    key={j}
                                    className="my-6 overflow-hidden rounded-lg border border-rule bg-card/30"
                                    style={{ breakInside: "avoid" }}
                                  >
                                    <table className="w-full border-collapse text-[0.85em]">
                                      <thead>
                                        <tr className="bg-muted/50">
                                          {b.rows[0].map((c, ci) => (
                                            <th
                                              key={ci}
                                              className="border-b border-rule px-3 py-2 text-left font-semibold"
                                            >
                                              {c}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {b.rows.slice(1).map((row, r) => (
                                          <tr
                                            key={r}
                                            className="border-b border-rule last:border-0 hover:bg-muted/20 transition-colors"
                                          >
                                            {row.map((c, ci) => (
                                              <td key={ci} className="px-3 py-2">
                                                {c}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              if (b.type === "figure")
                                return (
                                  <div key={j} className="space-y-2">
                                    {b.src && (
                                      <img
                                        src={b.src}
                                        alt={b.caption || "Manuscript figure"}
                                        className="mx-auto max-h-[400px] rounded-lg shadow-sm"
                                      />
                                    )}
                                    <p className="text-center text-[0.75em] italic text-muted-foreground">
                                      {b.caption || "[Figure]"}
                                    </p>
                                  </div>
                                );
                              return null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {parsed!.references.length > 0 && (
                      <div
                        className="mt-12 border-t border-rule pt-8"
                        style={{ columnSpan: "all" }}
                      >
                        <h3 className="font-display text-[1.25em] font-bold mb-4">References</h3>
                        <div
                          className={`space-y-2 text-[0.85em] text-muted-foreground ${template === "apa" ? "" : "list-decimal"}`}
                        >
                          {parsed!.references.map((r, i) => (
                            <div key={i} className="reference-item">
                              {template !== "apa" && <span className="mr-2">{i + 1}.</span>}
                              {r}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              </div>

              {/* Side panel */}
              <aside className="border-l border-rule bg-card overflow-y-auto p-6 space-y-6">
                <div className="rounded-xl border border-rule bg-card p-5">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Source</p>
                  <p className="mt-1 truncate font-medium">{fileName}</p>
                  <button onClick={reset} className="mt-3 text-xs text-accent hover:underline">
                    ← Upload a different file
                  </button>
                </div>

                <div className="rounded-xl border border-rule bg-card p-5">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Detected
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Sections" value={parsed!.sections.length} />
                    <Stat label="References" value={parsed!.references.length} />
                    <Stat label="Tables" value={parsed!.tables.length} />
                    <Stat label="Figures" value={parsed!.figures.length} />
                  </dl>
                </div>

                <div className="rounded-xl border border-rule bg-card p-5">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Template
                  </p>
                  <div className="mt-3 space-y-2">
                    {Object.values(TEMPLATES).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTemplate(t.id);
                          setFontFamily(t.font);
                          setFontSize((t.bodySize / 2).toString());
                        }}
                        className={`w-full rounded-lg border p-3 text-left transition-all ${
                          template === t.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-rule hover:border-accent/50"
                        }`}
                      >
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-rule bg-card p-5">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Formatting
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Font Family
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="w-full rounded-md border border-rule bg-background px-3 py-1.5 text-sm outline-none transition focus:border-accent"
                      >
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Arial">Arial</option>
                        <option value="Calibri">Calibri</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Playfair Display">Playfair Display</option>
                        <option value="Montserrat">Montserrat</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Font Size
                        </label>
                        <select
                          value={fontSize}
                          onChange={(e) => setFontSize(e.target.value)}
                          className="w-full rounded-md border border-rule bg-background px-3 py-1.5 text-sm outline-none transition focus:border-accent"
                        >
                          {[10, 11, 12, 14, 16].map((size) => (
                            <option key={size} value={size}>
                              {size}pt
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Page Borders
                        </label>
                        <div className="flex rounded-md border border-rule p-0.5">
                          <button
                            onClick={() => setHasBorders(true)}
                            className={`flex-1 rounded py-1 text-xs font-medium transition ${
                              hasBorders ? "bg-accent text-accent-foreground" : "hover:bg-accent/10"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setHasBorders(false)}
                            className={`flex-1 rounded py-1 text-xs font-medium transition ${
                              !hasBorders
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/10"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={exportDocx}
                    disabled={stage === "exporting"}
                    className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-50"
                  >
                    {stage === "exporting" ? "Generating…" : "Download .DOCX"}
                  </button>
                  <button
                    onClick={exportPdf}
                    disabled={stage === "exporting"}
                    className="w-full rounded-lg border border-primary px-4 py-3 font-medium text-primary transition hover:bg-primary/5 disabled:opacity-50"
                  >
                    Download .PDF
                  </button>
                </div>
              </aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-2xl">{value}</dd>
    </div>
  );
}
