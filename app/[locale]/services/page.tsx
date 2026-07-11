import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/dictionaries";
import { siteConfig, type Locale } from "@/lib/site-config";
import { JsonLd } from "@/components/JsonLd";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const dict = getDictionary(params.locale);
  return {
    title: dict.services.title,
    description: dict.services.intro,
    alternates: { canonical: `/${params.locale}/services` },
  };
}

export default function ServicesPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = getDictionary(locale);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: dict.services.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      <section className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="animate-dj-fade-up font-display text-3xl font-extrabold text-dj-texte sm:text-4xl">
          {dict.services.title}
        </h1>
        <p className="mt-5 animate-dj-fade-up text-lg text-dj-texte-muet" style={{ animationDelay: "0.1s" }}>
          {dict.services.intro}
        </p>

        <div className="mt-8 flex flex-col gap-3 animate-dj-fade-up sm:flex-row sm:items-center" style={{ animationDelay: "0.2s" }}>
          <Link
            href={siteConfig.appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-dj-gradient px-6 py-3 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5"
          >
            {dict.nav.cta}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="text-sm font-medium text-dj-texte-muet underline-offset-4 hover:text-dj-texte hover:underline"
          >
            {dict.nav.contact}
          </Link>
        </div>

        <div className="mt-14">
          <h2 className="mb-6 font-display text-2xl font-bold text-dj-texte">{dict.services.faqTitle}</h2>
          <div className="flex flex-col gap-3">
            {dict.services.faq.map((item) => (
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
