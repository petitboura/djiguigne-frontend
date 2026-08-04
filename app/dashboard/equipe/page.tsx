"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Ancienne URL de la page équipe (tâche C), renommée /dashboard/espace-role
// le 2026-08-05 (tâche F, fusion avec l'onglet "Mon IA"). Redirection
// gardée au cas où Bourama aurait cette URL en favori.
export default function PageEquipeRedirection() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/espace-role");
  }, [router]);
  return null;
}
