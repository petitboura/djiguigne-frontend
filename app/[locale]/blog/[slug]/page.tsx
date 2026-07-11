import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/dictionaries";
import { siteConfig, type Locale } from "@/lib/site-config";
import { getPost, getPosts } from "@/lib/posts";
import { JsonLd } from "@/components/JsonLd";

export function generateStaticParams() {
  return siteConfig.locales.flatMap((locale) =>
    getPosts(locale).map((post) => ({ locale, slug: post.slug }))
  );
}

export function generateMetadata({
  params,
}: {
  params: { locale: Locale; slug: string };
}): Metadata {
  const post = getPost(params.locale, params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/${params.locale}/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
    },
  };
}

export default function BlogPostPage({
  params,
}: {
  params: { locale: Locale; slug: string };
}) {
  const { locale, slug } = params;
  const dict = getDictionary(locale);
  const post = getPost(locale, slug);
  if (!post) notFound();

  const paragraphs = post.body.split("\n\n");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          author: { "@type": "Organization", name: siteConfig.brandName },
          publisher: { "@type": "Organization", name: siteConfig.brandName },
        }}
      />

      <article className="mx-auto max-w-2xl px-5 py-16">
        <Link
          href={`/${locale}/blog`}
          className="animate-dj-fade-up text-sm font-semibold text-dj-accent-1 hover:underline"
        >
          ← {dict.blog.back}
        </Link>

        <time
          dateTime={post.date}
          className="mt-6 block animate-dj-fade-up font-mono text-xs text-dj-texte-muet"
          style={{ animationDelay: "0.05s" }}
        >
          {new Date(post.date).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>

        <h1
          className="mt-2 animate-dj-fade-up font-display text-3xl font-extrabold text-dj-texte sm:text-4xl"
          style={{ animationDelay: "0.1s" }}
        >
          {post.title}
        </h1>

        <div
          className="mt-8 animate-dj-fade-up text-base text-dj-texte-muet"
          style={{ animationDelay: "0.2s" }}
        >
          {paragraphs.map((p, i) => (
            <p key={i} className="mb-4 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </article>
    </>
  );
}
