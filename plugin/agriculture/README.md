# 🌾 Event-drone — Plugin Agriculture

Module indépendant pour le calendrier agricole et la prospection thermique.

## Installation

Copier le dossier `plugin/agriculture/` dans Event-drone.

```text
Event-drone/
└── plugin/
    └── agriculture/
        ├── agriculture.json
        ├── agriculture.js
        ├── agriculture.css
        └── README.md
```

## Chargement

Dans `index.html` :

```html
<link rel="stylesheet" href="plugin/agriculture/agriculture.css">
<script src="plugin/agriculture/agriculture.js"></script>
```

Créer ensuite le conteneur de la page Agriculture :

```html
<section id="agriculture" hidden></section>
```

À l'ouverture de l'onglet :

```javascript
EventDroneAgriculture.init(document.querySelector('#agriculture'));
```

## Contenu

Chaque activité indique :

1. période agricole ;
2. type de récolte / fauche ;
3. niveau d'intérêt thermique ;
4. explication ;
5. communes / secteurs concernés.

La règle actuelle est une fenêtre de prospection thermique **1 mois avant le début de la période agricole**.

Les périodes restent indicatives et devront pouvoir être remplacées par des données agricoles actualisées.
