# 🚀 Guide Rapide - Exécution des Tests

## 📦 Tests Disponibles

### 1. Tests Unitaires (Automatiques)

```bash
# Exécuter tous les tests de validation de zone
npm test -- test/delivery-zone-validation.test.ts

# Exécuter les tests de migration
npm test -- test/migration-addresses.test.ts

# Exécuter tous les tests
npm test

# Mode watch (re-exécute les tests à chaque modification)
npm run test:watch

# Interface graphique
npm run test:ui
```

### 2. Tests Manuels

Suivre le guide : `test/delivery-zone-manual-tests.md`

---

## ✅ Checklist Rapide

### Avant de Tester
- [ ] Vider le cache du navigateur
- [ ] Vider localStorage (`Application > Storage > Clear site data`)
- [ ] Vérifier Service Worker v8
- [ ] Ouvrir la console (F12)

### Tests Critiques
- [ ] **Test 1** : Migration automatique supprime les adresses invalides
- [ ] **Test 2** : Adresse livrable → Bouton activé, pas d'avertissement
- [ ] **Test 3** : Adresse non livrable → Bouton désactivé, avertissement affiché
- [ ] **Test 4** : Adresse non géocodable → Message d'erreur, actions proposées
- [ ] **Test 5** : Changement d'adresse → Mise à jour immédiate (< 500ms)
- [ ] **Test 6** : Validation serveur → Bloque les commandes invalides

---

## 🎯 Test Express (5 minutes)

### Scénario Rapide

1. **Préparer les données** :
   ```javascript
   // Dans la console du navigateur
   localStorage.setItem('savedAddresses_21678877', JSON.stringify([
     { id: '1', label: 'Livrable', street: 'Cité Ennour, Tataouine' },
     { id: '2', label: 'Non Livrable', street: 'RR207, Beni Khedache' }
   ]));
   ```

2. **Recharger la page panier** :
   - Vérifier : 1 adresse supprimée (log console)

3. **Sélectionner "Livrable"** :
   - Vérifier : Bordure verte, bouton activé

4. **Sélectionner "Non Livrable"** :
   - Vérifier : Bordure rouge, bouton désactivé, avertissement

5. **Créer une commande avec adresse livrable** :
   - Vérifier : Commande créée avec succès

6. **Essayer de créer une commande avec adresse non livrable** :
   - Vérifier : Erreur serveur, commande non créée

---

## 📊 Résultats Attendus

### Tests Unitaires
```
✓ calculateDistance : Calcul correct
✓ isDeliverableZone : Validation correcte
✓ calculateDeliveryFee : Frais corrects
✓ Migration : Supprime les adresses invalides
```

### Tests Manuels
```
✓ Migration : 3 adresses supprimées
✓ Adresse livrable : Interface correcte
✓ Adresse non livrable : Avertissements affichés
✓ Validation serveur : Bloque les commandes
```

---

## 🐛 Dépannage

### Problème : Tests ne passent pas
- Vérifier que `vitest` est installé : `npm install`
- Vérifier les mocks : Les fonctions mockées doivent être correctement configurées

### Problème : Migration ne s'exécute pas
- Vérifier les logs console : `[Migration] 🚀 Début de la migration...`
- Vérifier que le Service Worker v8 est actif
- Vider le cache et recharger

### Problème : Interface ne se met pas à jour
- Vérifier les logs : `[DeliveryFee] 🔄 Changement détecté...`
- Vérifier que `onboarding-updated` est déclenché
- Vérifier l'intervalle de vérification (200ms)

---

## 📝 Notes

- Les tests unitaires utilisent des coordonnées réelles de Tataouine
- Les tests de migration mockent l'API et le géocodage
- Les tests manuels nécessitent un navigateur avec DevTools
- Tous les tests doivent être exécutés avant un déploiement
