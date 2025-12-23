# 🔐 Configuration de l'authentification Git pour GitHub

GitHub ne supporte plus l'authentification par mot de passe. Vous devez utiliser un **Personal Access Token (PAT)**.

## 🎯 Option 1 : Personal Access Token (Recommandé)

### Étape 1 : Créer un Personal Access Token sur GitHub

1. Allez sur [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Cliquez sur **"Generate new token"** → **"Generate new token (classic)"**
3. Donnez un nom : `TataouinePizza-Deploy`
4. Sélectionnez les permissions :
   - ✅ `repo` (accès complet aux dépôts)
5. Cliquez sur **"Generate token"**
6. **⚠️ IMPORTANT** : Copiez le token immédiatement (vous ne pourrez plus le voir après)

### Étape 2 : Utiliser le token pour pousser

Quand Git vous demande le mot de passe, utilisez le **token** au lieu de votre mot de passe.

```bash
# Pousser le code
git push origin main

# Quand il demande :
# Username: Raouane
# Password: [COLLEZ VOTRE TOKEN ICI]
```

### Étape 3 : Sauvegarder le token (optionnel)

Pour éviter de le retaper à chaque fois, vous pouvez utiliser Git Credential Manager :

```bash
# Windows
git config --global credential.helper wincred

# Puis pousser (il vous demandera une fois, puis sauvegardera)
git push origin main
```

## 🎯 Option 2 : SSH (Alternative)

### Étape 1 : Générer une clé SSH

```bash
# Générer une nouvelle clé SSH
ssh-keygen -t ed25519 -C "bakrbackend@gmail.com"

# Appuyez sur Entrée pour accepter l'emplacement par défaut
# Entrez un mot de passe (ou laissez vide)
```

### Étape 2 : Ajouter la clé à GitHub

1. Copiez le contenu de votre clé publique :
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
   (Sur Windows : `type C:\Users\raoua\.ssh\id_ed25519.pub`)

2. Allez sur [https://github.com/settings/keys](https://github.com/settings/keys)
3. Cliquez sur **"New SSH key"**
4. Collez le contenu de la clé publique
5. Cliquez sur **"Add SSH key"**

### Étape 3 : Changer l'URL du dépôt vers SSH

```bash
# Changer l'URL du remote
git remote set-url origin git@github.com:Raouane/TataouinePizza.git

# Vérifier
git remote -v

# Pousser (plus besoin de mot de passe)
git push origin main
```

## ✅ Vérification

Après avoir configuré l'authentification, testez :

```bash
git push origin main
```

Si ça fonctionne, vous verrez :
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
...
To https://github.com/Raouane/TataouinePizza.git
   [hash]..[hash]  main -> main
```

## 🆘 Dépannage

### Erreur : "Authentication failed"

- Vérifiez que votre token a la permission `repo`
- Vérifiez que vous utilisez le token (pas votre mot de passe GitHub)
- Réessayez de générer un nouveau token

### Erreur SSH : "Permission denied"

- Vérifiez que votre clé SSH est ajoutée à GitHub
- Testez la connexion : `ssh -T git@github.com`

## 📝 Note importante

**Ne partagez JAMAIS votre Personal Access Token ou votre clé SSH privée !**





