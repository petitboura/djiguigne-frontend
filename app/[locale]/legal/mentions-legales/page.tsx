import type { Metadata } from "next";
import { getDictionary } from "@/lib/dictionaries";
import { siteConfig, type Locale } from "@/lib/site-config";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const dict = getDictionary(params.locale);
  return {
    title: dict.legal.mentionsTitle,
    alternates: { canonical: `/${params.locale}/legal/mentions-legales` },
  };
}

export default function MentionsLegalesPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = getDictionary(locale);
  const isFr = locale === "fr";

  return (
    <section className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-3xl font-extrabold text-dj-texte sm:text-4xl">
        {dict.legal.mentionsTitle}
      </h1>

      <div className="mt-8 flex flex-col gap-6 text-sm text-dj-texte-muet">
        <div>
          <h2 className="font-display text-base font-bold text-dj-texte">
            {isFr ? "Éditeur du site" : "Site publisher"}
          </h2>
          <p className="mt-2">
            {siteConfig.legalName}
            <br />
            {isFr ? "Statut : " : "Status: "}
            {siteConfig.legalStatus}
            <br />
            {isFr ? "Basé à " : "Based in "}
            {siteConfig.location.city}, {isFr ? siteConfig.location.country : siteConfig.location.countryEn}
            <br />
            Email : {siteConfig.contact.email}
            <br />
            {isFr ? "Téléphone : " : "Phone: "}
            {siteConfig.contact.phone}
          </p>
        </div>

        <div>
          <h2 className="font-display text-base font-bold text-dj-texte">
            {isFr ? "Hébergement" : "Hosting"}
          </h2>
          <p className="mt-2">
            Vercel Inc.
            <br />
            340 S Lemon Ave #4133, Walnut, CA 91789, USA
          </p>
        </div>

        <div>
          <h2 className="font-display text-base font-bold text-dj-texte">
            {isFr ? "Propriété intellectuelle" : "Intellectual property"}
          </h2>
          <p className="mt-2">
            {isFr
              ? `L'ensemble du contenu de ce site (textes, logo, identité visuelle) est la propriété de ${siteConfig.legalName}, sauf mention contraire.`
              : `All content on this site (text, logo, visual identity) is the property of ${siteConfig.legalName}, unless stated otherwise.`}
          </p>
        </div>
      </div>
    </section>
  );
}
