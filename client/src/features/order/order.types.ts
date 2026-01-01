/**
 * Types pour le feature Order (V2)
 * Types partagés entre composants, hooks et API
 */

export interface OrderItem {
  pizzaId: string;
  size: "small" | "medium" | "large";
  quantity: number;
  pizza?: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
  };
  pricePerUnit?: string;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails?: string;
  status: string;
  totalPrice: string;
  items: OrderItem[];
  createdAt?: string;
  driverId?: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  notes?: string;
  paymentMethod?: string;
  customerLat?: number | string;
  customerLng?: number | string;
}

export interface CreateOrderInput {
  restaurantId: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails?: string;
  customerLat?: number;
  customerLng?: number;
  items: Array<{
    pizzaId: string;
    size: "small" | "medium" | "large";
    quantity: number;
  }>;
  paymentMethod?: string;
  notes?: string;
}

export interface CreateOrderResult {
  orderId: string;
  totalPrice: number;
  duplicate?: boolean;
}
