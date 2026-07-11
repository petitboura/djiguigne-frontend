import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteConfig, type Locale } from "@/lib/site-config";
import { getDictionary } from "@/lib/dictionaries";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import { JsonLd } from "@/components/JsonLd";

export function generateStaticParams() {
  return siteConfig.locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const { locale } = params;
  const tagline = siteConfig.tagline[locale];

  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: siteConfig.brandName, template: `%s — ${siteConfig.brandName}` },
    description: tagline,
    alternates: {
      canonical: `/${locale}`,
      // hreflang complet : chaque langue pointe vers son équivalent, plus
      // x-default vers la locale par défaut (voir brief Notion section 4).
      languages: Object.fromEntries([
        ...siteConfig.locales.map((l) => [l, `/${l}`]),
        ["x-default", `/${siteConfig.defaultLocale}`],
      ]),
    },
    openGraph: {
      type: "website",
      locale,
      siteName: siteConfig.brandName,
      title: siteConfig.brandName,
      description: tagline,
      url: `${siteConfig.url}/${locale}`,
    },
  };
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const { locale } = params;
  if (!siteConfig.locales.includes(locale)) notFound();

  const dict = getDictionary(locale);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: siteConfig.brandName,
          legalName: siteConfig.legalName,
          url: siteConfig.url,
          foundingDate: siteConfig.foundingDate,
          founder: { "@type": "Person", name: "Bourama Diarra" },
          email: siteConfig.contact.email,
          telephone: siteConfig.contact.phone,
          address: {
            "@type": "PostalAddress",
            addressLocality: siteConfig.location.city,
            addressCountry: locale === "fr" ? siteConfig.location.country : siteConfig.location.countryEn,
          },
          sameAs: siteConfig.social.map((s) => s.url),
        }}
      />
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} dict={dict} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} dict={dict} />
      </div>
      <CookieBanner locale={locale} dict={dict} />
    </>
  );
}
