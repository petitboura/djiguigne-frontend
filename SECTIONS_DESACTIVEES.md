# Sections désactivées

Ce document recense les sections de l'application qui ont été désactivées mais pas supprimées. Le code de chaque section reste en place, intact, prêt à être remis en avant si besoin.

**Règle commune à toutes les entrées ci-dessous : ne pas réactiver ni réutiliser ce code tant que Bourama ne le demande pas explicitement.**

---

## Ancien tableau de bord

- **Fichier concerné** : `app/dashboard/page.tsx`
- **Désactivé le** : autour du 01/08/2026
- **Raison** : remplacé dans la navigation par `/dashboard/espace` (Bibliothèque + Mémoire + Historique)
- **État de l'URL** : reste joignable directement pour qui a le lien
- **Ce qui a été coupé** : le lien depuis `TopBar.tsx` et `SidebarChat.tsx`

## Mon espace version rôle

- **Fichier concerné** : `app/dashboard/espace-role/page.tsx`
- **Désactivé le** : 05/08/2026
- **Raison** : le système de rôle (établissement/enseignant/étudiant) n'est plus utilisé
- **État de l'URL** : reste joignable directement pour qui a le lien
- **Ce qui a été coupé** : le branchement par rôle dans `TopBar.tsx` (tout le monde va maintenant vers `/dashboard/espace`) et les redirections après connexion/inscription (`app/connexion/page.tsx`, `app/inscription/page.tsx`), qui envoient maintenant tout le monde vers l'accueil
- **À savoir** : le parcours d'inscription établissement/enseignant/étudiant existe aussi côté vitrine (`djiguigne-ai`, composant `InscriptionEtablissements.tsx`), pas encore traité ici

## Équipe

- **Fichier concerné** : `app/dashboard/equipe/page.tsx`
- **Désactivé le** : 05/08/2026
- **Raison** : ancienne URL, remplacée par Mon espace version rôle (elle-même désactivée ci-dessus). Ce fichier n'était déjà plus qu'une redirection automatique vers `/dashboard/espace-role`.
- **État de l'URL** : reste joignable directement (redirige vers espace-role, lui-même toujours joignable)
- **Ce qui a été coupé** : rien de plus à couper, aucun lien actif ne pointait déjà dessus

## Profil (modifier)

- **Fichier concerné** : `app/dashboard/profil/modifier/page.tsx`
- **Désactivé le** : 05/08/2026
- **Raison** : demande de Bourama. Plus aucun lien actif ne menait déjà à cette page (le seul lien venait de l'ancien tableau de bord, déjà désactivé)
- **État de l'URL** : reste joignable directement
- **Ce qui a été coupé** : rien, aucun lien actif ne pointait dessus

## Portfolio public créateur

- **Fichier concerné** : `app/u/[id]/page.tsx` (+ composants liés utilisés uniquement par cette page : `SectionsPostsCreateur.tsx`, `PostCard.tsx`)
- **Désactivé le** : 05/08/2026
- **Raison** : demande de Bourama. Les entrées qui y menaient (ancien tableau de bord, `CreateurCard.tsx`, `BoutonProfilCreateur.tsx`) sont déjà mortes ou inutilisées. La fonctionnalité "suivre" n'étant plus accessible nulle part, aucune nouvelle notification de suivi ne peut plus être créée.
- **État de l'URL** : reste joignable directement, y compris via une éventuelle ancienne notification "follow" déjà reçue par un utilisateur (`NotificationsCloche.tsx`)
- **Ce qui a été coupé** : rien de plus, aucun lien actif ne pointait dessus en dehors de la notification historique mentionnée ci-dessus
