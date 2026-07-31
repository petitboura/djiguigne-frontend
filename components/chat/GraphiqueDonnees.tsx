"use client";

import { useEffect, useRef, useState } from "react";
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
// CORRECTIF 2026-07-31 (audit UX, signalé par Bourama en test réel) : la
// légende (noms des séries/parts, ex. "Banane"/"Poire"/"Pomme") disparaît
// du PNG téléchargé alors qu'elle est bien visible dans le chat. Cause :
// recharts rend sa <Legend> comme une liste HTML (<ul>), PAS comme du
// SVG -- elle vit en dehors du <svg> cloné juste au-dessus, donc jamais
// capturée par ce clonage. On dessine maintenant la légende nous-mêmes
// sur le canvas, à partir des libellés/couleurs qu'on connaît déjà côté
// composant (COULEURS, noms de séries ou de parts) -- indépendant de ce
// que recharts affiche en HTML.
function dessinerLegende(
  ctx: CanvasRenderingContext2D,
  legende: { libelle: string; couleur: string }[],
  largeurDisponible: number,
  yDepart: number
) {
  const taillePolice = 12;
  const tailleSwatch = 10;
  const espaceSwatchTexte = 5;
  const espaceEntreItems = 16;
  const hauteurLigne = 20;
  ctx.font = `${taillePolice}px Inter, sans-serif`;
  ctx.textBaseline = "middle";

  // Regroupe les items en lignes qui tiennent dans largeurDisponible
  // (retour à la ligne simple, façon flex-wrap).
  const lignes: { libelle: string; couleur: string; largeur: number }[][] = [[]];
  let largeurLigneCourante = 0;
  for (const item of legende) {
    const largeurItem = tailleSwatch + espaceSwatchTexte + ctx.measureText(item.libelle).width + espaceEntreItems;
    if (largeurLigneCourante + largeurItem > largeurDisponible && lignes[lignes.length - 1].length > 0) {
      lignes.push([]);
      largeurLigneCourante = 0;
    }
    lignes[lignes.length - 1].push({ ...item, largeur: largeurItem });
    largeurLigneCourante += largeurItem;
  }

  lignes.forEach((ligne, indexLigne) => {
    const largeurTotale = ligne.reduce((total, item) => total + item.largeur, 0) - espaceEntreItems;
    let x = (largeurDisponible - largeurTotale) / 2;
    const y = yDepart + indexLigne * hauteurLigne + hauteurLigne / 2;
    for (const item of ligne) {
      ctx.fillStyle = item.couleur;
      ctx.fillRect(x, y - tailleSwatch / 2, tailleSwatch, tailleSwatch);
      ctx.fillStyle = "#A79A8C";
      ctx.fillText(item.libelle, x + tailleSwatch + espaceSwatchTexte, y);
      x += tailleSwatch + espaceSwatchTexte + ctx.measureText(item.libelle).width + espaceEntreItems;
    }
  });

  return lignes.length * hauteurLigne;
}

export function telechargerImage(
  conteneur: HTMLDivElement | null,
  nomFichier: string,
  onSucces: () => void,
  legende?: { libelle: string; couleur: string }[]
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
    // Estimation généreuse de la place nécessaire pour la légende (une
    // seule ligne dans la quasi-totalité des cas réels -- jusqu'à 2
    // lignes courtes). LIMITE ASSUMÉE : une légende avec beaucoup de
    // séries à libellés longs peut déborder au-delà de cette estimation
    // fixe (pas de calcul dynamique de la hauteur avant de fixer la
    // taille du canvas, pour rester simple) -- acceptable pour l'usage
    // réel actuel (quelques séries/parts par graphique), à revoir si
    // Bourama rencontre ce cas en pratique.
    const hauteurLegendeEstimee = legende && legende.length > 0 ? 40 : 0;
    const canvas = document.createElement("canvas");
    canvas.width = width * echelle;
    canvas.height = (height + hauteurLegendeEstimee) * echelle;
    const ctx = canvas.getContext("2d");
    URL.revokeObjectURL(url);
    if (!ctx) return;
    ctx.fillStyle = "#161210";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(echelle, echelle);
    ctx.drawImage(img, 0, 0, width, height);
    if (legende && legende.length > 0) {
      dessinerLegende(ctx, legende, width, height + 10);
    }
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
  const [chart, setChart] = useState<Chart | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // CORRECTIF 2026-07-30 (audit UX) : avant, le JSON était re-parsé de
  // façon SYNCHRONE à chaque rendu, et le moindre échec de parsing --
  // qu'il soit transitoire (JSON encore incomplet, streaming en cours)
  // ou définitif (JSON réellement cassé) -- affichait indéfiniment
  // "Construction du graphique...", sans jamais distinguer les deux cas.
  // Même principe déjà appliqué à Mermaid.tsx (qui, lui, avait déjà été
  // corrigé) : on attend que le texte arrête de changer pendant 500ms
  // avant de tenter le parsing -- s'il échoue à ce moment-là, ce n'est
  // plus un JSON "en cours d'arrivée", c'est une vraie erreur à afficher.
  useEffect(() => {
    const delai = setTimeout(() => {
      try {
        setChart(JSON.parse(code));
        setErreur(null);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : String(e));
      }
    }, 500);
    return () => clearTimeout(delai);
  }, [code]);

  if (!chart) {
    if (erreur) {
      return (
        <div className="my-3 rounded-xl border border-dj-bordure bg-dj-surface p-4 text-xs text-dj-texte-muet">
          <span className="text-[#f87171]">Graphique invalide :</span> format JSON non reconnu.
        </div>
      );
    }
    return (
      <div className="my-3 flex h-40 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface text-xs text-dj-texte-muet">
        <span className="h-2 w-2 animate-dj-glow rounded-full bg-dj-accent-1" />
        <span className="ml-2">Construction du graphique...</span>
      </div>
    );
  }

  if (!Array.isArray(chart.data) || chart.data.length === 0) {
    return (
      <div className="my-3 rounded-xl border border-dj-bordure bg-dj-surface p-4 text-xs text-dj-texte-muet">
        Graphique invalide (format non reconnu).
      </div>
    );
  }

  const cleAxeX = Object.keys(chart.data[0])[0];
  const clesSeries = Object.keys(chart.data[0]).filter((c) => c !== cleAxeX);

  // CORRECTIF 2026-07-31 (audit UX) : pour "pie", la convention documentée
  // en tête de fichier est {name, value} -- mais avant, la clé utilisée
  // pour la valeur du camembert était choisie par pure POSITION dans
  // l'objet ("la deuxième clé"), jamais par son nom réel. Si le modèle
  // inversait l'ordre ({value, name} au lieu de {name, value}) ou
  // n'incluait qu'une seule clé, le camembert se retrouvait à tracer du
  // texte comme s'il s'agissait de nombres -- résultat : un camembert
  // vide ou cassé, sans aucun message pour expliquer pourquoi.
  // On cherche maintenant la clé "value" par son NOM si elle existe,
  // avec repli sur la position seulement si absente -- et on vérifie
  // que les valeurs obtenues sont bien numériques avant de tracer quoi
  // que ce soit.
  const cleNomPie = "name" in chart.data[0] ? "name" : cleAxeX;
  const cleValeurPie = "value" in chart.data[0] ? "value" : clesSeries[0];
  const pieValide =
    chart.type !== "pie" ||
    (cleValeurPie !== undefined && chart.data.every((d) => typeof d[cleValeurPie] === "number"));

  if (chart.type === "pie" && !pieValide) {
    return (
      <div className="my-3 rounded-xl border border-dj-bordure bg-dj-surface p-4 text-xs text-dj-texte-muet">
        <span className="text-[#f87171]">Graphique invalide :</span> un camembert attend des paires{" "}
        <code className="text-dj-texte">{"{ name, value }"}</code> avec des valeurs numériques.
      </div>
    );
  }

  // CORRECTIF 2026-07-31 (audit UX) : avant, un type non reconnu ("donut",
  // "area", une faute de frappe du modèle...) retombait silencieusement
  // sur LineChart -- le "else" final du ternaire ci-dessous attrapait
  // tout ce qui n'était ni "pie" ni "bar". La personne voyait alors un
  // graphique different de ce qui avait ete demande (un modele peut
  // suivre une demande utilisateur trop littéralement -- ex. "graphique
  // en anneau" -- et écrire un type non supporté dans le JSON), sans
  // aucune indication que quelque chose s'était mal passé.
  const TYPES_SUPPORTES = ["line", "bar", "pie"] as const;
  if (!TYPES_SUPPORTES.includes(chart.type as (typeof TYPES_SUPPORTES)[number])) {
    return (
      <div className="my-3 rounded-xl border border-dj-bordure bg-dj-surface p-4 text-xs text-dj-texte-muet">
        <span className="text-[#f87171]">Graphique invalide :</span> type "{String(chart.type)}" non pris en charge
        (attendu : line, bar ou pie).
      </div>
    );
  }

  // Légende à reconstruire nous-mêmes pour l'export PNG (voir
  // dessinerLegende ci-dessus) : pour un camembert, une part par entrée
  // de données ; pour ligne/barres, une série par clé (hors axe X).
  const legendeExport =
    chart.type === "pie"
      ? chart.data.map((d, i) => ({ libelle: String(d[cleNomPie]), couleur: COULEURS[i % COULEURS.length] }))
      : clesSeries.map((cle, i) => ({ libelle: cle, couleur: COULEURS[i % COULEURS.length] }));

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
              },
              legendeExport
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
              dataKey={cleValeurPie}
              nameKey={cleNomPie}
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
