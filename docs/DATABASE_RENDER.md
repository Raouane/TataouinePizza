# Base de données sur Render - Guide complet

## 🎯 Vue d'ensemble

Ce document explique comment la base de données PostgreSQL fonctionne une fois déployée sur Render, et comment les migrations et le seed sont gérés automatiquement.

## 📋 Processus automatique

### 1. Création de la base de données

Quand vous créez une base PostgreSQL sur Render (via `render.yaml` ou manuellement) :

- ✅ Render crée une base de données PostgreSQL vide
- ✅ Il génère automatiquement une `DATABASE_URL` (Internal Database URL)
- ✅ Cette URL est automatiquement liée au service Web via les variables d'environnement

### 2. Premier démarrage de l'application

Quand votre application démarre pour la première fois sur Render :

```typescript
// Dans server/routes.ts, ligne 45-131
if (!seeded) {
  // Vérifie si des restaurants existent
  const existingRestaurants = await storage.getAllRestaurants();
  
  if (existingRestaurants.length === 0) {
    // Base vide → Exécute automatiquement :
    // 1. Création des tables (via Drizzle)
    // 2. Seed des données de démonstration
  }
}
```

**Ce qui se passe automatiquement :**

1. **Création des tables** : Drizzle Kit crée toutes les tables nécessaires
2. **Migrations manuelles** : Les colonnes supplémentaires sont ajoutées (si nécessaire)
3. **Seed des données** : Création automatique de :
   - 3 restaurants de démonstration
   - Plusieurs pizzas avec prix
   - 3 livreurs de test

### 3. Structure de la base de données

#### Tables principales

| Table | Description |
|-------|-------------|
| `admin_users` | Comptes administrateurs |
| `restaurants` | Restaurants avec horaires, statut ouvert/fermé |
| `pizzas` | Menu des pizzas (lié à un restaurant) |
| `pizza_prices` | Prix par taille (small/medium/large) |
| `drivers` | Livreurs avec statut et `last_seen` |
| `orders` | Commandes avec coordonnées GPS client |
| `order_items` | Détails des articles commandés |
| `otp_codes` | Codes OTP pour vérification téléphone |

#### Colonnes importantes ajoutées après création initiale

- `drivers.last_seen` : Dernière connexion du livreur (pour WebSocket)
- `orders.assigned_at` : Timestamp d'assignation à un livreur
- `orders.customer_lat` : Latitude GPS du client
- `orders.customer_lng` : Longitude GPS du client

## 🔧 Migrations manuelles (si nécessaire)

Si vous devez exécuter les migrations manuellement (par exemple, après avoir ajouté de nouvelles colonnes) :

### Option 1 : Via Render Shell

1. Allez dans Render Dashboard → Votre service Web
2. Cliquez sur **"Shell"**
3. Exécutez :
   ```bash
   npm run db:migrate
   ```

### Option 2 : Via script de migration

Le script `script/migrate-db.ts` fait :

1. **Push du schéma Drizzle** : Crée/met à jour toutes les tables
2. **Migrations manuelles** : Ajoute les colonnes supplémentaires
3. **Vérifications** : S'assure que tout est en ordre

```bash
# Localement (pour tester)
npm run db:migrate

# Sur Render (via Shell)
npm run db:migrate
```

## 📊 Données de démonstration créées automatiquement

### Restaurants

1. **Tataouine Pizza**
   - Téléphone: `21611111111`
   - Adresse: Avenue Habib Bourguiba, Tataouine
   - Pizzas: Margherita, La Tunisienne, Tataouine Spéciale

2. **Pizza del Sol**
   - Téléphone: `21622222222`
   - Adresse: Rue de la Liberté, Tataouine
   - Pizzas: Pepperoni, 4 Fromages, Vegetarian

3. **Sahara Grill**
   - Téléphone: `21633333333`
   - Adresse: Boulevard de l'Environnement, Tataouine
   - Pizzas: Mechoui, Brochettes Mixtes

### Livreurs de test

| Nom | Téléphone | Mot de passe |
|-----|-----------|--------------|
| Mohamed | 21612345678 | `driver123` |
| Ahmed | 21698765432 | `driver123` |
| Fatima | 21625874123 | `driver123` |

**Note** : Les mots de passe sont hashés avec bcrypt dans la base de données.

### Prix des pizzas

Toutes les pizzas ont 3 tailles :
- **Small** : 10 TND
- **Medium** : 15 TND
- **Large** : 18 TND

## ✅ Vérifier que tout fonctionne

### 1. Vérifier les logs Render

Après le premier déploiement, consultez les logs. Vous devriez voir :

```
[DB] Seeding database with demo data...
[DB] Demo data seeded successfully!
```

### 2. Tester l'API

```bash
# Vérifier que les restaurants sont créés
curl https://votre-app.onrender.com/api/restaurants

# Devrait retourner un tableau avec 3 restaurants
```

### 3. Se connecter comme livreur

1. Allez sur `https://votre-app.onrender.com/driver/login`
2. Utilisez un des téléphones de test : `21612345678`
3. Mot de passe : `driver123`

## 🔄 Mises à jour de la base de données

### Ajouter une nouvelle colonne

1. **Mettre à jour le schéma** (`shared/schema.ts`)
2. **Créer une migration manuelle** (`script/migrate-db.ts`)
3. **Déployer** : Render exécutera automatiquement la migration au démarrage

### Exemple : Ajouter une colonne `notes` à `orders`

```typescript
// 1. Dans shared/schema.ts
export const orders = pgTable("orders", {
  // ... colonnes existantes
  notes: text("notes"), // Nouvelle colonne
});

// 2. Dans script/migrate-db.ts, ajouter :
await pool.query(`
  ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS notes TEXT;
`);

// 3. Déployer sur Render
// La migration s'exécutera automatiquement au prochain démarrage
```

## 🚨 Dépannage

### Erreur : "relation does not exist"

**Cause** : Les tables n'ont pas été créées.

**Solution** :
1. Vérifiez les logs pour voir si le seed s'est exécuté
2. Exécutez manuellement : `npm run db:migrate` via Render Shell
3. Vérifiez que `DATABASE_URL` est correctement configurée

### Erreur : "column does not exist"

**Cause** : Une colonne manquante (ex: `customer_lat`, `assigned_at`).

**Solution** :
1. Exécutez `npm run db:migrate` via Render Shell
2. Ou attendez le prochain redémarrage (la migration s'exécutera automatiquement)

### La base de données est vide après déploiement

**Cause** : Le seed ne s'est pas exécuté.

**Solution** :
1. Vérifiez les logs pour voir les erreurs
2. Redémarrez le service (Render Dashboard → Manual Deploy)
3. Le seed s'exécutera automatiquement au redémarrage

## 📝 Notes importantes

1. **Premier démarrage** : Peut prendre 30-60 secondes (création des tables + seed)
2. **Plan gratuit** : La base de données peut "s'endormir" après 15 minutes d'inactivité
3. **Backup** : Render fait des backups automatiques (plan gratuit : 7 jours de rétention)
4. **Variables d'environnement** : `DATABASE_URL` est automatiquement fournie par Render quand vous liez la base de données

## 🔗 Ressources

- [Documentation Render - PostgreSQL](https://render.com/docs/databases)
- [Documentation Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Guide de déploiement complet](./DEPLOY_RENDER.md)





