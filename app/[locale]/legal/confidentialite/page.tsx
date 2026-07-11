import type { Metadata } from "next";
import { getDictionary } from "@/lib/dictionaries";
import { siteConfig, type Locale } from "@/lib/site-config";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const dict = getDictionary(params.locale);
  return {
    title: dict.legal.privacyTitle,
    alternates: { canonical: `/${params.locale}/legal/confidentialite` },
  };
}

const CONTENT: Record<Locale, { heading: string; body: string }[]> = {
  fr: [
    {
      heading: "Données collectées",
      body: "Ce site ne collecte aucune donnée personnelle en navigation normale : pas de compte, pas de tracking, pas d'analytics. Si tu nous écris (email ou formulaire de contact), nous recevons les informations que tu fournis toi-même (nom, email, message).",
    },
    {
      heading: "Utilisation",
      body: "Les informations transmises par email ou formulaire servent uniquement à répondre à ta demande. Elles ne sont ni revendues, ni partagées avec des tiers à des fins commerciales.",
    },
    {
      heading: "Conservation",
      body: "Les échanges sont conservés le temps nécessaire pour traiter ta demande, puis supprimés ou archivés de façon raisonnable.",
    },
    {
      heading: "Tes droits",
      body: `Tu peux demander l'accès, la correction ou la suppression de tes données à tout moment en écrivant à ${siteConfig.contact.email}.`,
    },
    {
      heading: "Hébergement",
      body: "Le site est hébergé par Vercel Inc. Les journaux techniques d'hébergement (adresse IP, horodatage) peuvent être conservés brièvement par Vercel dans le cadre normal de son infrastructure.",
    },
  ],
  en: [
    {
      heading: "Data collected",
      body: "This site collects no personal data during normal browsing: no account, no tracking, no analytics. If you contact us (email or contact form), we receive the information you provide yourself (name, email, message).",
    },
    {
      heading: "Use",
      body: "Information sent by email or form is used solely to respond to your request. It is never sold or shared with third parties for commercial purposes.",
    },
    {
      heading: "Retention",
      body: "Exchanges are kept for as long as needed to handle your request, then deleted or reasonably archived.",
    },
    {
      heading: "Your rights",
      body: `You can request access, correction, or deletion of your data at any time by emailing ${siteConfig.contact.email}.`,
    },
    {
      heading: "Hosting",
      body: "The site is hosted by Vercel Inc. Standard technical hosting logs (IP address, timestamp) may be briefly retained by Vercel as part of its normal infrastructure.",
    },
  ],
};

export default function ConfidentialitePage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-3xl font-extrabold text-dj-texte sm:text-4xl">
        {dict.legal.privacyTitle}
      </h1>

      <div className="mt-8 flex flex-col gap-6 text-sm text-dj-texte-muet">
        {CONTENT[locale].map((block) => (
          <div key={block.heading}>
            <h2 className="font-display text-base font-bold text-dj-texte">{block.heading}</h2>
            <p className="mt-2">{block.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
