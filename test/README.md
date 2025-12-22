# Tests Automatiques - Tataouine Pizza

## 📋 Vue d'ensemble

Les tests automatiques vérifient que le processus complet de commande fonctionne correctement :
- ✅ Onboarding (nom + téléphone + OTP + localisation GPS)
- ✅ Calcul du total avec frais de livraison (2 TND)
- ✅ Création de commande via l'API (avec coordonnées GPS)

## 🚀 Lancer les tests

### Mode simple (une fois)
```bash
npm test
```

### Mode watch (relance automatique)
```bash
npm run test:watch
```
Les tests se relancent automatiquement quand tu modifies le code.

### Interface graphique
```bash
npm run test:ui
```
Ouvre une page web avec les résultats détaillés.

### Couverture de code
```bash
npm run test:coverage
```
Affiche le pourcentage de code testé.

## 📁 Structure des tests

- `onboarding-flow.test.tsx` : Test du flow complet d'onboarding (nom + téléphone + OTP + localisation GPS)
- `cart-delivery.test.tsx` : Test du calcul avec frais de livraison (2 TND)
- `api-orders.test.ts` : Test de l'API de création de commande (avec coordonnées GPS)
- `test-utils.tsx` : Utilitaires de test (providers React)
- `setup.ts` : Configuration globale des tests

## ✅ Tests actuels (7 tests - tous passent)

### Onboarding Flow (3 tests)
1. ✅ Affichage initial de l'étape téléphone
2. ✅ Envoi OTP avec nom et téléphone
3. ✅ Vérification OTP et passage à l'étape localisation

### API Orders (2 tests)
1. ✅ Création de commande avec données valides (inclut GPS)
2. ✅ Rejet de commande avec données invalides

### Cart Delivery (2 tests)
1. ✅ Calcul du total avec frais de livraison
2. ✅ Formatage des frais de livraison

## 🔍 Comment lire les résultats

### ✅ Test qui passe (vert)
```
✓ onboarding-flow.test.tsx > should complete full onboarding (245ms)
```
Tout fonctionne correctement !

### ❌ Test qui échoue (rouge)
```
✗ cart-delivery.test.tsx > should calculate total with delivery
  Expected: "17.00 TND"
  Received: "15.00 TND"
```
Il y a un bug à corriger (ici, la livraison n'est pas incluse).

## 📝 Tests à ajouter (futur)

- [ ] Test du système de visibilité cyclique des commandes
- [ ] Test WebSocket pour les notifications livreurs
- [ ] Test de navigation GPS
- [ ] Test du système de dispatch (premier arrivé, premier servi)
- [ ] Test du récapitulatif de commande

## 💡 Conseils

1. **Lance les tests avant chaque commit** pour éviter de casser quelque chose
2. **Utilise `test:watch`** pendant le développement
3. **Regarde les messages d'erreur** : ils t'indiquent exactement ce qui ne va pas
4. **Ajoute des tests** pour chaque nouvelle fonctionnalité

## 🛠️ Configuration

Les tests utilisent :
- **Vitest** : Framework de test
- **React Testing Library** : Pour tester les composants React
- **jsdom** : Environnement de navigateur simulé
- **Alias `@/`** : Pour importer depuis `client/src`
