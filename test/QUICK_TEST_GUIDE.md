# ⚡ Guide Rapide de Test - Validation de Zone de Livraison

## 🎯 Test Express (5 minutes)

### Étape 1 : Préparer les Données

Ouvrir la console du navigateur (F12) et exécuter :

```javascript
// Créer des adresses de test
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

### Étape 2 : Tester la Migration

1. Recharger la page panier (`/cart`)
2. Observer les logs console
3. **Vérifier** : `[Migration] ✅ Migration terminée: {removedAddresses: 1}`

### Étape 3 : Tester l'Adresse Livrable

1. Aller à l'étape "address" (3/4)
2. Cliquer sur "Adresse Livrable"
3. **Vérifier** :
   - ✅ Bordure verte
   - ✅ Badge "✅ Livrable"
   - ✅ Bouton "Confirmer" activé
   - ✅ Pas de message d'avertissement

### Étape 4 : Tester l'Adresse Non Livrable

1. Utiliser la carte pour sélectionner un point à > 30 km
2. Sauvegarder cette adresse
3. Sélectionner cette adresse
4. **Vérifier** :
   - ✅ Bordure rouge
   - ✅ Badge "❌ Hors zone (XX km > 30 km)"
   - ✅ Message d'avertissement rouge
   - ✅ Bouton "Confirmer" désactivé

### Étape 5 : Tester la Validation Serveur

1. Essayer de créer une commande avec l'adresse non livrable
2. **Vérifier** :
   - ✅ Erreur serveur : "Cette zone est hors de notre zone de livraison"
   - ✅ Commande non créée

---

## ✅ Checklist Rapide

- [ ] Migration supprime les adresses invalides
- [ ] Adresse livrable → Bouton activé
- [ ] Adresse non livrable → Bouton désactivé
- [ ] Message d'avertissement affiché pour zone non livrable
- [ ] Validation serveur bloque les commandes invalides
- [ ] Changement d'adresse → Mise à jour immédiate (< 500ms)

---

## 🚀 Commandes de Test

```bash
# Tests automatiques
npm test -- test/delivery-zone-validation.test.ts
npm test -- test/migration-addresses.test.ts

# Tous les tests
npm test

# Mode watch
npm run test:watch
```

---

## 📚 Documentation Complète

- **Tests manuels détaillés** : `test/delivery-zone-manual-tests.md`
- **Scénarios complets** : `test/delivery-zone-test-scenarios.md`
- **Documentation complète** : `docs/TESTS_DELIVERY_ZONE.md`

---

## 🐛 Problèmes Courants

### Migration ne s'exécute pas
→ Vérifier les logs console : `[Migration] 🚀 Début de la migration...`

### Interface ne se met pas à jour
→ Vérifier les logs : `[DeliveryFee] 🔄 Changement détecté...`

### Tests ne passent pas
→ Vérifier que `vitest` est installé : `npm install`
