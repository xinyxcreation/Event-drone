# 🌾 Event-drone — Plugin Agriculture

Le plugin Agriculture reste indépendant du module Accueil.

## Responsabilité du plugin

Le plugin fournit :

- le calendrier agricole complet ;
- le calcul des périodes de prospection ;
- le calcul des périodes de récolte/fauche ;
- le liseré de statut ;
- les détails des cultures ;
- un résumé Agriculture réutilisable par la page Accueil.

## Important : Accueil

**Accueil ne fait pas partie du plugin.**

La page de base (`index.html` / application principale) possède son propre onglet Accueil.

Le plugin expose simplement :

```javascript
EventDroneAgriculture.renderHome(container)
```

pour permettre à l'Accueil d'afficher les informations Agriculture.

Le résumé injecté dans Accueil contient uniquement :

- 🚁 les cultures actuellement en période de prospection thermique ;
- 🌱 les périodes de fauchage actuellement en cours.

Le clic sur un élément déclenche :

```text
eventdrone:agriculture-open
```

avec l'identifiant de la culture, afin que le fichier de base puisse ouvrir l'onglet Agriculture et afficher la culture correspondante.

## Fichiers

```text
plugin/agriculture/
├── agriculture.js
├── agriculture.css
├── agriculture.json
└── README.md
```

Aucune logique de navigation principale n'est placée dans ce dossier.
