import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ManuscriptStudio } from "@/components/ManuscriptStudio";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "KlaroScriptorX" },
      {
        name: "description",
        content:
          "Upload an unstructured DOCX manuscript and instantly map it to IEEE, Springer LNCS, or APA templates. Export polished DOCX and PDF files.",
      },
      { property: "og:title", content: "KlaroScriptorX" },
      {
        property: "og:description",
        content: "Turn raw academic drafts into publication-ready papers in seconds.",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/logo_transparent_v4.png?v=4" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo_transparent_v4.png?v=4"
            className="h-10 w-10 object-contain"
            alt="KlaroScriptorX Logo"
          />
          <span className="font-display text-xl font-semibold">KlaroScriptorX</span>
        </div>
        <a href="#studio" className="text-sm text-muted-foreground hover:text-foreground">
          Open studio →
        </a>
      </nav>

      <header className="mx-auto max-w-4xl px-6 pt-12 pb-8 text-center">
        <p className="mb-4 inline-block rounded-full border border-rule bg-card px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
          Manuscript intelligence
        </p>
        <h1 className="font-display text-5xl font-semibold leading-[1.05] text-balance md:text-7xl">
          From rough draft to <em className="text-accent not-italic">publication-ready</em> in one
          upload.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          KlaroScriptorX reads unstructured DOCX manuscripts, identifies every section, table,
          figure, and reference, then formats them to your chosen journal or conference template.
        </p>
      </header>

      <ManuscriptStudio />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Smart parsing",
              d: "Pattern-based detection of titles, authors, affiliations, abstract, keywords, headings, captions, and references.",
            },
            {
              n: "02",
              t: "Template mapping",
              d: "IEEE two-column, Springer LNCS, and APA 7th — with consistent typography, spacing, and margins.",
            },
            {
              n: "03",
              t: "Dual export",
              d: "Generate a clean .docx for further editing and a print-ready .pdf with proper headers and pagination.",
            },
          ].map((f) => (
            <motion.div
              key={f.n}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group cursor-default rounded-xl border border-rule bg-card p-6 shadow-sm transition-colors hover:border-accent/30 hover:bg-accent/[0.02]"
            >
              <p className="font-mono text-xs text-accent transition-transform group-hover:scale-110 origin-left">
                {f.n}
              </p>
              <h3 className="mt-2 font-display text-xl">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-rule py-8 text-center text-xs text-muted-foreground">
        KlaroScriptorX · Built for researchers who'd rather write than format.
      </footer>
    </main>
  );
}
