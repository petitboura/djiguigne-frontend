"use client";

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

export function GraphiqueDonnees({ code }: { code: string }) {
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
    <div className="my-3 animate-dj-fade-in rounded-xl border border-dj-bordure bg-dj-surface p-4">
      {chart.titre && <p className="mb-2 text-sm font-semibold text-dj-texte">{chart.titre}</p>}
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
