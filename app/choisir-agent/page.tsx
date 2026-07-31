"use client";

import { TopBar } from "@/components/TopBar";
import { SelecteurAgent } from "@/components/SelecteurAgent";

// Ajouté le 31/07 -- cible du bouton "Changer d'IA" de la sidebar du chat
// (voir components/chat/SidebarChat.tsx). Contrairement à `/`, cette page
// N'AUTO-REDIRIGE JAMAIS vers le premier_agent_id existant : c'est
// justement le seul moyen d'en choisir un autre une fois qu'un premier
// agent est déjà enregistré (sinon `/` renverrait direct au même chat en
// boucle). Choisir un agent ici remplace le premier_agent_id existant
// (voir SelecteurAgent.choisirAgent -> PATCH /api/profiles/me).
export default function PageChoisirAgent() {
  return (
    <>
      <TopBar />
      <SelecteurAgent />
    </>
  );
}
