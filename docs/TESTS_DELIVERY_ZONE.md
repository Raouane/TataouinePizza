# 🧪 Documentation des Tests - Validation de Zone de Livraison

## 📚 Vue d'Ensemble

Cette documentation décrit tous les tests disponibles pour valider la fonctionnalité de validation de zone de livraison.

---

## 📁 Fichiers de Tests

### Tests Automatiques

1. **`test/delivery-zone-validation.test.ts`**
   - Tests unitaires pour les fonctions de calcul
   - Tests de validation de zone
   - Tests de calcul des frais
   - **Exécution** : `npm test -- test/delivery-zone-validation.test.ts`

2. **`test/migration-addresses.test.ts`**
   - Tests pour le script de migration
   - Tests de suppression d'adresses invalides
   - Tests de géocodage
   - **Exécution** : `npm test -- test/migration-addresses.test.ts`

3. **`test/delivery-zone-integration.test.ts`**
   - Tests d'intégration du hook `useDynamicDeliveryFee`
   - Tests de réactivité
   - **Exécution** : `npm test -- test/delivery-zone-integration.test.ts`

### Guides de Tests Manuels

4. **`test/delivery-zone-manual-tests.md`**
   - Guide complet de tests manuels
   - 10 scénarios détaillés
   - Checklist de validation

5. **`test/delivery-zone-test-scenarios.md`**
   - Scénarios de test complets
   - Points de vérification
   - Métriques de succès

6. **`test/run-delivery-zone-tests.md`**
   - Guide rapide d'exécution
   - Test express (5 minutes)
   - Dépannage

---

## 🚀 Exécution des Tests

### Tests Automatiques

```bash
# Tous les tests
npm test

# Tests spécifiques
npm test -- test/delivery-zone-validation.test.ts
npm test -- test/migration-addresses.test.ts

# Mode watch (re-exécute à chaque modification)
npm run test:watch

# Interface graphique
npm run test:ui

# Avec couverture de code
npm run test:coverage
```

### Tests Manuels

1. Ouvrir le navigateur avec DevTools (F12)
2. Suivre le guide : `test/delivery-zone-manual-tests.md`
3. Vérifier chaque scénario dans `test/delivery-zone-test-scenarios.md`

---

## ✅ Résultats Attendus

### Tests Unitaires

```
✓ calculateDistance
  ✓ devrait calculer la distance entre deux points GPS
  ✓ devrait retourner 0 si les coordonnées sont invalides
  ✓ devrait calculer correctement une distance de ~1.8 km
  ✓ devrait calculer correctement une distance de ~17 km
  ✓ devrait calculer correctement une distance de ~112 km

✓ calculateDeliveryFee
  ✓ devrait retourner 2.000 TND pour une distance ≤ 2 km
  ✓ devrait calculer correctement les frais pour 2.5 km
  ✓ devrait calculer correctement les frais pour 17 km
  ✓ devrait calculer correctement les frais pour 30 km

✓ isDeliverableZone
  ✓ devrait retourner true pour une distance ≤ 30 km
  ✓ devrait retourner false pour une distance > 30 km
  ✓ devrait retourner false si les coordonnées sont manquantes

✓ Scénarios réels de Tataouine
  ✓ devrait valider une adresse proche (Cité Ennour)
  ✓ devrait valider une adresse moyenne (Hôpital Ghomrassen)
  ✓ devrait rejeter une adresse trop éloignée (Beni Khedache)
```

### Tests de Migration

```
✓ migrateAllAddresses
  ✓ devrait supprimer les adresses non livrables
  ✓ devrait conserver les adresses livrables
  ✓ devrait gérer les adresses avec coordonnées déjà présentes
  ✓ devrait supprimer les adresses non géocodables
  ✓ devrait gérer plusieurs numéros de téléphone

✓ migrateOnboardingCoords
  ✓ devrait supprimer les coordonnées invalides
  ✓ devrait conserver les coordonnées valides
```

---

## 🎯 Scénarios de Test Critiques

### 1. Adresse Livrable (< 30 km)
- ✅ Bordure verte
- ✅ Badge "Livrable"
- ✅ Bouton activé
- ✅ Pas d'avertissement

### 2. Adresse Non Livrable (> 30 km)
- ✅ Bordure rouge
- ✅ Badge "Hors zone"
- ✅ Bouton désactivé
- ✅ Avertissement affiché

### 3. Adresse Non Géocodable
- ✅ Message d'erreur jaune
- ✅ Boutons d'action
- ✅ Bouton désactivé

### 4. Migration Automatique
- ✅ Adresses invalides supprimées
- ✅ Adresses valides conservées
- ✅ Logs détaillés

### 5. Validation Serveur
- ✅ Commande bloquée si distance > 30 km
- ✅ Message d'erreur clair
- ✅ Aucune commande créée

---

## 📊 Métriques de Performance

### Temps de Réponse
- **Géocodage** : < 2 secondes
- **Calcul de distance** : < 10ms
- **Mise à jour interface** : < 500ms
- **Migration** : < 5 secondes (selon nombre d'adresses)

### Précision
- **Distance** : ±0.1 km
- **Frais** : ±0.001 TND
- **Validation** : 100% de précision

---

## 🐛 Bugs Connus et Solutions

### Bug 1 : Message affiché trop tôt
**Solution** : Vérifier que `loadingDeliveryFee === false` et que tous les calculs sont terminés

### Bug 2 : Bouton non désactivé
**Solution** : Vérifier que `hasUndeliverableZone` est bien dans les conditions `disabled`

### Bug 3 : Cache Service Worker
**Solution** : Vérifier que la version v8 est active et forcer le rechargement

### Bug 4 : Coordonnées obsolètes
**Solution** : La migration supprime automatiquement les coordonnées invalides

---

## 📝 Notes Importantes

1. **Tests en environnement propre** : Toujours vider localStorage avant les tests
2. **Coordonnées réelles** : Les tests utilisent des coordonnées réelles de Tataouine
3. **Mocks nécessaires** : Les tests de migration mockent l'API et le géocodage
4. **Tests manuels essentiels** : Certains aspects nécessitent des tests manuels (UI, réactivité)

---

## 🔄 Mise à Jour des Tests

Si vous modifiez :
- `MAX_DELIVERY_DISTANCE_KM` → Mettre à jour les tests avec la nouvelle valeur
- Formule de calcul des frais → Mettre à jour les tests de `calculateDeliveryFee`
- Logique de validation → Mettre à jour les tests de `isDeliverableZone`

---

## 📞 Support

En cas de problème avec les tests :
1. Vérifier que `vitest` est à jour : `npm install`
2. Vérifier les mocks : S'assurer qu'ils sont correctement configurés
3. Vérifier les logs : Les tests affichent des logs détaillés
4. Consulter la documentation : `test/delivery-zone-manual-tests.md`
