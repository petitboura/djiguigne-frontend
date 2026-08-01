// Composant générique pour injecter du Schema.org/JSON-LD dans une page.
// Même pattern que djiguigne-ai/components/JsonLd.tsx (site vitrine).
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
