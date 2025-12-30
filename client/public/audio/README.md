# Fichiers Audio pour Notifications Telegram

Ce dossier contient les fichiers audio utilisés pour les notifications Telegram aux livreurs.

## Fichier requis

- **`alert.mp3`** : Fichier audio d'alerte pour les nouvelles commandes

## Format du fichier

- **Format** : MP3, M4A ou OGG (recommandé : MP3)
- **Durée** : 2-5 secondes (sonnerie d'alerte)
- **Taille** : Maximum 50 Mo (limite Telegram)

## Comment ajouter le fichier

1. Téléchargez ou créez un fichier audio d'alerte (sonnerie forte et distincte)
2. Renommez-le en `alert.mp3`
3. Placez-le dans ce dossier : `client/public/audio/alert.mp3`

## Exemples de sources pour fichiers audio

- [Freesound.org](https://freesound.org) - Sons gratuits
- [Zapsplat](https://www.zapsplat.com) - Bibliothèque de sons
- Créer votre propre son avec un éditeur audio

## Test

Une fois le fichier ajouté, le système l'utilisera automatiquement pour les notifications Telegram.

L'URL sera : `https://votre-domaine.com/public/audio/alert.mp3`

## Alternative : URL externe

Si vous préférez héberger le fichier ailleurs, modifiez `audioUrl` dans `server/services/telegram-service.ts` :

```typescript
const audioUrl = 'https://votre-serveur.com/audio/alert.mp3';
```

