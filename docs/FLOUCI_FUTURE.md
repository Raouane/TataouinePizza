# Flouci - Intégration Future

## 📝 Note

L'intégration Flouci est **complète et prête**, mais sera activée plus tard lorsque vous obtiendrez vos clés API Flouci.

## ✅ Ce qui est déjà fait

Toute l'intégration Flouci est implémentée et fonctionnelle :

1. **Backend** (`server/routes/flouci.ts`) :
   - ✅ Route `/api/payments/flouci/init` pour initialiser un paiement
   - ✅ Route `/api/payments/flouci/verify/:payment_id` pour vérifier le statut
   - ✅ Conversion automatique TND → millimes
   - ✅ Gestion d'erreurs complète

2. **Frontend** :
   - ✅ Composant `FlouciInfoDialog` pour expliquer le paiement
   - ✅ Sélecteur de méthode de paiement dans le panier
   - ✅ Redirection vers Flouci après initialisation
   - ✅ Vérification automatique du paiement sur `/success`
   - ✅ Création de commande après confirmation

3. **UI** :
   - ✅ Entrée "Paiement Local TND (Flouci)" dans le profil
   - ✅ Support multilingue (FR/EN/AR)
   - ✅ Feature flag `flouciEnabled` pour activer/désactiver

## 🔄 Pour activer Flouci plus tard

### Étape 1 : Obtenir vos clés Flouci

1. Créez un compte sur [Flouci](https://flouci.com)
2. Créez une application dans votre Dashboard
3. Copiez vos clés :
   - **Public Key** → `FLOUCI_APP_TOKEN`
   - **Private Key** → `FLOUCI_APP_SECRET`

### Étape 2 : Ajouter les clés dans `.env`

```env
# Flouci Configuration (Paiement Local Tunisien)
FLOUCI_APP_TOKEN=votre_public_key_ici
FLOUCI_APP_SECRET=votre_private_key_ici
```

### Étape 3 : Activer le feature flag

Dans **2 fichiers**, changez `flouciEnabled` de `false` à `true` :

1. `client/src/pages/profile.tsx` (ligne ~131)
2. `client/src/pages/cart-page.tsx` (ligne ~40)

```typescript
const flouciEnabled = true; // Paiement local tunisien (TND)
```

### Étape 4 : Redémarrer le serveur

```bash
npm run dev
# ou en production
npm start
```

## 🧪 Tester Flouci

Une fois activé, vous pouvez tester avec :

1. Allez dans **Profil** → **Paiement Local TND (Flouci)**
2. Allez dans **Panier** → **Récapitulatif** → Sélectionnez **Flouci**
3. Confirmez la commande
4. Vous serez redirigé vers Flouci pour payer
5. Après paiement, retour automatique et création de la commande

## 📚 Documentation

- [Guide Flouci](./FLOUCI_SETUP.md)
- [Guide Test vs Live](./STRIPE_TEST_VS_LIVE.md)

## 💡 Note importante

Flouci est **prêt à l'emploi**. Il suffit d'activer le flag et d'ajouter les clés API quand vous les aurez.
