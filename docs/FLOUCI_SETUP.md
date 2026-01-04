# Configuration Flouci - Paiement Local Tunisien

Ce guide vous explique comment configurer Flouci pour les paiements en Dinars Tunisiens (TND).

## 📋 Prérequis

- ✅ Un compte Flouci ([https://flouci.com](https://flouci.com))
- ✅ Application créée dans le Dashboard Flouci
- ✅ Clés API (Public Key et Private Key)

## 🔑 Configuration des variables d'environnement

### Créer ou modifier le fichier `.env`

Ajoutez vos clés Flouci à la racine du projet :

```env
# Flouci Configuration (Paiement Local Tunisien)
FLOUCI_APP_TOKEN=votre_public_key_ici
FLOUCI_APP_SECRET=votre_private_key_ici
```

**Important :**
- `FLOUCI_APP_TOKEN` = Clé publique (Public Key) de votre application Flouci
- `FLOUCI_APP_SECRET` = Clé secrète (Private Key) de votre application Flouci
- ⚠️ **NE JAMAIS** exposer la clé secrète côté client
- Le fichier `.env` est déjà dans `.gitignore` pour éviter de commiter vos clés

## 📝 Où trouver vos clés Flouci ?

1. Connectez-vous à votre [Dashboard Flouci](https://dashboard.flouci.com)
2. Allez dans **"Applications"** ou **"API Keys"**
3. Sélectionnez votre application (ou créez-en une)
4. Copiez :
   - **Public Key** → `FLOUCI_APP_TOKEN`
   - **Private Key** → `FLOUCI_APP_SECRET`

## 🧪 Mode Test

Flouci fournit un environnement de test avec une application dédiée appelée **"TEST APP"**.

Pour tester :
1. Utilisez les clés de l'application **TEST APP** dans votre `.env`
2. Dans l'environnement de test, `verify_payment` conserve les informations de transaction pendant 20 minutes
3. Les informations sont accessibles uniquement via l'API

## 🔄 Conversion TND → Millimes

Flouci attend les montants en **millimes** (1 TND = 1000 millimes).

**Exemples :**
- 10 TND = 10 000 millimes
- 25.5 TND = 25 500 millimes
- 100 TND = 100 000 millimes

La conversion est automatique dans la route API `/api/payments/flouci/init`.

## 📡 Route API

### POST `/api/payments/flouci/init`

Initialise un paiement Flouci.

**Request Body:**
```json
{
  "amount": 25.5,
  "success_link": "https://votre-site.com/success",
  "fail_link": "https://votre-site.com/fail",
  "developer_tracking_id": "order_123" // Optionnel
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "FoPKKHqfQIKfBqhEj8M47A",
  "link": "https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A",
  "amount_tnd": 25.5,
  "amount_millimes": 25500
}
```

## 🔒 Sécurité

- ✅ Les clés secrètes sont stockées uniquement côté serveur
- ✅ Toutes les requêtes vers Flouci utilisent HTTPS (TLS 1.2+)
- ✅ L'authentification utilise le format `Bearer <PUBLIC_KEY>:<PRIVATE_KEY>`

## 📚 Ressources

- [Documentation Flouci](https://docs.flouci.com)
- [API Reference](https://docs.flouci.com/api-reference/generate-transaction)
- [Dashboard Flouci](https://dashboard.flouci.com)

## 🆘 Dépannage

### Erreur : "FLOUCI_APP_TOKEN and FLOUCI_APP_SECRET must be defined"

**Solution :**
1. Vérifiez que les variables sont bien définies dans `.env`
2. Redémarrez le serveur après avoir ajouté les variables
3. Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs

### Erreur : "Flouci API error: 401 Unauthorized"

**Solution :**
1. Vérifiez que vos clés sont correctes
2. Vérifiez le format : `Bearer <PUBLIC_KEY>:<PRIVATE_KEY>`
3. Assurez-vous d'utiliser les clés du bon environnement (Test ou Production)

### Le paiement ne se génère pas

**Solution :**
1. Vérifiez les logs du serveur pour voir l'erreur exacte
2. Vérifiez que les URLs `success_link` et `fail_link` sont valides (commencent par `https://`)
3. Vérifiez que le montant est positif
