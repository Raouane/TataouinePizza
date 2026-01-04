# Stripe Test vs Live : Guide de Configuration

## ✅ Oui, vous pouvez tester en production avec Stripe Test !

### 🔑 Types de clés Stripe

Stripe propose deux environnements :

1. **Mode Test** (`pk_test_` / `sk_test_`)
   - ✅ **Parfait pour tester en production**
   - ✅ Aucun paiement réel ne sera effectué
   - ✅ Cartes de test disponibles (4242 4242 4242 4242, etc.)
   - ✅ Idéal pour valider le flux complet avant le lancement

2. **Mode Live** (`pk_live_` / `sk_live_`)
   - ⚠️ **Uniquement pour les vrais paiements**
   - ⚠️ Les transactions sont réelles et irréversibles
   - ⚠️ Nécessite une vérification d'identité par Stripe

### 📝 Configuration actuelle

Le code de l'application **accepte déjà les deux types de clés** :

```typescript
// Frontend (payment-methods-dialog.tsx)
if (!stripePublishableKey.startsWith('pk_test_') && !stripePublishableKey.startsWith('pk_live_')) {
  console.error('[Stripe] ❌ Format de clé invalide');
}
```

### 🚀 Scénarios d'utilisation

#### Scénario 1 : Test en production (recommandé avant lancement)
```env
# .env en production (pour tester)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle_publique_ici
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete_ici
```

**Avantages :**
- ✅ Test complet du flux de paiement
- ✅ Aucun risque financier
- ✅ Validation de l'intégration en conditions réelles
- ✅ Les utilisateurs peuvent tester sans payer

#### Scénario 2 : Production réelle (après validation)
```env
# .env en production (pour les vrais paiements)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_votre_cle_live_ici
STRIPE_SECRET_KEY=sk_live_votre_cle_live_ici
```

**Important :**
- ⚠️ Obtenez ces clés depuis votre Dashboard Stripe (mode Live)
- ⚠️ Les transactions seront réelles
- ⚠️ Assurez-vous d'avoir testé avec les clés Test d'abord

### 🔄 Comment passer de Test à Live

1. **Dans votre Dashboard Stripe :**
   - Allez dans **Developers > API keys**
   - Basculez sur **"Live mode"** (en haut à droite)
   - Copiez vos clés Live

2. **Dans votre `.env` en production :**
   - Remplacez `pk_test_...` par `pk_live_...`
   - Remplacez `sk_test_...` par `sk_live_...`
   - Redémarrez votre serveur

3. **Vérification :**
   - Les clés Live commencent par `pk_live_` et `sk_live_`
   - Le code détectera automatiquement le type de clé

### 🧪 Cartes de test Stripe

En mode Test, utilisez ces cartes pour tester :

| Numéro de carte | Résultat |
|----------------|----------|
| `4242 4242 4242 4242` | ✅ Succès |
| `4000 0000 0000 0002` | ❌ Carte refusée |
| `4000 0000 0000 9995` | ❌ Fonds insuffisants |
| `4000 0025 0000 3155` | ⚠️ 3D Secure requis |

**Date d'expiration :** N'importe quelle date future (ex: 12/25)  
**CVC :** N'importe quel code à 3 chiffres (ex: 123)  
**Code postal :** N'importe quel code postal valide

### ⚡ Résumé

- ✅ **OUI**, vous pouvez utiliser les clés Test en production pour tester
- ✅ Le code supporte déjà Test et Live
- ✅ Aucune modification de code nécessaire pour passer en Live
- ✅ Changez simplement les clés dans `.env` quand vous êtes prêt

### 📚 Ressources

- [Documentation Stripe Test Mode](https://stripe.com/docs/testing)
- [Dashboard Stripe](https://dashboard.stripe.com/test/apikeys)
- [Cartes de test Stripe](https://stripe.com/docs/testing#cards)
