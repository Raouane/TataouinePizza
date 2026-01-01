# 🛠️ Configuration du développement local

Guide pour configurer votre environnement de développement local.

## 📋 Prérequis

1. **Node.js** (v18 ou supérieur)
2. **PostgreSQL** (v12 ou supérieur)
3. **npm** ou **yarn**

## 🗄️ Installation de PostgreSQL

### Windows

1. Téléchargez PostgreSQL depuis [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Installez PostgreSQL avec les paramètres par défaut
3. Notez le mot de passe que vous définissez pour l'utilisateur `postgres`

### Alternative : Utiliser Docker

```bash
docker run --name tataouine-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=tataouine_pizza -p 5432:5432 -d postgres:15
```

## 🔧 Configuration

### 1. Créer le fichier `.env`

Copiez le fichier `.env.example` vers `.env` :

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

### 2. Configurer la base de données

Ouvrez le fichier `.env` et modifiez `DATABASE_URL` :

```env
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/tataouine_pizza
```

**Remplacez** :
- `VOTRE_MOT_DE_PASSE` par le mot de passe PostgreSQL que vous avez défini
- `tataouine_pizza` par le nom de votre base de données (ou créez-la)

### 3. Créer la base de données

Connectez-vous à PostgreSQL :

```bash
# Windows (si PostgreSQL est dans le PATH)
psql -U postgres

# Ou utilisez pgAdmin (interface graphique)
```

Créez la base de données :

```sql
CREATE DATABASE tataouine_pizza;
```

### 4. Installer les dépendances

```bash
npm install
```

### 5. Exécuter les migrations

Les migrations s'exécutent automatiquement au démarrage, mais vous pouvez aussi les exécuter manuellement :

```bash
npm run db:push
```

### 6. Lancer l'application

```bash
npm run dev
```

L'application sera disponible sur : `http://localhost:5000`

## ✅ Vérification

1. **API Health** : `http://localhost:5000/api/health` → Devrait retourner `{"status":"ok"}`
2. **Interface web** : `http://localhost:5000`
3. **Connexion livreur** : `http://localhost:5000/driver/login`
   - Téléphone : `21612345678`
   - Mot de passe : `driver123`

## 🔐 Variables d'environnement optionnelles

### Twilio (pour SMS/WhatsApp)

Si vous voulez tester les fonctionnalités SMS/WhatsApp :

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### N8N Webhooks

Si vous utilisez n8n pour l'automatisation :

```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/...
N8N_WEBHOOK_TOKEN=your_webhook_token
```

## 🆘 Problèmes courants

### Erreur : "DATABASE_URL is required"

→ Vérifiez que le fichier `.env` existe et contient `DATABASE_URL`

### Erreur de connexion à PostgreSQL

→ Vérifiez que PostgreSQL est démarré
→ Vérifiez que le mot de passe dans `.env` est correct
→ Vérifiez que la base de données existe

### Erreur : "database does not exist"

→ Créez la base de données : `CREATE DATABASE tataouine_pizza;`

### Port 5000 déjà utilisé

→ Changez le port dans `.env` : `PORT=5001`

## 📚 Commandes utiles

```bash
# Démarrer l'application en mode développement
npm run dev

# Construire l'application pour la production
npm run build

# Exécuter les migrations de base de données
npm run db:push

# Créer un compte administrateur
npm run create-admin

# Vider la base de données (attention !)
npm run db:clear

# Réinitialiser avec des données de test
npm run db:seed
```

## 🎉 Prêt !

Une fois configuré, vous pouvez commencer à développer ! 🚀
