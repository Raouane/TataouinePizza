# 🧪 Guide de Test Manuel - Améliorations Audit Priorité 1

**Date** : 2025-01-XX  
**Objectif** : Tester manuellement les améliorations dans le navigateur

---

## 📋 Prérequis

1. **Serveur démarré** :
   ```bash
   npm run dev
   ```
   - Vérifier que le serveur tourne sur `http://localhost:5000`
   - Vérifier qu'il n'y a pas d'erreurs au démarrage

2. **Base de données** :
   - Au moins 1 restaurant avec des pizzas
   - Au moins 1 livreur avec `telegramId` (pour tests complets)

3. **Ouvrir le navigateur** :
   - Chrome/Edge recommandé (DevTools)
   - Ouvrir la console (F12)

---

## 🧪 Test 1 : Refactor `/success` avec Hook `useOrderTracking`

### Objectif
Vérifier que la page `/success` fonctionne correctement avec le nouveau hook.

### Étapes

#### 1.1 Créer une commande
1. Aller sur `http://localhost:5000`
2. Cliquer sur un restaurant
3. Ajouter des pizzas au panier
4. Aller au panier (`/cart`)
5. Compléter les étapes :
   - Vérifier panier
   - Entrer téléphone (si pas dans onboarding)
   - Entrer adresse
   - Valider la commande

#### 1.2 Vérifier la page `/success`
Après validation, vous devriez être redirigé vers `/success`.

**Vérifications visuelles** :

✅ **Phase 1 : "Recherche de livreur..."** (3-5 secondes)
- [ ] Animation de chargement (bike qui tourne)
- [ ] Texte "Recherche de livreur..."
- [ ] Points animés (loading dots)
- [ ] Durée : entre 3 et 5 secondes

✅ **Phase 2 : "Livreur trouvé !"** (2 secondes)
- [ ] Icône check verte
- [ ] Texte "Livreur trouvé !"
- [ ] Transition fluide depuis Phase 1
- [ ] Durée : environ 2 secondes

✅ **Phase 3 : "Suivi en temps réel"**
- [ ] Carte avec route animée
- [ ] Adresse de livraison affichée
- [ ] Statut de la commande (accepted → ready → delivery → delivered)
- [ ] Temps estimé affiché
- [ ] Détails de la commande (restaurant, items, total)

#### 1.3 Vérifier la console navigateur
Ouvrir DevTools → Console (F12)

**Vérifications** :
- [ ] Pas d'erreurs JavaScript
- [ ] Logs normaux (pas d'erreurs rouges)
- [ ] Logs de tracking : `[OrderSuccess]`, `[useOrderTracking]`

**Exemple de logs attendus** :
```
[OrderSuccess] Chargement initial des données de commande
[useOrderTracking] ✅ Commande livrée détectée
```

#### 1.4 Vérifier les données en temps réel
Attendre quelques secondes et vérifier :
- [ ] Les données de commande se chargent
- [ ] Le statut se met à jour automatiquement
- [ ] Si un livreur est assigné, son nom s'affiche
- [ ] Les boutons "Appeler livreur" apparaissent quand livreur assigné

### ✅ Résultat Attendu
- Page `/success` fonctionne sans erreurs
- Transitions fluides entre les phases
- Données affichées correctement
- Performance : page réactive

### ❌ Problèmes Possibles
- **Erreur "useOrderTracking is not defined"** → Vérifier l'import dans `order-success.tsx`
- **Phases ne s'affichent pas** → Vérifier la console pour erreurs
- **Données ne se chargent pas** → Vérifier que `orderId` est présent dans l'URL ou sessionStorage

---

## 🧪 Test 2 : Session Sync (Fallback localStorage)

### Objectif
Vérifier que les données utilisateur sont synchronisées avec le serveur.

### Test 2.1 : Sync après Onboarding

#### Étapes
1. **Nettoyer localStorage** (pour test propre) :
   - Ouvrir DevTools → Application → Local Storage
   - Supprimer toutes les clés (ou juste `tp_onboarding`)

2. **Compléter l'onboarding** :
   - Aller sur `/onboarding`
   - Entrer nom : "Test User"
   - Entrer téléphone : "21612345678"
   - Entrer adresse : "123 Test Street"
   - Valider

3. **Vérifier la console serveur** :
   - Regarder les logs du terminal où tourne `npm run dev`
   - Chercher : `[Session] ✅ Session synchronisée pour 21612345678`

4. **Vérifier localStorage** :
   - DevTools → Application → Local Storage
   - Vérifier que `tp_onboarding` contient les données

5. **Vérifier la console navigateur** :
   - Pas d'erreurs de sync
   - Logs normaux

#### ✅ Résultat Attendu
- Log serveur : `[Session] ✅ Session synchronisée pour {phone}`
- localStorage mis à jour
- Pas d'erreurs dans la console navigateur

---

### Test 2.2 : Sync après Création Commande

#### Étapes
1. **Créer une commande** (comme Test 1.1)

2. **Vérifier la console serveur** :
   - Chercher : `[Session] ✅ Session synchronisée pour {phone}`
   - Le sync doit se faire **après** la création de commande

3. **Vérifier la console navigateur** :
   - Pas d'erreurs
   - Sync non-bloquant (pas de ralentissement)

#### ✅ Résultat Attendu
- Sync automatique après création commande
- Pas d'impact sur la performance
- Logs serveur confirmant le sync

---

### Test 2.3 : API Session (Optionnel - Test Direct)

#### Étapes
1. **Tester l'API directement** :
   - Ouvrir un nouvel onglet
   - Aller sur : `http://localhost:5000/api/session/sync`
   - Devrait retourner 400 (méthode GET non autorisée)

2. **Tester avec POST** (via console navigateur) :
   ```javascript
   fetch('/api/session/sync', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       phone: '21612345678',
       address: '123 Test Street',
       name: 'Test User'
     })
   })
   .then(r => r.json())
   .then(console.log)
   ```
   - Devrait retourner : `{ success: true }`

3. **Tester la restauration** :
   ```javascript
   fetch('/api/session/restore?phone=21612345678')
     .then(r => r.json())
     .then(console.log)
   ```
   - Devrait retourner les données sauvegardées

#### ✅ Résultat Attendu
- API sync fonctionne (POST)
- API restore fonctionne (GET)
- Données correctement sauvegardées et restaurées

---

## 🧪 Test 3 : Machine d'État Centralisée

### Objectif
Vérifier que les transitions de statut sont gérées par le backend.

### Test 3.1 : API Transitions

#### Étapes
1. **Créer une commande** (comme Test 1.1)
   - Noter l'`orderId` (dans l'URL `/success` ou dans la console)

2. **Tester l'API transitions** :
   - Ouvrir un nouvel onglet
   - Aller sur : `http://localhost:5000/api/orders/{orderId}/transitions`
   - Remplacer `{orderId}` par l'ID réel

3. **Vérifier la réponse** :
   ```json
   {
     "transitions": ["preparing", "ready", "rejected"]
   }
   ```
   - Pour une commande avec status `accepted`, les transitions doivent être : `["preparing", "ready", "rejected"]`
   - **IMPORTANT** : `delivery` ne doit **PAS** être dans les transitions (logique correcte)

4. **Tester avec différents statuts** :
   - Si possible, changer le statut de la commande (via admin)
   - Retester l'API
   - Vérifier que les transitions changent selon le statut

#### ✅ Résultat Attendu
- API retourne les bonnes transitions
- Transitions cohérentes avec le statut actuel
- Logique métier respectée (pas de transitions invalides)

#### 📊 Table de Référence des Transitions

| Statut Actuel | Transitions Autorisées |
|---------------|------------------------|
| `pending` | `accepted`, `rejected` |
| `accepted` | `preparing`, `ready`, `rejected` |
| `preparing` | `ready`, `rejected` |
| `ready` | `delivery`, `rejected` |
| `delivery` | `delivered`, `rejected` |
| `delivered` | *(aucune - état final)* |
| `rejected` | *(aucune - état final)* |

---

### Test 3.2 : Hook Frontend (Optionnel - Avancé)

#### Étapes
1. **Ouvrir React DevTools** (extension Chrome)
   - Installer si nécessaire : React Developer Tools

2. **Aller sur `/success`** avec une commande active

3. **Dans React DevTools** :
   - Trouver le composant `OrderSuccess`
   - Vérifier les props et state
   - Chercher l'utilisation de `useOrderTransitions` (si intégré)

4. **Tester dans la console navigateur** :
   ```javascript
   // Si le hook est utilisé dans la page
   // (nécessite que le hook soit exposé ou testé via React DevTools)
   ```

#### ✅ Résultat Attendu
- Hook disponible (si intégré dans l'UI)
- Transitions accessibles côté frontend

**Note** : Le hook `useOrderTransitions` est créé mais pas encore intégré dans l'UI. C'est normal, c'est une préparation pour l'avenir.

---

## 📊 Checklist Complète

### Tests Fonctionnels
- [ ] Page `/success` fonctionne avec le hook
- [ ] Phase "Recherche livreur" s'affiche (3-5s)
- [ ] Phase "Livreur trouvé" s'affiche (2s)
- [ ] Phase "Suivi temps réel" s'affiche
- [ ] Session sync après onboarding
- [ ] Session sync après création commande
- [ ] API transitions retourne les bonnes valeurs
- [ ] Pas d'erreurs dans la console

### Tests de Performance
- [ ] Page `/success` se charge rapidement (< 2s)
- [ ] Sync session non-bloquant (pas de ralentissement)
- [ ] Transitions fluides entre phases
- [ ] Pas de lag lors de la mise à jour des données

### Tests de Robustesse
- [ ] Gestion des erreurs (si sync échoue, pas de crash)
- [ ] Fallback si localStorage vide (session serveur)
- [ ] Transitions cohérentes (pas de transitions invalides)
- [ ] API transitions gère les commandes inexistantes (404)

---

## 🐛 Dépannage

### Problème 1 : Page `/success` ne se charge pas
**Solution** :
- Vérifier que `orderId` est présent dans l'URL ou sessionStorage
- Vérifier la console pour erreurs
- Vérifier que le serveur tourne

### Problème 2 : Sync session ne fonctionne pas
**Solution** :
- Vérifier les logs serveur
- Vérifier que la route `/api/session/sync` est enregistrée
- Vérifier la console navigateur pour erreurs réseau

### Problème 3 : API transitions retourne 404
**Solution** :
- Vérifier que l'`orderId` est correct
- Vérifier que la commande existe dans la base de données
- Vérifier que la route est enregistrée dans `order.routes.ts`

### Problème 4 : Erreurs TypeScript/Compilation
**Solution** :
- Vérifier que tous les fichiers sont sauvegardés
- Relancer `npm run dev`
- Vérifier les erreurs de lint : `npm run check`

---

## ✅ Résultat Final Attendu

Après tous les tests :
- ✅ Toutes les fonctionnalités fonctionnent
- ✅ Pas d'erreurs critiques
- ✅ Performance maintenue
- ✅ Code plus maintenable
- ✅ Prêt pour Priorité 2

---

## 📝 Notes de Test

**Date du test** : _______________

**Testeur** : _______________

**Résultats** :
- Test 1 (useOrderTracking) : ✅ / ❌
- Test 2.1 (Sync Onboarding) : ✅ / ❌
- Test 2.2 (Sync Commande) : ✅ / ❌
- Test 2.3 (API Session) : ✅ / ❌
- Test 3.1 (API Transitions) : ✅ / ❌
- Test 3.2 (Hook Frontend) : ✅ / ❌ (optionnel)

**Problèmes rencontrés** :
- 
- 
- 

**Commentaires** :
- 
- 
- 

---

## 🚀 Prochaines Étapes

Si tous les tests passent :
1. ✅ Priorité 1 validée
2. ⏳ Passer à Priorité 2 (UX Livreur)
3. ⏳ Passer à Priorité 3 (Améliorations futures)

---

**Guide créé le** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
