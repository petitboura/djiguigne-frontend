import Link from "next/link";

// Migration du 2026-07-15 (Bourama : migration complète du chat vers
// Next.js/Vercel). Remplace l'ancien BoutonUtiliser (iframe vers chat.py sur
// Railway) : c'était la cause du bug remonté par Bourama (plein écran et
// bouton retour ouvraient chacun une "nouvelle page", parce que
// Vercel/Next.js et Railway/Streamlit sont deux domaines séparés avec deux
// historiques de navigation distincts). Un simple <Link> interne vers
// /agent/[id]/chat règle ça structurellement : tout reste dans la même
// app Next.js, navigation client, un seul historique.
//
// L'échange de jetons Supabase que l'ancienne version faisait transiter
// par l'URL vers Streamlit n'est plus nécessaire : la nouvelle page de
// chat vit dans la même app, donc la session Supabase déjà active côté
// client s'applique directement (voir lib/api.ts, appelerApi/
// appelerApiStream qui lisent déjà supabase.auth.getSession()).
export function BoutonUtiliser({ agentId }: { agentId: string }) {
  return (
    <Link
      href={`/agent/${agentId}/chat`}
      className="rounded-full bg-dj-gradient px-6 py-3 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5"
    >
      Utiliser cette IA
    </Link>
  );
}
