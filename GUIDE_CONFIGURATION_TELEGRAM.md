# 📱 Guide de Configuration Telegram - Tataouine Pizza

**Problème détecté** : Les notifications Telegram ne sont pas envoyées car `TELEGRAM_BOT_TOKEN` n'est pas configuré.

---

## 🔍 Diagnostic

Le script de diagnostic a révélé :
```
❌ PROBLÈME: TELEGRAM_BOT_TOKEN non configuré !
```

**Commande de diagnostic** :
```bash
npm run diagnostic:telegram
```

---

## ✅ Solution : Configuration Telegram

### Étape 1 : Créer un Bot Telegram

1. **Ouvrir Telegram** et chercher `@BotFather`
2. **Envoyer** `/newbot`
3. **Suivre les instructions** :
   - Choisir un nom pour votre bot (ex: "Tataouine Pizza Notifications")
   - Choisir un username (ex: "tataouine_pizza_bot")
4. **BotFather vous donnera un TOKEN** :
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
   ⚠️ **IMPORTANT** : Gardez ce token secret !

---

### Étape 2 : Configurer le Token

#### Option A : Fichier `.env` (Local)

1. **Ouvrir** le fichier `.env` à la racine du projet
2. **Ajouter** la ligne :
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
   (Remplacez par votre vrai token)

3. **Redémarrer** le serveur :
   ```bash
   npm run dev
   ```

#### Option B : Variables d'environnement (Production)

Si vous déployez sur **Render** :

1. Aller sur votre dashboard Render
2. Sélectionner votre service
3. Aller dans **Environment**
4. Ajouter la variable :
   - **Key** : `TELEGRAM_BOT_TOKEN`
   - **Value** : `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
5. **Redémarrer** le service

---

### Étape 3 : Obtenir votre Chat ID (pour tester)

Pour recevoir des notifications, vous devez avoir un `telegramId` dans la base de données.

1. **Sur Telegram**, chercher `@userinfobot`
2. **Envoyer** `/start`
3. Le bot vous donnera votre **Chat ID** (ex: `123456789`)
4. **Ajouter ce Chat ID** dans la base de données comme `telegramId` pour un livreur

---

### Étape 4 : Ajouter telegramId aux Livreurs

#### Option A : Via l'interface Admin

1. Aller sur `/admin/dashboard`
2. Gérer les livreurs
3. Ajouter le `telegramId` pour chaque livreur

#### Option B : Via Script SQL (Direct)

```sql
UPDATE drivers 
SET telegram_id = '123456789' 
WHERE phone = '21612345678';
```

(Remplacez `123456789` par votre Chat ID et `21612345678` par le téléphone du livreur)

---

### Étape 5 : Vérifier la Configuration

1. **Redémarrer le serveur** :
   ```bash
   npm run dev
   ```

2. **Vérifier les logs au démarrage** :
   ```
   [Telegram] ✅ Bot Telegram configuré et prêt
   ```

3. **Lancer le diagnostic** :
   ```bash
   npm run diagnostic:telegram
   ```

4. **Résultat attendu** :
   ```
   ✅ Bot configuré: OUI
   ✅ Livreurs avec telegramId: X/Y
   ✅ Livreurs disponibles: X
   ```

---

## 🧪 Test d'Envoi

### Test 1 : Test Direct

```bash
npm run script:test-telegram <votre-chat-id>
```

Exemple :
```bash
npm run script:test-telegram 123456789
```

### Test 2 : Créer une Commande

1. Créer une commande via l'interface
2. Vérifier les logs serveur :
   ```
   [WebSocket] 📞 Envoi notification Telegram pour commande: xxx
   [Telegram] 🔍 X livreur(s) avec Telegram trouvé(s)
   [Telegram] 📱 X notification(s) Telegram envoyée(s)
   ```
3. Vérifier Telegram : vous devriez recevoir un message

---

## 📊 Vérification des Logs Serveur

Après création d'une commande, vérifiez les logs :

### ✅ Logs Normaux (Tout fonctionne)

```
[ORDER] ⚡⚡⚡ POST /api/orders - DÉBUT CRÉATION COMMANDE ⚡⚡⚡
[ORDER] ✅ Commande créée avec succès
[WebSocket] 📞 Envoi notification Telegram pour commande: xxx
[Telegram] 🔍 1 livreur(s) avec Telegram trouvé(s)
[Telegram] 📊 Livreur Test (available): 0 commande(s) active(s) - ✅ Peut accepter
[Telegram] 🔍 1 livreur(s) disponible(s)
[Telegram] 🔊 Envoi fichiers audio PUISSANTS à livreur 123456789
[Telegram] 📤 Envoi message simplifié à livreur 123456789
[Telegram] ✅ Message envoyé
[WebSocket] 📱 1 notification(s) Telegram envoyée(s)
```

### ❌ Logs d'Erreur (Problème)

#### Problème 1 : Bot non configuré
```
[Telegram] ⚠️ Bot Telegram non configuré
[Telegram] ❌ Bot non configuré
[WebSocket] 📱 0 notification(s) Telegram envoyée(s)
```
**Solution** : Configurer `TELEGRAM_BOT_TOKEN` (voir Étape 2)

#### Problème 2 : Aucun livreur disponible
```
[Telegram] 🔍 0 livreur(s) avec Telegram trouvé(s)
[Telegram] ⚠️ Aucun livreur disponible avec Telegram
[WebSocket] 📱 0 notification(s) Telegram envoyée(s)
```
**Solution** : 
- Ajouter `telegramId` aux livreurs (voir Étape 4)
- Vérifier que les livreurs ont `status='available'` ou `status='on_delivery'`

#### Problème 3 : Livreurs à limite
```
[Telegram] 📊 Livreur Test (available): 2 commande(s) active(s) - ❌ Limite atteinte
[Telegram] 🔍 0 livreur(s) disponible(s)
```
**Solution** : Les livreurs ont atteint la limite (2 commandes actives). Attendre qu'ils livrent une commande.

---

## 🔧 Dépannage

### Problème : "Bot non configuré" même après configuration

**Vérifications** :
1. ✅ Le token est dans `.env` (sans espaces)
2. ✅ Le serveur a été redémarré après modification `.env`
3. ✅ Le token est correct (format: `123456789:ABCdef...`)

**Solution** :
```bash
# Vérifier que le token est bien chargé
node -e "require('dotenv').config(); console.log(process.env.TELEGRAM_BOT_TOKEN ? '✅ Configuré' : '❌ Non configuré')"
```

### Problème : "Aucun livreur disponible"

**Vérifications** :
1. ✅ Des livreurs existent dans la base de données
2. ✅ Les livreurs ont un `telegramId`
3. ✅ Les livreurs ont `status='available'` ou `status='on_delivery'`
4. ✅ Les livreurs ont moins de 2 commandes actives

**Solution** :
```bash
# Lancer le diagnostic
npm run diagnostic:telegram
```

### Problème : Message reçu mais lien ne fonctionne pas

**Vérifications** :
1. ✅ L'URL de l'application est correcte dans `.env` (`APP_URL`)
2. ✅ Le serveur est accessible publiquement (pour production)

**Solution** :
```env
APP_URL=https://votre-domaine.com
```

---

## 📝 Checklist de Configuration

- [ ] Bot Telegram créé via @BotFather
- [ ] Token obtenu et sauvegardé
- [ ] `TELEGRAM_BOT_TOKEN` ajouté dans `.env`
- [ ] Serveur redémarré
- [ ] Logs montrent "✅ Bot Telegram configuré"
- [ ] Chat ID obtenu via @userinfobot
- [ ] `telegramId` ajouté aux livreurs dans la base de données
- [ ] Livreurs ont `status='available'` ou `status='on_delivery'`
- [ ] Test d'envoi réussi
- [ ] Commande de test créée et notification reçue

---

## 🎯 Résultat Attendu

Après configuration complète :

1. **Création d'une commande** → Notification Telegram envoyée automatiquement
2. **Message Telegram reçu** avec :
   - Détails de la commande
   - Adresse de livraison
   - Gain pour le livreur
   - Lien d'acceptation
3. **Clic sur le lien** → Redirection vers `/accept/:orderId` → Auto-login → Dashboard livreur

---

## 📚 Ressources

- **BotFather** : @BotFather sur Telegram
- **User Info Bot** : @userinfobot sur Telegram
- **Documentation Telegram Bot API** : https://core.telegram.org/bots/api

---

**Guide créé le** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
