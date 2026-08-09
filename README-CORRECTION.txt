Remplacer dans Event-drone:
- .github/workflows/update-events.yml
- scripts/build_events.py
- events.json

Puis GitHub > Actions > Mise à jour des événements > Run workflow.
Le workflow échoue volontairement si 0 événement est produit.
