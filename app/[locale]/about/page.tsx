import type { Metadata } from "next";
import { getDictionary } from "@/lib/dictionaries";
import { siteConfig, type Locale } from "@/lib/site-config";
import { JsonLd } from "@/components/JsonLd";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const dict = getDictionary(params.locale);
  return {
    title: dict.about.title,
    description: dict.about.intro,
    alternates: { canonical: `/${params.locale}/about` },
  };
}

export default function AboutPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = getDictionary(locale);
  const mission = siteConfig.mission[locale];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          mainEntity: {
            "@type": "Organization",
            name: siteConfig.brandName,
            founder: { "@type": "Person", name: "Bourama Diarra" },
            foundingDate: siteConfig.foundingDate,
          },
        }}
      />

      <section className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="animate-dj-fade-up font-display text-3xl font-extrabold text-dj-texte sm:text-4xl">
          {dict.about.title}
        </h1>
        <p className="mt-5 animate-dj-fade-up text-lg text-dj-texte-muet" style={{ animationDelay: "0.1s" }}>
          {dict.about.intro}
        </p>

        <div
          className="mt-10 animate-dj-fade-up rounded-2xl border border-dj-bordure bg-dj-surface p-6"
          style={{ animationDelay: "0.2s" }}
        >
          <h2 className="font-display text-lg font-bold text-dj-accent-1">{dict.about.missionTitle}</h2>
          <p className="mt-2 text-dj-texte">{mission}</p>
        </div>

        <div
          className="mt-6 animate-dj-fade-up rounded-2xl border border-dj-bordure bg-dj-surface p-6"
          style={{ animationDelay: "0.3s" }}
        >
          <h2 className="font-display text-lg font-bold text-dj-texte">{dict.about.founderTitle}</h2>
          <p className="mt-2 text-dj-texte-muet">{dict.about.founderBody}</p>
        </div>
      </section>
    </>
  );
}
