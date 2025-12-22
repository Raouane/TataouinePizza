import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LanguageProvider } from '@/lib/i18n';
import { CartProvider } from '@/lib/cart';
import { OrderProvider } from '@/lib/order-context';

// Créer un QueryClient pour les tests
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrapper avec tous les providers nécessaires
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <OrderProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </OrderProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

// Fonction de render personnalisée avec les providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Réexporter tout depuis @testing-library/react
export * from '@testing-library/react';
export { customRender as render };


