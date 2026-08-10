# 🌾 Event-drone — Plugin Agriculture v2

Version compacte du module Agriculture.

## Présentation

Le menu affiche des cartes compactes représentant les différentes périodes agricoles.

Chaque carte peut être ouverte par clic pour afficher les informations détaillées.

### Liserets

- 🟢 vert : période de récolte / fauche en cours ;
- 🟡 jaune : période de prospection thermique, environ 1 mois avant ;
- aucun liseret : période trop éloignée.

L'explication générale de la prospection et le secteur sont affichés une seule fois en haut du module.

Les informations détaillées ne sont affichées qu'après clic sur une carte.

## Fichiers

- `agriculture.json` : données
- `agriculture.js` : logique
- `agriculture.css` : présentation

## Intégration

Le module est prévu pour :

```text
plugin/agriculture/
```

Dans `index.html` :

```html
<link rel="stylesheet" href="plugin/agriculture/agriculture.css">
<script src="plugin/agriculture/agriculture.js"></script>
```

Puis :

```javascript
EventDroneAgriculture.init(
  document.querySelector('#agriculture')
);
```
