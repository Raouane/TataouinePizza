# ✅ Modification : "Livreur trouvé" conditionné à l'acceptation

**Date** : 2025-01-XX  
**Statut** : ✅ **IMPLÉMENTÉ**

---

## 🎯 Objectif

Le message "Livreur trouvé !" ne doit s'afficher que **quand un livreur a réellement accepté la commande** (en cliquant sur le lien Telegram), et non pas automatiquement après 3-5 secondes.

---

## 🔄 Ancien Comportement

```
1. Commande créée
2. Attente 3-5 secondes (timer fixe)
3. "Livreur trouvé !" s'affiche (même si personne n'a accepté)
4. Phase "tracking"
```

**Problème** : Le message apparaissait même si aucun livreur n'avait accepté.

---

## ✅ Nouveau Comportement

```
1. Commande créée
   └─> Phase: 'searching' (Recherche de livreur...)
       └─> RESTE en "searching" jusqu'à acceptation

2. Livreur clique sur lien Telegram
   └─> Accepte la commande
   └─> driverId ajouté à la commande

3. driverId détecté dans orderData (polling toutes les 2s)
   └─> Phase: 'found' (Livreur trouvé !) - 2 secondes
   └─> Phase: 'tracking' (Suivi en temps réel)
```

**Avantage** : Le message n'apparaît que quand un livreur a réellement accepté.

---

## 📝 Modifications Apportées

### 1. Hook `useOrderTracking` (`client/src/hooks/use-order-tracking.ts`)

**Avant** :
- Timer fixe de 3-5 secondes
- Passage automatique à "found"

**Après** :
- Écoute de `orderData.driverId`
- Reste en "searching" tant que `driverId` est absent
- Passe à "found" uniquement quand `driverId` est présent

**Code clé** :
```typescript
// Si un livreur a déjà accepté (driverId présent)
if (orderData?.driverId) {
  // Afficher "found" puis "tracking"
  setPhase('found');
  // ...
} else {
  // Pas encore de livreur assigné - rester en "searching"
  setPhase('searching');
}
```

### 2. Polling Adaptatif (`client/src/lib/order-context.tsx`)

**Avant** :
- Polling toutes les 5 secondes

**Après** :
- Polling toutes les **2 secondes** si on attend l'acceptation (`!driverId`)
- Polling toutes les **5 secondes** sinon

**Code clé** :
```typescript
const isWaitingForDriver = !orderData?.driverId && 
                           orderData?.status !== 'delivered' && 
                           orderData?.status !== 'rejected';
const pollInterval = isWaitingForDriver ? 2000 : 5000; // 2s si attente, 5s sinon
```

---

## 🧪 Test du Nouveau Comportement

### Scénario de Test

1. **Créer une commande**
   - Aller sur `/cart`
   - Valider la commande
   - Redirection vers `/success`

2. **Vérifier la phase "searching"**
   - Message : "Recherche de livreur..."
   - Animation de chargement
   - **Doit rester affiché** jusqu'à acceptation

3. **Accepter via Telegram**
   - Ouvrir Telegram
   - Cliquer sur le lien dans le message
   - Accepter la commande

4. **Vérifier la transition**
   - Après acceptation, `driverId` apparaît dans `orderData`
   - Phase "found" s'affiche : "Livreur trouvé !" (2 secondes)
   - Phase "tracking" s'affiche : Suivi en temps réel

### Résultat Attendu

- ✅ "Recherche de livreur..." reste affiché jusqu'à acceptation
- ✅ "Livreur trouvé !" s'affiche uniquement après acceptation
- ✅ Détection rapide (polling 2s)
- ✅ Transition fluide

---

## 📊 Avantages

1. **UX plus honnête** : Pas de faux espoir
2. **Feedback réel** : Le client voit vraiment quand un livreur accepte
3. **Détection rapide** : Polling 2s pendant l'attente
4. **Cohérence** : Le message correspond à la réalité

---

## 🔍 Détails Techniques

### Détection de l'Acceptation

L'acceptation est détectée via :
- `orderData.driverId` : Présent quand un livreur a accepté
- Polling toutes les 2 secondes pendant l'attente
- `useEffect` qui réagit au changement de `driverId`

### Gestion du SessionStorage

- Clé : `orderFoundShown_{orderId}`
- Évite d'afficher "found" plusieurs fois
- Permet de revenir à la page sans rejouer l'animation

---

## ✅ Checklist de Validation

- [x] Hook modifié pour écouter `driverId`
- [x] Polling adaptatif implémenté (2s pendant attente)
- [x] Phase "searching" reste active jusqu'à acceptation
- [x] Phase "found" s'affiche uniquement après acceptation
- [x] Pas d'erreurs de lint
- [ ] Test manuel : Créer commande → Vérifier "searching" → Accepter → Vérifier "found"

---

## 🚀 Prochaines Étapes

1. **Tester manuellement** le nouveau comportement
2. **Vérifier** que la détection est rapide (2s max)
3. **Valider** que l'UX est meilleure

---

**Modification terminée le** : 2025-01-XX  
**Fichiers modifiés** :
- `client/src/hooks/use-order-tracking.ts`
- `client/src/lib/order-context.tsx`
