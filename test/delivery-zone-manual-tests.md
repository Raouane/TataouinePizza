# 🧪 Guide de Tests Manuels - Validation de Zone de Livraison

Ce document décrit les tests manuels à effectuer pour valider la fonctionnalité de validation de zone de livraison.

## 📋 Prérequis

1. **Navigateur** : Chrome/Firefox avec DevTools ouverts (F12)
2. **LocalStorage** : Vider le cache avant chaque test (`Application > Storage > Clear site data`)
3. **Service Worker** : Vérifier que la version v8 est active (`Application > Service Workers`)

---

## 🎯 Test 1 : Migration Automatique des Adresses

### Objectif
Vérifier que les adresses invalides (> 30 km) sont automatiquement supprimées au chargement.

### Étapes

1. **Préparer des données de test** :
   ```javascript
   // Dans la console du navigateur
   localStorage.setItem('savedAddresses_21678877', JSON.stringify([
     {
       id: 'addr1',
       label: 'Adresse Livrable',
       street: 'Cité Ennour, Tataouine',
       isDefault: true
     },
     {
       id: 'addr2',
       label: 'Adresse Non Livrable',
       street: 'RR207, Beni Khedache, Tunisie',
       isDefault: false
     }
   ]));
   ```

2. **Charger la page panier** :
   - Aller sur `/cart`
   - Observer les logs dans la console

3. **Vérifications** :
   - ✅ Log : `[Migration] 🚀 Début de la migration des adresses...`
   - ✅ Log : `[Migration] ❌ Adresse "Adresse Non Livrable" supprimée (XX km > 30 km)`
   - ✅ Log : `[Migration] ✅ Migration terminée: {removedAddresses: 1, ...}`
   - ✅ Dans `localStorage`, seule "Adresse Livrable" doit rester
   - ✅ L'adresse non livrable n'apparaît plus dans la liste

### Résultat Attendu
- ✅ 1 adresse supprimée
- ✅ L'adresse livrable est conservée
- ✅ Aucune erreur dans la console

---

## 🎯 Test 2 : Sélection d'Adresse Livrable

### Objectif
Vérifier que la sélection d'une adresse livrable met à jour correctement l'interface.

### Étapes

1. **Préparer une adresse livrable** :
   ```javascript
   localStorage.setItem('savedAddresses_21678877', JSON.stringify([
     {
       id: 'addr1',
       label: 'Cité Ennour',
       street: 'Cité Ennour, Tataouine',
       isDefault: true
     }
   ]));
   ```

2. **Aller sur la page panier** :
   - Ajouter un produit au panier
   - Aller à l'étape "address" (3/4)

3. **Sélectionner l'adresse** :
   - Cliquer sur "Cité Ennour"
   - Observer les logs et l'interface

4. **Vérifications** :
   - ✅ Log : `[Cart] ✅ Adresse sauvegardée géocodée et coordonnées mises à jour`
   - ✅ Log : `[DeliveryFee] 🏪 Restaurant: BAB EL HARA`
   - ✅ Log : `[DeliveryFee]    Zone livrable: ✅ Oui`
   - ✅ **Bordure verte** autour de l'adresse sélectionnée
   - ✅ **Badge "✅ Livrable"** sous l'adresse
   - ✅ **Pas de message d'avertissement rouge**
   - ✅ **Bouton "Confirmer" activé** (non grisé)

### Résultat Attendu
- ✅ Adresse marquée comme livrable
- ✅ Bouton activé
- ✅ Pas d'avertissement

---

## 🎯 Test 3 : Sélection d'Adresse Non Livrable

### Objectif
Vérifier que la sélection d'une adresse non livrable affiche correctement les avertissements.

### Étapes

1. **Créer une adresse non livrable manuellement** :
   - Utiliser la carte pour sélectionner un point à > 30 km
   - Sauvegarder cette adresse

2. **Sélectionner cette adresse** :
   - Cliquer sur l'adresse non livrable
   - Observer les logs et l'interface

3. **Vérifications** :
   - ✅ Log : `[DeliveryFee]    Zone livrable: ❌ Non`
   - ✅ **Bordure rouge** autour de l'adresse sélectionnée
   - ✅ **Badge "❌ Hors zone (XX km > 30 km)"** sous l'adresse
   - ✅ **Message d'avertissement rouge** affiché en haut
   - ✅ **Bouton "Confirmer" désactivé** (grisé)
   - ✅ Message indique la distance exacte

### Résultat Attendu
- ✅ Adresse marquée comme non livrable
- ✅ Bouton désactivé
- ✅ Avertissement clair affiché

---

## 🎯 Test 4 : Adresse Non Géocodable

### Objectif
Vérifier la gestion des adresses qui ne peuvent pas être géocodées.

### Étapes

1. **Créer une adresse invalide** :
   ```javascript
   localStorage.setItem('savedAddresses_21678877', JSON.stringify([
     {
       id: 'addr1',
       label: 'Adresse Invalide',
       street: 'RR207, Beni Khedache, Tunisie',
       isDefault: true
     }
   ]));
   ```

2. **Sélectionner cette adresse** :
   - Cliquer sur "Adresse Invalide"
   - Observer les logs et l'interface

3. **Vérifications** :
   - ✅ Log : `[Geocoding] ⚠️ Géocodage échoué pour: ...`
   - ✅ Log : `[Cart] ⚠️ Impossible de géocoder l'adresse sauvegardée`
   - ✅ **Message d'avertissement jaune** affiché
   - ✅ **Boutons d'action** : "Utiliser la carte" et "Supprimer l'adresse"
   - ✅ **Bouton "Confirmer" désactivé**
   - ✅ **Toast d'erreur** affiché

4. **Tester les actions** :
   - Cliquer sur "Utiliser la carte" → La carte s'ouvre
   - Cliquer sur "Supprimer l'adresse" → L'adresse est supprimée

### Résultat Attendu
- ✅ Message d'erreur clair
- ✅ Actions proposées fonctionnent
- ✅ Bouton désactivé

---

## 🎯 Test 5 : Changement Dynamique d'Adresse

### Objectif
Vérifier que le message et le bouton se mettent à jour immédiatement lors du changement d'adresse.

### Étapes

1. **Préparer deux adresses** :
   ```javascript
   localStorage.setItem('savedAddresses_21678877', JSON.stringify([
     {
       id: 'addr1',
       label: 'Adresse Livrable',
       street: 'Cité Ennour, Tataouine',
       isDefault: true
     },
     {
       id: 'addr2',
       label: 'Adresse Non Livrable',
       street: 'Route vers Beni Khedache',
       isDefault: false
     }
   ]));
   ```

2. **Sélectionner l'adresse livrable** :
   - Cliquer sur "Adresse Livrable"
   - Vérifier : bordure verte, bouton activé, pas d'avertissement

3. **Changer vers l'adresse non livrable** :
   - Cliquer sur "Adresse Non Livrable"
   - Observer le changement en temps réel

4. **Vérifications** :
   - ✅ **Bordure passe du vert au rouge** immédiatement
   - ✅ **Message d'avertissement apparaît** (< 500ms)
   - ✅ **Bouton se désactive** immédiatement
   - ✅ **Badge change** de "Livrable" à "Hors zone"

5. **Revenir à l'adresse livrable** :
   - Cliquer sur "Adresse Livrable"
   - Vérifier : tout revient à l'état "livrable"

### Résultat Attendu
- ✅ Changements instantanés (< 500ms)
- ✅ Pas de délai ou de flash
- ✅ Interface cohérente

---

## 🎯 Test 6 : Validation Serveur

### Objectif
Vérifier que le serveur rejette les commandes avec distance > 30 km.

### Étapes

1. **Contourner la validation frontend** (pour tester le serveur) :
   - Ouvrir la console
   - Modifier manuellement les coordonnées dans `localStorage` :
   ```javascript
   const onboarding = JSON.parse(localStorage.getItem('tp_onboarding'));
   onboarding.lat = 33.86090841686546; // Beni Khedache
   onboarding.lng = 9.975585937500002;
   localStorage.setItem('tp_onboarding', JSON.stringify(onboarding));
   ```

2. **Essayer de créer une commande** :
   - Remplir le formulaire
   - Cliquer sur "Confirmer"

3. **Vérifications** :
   - ✅ **Erreur serveur** : `Cette zone est hors de notre zone de livraison`
   - ✅ **Log serveur** : `[OrderService] ❌ Zone non livrable: Distance XX km > 30 km`
   - ✅ **Commande non créée**
   - ✅ **Message d'erreur affiché** au client

### Résultat Attendu
- ✅ Serveur bloque la commande
- ✅ Message d'erreur clair
- ✅ Aucune commande créée

---

## 🎯 Test 7 : Calcul des Frais de Livraison

### Objectif
Vérifier que les frais de livraison sont calculés correctement selon la distance.

### Étapes

1. **Tester différentes distances** :
   - Adresse à 1.8 km → Frais attendus : 2.000 TND
   - Adresse à 2.5 km → Frais attendus : 2.250 TND
   - Adresse à 17 km → Frais attendus : 9.500 TND
   - Adresse à 30 km → Frais attendus : 16.000 TND

2. **Vérifier l'affichage** :
   - À l'étape "summary" (4/4)
   - Vérifier que les frais affichés correspondent aux calculs

3. **Vérifications** :
   - ✅ Frais corrects pour chaque distance
   - ✅ Format : "X.XXX د.ت" (3 décimales)
   - ✅ Frais mis à jour lors du changement d'adresse

### Résultat Attendu
- ✅ Frais corrects pour toutes les distances
- ✅ Format cohérent
- ✅ Mise à jour dynamique

---

## 🎯 Test 8 : Service Worker v8

### Objectif
Vérifier que le Service Worker v8 est bien chargé et force la mise à jour.

### Étapes

1. **Vérifier la version** :
   - DevTools → Application → Service Workers
   - Vérifier : `tataouine-pizza-v8`

2. **Vérifier l'activation** :
   - Log : `[SW] Service Worker installé`
   - Log : `[SW] Service Worker activé`
   - Log : `[SW] Service Worker a pris le contrôle de toutes les pages`

3. **Tester le cache** :
   - Vider le cache
   - Recharger la page
   - Vérifier que la nouvelle version est chargée

### Résultat Attendu
- ✅ Version v8 active
- ✅ Cache mis à jour
- ✅ Pas d'ancien cache

---

## 🎯 Test 9 : Indicateurs Visuels

### Objectif
Vérifier tous les indicateurs visuels (bordures, badges, messages).

### Étapes

1. **Tester chaque état** :
   - Adresse livrable → Bordure verte + badge "Livrable"
   - Adresse non livrable → Bordure rouge + badge "Hors zone"
   - Géocodage en cours → Indicateur de chargement
   - Erreur de géocodage → Message jaune

2. **Vérifications** :
   - ✅ Couleurs correctes
   - ✅ Icônes appropriées
   - ✅ Messages clairs et traduits (FR/EN/AR)
   - ✅ Responsive (mobile/desktop)

### Résultat Attendu
- ✅ Tous les indicateurs visuels corrects
- ✅ Messages traduits
- ✅ Interface responsive

---

## 🎯 Test 10 : Performance et Réactivité

### Objectif
Vérifier que le système réagit rapidement aux changements.

### Étapes

1. **Tester la réactivité** :
   - Changer rapidement entre plusieurs adresses
   - Observer le temps de réponse

2. **Vérifications** :
   - ✅ Mise à jour < 500ms
   - ✅ Pas de lag ou de freeze
   - ✅ Indicateur de chargement pendant le géocodage

### Résultat Attendu
- ✅ Réactivité < 500ms
- ✅ Interface fluide
- ✅ Pas de freeze

---

## 📊 Checklist de Validation

### Tests Unitaires
- [ ] `calculateDistance` : Calcul correct
- [ ] `isDeliverableZone` : Validation correcte
- [ ] `calculateDeliveryFee` : Frais corrects
- [ ] Constantes : Valeurs correctes

### Tests d'Intégration
- [ ] Migration automatique : Supprime les adresses invalides
- [ ] Sélection d'adresse : Met à jour l'interface
- [ ] Changement d'adresse : Réactivité immédiate
- [ ] Validation serveur : Bloque les commandes invalides

### Tests Manuels
- [ ] Adresse livrable : Interface correcte
- [ ] Adresse non livrable : Avertissements affichés
- [ ] Adresse non géocodable : Gestion d'erreur
- [ ] Service Worker : Version v8 active
- [ ] Performance : Réactivité < 500ms

---

## 🐛 Scénarios de Bug à Tester

1. **Adresse avec coordonnées invalides** (null, undefined)
2. **Changement rapide entre adresses** (race condition)
3. **Géocodage qui échoue puis réussit** (retry)
4. **Plusieurs restaurants dans le panier** (validation multi-restaurant)
5. **localStorage corrompu** (données invalides)

---

## 📝 Notes

- Tous les tests doivent être effectués dans un environnement propre (localStorage vidé)
- Les coordonnées de test sont basées sur des emplacements réels à Tataouine
- Les logs de la console sont essentiels pour le débogage
- Tester sur différents navigateurs (Chrome, Firefox, Safari)
