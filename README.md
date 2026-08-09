# 🚁 Event-drone

Application web/PWA destinée à rechercher, trier et suivre les événements locaux présentant un intérêt pour des prises de vues aériennes par drone.

L'application permet d'identifier rapidement les événements intéressants, de gérer les favoris et le suivi des contacts, tout en apprenant progressivement les types d'événements préférés.

---

## 📦 Version

**v1.4.0 — Synchronisation cloud**

### Nouveautés v1.4.0

- ☁️ Synchronisation automatique avec Supabase
- 📱 Synchronisation PC ↔ téléphone
- ⭐ Sauvegarde persistante des favoris
- 📞 Sauvegarde du statut de contact
- 🚁 Sauvegarde du statut de vol
- 🧠 Conservation de l'apprentissage des événements favoris
- 💾 Conservation d'un cache local de secours
- 🔄 Récupération automatique des données au démarrage
- 📤 Migration automatique des anciennes données locales vers Supabase
- ⚡ Actions et filtres instantanés sans attendre la synchronisation cloud
- 🧹 Déduplication des événements
- ★ Potentiel
- ★★ Potentiel élevé
- ★★★ Très haut potentiel appris automatiquement

---

## 🎯 Objectif

Event-drone permet de transformer automatiquement une liste d'événements locaux en une liste exploitable pour la prospection drone.

L'application met en avant :

- les événements extérieurs ;
- les événements présentant un intérêt visuel ;
- les événements à proximité ;
- les événements à fort potentiel ;
- les événements déjà ajoutés aux favoris ;
- les événements nécessitant encore un contact.

---

## ✨ Fonctionnalités

### 📅 Événements

Les événements sont chargés depuis :

```text
events.json
