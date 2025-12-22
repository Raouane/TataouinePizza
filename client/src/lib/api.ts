// API Client for frontend-backend communication

const API_BASE = "/api";

export interface Pizza {
  id: string;
  name: string;
  description?: string;
  category: string;
  imageUrl?: string;
  available: boolean;
  prices: Array<{ size: string; price: string }>;
}

export interface OrderItem {
  pizzaId: string;
  size: "small" | "medium" | "large";
  quantity: number;
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

// ============ OTP ============

export async function sendOtp(phone: string): Promise<{ code?: string }> {
  const res = await fetch(`${API_BASE}/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new Error("Failed to send OTP");
  return res.json();
}

export async function verifyOtp(phone: string, code: string): Promise<{ verified: boolean }> {
  const res = await fetch(`${API_BASE}/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) throw new Error("Failed to verify OTP");
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
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create order");
  }
  return res.json();
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
  const res = await fetch(`${API_BASE}/admin/assign-order/${orderId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ driverId }),
  });
  if (!res.ok) throw new Error("Failed to assign order");
  return res.json();
}
