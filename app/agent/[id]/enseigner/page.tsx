"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { SectionMatieres } from "@/components/SectionMatieres";

// Page "L'IA de mes élèves", propre à l'agent Stirux (2026-08-06,
// demande Bourama). Contrairement à Mon espace (générique, tout
// compte), cette page vit DANS l'IA des enseignants -- accessible
// uniquement depuis la barre latérale de Stirux (voir SidebarChat.tsx,
// lien affiché seulement si agentId === "stirux").
export default function PageEnseignerAgent() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;
  const router = useRouter();

  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push(`/connexion?retour=/agent/${agentId}/enseigner`);
        return;
      }
      setSession(session);
    });
  }, [router, agentId]);

  if (session === undefined) {
    return (
      <>
        <TopBar />
        <main className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-10">
          <p className="text-sm text-dj-texte-muet">Chargement…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-10">
        <div className="flex items-center gap-3">
          <BoutonRetour />
          <BoutonAccueil />
        </div>

        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-dj-texte">
            <GraduationCap size={22} className="text-dj-accent-1" />
            L&apos;IA de mes élèves
          </h1>
          <p className="mt-2 text-sm text-dj-texte-muet">
            Écris comment l&apos;IA de tes élèves doit se comporter pour chaque matière, puis
            partage le code généré, ou teste directement.
          </p>
        </div>

        <SectionMatieres />
      </main>
    </>
  );
}
