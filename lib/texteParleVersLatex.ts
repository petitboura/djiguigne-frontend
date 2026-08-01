/**
 * Convertit une phrase mathématique dictée en français vers du LaTeX.
 *
 * Contexte (01/08, demande Bourama) : la dictée vocale existante
 * (BarreDeSaisie.tsx:demarrerDictee, api/uploads.py:uploader_audio_chat)
 * renvoie du texte brut transcrit par lot -- "x au carré plus deux" reste
 * "x au carré plus deux", jamais converti en maths. Cette fonction est la
 * "étape 1" retenue plutôt qu'un vrai streaming ASR live (voir échange du
 * 01/08) : on part d'une transcription déjà obtenue et on la fait passer
 * ici pour produire du LaTeX injectable dans un noeud maths (MathNode.ts)
 * de l'éditeur riche (EditeurMathsRiche.tsx).
 *
 * Approche : à base de règles (pas de LLM ici, pour rester rapide/gratuit
 * et déterministe) -- une passe de remplacements de motifs, du plus
 * spécifique au plus général pour éviter qu'un remplacement générique
 * (ex. "sur" -> fraction) ne mange un motif plus précis plus loin dans la
 * phrase. Couverture volontairement partielle : opérations courantes de
 * lycée/prépa (élève cible de Djiguignè AI), pas un parseur exhaustif --
 * ce qui n'est pas reconnu reste en texte tel quel plutôt que de produire
 * un LaTeX faux.
 *
 * Connu comme non couvert pour l'instant, à étendre à l'usage réel plutôt
 * qu'en devinant à l'avance : dérivées/primitives avec bornes complexes,
 * matrices dictées case par case, sommes/produits avec bornes non
 * numériques dictées en une phrase.
 */

type Regle = { motif: RegExp; remplacement: string | ((...groupes: string[]) => string) };

// Nombres écrits en toutes lettres les plus courants en contexte maths
// (jusqu'à 20 + dizaines rondes) -- une dictée d'exercice scolaire tombe
// presque toujours dans cette plage pour les exposants/indices/bornes.
const NOMBRES_LETTRES: Record<string, string> = {
  zéro: "0", un: "1", une: "1", deux: "2", trois: "3", quatre: "4", cinq: "5",
  six: "6", sept: "7", huit: "8", neuf: "9", dix: "10", onze: "11", douze: "12",
  treize: "13", quatorze: "14", quinze: "15", seize: "16", "dix-sept": "17",
  "dix-huit": "18", "dix-neuf": "19", vingt: "20", trente: "30",
};

function normaliserNombresLettres(texte: string): string {
  let resultat = texte;
  for (const [mot, chiffre] of Object.entries(NOMBRES_LETTRES)) {
    resultat = resultat.replace(new RegExp(`\\b${mot}\\b`, "gi"), chiffre);
  }
  return resultat;
}

// Ordre important : du plus spécifique (structures à deux arguments comme
// fraction/racine/intégrale) vers le plus général (opérateurs simples),
// et les lettres grecques/fonctions en tout dernier pour ne pas interférer
// avec les motifs de structure.
const REGLES: Regle[] = [
  // Structures à bornes/arguments
  { motif: /racine (?:carrée )?de ([\w+\-*/^ ]+?)(?= |$)/gi, remplacement: (_m, a) => `\\sqrt{${a}}` },
  { motif: /racine (\d+|\w+)ième de ([\w+\-*/^ ]+?)(?= |$)/gi, remplacement: (_m, n, a) => `\\sqrt[${n}]{${a}}` },
  { motif: /intégrale de ([\w+\-*/^]+) à ([\w+\-*/^]+) de/gi, remplacement: (_m, a, b) => `\\int_{${a}}^{${b}}` },
  { motif: /somme de ([\w+\-*/^ =]+) à ([\w+\-*/^]+) de/gi, remplacement: (_m, a, b) => `\\sum_{${a}}^{${b}}` },
  { motif: /limite quand ([\w]+) tend vers ([\w+\-∞]+) de/gi, remplacement: (_m, v, l) => `\\lim_{${v} \\to ${l}}` },
  { motif: /(\w+) sur (\w+)/gi, remplacement: (_m, a, b) => `\\frac{${a}}{${b}}` },

  // Exposants / indices
  { motif: /(\w+) au carré/gi, remplacement: (_m, a) => `${a}^2` },
  { motif: /(\w+) au cube/gi, remplacement: (_m, a) => `${a}^3` },
  { motif: /(\w+) puissance (\w+)/gi, remplacement: (_m, a, b) => `${a}^{${b}}` },
  { motif: /(\w+) indice (\w+)/gi, remplacement: (_m, a, b) => `${a}_{${b}}` },

  // Opérateurs/relations
  { motif: /plus ou moins/gi, remplacement: "\\pm" },
  { motif: /\bplus\b/gi, remplacement: "+" },
  { motif: /\bmoins\b/gi, remplacement: "-" },
  { motif: /divisé par/gi, remplacement: "\\div" },
  { motif: /\bfois\b/gi, remplacement: "\\times" },
  { motif: /est égal à|égale/gi, remplacement: "=" },
  { motif: /différent de/gi, remplacement: "\\neq" },
  { motif: /supérieur ou égal à/gi, remplacement: "\\geq" },
  { motif: /inférieur ou égal à/gi, remplacement: "\\leq" },
  { motif: /supérieur à/gi, remplacement: ">" },
  { motif: /inférieur à/gi, remplacement: "<" },
  { motif: /appartient à/gi, remplacement: "\\in" },
  { motif: /n'appartient pas à/gi, remplacement: "\\notin" },
  { motif: /est inclus dans/gi, remplacement: "\\subset" },

  // Fonctions/constantes/ensembles
  { motif: /\bsinus\b/gi, remplacement: "\\sin" },
  { motif: /\bcosinus\b/gi, remplacement: "\\cos" },
  { motif: /\btangente\b/gi, remplacement: "\\tan" },
  { motif: /\blogarithme( népérien)?\b/gi, remplacement: (_m, nep) => (nep ? "\\ln" : "\\log") },
  { motif: /\bexponentielle\b/gi, remplacement: "\\exp" },
  { motif: /\bpi\b/gi, remplacement: "\\pi" },
  { motif: /\binfini\b/gi, remplacement: "\\infty" },
  { motif: /\bthêta\b/gi, remplacement: "\\theta" },
  { motif: /\balpha\b/gi, remplacement: "\\alpha" },
  { motif: /\bbêta\b/gi, remplacement: "\\beta" },
  { motif: /\bdelta\b/gi, remplacement: "\\delta" },
  { motif: /ensemble des réels|\bréels\b/gi, remplacement: "\\mathbb{R}" },
  { motif: /ensemble des entiers naturels|\bentiers naturels\b/gi, remplacement: "\\mathbb{N}" },
  { motif: /ensemble des entiers relatifs|\bentiers relatifs\b/gi, remplacement: "\\mathbb{Z}" },
];

export function texteParleVersLatex(phraseOrale: string): string {
  let resultat = normaliserNombresLettres(phraseOrale.trim());
  for (const { motif, remplacement } of REGLES) {
    resultat = resultat.replace(motif, remplacement as never);
  }
  return resultat.replace(/\s+/g, " ").trim();
}
