# Gestion de Caisse (Cash Management)

## 📋 Description

La fonctionnalité de **Gestion de Caisse** permet aux livreurs de suivre leurs encaissements en espèces (Cash) et de gérer la remise de caisse au restaurant.

Cette fonctionnalité inclut :
- **Étape 1** : Tableau de bord "Collecte & Gains" (espèces en main, commission, livraisons)
- **Étape 2** : Historique détaillé des encaissements avec code couleur
- **Étape 3** : Clôture de caisse avec validation par le gérant

## 🔧 Activation / Désactivation

### Par défaut : **DÉSACTIVÉE**

La fonctionnalité est désactivée par défaut pour éviter d'afficher des fonctionnalités non utilisées.

### Pour activer :

Ajoutez la variable d'environnement suivante :

```bash
ENABLE_CASH_MANAGEMENT=true
```

### Pour désactiver :

Soit supprimez la variable, soit définissez-la à `false` :

```bash
ENABLE_CASH_MANAGEMENT=false
```

## 📍 Où configurer

### En développement local

Ajoutez dans votre fichier `.env` :

```env
ENABLE_CASH_MANAGEMENT=true
```

### En production (Render, Vercel, etc.)

Ajoutez la variable d'environnement dans les paramètres de votre service :
- **Render** : Dashboard → Environment → Add Environment Variable
- **Vercel** : Settings → Environment Variables
- **Autres** : Consultez la documentation de votre hébergeur

## 🎯 Comportement

### Quand la fonctionnalité est **ACTIVÉE** (`ENABLE_CASH_MANAGEMENT=true`) :

✅ Les routes API suivantes sont disponibles :
- `GET /api/driver/cash-stats` - Statistiques de caisse
- `GET /api/driver/cash-history` - Historique des encaissements
- `GET /api/driver/cash-summary` - Résumé de fin de journée
- `POST /api/driver/cash-handover` - Remise de caisse
- `POST /api/admin/drivers/:driverId/cash-close` - Validation par le gérant

✅ Le dashboard livreur affiche :
- Section "Mes Gains (Espèces)"
- Historique des encaissements
- Résumé de fin de journée
- Bouton "Remettre la caisse"

### Quand la fonctionnalité est **DÉSACTIVÉE** (par défaut) :

❌ Les routes API retournent une erreur 403 :
```json
{
  "error": "Gestion de caisse désactivée",
  "message": "Cette fonctionnalité n'est pas disponible. Contactez l'administrateur."
}
```

❌ Le dashboard livreur :
- N'affiche pas la section "Mes Gains"
- Les appels API échouent silencieusement (pas d'erreur visible pour l'utilisateur)
- Les fonctionnalités de caisse ne sont pas accessibles

## 🔍 Vérification

Pour vérifier si la fonctionnalité est activée, consultez les logs au démarrage du serveur. Si activée, vous verrez les routes enregistrées.

## 📝 Notes

- La désactivation n'affecte pas les données existantes dans la base de données
- Les tables `cash_handovers` restent créées même si la fonctionnalité est désactivée
- Pour réactiver, il suffit d'ajouter la variable d'environnement et de redémarrer le serveur

## 🚀 Migration

Si vous activez la fonctionnalité pour la première fois, les tables nécessaires seront créées automatiquement au démarrage du serveur via les migrations automatiques.
