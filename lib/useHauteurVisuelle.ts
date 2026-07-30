"use client";

import { useEffect } from "react";

// Correctif mobile clavier (2026-07-30, demande Bourama) : `h-dvh` seul
// suffit sur Android (surtout combiné à interactiveWidget:"resizes-content",
// voir app/layout.tsx), mais iOS Safari ne resynchronise PAS dvh au même
// instant que l'ouverture du clavier -- le visualViewport se rétrécit
// immédiatement, dvh un peu plus tard, ce qui fait glisser la barre de
// saisie sous le clavier pendant quelques centaines de ms (bug connu,
// cf. recherche effectuée en session : dvh/visualViewport désynchronisés
// sur iOS Safari). Ce hook pose --vh-visuelle (hauteur RÉELLEMENT visible,
// clavier exclu) à jour en direct via window.visualViewport, en secours de
// h-dvh -- voir ChatAgentClient.tsx (style={{ height: "var(--vh-visuelle, 100dvh)" }}).
export function useHauteurVisuelle() {
  useEffect(() => {
    const vv = window.visualViewport;

    function maj() {
      const h = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--vh-visuelle", `${Math.round(h)}px`);
    }

    maj();
    vv?.addEventListener("resize", maj);
    vv?.addEventListener("scroll", maj);
    window.addEventListener("resize", maj);
    return () => {
      vv?.removeEventListener("resize", maj);
      vv?.removeEventListener("scroll", maj);
      window.removeEventListener("resize", maj);
    };
  }, []);
}
