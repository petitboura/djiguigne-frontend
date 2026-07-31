"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { SelecteurAgent } from "@/components/SelecteurAgent";

// Réécrit le 31/07 (Bourama : "je veux que ce soit l'interface d'un chat en
// premier") -- remplace l'ancien feed public (onglets IA/Créateurs/Article/
// Réflexion/Histoire + recherche, voir /home/claude/ancien_page_accueil_backup.tsx
// pour l'ancienne version si on veut la redéplacer ailleurs plus tard) par
// un flux en deux temps :
//
// 1. Utilisateur connecté AVEC un premier_agent_id déjà choisi (voir
//    api/profiles.py, champ ajouté ce même jour) -> redirection directe
//    vers le chat de cet agent, sans jamais afficher `/`.
// 2. Sinon (pas connecté, ou connecté mais aucun choix encore fait) ->
//    SelecteurAgent (5 boutons Matières/Métier/Filière/Domaine/Langues
//    africaines) -- cliquer un agent enregistre ce choix puis ouvre son
//    chat (voir ce composant).
//
// `verification` évite un flash des 5 boutons pendant la vérification du
// profil pour un utilisateur qui a déjà un agent choisi.
export default function PageAccueil() {
  const router = useRouter();
  const [verification, setVerification] = useState(true);

  useEffect(() => {
    let annule = false;

    async function verifierPremierAgent() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!annule) setVerification(false);
        return;
      }

      try {
        const profil = await appelerApi(`/api/profiles/${session.user.id}`);
        if (annule) return;
        if (profil?.premier_agent_id) {
          router.replace(`/agent/${profil.premier_agent_id}/chat`);
          return;
        }
      } catch {
        // Profil pas encore créé (premier PATCH /me jamais fait) ou erreur
        // réseau -- dans les deux cas on retombe sur le sélecteur, pas de
        // blocage de la page d'accueil pour ça.
      }
      if (!annule) setVerification(false);
    }

    verifierPremierAgent();
    return () => {
      annule = true;
    };
  }, [router]);

  if (verification) {
    return (
      <>
        <TopBar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-dj-texte-muet">Chargement…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <SelecteurAgent />
    </>
  );
}
