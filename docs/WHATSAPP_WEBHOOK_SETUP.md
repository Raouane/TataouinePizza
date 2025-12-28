# Configuration du Webhook WhatsApp

## 📋 Vue d'ensemble

Ce guide explique comment configurer le webhook Twilio pour recevoir les réponses WhatsApp des livreurs (A pour accepter, R pour refuser).

## 🔧 Configuration dans Twilio Console

### Étape 1 : Accéder aux paramètres WhatsApp Sandbox

1. Allez sur https://console.twilio.com
2. Naviguez vers **"Messaging"** → **"Try it out"** → **"Send a WhatsApp message"**
3. Cliquez sur **"Sandbox settings"** ou **"Configure"**

### Étape 2 : Configurer le Webhook Inbound

1. Dans la section **"When a message comes in"**, ajoutez l'URL suivante :
   ```
   https://tataouine-pizza.onrender.com/api/webhook/whatsapp
   ```
2. Méthode : **POST**
3. Cliquez sur **"Save"**

### Étape 3 : Vérifier la configuration

Une fois configuré, tous les messages WhatsApp reçus par votre numéro Twilio seront envoyés à cette URL.

## 📱 Utilisation

### Pour les livreurs

Quand un livreur reçoit une notification de nouvelle commande, il peut répondre directement par WhatsApp :

- **Tapez "A"** → Accepte la commande
- **Tapez "R"** → Refuse la commande

### Fonctionnement

1. Une nouvelle commande est créée
2. Un message WhatsApp est envoyé à tous les livreurs disponibles
3. Le livreur répond "A" ou "R" par WhatsApp
4. Le webhook reçoit la réponse et traite l'acceptation/refus
5. Une confirmation est envoyée au livreur

## 🔍 Logs de débogage

Les logs suivants apparaîtront dans Render :

```
[WhatsApp Webhook] 📨 MESSAGE REÇU
[WhatsApp Webhook] De: whatsapp:+33783698509
[WhatsApp Webhook] Corps: A
[WhatsApp Webhook] ✅ Livreur trouvé: Raouane
[WhatsApp Webhook] ✅ Commande acceptée
```

## ⚠️ Notes importantes

- Le webhook fonctionne uniquement en mode Sandbox pour l'instant
- En production, vous devrez configurer un webhook WhatsApp Business API approuvé
- Les réponses sont traitées en temps réel (délai de ~1-2 secondes)

## 🧪 Test

Pour tester le webhook :

1. Créez une commande depuis l'application
2. Recevez le message WhatsApp sur votre téléphone
3. Répondez "A" ou "R"
4. Vérifiez les logs Render pour confirmer la réception
5. Vérifiez que la commande est acceptée/refusée dans l'application

