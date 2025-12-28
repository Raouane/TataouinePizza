/**
 * Hook pour gérer les notifications push PWA
 * Permet de s'abonner aux notifications push pour recevoir des alertes même quand l'app est fermée
 */

import { useEffect, useState, useCallback } from 'react';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Convertit une clé VAPID base64 en Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isSubscribing: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/**
 * Hook pour gérer les notifications push
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Vérifier le support et récupérer la clé VAPID
  useEffect(() => {
    const checkSupport = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setIsSupported(true);
        
        // Récupérer la clé publique VAPID depuis le serveur
        try {
          const token = localStorage.getItem('driverToken');
          if (!token) {
            console.log('[Push] Pas de token, push notifications non disponibles');
            return;
          }

          const response = await fetch('/api/driver/push/vapid-key', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setVapidPublicKey(data.publicKey);
          }
        } catch (err) {
          console.error('[Push] Erreur récupération clé VAPID:', err);
        }

        // Vérifier l'état actuel de la subscription
        await checkSubscription();
      }
    };

    checkSupport();
  }, []);

  // Vérifier si l'utilisateur est déjà abonné
  const checkSubscription = useCallback(async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('[Push] Erreur vérification subscription:', err);
    }
  }, [isSupported]);

  // S'abonner aux notifications push
  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidPublicKey) {
      setError('Push notifications non supportées ou clé VAPID manquante');
      return;
    }

    setIsSubscribing(true);
    setError(null);

    try {
      const token = localStorage.getItem('driverToken');
      if (!token) {
        throw new Error('Non authentifié');
      }

      // Demander la permission de notification
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission de notification refusée');
      }

      // S'abonner via le Service Worker
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Envoyer la subscription au serveur
      const response = await fetch('/api/driver/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'abonnement');
      }

      setIsSubscribed(true);
      console.log('[Push] ✅ Abonnement réussi');
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de l\'abonnement';
      setError(errorMessage);
      console.error('[Push] ❌ Erreur abonnement:', err);
    } finally {
      setIsSubscribing(false);
    }
  }, [isSupported, vapidPublicKey]);

  // Se désabonner des notifications push
  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    setIsSubscribing(true);
    setError(null);

    try {
      const token = localStorage.getItem('driverToken');
      if (!token) {
        throw new Error('Non authentifié');
      }

      // Se désabonner du Service Worker
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Notifier le serveur
      await fetch('/api/driver/push/unsubscribe', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setIsSubscribed(false);
      console.log('[Push] 🗑️ Désabonnement réussi');
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du désabonnement';
      setError(errorMessage);
      console.error('[Push] ❌ Erreur désabonnement:', err);
    } finally {
      setIsSubscribing(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isSubscribing,
    error,
    subscribe,
    unsubscribe
  };
}

