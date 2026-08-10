# 🌾 Module Agriculture — Event-drone

Nouveau module destiné au calendrier des travaux agricoles et à la prospection de détection de faune par caméra thermique.

## Fonctionnement

Pour chaque activité agricole :

1. période agricole estimée ;
2. type de récolte ou de fauche ;
3. niveau d'intérêt pour la prospection thermique ;
4. explication ;
5. communes / secteurs concernés.

La règle de prospection demandée est :

**début de la période agricole - 1 mois**

Le module affiche donc un indicateur :

> 🚁 Période favorable à la prospection thermique

environ un mois avant le début de la période concernée.

## Activités prévues

- 🌾 Moisson céréales
- 🟡 Récolte du colza
- 🌽 Récolte du maïs fourrage
- 🌽 Récolte du maïs grain
- 🌻 Récolte du tournesol
- 🌱 Fauche / ensilage

## Niveau d'intérêt

- ★ Faible
- ★★ Intéressant
- ★★★ Très intéressant

## Secteur initial

Châteaubriant / Loire-Atlantique.

## Fichiers

- `agriculture.json` : données agricoles
- `agriculture.js` : logique et rendu
- `agriculture.css` : style du module
- `integration-example.html` : exemple d'intégration dans Event-drone

## Important

Les périodes sont indicatives. Elles dépendent de l'année, de la météo, de la maturité des cultures, de la parcelle et des pratiques de l'exploitation.

Le module doit être alimenté à terme par des sources agricoles locales et actualisées. Il ne faut pas considérer les périodes comme des dates certaines d'intervention.

## Données 2026

Les données agricoles régionales disponibles indiquent notamment la présence de céréales, colza, tournesol et maïs en Loire-Atlantique / Pays de la Loire. Les périodes affichées dans ce prototype sont donc des fenêtres indicatives et non des prévisions officielles de récolte.
