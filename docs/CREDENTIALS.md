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

1. **Tataouine Pizza**
   - Téléphone : `21611111111`
   - Adresse : Avenue Habib Bourguiba, Tataouine

2. **Pizza del Sol**
   - Téléphone : `21622222222`
   - Adresse : Rue de la Liberté, Tataouine

3. **Sahara Grill**
   - Téléphone : `21633333333`
   - Adresse : Boulevard de l'Environnement, Tataouine

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



