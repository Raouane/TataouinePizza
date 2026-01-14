/**
 * ============================================================================
 * SYSTÈME DE NAVIGATION DE LA PWA - TATAOUINE PIZZA
 * ============================================================================
 * 
 * Ce fichier contient le système de routage principal de l'application PWA.
 * 
 * BIBLIOTHÈQUE DE ROUTAGE UTILISÉE: Wouter
 * - Wouter est une bibliothèque de routage légère pour React (alternative à React Router)
 * - Documentation: https://github.com/molefrog/wouter
 * - Avantages: Plus léger que React Router, API simple, compatible avec les PWA
 * 
 * ARCHITECTURE DE NAVIGATION:
 * 
 * 1. ROUTES PUBLIQUES (sans Layout):
 *    - /onboarding : Page d'onboarding pour nouveaux utilisateurs
 *    - /admin : Redirection automatique vers /admin/login ou /admin/dashboard
 *    - /admin/login : Connexion administrateur
 *    - /admin/dashboard : Tableau de bord administrateur
 *    - /driver/login : Connexion livreur
 *    - /driver/auto-login : Connexion automatique livreur (via lien externe)
 *    - /driver/dashboard : Tableau de bord livreur
 *    - /restaurant/login : Connexion restaurant
 *    - /restaurant/dashboard : Tableau de bord restaurant
 * 
 * 2. ROUTES PROTÉGÉES (avec Layout - barre de navigation):
 *    - / : Page d'accueil (Home)
 *    - /menu : Redirection vers / (MenuRedirect)
 *    - /menu/:restaurantId : Menu d'un restaurant spécifique
 *    - /cart : Page du panier
 *    - /success : Page de succès de commande
 *    - /history : Historique des commandes
 *    - /profile : Profil utilisateur
 * 
 * 3. PROTECTION PAR ONBOARDING:
 *    - Toutes les routes protégées vérifient si l'utilisateur a complété l'onboarding
 *    - Si non complété → redirection vers /onboarding
 *    - L'onboarding peut être désactivé via la variable d'environnement ENABLE_ONBOARDING
 * 
 * 4. COMPOSANTS DE NAVIGATION:
 *    - Layout: Fournit la barre de navigation (header + bottom nav mobile)
 *    - ScrollToTop: Scroll automatique en haut lors des changements de route
 *    - MenuRedirect: Redirige /menu vers /
 *    - AdminRedirect: Redirige /admin selon l'état d'authentification
 * 
 * UTILISATION DE LA NAVIGATION DANS L'APPLICATION:
 * 
 * A. Navigation déclarative (liens):
 *    - Utiliser le composant <Link href="/path"> de wouter
 *    - Exemple: <Link href="/cart">Panier</Link>
 *    - Utilisé dans: Layout, composants de navigation, cartes de produits
 * 
 * B. Navigation programmatique (redirections):
 *    - Utiliser le hook useLocation() de wouter
 *    - const [, setLocation] = useLocation();
 *    - setLocation("/path"); pour naviguer
 *    - Utilisé dans: Formulaires, redirections après actions, authentification
 * 
 * C. Lecture de la route actuelle:
 *    - const [location] = useLocation();
 *    - Utilisé pour: Détecter la page active, conditionner l'affichage
 * 
 * D. Paramètres de route:
 *    - Utiliser useParams() de wouter pour /menu/:restaurantId
 *    - const { restaurantId } = useParams();
 * 
 * EXEMPLES D'UTILISATION DANS LE CODEBASE:
 * 
 * 1. Layout (client/src/components/layout.tsx):
 *    - Navigation principale avec <Link> pour les liens
 *    - useLocation() pour détecter la page active et styler les liens
 *    - Navigation mobile en bas d'écran
 * 
 * 2. Pages (ex: cart-page.tsx, order-success.tsx):
 *    - setLocation("/success") après validation de commande
 *    - setLocation("/menu") pour retour au menu
 * 
 * 3. Authentification (admin-login.tsx, driver-login.tsx):
 *    - setLocation("/admin/dashboard") après connexion réussie
 *    - Redirection selon l'état d'authentification
 * 
 * 4. Composants (pizza-search-result.tsx):
 *    - <Link href={`/menu/${restaurantId}?product=${productId}`}>
 *    - Navigation avec paramètres de route et query strings
 * 
 * 5. Global Tracker (global-tracker.tsx):
 *    - setLocation('/success') au clic sur le widget de suivi
 * 
 * NOTES IMPORTANTES:
 * 
 * - Wouter utilise le History API du navigateur (pas de rechargement de page)
 * - Compatible avec les PWA (fonctionne hors ligne si configuré)
 * - Les routes sont gérées côté client (SPA - Single Page Application)
 * - Le manifest.json définit start_url: "/" pour l'installation PWA
 * - Les shortcuts PWA pointent vers /history pour accès rapide
 * 
 * ============================================================================
 */

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
import DriverAutoLogin from "@/pages/driver-auto-login";
import DriverDashboard from "@/pages/driver-dashboard";
import RestaurantLogin from "@/pages/restaurant-login";
import RestaurantDashboard from "@/pages/restaurant-dashboard";
import OnboardingPage, { getOnboarding } from "@/pages/onboarding";
import DeliveryForm from "@/pages/delivery-form";
import DeliveryFormStep2 from "@/pages/delivery-form-step2";
import DeliveryFormStep3 from "@/pages/delivery-form-step3";
import DeliveryProfessional from "@/pages/delivery-professional";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { isOnboardingEnabled, shouldSkipOnboarding } from "@/lib/onboarding-config";

/**
 * Hook personnalisé pour vérifier l'état de l'onboarding avec réactivité
 * 
 * UTILISATION DE LA NAVIGATION:
 * - Utilise useLocation() de wouter pour détecter la route actuelle
 * - Évite les redirections infinies en vérifiant si on est déjà sur /onboarding
 * - Écoute les changements du localStorage pour synchroniser entre onglets
 * 
 * LOGIQUE:
 * - Si onboarding désactivé → retourne toujours true (accès direct)
 * - Si sur /onboarding → retourne false (évite les redirections)
 * - Sinon → vérifie localStorage pour l'état d'onboarding
 */
// Hook pour vérifier l'onboarding avec réactivité
// ONBOARDING DISABLED FOR MVP – ENABLE VIA ENABLE_ONBOARDING ENV FLAG
function useOnboarding() {
  const onboardingEnabled = isOnboardingEnabled();
  const [location] = useLocation(); // Lecture de la route actuelle via wouter
  
  // Si l'onboarding est désactivé, toujours retourner true (accès direct)
  // MAIS ne pas rediriger si on est déjà sur /onboarding
  const [isOnboarded, setIsOnboarded] = useState(() => {
    if (!onboardingEnabled) {
      return true; // Onboarding désactivé → accès direct
    }
    // Si on est sur /onboarding, ne pas considérer comme complété pour éviter les redirections
    if (location === '/onboarding') {
      return false;
    }
    return !!getOnboarding();
  });

  useEffect(() => {
    // Si l'onboarding est désactivé, ne pas écouter les changements
    if (!onboardingEnabled) {
      setIsOnboarded(true);
      return;
    }

    // Si on est sur /onboarding, ne pas considérer comme complété
    if (location === '/onboarding') {
      setIsOnboarded(false);
      return;
    }

    // Vérifier l'onboarding au montage
    setIsOnboarded(!!getOnboarding());

    // Écouter les changements du localStorage
    const handleStorageChange = () => {
      // Ne pas rediriger si on est sur /onboarding
      if (location === '/onboarding') {
        return;
      }
      setIsOnboarded(!!getOnboarding());
    };

    // Écouter les événements de storage (depuis d'autres onglets)
    window.addEventListener("storage", handleStorageChange);

    // Vérifier périodiquement (pour les changements dans le même onglet)
    const interval = setInterval(() => {
      // Ne JAMAIS rediriger si on est sur /onboarding (même après sauvegarde)
      if (location === '/onboarding') {
        setIsOnboarded(false); // Forcer à false pour éviter toute redirection
        return;
      }
      const currentState = !!getOnboarding();
      if (currentState !== isOnboarded) {
        setIsOnboarded(currentState);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [isOnboarded, onboardingEnabled, location]);

  return isOnboarded;
}

/**
 * Composant de redirection pour la route /menu
 * 
 * NAVIGATION:
 * - Utilise setLocation() de wouter pour rediriger programmatiquement
 * - Redirige automatiquement /menu vers / (page d'accueil)
 * - Utilisé car /menu sans restaurantId n'a pas de sens
 */
function MenuRedirect() {
  const [, setLocation] = useLocation(); // Hook wouter pour navigation programmatique
  useEffect(() => {
    setLocation("/"); // Redirection vers la page d'accueil
  }, [setLocation]);
  return null;
}

/**
 * Composant de redirection intelligente pour /admin
 * 
 * NAVIGATION CONDITIONNELLE:
 * - Utilise setLocation() de wouter pour rediriger selon l'état d'authentification
 * - Si token présent → redirige vers /admin/dashboard
 * - Si pas de token → redirige vers /admin/login
 * - Évite d'avoir une page vide sur /admin
 */
function AdminRedirect() {
  const [, setLocation] = useLocation(); // Hook wouter pour navigation programmatique
  const token = localStorage.getItem("adminToken");
  
  useEffect(() => {
    if (token) {
      setLocation("/admin/dashboard"); // Navigation vers dashboard si authentifié
    } else {
      setLocation("/admin/login"); // Navigation vers login si non authentifié
    }
  }, [token, setLocation]);
  
  return null;
}

/**
 * Composant Router principal - Définit toutes les routes de l'application
 * 
 * ARCHITECTURE DE ROUTAGE AVEC WOUTER:
 * 
 * 1. <Switch>: Composant wouter qui rend la première route correspondante
 * 2. <Route path="...">: Définit une route avec son chemin
 * 3. Routes imbriquées: Les routes protégées sont dans un <Layout>
 * 
 * STRUCTURE:
 * 
 * Routes publiques (sans Layout):
 * - Routes d'authentification et d'administration
 * - Accessibles sans barre de navigation
 * 
 * Routes protégées (avec Layout):
 * - Routes utilisateur avec barre de navigation
 * - Protection par onboarding (redirection si non complété)
 * - Layout fournit: Header, Bottom Nav (mobile), Footer
 * 
 * PROTECTION PAR ONBOARDING:
 * - Toutes les routes protégées vérifient isOnboarded
 * - Si false → affiche OnboardingPage
 * - Si true → affiche le composant de la route
 * 
 * PARAMÈTRES DE ROUTE:
 * - /menu/:restaurantId utilise useParams() dans le composant Menu
 * - Les query strings (?product=123) sont accessibles via window.location.search
 */
function Router() {
  const isOnboarded = useOnboarding(); // Vérifie l'état d'onboarding
  const [location] = useLocation(); // Pour déboguer la route actuelle

  // Debug: Logger la route actuelle en production
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      console.log("[ROUTER] Route actuelle:", location);
    }
  }, [location]);

  return (
    <Switch>
      {/* ============================================
          ROUTES PUBLIQUES (sans Layout) - EN PREMIER
          ============================================ */}
      
      {/* Route onboarding toujours accessible (même si désactivé, pour accès manuel) */}
      {/* ONBOARDING DISABLED FOR MVP – ENABLE VIA ENABLE_ONBOARDING ENV FLAG */}
      <Route path="/onboarding" component={OnboardingPage} />
      
      {/* Routes d'authentification et administration - Routes exactes AVANT la redirection /admin */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      
      {/* Redirection intelligente /admin → /admin/login ou /admin/dashboard (APRÈS les routes exactes) */}
      <Route path="/admin" component={AdminRedirect} />
      <Route path="/driver/login" component={DriverLogin} />
      <Route path="/driver/auto-login" component={DriverAutoLogin} />
      <Route path="/driver/dashboard" component={DriverDashboard} />
      <Route path="/restaurant/login" component={RestaurantLogin} />
      <Route path="/restaurant/dashboard" component={RestaurantDashboard} />
      
      {/* ============================================
          ROUTES PROTÉGÉES (avec Layout) - APRÈS LES ROUTES PUBLIQUES
          ============================================ */}
      
      {/* Route /menu sans restaurantId → redirection vers / */}
      <Route path="/menu">
        <Layout>
          {isOnboarded ? <MenuRedirect /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Route menu avec paramètre restaurantId (ex: /menu/123) */}
      <Route path="/menu/:restaurantId">
        <Layout>
          {isOnboarded ? <Menu /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Page panier */}
      <Route path="/cart">
        <Layout>
          {isOnboarded ? <CartPage /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Page de succès de commande */}
      <Route path="/success">
        <Layout>
          {isOnboarded ? <OrderSuccess /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Historique des commandes */}
      <Route path="/history">
        <Layout>
          {isOnboarded ? <OrderHistory /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Profil utilisateur */}
      <Route path="/profile">
        <Layout>
          {isOnboarded ? <Profile /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Formulaire de livraison - Étape 1 */}
      <Route path="/delivery-form">
        <Layout>
          {isOnboarded ? <DeliveryForm /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Formulaire de livraison - Étape 2 */}
      <Route path="/delivery-form-step2">
        <Layout>
          {isOnboarded ? <DeliveryFormStep2 /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Formulaire de livraison - Étape 3 */}
      <Route path="/delivery-form-step3">
        <Layout>
          {isOnboarded ? <DeliveryFormStep3 /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Page professionnel de livraison */}
      <Route path="/delivery-professional">
        <Layout>
          {isOnboarded ? <DeliveryProfessional /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Route racine - Page d'accueil (DOIT ÊTRE EN DERNIER pour éviter de matcher toutes les routes) */}
      <Route path="/">
        <Layout>
          {isOnboarded ? <Home /> : <OnboardingPage />}
        </Layout>
      </Route>
      
      {/* Route 404 finale pour les routes non trouvées (hors Layout) */}
      <Route path="*">
        <NotFound />
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
