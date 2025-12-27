# Guide de Test - Keep-Alive

## Vue d'ensemble

Le système keep-alive maintient les connexions actives pour éviter que les pages se ferment automatiquement après une période d'inactivité.

## Fonctionnalités implémentées

### 1. Driver Dashboard (WebSocket)
- **Fréquence** : Ping toutes les 5 minutes
- **Objectif** : Maintenir la connexion WebSocket active
- **Timeout serveur** : 10 minutes d'inactivité (évité par le keep-alive)

### 2. Restaurant Dashboard (HTTP)
- **Fréquence** : Requête HTTP toutes les 5 minutes
- **Objectif** : Maintenir la session active
- **Endpoint** : `/api/restaurant/status`

## Comment tester

### Test Driver Dashboard

1. **Ouvrir le dashboard livreur**
   - Se connecter en tant que livreur
   - Ouvrir la console du navigateur (F12)

2. **Vérifier les logs keep-alive**
   - Attendre 5 minutes
   - Vous devriez voir dans la console :
     ```
     [WebSocket] 🔄 Keep-alive envoyé à HH:MM:SS - Connexion maintenue active
     ```

3. **Vérifier la persistance**
   - Laisser l'onglet ouvert pendant 15-20 minutes
   - Vérifier que la connexion WebSocket reste active
   - Pas de message de reconnexion dans les logs

4. **Test de reconnexion automatique**
   - Si la connexion se ferme, le système devrait se reconnecter automatiquement
   - Vérifier les logs de reconnexion

### Test Restaurant Dashboard

1. **Ouvrir le dashboard restaurant**
   - Se connecter en tant que restaurant
   - Ouvrir la console du navigateur (F12)
   - Ouvrir l'onglet Network (Réseau)

2. **Vérifier les requêtes keep-alive**
   - Attendre 5 minutes
   - Dans la console, vous devriez voir :
     ```
     [Restaurant] 🔄 Keep-alive: session maintenue active à HH:MM:SS
     ```
   - Dans l'onglet Network, vérifier qu'une requête vers `/api/restaurant/status` est faite toutes les 5 minutes

3. **Vérifier la persistance**
   - Laisser l'onglet ouvert pendant 15-20 minutes
   - Vérifier que les requêtes continuent toutes les 5 minutes
   - Pas d'erreur de session expirée

## Vérifications à faire

### ✅ Critères de succès

- [ ] Les logs keep-alive apparaissent toutes les 5 minutes
- [ ] La connexion WebSocket reste active (driver)
- [ ] Les requêtes HTTP continuent (restaurant)
- [ ] Pas de reconnexion inattendue
- [ ] Pas d'erreur de session expirée
- [ ] L'application reste fonctionnelle après 20+ minutes

### ⚠️ Problèmes possibles

1. **Keep-alive ne s'exécute pas**
   - Vérifier que `wsConnected` est `true` (driver)
   - Vérifier que `token` est présent (restaurant)
   - Vérifier la console pour les erreurs

2. **Connexion se ferme quand même**
   - Vérifier le timeout du serveur (10 minutes)
   - Le keep-alive devrait être plus fréquent que le timeout
   - Vérifier les logs serveur pour les erreurs

3. **Erreurs dans la console**
   - Vérifier les permissions réseau
   - Vérifier que le serveur répond aux requêtes
   - Vérifier les logs serveur

## Logs attendus

### Driver Dashboard
```
[WebSocket] 🔄 Keep-alive envoyé à 10:50:00 - Connexion maintenue active
[WebSocket] 🔄 Keep-alive envoyé à 10:55:00 - Connexion maintenue active
[WebSocket] 🔄 Keep-alive envoyé à 11:00:00 - Connexion maintenue active
```

### Restaurant Dashboard
```
[Restaurant] 🔄 Keep-alive: session maintenue active à 10:50:00
[Restaurant] 🔄 Keep-alive: session maintenue active à 10:55:00
[Restaurant] 🔄 Keep-alive: session maintenue active à 11:00:00
```

## Notes importantes

- Le keep-alive démarre seulement si la connexion est active
- Si l'utilisateur ferme l'onglet, le keep-alive s'arrête automatiquement
- Le keep-alive ne consomme pas beaucoup de ressources (1 requête toutes les 5 minutes)


