import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder } from '@/lib/api';

describe('Order API', () => {
  beforeEach(() => {
    // Reset des mocks avant chaque test
    vi.clearAllMocks();
  });

  it('should create order with valid data', async () => {
    const mockResponse = {
      orderId: 'order-123',
      totalPrice: 17.00
    };

    // Mock de fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const orderData = {
      restaurantId: 'restaurant-1',
      customerName: 'Raoua',
      phone: '21123456',
      address: '123 Test Street',
      addressDetails: '',
      customerLat: 48.7849984,
      customerLng: 2.4608768,
      items: [
        { pizzaId: 'pizza-1', size: 'medium' as const, quantity: 1 }
      ]
    };

    const result = await createOrder(orderData);

    expect(result.orderId).toBe('order-123');
    expect(result.totalPrice).toBe(17.00);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/orders',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
    );
  });

  it('should reject order with invalid data', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid order data' }),
      } as Response)
    );

    const invalidOrder = {
      restaurantId: '',
      customerName: 'A', // Trop court (min 2 caractères)
      phone: '123', // Trop court (min 8)
      address: 'X', // Trop court (min 5)
      addressDetails: '',
      items: []
    };

    await expect(createOrder(invalidOrder)).rejects.toThrow();
  });
});


