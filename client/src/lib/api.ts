// API Client for frontend-backend communication

const API_BASE = "/api";

export interface Pizza {
  id: string;
  name: string;
  description?: string;
  productType?: string;
  category: string;
  imageUrl?: string;
  available: boolean;
  restaurantId?: string;
  prices: Array<{ size: string; price: string }>;
}

export interface OrderItem {
  pizzaId: string;
  size: "small" | "medium" | "large";
  quantity: number;
  pizza?: {
    id: string;
    name: string;
    description?: string;
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
}

// ============ PUBLIC ENDPOINTS ============

export async function fetchPizzas(): Promise<Pizza[]> {
  const res = await fetch(`${API_BASE}/pizzas`);
  if (!res.ok) throw new Error("Failed to fetch pizzas");
  return res.json();
}

export async function fetchPizzaById(id: string): Promise<Pizza> {
  const res = await fetch(`${API_BASE}/pizzas/${id}`);
  if (!res.ok) throw new Error("Failed to fetch pizza");
  return res.json();
}

// ============ CUSTOMER AUTHENTICATION (Simple - MVP) ============

export async function customerLogin(firstName: string, phone: string): Promise<{ token: string; customer: { id: string; firstName: string; phone: string } }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, phone }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to login");
  }
  return res.json();
}

// ============ OTP (Conditional - only if ENABLE_SMS_OTP=true for customers) ============

/**
 * Envoie un code OTP pour les clients (uniquement si ENABLE_SMS_OTP=true)
 */
export async function sendOtp(phone: string): Promise<{ code?: string }> {
  const res = await fetch(`${API_BASE}/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, userType: "customer" }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || error.message || "Failed to send OTP");
  }
  return res.json();
}

/**
 * Envoie un code OTP pour les livreurs (toujours activé)
 */
export async function sendDriverOtp(phone: string): Promise<{ message: string; code?: string; demoCode?: string; smsFailed?: boolean }> {
  const res = await fetch(`${API_BASE}/driver/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to send OTP");
  }
  return res.json();
}

/**
 * Envoie un code OTP pour les restaurants (toujours activé)
 */
export async function sendRestaurantOtp(phone: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/restaurant/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to send OTP");
  }
  return res.json();
}

export async function verifyOtp(phone: string, code: string): Promise<{ verified: boolean }> {
  const res = await fetch(`${API_BASE}/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || error.message || "Failed to verify OTP");
  }
  return res.json();
}

// ============ ORDERS ============

export async function createOrder(data: {
  restaurantId: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails?: string;
  customerLat?: number;
  customerLng?: number;
  items: OrderItem[];
}): Promise<{ orderId: string; totalPrice: number }> {
  console.log('[API] 🚀 createOrder appelé avec:', {
    restaurantId: data.restaurantId,
    itemsCount: data.items.length,
    customerName: data.customerName,
    phone: data.phone
  });
  
  try {
    const url = `${API_BASE}/orders`;
    console.log('[API] 📡 Envoi POST vers:', url);
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    console.log('[API] 📡 Réponse reçue:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    });
    
    if (!res.ok) {
      const error = await res.json();
      console.error('[API] ❌ Erreur création commande:', error);
      throw new Error(error.error || "Failed to create order");
    }
    
    const result = await res.json();
    console.log('[API] ✅ Commande créée avec succès:', result);
    return result;
  } catch (error: any) {
    console.error('[API] ❌ Exception lors de la création:', error);
    throw error;
  }
}

export async function getOrder(id: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}`);
  if (!res.ok) throw new Error("Failed to fetch order");
  return res.json();
}

export async function getOrdersByPhone(phone: string): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/orders/customer/${phone}`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

// ============ ADMIN ============

export async function adminLogin(email: string, password: string): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function adminRegister(email: string, password: string): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE}/admin/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Registration failed");
  return res.json();
}

export async function getAdminOrders(token: string): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/admin/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch orders");
  const data = await res.json();
  // Backend returns { orders, total, offset, limit }, extract just orders
  return Array.isArray(data) ? data : (data.orders || []);
}

export async function updateOrderStatus(id: string, status: string, token: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/admin/orders/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update order");
  return res.json();
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: string;
}

export async function getAdminDrivers(token: string): Promise<Driver[]> {
  const res = await fetch(`${API_BASE}/admin/drivers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch drivers");
  return res.json();
}

export async function assignOrderToDriver(orderId: string, driverId: string, token: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}/driver`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ driverId }),
  });
  if (!res.ok) throw new Error("Failed to assign order");
  return res.json();
}

export interface Restaurant {
  id: string;
  name: string;
  phone: string;
  address: string;
  description?: string;
  imageUrl?: string;
  categories?: string[];
  isOpen: boolean;
  openingHours?: string | null;
  deliveryTime?: number;
  minOrder?: string | number;
  rating?: string | number;
}

export async function getAdminRestaurants(token: string): Promise<Restaurant[]> {
  const res = await fetch(`${API_BASE}/admin/restaurants`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch restaurants");
  return res.json();
}

export async function createRestaurant(
  data: { 
    name: string; 
    phone: string; 
    address: string; 
    description?: string; 
    imageUrl?: string; 
    categories?: string[];
    openingHours?: string;
    deliveryTime?: number;
    minOrder?: string;
    rating?: string;
  },
  token: string
): Promise<Restaurant> {
  if (!token) {
    throw new Error("Token manquant. Veuillez vous reconnecter.");
  }
  
  const res = await fetch(`${API_BASE}/admin/restaurants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    // Essayer de parser l'erreur JSON, sinon utiliser le texte
    let errorMessage = "Failed to create restaurant";
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Si ce n'est pas du JSON, lire le texte
      const text = await res.text();
      console.error("Erreur serveur (HTML):", text.substring(0, 200));
      errorMessage = `Erreur serveur (${res.status}): ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  return res.json();
}

export async function updateRestaurant(
  id: string,
  data: { 
    name?: string; 
    phone?: string; 
    address?: string; 
    description?: string; 
    imageUrl?: string; 
    categories?: string[]; 
    isOpen?: boolean;
    openingHours?: string;
    deliveryTime?: number;
    minOrder?: string;
    rating?: string;
  },
  token: string
): Promise<Restaurant> {
  console.log("[API] updateRestaurant appelé avec:", { id, data });
  console.log("[API] updateRestaurant - openingHours dans data:", data.openingHours, "présent:", 'openingHours' in data);
  const bodyString = JSON.stringify(data);
  console.log("[API] updateRestaurant - Body JSON:", bodyString);
  const res = await fetch(`${API_BASE}/admin/restaurants/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: bodyString,
  });
  
  console.log("[API] Réponse updateRestaurant:", res.status, res.statusText);
  
  if (!res.ok) {
    const error = await res.json();
    console.error("[API] Erreur updateRestaurant:", error);
    throw new Error(error.error || "Failed to update restaurant");
  }
  const result = await res.json();
  console.log("[API] Restaurant mis à jour retourné:", result);
  console.log("[API] isOpen dans la réponse:", result.isOpen, "type:", typeof result.isOpen);
  return result;
}

export async function seedTestRestaurants(token: string): Promise<{ success: boolean; message: string; restaurantsCreated: number; restaurantsSkipped: number; productsCreated: number }> {
  const res = await fetch(`${API_BASE}/admin/restaurants/seed-test-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to seed test restaurants");
  }
  return res.json();
}

export async function enrichAllRestaurants(token: string): Promise<{ success: boolean; message: string; restaurantsProcessed: number; imagesUpdated: number; productsAdded: number }> {
  const res = await fetch(`${API_BASE}/admin/restaurants/enrich-all`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to enrich restaurants");
  }
  return res.json();
}

export async function deleteRestaurant(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/restaurants/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!res.ok) {
    // Essayer de parser l'erreur JSON, sinon utiliser le texte
    let errorMessage = "Failed to delete restaurant";
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Si ce n'est pas du JSON, lire le texte
      const text = await res.text();
      console.error("Erreur serveur (HTML):", text.substring(0, 200));
      errorMessage = `Erreur serveur (${res.status}): ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }
}

export async function createDriver(
  data: { name: string; phone: string; password: string },
  token: string
): Promise<Driver> {
  const res = await fetch(`${API_BASE}/admin/drivers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create driver");
  }
  return res.json();
}

export async function updateDriver(
  id: string,
  data: { name?: string; phone?: string; password?: string; status?: "available" | "offline" | "on_delivery" },
  token: string
): Promise<Driver> {
  const res = await fetch(`${API_BASE}/admin/drivers/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    let errorMessage = "Failed to update driver";
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      const text = await res.text();
      console.error("Erreur serveur (HTML):", text.substring(0, 200));
      errorMessage = `Erreur serveur (${res.status}): ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function deleteDriver(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/drivers/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!res.ok) {
    let errorMessage = "Failed to delete driver";
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      const text = await res.text();
      console.error("Erreur serveur (HTML):", text.substring(0, 200));
      errorMessage = `Erreur serveur (${res.status}): ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }
}

export async function getAdminPizzas(token: string): Promise<Pizza[]> {
  const res = await fetch(`${API_BASE}/admin/pizzas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch pizzas");
  return res.json();
}

export async function createPizza(
  data: {
    restaurantId: string;
    name: string;
    description?: string;
    productType?: string;
    category: string;
    imageUrl?: string;
    available?: boolean;
    prices: Array<{ size: string; price: number }>;
  },
  token: string
): Promise<Pizza> {
  if (!token) {
    throw new Error("Token manquant. Veuillez vous reconnecter.");
  }
  
  const res = await fetch(`${API_BASE}/admin/pizzas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    // Essayer de parser l'erreur JSON, sinon utiliser le texte
    let errorMessage = "Failed to create pizza";
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Si ce n'est pas du JSON, lire le texte
      const text = await res.text();
      console.error("Erreur serveur (HTML):", text.substring(0, 200));
      errorMessage = `Erreur serveur (${res.status}): ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  return res.json();
}

export async function updatePizza(
  id: string,
  data: {
    name?: string;
    description?: string;
    productType?: string;
    category?: string;
    imageUrl?: string;
    available?: boolean;
    prices?: Array<{ size: string; price: number }>;
  },
  token: string
): Promise<Pizza> {
  const res = await fetch(`${API_BASE}/admin/pizzas/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    let errorMessage = "Failed to update pizza";
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      const text = await res.text();
      console.error("Erreur serveur (HTML):", text.substring(0, 200));
      errorMessage = `Erreur serveur (${res.status}): ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function deletePizza(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/pizzas/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!res.ok) {
    let errorMessage = "Failed to delete pizza";
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      const text = await res.text();
      console.error("Erreur serveur (HTML):", text.substring(0, 200));
      errorMessage = `Erreur serveur (${res.status}): ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }
}
