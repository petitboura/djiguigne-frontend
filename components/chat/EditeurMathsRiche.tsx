"use client";

/**
 * Éditeur riche "texte + maths live", à part du composer principal
 * (01/08, demande Bourama : "un éditeur de latex live, un vrai, comme
 * barre de saisie à part, pas touche au clavier existant" + dictée maths
 * en parallèle, "le C" -- option retenue plutôt que le composeur segmenté
 * "option B", voir échange du 01/08 pour la comparaison).
 *
 * TipTap (ProseMirror) + StarterKit pour le texte, plus le noeud custom
 * `maths` (MathNode.tsx, un `<math-field>` MathLive live par formule).
 * Un seul point de sortie : `onInserer(texteSerialise)`, appelé au clic
 * sur "Insérer dans le message" -- le document est alors aplati en
 * `texte $latex$ texte $latex$...`, le même format `$...$` que le
 * composer principal sait déjà afficher (segmenterTexteAvecFormules dans
 * BarreDeSaisie.tsx) et que le backend attend déjà pour le rendu KaTeX
 * des réponses. Rien d'autre n'est partagé avec le composer existant --
 * ce fichier ne connaît même pas son état interne.
 *
 * Dictée maths (01/08) : "étape 1" retenue plutôt qu'un vrai streaming
 * ASR live (voir échange du 01/08) -- réutilise le MÊME enregistrement
 * par lot que la dictée classique (transcrireAudioChat, déjà en place,
 * non modifié), mais fait passer le résultat dans
 * texteParleVersLatex.ts avant de l'insérer, DANS une formule live
 * plutôt qu'en texte brut. Pas de vrai live pendant que la personne
 * parle -- limite connue, assumée pour cette première version.
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { X, Sigma, Mic, Square, Check } from "lucide-react";
import { NoeudMaths } from "./MathNode";
import { transcrireAudioChat } from "@/lib/api";
import { texteParleVersLatex } from "@/lib/texteParleVersLatex";

/** Sérialise le document TipTap en `texte $latex$ texte...` -- l'inverse
 * de ce que segmenterTexteAvecFormules (BarreDeSaisie.tsx) sait lire. */
function serialiserDocument(doc: any): string {
  let resultat = "";
  function parcourir(noeud: any) {
    if (noeud.type === "text") {
      resultat += noeud.text ?? "";
    } else if (noeud.type === "maths") {
      const latex = (noeud.attrs?.latex ?? "").trim();
      if (latex) resultat += `$${latex}$`;
    } else if (noeud.type === "paragraph") {
      if (resultat && !resultat.endsWith("\n")) resultat += "\n";
      (noeud.content ?? []).forEach(parcourir);
    } else {
      (noeud.content ?? []).forEach(parcourir);
    }
  }
  (doc.content ?? []).forEach(parcourir);
  return resultat.trim();
}

export function EditeurMathsRiche({
  onFermer,
  onInserer,
}: {
  onFermer: () => void;
  onInserer: (texte: string) => void;
}) {
  const [dictant, setDictant] = useState(false);
  const [transcriptionEnCours, setTranscriptionEnCours] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const editor = useEditor({
    extensions: [StarterKit, NoeudMaths],
    content: "<p></p>",
    immediatelyRender: false,
  });

  function inserdFormuleVide() {
    editor?.chain().focus().insertContent({ type: "maths", attrs: { latex: "" } }).run();
  }

  async function demarrerDicteeMaths() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((piste) => piste.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setTranscriptionEnCours(true);
        try {
          const fichierAudio = new File([blob], "dictee-maths.webm", { type: blob.type });
          const { texte: transcrit } = await transcrireAudioChat(fichierAudio);
          const latex = texteParleVersLatex(transcrit);
          // Insère directement une formule LIVE avec le LaTeX déduit --
          // pas du texte brut : la personne retrouve tout de suite un
          // <math-field> éditable/corrigeable, pas une phrase à retaper.
          editor?.chain().focus().insertContent({ type: "maths", attrs: { latex } }).run();
        } catch (e) {
          alert(e instanceof Error ? e.message : "Erreur de transcription.");
        } finally {
          setTranscriptionEnCours(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setDictant(true);
    } catch {
      alert("Micro indisponible ou refusé.");
    }
  }

  function arreterDicteeMaths() {
    mediaRecorderRef.current?.stop();
    setDictant(false);
  }

  function inserer() {
    if (!editor) return;
    const texte = serialiserDocument(editor.getJSON() as any);
    if (texte) onInserer(texte);
    else onFermer();
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-dj-fade-in flex-col bg-dj-fond p-4 sm:p-6">
      <div className="flex items-center justify-between pb-4">
        <span className="text-sm text-dj-texte-muet">Éditeur maths live -- texte et formules, à part du clavier normal</span>
        <button
          onClick={onFermer}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-dj-texte-muet hover:bg-dj-surface"
        >
          <X size={14} /> Fermer
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={inserdFormuleVide}
          className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-sm text-dj-texte transition-colors hover:bg-dj-surface"
        >
          <Sigma size={16} /> Insérer une formule
        </button>

        {!dictant ? (
          <button
            onClick={demarrerDicteeMaths}
            disabled={transcriptionEnCours}
            className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-sm text-dj-texte transition-colors hover:bg-dj-surface disabled:opacity-60"
          >
            <Mic size={16} /> {transcriptionEnCours ? "Conversion en cours..." : "Dicter une formule"}
          </button>
        ) : (
          <button
            onClick={arreterDicteeMaths}
            className="flex animate-pulse items-center gap-1.5 rounded-lg border border-red-500 px-3 py-1.5 text-sm text-red-500"
          >
            <Square size={14} /> Arrêter la dictée
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-dj-bordure bg-dj-surface p-4">
        <EditorContent
          editor={editor}
          className="prose prose-invert max-w-none text-dj-texte [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          onClick={inserer}
          className="flex items-center gap-1.5 rounded-lg bg-dj-accent-1 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Check size={16} /> Insérer dans le message
        </button>
      </div>
    </div>
  );
}
