import type { Metadata } from "next";
import { getDictionary } from "@/lib/dictionaries";
import { siteConfig, type Locale } from "@/lib/site-config";
import { JsonLd } from "@/components/JsonLd";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const dict = getDictionary(params.locale);
  return {
    title: dict.contact.title,
    description: dict.contact.intro,
    alternates: { canonical: `/${params.locale}/contact` },
  };
}

export default function ContactPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = getDictionary(locale);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: dict.contact.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      <section className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="animate-dj-fade-up font-display text-3xl font-extrabold text-dj-texte sm:text-4xl">
          {dict.contact.title}
        </h1>
        <p className="mt-5 animate-dj-fade-up text-lg text-dj-texte-muet" style={{ animationDelay: "0.1s" }}>
          {dict.contact.intro}
        </p>

        <div
          className="mt-8 flex animate-dj-fade-up flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6"
          style={{ animationDelay: "0.2s" }}
        >
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="flex items-center justify-between text-dj-texte transition-colors hover:text-dj-accent-1"
          >
            <span className="text-sm text-dj-texte-muet">Email</span>
            <span className="font-mono text-sm">{siteConfig.contact.email}</span>
          </a>
          <a
            href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
            className="flex items-center justify-between text-dj-texte transition-colors hover:text-dj-accent-1"
          >
            <span className="text-sm text-dj-texte-muet">{locale === "fr" ? "Téléphone" : "Phone"}</span>
            <span className="font-mono text-sm">{siteConfig.contact.phone}</span>
          </a>
        </div>

        <div className="mt-14">
          <h2 className="mb-6 font-display text-2xl font-bold text-dj-texte">{dict.contact.faqTitle}</h2>
          <div className="flex flex-col gap-3">
            {dict.contact.faq.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-dj-bordure bg-dj-surface p-4 open:border-dj-bordure-forte"
              >
                <summary className="cursor-pointer list-none font-display text-sm font-semibold text-dj-texte marker:content-none">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-dj-accent-1 transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-dj-texte-muet">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
