"use client";

import { Download } from "lucide-react";

const EXTENSIONS_AUDIO = ["mp3", "wav", "ogg", "m4a"];
const EXTENSIONS_VIDEO = ["mp4", "webm", "mov"];

export function typeMedia(href: string): "audio" | "video" | null {
  const ext = href.split("?")[0].split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (EXTENSIONS_AUDIO.includes(ext)) return "audio";
  if (EXTENSIONS_VIDEO.includes(ext)) return "video";
  return null;
}

// Lecteur natif HTML5 (pas de dépendance externe) pour les liens markdown
// qui pointent vers un fichier audio/vidéo -- le composant `a` custom de
// BulleMessage.tsx bascule ici quand `typeMedia()` reconnaît l'extension.
//
// Note .mov (2026-07-23) : Chrome/Firefox ne lisent pas nativement le
// codec le plus courant des .mov (QuickTime/H.264 dans un conteneur MOV
// mal supporté hors Safari) -- le <video> peut donc rester silencieux
// même avec un lien qui fonctionne. Pas de vrai correctif possible côté
// lecteur HTML5 pur (demanderait une conversion serveur) ; le bouton
// télécharger ci-dessous reste la solution de repli fiable dans ce cas.
export function LecteurMedia({ href, type }: { href: string; type: "audio" | "video" }) {
  async function telecharger() {
    try {
      const reponse = await fetch(href);
      const blob = await reponse.blob();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = href.split("/").pop()?.split("?")[0] || (type === "audio" ? "audio" : "video");
      lien.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(href, "_blank");
    }
  }

  return (
    <span className="my-2 block animate-dj-fade-in overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface p-2">
      <span className="flex items-center gap-2">
        {type === "audio" ? (
          <audio controls src={href} style={{ colorScheme: "dark" }} className="w-full" />
        ) : (
          <video controls src={href} style={{ colorScheme: "dark" }} className="max-h-80 w-full rounded-lg" />
        )}
        <button
          onClick={telecharger}
          aria-label="Télécharger"
          className="shrink-0 rounded-lg p-1.5 text-dj-texte-muet transition-colors hover:text-dj-texte"
        >
          <Download size={16} />
        </button>
      </span>
    </span>
  );
}
