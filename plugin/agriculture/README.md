# Event-drone — Plugin Agriculture

## Présentation

Module Agriculture compact intégré à Event-drone.

- aucune modification de la largeur du site, de `main` ou du header ;
- la largeur est héritée de l'`index.html` existant (notamment les réglages 800 px / 900 px) ;
- aucun calendrier global en haut ;
- `J F M A M J J A S O N D` est présent dans chaque carte ;
- le mois courant est entouré en rouge dans chaque carte ;
- jaune = prospection thermique ;
- vert = récolte/fauche ;
- liseré complet jaune ou vert autour de la carte lorsque la période est active ;
- clic sur la carte pour afficher les détails ;
- aucune étoile.

## Fichiers

- `agriculture.json` : données agricoles
- `agriculture.js` : logique et affichage
- `agriculture.css` : style du module

Le plugin ne modifie pas `index.html`, `app.js`, `events.json` ou les dimensions globales de l'application.
