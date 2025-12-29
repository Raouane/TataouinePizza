import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import { OrderProvider } from "@/lib/order-context";
import LoadingScreen from "@/components/loading-screen";
import ScrollToTop from "@/components/scroll-to-top";
import { CartConfirmDialog } from "@/components/cart-confirm-dialog";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import Menu from "@/pages/menu";
import CartPage from "@/pages/cart-page";
import OrderSuccess from "@/pages/order-success";
import OrderHistory from "@/pages/order-history";
import Profile from "@/pages/profile";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import DriverLogin from "@/pages/driver-login";
import DriverDashboard from "@/pages/driver-dashboard";
import RestaurantLogin from "@/pages/restaurant-login";
import RestaurantDashboard from "@/pages/restaurant-dashboard";
import OnboardingPage, { getOnboarding } from "@/pages/onboarding";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { isOnboardingEnabled, shouldSkipOnboarding } from "@/lib/onboarding-config";

// Hook pour vérifier l'onboarding avec réactivité
// ONBOARDING DISABLED FOR MVP – ENABLE VIA ENABLE_ONBOARDING ENV FLAG
function useOnboarding() {
  const onboardingEnabled = isOnboardingEnabled();
  
  // Si l'onboarding est désactivé, toujours retourner true (accès direct)
  const [isOnboarded, setIsOnboarded] = useState(() => {
    if (!onboardingEnabled) {
      return true; // Onboarding désactivé → accès direct
    }
    return !!getOnboarding();
  });

  useEffect(() => {
    // Si l'onboarding est désactivé, ne pas écouter les changements
    if (!onboardingEnabled) {
      setIsOnboarded(true);
      return;
    }

    // Vérifier l'onboarding au montage
    setIsOnboarded(!!getOnboarding());

    // Écouter les changements du localStorage
    const handleStorageChange = () => {
      setIsOnboarded(!!getOnboarding());
    };

    // Écouter les événements de storage (depuis d'autres onglets)
    window.addEventListener("storage", handleStorageChange);

    // Vérifier périodiquement (pour les changements dans le même onglet)
    const interval = setInterval(() => {
      const currentState = !!getOnboarding();
      if (currentState !== isOnboarded) {
        setIsOnboarded(currentState);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [isOnboarded, onboardingEnabled]);

  return isOnboarded;
}

function MenuRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/");
  }, [setLocation]);
  return null;
}

function AdminRedirect() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("adminToken");
  
  useEffect(() => {
    if (token) {
      setLocation("/admin/dashboard");
    } else {
      setLocation("/admin/login");
    }
  }, [token, setLocation]);
  
  return null;
}

function Router() {
  const isOnboarded = useOnboarding();

  return (
    <Switch>
      {/* Route onboarding toujours accessible (même si désactivé, pour accès manuel) */}
      {/* ONBOARDING DISABLED FOR MVP – ENABLE VIA ENABLE_ONBOARDING ENV FLAG */}
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/admin" component={AdminRedirect} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/driver/login" component={DriverLogin} />
      <Route path="/driver/auto-login" component={DriverAutoLogin} />
      <Route path="/driver/dashboard" component={DriverDashboard} />
      <Route path="/restaurant/login" component={RestaurantLogin} />
      <Route path="/restaurant/dashboard" component={RestaurantDashboard} />
      <Route>
        <Layout>
          <Switch>
            {/* ONBOARDING DISABLED FOR MVP – ENABLE VIA ENABLE_ONBOARDING ENV FLAG */}
            {/* Si onboarding désactivé, isOnboarded = true → accès direct à Home */}
            <Route
              path="/"
              component={() => (isOnboarded ? <Home /> : <OnboardingPage />)}
            />
            <Route
              path="/menu"
              component={() => (isOnboarded ? <MenuRedirect /> : <OnboardingPage />)}
            />
            <Route
              path="/menu/:restaurantId"
              component={() => (isOnboarded ? <Menu /> : <OnboardingPage />)}
            />
            <Route
              path="/cart"
              component={() =>
                isOnboarded ? <CartPage /> : <OnboardingPage />
              }
            />
            <Route
              path="/success"
              component={() =>
                isOnboarded ? <OrderSuccess /> : <OnboardingPage />
              }
            />
            <Route
              path="/history"
              component={() =>
                isOnboarded ? <OrderHistory /> : <OnboardingPage />
              }
            />
            <Route
              path="/profile"
              component={() =>
                isOnboarded ? <Profile /> : <OnboardingPage />
              }
            />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <OrderProvider>
            <CartProvider>
                  <ScrollToTop />
                  <LoadingScreen />
                  <CartConfirmDialog />
                  <Toaster />
                  <Router />
                  <PwaInstallPrompt />
            </CartProvider>
          </OrderProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
