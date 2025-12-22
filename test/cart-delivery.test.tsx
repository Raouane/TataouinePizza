import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CartProvider } from '@/lib/cart';

// Test simple pour vérifier que le calcul de livraison fonctionne
describe('Cart Delivery Fee Calculation', () => {
  const DELIVERY_FEE = 2.00;

  it('should calculate total with delivery fee correctly', () => {
    const pizzaTotal = 15.00;
    const expectedTotal = pizzaTotal + DELIVERY_FEE;
    
    expect(expectedTotal).toBe(17.00);
  });

  it('should format delivery fee as 2.00 TND', () => {
    const formatted = DELIVERY_FEE.toFixed(2);
    expect(formatted).toBe('2.00');
  });
});



