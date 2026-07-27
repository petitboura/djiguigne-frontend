"use client";

import { useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Download, Check } from "lucide-react";

// Rend un bloc ```chart du markdown -- convention documentée dans la
// page Notion "IA Conversationnelle" (section Affichage > Graphiques de
// données) : le modèle écrit du JSON structuré, schéma fixe :
//   { "type": "line" | "bar" | "pie", "data": [{...}], "labels"?: {...} }
// "data" : un tableau d'objets plats, une clé par série. Pour line/bar,
// la première clé sert d'axe X, les suivantes sont tracées comme séries.
// Pour pie, on attend {name, value}.
//
// Le prompt système (djiguigne-backend) doit documenter cette
// convention pour que le modèle la respecte -- ce composant ne fait que
// le rendu, il ne peut pas deviner un format non respecté (dans ce cas :
// message d'erreur discret, jamais de JSON brut affiché).
const COULEURS = ["#E8934A", "#C1440E", "#F2A65A", "#8A2E0A", "#A79A8C"];

type Chart = {
  type: "line" | "bar" | "pie";
  data: Record<string, string | number>[];
  titre?: string;
};

// Export PNG ajouté le 27/07 (demande de Bourama, cas d'usage maths :
// avoir un fichier image du graphique, pas seulement le voir dans le
// chat) : 100% côté navigateur, aucune dépendance ajoutée. Le SVG rendu
// par recharts est cloné, sérialisé, dessiné sur un <canvas> (fond
// dj-surface pour rester lisible hors du thème sombre de l'app), puis
// exporté en PNG. Différent du bloc `chart` lui-même : celui-ci reste
// interactif dans le fil, le PNG est un instantané figé téléchargeable.
export function telechargerImage(
  conteneur: HTMLDivElement | null,
  nomFichier: string,
  onSucces: () => void
) {
  // Deuxième bug corrigé le 27/07 (toujours repéré par Bourama : PNG de
  // 28x28 cette fois) -- exclure seulement les icônes lucide (".lucide")
  // ne suffisait pas : recharts donne la MÊME classe "recharts-surface"
  // aux petites icônes de légende (14x14, une par série) qu'au graphique
  // principal, donc un filtre par classe reste fragile. Solution plus
  // robuste : on prend TOUS les <svg> du conteneur, on écarte les icônes
  // lucide, puis on choisit le plus GRAND par surface -- le vrai
  // graphique est toujours largement plus grand que n'importe quelle
  // icône (légende, bouton, tooltip), quelle que soit la lib utilisée.
  const candidats = Array.from(conteneur?.querySelectorAll("svg") ?? []).filter(
    (el) => !el.classList.contains("lucide")
  );
  const svgEl = candidats.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return rb.width * rb.height - ra.width * ra.height;
  })[0];
  if (!svgEl) return;
  const { width, height } = svgEl.getBoundingClientRect();
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const echelle = 2; // export en meilleure résolution que l'écran (rétina)
    const canvas = document.createElement("canvas");
    canvas.width = width * echelle;
    canvas.height = height * echelle;
    const ctx = canvas.getContext("2d");
    URL.revokeObjectURL(url);
    if (!ctx) return;
    ctx.fillStyle = "#161210";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(echelle, echelle);
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const lienUrl = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = lienUrl;
      lien.download = nomFichier;
      lien.click();
      URL.revokeObjectURL(lienUrl);
      onSucces();
    }, "image/png");
  };
  img.src = url;
}

export function GraphiqueDonnees({ code }: { code: string }) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [telecharge, setTelecharge] = useState(false);
  let chart: Chart | null = null;
  try {
    chart = JSON.parse(code);
  } catch {
    // JSON incomplet -- probablement encore en cours de streaming, voir
    // le throttling dans BulleMessage.tsx qui limite la fréquence de
    // parsing. Pas d'erreur affichée, juste une attente discrète.
    return (
      <div className="my-3 flex h-40 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface text-xs text-dj-texte-muet">
        <span className="h-2 w-2 animate-dj-glow rounded-full bg-dj-accent-1" />
        <span className="ml-2">Construction du graphique...</span>
      </div>
    );
  }

  if (!chart || !Array.isArray(chart.data) || chart.data.length === 0) {
    return (
      <div className="my-3 rounded-xl border border-dj-bordure bg-dj-surface p-4 text-xs text-dj-texte-muet">
        Graphique invalide (format non reconnu).
      </div>
    );
  }

  const cleAxeX = Object.keys(chart.data[0])[0];
  const clesSeries = Object.keys(chart.data[0]).filter((c) => c !== cleAxeX);

  return (
    <div
      ref={conteneurRef}
      className="my-3 animate-dj-fade-in rounded-xl border border-dj-bordure bg-dj-surface p-4"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {chart.titre ? (
          <p className="text-sm font-semibold text-dj-texte">{chart.titre}</p>
        ) : (
          <span />
        )}
        <button
          onClick={() =>
            telechargerImage(
              conteneurRef.current,
              `${chart?.titre ? chart.titre.replace(/[^a-z0-9-_]+/gi, "_") : "graphique"}.png`,
              () => {
                setTelecharge(true);
                setTimeout(() => setTelecharge(false), 1500);
              }
            )
          }
          aria-label="Télécharger le graphique en image"
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte"
        >
          {telecharge ? (
            <>
              <Check size={12} /> Téléchargé
            </>
          ) : (
            <>
              <Download size={12} /> Télécharger
            </>
          )}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        {chart.type === "pie" ? (
          <PieChart>
            <Pie
              data={chart.data}
              dataKey={clesSeries[0] || "value"}
              nameKey={cleAxeX}
              outerRadius={90}
              label
            >
              {chart.data.map((_, index) => (
                <Cell key={index} fill={COULEURS[index % COULEURS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "#1E1813", border: "1px solid rgba(255,255,255,0.08)" }} />
            <Legend />
          </PieChart>
        ) : chart.type === "bar" ? (
          <BarChart data={chart.data}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey={cleAxeX} stroke="#A79A8C" fontSize={12} />
            <YAxis stroke="#A79A8C" fontSize={12} />
            <Tooltip contentStyle={{ background: "#1E1813", border: "1px solid rgba(255,255,255,0.08)" }} />
            <Legend />
            {clesSeries.map((cle, index) => (
              <Bar key={cle} dataKey={cle} fill={COULEURS[index % COULEURS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        ) : (
          <LineChart data={chart.data}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey={cleAxeX} stroke="#A79A8C" fontSize={12} />
            <YAxis stroke="#A79A8C" fontSize={12} />
            <Tooltip contentStyle={{ background: "#1E1813", border: "1px solid rgba(255,255,255,0.08)" }} />
            <Legend />
            {clesSeries.map((cle, index) => (
              <Line
                key={cle}
                type="monotone"
                dataKey={cle}
                stroke={COULEURS[index % COULEURS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
