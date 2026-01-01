/**
 * Service de synchronisation session client/serveur
 * Fallback pour localStorage qui peut être nettoyé sur mobile (PWA)
 */

interface SessionData {
  phone?: string;
  address?: string;
  addressDetails?: string;
  name?: string;
}

/**
 * Synchronise les données utilisateur avec le serveur
 * Crée/rafraîchit une session temporaire côté serveur
 */
export async function syncSessionWithServer(data?: SessionData): Promise<boolean> {
  try {
    // Récupérer les données depuis localStorage si non fournies
    const sessionData: SessionData = data || {
      phone: localStorage.getItem('phone') || undefined,
      address: localStorage.getItem('address') || undefined,
      addressDetails: localStorage.getItem('addressDetails') || undefined,
      name: localStorage.getItem('name') || undefined,
    };

    // Si aucune donnée, ne rien faire
    if (!sessionData.phone && !sessionData.address) {
      return false;
    }

    // Créer/rafraîchir session serveur
    const response = await fetch('/api/session/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      console.error('[Session] Erreur sync serveur:', response.statusText);
      return false;
    }

    console.log('[Session] ✅ Session synchronisée avec le serveur');
    return true;
  } catch (error) {
    console.error('[Session] Erreur sync:', error);
    return false;
  }
}

/**
 * Récupère les données de session depuis le serveur
 * Utilisé comme fallback si localStorage est vide
 */
export async function restoreSessionFromServer(phone: string): Promise<SessionData | null> {
  try {
    const response = await fetch(`/api/session/restore?phone=${encodeURIComponent(phone)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Pas de session trouvée, c'est normal
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Restaurer dans localStorage
    if (data.phone) localStorage.setItem('phone', data.phone);
    if (data.address) localStorage.setItem('address', data.address);
    if (data.addressDetails) localStorage.setItem('addressDetails', data.addressDetails);
    if (data.name) localStorage.setItem('name', data.name);

    console.log('[Session] ✅ Session restaurée depuis le serveur');
    return data;
  } catch (error) {
    console.error('[Session] Erreur restauration:', error);
    return null;
  }
}

/**
 * Synchronise automatiquement après une action importante
 * À appeler après :
 * - Onboarding complété
 * - Commande créée
 * - Modification adresse
 */
export async function autoSync(): Promise<void> {
  // Ne pas bloquer l'UI, sync en arrière-plan
  syncSessionWithServer().catch(err => {
    console.error('[Session] Erreur auto-sync:', err);
  });
}
