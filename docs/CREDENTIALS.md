# 🔐 Identifiants de test - Tataouine Pizza

## 👨‍💼 Livreurs (Drivers)

Les livreurs suivants sont créés automatiquement lors du seed de la base de données :

| Nom | Téléphone | Mot de passe |
|-----|-----------|--------------|
| **Mohamed** | `21612345678` | `driver123` |
| **Ahmed** | `21698765432` | `driver123` |
| **Fatima** | `21625874123` | `driver123` |

### Connexion livreur

1. Allez sur : `https://tataouine-pizza.onrender.com/driver/login`
2. Entrez un des numéros de téléphone ci-dessus
3. Entrez le mot de passe : `driver123`
4. Cliquez sur "Se connecter"

## 🍕 Restaurants

Les restaurants suivants sont créés automatiquement :

| Nom | Téléphone | Mot de passe | Adresse |
|-----|-----------|--------------|---------|
| **Tataouine Pizza** | `21611111111` | `1234` | Avenue Habib Bourguiba, Tataouine |
| **Pizza del Sol** | `21622222222` | `1234` | Rue de la Liberté, Tataouine |
| **Sahara Grill** | `21633333333` | `1234` | Boulevard de l'Environnement, Tataouine |
| **Le Jardin Salades** | `21644444444` | `1234` | Rue Ibn Khaldoun, Tataouine |
| **Burger House** | `21655555555` | `1234` | Avenue de la République, Tataouine |
| **Carrefour** | `21698765432` | `1234` | Centre Commercial, Avenue Habib Bourguiba, Tataouine |
| **Aziza** | `21698765433` | `1234` | Rue de la République, Tataouine |
| **BAB EL HARA** | `21699999999` | `1234` | 6 Place De L'Abbaye, Tataouine |

### Connexion restaurant

1. Allez sur : `https://tataouine-pizza.onrender.com/restaurant/login`
2. Entrez un des numéros de téléphone ci-dessus
3. Entrez le mot de passe : `1234` (mot de passe par défaut)
4. Cliquez sur "Se connecter"

⚠️ **Note** : Si vous obtenez l'erreur "Mot de passe non configuré", exécutez le script :
```bash
npm run script:set-default-passwords
```

## 👤 Administrateurs

Aucun administrateur n'est créé automatiquement. Vous devez en créer un via l'API ou l'interface admin.

### Créer un administrateur

```bash
curl -X POST https://tataouine-pizza.onrender.com/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tataouine-pizza.com",
    "password": "admin123"
  }'
```

## 📝 Notes importantes

- ⚠️ **Ces identifiants sont pour le développement/test uniquement**
- 🔒 **Changez les mots de passe en production**
- 📱 **Les numéros de téléphone sont fictifs**
- 🎯 **Pour tester l'OTP, utilisez le code : `1234`** (code de démonstration accepté)

## 🧪 Code OTP de test

Pour le développement, le code OTP `1234` est accepté pour n'importe quel numéro de téléphone.

## 🔗 URLs importantes

- **Application principale** : `https://tataouine-pizza.onrender.com`
- **Connexion livreur** : `https://tataouine-pizza.onrender.com/driver/login`
- **Connexion admin** : `https://tataouine-pizza.onrender.com/admin/login`
- **API Health** : `https://tataouine-pizza.onrender.com/api/health`





