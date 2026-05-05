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
  const [fontSize, setFontSize] = useState("12");
  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [hasBorders, setHasBorders] = useState(false);
  
  useEffect(() => {
    if (stage === "ready") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [stage]);

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
      const blob = await generateDocx(parsed, TEMPLATES[template], { fontFamily, fontSize, hasBorders });
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
    <section id="studio" className="mx-auto max-w-6xl px-6 py-16">
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
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex flex-col bg-background overflow-hidden"
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
                  <h1 className="text-sm font-semibold leading-none">Manuscript Studio</h1>
                  <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">KlaroScriptorX Professional</p>
                </div>
              </div>
              <button 
                onClick={reset}
                className="rounded-full bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
              >
                Exit Studio
              </button>
            </nav>

            <div className="flex-1 overflow-hidden grid lg:grid-cols-[1fr_360px]">
              {/* Preview Scrollable */}
              <div className="overflow-y-auto bg-muted/30 p-8 flex justify-center">
            <article 
              className={`paper-surface rounded-xl px-12 py-14 transition-all ${
                hasBorders ? "border-[12px] border-double border-accent/10" : ""
              }`}
              style={{ 
                fontFamily: fontFamily.includes(" ") ? `'${fontFamily}'` : fontFamily,
                fontSize: `${fontSize}pt`,
                columnCount: TEMPLATES[template].columns,
                columnGap: "2rem",
                lineHeight: TEMPLATES[template].lineSpacing / 240,
                textAlign: template === "apa" ? "left" : "justify",
                padding: `${TEMPLATES[template].margin / 20}px`,
              }}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                #preview-content p { 
                  text-indent: ${template === "apa" ? "2em" : "0"}; 
                  margin-bottom: ${template === "apa" ? "0" : "1em"};
                }
                #preview-content h1, #preview-content h3 { text-indent: 0; }
              `}} />
              <div id="preview-content">
                <header className="border-b border-rule pb-6 text-center" style={{ columnSpan: "all" }}>
                <h1 className="font-display text-[2em] leading-tight text-balance">{parsed!.title}</h1>
                <p className="mt-3 text-[1em]">{parsed!.authors.join(", ")}</p>
                {parsed!.affiliations.length > 0 && (
                  <p className="mt-1 text-[0.85em] italic text-muted-foreground">
                    {parsed!.affiliations.join(" • ")}
                  </p>
                )}
              </header>

              {parsed!.abstract && (
                <div className="mt-6" style={{ columnSpan: "all" }}>
                  <h3 className="font-display text-[1.25em]">Abstract</h3>
                  <p className="mt-2 text-[1em] italic leading-relaxed text-muted-foreground">
                    {parsed!.abstract}
                  </p>
                </div>
              )}
              {parsed!.keywords.length > 0 && (
                <p className="mt-3 text-[1em]" style={{ columnSpan: "all" }}>
                  <span className="font-semibold">Keywords:</span> {parsed!.keywords.join(", ")}
                </p>
              )}

              <div className="mt-8 space-y-6">
                {parsed!.sections.slice(0, 6).map((s, i) => (
                  <div key={i}>
                    <h3 className="font-display text-[1.25em]">{s.heading}</h3>
                    <div className="mt-2 space-y-2 text-[1em] leading-relaxed">
                      {s.blocks.slice(0, 3).map((b, j) => {
                        if (b.type === "paragraph")
                          return (
                            <p key={j} className="text-muted-foreground">
                              {b.text.slice(0, 240)}
                              {b.text.length > 240 && "…"}
                            </p>
                          );
                        if (b.type === "list")
                          return (
                            <ul key={j} className="list-disc pl-5 text-muted-foreground">
                              {b.items.slice(0, 3).map((it, k) => (
                                <li key={k}>{it}</li>
                              ))}
                            </ul>
                          );
                        if (b.type === "table")
                          return (
                            <div key={j} className="overflow-x-auto rounded border border-rule text-[0.75em]">
                              <table className="w-full">
                                <tbody>
                                  {b.rows.slice(0, 4).map((row, r) => (
                                    <tr key={r} className={r === 0 ? "bg-muted font-semibold" : ""}>
                                      {row.map((c, ci) => (
                                        <td key={ci} className="border border-rule px-2 py-1">
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
                <div className="mt-8 border-t border-rule pt-6">
                  <h3 className="font-display text-[1.25em]">References ({parsed!.references.length})</h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-[0.75em] text-muted-foreground">
                    {parsed!.references.slice(0, 5).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ol>
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
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Detected</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Sections" value={parsed!.sections.length} />
                  <Stat label="References" value={parsed!.references.length} />
                  <Stat label="Tables" value={parsed!.tables.length} />
                  <Stat label="Figures" value={parsed!.figures.length} />
                </dl>
              </div>

              <div className="rounded-xl border border-rule bg-card p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Template</p>
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
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Formatting</p>
                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Font Family</label>
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
                      <label className="text-xs font-medium text-muted-foreground">Font Size</label>
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
                      <label className="text-xs font-medium text-muted-foreground">Page Borders</label>
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
                            !hasBorders ? "bg-accent text-accent-foreground" : "hover:bg-accent/10"
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
