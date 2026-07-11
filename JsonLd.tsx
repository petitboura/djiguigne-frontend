// Composant générique pour injecter du Schema.org/JSON-LD dans une page.
// Voir le brief Notion, section 5 : Organization+sameAs, FAQPage et Article
// sont les types à prioriser pour le GEO en 2026.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
