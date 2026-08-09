# Event-drone — version stable Châteaubriant

Cette archive correspond à la version de stabilisation de l'application.

## Secteur

Le secteur est volontairement verrouillé sur :

- Châteaubriant
- latitude : 47.718
- longitude : -1.376

La recherche de ville est conservée visuellement mais désactivée pour éviter de perturber les calculs de distance et l'affichage des événements.

## Fichiers à remplacer

Copier les 3 fichiers à la racine du dépôt :

- `index.html`
- `app.js`
- `style.css`

Ne pas remplacer `events.json` : il est généré automatiquement par GitHub Actions.

## Fonctions conservées

- filtre distance
- filtres rapides via les cartes statistiques
- favoris
- apprentissage des catégories favorites
- ★ / ★★ / ★★★
- exclusion d'un type d'événement
- contact
- état du vol
- détails
- chargement automatique de `events.json`
- actualisation manuelle
