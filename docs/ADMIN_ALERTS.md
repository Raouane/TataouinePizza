# Système d'Alerte Admin - Commandes en Attente

## 📋 Comment l'Admin est Notifié

### 1. **Dashboard Admin (Visuel)**
Le dashboard admin affiche maintenant :
- **Alerte orange** en haut de la liste des commandes quand il y a des commandes en attente
- **Compteur** du nombre de commandes en attente
- **Temps d'attente moyen** calculé automatiquement
- **Badge** sur chaque commande en attente

### 2. **Statistiques**
Dans le dialog de statistiques, une section spéciale affiche :
- Le nombre de commandes en attente de livreur
- Mise en évidence visuelle (carte orange)

### 3. **Logs Serveur (Debug)**
Les alertes sont également loggées dans la console serveur pour le debugging :
- Message d'alerte avec détails de la commande
- Informations sur le client, restaurant, prix, adresse

## 🔄 Comment le Système Continue à Chercher

### Round Robin (Rotation Automatique)
1. **Première notification**: Tous les livreurs disponibles reçoivent la notification
2. **Timer de 2 minutes**: Si aucun livreur n'accepte, le système passe au suivant
3. **File d'attente**: Les livreurs sont notifiés un par un jusqu'à acceptation
4. **Alerte admin**: Si tous les livreurs ont été notifiés sans succès, alerte admin

### Conditions de Disponibilité
Un livreur est considéré disponible si :
- Statut = `available` OU `on_delivery` avec moins de 2 commandes actives
- En ligne dans les 5 dernières minutes (`last_seen`)
- A un `telegram_id` configuré

## 💡 Solutions pour Gérer la Surcharge

### Solutions Immédiates

1. **Activer plus de livreurs**
   - Vérifier que les livreurs sont en statut `available`
   - Vérifier qu'ils ont un `telegram_id` configuré
   - Vérifier qu'ils sont en ligne (dernière connexion < 5 min)

2. **Assigner manuellement**
   - Dans le dashboard admin, ouvrir les détails d'une commande
   - Sélectionner un livreur dans la liste déroulante
   - Même si le livreur a 2 commandes, vous pouvez forcer l'assignation

3. **Contacter les clients**
   - Le système peut envoyer un SMS automatique via n8n
   - Informer le client du délai estimé
   - Proposer une réduction ou un bon d'achat

### Solutions à Long Terme

1. **Augmenter le nombre de livreurs**
   - Recruter plus de livreurs
   - Former les livreurs existants

2. **Optimiser les tournées**
   - Regrouper les commandes par zone géographique
   - Utiliser un système de planification de tournées

3. **Système de priorité**
   - Prioriser les commandes VIP
   - Délai maximum avant annulation automatique

## 📱 Notifications Externes (Optionnel)

Si vous souhaitez recevoir des notifications externes (SMS, Email, Telegram), vous pouvez :

1. **Créer un webhook personnalisé** dans votre système
2. **Utiliser les logs serveur** pour déclencher des actions
3. **Intégrer avec n8n** en lisant les logs ou en créant un endpoint personnalisé

### Exemple Workflow Personnalisé

1. **Surveiller les logs** ou créer un endpoint API
2. **Envoi SMS au client** (optionnel)
   - Message: "Votre commande est en préparation. Délai estimé: 30-45 minutes"
3. **Notification admin** (SMS, Email, Telegram)
   - Message: "⚠️ Commande [ID] en attente - Aucun livreur disponible"
4. **Log dans base de données** (optionnel)
   - Historique des alertes

## 🔍 Vérification dans le Dashboard

### Indicateurs Visuels

1. **Alerte orange** en haut de la liste
   - Affiche le nombre de commandes en attente
   - Temps d'attente moyen
   - Conseils pour résoudre

2. **Badge sur les commandes**
   - Les commandes sans livreur ont un indicateur visuel
   - Statut: `accepted` ou `ready` sans `driverId`

3. **Statistiques**
   - Carte orange "En attente de livreur"
   - Compteur mis à jour en temps réel

## ⚙️ Paramètres Configurables

### Limite de Commandes par Livreur
Actuellement: **2 commandes actives maximum**

Pour modifier, éditez dans:
- `server/services/telegram-service.ts`: `MAX_ACTIVE_ORDERS_PER_DRIVER = 2`
- `server/services/sms-service.ts`: `MAX_ACTIVE_ORDERS_PER_DRIVER = 2`

### Délai Round Robin
Actuellement: **2 minutes** entre chaque notification

Pour modifier, éditez dans:
- `server/websocket.ts`: `ACCEPTANCE_TIMEOUT = 2 * 60 * 1000`

## 📊 Monitoring

### Logs Serveur
Les alertes sont loggées dans la console pour le debugging:
```
[ADMIN ALERT] 🚨 AUCUN LIVREUR DISPONIBLE - Alerte administration
[ADMIN ALERT] Commande [ID] en attente - Tous les livreurs sont surchargés
[ADMIN ALERT] Client: [Nom] - Restaurant: [Nom]
[ADMIN ALERT] Prix: [Montant] TND - Adresse: [Adresse]
```

### Dashboard Admin
- Actualisation automatique toutes les 5 secondes
- Compteur en temps réel des commandes en attente
- Historique visible dans les détails de chaque commande

