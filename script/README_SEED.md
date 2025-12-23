# Script de Seed - Données de Test

Ce script permet d'insérer des données de test complètes dans la base de données.

## 📋 Contenu des données

### Restaurants (5)
1. **Pizza del Sol** - Pizzas italiennes (pizza, drink, dessert)
2. **Sahara Grill** - Grillades tunisiennes (grill, burger, salade, drink)
3. **Tataouine Pizza** - Pizzas et fast-food (pizza, burger, drink, dessert)
4. **Le Jardin Salades** - Salades fraîches (salade, drink, dessert)
5. **Burger House** - Burgers gourmets (burger, drink, dessert)

### Livreurs (5)
- Mohamed Ben Ali
- Ahmed Trabelsi
- Salah Hammami
- Youssef Khelifi
- Karim Mezghani

**Mot de passe pour tous les livreurs :** `driver123`

### Produits (24 au total)
- **Pizza del Sol** : 5 produits (pizzas, boissons, desserts)
- **Sahara Grill** : 4 produits (grillades, burgers, salades, boissons)
- **Tataouine Pizza** : 5 produits (pizzas, burgers, boissons, desserts)
- **Le Jardin Salades** : 4 produits (salades, boissons, desserts)
- **Burger House** : 5 produits (burgers, boissons, desserts)

## 🚀 Utilisation

### 1. Vider la base de données (optionnel)
```bash
npm run db:clear
```

### 2. Insérer les données de test
```bash
npm run db:seed
```

## ⚠️ Note importante

- Le script ignore les erreurs de doublon (si les données existent déjà)
- Vous pouvez exécuter le script plusieurs fois sans problème
- Les IDs sont fixes pour faciliter les tests

## 📊 Résumé après exécution

Après l'exécution, vous aurez :
- ✅ 5 restaurants avec leurs caractéristiques complètes
- ✅ 5 livreurs prêts à utiliser
- ✅ 24 produits avec leurs prix par taille

## 🔧 Personnalisation

Vous pouvez modifier le fichier `script/seed-data.ts` pour :
- Ajouter plus de restaurants
- Ajouter plus de livreurs
- Ajouter plus de produits
- Modifier les prix
- Modifier les descriptions


