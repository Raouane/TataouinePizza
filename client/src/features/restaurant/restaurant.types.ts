/**
 * Types pour le feature Restaurant
 * Types partagés entre composants, hooks et API
 */

export interface Restaurant {
  id: string;
  name: string;
  phone: string;
  address: string;
  description?: string;
  imageUrl?: string;
  categories?: string[];
  isOpen?: boolean;
  openingHours?: string;
  deliveryTime?: number;
  rating?: string;
  reviewCount?: number;
  computedStatus?: {
    isOpen: boolean;
    reason?: 'toggle' | 'hours' | 'closedDay';
  };
}
