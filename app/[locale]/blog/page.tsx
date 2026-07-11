import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/site-config";
import { getPosts } from "@/lib/posts";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const dict = getDictionary(params.locale);
  return {
    title: dict.blog.title,
    description: dict.blog.intro,
    alternates: { canonical: `/${params.locale}/blog` },
  };
}

export default function BlogIndexPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const dict = getDictionary(locale);
  const posts = getPosts(locale);

  return (
    <section className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="animate-dj-fade-up font-display text-3xl font-extrabold text-dj-texte sm:text-4xl">
        {dict.blog.title}
      </h1>
      <p className="mt-5 animate-dj-fade-up text-lg text-dj-texte-muet" style={{ animationDelay: "0.1s" }}>
        {dict.blog.intro}
      </p>

      <ul className="mt-10 flex flex-col gap-4">
        {posts.map((post, i) => (
          <li
            key={post.slug}
            className="animate-dj-fade-up rounded-2xl border border-dj-bordure bg-dj-surface p-6 transition-colors hover:border-dj-bordure-forte"
            style={{ animationDelay: `${0.1 * i}s` }}
          >
            <Link href={`/${locale}/blog/${post.slug}`} className="group">
              <time dateTime={post.date} className="font-mono text-xs text-dj-texte-muet">
                {new Date(post.date).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <h2 className="mt-2 font-display text-lg font-bold text-dj-texte transition-colors group-hover:text-dj-accent-1">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-dj-texte-muet">{post.description}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-dj-accent-1">
                {dict.blog.readMore} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
