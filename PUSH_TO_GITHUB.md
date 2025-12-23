# 🚀 Pousser le code sur GitHub

Votre commit est prêt, mais le push a échoué à cause de l'authentification. Voici comment résoudre :

## ⚡ Solution rapide : Personal Access Token

### 1. Créer un token GitHub

1. Allez sur : [https://github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. **Note** : `TataouinePizza-Deploy`
3. **Expiration** : 90 jours (ou No expiration)
4. **Permissions** : Cochez ✅ `repo` (accès complet)
5. Cliquez sur **"Generate token"**
6. **⚠️ COPIEZ LE TOKEN** (ex: `ghp_xxxxxxxxxxxxxxxxxxxx`)

### 2. Pousser avec le token

```bash
git push origin main
```

Quand Git demande :
- **Username** : `Raouane`
- **Password** : **Collez votre token** (pas votre mot de passe GitHub)

### 3. Sauvegarder le token (pour ne pas le retaper)

```bash
# Windows
git config --global credential.helper wincred

# Puis pousser (il sauvegardera le token)
git push origin main
```

## ✅ Après le push réussi

Une fois le code poussé sur GitHub, vous pourrez :

1. Aller sur [Render.com](https://render.com)
2. Créer un Blueprint
3. Sélectionner votre dépôt `Raouane/TataouinePizza`
4. Déployer automatiquement !

## 🆘 Si ça ne fonctionne pas

Consultez le guide complet : [docs/GIT_AUTHENTICATION.md](./docs/GIT_AUTHENTICATION.md)





