"use client";

import { useMemo, useState } from "react";
import { FileCode } from "lucide-react";
import hljs from "@/lib/coloration";
import { BlocExpansible } from "./BlocExpansible";

// Extensions de code reconnues -> langage highlight.js. Un fichier de
// code livré seul (voir le fix backend generation_code.py, 2026-07-20 :
// un .py seul n'est plus forcé dans un .zip) se déroule dans le fil au
// clic (voir BlocExpansible.tsx) -- plus de panneau latéral, retiré à la
// demande de Bourama.
const LANGAGE_PAR_EXTENSION: Record<string, string> = {
  py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  html: "xml", css: "css", sh: "bash", bash: "bash", sql: "sql", java: "java", c: "c",
  cpp: "cpp", go: "go", rs: "rust", php: "php", rb: "ruby", yml: "yaml", yaml: "yaml",
  md: "markdown", toml: "ini",
};

export function extensionCode(href: string): string | null {
  const match = href.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  return ext && ext in LANGAGE_PAR_EXTENSION ? ext : null;
}

export function FichierCode({ href, nom }: { href: string; nom: string }) {
  const [contenu, setContenu] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);

  const extension = extensionCode(href) || "";
  const langage = LANGAGE_PAR_EXTENSION[extension] || "plaintext";

  const html = useMemo(() => {
    if (!contenu) return "";
    try {
      return hljs.getLanguage(langage) ? hljs.highlight(contenu, { language: langage }).value : hljs.highlightAuto(contenu).value;
    } catch {
      return contenu.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    }
  }, [contenu, langage]);

  async function charger() {
    setChargement(true);
    try {
      const reponse = await fetch(href);
      if (!reponse.ok) throw new Error();
      setContenu(await reponse.text());
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }

  return (
    <BlocExpansible
      titre={nom}
      icone={FileCode}
      sousTitre={extension}
      chargement={chargement}
      texteACopier={contenu || undefined}
      hrefTelechargement={href}
      onPremiereOuverture={charger}
      enfant={
        erreur ? (
          <p className="px-1 py-4 text-center text-xs text-dj-texte-muet">Aperçu indisponible -- utilise Télécharger.</p>
        ) : contenu !== null ? (
          <pre className="overflow-x-auto rounded-lg bg-[#100c09] px-4 py-3 font-mono text-[13px] leading-relaxed">
            <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
        ) : null
      }
    />
  );
}
