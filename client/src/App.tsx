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
 * 3. COMPOSANTS DE NAVIGATION:
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

import { useEffect } from "react";
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
import DeliveryForm from "@/pages/delivery-form";
import DeliveryFormStep2 from "@/pages/delivery-form-step2";
import DeliveryFormStep3 from "@/pages/delivery-form-step3";
import DeliveryProfessional from "@/pages/delivery-professional";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

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
 * - Layout fournit: Header, Bottom Nav (mobile), Footer
 * 
 * PARAMÈTRES DE ROUTE:
 * - /menu/:restaurantId utilise useParams() dans le composant Menu
 * - Les query strings (?product=123) sont accessibles via window.location.search
 */
function Router() {
  const [location, setLocation] = useLocation(); // Pour le diagnostic et la correction
  
  // CORRECTION: Si l'URL du navigateur est /admin/login sans token, forcer la route vers /
  // Cette correction doit s'exécuter au premier rendu pour éviter que AdminLogin ne se monte
  useEffect(() => {
    const browserPath = window.location.pathname;
    const adminToken = localStorage.getItem("adminToken");
    
    // Si l'URL est /admin/login mais qu'il n'y a pas de token, rediriger vers /
    // Cela corrige le problème où le cache/service worker garde l'ancienne URL
    if (browserPath === "/admin/login" && !adminToken) {
      console.warn('[DEBUG] ⚠️ CORRECTION: URL navigateur est /admin/login sans token, redirection vers /');
      // Utiliser setLocation de Wouter (navigation client-side) au lieu de window.location
      // Cela met à jour l'URL du navigateur ET la route Wouter sans rechargement
      setLocation("/");
    }
  }, []); // S'exécute une seule fois au montage pour éviter les boucles
  
  // Logs de diagnostic pour comprendre le routage
  useEffect(() => {
    const browserPath = window.location.pathname;
    console.log('[DEBUG] 🔍 DIAGNOSTIC ROUTAGE:');
    console.log('  - URL navigateur:', browserPath);
    console.log('  - Route Wouter:', location);
    console.log('  - Hash:', window.location.hash);
    console.log('  - Search:', window.location.search);
    
    // Détecter si on est sur /admin/login alors qu'on devrait être sur /
    if (browserPath === "/" && location === "/admin/login") {
      console.warn('[DEBUG] ⚠️ PROBLÈME DÉTECTÉ: URL navigateur est / mais Wouter est sur /admin/login');
    }
    if (browserPath === "/admin/login" && location === "/admin/login") {
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        console.log('[DEBUG] ℹ️ Utilisateur accède directement à /admin/login (normal si clic sur lien)');
      }
    }
  }, [location]);

  return (
    <Switch>
      {/* ============================================
          ROUTES PUBLIQUES (sans Layout) - EN PREMIER
          ============================================ */}
      
      {/* Routes d'authentification et administration - Routes exactes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      
      {/* Redirection intelligente /admin → /admin/login ou /admin/dashboard */}
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
          <MenuRedirect />
        </Layout>
      </Route>
      
      {/* Route menu avec paramètre restaurantId (ex: /menu/123) */}
      <Route path="/menu/:restaurantId">
        <Layout>
          <Menu />
        </Layout>
      </Route>
      
      {/* Page panier */}
      <Route path="/cart">
        <Layout>
          <CartPage />
        </Layout>
      </Route>
      
      {/* Page de succès de commande */}
      <Route path="/success">
        <Layout>
          <OrderSuccess />
        </Layout>
      </Route>
      
      {/* Historique des commandes */}
      <Route path="/history">
        <Layout>
          <OrderHistory />
        </Layout>
      </Route>
      
      {/* Profil utilisateur */}
      <Route path="/profile">
        <Layout>
          <Profile />
        </Layout>
      </Route>
      
      {/* Formulaire de livraison - Étape 1 */}
      <Route path="/delivery-form">
        <Layout>
          <DeliveryForm />
        </Layout>
      </Route>
      
      {/* Formulaire de livraison - Étape 2 */}
      <Route path="/delivery-form-step2">
        <Layout>
          <DeliveryFormStep2 />
        </Layout>
      </Route>
      
      {/* Formulaire de livraison - Étape 3 */}
      <Route path="/delivery-form-step3">
        <Layout>
          <DeliveryFormStep3 />
        </Layout>
      </Route>
      
      {/* Page professionnel de livraison */}
      <Route path="/delivery-professional">
        <Layout>
          <DeliveryProfessional />
        </Layout>
      </Route>
      
      {/* Route racine - Page d'accueil (EN DERNIER car / matche tout) */}
      <Route path="/">
        <Layout>
          <Home />
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
  // Log de diagnostic au chargement initial (SANS redirection pour éviter les boucles)
  useEffect(() => {
    const browserPath = window.location.pathname;
    console.log('[DEBUG] 🚀 APP DÉMARRÉE');
    console.log('  - URL navigateur au démarrage:', browserPath);
    console.log('  - User Agent:', navigator.userAgent);
    console.log('  - Timestamp:', new Date().toISOString());
    
    // Vérifier s'il y a un token admin (pour comprendre pourquoi on pourrait être redirigé)
    const adminToken = localStorage.getItem("adminToken");
    console.log('  - Admin token présent:', !!adminToken);
  }, []);

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
