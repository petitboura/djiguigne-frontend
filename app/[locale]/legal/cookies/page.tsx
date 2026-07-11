import type { Metadata } from "next";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/site-config";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const dict = getDictionary(params.locale);
  return {
    title: dict.legal.cookiesTitle,
    alternates: { canonical: `/${params.locale}/legal/cookies` },
  };
}

const CONTENT: Record<Locale, { heading: string; body: string }[]> = {
  fr: [
    {
      heading: "Aucun cookie de mesure ou publicitaire",
      body: "Ce site n'utilise aucun outil d'analytics ni de publicité. Aucune donnée de navigation n'est collectée à des fins statistiques ou commerciales.",
    },
    {
      heading: "Un seul cookie technique",
      body: "Le site enregistre localement (localStorage de ton navigateur) le fait que tu aies fermé le bandeau d'information sur les cookies, pour ne pas te le réafficher à chaque visite. C'est la seule donnée technique stockée, strictement nécessaire au fonctionnement du site.",
    },
    {
      heading: "Comment la supprimer",
      body: "Tu peux effacer cette donnée à tout moment en vidant les données de site (localStorage) de ton navigateur pour djiguigne.com.",
    },
  ],
  en: [
    {
      heading: "No analytics or advertising cookies",
      body: "This site uses no analytics or advertising tools. No browsing data is collected for statistical or commercial purposes.",
    },
    {
      heading: "A single technical cookie",
      body: "The site stores locally (your browser's localStorage) the fact that you closed the cookie notice, so it isn't shown again on every visit. This is the only technical data stored, strictly necessary for the site to function.",
    },
    {
      heading: "How to remove it",
      body: "You can clear this data at any time by clearing site data (localStorage) for djiguigne.com in your browser.",
    },
  ],
};

export default function CookiesPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-3xl font-extrabold text-dj-texte sm:text-4xl">
        {dict.legal.cookiesTitle}
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
