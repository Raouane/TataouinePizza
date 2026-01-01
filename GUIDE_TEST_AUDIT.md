# 🧪 Guide de Test - Améliorations Audit Priorité 1

**Date** : 2025-01-XX  
**Statut** : ✅ Tests automatisés passent (16/16)

---

## ✅ Tests Automatisés

Tous les tests structurels passent :
- ✅ Hook `useOrderTracking` créé et utilisé
- ✅ Session sync (client + serveur) implémenté
- ✅ Machine d'état centralisée (backend + frontend)
- ✅ Intégration dans onboarding et cart-page

**Commande** : `npm run test:audit`

---

## 🧪 Tests Manuels dans le Navigateur

### 1. Test 1 : Refactor `/success` avec Hook

**Objectif** : Vérifier que `/success` fonctionne avec le nouveau hook

**Étapes** :
1. Démarrer le serveur : `npm run dev`
2. Créer une commande (via `/cart`)
3. Vérifier la page `/success` :
   - ✅ Phase "Recherche de livreur..." s'affiche (3-5s)
   - ✅ Phase "Livreur trouvé !" s'affiche (2s)
   - ✅ Phase "Suivi en temps réel" s'affiche
   - ✅ Les données de commande se chargent correctement
   - ✅ Le nom du livreur s'affiche quand assigné
   - ✅ Le statut se met à jour en temps réel

**Vérifications** :
- [ ] Pas d'erreurs dans la console
- [ ] Transitions fluides entre les phases
- [ ] Données affichées correctement
- [ ] Performance : page réactive

---

### 2. Test 2 : Session Sync (Fallback localStorage)

**Objectif** : Vérifier que les données sont synchronisées avec le serveur

#### Test 2.1 : Onboarding
1. Aller sur `/onboarding`
2. Compléter l'onboarding (nom, téléphone, adresse)
3. Vérifier dans la console serveur :
   - ✅ Log `[Session] ✅ Session synchronisée pour {phone}`
4. Vérifier dans la console navigateur :
   - ✅ Pas d'erreur de sync

#### Test 2.2 : Création Commande
1. Créer une commande via `/cart`
2. Vérifier dans la console serveur :
   - ✅ Log `[Session] ✅ Session synchronisée pour {phone}`
3. Vérifier dans la console navigateur :
   - ✅ Pas d'erreur de sync

#### Test 2.3 : Restauration Session (Simulation localStorage vide)
1. Ouvrir DevTools → Application → Local Storage
2. Supprimer toutes les clés
3. Recharger la page
4. **Note** : La restauration automatique nécessiterait un téléphone connu
   - Pour tester complètement, il faudrait une commande existante avec ce téléphone

**Vérifications :
- [ ] Onboarding sync fonctionne
- [ ] Cart sync fonctionne
- [ ] Pas d'erreurs dans les logs
- [ ] Performance : sync non-bloquant

---

### 3. Test 3 : Machine d'État Centralisée

**Objectif** : Vérifier que les transitions de statut sont gérées par le backend

#### Test 3.1 : API Transitions
1. Créer une commande (status: `accepted`)
2. Appeler l'API : `GET /api/orders/{orderId}/transitions`
3. Vérifier la réponse :
   ```json
   {
     "transitions": ["preparing", "ready", "rejected"]
   }
   ```
4. Vérifier que `delivery` n'est **pas** dans les transitions (logique correcte)

#### Test 3.2 : Hook Frontend
1. Dans le navigateur, ouvrir DevTools → Console
2. Tester le hook (nécessite React DevTools ou intégration dans une page) :
   ```typescript
   // À tester dans une page React
   const { transitions, canTransition } = useOrderTransitions(orderId);
   console.log('Transitions:', transitions);
   console.log('Can transition to ready:', canTransition('ready'));
   ```

**Vérifications** :
- [ ] API retourne les bonnes transitions
- [ ] Transitions cohérentes avec le statut actuel
- [ ] Hook fonctionne correctement (si testé)

---

## 📊 Checklist Complète

### Tests Fonctionnels
- [ ] Page `/success` fonctionne avec le hook
- [ ] Session sync après onboarding
- [ ] Session sync après création commande
- [ ] API transitions retourne les bonnes valeurs
- [ ] Pas d'erreurs dans la console

### Tests de Performance
- [ ] Page `/success` se charge rapidement
- [ ] Sync session non-bloquant
- [ ] Pas de ralentissement perceptible

### Tests de Robustesse
- [ ] Gestion des erreurs (si sync échoue)
- [ ] Fallback si localStorage vide
- [ ] Transitions cohérentes

---

## 🐛 Problèmes Connus / À Surveiller

### Problème Potentiel 1 : Sync Session
- **Description** : Si le serveur est down, le sync échoue silencieusement
- **Impact** : Faible (fallback localStorage fonctionne)
- **Solution** : Déjà géré (non-bloquant)

### Problème Potentiel 2 : Transitions
- **Description** : Les transitions ne sont pas encore utilisées dans l'UI
- **Impact** : Aucun (préparation pour l'avenir)
- **Solution** : Intégrer dans les prochaines itérations

---

## ✅ Résultat Attendu

Après tous les tests :
- ✅ Toutes les fonctionnalités fonctionnent
- ✅ Pas d'erreurs critiques
- ✅ Performance maintenue
- ✅ Code plus maintenable

---

## 🚀 Prochaines Étapes

Si tous les tests passent :
1. ✅ Priorité 1 validée
2. ⏳ Passer à Priorité 2 (UX Livreur)
3. ⏳ Passer à Priorité 3 (Améliorations futures)

---

**Guide créé le** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
