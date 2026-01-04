/**
 * Service de vérification Flouci
 * Extrait toute la logique de vérification et création de commande depuis order-success.tsx
 */

import { createOrder } from "@/lib/api";
import { isRestaurantOpen as checkNewOpeningHours, parseOpeningHoursSchedule, formatOpeningHours } from "@shared/openingHours";

export interface FlouciVerificationResult {
  success: boolean;
  orderIds?: string[];
  error?: string;
  redirectTo?: string;
}

export interface FlouciVerificationOptions {
  paymentId: string;
  language: 'fr' | 'en' | 'ar';
  onSuccess?: (orderIds: string[]) => void;
  onError?: (error: string) => void;
}

/**
 * Vérifie le statut d'un paiement Flouci et crée la commande si le paiement est confirmé
 * 
 * @param options - Options de vérification
 * @returns Résultat de la vérification
 */
export async function verifyFlouciPayment(
  options: FlouciVerificationOptions
): Promise<FlouciVerificationResult> {
  const { paymentId, language, onSuccess, onError } = options;

  try {
    console.log('[FlouciVerification] 🔍 Vérification paiement Flouci:', paymentId);

    // Vérifier le statut du paiement
    const response = await fetch(`/api/payments/flouci/verify/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to verify Flouci payment');
    }

    const data = await response.json();
    console.log('[FlouciVerification] 📊 Statut paiement Flouci:', data);

    // Vérifier si le paiement est réussi
    if (data.success && data.status === 'SUCCESS') {
      // Récupérer les données de commande depuis sessionStorage
      const pendingOrderStr = sessionStorage.getItem('pendingFlouciOrder');
      if (!pendingOrderStr) {
        throw new Error('Order data not found');
      }

      const pendingOrder = JSON.parse(pendingOrderStr);

      console.log('[FlouciVerification] ✅ Paiement Flouci confirmé, vérification des horaires avant création de la commande');

      // ✅ VÉRIFICATION DES HORAIRES : Vérifier si les restaurants sont toujours ouverts
      const closedRestaurants = await checkRestaurantsOpeningHours(
        pendingOrder.restaurants,
        language
      );

      if (closedRestaurants.length > 0) {
        // Si un restaurant est fermé, annuler et rembourser
        const closedNames = closedRestaurants.map(r => r.name).join(', ');
        const formattedHours = closedRestaurants[0].formattedHours || '';

        let message = '';
        if (language === 'ar') {
          message = formattedHours
            ? `عذراً، ${closedNames} ${closedRestaurants.length === 1 ? 'أغلق للتو' : 'أغلقوا للتو'} مطابخه أثناء الدفع. ${formattedHours} سيتم استرداد دفعتك.`
            : `عذراً، ${closedNames} ${closedRestaurants.length === 1 ? 'أغلق للتو' : 'أغلقوا للتو'} مطابخه أثناء الدفع. سيتم استرداد دفعتك.`;
        } else if (language === 'en') {
          message = formattedHours
            ? `Sorry, ${closedNames} ${closedRestaurants.length === 1 ? 'just closed' : 'just closed'} their kitchens while you were paying. ${formattedHours} Your payment will be refunded.`
            : `Sorry, ${closedNames} ${closedRestaurants.length === 1 ? 'just closed' : 'just closed'} their kitchens while you were paying. Your payment will be refunded.`;
        } else {
          message = formattedHours
            ? `Désolé, ${closedNames} ${closedRestaurants.length === 1 ? 'vient de fermer' : 'viennent de fermer'} ses cuisines pendant que vous payiez. ${formattedHours} Votre paiement sera remboursé.`
            : `Désolé, ${closedNames} ${closedRestaurants.length === 1 ? 'vient de fermer' : 'viennent de fermer'} ses cuisines pendant que vous payiez. Votre paiement sera remboursé.`;
        }

        // Nettoyer sessionStorage
        sessionStorage.removeItem('pendingFlouciOrder');
        sessionStorage.removeItem('flouciPaymentId');

        const errorMessage = language === 'ar'
          ? 'المطعم مغلق'
          : language === 'en'
          ? 'Restaurant Closed'
          : 'Restaurant fermé';

        onError?.(errorMessage);

        return {
          success: false,
          error: errorMessage,
          redirectTo: '/cart?payment=restaurant_closed',
        };
      }

      console.log('[FlouciVerification] ✅ Tous les restaurants sont ouverts, création de la commande');

      // Créer les commandes
      const orderPromises = pendingOrder.restaurants.map(async (restaurantCart: any) => {
        return createOrder({
          restaurantId: restaurantCart.restaurantId,
          customerName: pendingOrder.customerName,
          phone: pendingOrder.phone,
          address: pendingOrder.address,
          addressDetails: pendingOrder.addressDetails,
          customerLat: pendingOrder.customerLat,
          customerLng: pendingOrder.customerLng,
          items: restaurantCart.items,
        });
      });

      const results = await Promise.all(orderPromises);
      console.log(`[FlouciVerification] ✅ ${results.length} commande(s) créée(s) avec succès`);

      // Nettoyer sessionStorage
      sessionStorage.removeItem('pendingFlouciOrder');
      sessionStorage.removeItem('flouciPaymentId');

      // Sauvegarder les données client
      if (pendingOrder.customerName && pendingOrder.phone) {
        localStorage.setItem('customerName', pendingOrder.customerName);
        localStorage.setItem('customerPhone', pendingOrder.phone);
      }

      const orderIds = results.map(r => r.orderId).filter(Boolean);

      onSuccess?.(orderIds);

      return {
        success: true,
        orderIds,
      };
    } else {
      // Paiement échoué ou en attente
      console.warn('[FlouciVerification] ⚠️ Paiement Flouci non confirmé:', data.status);

      const errorMessage = language === 'ar'
        ? 'لم يتم تأكيد الدفع. يرجى المحاولة مرة أخرى.'
        : language === 'en'
        ? 'Payment not confirmed. Please try again.'
        : 'Paiement non confirmé. Veuillez réessayer.';

      onError?.(errorMessage);

      return {
        success: false,
        error: errorMessage,
        redirectTo: '/cart?payment=failed',
      };
    }
  } catch (error: any) {
    console.error('[FlouciVerification] ❌ Erreur vérification Flouci:', error);

    const errorMessage = language === 'ar'
      ? 'خطأ في التحقق من الدفع'
      : language === 'en'
      ? 'Payment verification error'
      : 'Erreur de vérification du paiement';

    onError?.(errorMessage);

    return {
      success: false,
      error: errorMessage,
      redirectTo: '/cart?payment=error',
    };
  }
}

/**
 * Vérifie si les restaurants sont toujours ouverts
 * @param restaurants - Liste des restaurants à vérifier
 * @param language - Langue pour les messages
 * @returns Liste des restaurants fermés avec leurs informations
 */
async function checkRestaurantsOpeningHours(
  restaurants: Array<{ restaurantId: string; restaurantName?: string }>,
  language: 'fr' | 'en' | 'ar'
): Promise<Array<{ id: string; name: string; nextOpenTime?: string | null; formattedHours?: string }>> {
  try {
    const response = await fetch("/api/restaurants");
    if (!response.ok) {
      console.error('[FlouciVerification] Erreur lors de la récupération des restaurants');
      return []; // En cas d'erreur, on continue quand même (le serveur vérifiera aussi)
    }

    const allRestaurants = await response.json();
    const restaurantMap = new Map(allRestaurants.map((r: any) => [r.id, r]));

    const closedRestaurants: Array<{ id: string; name: string; nextOpenTime?: string | null; formattedHours?: string }> = [];

    for (const restaurantCart of restaurants) {
      const restaurant = restaurantMap.get(restaurantCart.restaurantId);
      if (!restaurant) continue;

      // Vérifier le toggle manuel d'abord
      if (restaurant.isOpen === false || restaurant.computedStatus?.isOpen === false) {
        closedRestaurants.push({
          id: restaurant.id,
          name: restaurant.name || restaurantCart.restaurantName || "Restaurant inconnu",
        });
        continue;
      }

      // Essayer le nouveau format JSON
      const schedule = parseOpeningHoursSchedule(restaurant.openingHours || null);
      if (schedule) {
        const status = checkNewOpeningHours(schedule);
        if (!status.isOpen) {
          const formattedHours = formatOpeningHours(schedule, language);
          closedRestaurants.push({
            id: restaurant.id,
            name: restaurant.name || restaurantCart.restaurantName || "Restaurant inconnu",
            nextOpenTime: status.nextOpenTime,
            formattedHours: formattedHours || undefined,
          });
        }
      } else {
        // Fallback : utiliser computedStatus si disponible
        if (restaurant.computedStatus && !restaurant.computedStatus.isOpen) {
          closedRestaurants.push({
            id: restaurant.id,
            name: restaurant.name || restaurantCart.restaurantName || "Restaurant inconnu",
          });
        }
      }
    }

    return closedRestaurants;
  } catch (error) {
    console.error('[FlouciVerification] Erreur lors de la vérification des horaires:', error);
    // En cas d'erreur, on retourne une liste vide (le serveur vérifiera aussi)
    return [];
  }
}

/**
 * Récupère le payment_id depuis différentes sources (URL params, sessionStorage)
 */
export function getFlouciPaymentId(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const paymentId = searchParams.get('id') || searchParams.get('payment_id');
  const storedPaymentId = sessionStorage.getItem('flouciPaymentId');

  return paymentId || storedPaymentId || null;
}

/**
 * Vérifie si on arrive depuis Flouci (paramètre payment=flouci dans l'URL)
 */
export function isFlouciCallback(): boolean {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('payment') === 'flouci';
}
