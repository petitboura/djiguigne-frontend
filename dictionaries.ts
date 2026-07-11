import type { Locale } from "./site-config";

export const dictionaries = {
  fr: {
    nav: {
      home: "Accueil",
      about: "À propos",
      services: "Produit",
      blog: "Articles",
      contact: "Contact",
      cta: "Créer un agent",
    },
    footer: {
      rights: "Tous droits réservés.",
      legal: "Mentions légales",
      privacy: "Confidentialité",
      cookies: "Cookies",
      contact: "Contact",
      location: "Basé à Tunis, Tunisie",
    },
    home: {
      heroKicker: "Plateforme de création d'agents IA",
      heroTitle: "Crée ton agent IA, à ton image.",
      heroSubtitle:
        "Djiguignè AI te permet de créer des agents ou des IA spécialisées dans un domaine précis, avec ton style et ton goût — sans écrire une ligne de code.",
      heroCta: "Créer mon agent",
      heroCtaSecondary: "Découvrir la plateforme",
      sectionWhatTitle: "Une IA, taillée pour un domaine précis",
      sectionWhatBody:
        "Que ce soit pour du tutorat, du support client, du coaching ou tout autre domaine, Djiguignè AI t'aide à définir l'identité, le comportement, les outils et la base de connaissance de ton agent — puis le rend accessible en quelques minutes.",
      faqTitle: "Questions fréquentes",
      faq: [
        {
          q: "Faut-il savoir coder pour créer un agent ?",
          a: "Non. La création se fait entièrement via un formulaire guidé : identité, comportement, outils, base de connaissance et interface.",
        },
        {
          q: "Quelles sources de connaissance mon agent peut-il utiliser ?",
          a: "Un document PDF, une page Notion, ou un texte libre que tu peux modifier à tout moment — cumulables et indépendants.",
        },
        {
          q: "Djiguignè AI est-il payant ?",
          a: "Le modèle tarifaire n'est pas encore fixé. La plateforme est actuellement en phase de lancement.",
        },
      ],
    },
    about: {
      title: "À propos de Djiguignè AI",
      intro:
        "Djiguignè AI est un projet fondé par Bourama Diarra (auto-entrepreneur), basé à Tunis, en Tunisie, lancé le 10 juillet 2026.",
      missionTitle: "Notre mission",
      founderTitle: "Le fondateur",
      founderBody:
        "Djiguignè AI est développé par Bourama Diarra, également fondateur de Maame, une entreprise dédiée à rendre l'entrepreneuriat accessible.",
    },
    services: {
      title: "Le produit",
      intro:
        "Djiguignè AI est une plateforme qui permet à n'importe qui de créer un agent IA spécialisé dans un domaine précis, sans compétence technique.",
      faqTitle: "Tarifs et délais",
      faq: [
        {
          q: "Combien coûte la création d'un agent ?",
          a: "Le modèle tarifaire n'est pas encore fixé — la plateforme est en phase de lancement.",
        },
        {
          q: "Combien de temps faut-il pour créer un agent ?",
          a: "Quelques minutes suffisent pour un premier agent fonctionnel via le formulaire guidé.",
        },
      ],
    },
    contact: {
      title: "Contact",
      intro: "Une question, une idée, un partenariat ? Écris-nous.",
      faqTitle: "Comment nous contacter",
      faq: [
        {
          q: "Comment contacter Djiguignè AI ?",
          a: "Par email à boumiservice@gmail.com, ou par téléphone.",
        },
      ],
    },
    blog: {
      title: "Articles",
      intro: "Réflexions sur la création d'agents IA, le RAG, et l'accessibilité de l'IA spécialisée.",
      readMore: "Lire l'article",
      back: "Retour aux articles",
    },
    legal: {
      mentionsTitle: "Mentions légales",
      privacyTitle: "Politique de confidentialité",
      cookiesTitle: "Politique de cookies",
    },
    cookieBanner: {
      text: "Ce site utilise uniquement des cookies techniques nécessaires à son fonctionnement. Aucun cookie de suivi publicitaire ou analytique n'est utilisé.",
      accept: "Compris",
      learnMore: "En savoir plus",
    },
  },
  en: {
    nav: {
      home: "Home",
      about: "About",
      services: "Product",
      blog: "Blog",
      contact: "Contact",
      cta: "Create an agent",
    },
    footer: {
      rights: "All rights reserved.",
      legal: "Legal notice",
      privacy: "Privacy",
      cookies: "Cookies",
      contact: "Contact",
      location: "Based in Tunis, Tunisia",
    },
    home: {
      heroKicker: "AI agent creation platform",
      heroTitle: "Build your AI agent, your way.",
      heroSubtitle:
        "Djiguignè AI lets you create agents or specialized AIs for any precise domain, in your own style — no code required.",
      heroCta: "Create my agent",
      heroCtaSecondary: "Explore the platform",
      sectionWhatTitle: "An AI, tailored to one precise domain",
      sectionWhatBody:
        "Whether for tutoring, customer support, coaching, or any other domain, Djiguignè AI helps you define your agent's identity, behavior, tools, and knowledge base — then makes it accessible in minutes.",
      faqTitle: "Frequently asked questions",
      faq: [
        {
          q: "Do I need to know how to code to create an agent?",
          a: "No. Creation happens entirely through a guided form: identity, behavior, tools, knowledge base, and interface.",
        },
        {
          q: "What knowledge sources can my agent use?",
          a: "A PDF document, a Notion page, or free-form text you can edit anytime — all combinable and independent.",
        },
        {
          q: "Is Djiguignè AI paid?",
          a: "The pricing model isn't finalized yet. The platform is currently in its launch phase.",
        },
      ],
    },
    about: {
      title: "About Djiguignè AI",
      intro:
        "Djiguignè AI is a project founded by Bourama Diarra (sole proprietor), based in Tunis, Tunisia, launched on July 10, 2026.",
      missionTitle: "Our mission",
      founderTitle: "The founder",
      founderBody:
        "Djiguignè AI is built by Bourama Diarra, also founder of Maame, a company dedicated to making entrepreneurship accessible.",
    },
    services: {
      title: "The product",
      intro:
        "Djiguignè AI is a platform that lets anyone create an AI agent specialized in a precise domain, with no technical skills required.",
      faqTitle: "Pricing and timelines",
      faq: [
        {
          q: "How much does it cost to create an agent?",
          a: "The pricing model isn't finalized yet — the platform is in its launch phase.",
        },
        {
          q: "How long does it take to create an agent?",
          a: "A few minutes are enough for a first working agent via the guided form.",
        },
      ],
    },
    contact: {
      title: "Contact",
      intro: "A question, an idea, a partnership? Get in touch.",
      faqTitle: "How to reach us",
      faq: [
        {
          q: "How can I contact Djiguignè AI?",
          a: "By email at boumiservice@gmail.com, or by phone.",
        },
      ],
    },
    blog: {
      title: "Articles",
      intro: "Thoughts on AI agent creation, RAG, and making specialized AI accessible.",
      readMore: "Read article",
      back: "Back to articles",
    },
    legal: {
      mentionsTitle: "Legal notice",
      privacyTitle: "Privacy policy",
      cookiesTitle: "Cookie policy",
    },
    cookieBanner: {
      text: "This site only uses technical cookies required for it to function. No advertising or analytics tracking cookies are used.",
      accept: "Got it",
      learnMore: "Learn more",
    },
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
