"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Page de retour OAuth partagée entre TOUS les services du moteur
// générique (connexions/oauth_generique.py côté backend) -- pas une page
// par service. Le fournisseur (ex. GitHub) redirige ici avec
// ?code=...&state=... dans l'URL après que la personne a autorisé
// l'accès. Le service concerné est retrouvé côté backend depuis `state`
// (voir etat_en_attente), donc rien à préciser ici.
//
// Cette URL doit être configurée EXACTEMENT comme "Authorization callback
// URL" dans l'app OAuth du fournisseur (ex. GitHub OAuth App), et comme
// valeur de la variable d'environnement URL_RETOUR_APP côté Railway.

type Etat = "en_cours" | "succes" | "echec";

export default function PageRetourOAuth() {
  const [etat, setEtat] = useState<Etat>("en_cours");
  const [message, setMessage] = useState("Connexion en cours...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      setEtat("echec");
      setMessage("Lien de retour invalide (code ou state manquant).");
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    fetch(`${API_URL}/api/connexions/finaliser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    })
      .then((r) => r.json())
      .then((resultat) => {
        setEtat(resultat.succes ? "succes" : "echec");
        setMessage(resultat.message || (resultat.succes ? "Connecté." : "Échec de la connexion."));
      })
      .catch(() => {
        setEtat("echec");
        setMessage("Erreur réseau pendant la finalisation de la connexion.");
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dj-fond px-4 text-center">
      <div
        className={`h-3 w-3 rounded-full ${
          etat === "en_cours" ? "animate-pulse bg-dj-accent-1" : etat === "succes" ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <p
        className={
          etat === "en_cours"
            ? "animate-dj-shimmer bg-dj-shimmer-texte bg-[length:200%_100%] bg-clip-text text-transparent"
            : "text-dj-texte"
        }
      >
        {message}
      </p>
      {etat !== "en_cours" && (
        <Link href="/" className="text-sm text-dj-accent-1 transition-colors hover:text-dj-accent-2">
          Retourner à Djiguignè
        </Link>
      )}
    </div>
  );
}
